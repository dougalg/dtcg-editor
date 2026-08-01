import { test } from "vitest";
import assert from "node:assert/strict";
import { join } from "node:path";
import type { Logger } from "@dtcg-editor/errors";
import { scanTokenDirectory, type TokenFileSummary } from "./scan.ts";
import type {
	DirEntry,
	ReadDirEntries,
	ReadTextFile,
} from "../platform/node-fs.ts";

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
		return files[path];
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

async function scanOk(
	dir: string,
	logger: Logger | undefined,
	readDirFn: ReadDirEntries,
	readFileFn: ReadTextFile,
): Promise<readonly TokenFileSummary[]> {
	const result = await scanTokenDirectory(dir, logger, readDirFn, readFileFn);
	if (!result.isOk()) {
		assert.fail("expected scanTokenDirectory to succeed");
	}
	return result.value;
}

test("discovers *.json files at multiple nesting depths", async () => {
	const nested = join(rootDir, "nested");
	const deeper = join(nested, "deeper");
	const readDirFn = mockReadDir({
		[rootDir]: [dirEntry("a.json", "file"), dirEntry("nested", "dir")],
		[nested]: [dirEntry("b.json", "file"), dirEntry("deeper", "dir")],
		[deeper]: [dirEntry("c.json", "file")],
	});
	const readFileFn = mockReadFile({
		[join(rootDir, "a.json")]: JSON.stringify({ x: { $value: "1" } }),
		[join(nested, "b.json")]: JSON.stringify({ y: { $value: "2" } }),
		[join(deeper, "c.json")]: JSON.stringify({ z: { $value: "3" } }),
	});

	const summaries = await scanOk(rootDir, undefined, readDirFn, readFileFn);
	const relativePaths = summaries.map((summary) => summary.relativePath).sort();

	assert.deepEqual(relativePaths, [
		"a.json",
		"nested/b.json",
		"nested/deeper/c.json",
	]);
	assert.ok(summaries.every((summary) => summary.valid));
	assert.ok(summaries.every((summary) => summary.valid && summary.standard));
});

test("isolates an invalid file from valid ones", async () => {
	const readDirFn = mockReadDir({
		[rootDir]: [dirEntry("good.json", "file"), dirEntry("bad.json", "file")],
	});
	const readFileFn = mockReadFile({
		[join(rootDir, "good.json")]: JSON.stringify({ x: { $value: "1" } }),
		[join(rootDir, "bad.json")]: "{not valid json",
	});

	const summaries = await scanOk(rootDir, undefined, readDirFn, readFileFn);

	const good = summaries.find(
		(summary) => summary.relativePath === "good.json",
	);
	assert.ok(good);
	assert.equal(good.valid, true);
	if (good.valid) {
		assert.equal(good.standard, true);
	}

	const bad = summaries.find((summary) => summary.relativePath === "bad.json");
	assert.ok(bad);
	if (bad.valid) {
		assert.fail("expected bad.json to be marked invalid");
	} else {
		assert.match(bad.error, /Invalid JSON/);
	}
});

test("flags a valid file that declares an unrecognized $type as non-standard (AC-02)", async () => {
	const readDirFn = mockReadDir({
		[rootDir]: [dirEntry("weird.json", "file")],
	});
	const readFileFn = mockReadFile({
		[join(rootDir, "weird.json")]: JSON.stringify({
			x: { $type: "not-a-real-type", $value: "1" },
		}),
	});

	const summaries = await scanOk(rootDir, undefined, readDirFn, readFileFn);
	const weird = summaries.find(
		(summary) => summary.relativePath === "weird.json",
	);
	assert.ok(weird);
	assert.equal(weird.valid, true);
	if (weird.valid) {
		assert.equal(weird.standard, false);
	}
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

	const summaries = await scanOk(rootDir, undefined, readDirFn, readFileFn);
	const relativePaths = summaries.map((summary) => summary.relativePath).sort();

	assert.deepEqual(relativePaths, ["a.json", "real/b.json"]);
});

test("ignores non-.json files", async () => {
	const readDirFn = mockReadDir({
		[rootDir]: [dirEntry("a.json", "file"), dirEntry("readme.md", "file")],
	});
	const readFileFn = mockReadFile({
		[join(rootDir, "a.json")]: JSON.stringify({ x: { $value: "1" } }),
	});

	const summaries = await scanOk(rootDir, undefined, readDirFn, readFileFn);
	assert.deepEqual(
		summaries.map((summary) => summary.relativePath),
		["a.json"],
	);
});

test("a readdir failure on a nested subdirectory aborts the scan with a logged UnknownError", async () => {
	const readDirFn = mockReadDir({
		[rootDir]: [dirEntry("a.json", "file"), dirEntry("blocked", "dir")],
		// `blocked` is deliberately absent from the tree, so mockReadDir throws
		// when collectJsonFiles recurses into it — simulating a permission error
		// without touching real fs.
	});
	const readFileFn = mockReadFile({
		[join(rootDir, "a.json")]: JSON.stringify({ x: { $value: "1" } }),
	});

	const { logger, state } = fakeLogger();
	const result = await scanTokenDirectory(
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
