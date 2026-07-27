import { writeFile } from "node:fs/promises";
import { errAsync, ResultAsync } from "neverthrow";
import { serializeTokenFile } from "@dtcg-editor/token-core";
import type { TokenDocument, TokenSerializeError } from "@dtcg-editor/token-core";
import { consoleLogger, toLoggedUnknownError } from "@dtcg-editor/errors";
import type { Logger, UnknownError } from "@dtcg-editor/errors";
import { resolveSafeTokenPath } from "./path-safety.ts";
import type { PathTraversalError } from "./path-safety.ts";

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
): ResultAsync<void, PathTraversalError | TokenSerializeError | UnknownError> {
  const pathResult = resolveSafeTokenPath(rootDir, relativePath);
  if (pathResult.isErr()) {
    return errAsync(pathResult.error);
  }

  const serialized = serializeTokenFile(document);
  if (serialized.isErr()) {
    return errAsync(serialized.error);
  }

  return ResultAsync.fromPromise(writeFile(pathResult.value, serialized.value, "utf-8"), (cause) =>
    toLoggedUnknownError(logger, cause, "writeAndSerializeTokenFile"),
  );
}
