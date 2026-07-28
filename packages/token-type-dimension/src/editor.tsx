"use client";

import type { ChangeEvent } from "react";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-type-contract";
import type { DimensionValue } from "./dimension.ts";

const UNITS = ["px", "rem"] as const;
const labelTextStyle = { fontSize: "0.7rem", opacity: 0.6 } as const;

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
		<span>
			<label>
				<span style={labelTextStyle}>Dimension value</span>
				<input type="number" value={value.value} onChange={handleValueChange} />
			</label>
			<label>
				<span style={labelTextStyle}>Dimension unit</span>
				<select value={value.unit} onChange={handleUnitChange}>
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
