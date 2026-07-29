import { test } from "vitest";
import assert from "node:assert/strict";
import { resolveEditorForType } from "./resolve-editor.ts";
import type { TokenEditorExtension } from "./types.ts";

const dimensionEditor = () => "dimension-editor" as never;
const fallbackDimensionEditor = () => "fallback-dimension-editor" as never;
const colorEditor = () => "color-editor" as never;

// Filters here take a widened `{ type: string }` param (rather than the
// stricter `TokenFilterMetadata`) purely so this test can exercise
// hypothetical non-built-in type names like "color"/"border" without
// tripping `TokenType`'s literal-union type-safety — the whole point of
// FR-05's strong typing is to make exactly that kind of typo a compile
// error for real config authors, so it's deliberately sidestepped here.
const extensions: readonly TokenEditorExtension[] = [
	{
		filter: (metadata: { type: string }) => metadata.type === "dimension",
		editor: dimensionEditor,
	},
	{
		filter: (metadata: { type: string }) => metadata.type === "color",
		editor: colorEditor,
	},
	{
		filter: (metadata: { type: string }) => metadata.type === "dimension",
		editor: fallbackDimensionEditor,
	},
];

test("returns the first matching entry's editor", () => {
	assert.equal(resolveEditorForType(extensions, "dimension"), dimensionEditor);
});

test("returns undefined when no entry matches", () => {
	assert.equal(resolveEditorForType(extensions, "border"), undefined);
});

test("returns undefined for an empty extensions list", () => {
	assert.equal(resolveEditorForType([], "dimension"), undefined);
});

test("first-match-wins: a later entry for the same type is never reached", () => {
	assert.equal(resolveEditorForType(extensions, "dimension"), dimensionEditor);
	assert.notEqual(
		resolveEditorForType(extensions, "dimension"),
		fallbackDimensionEditor,
	);
});
