import { NumberValueSchema } from "@dtcg-editor/token-core";
import styles from "./NumberPreview.module.css";

/**
 * `numberTokenType`'s `Preview`: shows a resolved reference's literal number as
 * plain text — mirrors `ColorPreview`'s/`FontWeightPreview`'s
 * validate-then-render pattern. `value` isn't guaranteed to actually be a
 * `NumberValue` (it comes from resolving an arbitrary other token, not from
 * this contract's own `valueSchema`), so this re-validates it itself and
 * declines (`null`) on a mismatch, letting the host fall back to its own
 * generic text rendering.
 */
export function NumberPreview({ value }: { readonly value: unknown }) {
	const parsed = NumberValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	return <span className={styles.text}>{String(parsed.data)}</span>;
}
