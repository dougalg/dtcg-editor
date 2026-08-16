"use client";

import type { TokenTypeEditorProps } from "@dtcg-editor/token-type-contract";
import type { ChangeEvent } from "react";
import styles from "./FallbackValueEditor.module.css";

/**
 * The generic, type-shape-agnostic editor used for a standard DTCG token
 * type with no registered editor: `value`/`onChange` carry the `$value`'s
 * JSON *text* representation, not the parsed value itself — parsing,
 * validation, and error surfacing are owned by the caller (`TreeNode` in
 * `TokenTree.tsx`), exactly mirroring how `DimensionEditor` only does
 * trivial input-level filtering while `TreeNode` owns the real validation.
 * This component performs no validation at all.
 */
export function FallbackValueEditor({
	value,
	onChange,
}: TokenTypeEditorProps<string>) {
	function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
		onChange(event.target.value);
	}

	return (
		<label>
			<span className={styles.labelText}>Value (JSON)</span>
			<textarea
				className={styles.textarea}
				value={value}
				onChange={handleChange}
				spellCheck={false}
			/>
		</label>
	);
}
