"use client";

import type { ChangeEvent } from "react";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-type-contract";
import type { DimensionValue } from "./dimension.ts";

const UNITS = ["px", "rem"] as const;

/** The editable UI for a Dimension token's `$value`: a numeric input plus a unit select. */
export function DimensionEditor({ value, onChange }: TokenTypeEditorProps<DimensionValue>) {
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
      <input type="number" value={value.value} onChange={handleValueChange} aria-label="Dimension value" />
      <select value={value.unit} onChange={handleUnitChange} aria-label="Dimension unit">
        {UNITS.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
    </span>
  );
}
