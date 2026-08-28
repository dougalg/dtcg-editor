"use client";

import { Button } from "@dtcg-editor/design-system/components/Button/Button.tsx";
import type { ColorObjectValue } from "@dtcg-editor/token-core";
import { type ReactElement, type ReactNode, useState } from "react";
import { COMPONENT_RANGES } from "../../utils/range-validation.ts";
import { ChannelInput } from "../ChannelInput/ChannelInput.tsx";
import styles from "./ColorFunctionValue.module.css";

export interface ColorFunctionValueProps {
	readonly value: ColorObjectValue;
	readonly onComponentChange: (index: 0 | 1 | 2, next: number) => void;
	readonly onAlphaChange: (next: number | undefined) => void;
	/** The `ColorSpaceSelect` element, injected so this component owns layout. */
	readonly spaceSelect: ReactNode;
	/** id of ColorEditor's range-issue `role="alert"` region (FR-021). */
	readonly issueDescribedById?: string | undefined;
	/** Per-channel out-of-range flags (FR-021). */
	readonly invalid?: readonly [boolean, boolean, boolean] | undefined;
}

export function ColorFunctionValue({
	value,
	onComponentChange,
	onAlphaChange,
	spaceSelect,
	issueDescribedById,
	invalid,
}: ColorFunctionValueProps): ReactElement {
	const [focusAlpha, setFocusAlpha] = useState(false);
	const labels = COMPONENT_RANGES[value.colorSpace];

	return (
		<span className={styles.value}>
			<span className={styles.func}>
				{spaceSelect}
				<span className={styles.paren}>(</span>
			</span>
			<span className={styles.inert}> </span>
			{([0, 1, 2] as const).map((index) => (
				<span key={index}>
					<ChannelInput
						label={`${value.colorSpace} ${labels[index].label}`}
						value={value.components[index]}
						onCommit={(next) => onComponentChange(index, next)}
						invalid={invalid ? invalid[index] : false}
						describedById={issueDescribedById}
					/>
					<span className={styles.inert}> </span>
				</span>
			))}
			{value.alpha !== undefined ? (
				<>
					<span className={styles.inert}>/ </span>
					<ChannelInput
						label="alpha"
						value={value.alpha}
						onCommit={(next) => onAlphaChange(next)}
						onClear={() => onAlphaChange(undefined)}
						autoFocus={focusAlpha}
					/>
					<span className={styles.inert}> </span>
				</>
			) : (
				<>
					<Button
						type="button"
						className={styles.addAlpha}
						onClick={() => {
							setFocusAlpha(true);
							onAlphaChange(1);
						}}
					>
						+ α
					</Button>
					<span className={styles.inert}> </span>
				</>
			)}
			<span className={styles.paren}>)</span>
		</span>
	);
}
