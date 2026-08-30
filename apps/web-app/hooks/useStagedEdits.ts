import { useRef } from "react";
import {
	StagedEditsStore,
	type StagedEditsStoreOptions,
} from "../lib/tokens/staged-edits-store.ts";

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
