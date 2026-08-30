import { useCallback, useContext, useSyncExternalStore } from "react";
import type {
	EditableFields,
	FieldErrors,
} from "../lib/tokens/staged-edits-store.ts";
import { StagedEditsContext } from "./useStagedEdits.ts";

export interface TokenSlice {
	readonly fields: EditableFields;
	readonly error: FieldErrors | undefined;
	readonly commit: (draft: Partial<EditableFields>) => boolean;
	readonly discard: () => void;
}

/**
 * One token row's editing slice: its merged `fields` and `error` read through
 * `useSyncExternalStore`, plus `commit` / `discard` pre-bound to `key` so the
 * row never handles a path itself.
 */
export function useTokenSlice(key: string): TokenSlice {
	const store = useContext(StagedEditsContext);
	if (store === null) {
		throw new Error(
			"useTokenSlice must be used within a StagedEditsContext provider",
		);
	}

	// Stable getsnapshot closures (INV-19): a fresh closure per render would not
	// re-subscribe — `subscribe` is the only dep — but it churns the snapshot
	// comparison `useSyncExternalStore` runs on every render.
	const getFields = useCallback(() => store.getFields(key), [store, key]);
	const getError = useCallback(() => store.getError(key), [store, key]);

	const fields = useSyncExternalStore(store.subscribe, getFields, getFields);
	const error = useSyncExternalStore(store.subscribe, getError, getError);

	return {
		fields,
		error,
		commit: (draft) => store.commit(key, draft),
		discard: () => store.discard(key),
	};
}
