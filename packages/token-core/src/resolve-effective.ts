import { classifyValue } from "./classify-value.ts";
import {
	resolveByAncestorPrecedence,
	resolveEffectiveType,
} from "./resolve-type.ts";
import type { DtcgNode, GroupNode, TokenDocument } from "./types.ts";

/**
 * Resolves a node's effective `$deprecated`: its own declared value if
 * present, otherwise the nearest ancestor's, otherwise `undefined` — the
 * same ancestor-precedence shape `resolveEffectiveType` already implements
 * for `$type` (shared via `resolveByAncestorPrecedence`), generalized to
 * `deprecated` (not previously implemented anywhere in this codebase; see
 * research.md Task 3).
 */
function resolveEffectiveDeprecated(
	node: DtcgNode,
	ancestors: readonly GroupNode[],
): boolean | string | undefined {
	return resolveByAncestorPrecedence(
		node.deprecated,
		ancestors,
		(ancestor) => ancestor.deprecated,
	);
}

function resolveNode(
	node: DtcgNode,
	ancestors: readonly GroupNode[],
): DtcgNode {
	const effectiveDeprecated = resolveEffectiveDeprecated(node, ancestors);

	if (node.kind === "token") {
		const declaredEffectiveType = resolveEffectiveType(node, ancestors);
		// Inference only applies when this token has no declared type on
		// itself and none inherited from an ancestor either (FR-003:
		// declaration — own or inherited — always wins over inference).
		const inferredType =
			declaredEffectiveType === undefined
				? classifyValue(node.value)
				: undefined;
		return {
			...node,
			effectiveType: declaredEffectiveType ?? inferredType,
			effectiveDeprecated,
			inferredType,
		};
	}

	const childAncestors = [...ancestors, node];
	const children = new Map(
		Array.from(node.children.entries()).map(([key, child]) => [
			key,
			resolveNode(child, childAncestors),
		]),
	);
	return {
		...node,
		effectiveType: resolveEffectiveType(node, ancestors),
		effectiveDeprecated,
		children,
	};
}

/**
 * The single upfront resolution pass (FR-004): walks `document` once,
 * threading each node's ancestor chain internally, and returns a new
 * immutable `TokenDocument` where every node carries its materialized
 * `effectiveType`/`effectiveDeprecated` (and, for tokens, `inferredType`).
 * Called internally by `parseTokenFile` and `applyTokenEdits` as their
 * final step (FR-004a: this always re-runs over the *entire* document, not
 * an incremental recompute) — most callers never need to call this
 * directly; it is exported for tests and for any caller holding a
 * hand-built `TokenDocument` outside the normal parse/edit path.
 */
export function resolveEffectiveDocument(
	document: TokenDocument,
): TokenDocument {
	return { root: resolveNode(document.root, []) as GroupNode };
}
