import assert from "node:assert/strict";
import { colorTokenType } from "@dtcg-editor/token-editor-color";
import { test } from "vitest";
import { BUILT_IN_TOKEN_TYPES, resolveBuiltInContract } from "./built-in.ts";

test("colorTokenType exports the color contract shape (AC-01)", () => {
	assert.equal(colorTokenType.type, "color");
	const parsed = colorTokenType.valueSchema.safeParse("#ff00ff");
	assert.equal(parsed.success, true);
});

test("BUILT_IN_TOKEN_TYPES includes dimension, color, duration, cubicBezier, fontWeight, strokeStyle, fontFamily, border, transition, number, shadow, and typography", () => {
	assert.deepEqual(
		[...BUILT_IN_TOKEN_TYPES],
		[
			"dimension",
			"color",
			"duration",
			"cubicBezier",
			"fontWeight",
			"strokeStyle",
			"fontFamily",
			"border",
			"transition",
			"number",
			"shadow",
			"typography",
		],
	);
});

test("resolveBuiltInContract('number') returns the number contract (spec 013 U22/A1)", () => {
	const contract = resolveBuiltInContract("number");
	assert.ok(contract);
	assert.equal(contract.type, "number");
	const parsed = contract.valueSchema.safeParse(1.5);
	assert.equal(parsed.success, true);
});

test("resolveBuiltInContract('fontFamily') returns the fontFamily contract", () => {
	const contract = resolveBuiltInContract("fontFamily");
	assert.equal(contract?.type, "fontFamily");
	const parsed = contract?.valueSchema.safeParse(["Helvetica", "Arial"]);
	assert.equal(parsed?.success, true);
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

test("BUILT_IN_TOKEN_TYPES includes border (spec 013 U28/U29)", () => {
	assert.ok((BUILT_IN_TOKEN_TYPES as readonly string[]).includes("border"));
});

test("resolveBuiltInContract('border') returns the border contract (spec 013 U28/U29)", () => {
	const contract = resolveBuiltInContract("border");
	assert.ok(contract);
	assert.equal(contract.type, "border");
	const parsed = contract.valueSchema.safeParse({
		color: { colorSpace: "srgb", components: [1, 0, 0] },
		width: { value: 1, unit: "px" },
		style: "solid",
	});
	assert.equal(parsed.success, true);
});

test("resolveBuiltInContract('transition') returns the transition contract", () => {
	const contract = resolveBuiltInContract("transition");
	assert.ok(contract);
	assert.equal(contract.type, "transition");
	const parsed = contract.valueSchema.safeParse({
		duration: { value: 200, unit: "ms" },
		delay: { value: 0, unit: "ms" },
		timingFunction: [0.4, 0, 0.2, 1],
	});
	assert.equal(parsed.success, true);
});

test("BUILT_IN_TOKEN_TYPES includes shadow", () => {
	assert.ok((BUILT_IN_TOKEN_TYPES as readonly string[]).includes("shadow"));
});

test("resolveBuiltInContract('shadow') returns the shadow contract", () => {
	const contract = resolveBuiltInContract("shadow");
	assert.ok(contract);
	assert.equal(contract.type, "shadow");
	const parsed = contract.valueSchema.safeParse({
		color: { colorSpace: "srgb", components: [0, 0, 0] },
		offsetX: { value: 0, unit: "px" },
		offsetY: { value: 2, unit: "px" },
		blur: { value: 4, unit: "px" },
		spread: { value: 0, unit: "px" },
	});
	assert.equal(parsed.success, true);
});

test("resolveBuiltInContract('typography') returns the typography contract", () => {
	const contract = resolveBuiltInContract("typography");
	assert.ok(contract);
	assert.equal(contract.type, "typography");
	const parsed = contract.valueSchema.safeParse({
		fontFamily: "Arial",
		fontSize: { value: 16, unit: "px" },
		fontWeight: 700,
		letterSpacing: { value: 0, unit: "px" },
		lineHeight: 1.4,
	});
	assert.equal(parsed.success, true);
});
