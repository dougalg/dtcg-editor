"use client";

import type { NumberValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import type { ChangeEvent } from "react";
import styles from "./NumberEditor.module.css";

/**
 * The editable UI for a Number token's `$value`: a single plain number input.
 * Unlike `FontWeightEditor`/`DimensionEditor` there is no secondary form (no
 * keyword aliases, no unit) — the DTCG Number type is a bare, unitless number
 * with no `min`/`max`/integer constraint, so `step="any"` avoids the browser's
 * default integer-only stepping from silently rounding fractional input like a
 * `0.5` opacity value.
 */
export function NumberEditor({
	value,
	onChange,
}: TokenTypeEditorProps<NumberValue>) {
	function handleValueChange(event: ChangeEvent<HTMLInputElement>) {
		const next = Number(event.target.value);
		if (event.target.value === "" || !Number.isFinite(next)) {
			return;
		}
		onChange(next);
	}

	return (
		<span className={styles.container}>
			<label className={styles.field}>
				<span className={styles.labelText}>Value</span>
				<input
					type="number"
					className={styles.valueInput}
					step="any"
					value={value}
					onChange={handleValueChange}
				/>
			</label>
		</span>
	);
}
