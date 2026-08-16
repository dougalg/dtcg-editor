import { z } from "zod";

/**
 * The 14 colorSpace values defined by the DTCG 2025.10 Color module
 * (designtokens.org/tr/2025.10/color/).
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
] as const;

export type ColorSpace = (typeof COLOR_SPACES)[number];

const ColorComponentSchema = z.union([z.number(), z.literal("none")]);
export type ColorComponent = z.infer<typeof ColorComponentSchema>;

/**
 * The DTCG 2025.10 Color module's object `$value` shape. `alpha` absent
 * means fully opaque per spec — not defaulted here, only treated as `1`
 * wherever alpha is consumed (see `colorValueToCssColor`).
 */
export const ColorObjectValueSchema = z.object({
	colorSpace: z.enum(COLOR_SPACES),
	components: z.tuple([
		ColorComponentSchema,
		ColorComponentSchema,
		ColorComponentSchema,
	]),
	alpha: z.number().optional(),
	hex: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/)
		.optional(),
});

export type ColorObjectValue = z.infer<typeof ColorObjectValueSchema>;

/**
 * A deliberate, explicitly-flagged deviation from the DTCG 2025.10 spec
 * (which only defines the object shape above): a bare 6-digit hex string is
 * also accepted as a `color` token's `$value`, for compatibility with token
 * files authored against pre-2025 draft conventions.
 */
export const LegacyHexColorValueSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const ColorValueSchema = z.union([
	ColorObjectValueSchema,
	LegacyHexColorValueSchema,
]);

export type ColorValue = z.infer<typeof ColorValueSchema>;
