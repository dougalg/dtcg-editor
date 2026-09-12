import { DurationValueSchema } from "@dtcg-editor/token-core";
import styles from "./DurationPreview.module.css";

/**
 * `durationTokenType`'s `Preview`: a short, read-only rendering of a
 * resolved reference's literal duration value (e.g. `200ms`), mirroring
 * `colorTokenType`'s `ColorPreview`. `value` isn't guaranteed to actually be
 * a `DurationValue` (it comes from resolving an arbitrary other token, not
 * from this contract's own `valueSchema`), so this re-validates it itself
 * and declines (`null`) on a mismatch, letting the host fall back to its own
 * generic text rendering.
 */
export function DurationPreview({ value }: { readonly value: unknown }) {
	const parsed = DurationValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	return (
		<span className={styles.text}>
			{parsed.data.value}
			{parsed.data.unit}
		</span>
	);
}
