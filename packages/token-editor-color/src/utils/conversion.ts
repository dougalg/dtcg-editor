import {
	consoleLogger,
	type Logger,
	toLoggedUnknownError,
	type UnknownError,
} from "@dtcg-editor/errors";
import type {
	ColorComponent,
	ColorObjectValue,
	ColorSpace,
	ColorValue,
} from "@dtcg-editor/token-core";

/** A legacy bare 6-digit hex `$value` (the `string` arm of `ColorValue`). */
type LegacyHexColorValue = Extract<ColorValue, string>;

import {
	A98RGB,
	ColorSpace as ColorJSSpace,
	deltaEOK,
	HSL,
	HWB,
	inGamut,
	Lab,
	LCH,
	OKLab,
	OKLCH,
	P3,
	ProPhoto,
	parse,
	REC_2020,
	serialize,
	sRGB,
	sRGB_Linear,
	to,
	toGamut,
	XYZ_D50,
	XYZ_D65,
} from "colorjs.io/fn";
import { err, fromThrowable, ok, type Result } from "neverthrow";
import { COMPONENT_RANGES } from "./range-validation.ts";

// Module-load-time side effect: `colorjs.io/fn`'s tree-shakable entry point
// requires each space to be explicitly registered before `parse`/`to` can
// resolve it by id (confirmed against the installed `colorjs.io@0.7.1`
// source — `colorjs.io/spaces`, not `/fn`, is the only entry point that
// auto-registers, and importing it would pull in every space colorjs.io
// ships, not just the 14 DTCG needs).
for (const space of [
	sRGB,
	sRGB_Linear,
	HSL,
	HWB,
	Lab,
	LCH,
	OKLab,
	OKLCH,
	P3,
	A98RGB,
	ProPhoto,
	REC_2020,
	XYZ_D65,
	XYZ_D50,
]) {
	ColorJSSpace.register(space);
}

/**
 * DTCG's 14 `colorSpace` ids map 1:1 onto colorjs.io's space registry, but
 * four wide-gamut RGB spaces use different id strings there
 * (`display-p3`/`a98-rgb`/`prophoto-rgb` → `p3`/`a98rgb`/`prophoto`) —
 * everything else matches verbatim.
 */
const COLORJS_SPACE_ID: Record<ColorSpace, string> = {
	srgb: "srgb",
	"srgb-linear": "srgb-linear",
	hsl: "hsl",
	hwb: "hwb",
	lab: "lab",
	lch: "lch",
	oklab: "oklab",
	oklch: "oklch",
	"display-p3": "p3",
	"a98-rgb": "a98rgb",
	"prophoto-rgb": "prophoto",
	rec2020: "rec2020",
	"xyz-d65": "xyz-d65",
	"xyz-d50": "xyz-d50",
};

const FALLBACK_SRGB_HEX = "#000000";

/**
 * Converts a `ColorValue` into the sRGB hex string used as the optional
 * `hex` fallback on an object value, clipping an out-of-sRGB-gamut value
 * (e.g. `rec2020`/`display-p3`) to its nearest in-gamut sRGB approximation.
 * A legacy bare-hex value passes through unchanged. A `"none"` component is
 * treated as `0` solely for this display-only approximation.
 */
export function colorValueToSrgbHex(value: ColorValue): string {
	if (typeof value === "string") {
		return value;
	}
	try {
		const [c0, c1, c2] = value.components.map((component) =>
			component === "none" ? 0 : component,
		);
		if (Number.isNaN(c0) || Number.isNaN(c1) || Number.isNaN(c2)) {
			return FALLBACK_SRGB_HEX;
		}
		const color = {
			space: COLORJS_SPACE_ID[value.colorSpace],
			coords: [c0, c1, c2] as [number, number, number],
		};
		const srgb = to(color, "srgb");
		const clipped = toGamut(srgb, { space: "srgb" });
		return serialize(clipped, {
			format: "hex",
			collapse: false,
			alpha: false,
		});
	} catch {
		return FALLBACK_SRGB_HEX;
	}
}

/** A per-channel before→after entry for the conversion confirmation dialog. */
export interface ChannelChange {
	/** Label from the **target** space's component ranges (e.g. `"L"`, `"H"`). */
	readonly label: string;
	/**
	 * Source-space value, unrounded. The literal `"none"` when the source
	 * channel was `"none"` (the maths uses `0`). `null` when the source has no
	 * per-channel counterpart (a legacy bare-hex value).
	 */
	readonly from: number | "none" | null;
	/** Target-space value, unrounded. */
	readonly to: number;
	/** `true` when `from` and `to` differ at all. */
	readonly changed: boolean;
}

/** A plain-language consequence of an inexact conversion. */
export type ConversionNote =
	| { readonly kind: "gamut-clamped" }
	| { readonly kind: "hue-undefined"; readonly channelIndex: 0 | 1 | 2 };

/** The described outcome of converting a colour into another space. */
export interface ColorConversion {
	readonly targetSpace: ColorSpace;
	/** The value to write on Accept — always concrete finite numbers. */
	readonly components: [number, number, number];
	/** Unchanged from the input. */
	readonly alpha: number | undefined;
	/** Recomputed sRGB fallback iff the input carried one. */
	readonly hex: string | undefined;
	readonly classification:
		| "within-tolerance"
		| "gamut-mapped"
		| "channel-undefined";
	readonly channelChanges: readonly [
		ChannelChange,
		ChannelChange,
		ChannelChange,
	];
	readonly notes: readonly ConversionNote[];
	/** The round-trip perceptual difference that was actually computed. */
	readonly deltaEOK: number;
}

/**
 * Converts an authored colour to the visually-equivalent value in
 * `targetSpace` (FR-009). Gamut-maps an out-of-gamut result (CSS Color 4
 * OKLCH chroma reduction) and reports whether the switch is within the
 * caller's `tolerance` (a ΔEOK threshold — see FR-010a). Never throws: an
 * unexpected `colorjs.io` failure is logged once and returned as an
 * `UnknownError` (repo Principles V/VI).
 */
export function convertColorValue(
	value: ColorObjectValue | LegacyHexColorValue,
	targetSpace: ColorSpace,
	tolerance: number,
	logger: Logger = consoleLogger,
): Result<ColorConversion, UnknownError> {
	const safe = fromThrowable(computeConversion, (caught) =>
		toLoggedUnknownError(logger, caught, "convertColorValue"),
	);
	const result = safe(value, targetSpace, tolerance);
	return result.isOk() ? ok(result.value) : err(result.error);
}

function computeConversion(
	value: ColorObjectValue | LegacyHexColorValue,
	targetSpace: ColorSpace,
	tolerance: number,
): ColorConversion {
	const isLegacy = typeof value === "string";
	const sourceSpace: ColorSpace = isLegacy ? "srgb" : value.colorSpace;
	const sourceCoords: [number, number, number] = isLegacy
		? (to(parse(value), "srgb").coords.slice(0, 3) as [number, number, number])
		: (value.components.map((c: ColorComponent) => (c === "none" ? 0 : c)) as [
				number,
				number,
				number,
			]);
	const alpha = isLegacy ? undefined : value.alpha;
	const hadHex = !isLegacy && value.hex !== undefined;

	const sourceColor = {
		space: COLORJS_SPACE_ID[sourceSpace],
		coords: sourceCoords,
	};
	const targetId = COLORJS_SPACE_ID[targetSpace];
	const notes: ConversionNote[] = [];

	const raw = to(sourceColor, targetId).coords;
	let coords: [number, number, number] = ([0, 1, 2] as const).map((i) => {
		const c = raw[i];
		if (typeof c !== "number" || Number.isNaN(c)) {
			notes.push({ kind: "hue-undefined", channelIndex: i });
			return 0;
		}
		return c;
	}) as [number, number, number];

	if (!inGamut({ space: targetId, coords }, targetId)) {
		const mapped = toGamut(
			{ space: targetId, coords },
			{ space: targetId, method: "css" },
		);
		coords = mapped.coords.slice(0, 3) as [number, number, number];
		notes.push({ kind: "gamut-clamped" });
	}

	const hueUndefined = notes.some((n) => n.kind === "hue-undefined");
	const gamutClamped = notes.some((n) => n.kind === "gamut-clamped");

	// A same-space conversion is exact by construction — skip the round-trip
	// so floating-point dust never pushes it out of "within-tolerance" when a
	// caller passes `tolerance: 0` (the contract's idempotency guarantee).
	const sameSpace =
		!hueUndefined && !gamutClamped && sourceSpace === targetSpace;
	const dE = sameSpace
		? 0
		: deltaEOK(
				sourceColor,
				to({ space: targetId, coords }, COLORJS_SPACE_ID[sourceSpace]),
			);

	const classification: ColorConversion["classification"] = hueUndefined
		? "channel-undefined"
		: gamutClamped
			? "gamut-mapped"
			: sameSpace || dE < tolerance
				? "within-tolerance"
				: "gamut-mapped";

	const targetRanges = COMPONENT_RANGES[targetSpace];
	const channelChanges = ([0, 1, 2] as const).map((i): ChannelChange => {
		const from: number | "none" | null = isLegacy
			? null
			: (value.components[i] ?? null);
		const toVal = coords[i];
		const fromNum = from === "none" ? 0 : (from ?? Number.NaN);
		const changed = from === null ? true : fromNum !== toVal;
		return { label: targetRanges[i].label, from, to: toVal, changed };
	}) as [ChannelChange, ChannelChange, ChannelChange];

	return {
		targetSpace,
		components: coords,
		alpha,
		hex: hadHex
			? colorValueToSrgbHex({ colorSpace: targetSpace, components: coords })
			: undefined,
		classification,
		channelChanges,
		notes,
		deltaEOK: dE,
	};
}
