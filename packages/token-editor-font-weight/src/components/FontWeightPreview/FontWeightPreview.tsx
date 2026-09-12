import { FontWeightValueSchema } from "@dtcg-editor/token-core";
import styles from "./FontWeightPreview.module.css";

/**
 * `fontWeightTokenType`'s `Preview`: shows a resolved reference's literal
 * font weight (numeric or keyword alias) as plain text — mirrors
 * `ColorPreview`'s validate-then-render pattern. `value` isn't guaranteed to
 * actually be a `FontWeightValue` (it comes from resolving an arbitrary
 * other token, not from this contract's own `valueSchema`), so this
 * re-validates it itself and declines (`null`) on a mismatch, letting the
 * host fall back to its own generic text rendering.
 */
export function FontWeightPreview({ value }: { readonly value: unknown }) {
	const parsed = FontWeightValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	return <span className={styles.text}>{String(parsed.data)}</span>;
}
