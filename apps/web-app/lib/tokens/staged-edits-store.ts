import { validateTokenValue } from "@dtcg-editor/token-editor-contract";
import { resolveBuiltInContract } from "../token-editors/built-in.ts";
import type { ClientEdit } from "./edit-state.ts";
import { checkRenameAvailable, findSiblings } from "./edit-state.ts";
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

function sameValue(a: unknown, b: unknown): boolean {
	return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/** The subset of `draft` whose values actually differ from `current`. */
function changedFields(
	draft: Partial<EditableFields>,
	current: EditableFields,
): Partial<EditableFields> {
	const changed: Partial<EditableFields> = {};
	if ("value" in draft && !sameValue(draft.value, current.value)) {
		changed.value = draft.value;
	}
	if (draft.name !== undefined && draft.name !== current.name) {
		changed.name = draft.name;
	}
	if (
		draft.description !== undefined &&
		draft.description !== current.description
	) {
		changed.description = draft.description;
	}
	if (draft.type !== undefined && draft.type !== current.type) {
		changed.type = draft.type;
	}
	return changed;
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
		return this.#pending.size > 0;
	};

	getError = (key: PathKey): FieldErrors | undefined => {
		return this.#errors.get(key);
	};

	/**
	 * The staged edits, as a fresh array — for `save()` only. Never a
	 * `useSyncExternalStore` snapshot: a new array every call would make the
	 * hook re-render forever.
	 */
	getEdits = (): readonly ClientEdit[] => {
		return Array.from(this.#pending.values());
	};

	/**
	 * Validate `draft` (a row's uncommitted field edits) and, if it passes,
	 * stage it against `key`. On failure the draft is not staged, `#errors[key]`
	 * records why, and `commit` returns `false` (INV-6). Only the touched key's
	 * cached snapshot is invalidated — an unrelated key's `getFields` reference
	 * is left intact (INV-1).
	 */
	commit = (key: PathKey, draft: Partial<EditableFields>): boolean => {
		const nameError = this.#validateDraftName(key, draft);
		const valueError = this.#validateDraftValue(key, draft);
		if (nameError !== undefined || valueError !== undefined) {
			this.#errors.set(key, { name: nameError, value: valueError });
			this.#fieldsCache.delete(key);
			return false;
		}
		this.#errors.delete(key);
		const existing = this.#pending.get(key);
		const current = mergeFields(key, this.#index.get(key), existing);
		const changed = changedFields(draft, current);
		if (Object.keys(changed).length > 0) {
			this.#pending.set(key, {
				path: key.split("."),
				...existing,
				...changed,
			});
		}
		this.#fieldsCache.delete(key);
		return true;
	};

	#validateDraftName(
		key: PathKey,
		draft: Partial<EditableFields>,
	): string | undefined {
		const node = this.#index.get(key);
		if (draft.name === undefined || node === undefined) {
			return undefined;
		}
		const siblings = findSiblings(this.#tree, node.path);
		if (checkRenameAvailable(siblings, draft.name, node.name)) {
			return undefined;
		}
		return `The name "${draft.name}" is already used by a sibling.`;
	}

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
