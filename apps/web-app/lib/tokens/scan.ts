import type { Logger } from "@dtcg-editor/errors";
import { consoleLogger } from "@dtcg-editor/errors";
import type { ReadDirEntries, ReadTextFile } from "../platform/node-fs.ts";
import { nodeReadDir, nodeReadFile } from "../platform/node-fs.ts";
import { loadTokenDirectory } from "./load-directory.ts";
import { isTokenDocumentStandard } from "./standard-type.ts";

export type TokenFileSummary =
	| {
			readonly relativePath: string;
			readonly valid: true;
			readonly standard: boolean;
	  }
	| {
			readonly relativePath: string;
			readonly valid: false;
			readonly error: string;
	  };

/**
 * Recursively scans `rootDir` for `*.json` files at any depth (skipping
 * symlinks) and attempts to parse each one as a DTCG token file, reducing
 * `loadTokenDirectory`'s per-file load result to a summary — same public
 * behavior as before this was split out (one bad file never affects any
 * other file's result; a directory read failure aborts the whole scan with
 * a logged `UnknownError`), now sharing one directory walk and one
 * read-and-parse pass per file with any other consumer of
 * `loadTokenDirectory`, instead of running its own.
 */
export function scanTokenDirectory(
	rootDir: string,
	logger: Logger = consoleLogger,
	readDirFn: ReadDirEntries = nodeReadDir,
	readFileFn: ReadTextFile = nodeReadFile,
) {
	return loadTokenDirectory(rootDir, logger, readDirFn, readFileFn).map(
		({ loaded, failed }) => {
			const summaries: TokenFileSummary[] = [
				...loaded.map(
					(file): TokenFileSummary => ({
						relativePath: file.relativePath,
						valid: true,
						standard: isTokenDocumentStandard(file.document),
					}),
				),
				...failed.map(
					(file): TokenFileSummary => ({
						relativePath: file.relativePath,
						valid: false,
						error: file.error,
					}),
				),
			];
			return summaries.sort((a, b) =>
				a.relativePath.localeCompare(b.relativePath),
			);
		},
	);
}
