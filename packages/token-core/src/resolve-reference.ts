import { parseReference, type TokenReference } from "./reference.ts";
import type { DtcgNode } from "./types.ts";

/** How a resolution chain ended. */
export type ChainOutcome =
	| {
			readonly kind: "resolved";
			readonly value: unknown;
			readonly type: string | undefined;
	  }
	| { readonly kind: "unresolved"; readonly missingPath: readonly string[] }
	| { readonly kind: "group-target"; readonly groupPath: readonly string[] }
	| { readonly kind: "circular"; readonly cyclePath: readonly string[] };

/** One token traversed while following a reference chain. */
export interface ChainStep {
	readonly path: readonly string[];
	readonly file: string;
	readonly mode: string | undefined;
}

/** The complete ordered chain walked from a reference to its end. */
export interface ResolutionChain {
	readonly steps: readonly ChainStep[];
	readonly outcome: ChainOutcome;
}

/** What a `ReferenceLookup` returns for one path. `file`/`mode` are opaque
 * to this module — they're only carried through into the chain. */
export interface LookupHit {
	readonly node: DtcgNode;
	readonly effectiveType: string | undefined;
	readonly file: string;
	readonly mode: string | undefined;
}

export type ReferenceLookup = (
	path: readonly string[],
) => LookupHit | undefined;

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

/**
 * Follows `reference` through every further reference in the chain until it
 * reaches a token with a non-reference value, per the DTCG format spec's
 * requirement that tools "follow each reference until they find a token
 * with an explicit value". There is **no depth limit** — a `visited` set of
 * every path traversed is what bounds recursion: revisiting a path yields
 * `circular` instead of looping. Every step traversed is retained, not
 * only the final one, so the full path is available for display and for
 * future visualization of reference relationships (DTCG spec FR-003).
 *
 * Pure and total: cross-file lookup, modes, and directory structure are
 * entirely the injected `lookup`'s concern, keeping this function reusable
 * by any headless consumer.
 */
export function resolveReference(
	reference: TokenReference,
	lookup: ReferenceLookup,
): ResolutionChain {
	const steps: ChainStep[] = [];
	const visited = new Set<string>();
	let currentPath = reference.targetPath;

	for (;;) {
		const key = pathKey(currentPath);
		if (visited.has(key)) {
			return {
				steps,
				outcome: { kind: "circular", cyclePath: [...currentPath] },
			};
		}
		visited.add(key);

		const hit = lookup(currentPath);
		if (hit === undefined) {
			return {
				steps,
				outcome: { kind: "unresolved", missingPath: [...currentPath] },
			};
		}
		if (hit.node.kind === "group") {
			return {
				steps,
				outcome: { kind: "group-target", groupPath: [...currentPath] },
			};
		}

		steps.push({ path: currentPath, file: hit.file, mode: hit.mode });

		const nextReference = parseReference(hit.node.value);
		if (nextReference === undefined) {
			return {
				steps,
				outcome: {
					kind: "resolved",
					value: hit.node.value,
					type: hit.effectiveType,
				},
			};
		}
		currentPath = nextReference.targetPath;
	}
}
