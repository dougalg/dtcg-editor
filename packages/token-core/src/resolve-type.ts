import type { DtcgNode, GroupNode } from "./types.ts";

/**
 * Resolves a node's effective `$type`: its own declared type if present,
 * otherwise the nearest ancestor group's declared type, otherwise
 * `undefined`. `ancestors` must be ordered root-first, ending with the
 * node's immediate parent.
 */
export function resolveEffectiveType(
	node: DtcgNode,
	ancestors: readonly GroupNode[],
): string | undefined {
	if (node.declaredType !== undefined) {
		return node.declaredType;
	}
	for (let i = ancestors.length - 1; i >= 0; i--) {
		const ancestor = ancestors[i];
		if (ancestor !== undefined && ancestor.declaredType !== undefined) {
			return ancestor.declaredType;
		}
	}
	return undefined;
}

/**
 * Locates the node at `path` within `root`, along with its ancestor chain
 * (root-first, ending with the node's immediate parent — the same ordering
 * `resolveEffectiveType` expects). Returns `undefined` if `path` doesn't
 * resolve to a node (an intermediate segment is missing, or is itself a
 * token rather than a group).
 */
export function findNode(
	root: GroupNode,
	path: readonly string[],
): { node: DtcgNode; ancestors: readonly GroupNode[] } | undefined {
	let current: DtcgNode = root;
	const ancestors: GroupNode[] = [];

	for (const segment of path) {
		if (current.kind !== "group") {
			return undefined;
		}
		ancestors.push(current);
		const next = current.children.get(segment);
		if (next === undefined) {
			return undefined;
		}
		current = next;
	}

	return { node: current, ancestors };
}
