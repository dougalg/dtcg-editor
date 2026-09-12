import {
	type DtcgNode,
	type ReferenceLookup,
	type ResolutionChain,
	resolveReference,
} from "@dtcg-editor/token-core";
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
	return (path) => {
		const candidate = catalogue.candidates.find((c) => samePath(c.path, path));
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
		isSelf: samePath(candidatePath, editedTokenPath),
		perMode,
	};
}

/** Structurally covers both `ChainOutcome` (token-core) and its wire-decoded
 * equivalent (`reference-catalogue-wire.ts`), which differ only in whether
 * `resolved.type` is a required or optional key. */
type OutcomeLike =
	| {
			readonly kind: "resolved";
			readonly value: unknown;
			readonly type?: string | undefined;
	  }
	| { readonly kind: "unresolved"; readonly missingPath: readonly string[] }
	| { readonly kind: "group-target"; readonly groupPath: readonly string[] }
	| { readonly kind: "circular"; readonly cyclePath: readonly string[] };

/** A signature capturing everything about an outcome that would be visible
 * in the rendered preview (`CandidatePreview`'s `OutcomeValue`) — used only
 * to compare two outcomes for display purposes, not for correctness. */
function outcomeSignature(outcome: OutcomeLike): string {
	switch (outcome.kind) {
		case "resolved":
			return `resolved|${JSON.stringify(outcome.value)}|${outcome.type ?? ""}`;
		case "unresolved":
			return `unresolved|${outcome.missingPath.join(".")}`;
		case "group-target":
			return `group-target|${outcome.groupPath.join(".")}`;
		case "circular":
			return `circular|${outcome.cyclePath.join(".")}`;
	}
}

/**
 * FR-012 (revised 2026-09-12): the hypothetical "would resolve to" preview
 * repeats the candidate's own preview whenever the edited token is reached
 * from the candidate in a single hop with no per-candidate ambiguity — the
 * two are the same value by construction, and showing both reads as a
 * pointless duplicate. This compares them mode-for-mode (same count of
 * modes, same outcome per matching mode) so the hypothetical is shown only
 * when it adds information: a cycle the repoint itself creates, a mode-count
 * mismatch, or any other divergence in the resolved outcome.
 */
export function hypotheticalDiffersFromPreview(
	candidate: ReferenceCandidate,
	hypothetical: HypotheticalResolution,
): boolean {
	if (hypothetical.perMode.length !== candidate.preview.length) {
		return true;
	}
	const previewByMode = new Map(
		candidate.preview.map((entry) => [
			entry.mode,
			outcomeSignature(entry.outcome.outcome),
		]),
	);
	return hypothetical.perMode.some((entry) => {
		const signature = previewByMode.get(entry.mode);
		return (
			signature === undefined ||
			signature !== outcomeSignature(entry.chain.outcome)
		);
	});
}
