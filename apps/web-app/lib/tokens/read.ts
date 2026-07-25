import { readFile } from "node:fs/promises";
import { parseTokenFile } from "@dtcg-editor/token-core";
import type { TokenDocument } from "@dtcg-editor/token-core";
import { resolveSafeTokenPath } from "./path-safety.ts";

/**
 * Resolves `relativePath` safely against `rootDir`, reads the file, and
 * parses it as a DTCG token file. Throws `PathTraversalError` for an
 * unsafe path, a filesystem error (e.g. ENOENT) for a missing file, or
 * `TokenParseError` for invalid content — callers map these to responses.
 */
export async function readAndParseTokenFile(rootDir: string, relativePath: string): Promise<TokenDocument> {
  const absolutePath = resolveSafeTokenPath(rootDir, relativePath);
  const contents = await readFile(absolutePath, "utf-8");
  return parseTokenFile(contents);
}
