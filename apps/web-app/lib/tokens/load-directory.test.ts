import assert from "node:assert/strict";
import { join } from "node:path";
import type { Logger } from "@dtcg-editor/errors";
import { test } from "vitest";
import type {
	DirEntry,
	ReadDirEntries,
	ReadTextFile,
} from "../platform/node-fs.ts";
import { loadTokenDirectory } from "./load-directory.ts";

const rootDir = "/virtual/tokens";

function fakeLogger(): { logger: Logger; state: { calls: number } } {
	const state = { calls: 0 };
	return {
		logger: {
			error() {
				state.calls += 1;
			},
		},
		state,
	};
}

function mockReadDir(tree: Record<string, DirEntry[]>): ReadDirEntries {
	return async (path) => {
		const entries = tree[path];
		if (entries === undefined) {
			throw new Error(`ENOTDIR or permission denied: ${path}`);
		}
		return entries;
	};
}

function mockReadFile(files: Record<string, string>): ReadTextFile {
	return async (path) => {
		if (!(path in files)) {
			const error = new Error(
				`ENOENT: no such file or directory, open '${path}'`,
			) as NodeJS.ErrnoException;
			error.code = "ENOENT";
			throw error;
		}
		return files[path] as string;
	};
}

function dirEntry(name: string, kind: "file" | "dir" | "symlink"): DirEntry {
	return {
		name,
		isDirectory: () => kind === "dir",
		isFile: () => kind === "file",
		isSymbolicLink: () => kind === "symlink",
	};
}

test("retains parsed documents for every valid file", async () => {
	const readDirFn = mockReadDir({
		[rootDir]: [dirEntry("a.json", "file"), dirEntry("b.json", "file")],
	});
	const readFileFn = mockReadFile({
		[join(rootDir, "a.json")]: JSON.stringify({ x: { $value: "1" } }),
		[join(rootDir, "b.json")]: JSON.stringify({ y: { $value: "2" } }),
	});

	const result = await loadTokenDirectory(
		rootDir,
		undefined,
		readDirFn,
		readFileFn,
	);
	assert.equal(result.isOk(), true);
	if (!result.isOk()) {
		return;
	}
	assert.equal(result.value.failed.length, 0);
	assert.deepEqual(
		result.value.loaded.map((f) => f.relativePath),
		["a.json", "b.json"],
	);
	assert.equal(result.value.loaded[0]?.document.root.kind, "group");
});

test("omits an unparseable file rather than aborting the whole load", async () => {
	const readDirFn = mockReadDir({
		[rootDir]: [dirEntry("good.json", "file"), dirEntry("bad.json", "file")],
	});
	const readFileFn = mockReadFile({
		[join(rootDir, "good.json")]: JSON.stringify({ x: { $value: "1" } }),
		[join(rootDir, "bad.json")]: "{not valid json",
	});

	const result = await loadTokenDirectory(
		rootDir,
		undefined,
		readDirFn,
		readFileFn,
	);
	assert.equal(result.isOk(), true);
	if (!result.isOk()) {
		return;
	}
	assert.deepEqual(
		result.value.loaded.map((f) => f.relativePath),
		["good.json"],
	);
	assert.equal(result.value.failed.length, 1);
	assert.equal(result.value.failed[0]?.relativePath, "bad.json");
	assert.match(result.value.failed[0]?.error ?? "", /Invalid JSON/);
});

test("does not recurse into a symlinked subdirectory", async () => {
	const real = join(rootDir, "real");
	const readDirFn = mockReadDir({
		[rootDir]: [
			dirEntry("a.json", "file"),
			dirEntry("real", "dir"),
			dirEntry("link", "symlink"),
		],
		[real]: [dirEntry("b.json", "file")],
	});
	const readFileFn = mockReadFile({
		[join(rootDir, "a.json")]: JSON.stringify({ x: { $value: "1" } }),
		[join(real, "b.json")]: JSON.stringify({ y: { $value: "2" } }),
	});

	const result = await loadTokenDirectory(
		rootDir,
		undefined,
		readDirFn,
		readFileFn,
	);
	assert.equal(result.isOk(), true);
	if (!result.isOk()) {
		return;
	}
	assert.deepEqual(result.value.loaded.map((f) => f.relativePath).sort(), [
		"a.json",
		"real/b.json",
	]);
});

test("uses the injected readDirFn/readFileFn rather than real fs", async () => {
	let readDirCalls = 0;
	let readFileCalls = 0;
	const readDirFn: ReadDirEntries = async (path) => {
		readDirCalls += 1;
		if (path === rootDir) {
			return [dirEntry("a.json", "file")];
		}
		throw new Error(`unexpected path: ${path}`);
	};
	const readFileFn: ReadTextFile = async () => {
		readFileCalls += 1;
		return JSON.stringify({ x: { $value: "1" } });
	};

	await loadTokenDirectory(rootDir, undefined, readDirFn, readFileFn);
	assert.equal(readDirCalls, 1);
	assert.equal(readFileCalls, 1);
});

test("a readdir failure on a nested subdirectory aborts the load with a logged UnknownError", async () => {
	const readDirFn = mockReadDir({
		[rootDir]: [dirEntry("a.json", "file"), dirEntry("blocked", "dir")],
	});
	const readFileFn = mockReadFile({
		[join(rootDir, "a.json")]: JSON.stringify({ x: { $value: "1" } }),
	});

	const { logger, state } = fakeLogger();
	const result = await loadTokenDirectory(
		rootDir,
		logger,
		readDirFn,
		readFileFn,
	);

	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.equal(result.error.kind, "unknown");
	}
	assert.equal(state.calls, 1);
});
