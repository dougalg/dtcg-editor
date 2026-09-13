import assert from "node:assert/strict";
import { test } from "node:test";
import { ShadowValueSchema } from "./shadow.ts";

const VALID_COLOR = {
	colorSpace: "srgb",
	components: [0, 0, 0],
	alpha: 1,
} as const;

const VALID_DIMENSION = { value: 2, unit: "px" } as const;

const VALID_LAYER = {
	color: VALID_COLOR,
	offsetX: VALID_DIMENSION,
	offsetY: VALID_DIMENSION,
	blur: VALID_DIMENSION,
	spread: VALID_DIMENSION,
} as const;

test("accepts a valid single-layer object", () => {
	const result = ShadowValueSchema.safeParse(VALID_LAYER);
	assert.equal(result.success, true);
});

test("accepts a valid one-item array of layers", () => {
	const result = ShadowValueSchema.safeParse([VALID_LAYER]);
	assert.equal(result.success, true);
});

test("accepts a valid multi-layer (3-entry) array", () => {
	const result = ShadowValueSchema.safeParse([
		VALID_LAYER,
		VALID_LAYER,
		VALID_LAYER,
	]);
	assert.equal(result.success, true);
});

test("rejects a single-layer object missing color", () => {
	const { color, ...rest } = VALID_LAYER;
	const result = ShadowValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a single-layer object missing offsetX", () => {
	const { offsetX, ...rest } = VALID_LAYER;
	const result = ShadowValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a single-layer object missing offsetY", () => {
	const { offsetY, ...rest } = VALID_LAYER;
	const result = ShadowValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a single-layer object missing blur", () => {
	const { blur, ...rest } = VALID_LAYER;
	const result = ShadowValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a single-layer object missing spread", () => {
	const { spread, ...rest } = VALID_LAYER;
	const result = ShadowValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a layer whose color is not a valid ColorValue", () => {
	const result = ShadowValueSchema.safeParse({
		...VALID_LAYER,
		color: "#fff",
	});
	assert.equal(result.success, false);
});

test("rejects a layer whose offsetX is not a valid DimensionValue", () => {
	const result = ShadowValueSchema.safeParse({
		...VALID_LAYER,
		offsetX: { value: 2 },
	});
	assert.equal(result.success, false);
});

test("rejects a layer whose offsetY is not a valid DimensionValue", () => {
	const result = ShadowValueSchema.safeParse({
		...VALID_LAYER,
		offsetY: { value: 2 },
	});
	assert.equal(result.success, false);
});

test("rejects a layer whose blur is not a valid DimensionValue", () => {
	const result = ShadowValueSchema.safeParse({
		...VALID_LAYER,
		blur: { value: 2 },
	});
	assert.equal(result.success, false);
});

test("rejects a layer whose spread is not a valid DimensionValue", () => {
	const result = ShadowValueSchema.safeParse({
		...VALID_LAYER,
		spread: { value: 2 },
	});
	assert.equal(result.success, false);
});

test("rejects an array containing one invalid layer even when the others are valid", () => {
	const result = ShadowValueSchema.safeParse([
		VALID_LAYER,
		{ ...VALID_LAYER, blur: "2px" },
	]);
	assert.equal(result.success, false);
});

test("rejects an empty array", () => {
	const result = ShadowValueSchema.safeParse([]);
	assert.equal(result.success, false);
});
