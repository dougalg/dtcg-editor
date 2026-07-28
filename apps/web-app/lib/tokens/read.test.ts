import { test } from "vitest";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { Logger } from "@dtcg-editor/errors";
import { TokenParseError } from "@dtcg-editor/token-core";
import { FileNotFoundError, readAndParseTokenFile } from "./read.ts";
import { PathTraversalError } from "./path-safety.ts";
import type { ReadTextFile } from "../platform/node-fs.ts";

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

test("returns Ok for a valid file", async () => {
	const readFileFn = mockReadFile({
		[resolve(rootDir, "good.json")]: JSON.stringify({ x: { $value: "1" } }),
	});
	const result = await readAndParseTokenFile(
		rootDir,
		"good.json",
		undefined,
		readFileFn,
	);
	assert.equal(result.isOk(), true);
});

test("returns FileNotFoundError for a missing file", async () => {
	const readFileFn = mockReadFile({});
	const result = await readAndParseTokenFile(
		rootDir,
		"missing.json",
		undefined,
		readFileFn,
	);
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof FileNotFoundError);
	}
});

test("returns PathTraversalError for an unsafe path", async () => {
	const readFileFn = mockReadFile({});
	const result = await readAndParseTokenFile(
		rootDir,
		"../../etc/passwd",
		undefined,
		readFileFn,
	);
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof PathTraversalError);
	}
});

test("returns TokenParseError for invalid JSON content", async () => {
	const readFileFn = mockReadFile({
		[resolve(rootDir, "bad.json")]: "{not valid json",
	});
	const result = await readAndParseTokenFile(
		rootDir,
		"bad.json",
		undefined,
		readFileFn,
	);
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof TokenParseError);
	}
});

test("returns a logged UnknownError for a non-ENOENT read failure", async () => {
	const readFileFn: ReadTextFile = async () => {
		throw new Error("permission denied");
	};

	const { logger, state } = fakeLogger();
	const result = await readAndParseTokenFile(
		rootDir,
		"unreadable.json",
		logger,
		readFileFn,
	);

	assert.equal(result.isErr(), true);
	if (result.isErr() && !(result.error instanceof Error)) {
		assert.equal(result.error.kind, "unknown");
	} else {
		assert.fail(
			"expected an UnknownError (plain object, not an Error subclass)",
		);
	}
	assert.equal(state.calls, 1);
});
