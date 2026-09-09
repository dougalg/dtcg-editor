"use client";

import { Combobox } from "@dtcg-editor/design-system/components/Combobox/Combobox.tsx";
import { useState } from "react";
import { useReferenceCatalogue } from "../../hooks/useReferenceCatalogue.ts";
import type { ReferenceCandidate } from "../../lib/tokens/reference-catalogue-wire.ts";

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
	currentReferenceValue,
	pendingReferenceValue,
	onStageEdit,
	fetchImpl = fetch,
}: {
	readonly editedTokenPath: readonly string[];
	readonly currentReferenceValue: string;
	readonly pendingReferenceValue?: string | undefined;
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

	const displayPath = editedTokenPath.join(".");
	const { status } = useReferenceCatalogue(fetchImpl, activated);

	function handleOpenChange(next: boolean) {
		if (next) {
			setActivated(true);
		}
		setOpen(next);
	}

	const items: readonly ReferenceCandidate[] = [];

	return (
		<Combobox<ReferenceCandidate>
			open={open}
			onOpenChange={handleOpenChange}
			query={query}
			onQueryChange={setQuery}
			items={items}
			getKey={(c) => c.displayPath}
			renderItem={(c) => c.displayPath}
			onSelect={(c) => {
				const value = aliasFor(c.path);
				if (value !== (pendingReferenceValue ?? currentReferenceValue)) {
					onStageEdit(editedTokenPath, { value });
				}
			}}
			inputLabel={`Search tokens to repoint ${displayPath}`}
			triggerLabel={`Repoint reference for ${displayPath}`}
			triggerContent={currentReferenceValue}
			emptyContent="No tokens found"
			loading={status === "loading"}
			loadingContent="Loading tokens…"
		/>
	);
}
