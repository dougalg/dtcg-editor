import type { DtcgNode, GroupNode } from "@dtcg-editor/token-core";
import { resolveEffectiveType } from "@dtcg-editor/token-core";
import type {
	ReferencingToken,
	ResolvedReference,
	TokenReferenceView,
} from "./reference-index.ts";

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

/**
 * JSON/React-prop-friendly mirror of `DtcgNode` — `token-core`'s tree uses
 * `Map` for a group's children, which neither `JSON.stringify` nor the
 * React Server/Client Component boundary can serialize directly. Also
 * precomputes each node's effective `$type` (own or inherited), since the
 * ancestor chain needed for that is only naturally available during this
 * same tree walk. A token node additionally carries its resolved
 * references and referrer list — both genuinely *optional* (omitted, not
 * present-as-`undefined`) when it has none, unlike this type's other
 * fields, so that every existing hand-built `PlainDtcgNode` test fixture
 * across the codebase (which predates this feature) stays valid without
 * needing to learn about a concept it isn't testing.
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
			readonly references?: readonly ResolvedReference[];
			readonly referencedBy?: readonly ReferencingToken[];
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
	referenceView?: TokenReferenceView,
): PlainDtcgNode {
	const effectiveType = resolveEffectiveType(node, ancestors);

	if (node.kind === "token") {
		const key = pathKey(node.path);
		const references = referenceView?.references.get(key);
		const referencedBy = referenceView?.referencedBy.get(key);
		return {
			kind: "token",
			name: node.name,
			path: node.path,
			value: node.value,
			declaredType: node.declaredType,
			effectiveType,
			description: node.description,
			deprecated: node.deprecated,
			// Spread rather than assigned directly: `exactOptionalPropertyTypes`
			// treats an explicit `references: undefined` as different from the
			// key being absent, and `references`/`referencedBy` are typed to
			// require true absence when there's nothing to show.
			...(references !== undefined ? { references } : {}),
			...(referencedBy !== undefined ? { referencedBy } : {}),
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
			toPlainNode(child, childAncestors, referenceView),
		),
	};
}
