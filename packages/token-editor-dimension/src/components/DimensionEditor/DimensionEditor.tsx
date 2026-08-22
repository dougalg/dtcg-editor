"use client";

import type { DimensionValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import type { ChangeEvent } from "react";

const UNITS = ["px", "rem"] as const;
const containerStyle = {
	display: "inline-flex",
	alignItems: "baseline",
	gap: "0.75rem",
} as const;
const fieldStyle = {
	display: "inline-flex",
	alignItems: "baseline",
	gap: "0.35rem",
} as const;
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
		<span style={containerStyle}>
			<label style={fieldStyle}>
				<span style={labelTextStyle}>Value</span>
				<input type="number" value={value.value} onChange={handleValueChange} />
			</label>
			<label style={fieldStyle}>
				<span style={labelTextStyle}>Unit</span>
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
