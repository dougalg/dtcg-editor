"use client";

import { Button } from "@dtcg-editor/design-system/components/Button/Button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@dtcg-editor/design-system/components/Dialog/Dialog.tsx";
import type { ColorSpace } from "@dtcg-editor/token-core";
import { type ReactElement, useRef } from "react";
import { type ColorConversion, formatChannel } from "../../utils/conversion.ts";
import styles from "./SpaceConversionDialog.module.css";

export interface SpaceConversionDialogProps {
	readonly open: boolean;
	readonly sourceSpace: ColorSpace;
	readonly conversion: ColorConversion;
	readonly onAccept: () => void;
	/** Also fired on Escape, backdrop click, or close. */
	readonly onDeny: () => void;
}

function formatFrom(from: number | "none" | null): string {
	if (from === null) return "—";
	if (from === "none") return "none";
	return formatChannel(from);
}

function channelNote(
	conversion: ColorConversion,
	index: 0 | 1 | 2,
): string | null {
	const hue = conversion.notes.find(
		(n) => n.kind === "hue-undefined" && n.channelIndex === index,
	);
	if (hue) return "undefined for a grey colour — set to 0";
	return null;
}

export function SpaceConversionDialog({
	open,
	sourceSpace,
	conversion,
	onAccept,
	onDeny,
}: SpaceConversionDialogProps): ReactElement {
	const denyRef = useRef<HTMLButtonElement>(null);
	const gamutClamped = conversion.notes.some((n) => n.kind === "gamut-clamped");

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onDeny();
			}}
		>
			<DialogContent
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					denyRef.current?.focus();
				}}
			>
				<DialogTitle>Convert to {conversion.targetSpace}?</DialogTitle>
				<DialogDescription>
					Converting this colour from {sourceSpace} to {conversion.targetSpace}{" "}
					is not exact. Review the changes below.
				</DialogDescription>
				<table className={styles.table}>
					<thead>
						<tr>
							<th scope="col">Channel</th>
							<th scope="col">Now</th>
							<th scope="col">After</th>
							<th scope="col">Note</th>
						</tr>
					</thead>
					<tbody>
						{conversion.channelChanges.map((change, index) => (
							<tr key={change.label}>
								<td>{change.label}</td>
								<td>{formatFrom(change.from)}</td>
								<td>{formatChannel(change.to)}</td>
								<td>
									{channelNote(conversion, index as 0 | 1 | 2) ??
										(gamutClamped && change.changed
											? "clamped to the target gamut"
											: "")}
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{gamutClamped ? (
					<p className={styles.note}>
						This colour is outside the {conversion.targetSpace} gamut and will
						be mapped to its nearest in-gamut colour.
					</p>
				) : null}
				<div className={styles.actions}>
					<Button ref={denyRef} type="button" onClick={onDeny}>
						Deny
					</Button>
					<Button type="button" onClick={onAccept}>
						Accept
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
