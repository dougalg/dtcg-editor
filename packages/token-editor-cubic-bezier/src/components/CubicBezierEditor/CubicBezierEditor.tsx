"use client";

import type { CubicBezierValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import type { ChangeEvent } from "react";
import styles from "./CubicBezierEditor.module.css";

/** One control-point coordinate field, by its index in the `CubicBezierValue` tuple. */
interface CoordinateField {
	readonly index: 0 | 1 | 2 | 3;
	readonly label: "P1x" | "P1y" | "P2x" | "P2y";
	/** `P1x`/`P2x` (indices 0/2) are bound to `[0,1]` per the DTCG spec; `P1y`/`P2y` are not. */
	readonly bounded: boolean;
}

const FIELDS: readonly CoordinateField[] = [
	{ index: 0, label: "P1x", bounded: true },
	{ index: 1, label: "P1y", bounded: false },
	{ index: 2, label: "P2x", bounded: true },
	{ index: 3, label: "P2y", bounded: false },
];

/**
 * The editable UI for a cubicBezier token's `$value`: four labeled numeric
 * inputs, one per control-point coordinate (P1x, P1y, P2x, P2y). The two
 * x-coordinate fields (P1x, P2x) clamp to `[0, 1]` at the input level (DTCG
 * spec constraint); the two y-coordinate fields accept any finite number,
 * including negative values and values greater than 1 (overshoot/bounce
 * easings).
 */
export function CubicBezierEditor({
	value,
	onChange,
}: TokenTypeEditorProps<CubicBezierValue>) {
	function handleFieldChange(
		field: CoordinateField,
		event: ChangeEvent<HTMLInputElement>,
	) {
		const parsed = Number(event.target.value);
		const next = Number.isNaN(parsed) ? 0 : parsed;
		const clamped = field.bounded ? Math.min(1, Math.max(0, next)) : next;
		const updated = [...value] as [number, number, number, number];
		updated[field.index] = clamped;
		onChange(updated);
	}

	return (
		<span className={styles.container}>
			{FIELDS.map((field) => (
				<label key={field.label} className={styles.field}>
					<span className={styles.labelText}>{field.label}</span>
					<input
						type="number"
						className={styles.valueInput}
						value={value[field.index]}
						{...(field.bounded ? { min: 0, max: 1 } : {})}
						step="any"
						onChange={(event) => handleFieldChange(field, event)}
					/>
				</label>
			))}
		</span>
	);
}
