import { BorderValueSchema } from "@dtcg-editor/token-core";
import { ColorPreview } from "@dtcg-editor/token-editor-color";
import { StrokeStylePreview } from "@dtcg-editor/token-editor-stroke-style";
import styles from "./BorderPreview.module.css";

/**
 * `borderTokenType`'s `Preview`: a compact, single-line rendering of a
 * resolved reference's literal border value. Embeds the sibling
 * `ColorPreview`/`StrokeStylePreview` components — both are part of their
 * package's public API — rather than reimplementing their read-only
 * rendering, the same embedding choice `BorderEditor` makes for the
 * editable case (see plan.md). `width` is rendered as short plain text
 * (`"1px"`) instead: `token-editor-dimension` does not export a
 * `DimensionPreview` from its public API, and this feature must only
 * consume siblings' *existing* exports, not add to them. `value` isn't
 * guaranteed to actually be a `BorderValue` (it comes from resolving an
 * arbitrary other token, not from this contract's own `valueSchema`), so
 * this re-validates it itself and declines (`null`) on any mismatch —
 * including a sub-value that is itself invalid — letting the host fall
 * back to its own generic text rendering.
 */
export function BorderPreview({ value }: { readonly value: unknown }) {
	const parsed = BorderValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	const { color, width, style } = parsed.data;
	return (
		<span className={styles.text}>
			<ColorPreview value={color} />
			<span>
				{width.value}
				{width.unit}
			</span>
			<StrokeStylePreview value={style} />
		</span>
	);
}
