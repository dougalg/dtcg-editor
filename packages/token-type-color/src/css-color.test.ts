import { test } from "node:test";
import assert from "node:assert/strict";
import { colorValueToCssColor } from "./css-color.ts";

test("srgb (predefined color() form)", () => {
	assert.equal(
		colorValueToCssColor({ colorSpace: "srgb", components: [0.5, 0.2, 0.8] }),
		"color(srgb 0.5 0.2 0.8)",
	);
});

test("display-p3 with alpha", () => {
	assert.equal(
		colorValueToCssColor({
			colorSpace: "display-p3",
			components: [1, 0, 0.5],
			alpha: 0.5,
		}),
		"color(display-p3 1 0 0.5 / 0.5)",
	);
});

test("xyz-d65 (predefined color() form)", () => {
	assert.equal(
		colorValueToCssColor({
			colorSpace: "xyz-d65",
			components: [0.5, 0.5, 0.5],
		}),
		"color(xyz-d65 0.5 0.5 0.5)",
	);
});

test("hsl", () => {
	assert.equal(
		colorValueToCssColor({ colorSpace: "hsl", components: [210, 50, 40] }),
		"hsl(210 50% 40%)",
	);
});

test("hsl with a 'none' component", () => {
	assert.equal(
		colorValueToCssColor({ colorSpace: "hsl", components: ["none", 50, 40] }),
		"hsl(none 50% 40%)",
	);
});

test("hwb", () => {
	assert.equal(
		colorValueToCssColor({ colorSpace: "hwb", components: [210, 20, 20] }),
		"hwb(210 20% 20%)",
	);
});

test("lab", () => {
	assert.equal(
		colorValueToCssColor({ colorSpace: "lab", components: [50, 40, -30] }),
		"lab(50 40 -30)",
	);
});

test("lch", () => {
	assert.equal(
		colorValueToCssColor({ colorSpace: "lch", components: [50, 40, 200] }),
		"lch(50 40 200)",
	);
});

test("oklab", () => {
	assert.equal(
		colorValueToCssColor({
			colorSpace: "oklab",
			components: [0.7, 0.1, -0.05],
		}),
		"oklab(0.7 0.1 -0.05)",
	);
});

test("oklch with alpha", () => {
	assert.equal(
		colorValueToCssColor({
			colorSpace: "oklch",
			components: [0.7, 0.15, 200],
			alpha: 0.5,
		}),
		"oklch(0.7 0.15 200 / 0.5)",
	);
});

test("legacy bare-hex passthrough", () => {
	assert.equal(colorValueToCssColor("#ff00ff"), "#ff00ff");
});
