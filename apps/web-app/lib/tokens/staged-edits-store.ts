import type { ClientEdit } from "./edit-state.ts";
import type { PlainDtcgNode } from "./plain-node.ts";
import type { TokenReferenceView } from "./reference-index.ts";

export interface StagedEditsStoreOptions {
	readonly initialTree: PlainDtcgNode;
	readonly referenceView: TokenReferenceView | undefined;
	readonly save: (edits: readonly ClientEdit[]) => Promise<boolean>;
}

/**
 * Owns one `TokenTree` mount's editing session: the base tree plus the
 * unsaved-edit overlay, behind a narrow key-addressed interface that React
 * reads through `useSyncExternalStore`. React-free (constitution VII).
 *
 * The read methods are bound instance fields, not prototype methods, so a
 * consumer can hold a bare reference (`useSyncExternalStore(store.subscribe,
 * () => store.getFields(key))`) without losing `this`.
 */
export class StagedEditsStore {
	#tree: PlainDtcgNode;

	constructor(options: StagedEditsStoreOptions) {
		this.#tree = options.initialTree;
	}

	subscribe = (_listener: () => void): (() => void) => {
		return () => {};
	};

	getTree = (): PlainDtcgNode => {
		return this.#tree;
	};

	getHasPending = (): boolean => {
		return false;
	};
}
