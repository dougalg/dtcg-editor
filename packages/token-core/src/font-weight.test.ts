import assert from "node:assert/strict";
import { test } from "node:test";
import { FontWeightValueSchema } from "./font-weight.ts";

test("accepts the integer lower boundary, 1", () => {
	const result = FontWeightValueSchema.safeParse(1);
	assert.equal(result.success, true);
});

test("accepts the integer upper boundary, 1000", () => {
	const result = FontWeightValueSchema.safeParse(1000);
	assert.equal(result.success, true);
});

test("accepts a mid-range integer, 400", () => {
	const result = FontWeightValueSchema.safeParse(400);
	assert.equal(result.success, true);
});

test("rejects 0, just below the lower boundary", () => {
	const result = FontWeightValueSchema.safeParse(0);
	assert.equal(result.success, false);
});

test("rejects 1001, just above the upper boundary", () => {
	const result = FontWeightValueSchema.safeParse(1001);
	assert.equal(result.success, false);
});

test("rejects a non-integer number, 400.5", () => {
	const result = FontWeightValueSchema.safeParse(400.5);
	assert.equal(result.success, false);
});

test("rejects a non-string/non-number shape, an object", () => {
	const result = FontWeightValueSchema.safeParse({ not: "valid" });
	assert.equal(result.success, false);
});

const FONT_WEIGHT_ALIASES = [
	"thin",
	"hairline",
	"extra-light",
	"ultra-light",
	"light",
	"normal",
	"regular",
	"book",
	"medium",
	"semi-bold",
	"demi-bold",
	"bold",
	"extra-bold",
	"ultra-bold",
	"black",
	"heavy",
	"extra-black",
	"ultra-black",
] as const;

test("accepts every one of the 18 documented keyword aliases", () => {
	for (const alias of FONT_WEIGHT_ALIASES) {
		const result = FontWeightValueSchema.safeParse(alias);
		assert.equal(result.success, true, `expected "${alias}" to be accepted`);
	}
});

test("rejects an unrecognized string, extra-bold-ish", () => {
	const result = FontWeightValueSchema.safeParse("extra-bold-ish");
	assert.equal(result.success, false);
});
