import {
	type DtcgNode,
	type ReferenceLookup,
	type ResolutionChain,
	resolveReference,
} from "@dtcg-editor/token-core";
import type { ReferenceCatalogue } from "./reference-catalogue-wire.ts";

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
