import assert from "node:assert/strict";
import { test } from "node:test";
import { COLOR_SPACES } from "@dtcg-editor/token-core";
import {
	ColorEditorOptionsSchema,
	defineColorConfig,
} from "./configuration.ts";

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

test("ColorEditorOptionsSchema accepts spaceSwitchTolerance of 0, a positive number, or absence (FR-010a)", () => {
	assert.equal(
		ColorEditorOptionsSchema.safeParse({ spaceSwitchTolerance: 0 }).success,
		true,
	);
	assert.equal(
		ColorEditorOptionsSchema.safeParse({ spaceSwitchTolerance: 0.05 }).success,
		true,
	);
	assert.equal(ColorEditorOptionsSchema.safeParse({}).success, true);
});

test("ColorEditorOptionsSchema rejects a negative or non-number spaceSwitchTolerance (FR-010a)", () => {
	assert.equal(
		ColorEditorOptionsSchema.safeParse({ spaceSwitchTolerance: -1 }).success,
		false,
	);
	assert.equal(
		ColorEditorOptionsSchema.safeParse({ spaceSwitchTolerance: "0.02" })
			.success,
		false,
	);
});

test("defineColorConfig is a type-checked identity helper (AC-13)", () => {
	const options = defineColorConfig({ colorSpaces: ["srgb", "oklch"] });
	assert.deepEqual(options, { colorSpaces: ["srgb", "oklch"] });
});
