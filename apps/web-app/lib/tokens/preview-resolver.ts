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
	return resolveFrom(key, getEffectiveNode, serverPreview, [], new Set([key]));
}

/** Collect every token's whole-value reference edge `key -> targetKey`, plus the set of in-file keys. */
function collectRefEdges(
	node: PlainDtcgNode,
	into: {
		edges: Map<PathKey, PathKey>;
		keys: Set<PathKey>;
	},
): void {
	into.keys.add(node.path.join("."));
	if (node.kind === "group") {
		for (const child of node.children) {
			collectRefEdges(child, into);
		}
		return;
	}
	const ref = parseReference(node.value);
	if (ref !== undefined) {
		into.edges.set(node.path.join("."), ref.targetPath.join("."));
	}
}

/**
 * Map each in-file token key to the set of in-file tokens that reference it,
 * directly or through a chain. Cross-file referrers (a chain hop that leaves
 * the file) are omitted — you cannot stage an edit to them from this view.
 */
export function buildReverseDeps(
	tree: PlainDtcgNode,
	_serverPreview: ReadonlyMap<PathKey, ResolvedValue>,
): Map<PathKey, Set<PathKey>> {
	const collected = {
		edges: new Map<PathKey, PathKey>(),
		keys: new Set<PathKey>(),
	};
	collectRefEdges(tree, collected);

	const reverse = new Map<PathKey, Set<PathKey>>();
	for (const [referrer, firstTarget] of collected.edges) {
		let target: PathKey | undefined = firstTarget;
		const seen = new Set<PathKey>();
		while (
			target !== undefined &&
			collected.keys.has(target) &&
			!seen.has(target)
		) {
			seen.add(target);
			let set = reverse.get(target);
			if (set === undefined) {
				set = new Set();
				reverse.set(target, set);
			}
			set.add(referrer);
			target = collected.edges.get(target);
		}
	}
	return reverse;
}

function resolveFrom(
	key: PathKey,
	getEffectiveNode: (key: PathKey) => PlainDtcgNode | undefined,
	serverPreview: ReadonlyMap<PathKey, ResolvedValue>,
	via: readonly PathKey[],
	visited: Set<PathKey>,
): ResolvedValue {
	const node = getEffectiveNode(key);
	const value = node?.kind === "token" ? node.value : undefined;
	const ref = parseReference(value);
	if (ref === undefined) {
		return { kind: "value", value, via };
	}

	const targetKey = ref.targetPath.join(".");
	if (visited.has(targetKey)) {
		return { kind: "cycle", ref: ref.raw };
	}
	if (getEffectiveNode(targetKey) === undefined) {
		// A hop out of this file resolves from the server-computed value; an
		// in-file target that simply does not exist is unresolved.
		return serverPreview.get(targetKey) ?? { kind: "unresolved", ref: ref.raw };
	}
	visited.add(targetKey);
	return resolveFrom(
		targetKey,
		getEffectiveNode,
		serverPreview,
		[...via, targetKey],
		visited,
	);
}
