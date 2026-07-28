import { join, relative } from "node:path";
import { err, ok, ResultAsync, type Result } from "neverthrow";
import { TokenParseError } from "@dtcg-editor/token-core";
import { consoleLogger, toLoggedUnknownError } from "@dtcg-editor/errors";
import type { Logger, UnknownError } from "@dtcg-editor/errors";
import { FileNotFoundError, readAndParseTokenFile } from "./read.ts";
import { PathTraversalError } from "./path-safety.ts";
import { nodeReadDir, nodeReadFile } from "../platform/node-fs.ts";
import type { ReadDirEntries, ReadTextFile } from "../platform/node-fs.ts";

export type TokenFileSummary =
  | { readonly relativePath: string; readonly valid: true }
  | { readonly relativePath: string; readonly valid: false; readonly error: string };

function describeError(error: PathTraversalError | FileNotFoundError | TokenParseError | UnknownError): string {
  if (error instanceof PathTraversalError || error instanceof FileNotFoundError || error instanceof TokenParseError) {
    return error.message;
  }
  return error.context !== undefined ? `Unexpected error (${error.context})` : "Unexpected error";
}

async function collectJsonFiles(
  currentDir: string,
  logger: Logger,
  readDirFn: ReadDirEntries,
): Promise<Result<string[], UnknownError>> {
  const entriesResult = await ResultAsync.fromPromise(readDirFn(currentDir), (cause) =>
    toLoggedUnknownError(logger, cause, "collectJsonFiles"),
  );
  if (entriesResult.isErr()) {
    return err(entriesResult.error);
  }

  const files: string[] = [];
  for (const entry of entriesResult.value) {
    if (entry.isSymbolicLink()) {
      // Symlinks (files or directories) are skipped entirely: skipping
      // symlinked directories avoids unbounded recursion through a
      // symlink loop, and files are skipped the same way for consistency.
      continue;
    }

    const entryPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const subResult = await collectJsonFiles(entryPath, logger, readDirFn);
      if (subResult.isErr()) {
        return subResult;
      }
      files.push(...subResult.value);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return ok(files);
}

/**
 * Recursively scans `rootDir` for `*.json` files at any depth (skipping
 * symlinks) and attempts to parse each one as a DTCG token file. A file
 * that fails to read or parse is recorded as invalid rather than aborting
 * the scan — one bad file never affects any other file's result. A
 * directory that fails to read (e.g. permission denied) aborts the whole
 * scan with a logged `UnknownError`, since there's no file list left to
 * report on for that subtree.
 */
export function scanTokenDirectory(
  rootDir: string,
  logger: Logger = consoleLogger,
  readDirFn: ReadDirEntries = nodeReadDir,
  readFileFn: ReadTextFile = nodeReadFile,
): ResultAsync<TokenFileSummary[], UnknownError> {
  return new ResultAsync(collectJsonFiles(rootDir, logger, readDirFn)).map(async (absolutePaths) => {
    const summaries = await Promise.all(
      absolutePaths.map(async (absolutePath): Promise<TokenFileSummary> => {
        const relativePath = relative(rootDir, absolutePath);
        const result = await readAndParseTokenFile(rootDir, relativePath, logger, readFileFn);
        return result.isOk()
          ? { relativePath, valid: true }
          : { relativePath, valid: false, error: describeError(result.error) };
      }),
    );

    return summaries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  });
}
