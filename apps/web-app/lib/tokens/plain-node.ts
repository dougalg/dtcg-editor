import type { DtcgNode } from "@dtcg-editor/token-core";
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
 * React Server/Client Component boundary can serialize directly. Carries
 * `effectiveType`/`deprecated` straight from `token-core`'s materialized
 * fields (`resolveEffectiveDocument`'s single upfront pass) rather than
 * re-deriving them via an ancestor walk. A token node additionally carries
 * its resolved references and referrer list — both genuinely *optional*
 * (omitted, not present-as-`undefined`) when it has none, unlike this
 * type's other fields, so that every existing hand-built `PlainDtcgNode`
 * test fixture across the codebase (which predates this feature) stays
 * valid without needing to learn about a concept it isn't testing.
 */
export type PlainDtcgNode =
	| {
			readonly kind: "token";
			readonly name: string;
			readonly path: readonly string[];
			readonly value: unknown;
			readonly declaredType: string | undefined;
			readonly effectiveType: string | undefined;
			/** Present only when no `$type` is declared anywhere in this token's chain and its value shape unambiguously suggests one — the editor's type-field pre-fill suggestion (FR-003b). `undefined` whenever `effectiveType` came from a declaration instead (nothing to suggest). */
			readonly inferredType: string | undefined;
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
	referenceView?: TokenReferenceView,
): PlainDtcgNode {
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
			effectiveType: node.effectiveType,
			inferredType: node.inferredType,
			description: node.description,
			deprecated: node.effectiveDeprecated,
			// Spread rather than assigned directly: `exactOptionalPropertyTypes`
			// treats an explicit `references: undefined` as different from the
			// key being absent, and `references`/`referencedBy` are typed to
			// require true absence when there's nothing to show.
			...(references !== undefined ? { references } : {}),
			...(referencedBy !== undefined ? { referencedBy } : {}),
		};
	}

	return {
		kind: "group",
		name: node.name,
		path: node.path,
		declaredType: node.declaredType,
		effectiveType: node.effectiveType,
		description: node.description,
		deprecated: node.effectiveDeprecated,
		children: Array.from(node.children.values()).map((child) =>
			toPlainNode(child, referenceView),
		),
	};
}
