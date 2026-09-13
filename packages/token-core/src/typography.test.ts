import assert from "node:assert/strict";
import { test } from "node:test";
import { TypographyValueSchema } from "./typography.ts";

const VALID_VALUE = {
	fontFamily: "Arial",
	fontSize: { value: 16, unit: "px" },
	fontWeight: 700,
	letterSpacing: { value: 0, unit: "px" },
	lineHeight: 1.4,
} as const;

test("accepts a valid typography value", () => {
	const result = TypographyValueSchema.safeParse(VALID_VALUE);
	assert.equal(result.success, true);
});

test("rejects a value missing fontFamily", () => {
	const { fontFamily: _fontFamily, ...rest } = VALID_VALUE;
	const result = TypographyValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a value missing fontSize", () => {
	const { fontSize: _fontSize, ...rest } = VALID_VALUE;
	const result = TypographyValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a value missing fontWeight", () => {
	const { fontWeight: _fontWeight, ...rest } = VALID_VALUE;
	const result = TypographyValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a value missing letterSpacing", () => {
	const { letterSpacing: _letterSpacing, ...rest } = VALID_VALUE;
	const result = TypographyValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a value missing lineHeight", () => {
	const { lineHeight: _lineHeight, ...rest } = VALID_VALUE;
	const result = TypographyValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects an invalid nested fontSize", () => {
	const result = TypographyValueSchema.safeParse({
		...VALID_VALUE,
		fontSize: { value: 16 },
	});
	assert.equal(result.success, false);
});
