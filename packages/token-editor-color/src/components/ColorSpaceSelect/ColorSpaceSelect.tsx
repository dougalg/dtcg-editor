"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
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

export function ColorSpaceSelect({
	value,
	offered,
	onChange,
}: ColorSpaceSelectProps): ReactElement {
	return (
		<Select
			value={value}
			onValueChange={(next) => onChange(next as ColorSpace)}
		>
			<SelectTrigger aria-label="Colour space" className={styles.trigger}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
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
			</SelectContent>
		</Select>
	);
}
