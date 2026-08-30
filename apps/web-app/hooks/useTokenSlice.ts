import { useContext, useSyncExternalStore } from "react";
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

	const fields = useSyncExternalStore(
		store.subscribe,
		() => store.getFields(key),
		() => store.getFields(key),
	);
	const error = useSyncExternalStore(
		store.subscribe,
		() => store.getError(key),
		() => store.getError(key),
	);

	return {
		fields,
		error,
		commit: (draft) => store.commit(key, draft),
		discard: () => store.discard(key),
	};
}
