import { test } from "node:test";
import assert from "node:assert/strict";
import { DTCG_TOKEN_TYPES, isDtcgTokenType } from "./token-types.ts";

test("contains exactly the 13 types from the DTCG 2025.10 Format Module spec's Type section", () => {
	assert.deepEqual(
		[...DTCG_TOKEN_TYPES].sort(),
		[
			"border",
			"color",
			"cubicBezier",
			"dimension",
			"duration",
			"fontFamily",
			"fontWeight",
			"gradient",
			"number",
			"shadow",
			"strokeStyle",
			"transition",
			"typography",
		].sort(),
	);
});

test("isDtcgTokenType returns true for every canonical type", () => {
	for (const type of DTCG_TOKEN_TYPES) {
		assert.equal(isDtcgTokenType(type), true);
	}
});

test("isDtcgTokenType returns false for an unrecognized string", () => {
	assert.equal(isDtcgTokenType("not-a-real-type"), false);
});

test("isDtcgTokenType is case-sensitive", () => {
	assert.equal(isDtcgTokenType("Color"), false);
	assert.equal(isDtcgTokenType("DIMENSION"), false);
});
