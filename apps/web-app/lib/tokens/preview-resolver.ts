import { parseReference } from "@dtcg-editor/token-core";
import type { PlainDtcgNode } from "./plain-node.ts";

type PathKey = string;

/** What a token's `$value` currently evaluates to, once references are followed. */
export type ResolvedValue =
	| {
			readonly kind: "value";
			readonly value: unknown;
			readonly via: readonly PathKey[];
	  }
	| { readonly kind: "unresolved"; readonly ref: string }
	| { readonly kind: "cycle"; readonly ref: string };

/**
 * Resolve what the token at `key` currently evaluates to, following the DTCG
 * `{a.b.c}` reference chain over the caller's effective view of the tree.
 * Total and cycle-safe: always returns a `ResolvedValue`, never throws, never
 * loops.
 */
export function resolvePreview(
	key: PathKey,
	getEffectiveNode: (key: PathKey) => PlainDtcgNode | undefined,
	serverPreview: ReadonlyMap<PathKey, ResolvedValue>,
): ResolvedValue {
	return resolveFrom(key, getEffectiveNode, serverPreview, []);
}

function resolveFrom(
	key: PathKey,
	getEffectiveNode: (key: PathKey) => PlainDtcgNode | undefined,
	serverPreview: ReadonlyMap<PathKey, ResolvedValue>,
	via: readonly PathKey[],
): ResolvedValue {
	const node = getEffectiveNode(key);
	const value = node?.kind === "token" ? node.value : undefined;
	const ref = parseReference(value);
	if (ref === undefined) {
		return { kind: "value", value, via };
	}

	const targetKey = ref.targetPath.join(".");
	if (getEffectiveNode(targetKey) === undefined) {
		return { kind: "unresolved", ref: ref.raw };
	}
	return resolveFrom(targetKey, getEffectiveNode, serverPreview, [
		...via,
		targetKey,
	]);
}
