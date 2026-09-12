"use client";

import type { FontWeightValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import type { ChangeEvent } from "react";
import styles from "./FontWeightEditor.module.css";

/**
 * The 18 keyword aliases the DTCG Font Weight type permits as an alternative
 * to a raw integer — kept in sync with `packages/token-core/src/font-weight.ts`'s
 * `FontWeightValueSchema`. Duplicated here (rather than exported from the
 * schema module) because it's UI-only ordering/display detail, not part of
 * the validated value shape itself.
 */
const FONT_WEIGHT_ALIASES = [
	"thin",
	"hairline",
	"extra-light",
	"ultra-light",
	"light",
	"normal",
	"regular",
	"book",
	"medium",
	"semi-bold",
	"demi-bold",
	"bold",
	"extra-bold",
	"ultra-bold",
	"black",
	"heavy",
	"extra-black",
	"ultra-black",
] as const;

const CUSTOM_NUMBER_OPTION = "custom";

/** The editable UI for a Font Weight token's `$value`: a numeric input, or a keyword-alias picker. */
export function FontWeightEditor({
	value,
	onChange,
}: TokenTypeEditorProps<FontWeightValue>) {
	const isAlias = typeof value === "string";

	function handleValueChange(event: ChangeEvent<HTMLInputElement>) {
		const next = Number(event.target.value);
		if (!Number.isInteger(next) || next < 1 || next > 1000) {
			return;
		}
		onChange(next);
	}

	function handleAliasChange(event: ChangeEvent<HTMLSelectElement>) {
		const next = event.target.value;
		if (next === CUSTOM_NUMBER_OPTION) {
			onChange(1);
			return;
		}
		onChange(next as FontWeightValue);
	}

	return (
		<span className={styles.container}>
			<label className={styles.field}>
				<span className={styles.labelText}>Value</span>
				<input
					type="number"
					className={styles.valueInput}
					min={1}
					max={1000}
					step={1}
					value={typeof value === "number" ? value : ""}
					onChange={handleValueChange}
				/>
			</label>
			<label className={styles.field}>
				<span className={styles.labelText}>Alias</span>
				<select
					className={styles.aliasSelect}
					value={isAlias ? value : CUSTOM_NUMBER_OPTION}
					onChange={handleAliasChange}
				>
					<option value={CUSTOM_NUMBER_OPTION}>{CUSTOM_NUMBER_OPTION}</option>
					{FONT_WEIGHT_ALIASES.map((alias) => (
						<option key={alias} value={alias}>
							{alias}
						</option>
					))}
				</select>
			</label>
		</span>
	);
}
