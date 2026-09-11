import { ColorValueSchema } from "@dtcg-editor/token-core";
import { colorValueToCssColor } from "../../utils/css-color.ts";
import { Swatch } from "../Swatch/Swatch.tsx";
import styles from "./ColorPreview.module.css";

/**
 * `colorTokenType`'s `Preview`: shows a resolved reference's literal color
 * the same way `ColorEditor`'s own read path does — a swatch and adjacent
 * text, both rendered as CSS Color 4 syntax via `colorValueToCssColor`, the
 * same function that already computes the swatch's `--swatch-color`. `value`
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
			<Swatch value={value} />
			<span className={styles.text}>{cssColor}</span>
		</>
	);
}
