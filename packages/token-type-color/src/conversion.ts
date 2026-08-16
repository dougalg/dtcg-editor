import {
	A98RGB,
	ColorSpace as ColorJSSpace,
	HSL,
	HWB,
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
import type { ColorSpace, ColorValue } from "./color.ts";

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
 * Converts an sRGB hex string (as emitted by a native `<input type="color">`)
 * into `targetSpace`'s numeric components. Returns `null` on a conversion
 * failure instead of a magic-number fallback — unlike {@link colorValueToSrgbHex},
 * this result gets written back into the token's real `components` via the
 * caller's `onChange`, so silently substituting `[0, 0, 0]` here would risk
 * corrupting real data; the caller skips its `onChange` call on `null`
 * instead (see `editor.tsx`'s `handlePickerChange`).
 */
export function srgbHexToColorSpaceComponents(
	hex: string,
	targetSpace: ColorSpace,
): [number, number, number] | null {
	try {
		const parsed = parse(hex);
		const converted = to(parsed, COLORJS_SPACE_ID[targetSpace]);
		const [c0, c1, c2] = converted.coords;
		if (
			typeof c0 !== "number" ||
			typeof c1 !== "number" ||
			typeof c2 !== "number" ||
			Number.isNaN(c0) ||
			Number.isNaN(c1) ||
			Number.isNaN(c2)
		) {
			return null;
		}
		return [c0, c1, c2];
	} catch {
		return null;
	}
}

/**
 * Converts a `ColorValue` into the sRGB hex string a native
 * `<input type="color">` can display, clipping an out-of-sRGB-gamut value
 * (e.g. `rec2020`/`display-p3`) to its nearest in-gamut sRGB approximation —
 * an accepted, documented limitation of the native control (FR-06). A legacy
 * bare-hex value passes through unchanged. A `"none"` component is treated
 * as `0` solely for computing this display-only approximation — never
 * written back into the token's actual `components` (only this read
 * direction ever sees `"none"`).
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
