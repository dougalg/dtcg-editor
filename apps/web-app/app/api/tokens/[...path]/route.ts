import { ResultAsync } from "neverthrow";
import { applyTokenEdits, findNode, resolveEffectiveType, TokenParseError } from "@dtcg-editor/token-core";
import type { TokenEdit } from "@dtcg-editor/token-core";
import { dimensionTokenType } from "@dtcg-editor/token-type-dimension";
import { consoleLogger } from "@dtcg-editor/errors";
import type { Logger } from "@dtcg-editor/errors";
import { getConfig } from "../../../../lib/config.ts";
import { FileNotFoundError, readAndParseTokenFile } from "../../../../lib/tokens/read.ts";
import { writeAndSerializeTokenFile } from "../../../../lib/tokens/write.ts";
import { PathTraversalError } from "../../../../lib/tokens/path-safety.ts";
import { toPlainNode } from "../../../../lib/tokens/plain-node.ts";
import { EditRequestSchema } from "../../../../lib/tokens/edit-request.ts";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { path } = await params;
  const relativePath = path.join("/");
  const config = getConfig();

  const result = await readAndParseTokenFile(config.tokensDir, relativePath);
  if (result.isOk()) {
    return Response.json({ document: toPlainNode(result.value.root) });
  }

  const error = result.error;
  if (error instanceof PathTraversalError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof FileNotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof TokenParseError) {
    return Response.json({ error: error.message }, { status: 422 });
  }
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

class InvalidRequestBodyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRequestBodyError";
  }
}

function readJsonBody(request: Request): ResultAsync<unknown, InvalidRequestBodyError> {
  return ResultAsync.fromPromise(request.json(), () => new InvalidRequestBodyError("Request body is not valid JSON"));
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
    return Response.json({ error: bodyResult.error.message }, { status: 400 });
  }

  const requestValidation = EditRequestSchema.safeParse(bodyResult.value);
  if (!requestValidation.success) {
    return Response.json({ error: "Invalid edit request", details: requestValidation.error.issues }, {
      status: 400,
    });
  }

  const config = getConfig();
  const documentResult = await readAndParseTokenFile(config.tokensDir, relativePath, logger);
  if (documentResult.isErr()) {
    const error = documentResult.error;
    if (error instanceof PathTraversalError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof FileNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof TokenParseError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
  const document = documentResult.value;

  const tokenEdits: TokenEdit[] = [];
  for (const edit of requestValidation.data.edits) {
    const located = findNode(document.root, edit.path);
    if (located === undefined) {
      return Response.json({ error: `No token found at "${edit.path.join(".")}"` }, { status: 400 });
    }
    if (located.node.kind !== "token") {
      return Response.json({ error: `"${edit.path.join(".")}" is a group, not a token` }, { status: 400 });
    }

    const effectiveType = resolveEffectiveType(located.node, located.ancestors);
    if (effectiveType !== dimensionTokenType.type) {
      return Response.json(
        { error: `Only "${dimensionTokenType.type}" tokens can be edited, "${effectiveType ?? "untyped"}" cannot` },
        { status: 400 },
      );
    }

    let value: unknown;
    if (edit.value !== undefined) {
      const valueValidation = dimensionTokenType.valueSchema.safeParse(edit.value);
      if (!valueValidation.success) {
        return Response.json(
          { error: `Invalid ${dimensionTokenType.type} value: ${valueValidation.error.issues.map((i) => i.message).join(", ")}` },
          { status: 400 },
        );
      }
      value = dimensionTokenType.serializeValue(valueValidation.data);
    }

    tokenEdits.push({
      path: edit.path,
      ...(edit.name !== undefined ? { name: edit.name } : {}),
      ...(value !== undefined ? { value } : {}),
      ...(edit.description !== undefined ? { description: edit.description } : {}),
    });
  }

  const editedDocument = applyTokenEdits(document, tokenEdits);
  if (editedDocument.isErr()) {
    return Response.json({ error: editedDocument.error.message }, { status: 400 });
  }

  const writeResult = await writeAndSerializeTokenFile(config.tokensDir, relativePath, editedDocument.value, logger);
  if (writeResult.isErr()) {
    const error = writeResult.error;
    if (error instanceof PathTraversalError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Failed to save token file" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function PATCH(request: Request, { params }: RouteContext): Promise<Response> {
  const { path } = await params;
  return patchTokenFile(request, path.join("/"));
}
