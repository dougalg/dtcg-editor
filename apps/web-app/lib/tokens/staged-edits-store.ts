import { validateTokenValue } from "@dtcg-editor/token-editor-contract";
import { resolveBuiltInContract } from "../token-editors/built-in.ts";
import type { ClientEdit } from "./edit-state.ts";
import type { PlainDtcgNode } from "./plain-node.ts";
import type { TokenReferenceView } from "./reference-index.ts";

/** Per-field validation messages for one token; `undefined` where that field is fine. */
export interface FieldErrors {
	readonly name: string | undefined;
	readonly value: string | undefined;
}

/** `path.join(".")` — how a token/group is addressed across the store's interface. */
export type PathKey = string;

/** The editable surface of one token, as a row renders it: base ⊕ pending. */
export interface EditableFields {
	readonly name: string;
	readonly value: unknown;
	readonly description: string;
	readonly type?: string;
}

export interface StagedEditsStoreOptions {
	readonly initialTree: PlainDtcgNode;
	readonly referenceView: TokenReferenceView | undefined;
	readonly save: (edits: readonly ClientEdit[]) => Promise<boolean>;
}

function pathKey(path: readonly string[]): PathKey {
	return path.join(".");
}

/** Base node fields with the pending edit (if any) laid over the top. */
function mergeFields(
	key: PathKey,
	node: PlainDtcgNode | undefined,
	pending: ClientEdit | undefined,
): EditableFields {
	const type = pending?.type ?? node?.declaredType;
	return {
		name: pending?.name ?? node?.name ?? key.split(".").at(-1) ?? "",
		value:
			pending !== undefined && "value" in pending
				? pending.value
				: node?.kind === "token"
					? node.value
					: undefined,
		description: pending?.description ?? node?.description ?? "",
		...(type !== undefined ? { type } : {}),
	};
}

function indexByPath(
	node: PlainDtcgNode,
	into: Map<PathKey, PlainDtcgNode>,
): void {
	into.set(pathKey(node.path), node);
	if (node.kind === "group") {
		for (const child of node.children) {
			indexByPath(child, into);
		}
	}
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
	#index: Map<PathKey, PlainDtcgNode>;
	#pending = new Map<PathKey, ClientEdit>();
	#errors = new Map<PathKey, FieldErrors>();
	#fieldsCache = new Map<PathKey, EditableFields>();

	constructor(options: StagedEditsStoreOptions) {
		this.#tree = options.initialTree;
		this.#index = new Map();
		indexByPath(this.#tree, this.#index);
	}

	subscribe = (_listener: () => void): (() => void) => {
		return () => {};
	};

	getTree = (): PlainDtcgNode => {
		return this.#tree;
	};

	getFields = (key: PathKey): EditableFields => {
		const cached = this.#fieldsCache.get(key);
		if (cached !== undefined) {
			return cached;
		}
		const fields = mergeFields(
			key,
			this.#index.get(key),
			this.#pending.get(key),
		);
		this.#fieldsCache.set(key, fields);
		return fields;
	};

	getHasPending = (): boolean => {
		return false;
	};

	getError = (key: PathKey): FieldErrors | undefined => {
		return this.#errors.get(key);
	};

	/**
	 * Validate `draft` (a row's uncommitted field edits) and, if it passes,
	 * stage it against `key`. On failure the draft is not staged, `#errors[key]`
	 * records why, and `commit` returns `false` (INV-6). Only the touched key's
	 * cached snapshot is invalidated — an unrelated key's `getFields` reference
	 * is left intact (INV-1).
	 */
	commit = (key: PathKey, draft: Partial<EditableFields>): boolean => {
		const valueError = this.#validateDraftValue(key, draft);
		if (valueError !== undefined) {
			this.#errors.set(key, { name: undefined, value: valueError });
			this.#fieldsCache.delete(key);
			return false;
		}
		this.#errors.delete(key);
		this.#pending.set(key, { path: key.split("."), ...draft });
		this.#fieldsCache.delete(key);
		return true;
	};

	#validateDraftValue(
		key: PathKey,
		draft: Partial<EditableFields>,
	): string | undefined {
		if (!("value" in draft)) {
			return undefined;
		}
		const node = this.#index.get(key);
		const type = draft.type ?? node?.effectiveType;
		if (type === undefined) {
			return undefined;
		}
		const contract = resolveBuiltInContract(type);
		if (contract === undefined) {
			return undefined;
		}
		const result = validateTokenValue(contract, draft.value);
		return result.isErr() ? result.error.message : undefined;
	}
}
