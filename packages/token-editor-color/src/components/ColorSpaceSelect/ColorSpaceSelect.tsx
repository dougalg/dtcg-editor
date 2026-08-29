"use client";

import {
	Select,
	SelectItem,
} from "@dtcg-editor/design-system/components/Select/Select.tsx";
import type { ColorSpace } from "@dtcg-editor/token-core";
import type { ReactElement } from "react";
import styles from "./ColorSpaceSelect.module.css";

export interface ColorSpaceSelectProps {
	/** `"hex"` only in the legacy bare-hex branch (research R9). */
	readonly value: ColorSpace | "hex";
	/** Offered spaces, already deduped and in canonical order (FR-008). */
	readonly offered: readonly ColorSpace[];
	readonly onChange: (next: ColorSpace) => void;
}

/**
 * The colour-space control — the design-system `Select`, which is a native
 * `<select>` styled to read as plain inline monospace text (see
 * `ColorSpaceSelect.module.css`). No popup library, so nothing heavy loads
 * on interaction.
 */
export function ColorSpaceSelect({
	value,
	offered,
	onChange,
}: ColorSpaceSelectProps): ReactElement {
	return (
		<Select
			aria-label="Colour space"
			className={styles.trigger}
			value={value}
			onValueChange={(next) => onChange(next as ColorSpace)}
		>
			{value === "hex" ? (
				<SelectItem value="hex" disabled>
					hex
				</SelectItem>
			) : null}
			{offered.map((space) => (
				<SelectItem key={space} value={space}>
					{space}
				</SelectItem>
			))}
		</Select>
	);
}
