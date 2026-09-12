"use client";

import type { DurationValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import type { ChangeEvent } from "react";
import styles from "./DurationEditor.module.css";

const UNITS = ["ms", "s"] as const;

/** The editable UI for a Duration token's `$value`: a numeric input plus a unit select. */
export function DurationEditor({
	value,
	onChange,
}: TokenTypeEditorProps<DurationValue>) {
	function handleValueChange(event: ChangeEvent<HTMLInputElement>) {
		const next = Number(event.target.value);
		if (Number.isNaN(next) || next < 0) {
			return;
		}
		onChange({ ...value, value: next });
	}

	function handleUnitChange(event: ChangeEvent<HTMLSelectElement>) {
		onChange({ ...value, unit: event.target.value as DurationValue["unit"] });
	}

	return (
		<span className={styles.container}>
			<label className={styles.field}>
				<span className={styles.labelText}>Value</span>
				<input
					type="number"
					min={0}
					className={styles.valueInput}
					value={value.value}
					onChange={handleValueChange}
				/>
			</label>
			<label className={styles.field}>
				<span className={styles.labelText}>Unit</span>
				<select
					className={styles.unitSelect}
					value={value.unit}
					onChange={handleUnitChange}
				>
					{UNITS.map((unit) => (
						<option key={unit} value={unit}>
							{unit}
						</option>
					))}
				</select>
			</label>
		</span>
	);
}
