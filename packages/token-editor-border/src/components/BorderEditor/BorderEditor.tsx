"use client";

import type { BorderValue } from "@dtcg-editor/token-core";
import { ColorEditor } from "@dtcg-editor/token-editor-color";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import { DimensionEditor } from "@dtcg-editor/token-editor-dimension";
import { StrokeStyleEditor } from "@dtcg-editor/token-editor-stroke-style";
import styles from "./BorderEditor.module.css";

/**
 * The editable UI for a Border token's `$value`: three independently
 * editable sub-fields, each rendered by embedding the real sibling editor
 * that already owns that sub-type's control — `ColorEditor` for `color`,
 * `DimensionEditor` for `width`, `StrokeStyleEditor` for `style` — rather
 * than reimplementing lightweight versions of those controls here. Each
 * sub-editor is wired so its `onChange` updates only its own key of
 * `value`, leaving the other two untouched (see plan.md's embedding
 * rationale).
 */
export function BorderEditor({
	value,
	onChange,
}: TokenTypeEditorProps<BorderValue>) {
	return (
		<span className={styles.container}>
			<span className={styles.field}>
				<span className={styles.labelText}>Color</span>
				<ColorEditor
					value={value.color}
					onChange={(color) => onChange({ ...value, color })}
				/>
			</span>
			<span className={styles.field}>
				<span className={styles.labelText}>Width</span>
				<DimensionEditor
					value={value.width}
					onChange={(width) => onChange({ ...value, width })}
				/>
			</span>
			<span className={styles.field}>
				<span className={styles.labelText}>Style</span>
				<StrokeStyleEditor
					value={value.style}
					onChange={(style) => onChange({ ...value, style })}
				/>
			</span>
		</span>
	);
}
