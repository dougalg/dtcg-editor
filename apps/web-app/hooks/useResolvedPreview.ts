import { useCallback, useContext, useSyncExternalStore } from "react";
import type { ResolvedValue } from "../lib/tokens/staged-edits-store.ts";
import { StagedEditsContext } from "./useStagedEdits.ts";

/**
 * The current resolved value (references followed over the committed overlay)
 * for one reference row's token, read through `useSyncExternalStore`. Only rows
 * that actually show a reference call this.
 */
export function useResolvedPreview(key: string): ResolvedValue {
	const store = useContext(StagedEditsContext);
	if (store === null) {
		throw new Error(
			"useResolvedPreview must be used within a StagedEditsContext provider",
		);
	}

	const getSnapshot = useCallback(
		() => store.getResolvedPreview(key),
		[store, key],
	);

	return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
