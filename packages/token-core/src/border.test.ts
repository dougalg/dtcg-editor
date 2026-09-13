import assert from "node:assert/strict";
import { test } from "node:test";
import { BorderValueSchema } from "./border.ts";

const VALID_COLOR = {
	colorSpace: "srgb",
	components: [1, 0, 0],
	alpha: 1,
} as const;

const VALID_WIDTH = { value: 1, unit: "px" } as const;

test("accepts a value with a full color-object color, valid width, named-keyword style", () => {
	const result = BorderValueSchema.safeParse({
		color: VALID_COLOR,
		width: VALID_WIDTH,
		style: "solid",
	});
	assert.equal(result.success, true);
});

test("accepts a value with a legacy bare-hex-string color", () => {
	const result = BorderValueSchema.safeParse({
		color: "#ff0000",
		width: VALID_WIDTH,
		style: "solid",
	});
	assert.equal(result.success, true);
});

test("accepts a value whose style is the custom dash-pattern object form", () => {
	const result = BorderValueSchema.safeParse({
		color: VALID_COLOR,
		width: VALID_WIDTH,
		style: { dashArray: [{ value: 4, unit: "px" }], lineCap: "butt" },
	});
	assert.equal(result.success, true);
});

test("rejects a value missing color", () => {
	const result = BorderValueSchema.safeParse({
		width: VALID_WIDTH,
		style: "solid",
	});
	assert.equal(result.success, false);
});

test("rejects a value missing width", () => {
	const result = BorderValueSchema.safeParse({
		color: VALID_COLOR,
		style: "solid",
	});
	assert.equal(result.success, false);
});

test("rejects a value missing style", () => {
	const result = BorderValueSchema.safeParse({
		color: VALID_COLOR,
		width: VALID_WIDTH,
	});
	assert.equal(result.success, false);
});

test("rejects a value whose width is not a valid DimensionValue (missing unit)", () => {
	const result = BorderValueSchema.safeParse({
		color: VALID_COLOR,
		width: { value: 1 },
		style: "solid",
	});
	assert.equal(result.success, false);
});

test("rejects a value whose color is not a valid ColorValue (wrong-length hex)", () => {
	const result = BorderValueSchema.safeParse({
		color: "#fff",
		width: VALID_WIDTH,
		style: "solid",
	});
	assert.equal(result.success, false);
});

test("rejects a value whose style is not a valid StrokeStyleValue (unrecognized keyword)", () => {
	const result = BorderValueSchema.safeParse({
		color: VALID_COLOR,
		width: VALID_WIDTH,
		style: "squiggly",
	});
	assert.equal(result.success, false);
});
