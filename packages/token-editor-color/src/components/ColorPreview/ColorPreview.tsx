import { ColorValueSchema } from "@dtcg-editor/token-core";
import type { CSSProperties } from "react";
import { colorValueToCssColor } from "../../utils/css-color.ts";
import styles from "./ColorPreview.module.css";

function formatRaw(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

function swatchStyle(color: string): CSSProperties {
	return { "--swatch-color": color } as CSSProperties;
}

/**
 * `colorTokenType`'s `Preview`: shows a resolved reference's literal color
 * the same way `ColorEditor`'s own read path does — a swatch computed via
 * `colorValueToCssColor`, alongside the value's raw text form. `value`
 * isn't guaranteed to actually be a `ColorValue` (it comes from resolving
 * an arbitrary other token, not from this contract's own `valueSchema`),
 * so this re-validates it itself and declines (`null`) on a mismatch,
 * letting the host fall back to its own generic text rendering.
 */
export function ColorPreview({ value }: { readonly value: unknown }) {
	const parsed = ColorValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	const cssColor = colorValueToCssColor(parsed.data);
	return (
		<>
			<span className={styles.swatch} style={swatchStyle(cssColor)} />
			<span className={styles.text}>{formatRaw(value)}</span>
		</>
	);
}
