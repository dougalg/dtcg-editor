"use client";

import type { ShadowLayer } from "@dtcg-editor/token-core";
import { ColorEditor } from "@dtcg-editor/token-editor-color";
import { DimensionEditor } from "@dtcg-editor/token-editor-dimension";
import styles from "./ShadowLayerFields.module.css";

/**
 * The editable UI for a single shadow layer's five sub-fields: embeds the
 * real sibling `ColorEditor` (for `color`) and four independent
 * `DimensionEditor` instances (for `offsetX`/`offsetY`/`blur`/`spread`),
 * rather than reimplementing lightweight versions of those controls — the
 * same embedding choice `BorderEditor`/`TransitionEditor` already make for
 * their own sub-fields (see plan.md). Because this reuses the same
 * `DimensionEditor` component four times, each instance is wrapped in its
 * own `<fieldset>`/`<legend>` — "Offset X"/"Offset Y"/"Blur"/"Spread" —
 * mirroring `TransitionEditor`'s disambiguation pattern for two identical
 * `DurationEditor` instances, scaled up to four. `color` has only one
 * instance in this component, so it is left unlabeled, matching
 * `BorderEditor`'s precedent for its own single `ColorEditor`. Each
 * sub-editor's `onChange` updates only its own key of `value`, leaving the
 * other four untouched.
 */
export function ShadowLayerFields({
	value,
	onChange,
}: {
	readonly value: ShadowLayer;
	readonly onChange: (layer: ShadowLayer) => void;
}) {
	return (
		<span className={styles.container}>
			<ColorEditor
				value={value.color}
				onChange={(color) => onChange({ ...value, color })}
			/>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Offset X</legend>
				<DimensionEditor
					value={value.offsetX}
					onChange={(offsetX) => onChange({ ...value, offsetX })}
				/>
			</fieldset>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Offset Y</legend>
				<DimensionEditor
					value={value.offsetY}
					onChange={(offsetY) => onChange({ ...value, offsetY })}
				/>
			</fieldset>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Blur</legend>
				<DimensionEditor
					value={value.blur}
					onChange={(blur) => onChange({ ...value, blur })}
				/>
			</fieldset>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Spread</legend>
				<DimensionEditor
					value={value.spread}
					onChange={(spread) => onChange({ ...value, spread })}
				/>
			</fieldset>
		</span>
	);
}
