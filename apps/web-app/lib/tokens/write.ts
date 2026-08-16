import type { Logger, UnknownError } from "@dtcg-editor/errors";
import { consoleLogger, toLoggedUnknownError } from "@dtcg-editor/errors";
import type {
	TokenDocument,
	TokenSerializeError,
} from "@dtcg-editor/token-core";
import { serializeTokenFile } from "@dtcg-editor/token-core";
import { errAsync, ResultAsync } from "neverthrow";
import type { WriteTextFile } from "../platform/node-fs.ts";
import { nodeWriteFile } from "../platform/node-fs.ts";
import type { PathTraversalError } from "./path-safety.ts";
import { resolveSafeTokenPath } from "./path-safety.ts";

/**
 * Resolves `relativePath` safely against `rootDir`, serializes `document`
 * back to DTCG JSON, and writes it. Returns `PathTraversalError` for an
 * unsafe path, `TokenSerializeError` if serialization itself fails, or a
 * logged `UnknownError` for anything else — callers map these to responses.
 */
export function writeAndSerializeTokenFile(
	rootDir: string,
	relativePath: string,
	document: TokenDocument,
	logger: Logger = consoleLogger,
	writeFileFn: WriteTextFile = nodeWriteFile,
): ResultAsync<void, PathTraversalError | TokenSerializeError | UnknownError> {
	const pathResult = resolveSafeTokenPath(rootDir, relativePath);
	if (pathResult.isErr()) {
		return errAsync(pathResult.error);
	}

	const serialized = serializeTokenFile(document);
	if (serialized.isErr()) {
		return errAsync(serialized.error);
	}

	return ResultAsync.fromPromise(
		writeFileFn(pathResult.value, serialized.value),
		(cause) =>
			toLoggedUnknownError(logger, cause, "writeAndSerializeTokenFile"),
	);
}
