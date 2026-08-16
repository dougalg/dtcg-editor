import assert from "node:assert/strict";
import { colorTokenType } from "@dtcg-editor/token-editor-color";
import { test } from "vitest";
import { BUILT_IN_TOKEN_TYPES } from "./built-in.ts";

test("colorTokenType exports the color contract shape (AC-01)", () => {
	assert.equal(colorTokenType.type, "color");
	const parsed = colorTokenType.valueSchema.safeParse("#ff00ff");
	assert.equal(parsed.success, true);
});

test("BUILT_IN_TOKEN_TYPES includes both dimension and color", () => {
	assert.deepEqual([...BUILT_IN_TOKEN_TYPES], ["dimension", "color"]);
});
