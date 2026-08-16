import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { Logger } from "@dtcg-editor/errors";
import { parseTokenFile, type TokenDocument } from "@dtcg-editor/token-core";
import { test } from "vitest";
import type { WriteTextFile } from "../platform/node-fs.ts";
import { PathTraversalError } from "./path-safety.ts";
import { writeAndSerializeTokenFile } from "./write.ts";

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

function fixtureDocument(): TokenDocument {
	const raw = JSON.stringify({
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
		},
	});
	const result = parseTokenFile(raw);
	if (!result.isOk()) {
		assert.fail("expected fixture document to parse");
	}
	return result.value;
}

function mockWriteFile(): {
	writeFileFn: WriteTextFile;
	calls: { path: string; data: string }[];
} {
	const calls: { path: string; data: string }[] = [];
	const writeFileFn: WriteTextFile = async (path, data) => {
		calls.push({ path, data });
	};
	return { writeFileFn, calls };
}

test("returns Ok and writes the serialized document on success", async () => {
	const { writeFileFn, calls } = mockWriteFile();
	const result = await writeAndSerializeTokenFile(
		rootDir,
		"good.json",
		fixtureDocument(),
		undefined,
		writeFileFn,
	);

	assert.equal(result.isOk(), true);
	assert.equal(calls.length, 1);
	assert.equal(calls[0]?.path, resolve(rootDir, "good.json"));
	assert.ok(calls[0]?.data.includes("spacing"));
});

test("returns a logged UnknownError when the write fails", async () => {
	const writeFileFn: WriteTextFile = async () => {
		throw new Error("disk full");
	};
	const { logger, state } = fakeLogger();

	const result = await writeAndSerializeTokenFile(
		rootDir,
		"good.json",
		fixtureDocument(),
		logger,
		writeFileFn,
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

test("returns PathTraversalError for an unsafe path without calling writeFileFn", async () => {
	const { writeFileFn, calls } = mockWriteFile();

	const result = await writeAndSerializeTokenFile(
		rootDir,
		"../../etc/passwd",
		fixtureDocument(),
		undefined,
		writeFileFn,
	);

	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof PathTraversalError);
	}
	assert.equal(calls.length, 0);
});
