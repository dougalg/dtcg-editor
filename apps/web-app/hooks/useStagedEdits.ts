import { createContext, useRef } from "react";
import {
	StagedEditsStore,
	type StagedEditsStoreOptions,
} from "../lib/tokens/staged-edits-store.ts";

/**
 * The store for the current `TokenTree` subtree. `TokenTree` provides it from
 * {@link useStagedEdits}; `useTokenSlice` / `useResolvedPreview` read it here so
 * a row does not have to thread the store down by prop.
 */
export const StagedEditsContext = createContext<StagedEditsStore | null>(null);

/**
 * Lazily instantiates exactly one {@link StagedEditsStore} for the lifetime of
 * the calling component's mount. A remount (or a second `TokenTree` on the
 * page) gets its own instance — the store is never module-level (INV-5).
 */
export function useStagedEdits(
	options: StagedEditsStoreOptions,
): StagedEditsStore {
	const ref = useRef<StagedEditsStore | null>(null);
	if (ref.current === null) {
		ref.current = new StagedEditsStore(options);
	}
	return ref.current;
}
