import { join, relative } from "node:path";
import type { Logger, UnknownError } from "@dtcg-editor/errors";
import { consoleLogger, toLoggedUnknownError } from "@dtcg-editor/errors";
import type { TokenDocument } from "@dtcg-editor/token-core";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import type { ReadDirEntries, ReadTextFile } from "../platform/node-fs.ts";
import { nodeReadDir, nodeReadFile } from "../platform/node-fs.ts";
import { readAndParseTokenFile } from "./read.ts";
import { describeReadError } from "./read-error.ts";

/** One token file that parsed successfully. */
export interface LoadedTokenFile {
	readonly relativePath: string;
	readonly document: TokenDocument;
}

/** One token file that failed to read or parse. */
export interface FailedTokenFile {
	readonly relativePath: string;
	readonly error: string;
}

/**
 * The outcome of loading every `*.json` file in a directory tree: the ones
 * that parsed, and the ones that didn't — kept as two lists (rather than
 * silently dropping failures) so a summary-producing consumer like
 * `scanTokenDirectory` can still report *which* files are invalid and why,
 * while a reference-resolving consumer can work with `loaded` alone.
 */
export interface TokenDirectoryLoad {
	readonly loaded: readonly LoadedTokenFile[];
	readonly failed: readonly FailedTokenFile[];
}

async function collectJsonFiles(
	currentDir: string,
	readDirFn: ReadDirEntries,
): Promise<string[]> {
	const entries = await readDirFn(currentDir);
	const files: string[] = [];

	for (const entry of entries) {
		if (entry.isSymbolicLink()) {
			// Symlinks (files or directories) are skipped entirely: skipping
			// symlinked directories avoids unbounded recursion through a
			// symlink loop, and files are skipped the same way for consistency.
			continue;
		}

		const entryPath = join(currentDir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectJsonFiles(entryPath, readDirFn)));
		} else if (entry.isFile() && entry.name.endsWith(".json")) {
			files.push(entryPath);
		}
	}

	return files;
}

/**
 * Recursively finds and parses every `*.json` file under `rootDir` (skipping
 * symlinks), reading and parsing each file exactly once. Extracted from the
 * traversal that used to live directly inside `scanTokenDirectory`, so a
 * consumer needing full parsed documents (the reference index) and one
 * needing only a validity summary (`scanTokenDirectory`) share a single
 * directory walk and a single read-and-parse pass per file, rather than
 * each doing their own.
 *
 * A file that fails to read or parse is recorded in `failed`, not thrown or
 * used to abort the whole load — one bad file never affects any other
 * file's result, and (per spec FR-007) a reference into that file simply
 * has no target to find, rather than the load failing outright. A directory
 * that fails to read (e.g. permission denied) aborts the whole load with a
 * logged `UnknownError`, since there's no file list left to report on for
 * that subtree — matching `scanTokenDirectory`'s prior behavior exactly.
 */
export function loadTokenDirectory(
	rootDir: string,
	logger: Logger = consoleLogger,
	readDirFn: ReadDirEntries = nodeReadDir,
	readFileFn: ReadTextFile = nodeReadFile,
): ResultAsync<TokenDirectoryLoad, UnknownError> {
	const collected = ResultAsync.fromPromise(
		collectJsonFiles(rootDir, readDirFn),
		(cause) => toLoggedUnknownError(logger, cause, "loadTokenDirectory"),
	);

	return collected.map(async (absolutePaths) => {
		const outcomes = await Promise.all(
			absolutePaths.map(
				async (
					absolutePath,
				): Promise<Result<LoadedTokenFile, FailedTokenFile>> => {
					const relativePath = relative(rootDir, absolutePath);
					const result = await readAndParseTokenFile(
						rootDir,
						relativePath,
						logger,
						readFileFn,
					);
					return result.isOk()
						? ok({ relativePath, document: result.value })
						: err({
								relativePath,
								error: describeReadError(result.error),
							});
				},
			),
		);

		const loaded: LoadedTokenFile[] = [];
		const failed: FailedTokenFile[] = [];
		for (const outcome of outcomes) {
			if (outcome.isOk()) {
				loaded.push(outcome.value);
			} else {
				failed.push(outcome.error);
			}
		}
		loaded.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
		failed.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
		return { loaded, failed };
	});
}
