import assert from "node:assert/strict";
import { colorTokenType } from "@dtcg-editor/token-editor-color";
import { test } from "vitest";
import { BUILT_IN_TOKEN_TYPES, resolveBuiltInContract } from "./built-in.ts";

test("colorTokenType exports the color contract shape (AC-01)", () => {
	assert.equal(colorTokenType.type, "color");
	const parsed = colorTokenType.valueSchema.safeParse("#ff00ff");
	assert.equal(parsed.success, true);
});

test("BUILT_IN_TOKEN_TYPES includes dimension, color, duration, and cubicBezier", () => {
	assert.deepEqual(
		[...BUILT_IN_TOKEN_TYPES],
		["dimension", "color", "duration", "cubicBezier"],
	);
});

test("resolveBuiltInContract('duration') returns the duration contract", () => {
	const contract = resolveBuiltInContract("duration");
	assert.equal(contract?.type, "duration");
	const parsed = contract?.valueSchema.safeParse({ value: 200, unit: "ms" });
	assert.equal(parsed?.success, true);
});

test("resolveBuiltInContract resolves the cubicBezier contract (spec 011 U29/U30)", () => {
	const contract = resolveBuiltInContract("cubicBezier");
	assert.ok(contract);
	assert.equal(contract.type, "cubicBezier");
	const parsed = contract.valueSchema.safeParse([0.4, 0, 0.2, 1]);
	assert.equal(parsed.success, true);
});
