import {
	type ChainOutcome,
	type ChainStep,
	type DtcgNode,
	type ReferenceLookup,
	type ResolutionChain,
	resolveReference,
} from "@dtcg-editor/token-core";
import { isCircularIfSelected } from "./candidate-selectability.ts";
import type {
	ReferenceCandidate,
	ReferenceCatalogue,
} from "./reference-catalogue-wire.ts";

export interface HypotheticalResolution {
	readonly editedTokenPath: readonly string[];
	readonly candidatePath: readonly string[];
	/** `candidatePath` deep-equals `editedTokenPath` — presented as a circular
	 * reference, not a separate category (spec FR-013). */
	readonly isSelf: boolean;
	/** One entry per mode (a single `undefined`-mode entry for an unmoded set). */
	readonly perMode: readonly {
		readonly mode: string | undefined;
		readonly chain: ResolutionChain;
	}[];
}

function samePath(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((seg, i) => seg === b[i]);
}

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

/**
 * Path → candidate index, built once per `catalogue` and cached by object
 * identity (stable for the session, per `useReferenceCatalogue`). Without
 * this, `lookupForCatalogueMode` below would linear-scan `catalogue.candidates`
 * on every hop of every chain — for a ~2,000-candidate directory, computing
 * the hypothetical for every visible row (up to `MAX_VISIBLE_CANDIDATES`)
 * turned into millions of comparisons per keystroke and blew the SC-004
 * latency budget (measured p95 71.8ms against 50ms). An O(1) map lookup
 * fixes the algorithmic complexity rather than trading away render scope.
 */
const candidateIndexCache = new WeakMap<
	ReferenceCatalogue,
	ReadonlyMap<string, ReferenceCandidate>
>();

function candidateIndexFor(
	catalogue: ReferenceCatalogue,
): ReadonlyMap<string, ReferenceCandidate> {
	let index = candidateIndexCache.get(catalogue);
	if (index === undefined) {
		index = new Map(catalogue.candidates.map((c) => [pathKey(c.path), c]));
		candidateIndexCache.set(catalogue, index);
	}
	return index;
}

/**
 * Builds a `ReferenceLookup` over the catalogue that resolves any path as it
 * would appear under `mode`: the candidate's definition tagged with `mode`,
 * or its last definition when none matches (mirrors `reference-index.ts`'s
 * `lookupForMode`). A path with no candidate resolves to `undefined`.
 */
function lookupForCatalogueMode(
	catalogue: ReferenceCatalogue,
	mode: string | undefined,
): ReferenceLookup {
	const index = candidateIndexFor(catalogue);
	return (path) => {
		const candidate = index.get(pathKey(path));
		if (candidate === undefined) {
			return undefined;
		}
		const def =
			candidate.definitions.find((d) => d.mode === mode) ??
			candidate.definitions.at(-1);
		if (def === undefined) {
			return undefined;
		}
		const node = { kind: "token", value: def.rawValue } as unknown as DtcgNode;
		return {
			node,
			effectiveType: candidate.effectiveType,
			file: def.file,
			mode: def.mode,
		};
	};
}

/**
 * Fast path: when picking `candidate` provably cannot create a cycle back to
 * `editedTokenPath` (the same check `candidate-selectability.ts` uses to
 * disable a row) *and* every catalogue mode exactly matches one of the
 * candidate's own defined modes, the downstream chain from `candidatePath`
 * onward is identical whether reached from `editedTokenPath` or from the
 * candidate's own definition — no `visited`-set behaviour can differ, since
 * `editedTokenPath` never recurs later in the walk. So it is exactly
 * `candidate.preview` for that mode (already computed server-side in
 * `reference-catalogue.ts`, and via the real document graph there — more
 * accurate than this module's flat-array `lookupForCatalogueMode`) with one
 * synthetic hop (`editedTokenPath -> candidatePath`) prepended, not a fresh
 * `resolveReference` walk. This is the common case (a single-mode catalogue,
 * or a candidate that defines every mode) and was the actual bottleneck
 * behind a measured SC-004 regression (p95 71.8ms against a 50ms budget)
 * once the hypothetical started being computed for every visible row rather
 * than only the highlighted one.
 *
 * Returns `undefined` to signal "fall back to the slow path" — either the
 * cycle check failed, or some catalogue mode has no exact match on this
 * candidate (an unmoded candidate under a multi-mode catalogue), where the
 * slow path's per-mode fallback-to-last-definition semantics must apply
 * consistently through the *entire* downstream chain, not just the first hop.
 */
/** Normalizes a wire-decoded step/outcome (optional `mode`/`type` keys) into
 * token-core's shape (`mode`/`type` required keys, value `string | undefined`) —
 * `exactOptionalPropertyTypes` treats the two as distinct even though the
 * runtime values are identical. */
function toChainStep(step: {
	readonly path: readonly string[];
	readonly file: string;
	readonly mode?: string | undefined;
}): ChainStep {
	return { path: step.path, file: step.file, mode: step.mode };
}

function toChainOutcome(outcome: {
	readonly kind: "resolved" | "unresolved" | "group-target" | "circular";
	readonly value?: unknown;
	readonly type?: string | undefined;
	readonly missingPath?: readonly string[] | undefined;
	readonly groupPath?: readonly string[] | undefined;
	readonly cyclePath?: readonly string[] | undefined;
}): ChainOutcome {
	switch (outcome.kind) {
		case "resolved":
			return { kind: "resolved", value: outcome.value, type: outcome.type };
		case "unresolved":
			return {
				kind: "unresolved",
				missingPath: outcome.missingPath ?? [],
			};
		case "group-target":
			return { kind: "group-target", groupPath: outcome.groupPath ?? [] };
		case "circular":
			return { kind: "circular", cyclePath: outcome.cyclePath ?? [] };
	}
}

function resolveIfRepointedFast(
	editedTokenPath: readonly string[],
	candidatePath: readonly string[],
	candidate: ReferenceCandidate,
	modes: readonly (string | undefined)[],
): HypotheticalResolution | undefined {
	if (isCircularIfSelected(editedTokenPath, candidate)) {
		return undefined;
	}
	const perMode: { mode: string | undefined; chain: ResolutionChain }[] = [];
	for (const mode of modes) {
		const index = candidate.definitions.findIndex((d) => d.mode === mode);
		const own = index === -1 ? undefined : candidate.preview[index];
		const def = index === -1 ? undefined : candidate.definitions[index];
		if (own === undefined || def === undefined) {
			return undefined;
		}
		const syntheticStep: ChainStep = { path: editedTokenPath, file: "", mode };
		const ownSteps = own.outcome.steps.map(toChainStep);
		const startsAtCandidate =
			ownSteps[0] !== undefined && samePath(ownSteps[0].path, candidatePath);
		const steps: ChainStep[] = startsAtCandidate
			? [syntheticStep, ...ownSteps]
			: [
					syntheticStep,
					{ path: candidatePath, file: def.file, mode: def.mode },
					...ownSteps,
				];
		perMode.push({
			mode,
			chain: { steps, outcome: toChainOutcome(own.outcome.outcome) },
		});
	}
	return { editedTokenPath, candidatePath, isSelf: false, perMode };
}

/**
 * What the edited token would resolve to, per mode, if it were repointed at
 * `candidatePath` — reuses token-core's `resolveReference` (its `visited` set
 * yields `circular` when the pick closes a loop).
 *
 * Walks starting from `editedTokenPath` itself, not `candidatePath`: the
 * lookup for `editedTokenPath` is overridden to return the *hypothetical*
 * new value (a reference to `candidatePath`), then every further step uses
 * the real catalogue unmodified. This is what lets `resolveReference`'s own
 * `visited` check catch a cycle that only exists *because of* the repoint —
 * a candidate whose real, current chain passes back through
 * `editedTokenPath` (e.g. `wheel -> hub`, repointing `hub` at `wheel`) is
 * not itself circular today; walking from `candidatePath` directly (the
 * earlier approach) would revisit `editedTokenPath` only if the *catalogue*
 * already had a real cycle there, missing this case entirely.
 */
export function resolveIfRepointed(
	editedTokenPath: readonly string[],
	candidatePath: readonly string[],
	catalogue: ReferenceCatalogue,
): HypotheticalResolution {
	const modes: readonly (string | undefined)[] =
		catalogue.modes.length > 0 ? catalogue.modes : [undefined];
	const isSelf = samePath(candidatePath, editedTokenPath);

	if (!isSelf) {
		const candidate = candidateIndexFor(catalogue).get(pathKey(candidatePath));
		if (candidate !== undefined) {
			const fast = resolveIfRepointedFast(
				editedTokenPath,
				candidatePath,
				candidate,
				modes,
			);
			if (fast !== undefined) {
				return fast;
			}
		}
	}

	const reference = {
		targetPath: editedTokenPath,
		at: [],
		raw: `{${editedTokenPath.join(".")}}`,
	};

	const perMode = modes.map((mode) => {
		const baseLookup = lookupForCatalogueMode(catalogue, mode);
		const lookup: ReferenceLookup = (path) => {
			if (samePath(path, editedTokenPath)) {
				const node = {
					kind: "token",
					value: `{${candidatePath.join(".")}}`,
				} as unknown as DtcgNode;
				return { node, effectiveType: undefined, file: "", mode };
			}
			return baseLookup(path);
		};
		return { mode, chain: resolveReference(reference, lookup) };
	});

	return {
		editedTokenPath,
		candidatePath,
		isSelf,
		perMode,
	};
}
