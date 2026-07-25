import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseTokenFile, TokenParseError } from "@dtcg-editor/token-core";

export type TokenFileSummary =
  | { readonly relativePath: string; readonly valid: true }
  | { readonly relativePath: string; readonly valid: false; readonly error: string };

function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

async function collectJsonFiles(currentDir: string): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
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
      files.push(...(await collectJsonFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * Recursively scans `rootDir` for `*.json` files at any depth (skipping
 * symlinks) and attempts to parse each one as a DTCG token file. A file
 * that fails to read or parse is recorded as invalid rather than aborting
 * the scan — one bad file never affects any other file's result.
 */
export async function scanTokenDirectory(rootDir: string): Promise<TokenFileSummary[]> {
  const absolutePaths = await collectJsonFiles(rootDir);

  const summaries = await Promise.all(
    absolutePaths.map(async (absolutePath): Promise<TokenFileSummary> => {
      const relativePath = relative(rootDir, absolutePath);
      try {
        const contents = await readFile(absolutePath, "utf-8");
        parseTokenFile(contents);
        return { relativePath, valid: true };
      } catch (cause) {
        const error = cause instanceof TokenParseError ? cause.message : describeCause(cause);
        return { relativePath, valid: false, error };
      }
    }),
  );

  return summaries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
