import { CubicBezierValueSchema } from "@dtcg-editor/token-core";
import styles from "./CubicBezierPreview.module.css";

/**
 * `cubicBezierTokenType`'s `Preview`: a short, human-readable rendering of a
 * resolved reference's literal cubicBezier value, mirroring `ColorPreview`'s
 * pattern. `value` isn't guaranteed to actually be a `CubicBezierValue` (it
 * comes from resolving an arbitrary other token, not from this contract's own
 * `valueSchema`), so this re-validates it itself and declines (`null`) on a
 * mismatch, letting the host fall back to its own generic text rendering.
 */
export function CubicBezierPreview({ value }: { readonly value: unknown }) {
	const parsed = CubicBezierValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	const [p1x, p1y, p2x, p2y] = parsed.data;
	return (
		<span
			className={styles.text}
		>{`cubic-bezier(${p1x}, ${p1y}, ${p2x}, ${p2y})`}</span>
	);
}
