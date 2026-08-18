import assert from "node:assert/strict";
import { DTCG_TOKEN_TYPES } from "@dtcg-editor/token-core";
import { test } from "vitest";
import { BUILT_IN_TOKEN_TYPES } from "./built-in.ts";
import { DtcgEditorConfigError, defineConfig } from "./define-config.ts";

test("returns a resolved config with built-in defaults merged in when no extensions given", () => {
	const resolved = defineConfig({ tokensDir: "./tokens" });
	assert.equal(resolved.tokensDir, "./tokens");
	assert.equal(resolved.extensions.length, 2);
	assert.equal(resolved.extensions[0]?.type, "dimension");
});

test("merges a user-supplied extension ahead of the built-in default (AC-06)", () => {
	const customEditor = () => null as never;
	const resolved = defineConfig({
		tokensDir: "./tokens",
		extensions: [{ type: "dimension", editor: customEditor }],
	});
	assert.equal(resolved.extensions.length, 3);
	assert.equal(resolved.extensions[0]?.editor, customEditor);
});

test("a user config with an extension for a different type still yields the built-in dimension default", () => {
	const otherEditor = () => null as never;
	const resolved = defineConfig({
		tokensDir: "./tokens",
		extensions: [{ type: "color", editor: otherEditor }],
	});
	const dimensionEntry = resolved.extensions.find(
		(entry) => entry.type === "dimension",
	);
	assert.notEqual(dimensionEntry, undefined);
	assert.notEqual(dimensionEntry?.editor, otherEditor);
});

test("throws DtcgEditorConfigError when tokensDir is missing", () => {
	assert.throws(() => defineConfig({ tokensDir: "" }), DtcgEditorConfigError);
});

test("throws DtcgEditorConfigError when an extension's type is not a string", () => {
	assert.throws(() => {
		defineConfig({
			tokensDir: "./tokens",
			// @ts-expect-error -- deliberately malformed, mirroring a plain-JS author's mistake
			extensions: [{ type: 123, editor: () => null }],
		});
	}, DtcgEditorConfigError);
});

test("throws DtcgEditorConfigError when an extension's type is not a valid DTCG token type (AC-06)", () => {
	assert.throws(() => {
		defineConfig({
			tokensDir: "./tokens",
			extensions: [
				// @ts-expect-error -- deliberately malformed, mirroring a plain-JS author's mistake
				{ type: "not-a-real-type", editor: () => null as never },
			],
		});
	}, DtcgEditorConfigError);
});

test("throws DtcgEditorConfigError when an extension's editor is not a function", () => {
	assert.throws(() => {
		defineConfig({
			tokensDir: "./tokens",
			// @ts-expect-error -- deliberately malformed, mirroring a plain-JS author's mistake
			extensions: [{ type: "dimension", editor: "not a function" }],
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
			extensions: [{ type: 123, editor: "nope" }],
		});
		assert.fail("expected defineConfig to throw");
	} catch (error) {
		assert.ok(error instanceof DtcgEditorConfigError);
		assert.match(error.message, /tokensDir/);
		assert.match(error.message, /extensions\[0\].type/);
		assert.match(error.message, /extensions\[0\].editor/);
	}
});

test("throws DtcgEditorConfigError when editorOptions fails the built-in color contract's editorOptionsSchema (AC-03)", () => {
	assert.throws(() => {
		defineConfig({
			tokensDir: "./tokens",
			extensions: [
				{
					type: "color",
					editor: () => null as never,
					editorOptions: { colorSpaces: ["cmyk"] },
				},
			],
		});
	}, DtcgEditorConfigError);
});

test("throws DtcgEditorConfigError when editorOptions has an empty colorSpaces allow-list (AC-04)", () => {
	assert.throws(() => {
		defineConfig({
			tokensDir: "./tokens",
			extensions: [
				{
					type: "color",
					editor: () => null as never,
					editorOptions: { colorSpaces: [] },
				},
			],
		});
	}, DtcgEditorConfigError);
});

test("accepts valid editorOptions for the built-in color contract", () => {
	const resolved = defineConfig({
		tokensDir: "./tokens",
		extensions: [
			{
				type: "color",
				editor: () => null as never,
				editorOptions: { colorSpaces: ["srgb", "hsl"] },
			},
		],
	});
	assert.deepEqual(resolved.extensions[0]?.editorOptions, {
		colorSpaces: ["srgb", "hsl"],
	});
});

test("passes editorOptions through unchecked for a type with no built-in editorOptionsSchema", () => {
	const resolved = defineConfig({
		tokensDir: "./tokens",
		extensions: [
			{
				type: "dimension",
				editor: () => null as never,
				editorOptions: { anything: "goes" },
			},
		],
	});
	assert.deepEqual(resolved.extensions[0]?.editorOptions, {
		anything: "goes",
	});
});

test("editorOptions present but editor invalid still fails for the existing editor-requiredness reason (AC-02)", () => {
	assert.throws(() => {
		defineConfig({
			tokensDir: "./tokens",
			extensions: [
				{
					type: "color",
					// @ts-expect-error -- deliberately malformed, mirroring a plain-JS author's mistake
					editor: "not a function",
					editorOptions: { colorSpaces: ["srgb"] },
				},
			],
		});
	}, DtcgEditorConfigError);
});

test("accepts a user extension registered for a standard type with no built-in editor, derived dynamically so it can't go stale (AC-08)", () => {
	const typeWithoutBuiltIn = DTCG_TOKEN_TYPES.find(
		(type) => !(BUILT_IN_TOKEN_TYPES as readonly string[]).includes(type),
	);
	assert.ok(
		typeWithoutBuiltIn !== undefined,
		"expected at least one DTCG type with no built-in editor yet",
	);
	const editor = () => null as never;
	const resolved = defineConfig({
		tokensDir: "./tokens",
		extensions: [{ type: typeWithoutBuiltIn, editor }],
	});
	assert.equal(resolved.extensions[0]?.type, typeWithoutBuiltIn);
	assert.equal(resolved.extensions[0]?.editor, editor);
});
