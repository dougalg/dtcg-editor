import type { PlainDtcgNode } from "./plain-node.ts";

/** A single staged (not yet saved) edit to one token, identified by its original path. */
export interface ClientEdit {
	readonly path: readonly string[];
	readonly name?: string;
	readonly value?: unknown;
	readonly description?: string;
}

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

function findByPath(
	node: PlainDtcgNode,
	path: readonly string[],
): PlainDtcgNode | undefined {
	if (pathKey(node.path) === pathKey(path)) {
		return node;
	}
	if (node.kind !== "group") {
		return undefined;
	}
	for (const child of node.children) {
		const found = findByPath(child, path);
		if (found !== undefined) {
			return found;
		}
	}
	return undefined;
}

/** The other nodes sharing `path`'s parent group (used for rename-collision checks) — excludes the node at `path` itself. */
export function findSiblings(
	root: PlainDtcgNode,
	path: readonly string[],
): readonly PlainDtcgNode[] {
	const parent = findByPath(root, path.slice(0, -1));
	if (parent === undefined || parent.kind !== "group") {
		return [];
	}
	return parent.children.filter(
		(child) => pathKey(child.path) !== pathKey(path),
	);
}

/** Whether `name` is free to rename a token to, given its current siblings and its own current name. */
export function checkRenameAvailable(
	siblings: readonly PlainDtcgNode[],
	name: string,
	currentName: string,
): boolean {
	if (name === currentName) {
		return true;
	}
	return !siblings.some((sibling) => sibling.name === name);
}

/**
 * Rewrites `node`'s own `path` and, recursively, every descendant's `path`,
 * replacing the `oldPrefix` segment with `newPrefix` while keeping each
 * node's relative path suffix intact. Client-side mirror of `token-core`'s
 * `edit.ts`'s `renameSubtreePath`, operating on `PlainDtcgNode`'s
 * array-based `children` instead of a `Map` — needed so a renamed group's
 * descendants stay reachable at their new, prefixed path in the
 * optimistically-updated local tree.
 */
function renameSubtreePlainNode(
	node: PlainDtcgNode,
	oldPrefix: readonly string[],
	newPrefix: readonly string[],
): PlainDtcgNode {
	const newPath = [...newPrefix, ...node.path.slice(oldPrefix.length)];

	if (node.kind === "token") {
		return { ...node, path: newPath };
	}

	return {
		...node,
		path: newPath,
		children: node.children.map((child) =>
			renameSubtreePlainNode(child, oldPrefix, newPrefix),
		),
	};
}

function applyEditToNode(node: PlainDtcgNode, edit: ClientEdit): PlainDtcgNode {
	if (pathKey(node.path) === pathKey(edit.path)) {
		if (node.kind === "group") {
			const newName = edit.name ?? node.name;
			return renameSubtreePlainNode({ ...node, name: newName }, node.path, [
				...node.path.slice(0, -1),
				newName,
			]);
		}
		const newName = edit.name ?? node.name;
		return {
			...node,
			name: newName,
			path: [...node.path.slice(0, -1), newName],
			value: edit.value ?? node.value,
			description: edit.description ?? node.description,
		};
	}

	if (node.kind === "group") {
		return {
			...node,
			children: node.children.map((child) => applyEditToNode(child, edit)),
		};
	}

	return node;
}

/**
 * Applies a batch of edits to a client-side `PlainDtcgNode` tree, producing
 * a new tree. Edits are stably sorted by descending `path.length` first,
 * mirroring `token-core`'s `applyTokenEdits` — otherwise an edit targeting a
 * descendant of a group renamed earlier in the batch would be located by a
 * `path` the rename already invalidated in this same optimistic-apply pass.
 */
export function applyEditsToPlainNode(
	root: PlainDtcgNode,
	edits: readonly ClientEdit[],
): PlainDtcgNode {
	const orderedEdits = [...edits].sort((a, b) => b.path.length - a.path.length);
	return orderedEdits.reduce(
		(current, edit) => applyEditToNode(current, edit),
		root,
	);
}
