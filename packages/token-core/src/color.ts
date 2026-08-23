import {
	type DTCGColor,
	type DTCGColorSpace,
	isColorValue,
} from "@styleframe/dtcg";
import { z } from "zod";

/**
 * SPIKE: re-exported from @styleframe/dtcg rather than hand-rolled. The
 * library defines the same 14 colorSpace values as the DTCG 2025.10 Color
 * module (designtokens.org/tr/2025.10/color/).
 */
export const COLOR_SPACES = [
	"srgb",
	"srgb-linear",
	"hsl",
	"hwb",
	"lab",
	"lch",
	"oklab",
	"oklch",
	"display-p3",
	"a98-rgb",
	"prophoto-rgb",
	"rec2020",
	"xyz-d65",
	"xyz-d50",
] as const satisfies readonly DTCGColorSpace[];

export type ColorSpace = DTCGColorSpace;
export type ColorComponent = DTCGColor["components"][number];

/**
 * SPIKE: structural validation delegated to @styleframe/dtcg's `isColorValue`
 * guard via `z.custom`, instead of a hand-rolled `z.object`/`z.tuple` shape.
 * `hex` is loosened from this repo's original 6-digit-only regex to the
 * library's `#rrggbb` or `#rrggbbaa` — a real (minor) behavior change this
 * spike would need to flag if pursued for real.
 */
export const ColorObjectValueSchema = z.custom<DTCGColor>((value) =>
	isColorValue(value),
);

export type ColorObjectValue = DTCGColor;

/**
 * A deliberate, explicitly-flagged deviation from the DTCG 2025.10 spec
 * (which only defines the object shape above): a bare 6-digit hex string is
 * also accepted as a `color` token's `$value`, for compatibility with token
 * files authored against pre-2025 draft conventions. @styleframe/dtcg has no
 * equivalent — a bare-hex `$value` isn't part of its `DTCGColor` shape at
 * all, so this app-specific deviation stays hand-rolled even in the spike.
 */
export const LegacyHexColorValueSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const ColorValueSchema = z.union([
	ColorObjectValueSchema,
	LegacyHexColorValueSchema,
]);

export type ColorValue = z.infer<typeof ColorValueSchema>;
