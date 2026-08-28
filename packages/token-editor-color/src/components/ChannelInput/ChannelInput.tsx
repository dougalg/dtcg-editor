"use client";

import { Input } from "@dtcg-editor/design-system/components/Input/Input.tsx";
import { type KeyboardEvent, type ReactElement, useState } from "react";
import { formatChannel } from "../../utils/conversion.ts";
import styles from "./ChannelInput.module.css";

interface CommonProps {
	/** Accessible name, e.g. "oklch L". Rendered as a visually-hidden label. */
	readonly label: string;
	readonly invalid?: boolean | undefined;
	/** id of ColorEditor's range-issue `role="alert"` region (FR-021). */
	readonly describedById?: string | undefined;
	readonly autoFocus?: boolean | undefined;
}

interface NumberProps extends CommonProps {
	readonly mode?: "number" | undefined;
	readonly value: number | "none";
	readonly onCommit: (next: number) => void;
	/** Alpha only: an emptied input commits as "remove alpha" (research R8). */
	readonly onClear?: (() => void) | undefined;
}

interface TextProps extends CommonProps {
	readonly mode: "text";
	readonly value: string;
	readonly onCommit: (next: string) => void;
}

export type ChannelInputProps = NumberProps | TextProps;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function restingText(props: ChannelInputProps): string {
	if (props.mode === "text") {
		return props.value;
	}
	return props.value === "none" ? "none" : formatChannel(props.value);
}

export function ChannelInput(props: ChannelInputProps): ReactElement {
	const { label, invalid, describedById, autoFocus } = props;
	const isText = props.mode === "text";
	const [draft, setDraft] = useState<string | null>(null);
	const shown = draft ?? restingText(props);

	function commit(): void {
		const current = draft;
		setDraft(null);
		if (current === null) {
			return;
		}
		if (isText) {
			if (HEX_RE.test(current)) {
				(props as TextProps).onCommit(current);
			}
			return;
		}
		const trimmed = current.trim();
		if (trimmed === "" && (props as NumberProps).onClear) {
			(props as NumberProps).onClear?.();
			return;
		}
		const next = Number(trimmed);
		if (trimmed !== "" && Number.isFinite(next)) {
			(props as NumberProps).onCommit(next);
		}
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
		if (event.key === "Enter") {
			event.preventDefault();
			commit();
		} else if (event.key === "Escape") {
			event.preventDefault();
			setDraft(null);
		}
	}

	return (
		<Input
			type="text"
			inputMode={isText ? undefined : "decimal"}
			pattern={isText ? "#[0-9a-fA-F]{6}" : undefined}
			className={styles.field}
			autoFocus={autoFocus}
			aria-label={label}
			aria-invalid={invalid ? true : undefined}
			aria-describedby={invalid ? describedById : undefined}
			value={shown}
			onFocus={() =>
				setDraft(!isText && props.value === "none" ? "" : restingText(props))
			}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={commit}
			onKeyDown={handleKeyDown}
		/>
	);
}
