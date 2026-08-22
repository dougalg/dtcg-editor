"use client";

import type { DimensionValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import type { ChangeEvent } from "react";
import styles from "./DimensionEditor.module.css";

const UNITS = ["px", "rem"] as const;

/** The editable UI for a Dimension token's `$value`: a numeric input plus a unit select. */
export function DimensionEditor({
	value,
	onChange,
}: TokenTypeEditorProps<DimensionValue>) {
	function handleValueChange(event: ChangeEvent<HTMLInputElement>) {
		const next = Number(event.target.value);
		if (Number.isNaN(next)) {
			return;
		}
		onChange({ ...value, value: next });
	}

	function handleUnitChange(event: ChangeEvent<HTMLSelectElement>) {
		onChange({ ...value, unit: event.target.value as DimensionValue["unit"] });
	}

	return (
		<span className={styles.container}>
			<label className={styles.field}>
				<span className={styles.labelText}>Value</span>
				<input
					type="number"
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
