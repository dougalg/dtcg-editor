"use client";

import { Combobox } from "@dtcg-editor/design-system/components/Combobox/Combobox.tsx";
import { type ReactNode, useMemo, useState } from "react";
import { useReferenceCatalogue } from "../../hooks/useReferenceCatalogue.ts";
import { diagnosticFor } from "../../lib/tokens/candidate-diagnostic.ts";
import { filterCandidates } from "../../lib/tokens/candidate-filter.ts";
import { isCircularIfSelected } from "../../lib/tokens/candidate-selectability.ts";
import { resolveIfRepointed } from "../../lib/tokens/hypothetical-resolution.ts";
import type { ReferenceCandidate } from "../../lib/tokens/reference-catalogue-wire.ts";
import { CandidatePreview } from "../CandidatePreview/CandidatePreview.tsx";
import styles from "./TokenReferencePicker.module.css";

function aliasFor(path: readonly string[]): string {
	return `{${path.join(".")}}`;
}

/**
 * The reference-repointing control: a `Combobox` over every token path in the
 * loaded directory. The catalogue is fetched on first open and cached for the
 * session; selecting a candidate stages an ordinary pending edit setting the
 * token's value to that path in DTCG alias syntax.
 */
export function TokenReferencePicker({
	editedTokenPath,
	editedEffectiveType,
	editedFile = "",
	currentReferenceValue,
	pendingReferenceValue,
	triggerContent,
	onStageEdit,
	fetchImpl = fetch,
}: {
	readonly editedTokenPath: readonly string[];
	readonly editedEffectiveType?: string | undefined;
	/** Relative path of the file the edited token lives in — empty-query ordering only. */
	readonly editedFile?: string;
	readonly currentReferenceValue: string;
	readonly pendingReferenceValue?: string | undefined;
	/** What the closed trigger shows; defaults to the current reference text. */
	readonly triggerContent?: ReactNode;
	readonly onStageEdit: (
		path: readonly string[],
		patch: { readonly value: string },
	) => void;
	/** Injected for tests (Principle VI); real `fetch` by default. */
	readonly fetchImpl?: typeof fetch;
}) {
	const [open, setOpen] = useState(false);
	const [activated, setActivated] = useState(false);
	const [query, setQuery] = useState("");
	const [highlightKey, setHighlightKey] = useState<string>();

	const displayPath = editedTokenPath.join(".");
	const { status, catalogue } = useReferenceCatalogue(fetchImpl, activated);

	function handleOpenChange(next: boolean) {
		if (next) {
			setActivated(true);
		}
		setOpen(next);
	}

	const stagedTarget = pendingReferenceValue ?? currentReferenceValue;

	const items = useMemo(
		(): readonly ReferenceCandidate[] =>
			catalogue === undefined
				? []
				: filterCandidates(catalogue.candidates, query, {
						path: editedTokenPath,
						effectiveType: editedEffectiveType,
						file: editedFile,
					}),
		[catalogue, query, editedTokenPath, editedEffectiveType, editedFile],
	);

	const selectedKey = items.find(
		(c) => aliasFor(c.path) === stagedTarget,
	)?.displayPath;

	if (status === "error") {
		// FR-021: the whole-directory catalogue is unavailable — degrade to
		// editing the reference as raw alias text, no rich preview, so the user
		// is no worse off than before this feature.
		return (
			<input
				type="text"
				className={styles.rawInput}
				aria-label={`Reference for ${displayPath}`}
				defaultValue={stagedTarget}
				onChange={(event) =>
					onStageEdit(editedTokenPath, { value: event.target.value })
				}
			/>
		);
	}

	const resultAnnouncement = !open
		? ""
		: items.length === 0
			? "No matches"
			: `${items.length} token${items.length === 1 ? "" : "s"} match`;

	const highlighted = items.find((c) => c.displayPath === highlightKey);
	const hypothetical =
		highlighted !== undefined && catalogue !== undefined
			? resolveIfRepointed(editedTokenPath, highlighted.path, catalogue)
			: undefined;

	return (
		<>
			<span
				role="status"
				aria-live="polite"
				aria-label="Search results"
				className={styles.srOnly}
			>
				{resultAnnouncement}
				{highlighted !== undefined ? (
					<>
						{" — "}
						<CandidatePreview
							candidate={highlighted}
							hypothetical={hypothetical}
						/>
					</>
				) : null}
			</span>
			<Combobox<ReferenceCandidate>
				open={open}
				onOpenChange={handleOpenChange}
				query={query}
				onQueryChange={setQuery}
				items={items}
				getKey={(c) => c.displayPath}
				renderItem={(c) => (
					<span className={styles.row}>
						<span className={styles.rowPath}>{c.displayPath}</span>
						{/* Visual only — the row's accessible name stays the bare
						    displayPath above; the resolved value and any diagnostic
						    are already announced through the aria-live region
						    (U84), which tracks the highlight rather than dumping
						    every row's preview into the accessible tree at once. */}
						<span aria-hidden="true">
							<CandidatePreview
								candidate={c}
								diagnostic={diagnosticFor(editedTokenPath, c)}
								hypothetical={
									c.displayPath === highlightKey ? hypothetical : undefined
								}
							/>
						</span>
					</span>
				)}
				isItemDisabled={(c) => isCircularIfSelected(editedTokenPath, c)}
				selectedKey={selectedKey}
				onHighlightChange={setHighlightKey}
				onSelect={(c) => {
					const value = aliasFor(c.path);
					if (value !== stagedTarget) {
						onStageEdit(editedTokenPath, { value });
					}
				}}
				inputLabel={`Search tokens to repoint ${displayPath}`}
				triggerLabel={`Repoint reference for ${displayPath}`}
				triggerContent={triggerContent ?? currentReferenceValue}
				emptyContent="No tokens found"
				loading={status === "loading"}
				loadingContent="Loading tokens…"
			/>
		</>
	);
}
