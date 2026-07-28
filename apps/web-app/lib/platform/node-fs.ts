import {
	existsSync as fsExistsSync,
	readFileSync as fsReadFileSync,
	writeFileSync as fsWriteFileSync,
} from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";

/**
 * Structural subset of `fs.Dirent` this repo's directory-scanning code
 * needs. Kept as a local interface (rather than importing `Dirent` from
 * `node:fs`) so no consumer of this adapter ever needs its own import —
 * even a type-only one — from `node:fs`; this file stays the sole
 * `node:fs`/`node:fs/promises` import point in the app (AC-01).
 */
export interface DirEntry {
	readonly name: string;
	isDirectory(): boolean;
	isFile(): boolean;
	isSymbolicLink(): boolean;
}

export type ReadTextFile = (path: string) => Promise<string>;
export type WriteTextFile = (path: string, data: string) => Promise<void>;
export type ReadDirEntries = (path: string) => Promise<DirEntry[]>;
export type ReadTextFileSync = (path: string) => string;
export type ExistsSync = (path: string) => boolean;
export type WriteTextFileSync = (path: string, data: string) => void;

/** Real `fs.readFile`, bound to utf-8 — `read.ts`'s injected default. */
export const nodeReadFile: ReadTextFile = (path) => readFile(path, "utf-8");

/** Real `fs.writeFile`, bound to utf-8 — `write.ts`'s injected default. */
export const nodeWriteFile: WriteTextFile = (path, data) =>
	writeFile(path, data, "utf-8");

/** Real `fs.readdir` with `withFileTypes: true` — `scan.ts`'s injected default. */
export const nodeReadDir: ReadDirEntries = (path) =>
	readdir(path, { withFileTypes: true });

/** Real `fs.readFileSync`, bound to utf-8 — `config.ts`'s injected default. */
export const nodeReadFileSync: ReadTextFileSync = (path) =>
	fsReadFileSync(path, "utf-8");

/** Real `fs.existsSync` — `init-config.ts`'s injected default. */
export const nodeExistsSync: ExistsSync = (path) => fsExistsSync(path);

/** Real `fs.writeFileSync`, bound to utf-8 — `init-config.ts`'s injected default. */
export const nodeWriteFileSync: WriteTextFileSync = (path, data) =>
	fsWriteFileSync(path, data, "utf-8");
