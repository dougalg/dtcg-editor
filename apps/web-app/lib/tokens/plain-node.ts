import type { DtcgNode, GroupNode } from "@dtcg-editor/token-core";
import { resolveEffectiveType } from "@dtcg-editor/token-core";

/**
 * JSON/React-prop-friendly mirror of `DtcgNode` — `token-core`'s tree uses
 * `Map` for a group's children, which neither `JSON.stringify` nor the
 * React Server/Client Component boundary can serialize directly. Also
 * precomputes each node's effective `$type` (own or inherited), since the
 * ancestor chain needed for that is only naturally available during this
 * same tree walk.
 */
export type PlainDtcgNode =
	| {
			readonly kind: "token";
			readonly name: string;
			readonly path: readonly string[];
			readonly value: unknown;
			readonly declaredType: string | undefined;
			readonly effectiveType: string | undefined;
			readonly description: string | undefined;
			readonly deprecated: boolean | string | undefined;
	  }
	| {
			readonly kind: "group";
			readonly name: string;
			readonly path: readonly string[];
			readonly declaredType: string | undefined;
			readonly effectiveType: string | undefined;
			readonly description: string | undefined;
			readonly deprecated: boolean | string | undefined;
			readonly children: readonly PlainDtcgNode[];
	  };

export function toPlainNode(
	node: DtcgNode,
	ancestors: readonly GroupNode[] = [],
): PlainDtcgNode {
	const effectiveType = resolveEffectiveType(node, ancestors);

	if (node.kind === "token") {
		return {
			kind: "token",
			name: node.name,
			path: node.path,
			value: node.value,
			declaredType: node.declaredType,
			effectiveType,
			description: node.description,
			deprecated: node.deprecated,
		};
	}

	const childAncestors = [...ancestors, node];
	return {
		kind: "group",
		name: node.name,
		path: node.path,
		declaredType: node.declaredType,
		effectiveType,
		description: node.description,
		deprecated: node.deprecated,
		children: Array.from(node.children.values()).map((child) =>
			toPlainNode(child, childAncestors),
		),
	};
}
