import type { Logger, UnknownError } from "@dtcg-editor/errors";
import { consoleLogger } from "@dtcg-editor/errors";
import type { TokenEdit } from "@dtcg-editor/token-core";
import {
	applyTokenEdits,
	findNode,
	isDtcgTokenType,
	resolveEffectiveType,
	TokenParseError,
} from "@dtcg-editor/token-core";
import { validateTokenValue } from "@dtcg-editor/token-type-contract";
import { ResultAsync } from "neverthrow";
import { getConfig } from "../../../../lib/config.ts";
import { resolveBuiltInContract } from "../../../../lib/token-editors/built-in.ts";
import { EditRequestSchema } from "../../../../lib/tokens/edit-request.ts";
import { PathTraversalError } from "../../../../lib/tokens/path-safety.ts";
import { toPlainNode } from "../../../../lib/tokens/plain-node.ts";
import {
	FileNotFoundError,
	readAndParseTokenFile,
} from "../../../../lib/tokens/read.ts";
import type { SaveError } from "../../../../lib/tokens/save-error.ts";
import { writeAndSerializeTokenFile } from "../../../../lib/tokens/write.ts";

interface RouteContext {
	params: Promise<{ path: string[] }>;
}

/**
 * Builds a non-2xx JSON error response whose body is `SaveError`-shaped
 * (the `kind` field plus that variant's own fields) in addition to the
 * pre-existing `error` message field — `kind` is additive, per the
 * UI-layer Result-consumption convention (`docs/project.md`'s Error
 * Handling constraint): a `Result`/`ResultAsync` never crosses the wire
 * itself, but the response body it's translated into still carries enough
 * structure for a Client Component hook to branch on without re-deriving
 * `kind` from the HTTP status code independently.
 */
function errorResponse(
	status: number,
	message: string,
	saveError: SaveError,
	extra?: Record<string, unknown>,
): Response {
	return Response.json({ error: message, ...saveError, ...extra }, { status });
}

/**
 * Maps a `readAndParseTokenFile` failure to its response, shared by `GET`
 * and `PATCH`'s `documentResult` branches — both handlers read the same
 * file the same way and must translate each error variant to the same
 * status code / `SaveError` shape.
 */
function mapReadErrorToResponse(
	error:
		| PathTraversalError
		| FileNotFoundError
		| TokenParseError
		| UnknownError,
	relativePath: string,
): Response {
	if (error instanceof PathTraversalError) {
		return errorResponse(400, error.message, {
			kind: "validation",
			issues: [error.message],
		});
	}
	if (error instanceof FileNotFoundError) {
		return errorResponse(404, error.message, {
			kind: "not-found",
			path: relativePath,
		});
	}
	if (error instanceof TokenParseError) {
		return errorResponse(422, error.message, {
			kind: "invalid-file",
			issues: [error.message],
		});
	}
	return errorResponse(500, "Internal server error", {
		kind: "unknown",
		message: "Internal server error",
	});
}

export async function GET(
	_request: Request,
	{ params }: RouteContext,
): Promise<Response> {
	const { path } = await params;
	const relativePath = path.join("/");
	const config = getConfig();

	const result = await readAndParseTokenFile(config.tokensDir, relativePath);
	if (result.isOk()) {
		return Response.json({ document: toPlainNode(result.value.root) });
	}

	return mapReadErrorToResponse(result.error, relativePath);
}

class InvalidRequestBodyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidRequestBodyError";
	}
}

function readJsonBody(
	request: Request,
): ResultAsync<unknown, InvalidRequestBodyError> {
	return ResultAsync.fromPromise(
		request.json(),
		() => new InvalidRequestBodyError("Request body is not valid JSON"),
	);
}

/**
 * Separated from `PATCH` so `logger` can be injected directly in tests —
 * Next.js's generated route types constrain `PATCH` itself to its exact
 * expected signature, leaving no room for a test-only parameter there.
 */
export async function patchTokenFile(
	request: Request,
	relativePath: string,
	logger: Logger = consoleLogger,
): Promise<Response> {
	const bodyResult = await readJsonBody(request);
	if (bodyResult.isErr()) {
		return errorResponse(400, bodyResult.error.message, {
			kind: "validation",
			issues: [bodyResult.error.message],
		});
	}

	const requestValidation = EditRequestSchema.safeParse(bodyResult.value);
	if (!requestValidation.success) {
		return errorResponse(
			400,
			"Invalid edit request",
			{
				kind: "validation",
				issues: requestValidation.error.issues.map((i) => i.message),
			},
			{ details: requestValidation.error.issues },
		);
	}

	const config = getConfig();
	const documentResult = await readAndParseTokenFile(
		config.tokensDir,
		relativePath,
		logger,
	);
	if (documentResult.isErr()) {
		return mapReadErrorToResponse(documentResult.error, relativePath);
	}
	const document = documentResult.value;

	const tokenEdits: TokenEdit[] = [];
	for (const edit of requestValidation.data.edits) {
		const located = findNode(document.root, edit.path);
		if (located === undefined) {
			const message = `No token found at "${edit.path.join(".")}"`;
			return errorResponse(400, message, {
				kind: "validation",
				issues: [message],
			});
		}
		if (located.node.kind === "group") {
			if (edit.value !== undefined || edit.description !== undefined) {
				const message = `"${edit.path.join(".")}" is a group — only "name" can be edited`;
				return errorResponse(400, message, {
					kind: "validation",
					issues: [message],
				});
			}
			if (edit.name !== undefined) {
				tokenEdits.push({ path: edit.path, name: edit.name });
			}
			continue;
		}

		const effectiveType = resolveEffectiveType(located.node, located.ancestors);
		if (effectiveType === undefined || !isDtcgTokenType(effectiveType)) {
			const message = `Only standard DTCG token types can be edited, "${effectiveType ?? "untyped"}" cannot`;
			return errorResponse(400, message, {
				kind: "validation",
				issues: [message],
			});
		}

		let value: unknown;
		if (edit.value !== undefined) {
			// Mirrors `TokenTree.tsx`'s client-side `canEdit` guard: any built-in
			// standard type's value is validated against its own contract schema
			// before being accepted, not just dimension's — closes a gap where a
			// direct PATCH request (bypassing the UI) could previously write an
			// unvalidated `color` (or any other schema-having) `$value` straight
			// to disk.
			const builtInContract = resolveBuiltInContract(effectiveType);
			if (builtInContract !== undefined) {
				const valueValidation = validateTokenValue(builtInContract, edit.value);
				if (valueValidation.isErr()) {
					const message = valueValidation.error.message;
					return errorResponse(400, message, {
						kind: "validation",
						issues: [message],
					});
				}
				value = builtInContract.serializeValue(valueValidation.value);
			} else {
				// No built-in contract exists for this standard type (e.g. a
				// user-registered extension for a type with no schema of its own)
				// — `edit.value` is already a plain JS value (`EditRequestSchema`'s
				// `z.unknown()`), validated as JSON-parseable client-side, so it's
				// passed through as-is.
				value = edit.value;
			}
		}

		tokenEdits.push({
			path: edit.path,
			...(edit.name !== undefined ? { name: edit.name } : {}),
			...(value !== undefined ? { value } : {}),
			...(edit.description !== undefined
				? { description: edit.description }
				: {}),
		});
	}

	const editedDocument = applyTokenEdits(document, tokenEdits);
	if (editedDocument.isErr()) {
		return errorResponse(400, editedDocument.error.message, {
			kind: "validation",
			issues: [editedDocument.error.message],
		});
	}

	const writeResult = await writeAndSerializeTokenFile(
		config.tokensDir,
		relativePath,
		editedDocument.value,
		logger,
	);
	if (writeResult.isErr()) {
		const error = writeResult.error;
		if (error instanceof PathTraversalError) {
			return errorResponse(400, error.message, {
				kind: "validation",
				issues: [error.message],
			});
		}
		return errorResponse(500, "Failed to save token file", {
			kind: "unknown",
			message: "Failed to save token file",
		});
	}

	return Response.json({ ok: true });
}

export async function PATCH(
	request: Request,
	{ params }: RouteContext,
): Promise<Response> {
	const { path } = await params;
	return patchTokenFile(request, path.join("/"));
}
