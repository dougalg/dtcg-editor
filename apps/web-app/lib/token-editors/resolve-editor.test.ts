import { test } from "vitest";
import assert from "node:assert/strict";
import { DTCG_TOKEN_TYPES } from "@dtcg-editor/token-core";
import { resolveEditorForType } from "./resolve-editor.ts";
import { BUILT_IN_TOKEN_TYPES } from "./built-in.ts";
import type { TokenEditorExtension } from "./types.ts";

const dimensionEditor = () => "dimension-editor" as never;
const fallbackDimensionEditor = () => "fallback-dimension-editor" as never;
const colorEditor = () => "color-editor" as never;

const extensions: readonly TokenEditorExtension[] = [
	{ type: "dimension", editor: dimensionEditor },
	{ type: "color", editor: colorEditor },
	{ type: "dimension", editor: fallbackDimensionEditor },
];

test("returns the first matching entry's editor", () => {
	assert.equal(
		resolveEditorForType(extensions, "dimension")?.editor,
		dimensionEditor,
	);
});

test("returns undefined when no entry matches", () => {
	assert.equal(resolveEditorForType(extensions, "border"), undefined);
});

test("returns undefined for an empty extensions list", () => {
	assert.equal(resolveEditorForType([], "dimension"), undefined);
});

test("first-match-wins: a later entry for the same type is never reached", () => {
	assert.equal(
		resolveEditorForType(extensions, "dimension")?.editor,
		dimensionEditor,
	);
	assert.notEqual(
		resolveEditorForType(extensions, "dimension")?.editor,
		fallbackDimensionEditor,
	);
});

test("resolves a user extension registered for a standard type with no built-in editor, derived dynamically so it can't go stale (AC-08)", () => {
	const typeWithoutBuiltIn = DTCG_TOKEN_TYPES.find(
		(type) => !(BUILT_IN_TOKEN_TYPES as readonly string[]).includes(type),
	);
	assert.ok(
		typeWithoutBuiltIn !== undefined,
		"expected at least one DTCG type with no built-in editor yet",
	);
	const editor = () => "synthetic-editor" as never;
	const withSynthetic: readonly TokenEditorExtension[] = [
		{ type: typeWithoutBuiltIn, editor },
	];
	assert.equal(
		resolveEditorForType(withSynthetic, typeWithoutBuiltIn)?.editor,
		editor,
	);
});

test("returns the matched entry's editorOptions", () => {
	const withOptions: readonly TokenEditorExtension[] = [
		{
			type: "color",
			editor: colorEditor,
			editorOptions: { colorSpaces: ["srgb"] },
		},
	];
	assert.deepEqual(resolveEditorForType(withOptions, "color")?.editorOptions, {
		colorSpaces: ["srgb"],
	});
});

test("editorOptions is undefined when the matched entry doesn't declare one", () => {
	assert.equal(
		resolveEditorForType(extensions, "dimension")?.editorOptions,
		undefined,
	);
});
