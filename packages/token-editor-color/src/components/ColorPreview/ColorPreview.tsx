import { Swatch } from "../Swatch/Swatch.tsx";
import styles from "./ColorPreview.module.css";

function formatRaw(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * `colorTokenType`'s `Preview`: shows a resolved reference's literal color
 * the same way `ColorEditor`'s own reaSd path does — a swatch computed via
 * `colorValueToCssColor`, alongside the value's raw text form. `value`
 * isn't guaranteed to actually be a `ColorValue` (it comes from resolving
 * an arbitrary other token, not from this contract's own `valueSchema`),
 * so this re-validates it itself and declines (`null`) on a mismatch,
 * letting the host fall back to its own generic text rendering.
 */
export function ColorPreview({ value }: { readonly value: unknown }) {
	return (
		<>
			<Swatch value={value} />
			<span className={styles.text}>{formatRaw(value)}</span>
		</>
	);
}
