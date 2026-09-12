import assert from "node:assert/strict";
import { colorTokenType } from "@dtcg-editor/token-editor-color";
import { test } from "vitest";
import { BUILT_IN_TOKEN_TYPES, resolveBuiltInContract } from "./built-in.ts";

test("colorTokenType exports the color contract shape (AC-01)", () => {
	assert.equal(colorTokenType.type, "color");
	const parsed = colorTokenType.valueSchema.safeParse("#ff00ff");
	assert.equal(parsed.success, true);
});

test("BUILT_IN_TOKEN_TYPES includes dimension, color, and duration", () => {
	assert.deepEqual(
		[...BUILT_IN_TOKEN_TYPES],
		["dimension", "color", "duration"],
	);
});

test("resolveBuiltInContract('duration') returns the duration contract", () => {
	const contract = resolveBuiltInContract("duration");
	assert.equal(contract?.type, "duration");
	const parsed = contract?.valueSchema.safeParse({ value: 200, unit: "ms" });
	assert.equal(parsed?.success, true);
});
