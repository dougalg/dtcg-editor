"use client";

import type { TypographyValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import { DimensionEditor } from "@dtcg-editor/token-editor-dimension";
import { FontFamilyEditor } from "@dtcg-editor/token-editor-font-family";
import { FontWeightEditor } from "@dtcg-editor/token-editor-font-weight";
import { NumberEditor } from "@dtcg-editor/token-editor-number";
import styles from "./TypographyEditor.module.css";

/**
 * The editable UI for a typography token's `$value`: five sub-controls —
 * "Font Family" (the real `FontFamilyEditor` from
 * `@dtcg-editor/token-editor-font-family`), "Font Size" and "Letter Spacing"
 * (each the real `DimensionEditor` from `@dtcg-editor/token-editor-dimension`,
 * embedded directly rather than reimplemented), "Font Weight" (the real
 * `FontWeightEditor` from `@dtcg-editor/token-editor-font-weight`), and "Line
 * Height" (the real `NumberEditor` from `@dtcg-editor/token-editor-number` —
 * `lineHeight` is a bare unitless multiplier per spec, exactly the shape
 * `NumberEditor` already edits). `DimensionEditor` itself has no
 * label/name prop (its own contract is unmodified by this feature), so the
 * two instances are disambiguated purely by wrapping each in its own
 * `<fieldset>`/`<legend>` — "Font Size" vs "Letter Spacing" — giving each an
 * accessible group name distinct from the other, per `plan.md`'s Design
 * Decisions. `NumberEditor` is wrapped the same way for label consistency
 * across all five sub-controls, even though it has no sibling instance to
 * disambiguate from.
 */
export function TypographyEditor({
	value,
	onChange,
}: TokenTypeEditorProps<TypographyValue>) {
	return (
		<span className={styles.container}>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Font Family</legend>
				<FontFamilyEditor
					value={value.fontFamily}
					onChange={(fontFamily) => onChange({ ...value, fontFamily })}
				/>
			</fieldset>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Font Size</legend>
				<DimensionEditor
					value={value.fontSize}
					onChange={(fontSize) => onChange({ ...value, fontSize })}
				/>
			</fieldset>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Font Weight</legend>
				<FontWeightEditor
					value={value.fontWeight}
					onChange={(fontWeight) => onChange({ ...value, fontWeight })}
				/>
			</fieldset>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Letter Spacing</legend>
				<DimensionEditor
					value={value.letterSpacing}
					onChange={(letterSpacing) => onChange({ ...value, letterSpacing })}
				/>
			</fieldset>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Line Height</legend>
				<NumberEditor
					value={value.lineHeight}
					onChange={(lineHeight) => onChange({ ...value, lineHeight })}
				/>
			</fieldset>
		</span>
	);
}
