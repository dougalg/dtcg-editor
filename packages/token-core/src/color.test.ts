import assert from "node:assert/strict";
import { test } from "node:test";
import {
	COLOR_SPACES,
	type ColorObjectValue,
	ColorValueSchema,
} from "./color.ts";

const VALID_VALUES: Record<
	(typeof COLOR_SPACES)[number],
	readonly [number, number, number]
> = {
	srgb: [0.5, 0.2, 0.8],
	"srgb-linear": [0.5, 0.2, 0.8],
	hsl: [210, 50, 40],
	hwb: [210, 20, 20],
	lab: [50, 40, -30],
	lch: [50, 40, 200],
	oklab: [0.7, 0.1, -0.05],
	oklch: [0.7, 0.15, 200],
	"display-p3": [1, 0, 0.5],
	"a98-rgb": [0.5, 0.5, 0.5],
	"prophoto-rgb": [0.5, 0.5, 0.5],
	rec2020: [0.5, 0.5, 0.5],
	"xyz-d65": [0.5, 0.5, 0.5],
	"xyz-d50": [0.5, 0.5, 0.5],
};

for (const colorSpace of COLOR_SPACES) {
	test(`accepts a valid ${colorSpace} value`, () => {
		const value: ColorObjectValue = {
			colorSpace,
			components: [...VALID_VALUES[colorSpace]],
		};
		const result = ColorValueSchema.safeParse(value);
		assert.equal(result.success, true);
	});
}

test("accepts a 'none' component", () => {
	const result = ColorValueSchema.safeParse({
		colorSpace: "hsl",
		components: ["none", 50, 40],
	});
	assert.equal(result.success, true);
});

test("accepts a legacy bare-hex string", () => {
	const result = ColorValueSchema.safeParse("#ff00ff");
	assert.equal(result.success, true);
});

test("rejects a wrong-length components array", () => {
	const result = ColorValueSchema.safeParse({
		colorSpace: "srgb",
		components: [0.5, 0.2],
	});
	assert.equal(result.success, false);
});

test("rejects a non-enum colorSpace", () => {
	const result = ColorValueSchema.safeParse({
		colorSpace: "cmyk",
		components: [0.5, 0.2, 0.8],
	});
	assert.equal(result.success, false);
});

test("rejects a malformed hex (7 chars)", () => {
	const result = ColorValueSchema.safeParse("#ff00ff0");
	assert.equal(result.success, false);
});

test("rejects a malformed hex (missing #)", () => {
	const result = ColorValueSchema.safeParse("ff00ff");
	assert.equal(result.success, false);
});
