import { StrokeStyleValueSchema } from "@dtcg-editor/token-core";
import styles from "./StrokeStylePreview.module.css";

/**
 * `strokeStyleTokenType`'s `Preview`: shows a resolved reference's literal
 * stroke style — the keyword string directly, or a short summary of the
 * custom dash-pattern object (e.g. `"dashed (butt)"`) — mirrors
 * `ColorPreview`/`FontWeightPreview`'s validate-then-render pattern.
 * `value` isn't guaranteed to actually be a `StrokeStyleValue` (it comes
 * from resolving an arbitrary other token, not from this contract's own
 * `valueSchema`), so this re-validates it itself and declines (`null`) on
 * a mismatch, letting the host fall back to its own generic text
 * rendering.
 */
export function StrokeStylePreview({ value }: { readonly value: unknown }) {
	const parsed = StrokeStyleValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	const text =
		typeof parsed.data === "string"
			? parsed.data
			: `dashed (${parsed.data.lineCap})`;
	return <span className={styles.text}>{text}</span>;
}
