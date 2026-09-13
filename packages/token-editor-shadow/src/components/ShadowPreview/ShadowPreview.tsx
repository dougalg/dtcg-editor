import { ShadowValueSchema } from "@dtcg-editor/token-core";
import { ColorPreview } from "@dtcg-editor/token-editor-color";
import styles from "./ShadowPreview.module.css";

/**
 * `shadowTokenType`'s `Preview`: a compact, single-line rendering of a
 * resolved reference's literal shadow value. A single layer embeds the
 * sibling `ColorPreview` (part of `token-editor-color`'s public API) plus
 * short offsetX/offsetY/blur/spread text — the same embedding choice
 * `BorderPreview` makes for its own `color` sub-field. A multi-layer array
 * collapses to a short `"N shadows"` summary rather than expanding every
 * layer inline, per `BorderPreview`'s precedent of keeping composite
 * previews compact — here doubly important since a shadow array could
 * otherwise render many lines for one reference. `value` isn't guaranteed to
 * actually be a `ShadowValue` (it comes from resolving an arbitrary other
 * token, not from this contract's own `valueSchema`), so this re-validates
 * it itself and declines (`null`) on any mismatch — including a value whose
 * one sub-layer is itself invalid, or an empty array — letting the host fall
 * back to its own generic text rendering.
 */
export function ShadowPreview({ value }: { readonly value: unknown }) {
	const parsed = ShadowValueSchema.safeParse(value);
	if (!parsed.success) {
		return null;
	}

	if (Array.isArray(parsed.data) && parsed.data.length > 1) {
		return <span className={styles.text}>{parsed.data.length} shadows</span>;
	}

	const layer = Array.isArray(parsed.data) ? parsed.data[0] : parsed.data;
	if (!layer) {
		return null;
	}

	return (
		<span className={styles.text}>
			<ColorPreview value={layer.color} />
			<span>
				{layer.offsetX.value}
				{layer.offsetX.unit} {layer.offsetY.value}
				{layer.offsetY.unit} {layer.blur.value}
				{layer.blur.unit} {layer.spread.value}
				{layer.spread.unit}
			</span>
		</span>
	);
}
