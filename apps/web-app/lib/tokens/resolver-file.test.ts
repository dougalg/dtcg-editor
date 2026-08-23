import assert from "node:assert/strict";
import type { Logger } from "@dtcg-editor/errors";
import { test } from "vitest";
import type { ReadTextFile } from "../platform/node-fs.ts";
import { loadResolverModes } from "./resolver-file.ts";

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

function enoent(): Error {
	const error = new Error(
		"ENOENT: no such file or directory",
	) as NodeJS.ErrnoException;
	error.code = "ENOENT";
	return error;
}

const REAL_RESOLVER = JSON.stringify({
	resolutionOrder: [
		{
			type: "set",
			name: "base",
			sources: [{ $ref: "./colors.json" }, { $ref: "./space.json" }],
		},
		{
			type: "modifier",
			name: "mode",
			default: "light",
			contexts: {
				light: [],
				dark: [{ $ref: "./dark.json" }],
			},
		},
	],
});

test("parses a valid resolver into filesByMode and modes", async () => {
	const readFileFn: ReadTextFile = async () => REAL_RESOLVER;
	const result = await loadResolverModes(rootDir, undefined, readFileFn);
	assert.equal(result.isOk(), true);
	if (!result.isOk()) {
		return;
	}
	const modes = result.value;
	assert.ok(modes);
	assert.deepEqual([...modes.modes].sort(), ["dark", "light"]);
	assert.deepEqual(modes.filesByMode.get("light"), [
		"colors.json",
		"space.json",
	]);
	assert.deepEqual(modes.filesByMode.get("dark"), [
		"colors.json",
		"space.json",
		"dark.json",
	]);
});

test("resolves to undefined when the resolver file does not exist", async () => {
	const readFileFn: ReadTextFile = async () => {
		throw enoent();
	};
	const result = await loadResolverModes(rootDir, undefined, readFileFn);
	assert.equal(result.isOk(), true);
	if (result.isOk()) {
		assert.equal(result.value, undefined);
	}
});

test("resolves to undefined and logs a warning for invalid JSON", async () => {
	const readFileFn: ReadTextFile = async () => "{not valid json";
	const { logger, state } = fakeLogger();
	const result = await loadResolverModes(rootDir, logger, readFileFn);
	assert.equal(result.isOk(), true);
	if (result.isOk()) {
		assert.equal(result.value, undefined);
	}
	assert.equal(state.calls, 1);
});

test("resolves to undefined and logs a warning for a JSON file that doesn't match the resolver shape", async () => {
	const readFileFn: ReadTextFile = async () =>
		JSON.stringify({ notAResolver: true });
	const { logger, state } = fakeLogger();
	const result = await loadResolverModes(rootDir, logger, readFileFn);
	assert.equal(result.isOk(), true);
	if (result.isOk()) {
		assert.equal(result.value, undefined);
	}
	assert.equal(state.calls, 1);
});

test("resolves to undefined when the resolver has no modifier entry (sets only)", async () => {
	const readFileFn: ReadTextFile = async () =>
		JSON.stringify({
			resolutionOrder: [
				{ type: "set", name: "base", sources: [{ $ref: "./colors.json" }] },
			],
		});
	const result = await loadResolverModes(rootDir, undefined, readFileFn);
	assert.equal(result.isOk(), true);
	if (result.isOk()) {
		assert.equal(result.value, undefined);
	}
});

test("propagates a genuine read failure (not ENOENT) as an UnknownError", async () => {
	const readFileFn: ReadTextFile = async () => {
		throw new Error("EACCES: permission denied");
	};
	const { logger } = fakeLogger();
	const result = await loadResolverModes(rootDir, logger, readFileFn);
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.equal(result.error.kind, "unknown");
	}
});
