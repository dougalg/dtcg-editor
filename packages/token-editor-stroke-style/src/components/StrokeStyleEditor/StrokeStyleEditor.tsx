"use client";

import {
	RadioGroup,
	RadioGroupItem,
} from "@dtcg-editor/design-system/components/RadioGroup/RadioGroup.tsx";
import {
	Select,
	SelectItem,
} from "@dtcg-editor/design-system/components/Select/Select.tsx";
import type { DimensionValue, StrokeStyleValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import type { ChangeEvent } from "react";
import styles from "./StrokeStyleEditor.module.css";

/**
 * The 8 named-style keywords the DTCG Stroke Style type permits as the
 * string form of `$value` — kept in sync with
 * `packages/token-core/src/stroke-style.ts`'s `StrokeStyleValueSchema`.
 * Duplicated here (rather than exported from the schema module) because
 * it's UI-only ordering/display detail, not part of the validated value
 * shape itself — matches `FontWeightEditor`'s precedent.
 */
const NAMED_STYLES = [
	"solid",
	"dashed",
	"dotted",
	"double",
	"groove",
	"ridge",
	"outset",
	"inset",
] as const;

const LINE_CAPS = ["round", "butt", "square"] as const;

const DEFAULT_DASH_ENTRY: DimensionValue = { value: 4, unit: "px" };

type Mode = "named" | "custom";

function modeOf(value: StrokeStyleValue): Mode {
	return typeof value === "string" ? "named" : "custom";
}

/**
 * The editable UI for a Stroke Style token's `$value`: a mode toggle
 * between a named-style keyword picker and a custom dash-pattern editor
 * (a list of dash-segment `DimensionValue`s plus a line-cap picker),
 * mirroring `DimensionEditor`/`FontWeightEditor`'s plain-control precedent
 * but reusing the design system's `RadioGroup`/`Select` for the mode
 * switch and pickers per Principle XII.
 */
export function StrokeStyleEditor({
	value,
	onChange,
}: TokenTypeEditorProps<StrokeStyleValue>) {
	const mode = modeOf(value);

	function handleModeChange(next: string) {
		if (next === "named") {
			onChange("solid");
			return;
		}
		onChange({ dashArray: [DEFAULT_DASH_ENTRY], lineCap: "butt" });
	}

	function handleStyleChange(event: ChangeEvent<HTMLSelectElement>) {
		onChange(event.target.value as StrokeStyleValue);
	}

	function handleDashValueChange(index: number, raw: string) {
		if (typeof value === "string") {
			return;
		}
		if (raw.trim() === "") {
			return;
		}
		const next = Number(raw);
		if (!Number.isFinite(next)) {
			return;
		}
		const dashArray = value.dashArray.map((entry, i) =>
			i === index ? { ...entry, value: next } : entry,
		);
		onChange({ ...value, dashArray });
	}

	function handleDashUnitChange(index: number, unit: DimensionValue["unit"]) {
		if (typeof value === "string") {
			return;
		}
		const dashArray = value.dashArray.map((entry, i) =>
			i === index ? { ...entry, unit } : entry,
		);
		onChange({ ...value, dashArray });
	}

	function handleLineCapChange(lineCap: (typeof LINE_CAPS)[number]) {
		if (typeof value === "string") {
			return;
		}
		onChange({ ...value, lineCap });
	}

	function handleAddSegment() {
		if (typeof value === "string") {
			return;
		}
		onChange({
			...value,
			dashArray: [...value.dashArray, DEFAULT_DASH_ENTRY],
		});
	}

	function handleRemoveSegment(index: number) {
		if (typeof value === "string") {
			return;
		}
		onChange({
			...value,
			dashArray: value.dashArray.filter((_, i) => i !== index),
		});
	}

	return (
		<span className={styles.container}>
			<RadioGroup
				className={styles.modeGroup}
				aria-label="Mode"
				value={mode}
				onValueChange={handleModeChange}
			>
				<span className={styles.modeOption}>
					<RadioGroupItem value="named" aria-label="Named style" />
					<span className={styles.labelText}>Named</span>
				</span>
				<span className={styles.modeOption}>
					<RadioGroupItem value="custom" aria-label="Custom dash pattern" />
					<span className={styles.labelText}>Custom</span>
				</span>
			</RadioGroup>

			{typeof value === "string" ? (
				<span className={styles.field}>
					<span className={styles.labelText}>Style</span>
					<Select
						aria-label="Style"
						className={styles.styleSelect}
						value={value}
						onValueChange={(next) =>
							handleStyleChange({
								target: { value: next },
							} as ChangeEvent<HTMLSelectElement>)
						}
					>
						{NAMED_STYLES.map((style) => (
							<SelectItem key={style} value={style}>
								{style}
							</SelectItem>
						))}
					</Select>
				</span>
			) : (
				<span className={styles.customFields}>
					{value.dashArray.map((entry, index) => (
						<span key={index} className={styles.dashRow}>
							<label className={styles.field}>
								<span className={styles.labelText}>
									Dash segment {index + 1}
								</span>
								<input
									type="number"
									className={styles.dashInput}
									aria-label={`Dash segment ${index + 1}`}
									value={entry.value}
									onChange={(event) =>
										handleDashValueChange(index, event.target.value)
									}
								/>
							</label>
							<span className={styles.field}>
								<span className={styles.labelText}>
									Dash segment {index + 1} unit
								</span>
								<Select
									aria-label={`Dash segment ${index + 1} unit`}
									className={styles.unitSelect}
									value={entry.unit}
									onValueChange={(next) =>
										handleDashUnitChange(index, next as DimensionValue["unit"])
									}
								>
									<SelectItem value="px">px</SelectItem>
									<SelectItem value="rem">rem</SelectItem>
								</Select>
							</span>
							<button
								type="button"
								aria-label={`Remove dash segment ${index + 1}`}
								onClick={() => handleRemoveSegment(index)}
							>
								Remove
							</button>
						</span>
					))}
					<button type="button" onClick={handleAddSegment}>
						Add segment
					</button>
					<span className={styles.field}>
						<span className={styles.labelText}>Line cap</span>
						<Select
							aria-label="Line cap"
							className={styles.lineCapSelect}
							value={value.lineCap}
							onValueChange={(next) =>
								handleLineCapChange(next as (typeof LINE_CAPS)[number])
							}
						>
							{LINE_CAPS.map((cap) => (
								<SelectItem key={cap} value={cap}>
									{cap}
								</SelectItem>
							))}
						</Select>
					</span>
				</span>
			)}
		</span>
	);
}
