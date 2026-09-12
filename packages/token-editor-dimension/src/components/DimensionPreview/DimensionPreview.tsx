import { DimensionValueSchema } from "@dtcg-editor/token-core";
import styles from "./DimensionPreview.module.css";

/**
 * `dimensionTokenType`'s `Preview`: a short, read-only rendering of a
 * resolved reference's literal dimension value (e.g. `16px`), mirroring
 * `colorTokenType`'s `ColorPreview`/`durationTokenType`'s `DurationPreview`.
 * `value` isn't guaranteed to actually be a `DimensionValue` (it comes from
 * resolving an arbitrary other token, not from this contract's own
 * `valueSchema`), so this re-validates it itself and declines (`null`) on a
 * mismatch, letting the host fall back to its own generic text rendering.
 */
export function DimensionPreview({ value }: { readonly value: unknown }) {
	const parsed = DimensionValueSchema.safeParse(value);
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
