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

/**
 * `editorOptions` shape for the `color` extension entry (FR-04). Restricts
 * which `colorSpace`s `ColorEditor`'s dropdown offers when authoring —
 * purely a client-side authoring affordance, not a new validation boundary
 * (see `editor.tsx`'s allow-list handling and `checkColorValueIssues`, which
 * this doesn't touch).
 */
export interface ColorEditorOptions {
	readonly colorSpaces?: readonly ColorSpace[] | undefined;
}

/**
 * An explicitly empty `colorSpaces` array is rejected (`.min(1)`) rather
 * than silently producing a picker with zero selectable spaces — fails fast
 * in `defineConfig`, consistent with how other malformed config already
 * fails there.
 */
export const ColorEditorOptionsSchema: z.ZodType<ColorEditorOptions> = z.object(
	{
		colorSpaces: z.array(z.enum(COLOR_SPACES)).min(1).optional(),
	},
);

/**
 * Typed identity helper giving compile-time type-checking/autocomplete when
 * authoring `editorOptions` for a `color` extension entry — performs no
 * runtime validation itself. `defineConfig`'s `ColorEditorOptionsSchema`
 * check remains the actual enforcement point, so a config author bypassing
 * this helper (raw object literal, `as any`, etc.) is still caught.
 */
export function defineColorConfig(
	options: ColorEditorOptions,
): ColorEditorOptions {
	return options;
}

interface ComponentRange {
	readonly label: string;
	readonly min: number;
	readonly max: number;
	/** When true, `max` itself is excluded from the valid range (e.g. hue `[0, 360)`). */
	readonly exclusiveMax?: boolean;
}

type ComponentRanges = readonly [
	ComponentRange,
	ComponentRange,
	ComponentRange,
];

const UNIT_RGB_RANGES: ComponentRanges = [
	{ label: "R", min: 0, max: 1 },
	{ label: "G", min: 0, max: 1 },
	{ label: "B", min: 0, max: 1 },
];

const UNIT_XYZ_RANGES: ComponentRanges = [
	{ label: "X", min: 0, max: 1 },
	{ label: "Y", min: 0, max: 1 },
	{ label: "Z", min: 0, max: 1 },
];

/** Per-colorSpace component labels and numeric ranges, per the FR-02 table. */
export const COMPONENT_RANGES: Record<ColorSpace, ComponentRanges> = {
	srgb: UNIT_RGB_RANGES,
	"srgb-linear": UNIT_RGB_RANGES,
	"display-p3": UNIT_RGB_RANGES,
	"a98-rgb": UNIT_RGB_RANGES,
	"prophoto-rgb": UNIT_RGB_RANGES,
	rec2020: UNIT_RGB_RANGES,
	"xyz-d65": UNIT_XYZ_RANGES,
	"xyz-d50": UNIT_XYZ_RANGES,
	hsl: [
		{ label: "H", min: 0, max: 360, exclusiveMax: true },
		{ label: "S", min: 0, max: 100 },
		{ label: "L", min: 0, max: 100 },
	],
	hwb: [
		{ label: "H", min: 0, max: 360, exclusiveMax: true },
		{ label: "W", min: 0, max: 100 },
		{ label: "B", min: 0, max: 100 },
	],
	lab: [
		{ label: "L", min: 0, max: 100 },
		{ label: "a", min: -Infinity, max: Infinity },
		{ label: "b", min: -Infinity, max: Infinity },
	],
	lch: [
		{ label: "L", min: 0, max: 100 },
		{ label: "C", min: 0, max: Infinity },
		{ label: "H", min: 0, max: 360, exclusiveMax: true },
	],
	oklab: [
		{ label: "L", min: 0, max: 1 },
		{ label: "a", min: -Infinity, max: Infinity },
		{ label: "b", min: -Infinity, max: Infinity },
	],
	oklch: [
		{ label: "L", min: 0, max: 1 },
		{ label: "C", min: 0, max: Infinity },
		{ label: "H", min: 0, max: 360, exclusiveMax: true },
	],
};

function isWithinRange(value: number, range: ComponentRange): boolean {
	if (value < range.min) return false;
	if (range.exclusiveMax) return value < range.max;
	return value <= range.max;
}

/**
 * Checks a structurally-valid `ColorValue` against its declared colorSpace's
 * component ranges (FR-02). Distinct from `ColorValueSchema`'s structural
 * parse: a value can parse successfully here yet still be out of range, in
 * which case this returns human-readable issue strings instead of throwing
 * or rejecting. Always returns `[]` for a legacy bare-hex value, and never
 * flags a `"none"` component regardless of colorSpace.
 */
export function checkColorValueIssues(value: ColorValue): string[] {
	if (typeof value === "string") {
		return [];
	}

	const ranges = COMPONENT_RANGES[value.colorSpace];
	const issues: string[] = [];
	const pairs: readonly [ColorComponent, ComponentRange, number][] = [
		[value.components[0], ranges[0], 0],
		[value.components[1], ranges[1], 1],
		[value.components[2], ranges[2], 2],
	];

	for (const [component, range, index] of pairs) {
		if (component === "none") continue;

		if (!isWithinRange(component, range)) {
			const maxDescription = range.exclusiveMax
				? `< ${range.max}`
				: `<= ${range.max}`;
			issues.push(
				`${value.colorSpace} component ${index} (${range.label}) must be >= ${range.min} and ${maxDescription}, got ${component}`,
			);
		}
	}

	return issues;
}
