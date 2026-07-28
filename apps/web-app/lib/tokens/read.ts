import { errAsync, ResultAsync } from "neverthrow";
import { parseTokenFile } from "@dtcg-editor/token-core";
import type { TokenDocument, TokenParseError } from "@dtcg-editor/token-core";
import { consoleLogger, toLoggedUnknownError } from "@dtcg-editor/errors";
import type { Logger, UnknownError } from "@dtcg-editor/errors";
import { resolveSafeTokenPath } from "./path-safety.ts";
import type { PathTraversalError } from "./path-safety.ts";
import { nodeReadFile } from "../platform/node-fs.ts";
import type { ReadTextFile } from "../platform/node-fs.ts";

/** Returned when the requested token file does not exist. */
export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileNotFoundError";
  }
}

function classifyReadError(cause: unknown, logger: Logger, relativePath: string): FileNotFoundError | UnknownError {
  if (cause instanceof Error && (cause as NodeJS.ErrnoException).code === "ENOENT") {
    return new FileNotFoundError(`Token file not found: "${relativePath}"`);
  }
  return toLoggedUnknownError(logger, cause, "readAndParseTokenFile");
}

/**
 * Resolves `relativePath` safely against `rootDir`, reads the file, and
 * parses it as a DTCG token file. Returns `PathTraversalError` for an
 * unsafe path, `FileNotFoundError` for a missing file, `TokenParseError`
 * for invalid content, or a logged `UnknownError` for anything else —
 * callers map these to responses.
 */
export function readAndParseTokenFile(
  rootDir: string,
  relativePath: string,
  logger: Logger = consoleLogger,
  readFileFn: ReadTextFile = nodeReadFile,
): ResultAsync<TokenDocument, PathTraversalError | FileNotFoundError | TokenParseError | UnknownError> {
  const pathResult = resolveSafeTokenPath(rootDir, relativePath);
  if (pathResult.isErr()) {
    return errAsync(pathResult.error);
  }

  return ResultAsync.fromPromise(readFileFn(pathResult.value), (cause) =>
    classifyReadError(cause, logger, relativePath),
  ).andThen((contents) => parseTokenFile(contents));
}
