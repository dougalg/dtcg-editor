import assert from "node:assert/strict";
import { test } from "node:test";
import { COLOR_SPACES, type ColorObjectValue } from "@dtcg-editor/token-core";
import {
	colorValueToSrgbHex,
	srgbHexToColorSpaceComponents,
} from "./conversion.ts";

const HEX_PATTERN = /^#[0-9a-f]{6}$/;

function hexToRgbBytes(hex: string): [number, number, number] {
	return [
		Number.parseInt(hex.slice(1, 3), 16),
		Number.parseInt(hex.slice(3, 5), 16),
		Number.parseInt(hex.slice(5, 7), 16),
	];
}

for (const colorSpace of COLOR_SPACES) {
	test(`round-trips a known sRGB hex through ${colorSpace} and back`, () => {
		const originalHex = "#3366cc";
		const components = srgbHexToColorSpaceComponents(originalHex, colorSpace);
		assert.ok(components !== null, "expected a non-null conversion result");
		for (const component of components) {
			assert.equal(Number.isNaN(component), false);
		}

		const value: ColorObjectValue = { colorSpace, components };
		const roundTripHex = colorValueToSrgbHex(value);
		assert.match(roundTripHex, HEX_PATTERN);

		const [origR, origG, origB] = hexToRgbBytes(originalHex);
		const [gotR, gotG, gotB] = hexToRgbBytes(roundTripHex);
		const epsilon = 4;
		assert.ok(Math.abs(origR - gotR) <= epsilon, `R: ${origR} vs ${gotR}`);
		assert.ok(Math.abs(origG - gotG) <= epsilon, `G: ${origG} vs ${gotG}`);
		assert.ok(Math.abs(origB - gotB) <= epsilon, `B: ${origB} vs ${gotB}`);
	});
}

test("a wide-gamut display-p3 value converts to a clipped-but-valid 6-digit hex", () => {
	const value: ColorObjectValue = {
		colorSpace: "display-p3",
		components: [1, 0, 0.5],
	};
	const hex = colorValueToSrgbHex(value);
	assert.match(hex, HEX_PATTERN);
	const [r, g, b] = hexToRgbBytes(hex);
	for (const byte of [r, g, b]) {
		assert.ok(byte >= 0 && byte <= 255 && !Number.isNaN(byte));
	}
});

test("a rec2020 value converts to a clipped-but-valid 6-digit hex", () => {
	const value: ColorObjectValue = {
		colorSpace: "rec2020",
		components: [0.9, 0.1, 0.1],
	};
	const hex = colorValueToSrgbHex(value);
	assert.match(hex, HEX_PATTERN);
});

test("colorValueToSrgbHex passes a legacy bare-hex value through unchanged", () => {
	assert.equal(colorValueToSrgbHex("#1f75cb"), "#1f75cb");
});

test("colorValueToSrgbHex treats a 'none' component as 0 for display purposes", () => {
	const hex = colorValueToSrgbHex({
		colorSpace: "hsl",
		components: ["none", 0, 96],
	});
	assert.match(hex, HEX_PATTERN);
});

test("colorValueToSrgbHex never throws and falls back to #000000 for a malformed value", () => {
	const malformed = {
		colorSpace: "srgb",
		components: [Number.NaN, Number.NaN, Number.NaN],
	} as ColorObjectValue;
	assert.equal(colorValueToSrgbHex(malformed), "#000000");
});

test("srgbHexToColorSpaceComponents returns null (not a corrupting fallback) for a malformed hex", () => {
	assert.equal(srgbHexToColorSpaceComponents("not-a-hex", "srgb"), null);
});

test("srgbHexToColorSpaceComponents converts white to the max components of each space's RGB-like family", () => {
	const components = srgbHexToColorSpaceComponents("#ffffff", "srgb");
	assert.ok(components !== null);
	for (const component of components) {
		assert.ok(Math.abs(component - 1) < 1e-6, `expected ~1, got ${component}`);
	}
});
