import type { ColorComponent, ColorValue } from "@dtcg-editor/token-core";

function formatRaw(component: ColorComponent): string {
	return component === "none" ? "none" : String(component);
}

function formatPercent(component: ColorComponent): string {
	return component === "none" ? "none" : `${component}%`;
}

function alphaSuffix(alpha: number | undefined): string {
	return alpha !== undefined ? ` / ${alpha}` : "";
}

/**
 * Builds a native CSS Color 4/5 function string for a `ColorValue`, letting
 * the browser's own CSS engine perform all color-space math — no
 * color-space-conversion library needed to preview any of the 14 DTCG
 * color spaces. A legacy bare-hex value passes through unchanged.
 */
export function colorValueToCssColor(value: ColorValue): string {
	if (typeof value === "string") {
		return value;
	}

	const { colorSpace, components, alpha } = value;
	const [c0, c1, c2] = components;
	const suffix = alphaSuffix(alpha);

	switch (colorSpace) {
		case "srgb":
		case "srgb-linear":
		case "display-p3":
		case "a98-rgb":
		case "prophoto-rgb":
		case "rec2020":
		case "xyz-d65":
		case "xyz-d50":
			return `color(${colorSpace} ${formatRaw(c0)} ${formatRaw(c1)} ${formatRaw(c2)}${suffix})`;
		case "hsl":
			return `hsl(${formatRaw(c0)} ${formatPercent(c1)} ${formatPercent(c2)}${suffix})`;
		case "hwb":
			return `hwb(${formatRaw(c0)} ${formatPercent(c1)} ${formatPercent(c2)}${suffix})`;
		case "lab":
			return `lab(${formatRaw(c0)} ${formatRaw(c1)} ${formatRaw(c2)}${suffix})`;
		case "lch":
			return `lch(${formatRaw(c0)} ${formatRaw(c1)} ${formatRaw(c2)}${suffix})`;
		case "oklab":
			return `oklab(${formatRaw(c0)} ${formatRaw(c1)} ${formatRaw(c2)}${suffix})`;
		case "oklch":
			return `oklch(${formatRaw(c0)} ${formatRaw(c1)} ${formatRaw(c2)}${suffix})`;
	}
}
