import { validateTokenValue } from "@dtcg-editor/token-editor-contract";
import { resolveBuiltInContract } from "../token-editors/built-in.ts";
import type { ClientEdit } from "./edit-state.ts";
import {
	applyEditsToPlainNode,
	checkRenameAvailable,
	findSiblings,
} from "./edit-state.ts";
import type { PlainDtcgNode } from "./plain-node.ts";
import {
	buildReverseDeps,
	type ResolvedValue,
	resolvePreview,
} from "./preview-resolver.ts";
import type { TokenReferenceView } from "./reference-index.ts";

export type { ResolvedValue };

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
	#previewCache = new Map<PathKey, ResolvedValue>();
	#reverseDeps = new Map<PathKey, Set<PathKey>>();
	#serverPreview: ReadonlyMap<PathKey, ResolvedValue> = new Map();
	#listeners = new Set<() => void>();
	#save: StagedEditsStoreOptions["save"];

	constructor(options: StagedEditsStoreOptions) {
		this.#tree = options.initialTree;
		this.#save = options.save;
		this.#index = new Map();
		this.#rebuildIndex();
	}

	#rebuildIndex(): void {
		this.#index.clear();
		indexByPath(this.#tree, this.#index);
		this.#reverseDeps = buildReverseDeps(this.#tree, this.#serverPreview);
	}

	/** Base node with the committed pending value (if any) laid over — never a row's uncommitted draft (INV-8). */
	#getEffectiveNode = (key: PathKey): PlainDtcgNode | undefined => {
		const base = this.#index.get(key);
		if (base === undefined || base.kind !== "token") {
			return base;
		}
		const pending = this.#pending.get(key);
		if (pending === undefined || !("value" in pending)) {
			return base;
		}
		return { ...base, value: pending.value };
	};

	subscribe = (listener: () => void): (() => void) => {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	};

	#emit(): void {
		for (const listener of this.#listeners) {
			listener();
		}
	}

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

	/** What the token at `key` currently evaluates to (references followed over the committed overlay). Cached. */
	getResolvedPreview = (key: PathKey): ResolvedValue => {
		const cached = this.#previewCache.get(key);
		if (cached !== undefined) {
			return cached;
		}
		const resolved = resolvePreview(
			key,
			this.#getEffectiveNode,
			this.#serverPreview,
		);
		this.#previewCache.set(key, resolved);
		return resolved;
	};

	/**
	 * Validate a candidate draft and return the resulting `FieldErrors` without
	 * writing anything — for a field that wants an inline error while typing,
	 * separate from `commit`'s validate-and-stage.
	 */
	validate = (key: PathKey, draft: Partial<EditableFields>): FieldErrors => {
		return {
			name: this.#validateDraftName(key, draft),
			value: this.#validateDraftValue(key, draft),
		};
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
	 * Record a validation error the component produced (only the fallback
	 * editor's `JSON.parse` failure uses this). Sets `#errors[key]`; never
	 * touches `#pending`.
	 */
	reportError = (key: PathKey, errors: FieldErrors): void => {
		this.#errors.set(key, errors);
		this.#emit();
	};

	/** Drop one key's staged edit and error; other keys' snapshots are untouched (INV-1). */
	discard = (key: PathKey): void => {
		this.#pending.delete(key);
		this.#errors.delete(key);
		this.#fieldsCache.delete(key);
		this.#previewCache.clear();
		this.#emit();
	};

	/**
	 * Persist the staged edits through the injected `save`. On success the
	 * overlay is folded into the base tree by a single `applyEditsToPlainNode`,
	 * `#pending` / `#errors` are cleared, and the index + caches are rebuilt
	 * (INV-7). `#tree` changes here and nowhere else.
	 */
	save = async (): Promise<boolean> => {
		const edits = this.getEdits();
		const ok = await this.#save(edits);
		if (ok) {
			this.#tree = applyEditsToPlainNode(this.#tree, edits);
			this.#pending.clear();
			this.#errors.clear();
			this.#rebuildIndex();
			this.#fieldsCache.clear();
			this.#previewCache.clear();
			this.#emit();
		}
		return ok;
	};

	/**
	 * Validate `draft` (a row's uncommitted field edits) and, if it passes,
	 * stage it against `key`. On failure the draft is not staged, `#errors[key]`
	 * records why, and `commit` returns `false` (INV-6). Only the touched key's
	 * cached snapshot is invalidated — an unrelated key's `getFields` reference
	 * is left intact (INV-1).
	 */
	commit = (key: PathKey, draft: Partial<EditableFields>): boolean => {
		const errors = this.validate(key, draft);
		if (errors.name !== undefined || errors.value !== undefined) {
			this.#errors.set(key, errors);
			this.#fieldsCache.delete(key);
			this.#emit();
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
		this.#invalidatePreview(key);
		this.#emit();
		return true;
	};

	/** Drop the resolved-preview cache for `key` and every token that transitively references it (INV-17). */
	#invalidatePreview(key: PathKey): void {
		this.#previewCache.delete(key);
		for (const dependent of this.#reverseDeps.get(key) ?? []) {
			this.#previewCache.delete(dependent);
		}
	}

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
