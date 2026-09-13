"use client";

import { Button } from "@dtcg-editor/design-system/components/Button/Button.tsx";
import { Input } from "@dtcg-editor/design-system/components/Input/Input.tsx";
import type { FontFamilyValue } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-editor-contract";
import { type ChangeEvent, useEffect, useState } from "react";
import styles from "./FontFamilyEditor.module.css";

/** Promotes a bare string to a one-item list; an array passes through unchanged. */
function toList(value: FontFamilyValue): readonly string[] {
	return typeof value === "string" ? [value] : value;
}

/**
 * The `onChange` boundary rule (see `data-model.md`): a list of exactly one
 * entry serializes as a bare string (never a one-item array); zero or two-plus
 * entries serialize as the full array. Applied on every commit regardless of
 * the value's original on-disk shape.
 */
function fromList(list: readonly string[]): FontFamilyValue {
	return list.length === 1 ? (list[0] as string) : [...list];
}

/**
 * The editable UI for a Font Family token's `$value`: an ordered list of
 * family-name rows with add/remove/move-up/move-down controls. Always
 * operates on an array internally (a bare-string value is promoted to a
 * one-item list on render) and converts back to a bare string vs. array only
 * at the `onChange` boundary above.
 */
export function FontFamilyEditor({
	value,
	onChange,
}: TokenTypeEditorProps<FontFamilyValue>) {
	const [rows, setRows] = useState<readonly string[]>(() => toList(value));
	const serializedValue = JSON.stringify(value);

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-sync only when the serialized value actually changes (e.g. a different token selected), not on every render.
	useEffect(() => {
		setRows(toList(value));
	}, [serializedValue]);

	function commit(next: readonly string[]) {
		setRows(next);
		onChange(fromList(next));
	}

	function handleEntryChange(
		index: number,
		event: ChangeEvent<HTMLInputElement>,
	) {
		const text = event.target.value;
		const next = rows.map((entry, i) => (i === index ? text : entry));
		setRows(next);
		if (text.trim() === "") {
			return;
		}
		onChange(fromList(next));
	}

	function handleAdd() {
		setRows([...rows, ""]);
	}

	function handleRemove(index: number) {
		commit(rows.filter((_, i) => i !== index));
	}

	function handleMove(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= rows.length) {
			return;
		}
		const next = [...rows];
		const [item] = next.splice(index, 1);
		next.splice(target, 0, item as string);
		commit(next);
	}

	return (
		<ul className={styles.list}>
			{rows.map((entry, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable identity beyond position; reordering intentionally moves by index.
				<li key={index} className={styles.row}>
					<Input
						aria-label={`Family name ${index + 1}`}
						className={styles.input}
						value={entry}
						onChange={(event) => handleEntryChange(index, event)}
					/>
					<Button
						type="button"
						onClick={() => handleMove(index, -1)}
						disabled={index === 0}
					>
						Move up
					</Button>
					<Button
						type="button"
						onClick={() => handleMove(index, 1)}
						disabled={index === rows.length - 1}
					>
						Move down
					</Button>
					<Button type="button" onClick={() => handleRemove(index)}>
						Remove
					</Button>
				</li>
			))}
			<li>
				<Button type="button" onClick={handleAdd}>
					Add family
				</Button>
			</li>
		</ul>
	);
}
