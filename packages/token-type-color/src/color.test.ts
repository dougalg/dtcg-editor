import { test } from "node:test";
import assert from "node:assert/strict";
import {
	COLOR_SPACES,
	ColorEditorOptionsSchema,
	ColorValueSchema,
	checkColorValueIssues,
	defineColorConfig,
	type ColorObjectValue,
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

test("checkColorValueIssues returns [] for in-range values across space families", () => {
	assert.deepEqual(
		checkColorValueIssues({ colorSpace: "srgb", components: [0.5, 0.2, 0.8] }),
		[],
	);
	assert.deepEqual(
		checkColorValueIssues({ colorSpace: "hsl", components: [210, 50, 40] }),
		[],
	);
	assert.deepEqual(
		checkColorValueIssues({ colorSpace: "lab", components: [50, 40, -30] }),
		[],
	);
});

test("checkColorValueIssues flags an out-of-range hsl hue", () => {
	const issues = checkColorValueIssues({
		colorSpace: "hsl",
		components: [400, 50, 40],
	});
	assert.equal(issues.length, 1);
});

test("checkColorValueIssues flags an out-of-range srgb component", () => {
	const issues = checkColorValueIssues({
		colorSpace: "srgb",
		components: [1.5, 0.2, 0.8],
	});
	assert.equal(issues.length, 1);
});

test("checkColorValueIssues ignores a 'none' component that would otherwise be out of range", () => {
	const issues = checkColorValueIssues({
		colorSpace: "hsl",
		components: ["none", 50, 40],
	});
	assert.deepEqual(issues, []);
});

test("checkColorValueIssues returns [] for a legacy hex string", () => {
	assert.deepEqual(checkColorValueIssues("#ff00ff"), []);
});

test("ColorEditorOptionsSchema accepts undefined colorSpaces (zero-config: all 14 spaces)", () => {
	assert.equal(ColorEditorOptionsSchema.safeParse({}).success, true);
});

test("ColorEditorOptionsSchema accepts a valid non-empty colorSpaces array", () => {
	assert.equal(
		ColorEditorOptionsSchema.safeParse({ colorSpaces: ["srgb", "hsl"] })
			.success,
		true,
	);
});

test("ColorEditorOptionsSchema accepts an array containing only valid enum members", () => {
	assert.equal(
		ColorEditorOptionsSchema.safeParse({ colorSpaces: [...COLOR_SPACES] })
			.success,
		true,
	);
});

test("ColorEditorOptionsSchema rejects an empty colorSpaces array (AC-04)", () => {
	assert.equal(
		ColorEditorOptionsSchema.safeParse({ colorSpaces: [] }).success,
		false,
	);
});

test("ColorEditorOptionsSchema rejects an array containing an invalid space string (AC-03)", () => {
	assert.equal(
		ColorEditorOptionsSchema.safeParse({ colorSpaces: ["cmyk"] }).success,
		false,
	);
});

test("defineColorConfig is a type-checked identity helper (AC-13)", () => {
	const options = defineColorConfig({ colorSpaces: ["srgb", "oklch"] });
	assert.deepEqual(options, { colorSpaces: ["srgb", "oklch"] });
});
