import assert from "node:assert/strict";
import { test } from "node:test";
import { COLOR_SPACES, type ColorObjectValue } from "@dtcg-editor/token-core";
import {
	type ColorConversion,
	colorValueToSrgbHex,
	convertColorValue,
	formatChannel,
} from "./conversion.ts";

const HEX_PATTERN = /^#[0-9a-f]{6}$/;

function unwrap(result: ReturnType<typeof convertColorValue>): ColorConversion {
	assert.ok(result.isOk(), "expected an ok conversion");
	return result.value;
}

// --- formatChannel (contract T13) -----------------------------------------

test("formatChannel: no rounding, trims trailing zeros and bare dot, -0 -> 0", () => {
	assert.equal(formatChannel(0.5), "0.5");
	assert.equal(formatChannel(0.5000000001), "0.5000000001");
	assert.equal(formatChannel(145), "145");
	assert.equal(formatChannel(-0), "0");
	assert.equal(formatChannel(0), "0");
	assert.equal(formatChannel(0.123456), "0.123456");
	assert.equal(formatChannel(0.0000001), "0.0000001");
	assert.equal(formatChannel(-0.25), "-0.25");
});

// --- colorValueToSrgbHex (relocated, unchanged behaviour) ----------------

test("colorValueToSrgbHex passes a legacy bare-hex value through unchanged", () => {
	assert.equal(colorValueToSrgbHex("#1f75cb"), "#1f75cb");
});

test("colorValueToSrgbHex treats a 'none' component as 0 for display purposes", () => {
	assert.match(
		colorValueToSrgbHex({ colorSpace: "hsl", components: ["none", 0, 96] }),
		HEX_PATTERN,
	);
});

test("colorValueToSrgbHex never throws and falls back to #000000 for a malformed value", () => {
	const malformed = {
		colorSpace: "srgb",
		components: [Number.NaN, Number.NaN, Number.NaN],
	} as ColorObjectValue;
	assert.equal(colorValueToSrgbHex(malformed), "#000000");
});

test("a wide-gamut display-p3 value converts to a clipped-but-valid 6-digit hex", () => {
	assert.match(
		colorValueToSrgbHex({ colorSpace: "display-p3", components: [1, 0, 0.5] }),
		HEX_PATTERN,
	);
});

// --- convertColorValue (contract T1..T12) --------------------------------

test("T1: every space<->space pair round-trips within deltaEOK 0.02 at tolerance 0.02", () => {
	const seed: ColorObjectValue = {
		colorSpace: "srgb",
		components: [0.4, 0.55, 0.7],
	};
	for (const from of COLOR_SPACES) {
		const toFrom = unwrap(convertColorValue(seed, from, 0.02));
		const there: ColorObjectValue = {
			colorSpace: from,
			components: toFrom.components,
		};
		for (const target of COLOR_SPACES) {
			const conv = unwrap(convertColorValue(there, target, 0.02));
			assert.ok(
				conv.deltaEOK < 0.02,
				`${from} -> ${target} deltaEOK ${conv.deltaEOK}`,
			);
		}
	}
});

test("T2: in-sRGB-gamut srgb -> oklch is within-tolerance with no notes", () => {
	const conv = unwrap(
		convertColorValue(
			{ colorSpace: "srgb", components: [0.2, 0.4, 0.9] },
			"oklch",
			0.02,
		),
	);
	assert.equal(conv.classification, "within-tolerance");
	assert.equal(conv.notes.length, 0);
});

test("T3: wide-gamut oklch(0.7 0.3 30) -> srgb is gamut-mapped, components in [0,1]", () => {
	const conv = unwrap(
		convertColorValue(
			{ colorSpace: "oklch", components: [0.7, 0.3, 30] },
			"srgb",
			0.02,
		),
	);
	assert.equal(conv.classification, "gamut-mapped");
	assert.ok(conv.notes.some((n) => n.kind === "gamut-clamped"));
	for (const c of conv.components) {
		assert.ok(c >= 0 && c <= 1, `component ${c} not in [0,1]`);
	}
});

test("T4: achromatic srgb(0.5 0.5 0.5) -> oklch is channel-undefined, hue 0", () => {
	const conv = unwrap(
		convertColorValue(
			{ colorSpace: "srgb", components: [0.5, 0.5, 0.5] },
			"oklch",
			0.02,
		),
	);
	assert.equal(conv.classification, "channel-undefined");
	const note = conv.notes.find((n) => n.kind === "hue-undefined");
	assert.ok(note && note.kind === "hue-undefined");
	assert.equal(note.channelIndex, 2);
	assert.equal(conv.components[2], 0);
});

test("T5: alpha is preserved unchanged across a space switch", () => {
	const conv = unwrap(
		convertColorValue(
			{ colorSpace: "srgb", components: [0.2, 0.4, 0.9], alpha: 0.4 },
			"oklch",
			0.02,
		),
	);
	assert.equal(conv.alpha, 0.4);
});

test("T6: a 'none' component is treated as 0 and never appears in the output", () => {
	const conv = unwrap(
		convertColorValue(
			{ colorSpace: "srgb", components: ["none", 0.4, 0.9] },
			"oklch",
			0.02,
		),
	);
	for (const c of conv.components) {
		assert.equal(typeof c, "number");
		assert.equal(Number.isNaN(c), false);
	}
});

test("T7: hex fallback is recomputed when the input carried one", () => {
	const conv = unwrap(
		convertColorValue(
			{
				colorSpace: "srgb",
				components: [0.2, 0.4, 0.9],
				hex: "#3366cc",
			},
			"oklch",
			0.02,
		),
	);
	assert.equal(
		conv.hex,
		colorValueToSrgbHex({ colorSpace: "oklch", components: conv.components }),
	);
});

test("T8: no hex on the result when the input had none", () => {
	const conv = unwrap(
		convertColorValue(
			{ colorSpace: "srgb", components: [0.2, 0.4, 0.9] },
			"oklch",
			0.02,
		),
	);
	assert.equal(conv.hex, undefined);
});

test("T9: same-space conversion is within-tolerance with deltaEOK ~ 0 and no changes", () => {
	const conv = unwrap(
		convertColorValue(
			{ colorSpace: "oklch", components: [0.7, 0.15, 145] },
			"oklch",
			0.02,
		),
	);
	assert.equal(conv.classification, "within-tolerance");
	assert.ok(conv.deltaEOK < 1e-6);
	for (const change of conv.channelChanges) {
		assert.equal(change.changed, false);
	}
});

test("T10: a legacy bare-hex value converts, treated as sRGB, with finite components", () => {
	const conv = unwrap(convertColorValue("#3366cc", "oklch", 0.02));
	for (const c of conv.components) {
		assert.equal(Number.isFinite(c), true);
	}
	for (const change of conv.channelChanges) {
		assert.equal(change.from, null);
	}
});

test("T11: a forced colorjs failure returns err(UnknownError), logs once, never throws", () => {
	let calls = 0;
	const spyLogger = {
		error() {
			calls += 1;
		},
	};
	const result = convertColorValue(
		{ colorSpace: "srgb", components: [0, 0, 0] },
		"not-a-real-space" as never,
		0.02,
		spyLogger,
	);
	assert.ok(result.isErr());
	assert.equal(result.error.kind, "unknown");
	assert.equal(calls, 1);
});

test("T12: tolerance 0 makes an in-gamut switch with deltaEOK > 0 not within-tolerance", () => {
	const strict = unwrap(
		convertColorValue(
			{ colorSpace: "srgb", components: [0.2, 0.4, 0.9] },
			"oklab",
			0,
		),
	);
	assert.equal(strict.classification, "gamut-mapped");
	const same = unwrap(
		convertColorValue(
			{ colorSpace: "oklch", components: [0.7, 0.15, 145] },
			"oklch",
			0,
		),
	);
	assert.equal(same.classification, "within-tolerance");
});
