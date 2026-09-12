"use client";

import { Combobox } from "@dtcg-editor/design-system/components/Combobox/Combobox.tsx";
import { type ReactNode, useMemo, useState } from "react";
import { useReferenceCatalogue } from "../../hooks/useReferenceCatalogue.ts";
import { diagnosticFor } from "../../lib/tokens/candidate-diagnostic.ts";
import { filterCandidates } from "../../lib/tokens/candidate-filter.ts";
import { isCircularIfSelected } from "../../lib/tokens/candidate-selectability.ts";
import {
	type HypotheticalResolution,
	resolveIfRepointed,
} from "../../lib/tokens/hypothetical-resolution.ts";
import type { ReferenceCandidate } from "../../lib/tokens/reference-catalogue-wire.ts";
import { CandidatePreview } from "../CandidatePreview/CandidatePreview.tsx";
import styles from "./TokenReferencePicker.module.css";

function aliasFor(path: readonly string[]): string {
	return `{${path.join(".")}}`;
}

/**
 * Mounted `CommandItem` count cap (SC-004). `cmdk` doesn't virtualize its
 * own list — every candidate is a real DOM row it reconciles on every
 * keystroke — so an uncapped list over a large directory (~2,000+ paths)
 * blows the 50ms Long Task budget (measured: 170ms/80ms). Virtualizing
 * under `cmdk`'s `CommandList` isn't an option: it drives its own roving
 * `aria-activedescendant` keyboard nav and `Command.Empty` detection off
 * the currently-mounted `CommandItem`s, and both are documented as broken
 * by windowing (cmdk#282, cmdk#299) — a showstopper given FR-005/SC-006's
 * full-keyboard-operability requirement. `filterCandidates` already
 * orders results by match relevance, so capping the render, not the
 * match set, only ever drops the least-relevant tail — see
 * `docs/research/reference-picker-search-and-virtualization.md`.
 */
const MAX_VISIBLE_CANDIDATES = 200;

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
		} else {
			// Closing clears the query — otherwise a leftover search from the
			// last time this row's picker was open would silently narrow (or
			// empty) the idle listing the next time it reopens, instead of the
			// current-target-only row a reopen is meant to show.
			setQuery("");
		}
		setOpen(next);
	}

	const stagedTarget = pendingReferenceValue ?? currentReferenceValue;
	const trimmedQuery = query.trim();

	// FR-020 revision: an empty/whitespace query no longer lists the whole
	// directory — on a large catalogue that idle full listing was itself
	// the expensive render (SC-004). Idle shows only the current/staged
	// target's own row (pre-selected, so FR-018's "reopening shows what's
	// currently pointed at" keeps working with no typing needed); it stays
	// empty (prompting the user to type) when nothing currently matches.
	const allItems = useMemo((): readonly ReferenceCandidate[] => {
		if (catalogue === undefined) {
			return [];
		}
		if (trimmedQuery === "") {
			return catalogue.candidates.filter(
				(c) => aliasFor(c.path) === stagedTarget,
			);
		}
		return filterCandidates(catalogue.candidates, query, {
			path: editedTokenPath,
			effectiveType: editedEffectiveType,
			file: editedFile,
		});
	}, [
		catalogue,
		query,
		trimmedQuery,
		stagedTarget,
		editedTokenPath,
		editedEffectiveType,
		editedFile,
	]);
	// The staged/current target must stay findable even past the render
	// cap — losing A11's "re-opening marks the current selection" for a
	// large directory would be a regression worse than the cap is meant to
	// fix.
	const selectedKey = allItems.find(
		(c) => aliasFor(c.path) === stagedTarget,
	)?.displayPath;

	const items = allItems.slice(0, MAX_VISIBLE_CANDIDATES);
	const truncatedCount = allItems.length - items.length;

	// FR-009/FR-012 (revised 2026-09-12, third pass): the hypothetical is
	// computed for every visible row, not only the highlighted one — the
	// user wants to see the effect of each candidate in the list as they
	// browse, not only after hovering/highlighting it. `items` is already
	// capped at `MAX_VISIBLE_CANDIDATES` (SC-004); this cache additionally
	// carries results across keystrokes (a narrowing search re-shows many of
	// the same candidates), so only genuinely new rows entering the visible
	// set pay the resolve cost — the `useMemo` below returns a stable `Map`
	// instance per (catalogue, editedTokenPath) pair and mutates it in
	// place, rather than rebuilding one from scratch on every keystroke.
	// biome-ignore lint/correctness/useExhaustiveDependencies: cache-invalidation key, not a factory data dependency — a new pair means stale entries, so the Map should be recreated even though the factory body doesn't read either value.
	const hypotheticalCache = useMemo(
		() => new Map<string, HypotheticalResolution>(),
		[catalogue, editedTokenPath],
	);
	if (catalogue !== undefined) {
		for (const c of items) {
			if (!hypotheticalCache.has(c.displayPath)) {
				hypotheticalCache.set(
					c.displayPath,
					resolveIfRepointed(editedTokenPath, c.path, catalogue),
				);
			}
		}
	}
	const hypotheticalByPath = hypotheticalCache;

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
		: allItems.length === 0
			? trimmedQuery === ""
				? "Type to search"
				: "No matches"
			: truncatedCount > 0
				? `${allItems.length} tokens match, showing the first ${items.length} — refine your search`
				: `${allItems.length} token${allItems.length === 1 ? "" : "s"} match`;

	const highlighted = items.find((c) => c.displayPath === highlightKey);
	const hypothetical =
		highlighted !== undefined
			? hypotheticalByPath.get(highlighted.displayPath)
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
								hypothetical={hypotheticalByPath.get(c.displayPath)}
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
				emptyContent={
					trimmedQuery === "" ? "Type to search tokens" : "No tokens found"
				}
				loading={status === "loading"}
				loadingContent="Loading tokens…"
				listFooter={
					truncatedCount > 0
						? `${truncatedCount} more — refine your search`
						: undefined
				}
			/>
		</>
	);
}
