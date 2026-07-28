import { err, ok, type Result } from "neverthrow";
import { findNode } from "./resolve-type.ts";
import type { DtcgNode, GroupNode, TokenDocument, TokenNode } from "./types.ts";

/** Returned by `applyTokenEdits` for any edit that can't be applied. */
export class TokenEditError extends Error {
	readonly path: readonly string[];

	constructor(message: string, path: readonly string[]) {
		super(message);
		this.name = "TokenEditError";
		this.path = path;
	}
}

/**
 * A single token patch. `path` identifies the token by its location in the
 * tree *before* this (or any earlier, already-applied) edit; `name`, if
 * given and different from the token's current name, renames it (rejected
 * on a sibling collision). `value`/`description`, if given, replace those
 * fields as-is — this module has no concept of what a "valid" value is for
 * any particular token type; that validation happens before an edit reaches
 * here.
 */
export interface TokenEdit {
	readonly path: readonly string[];
	readonly name?: string;
	readonly value?: unknown;
	readonly description?: string;
}

function describePath(path: readonly string[]): string {
	return path.length > 0 ? path.join(".") : "<root>";
}

function withReplacedChild(
	group: GroupNode,
	oldKey: string,
	newKey: string,
	newChild: DtcgNode,
): GroupNode {
	const children = new Map(group.children);
	children.delete(oldKey);
	children.set(newKey, newChild);
	return { ...group, children };
}

/**
 * Rewrites `node`'s own `path` and, recursively, every descendant's `path`,
 * replacing the `oldPrefix` segment with `newPrefix` while keeping each
 * node's relative path suffix intact. Used when a group is renamed: the
 * rename only swaps one key in the group's *parent*, but every node's
 * `path` field is denormalized (stores the full ancestor chain), so a
 * renamed ancestor segment must be propagated to the whole subtree.
 */
function renameSubtreePath(
	node: DtcgNode,
	oldPrefix: readonly string[],
	newPrefix: readonly string[],
): DtcgNode {
	const newPath = [...newPrefix, ...node.path.slice(oldPrefix.length)];

	if (node.kind === "token") {
		return { ...node, path: newPath };
	}

	const children = new Map(
		Array.from(node.children.entries()).map(([key, child]) => [
			key,
			renameSubtreePath(child, oldPrefix, newPrefix),
		]),
	);
	return { ...node, path: newPath, children };
}

/**
 * Returns a `TokenEditError` if `newName` collides with an existing sibling
 * of `currentName` in `parent.children` — shared by both the token and
 * group rename branches of `applyOneEdit`, which otherwise duplicate this
 * exact check.
 */
function checkSiblingCollision(
	parent: GroupNode,
	currentName: string,
	newName: string,
	path: readonly string[],
): TokenEditError | undefined {
	if (newName !== currentName && parent.children.has(newName)) {
		return new TokenEditError(
			`"${newName}" already exists alongside "${describePath(path)}"`,
			path,
		);
	}
	return undefined;
}

// Rebuilds `ancestors[index..]`, bottom-up, with the leaf's key swapped from
// `oldKey` to `newKey`. Returns `undefined` only if `index` is out of range —
// callers only ever pass in-range indices, but this returns rather than
// throws/asserts so a violated invariant surfaces as a normal `TokenEditError`
// through `applyOneEdit`'s `Result`, not an uncaught exception.
function rebuildAncestorChain(
	ancestors: readonly GroupNode[],
	index: number,
	oldKey: string,
	newKey: string,
	newNode: DtcgNode,
): GroupNode | undefined {
	const current = ancestors[index];
	if (current === undefined) {
		return undefined;
	}

	if (index === ancestors.length - 1) {
		return withReplacedChild(current, oldKey, newKey, newNode);
	}

	const nextAncestor = ancestors[index + 1];
	if (nextAncestor === undefined) {
		return undefined;
	}
	const updatedChild = rebuildAncestorChain(
		ancestors,
		index + 1,
		oldKey,
		newKey,
		newNode,
	);
	if (updatedChild === undefined) {
		return undefined;
	}
	return withReplacedChild(
		current,
		nextAncestor.name,
		nextAncestor.name,
		updatedChild,
	);
}

function applyOneEdit(
	root: GroupNode,
	edit: TokenEdit,
): Result<GroupNode, TokenEditError> {
	const located = findNode(root, edit.path);
	if (located === undefined) {
		return err(
			new TokenEditError(
				`No token found at "${describePath(edit.path)}"`,
				edit.path,
			),
		);
	}
	// `located.ancestors` is always non-empty here: a token's path is never
	// empty (the document root is always a group), and a group being edited
	// (below) has a non-empty `edit.path` too — `findNode` only ever returns
	// the root itself (ancestors `[]`) for an empty path, which no caller
	// produces since the root has no parent key to rename.
	const parent = located.ancestors[located.ancestors.length - 1];
	if (parent === undefined) {
		return err(new TokenEditError(`Cannot edit the document root`, edit.path));
	}

	const currentName = located.node.name;
	const newName = edit.name ?? currentName;

	if (located.node.kind === "group") {
		if (edit.value !== undefined || edit.description !== undefined) {
			return err(
				new TokenEditError(
					`Cannot set value/description on a group ("${describePath(edit.path)}")`,
					edit.path,
				),
			);
		}
		const collision = checkSiblingCollision(
			parent,
			currentName,
			newName,
			edit.path,
		);
		if (collision !== undefined) {
			return err(collision);
		}

		const patchedGroup = renameSubtreePath(
			{ ...located.node, name: newName },
			located.node.path,
			[...located.node.path.slice(0, -1), newName],
		);
		const newRoot = rebuildAncestorChain(
			located.ancestors,
			0,
			currentName,
			newName,
			patchedGroup,
		);
		if (newRoot === undefined) {
			return err(
				new TokenEditError(
					`Internal error rebuilding the tree for "${describePath(edit.path)}"`,
					edit.path,
				),
			);
		}
		return ok(newRoot);
	}

	const collision = checkSiblingCollision(
		parent,
		currentName,
		newName,
		edit.path,
	);
	if (collision !== undefined) {
		return err(collision);
	}

	const patchedToken: TokenNode = {
		...located.node,
		name: newName,
		path: [...located.node.path.slice(0, -1), newName],
		value: edit.value ?? located.node.value,
		description: edit.description ?? located.node.description,
	};

	const newRoot = rebuildAncestorChain(
		located.ancestors,
		0,
		currentName,
		newName,
		patchedToken,
	);
	if (newRoot === undefined) {
		return err(
			new TokenEditError(
				`Internal error rebuilding the tree for "${describePath(edit.path)}"`,
				edit.path,
			),
		);
	}
	return ok(newRoot);
}

/**
 * Applies a batch of edits to a `TokenDocument`, producing a new,
 * immutably-rebuilt tree. Edits are applied in order against a
 * continuously-updated tree, so later edits in the same batch see the
 * effects of earlier ones. The incoming array is stably sorted by
 * descending `path.length` first, so an edit to a deeper node always
 * resolves before an edit renaming one of its ancestors — otherwise a
 * group rename earlier in the array would invalidate a descendant edit's
 * `path` before that edit ever runs. `Array.prototype.sort` is stable
 * (guaranteed since ES2019), so edits at the same depth keep their
 * original relative order.
 */
export function applyTokenEdits(
	document: TokenDocument,
	edits: readonly TokenEdit[],
): Result<TokenDocument, TokenEditError> {
	const orderedEdits = [...edits].sort((a, b) => b.path.length - a.path.length);

	let root = document.root;

	for (const edit of orderedEdits) {
		const result = applyOneEdit(root, edit);
		if (result.isErr()) {
			return err(result.error);
		}
		root = result.value;
	}

	return ok({ root });
}
