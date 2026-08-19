import type {
	ColorComponent,
	ColorSpace,
	ColorValue,
} from "@dtcg-editor/token-core";

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
