import { test } from "vitest";
import assert from "node:assert/strict";
import { defineConfig, DtcgEditorConfigError } from "./define-config.ts";

test("returns a resolved config with built-in defaults merged in when no extensions given", () => {
	const resolved = defineConfig({ tokensDir: "./tokens" });
	assert.equal(resolved.tokensDir, "./tokens");
	assert.equal(resolved.extensions.length, 1);
	assert.equal(
		resolved.extensions[0]?.filter({ type: "dimension" }),
		true,
	);
});

test("merges a user-supplied extension ahead of the built-in default (AC-06)", () => {
	const customEditor = () => null as never;
	const resolved = defineConfig({
		tokensDir: "./tokens",
		extensions: [{ filter: (metadata) => metadata.type === "dimension", editor: customEditor }],
	});
	assert.equal(resolved.extensions.length, 2);
	assert.equal(resolved.extensions[0]?.editor, customEditor);
});

test("a user config with an extension for a different type still yields the built-in dimension default", () => {
	const otherEditor = () => null as never;
	const resolved = defineConfig({
		tokensDir: "./tokens",
		extensions: [{ filter: () => false, editor: otherEditor }],
	});
	const dimensionEntry = resolved.extensions.find((entry) =>
		entry.filter({ type: "dimension" }),
	);
	assert.notEqual(dimensionEntry, undefined);
	assert.notEqual(dimensionEntry?.editor, otherEditor);
});

test("throws DtcgEditorConfigError when tokensDir is missing", () => {
	assert.throws(
		() => defineConfig({ tokensDir: "" }),
		DtcgEditorConfigError,
	);
});

test("throws DtcgEditorConfigError when an extension's filter is not a function", () => {
	assert.throws(() => {
		defineConfig({
			tokensDir: "./tokens",
			// @ts-expect-error -- deliberately malformed, mirroring a plain-JS author's mistake
			extensions: [{ filter: "not a function", editor: () => null }],
		});
	}, DtcgEditorConfigError);
});

test("throws DtcgEditorConfigError when an extension's editor is not a function", () => {
	assert.throws(() => {
		defineConfig({
			tokensDir: "./tokens",
			// @ts-expect-error -- deliberately malformed, mirroring a plain-JS author's mistake
			extensions: [{ filter: () => true, editor: "not a function" }],
		});
	}, DtcgEditorConfigError);
});

test("throws DtcgEditorConfigError, not a raw TypeError, when an extensions entry is null", () => {
	assert.throws(() => {
		defineConfig({
			tokensDir: "./tokens",
			// @ts-expect-error -- deliberately malformed, mirroring a plain-JS author's mistake
			extensions: [null],
		});
	}, DtcgEditorConfigError);
});

test("throws DtcgEditorConfigError, not a raw TypeError, when extensions is not an array", () => {
	assert.throws(() => {
		defineConfig({
			tokensDir: "./tokens",
			// @ts-expect-error -- deliberately malformed, mirroring a plain-JS author's mistake
			extensions: "not-an-array",
		});
	}, DtcgEditorConfigError);
});

test("throws DtcgEditorConfigError, not a raw TypeError, when the config itself is not an object", () => {
	assert.throws(() => {
		// @ts-expect-error -- deliberately malformed, mirroring a plain-JS author's mistake
		defineConfig(null);
	}, DtcgEditorConfigError);
});

test("aggregates multiple issues into one error message", () => {
	try {
		defineConfig({
			tokensDir: "",
			// @ts-expect-error -- deliberately malformed
			extensions: [{ filter: "nope", editor: "nope" }],
		});
		assert.fail("expected defineConfig to throw");
	} catch (error) {
		assert.ok(error instanceof DtcgEditorConfigError);
		assert.match(error.message, /tokensDir/);
		assert.match(error.message, /extensions\[0\].filter/);
		assert.match(error.message, /extensions\[0\].editor/);
	}
});
