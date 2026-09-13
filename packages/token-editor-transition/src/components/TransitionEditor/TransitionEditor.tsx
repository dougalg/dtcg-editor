"use client";

import type { TransitionValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import { CubicBezierEditor } from "@dtcg-editor/token-editor-cubic-bezier";
import { DurationEditor } from "@dtcg-editor/token-editor-duration";
import styles from "./TransitionEditor.module.css";

/**
 * The editable UI for a transition token's `$value`: three sub-controls —
 * "Duration", "Delay" (each the real `DurationEditor` from
 * `@dtcg-editor/token-editor-duration`, embedded directly rather than
 * reimplemented), and the timing function (the real `CubicBezierEditor` from
 * `@dtcg-editor/token-editor-cubic-bezier`). `DurationEditor` itself has no
 * label/name prop (its own contract is unmodified by this feature), so the
 * two instances are disambiguated purely by wrapping each in its own
 * `<fieldset>`/`<legend>` — "Duration" vs "Delay" — giving each an
 * accessible group name distinct from the other, per `plan.md`'s Design
 * Decisions.
 */
export function TransitionEditor({
	value,
	onChange,
}: TokenTypeEditorProps<TransitionValue>) {
	return (
		<span className={styles.container}>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Duration</legend>
				<DurationEditor
					value={value.duration}
					onChange={(duration) => onChange({ ...value, duration })}
				/>
			</fieldset>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Delay</legend>
				<DurationEditor
					value={value.delay}
					onChange={(delay) => onChange({ ...value, delay })}
				/>
			</fieldset>
			<fieldset className={styles.group}>
				<legend className={styles.legend}>Timing function</legend>
				<CubicBezierEditor
					value={value.timingFunction}
					onChange={(timingFunction) => onChange({ ...value, timingFunction })}
				/>
			</fieldset>
		</span>
	);
}
