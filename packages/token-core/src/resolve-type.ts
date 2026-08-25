import type { DtcgNode, GroupNode } from "./types.ts";

/**
 * The shared ancestor-precedence shape behind both `resolveEffectiveType`
 * (over `declaredType`) and `resolve-effective.ts`'s deprecation resolution
 * (over `deprecated`): a node's own value if present, otherwise the nearest
 * ancestor's, otherwise `undefined`. `ancestors` must be ordered root-first,
 * ending with the node's immediate parent. Not exported from `index.ts` —
 * an internal building block, not part of this package's public API.
 */
export function resolveByAncestorPrecedence<T>(
	ownValue: T | undefined,
	ancestors: readonly GroupNode[],
	selectAncestorValue: (ancestor: GroupNode) => T | undefined,
): T | undefined {
	if (ownValue !== undefined) {
		return ownValue;
	}
	for (let i = ancestors.length - 1; i >= 0; i--) {
		const ancestor = ancestors[i];
		if (ancestor === undefined) {
			continue;
		}
		const ancestorValue = selectAncestorValue(ancestor);
		if (ancestorValue !== undefined) {
			return ancestorValue;
		}
	}
	return undefined;
}

/**
 * Resolves a node's effective `$type`: its own declared type if present,
 * otherwise the nearest ancestor group's declared type, otherwise
 * `undefined`. `ancestors` must be ordered root-first, ending with the
 * node's immediate parent.
 *
 * An internal primitive — `resolve-effective.ts`'s single upfront
 * `resolveEffectiveDocument` pass is what materializes every node's
 * `effectiveType`/`effectiveDeprecated` once (FR-004), calling this
 * function as its own ancestor-walk building block. External code holding
 * a `DtcgNode` should read `node.effectiveType` directly rather than
 * calling this itself. Not re-exported from `index.ts` (unlike `findNode`,
 * which shares this module and does have real external callers, for path
 * lookup — a concern independent of effective-type resolution): once every
 * in-repo call site was migrated to read the materialized field, nothing
 * outside this package needed this function anymore.
 */
export function resolveEffectiveType(
	node: DtcgNode,
	ancestors: readonly GroupNode[],
): string | undefined {
	return resolveByAncestorPrecedence(
		node.declaredType,
		ancestors,
		(ancestor) => ancestor.declaredType,
	);
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
