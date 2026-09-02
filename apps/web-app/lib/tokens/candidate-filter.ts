import type { ReferenceCandidate } from "./reference-catalogue-wire.ts";

/** The token being repointed — the context an empty-query ordering leans on. */
export interface EditedTokenContext {
	readonly path: readonly string[];
	readonly effectiveType: string | undefined;
	/** Relative path of the file the edited token is defined in. */
	readonly file: string;
}

/**
 * Narrows and orders the candidate list for the reference picker. The picker
 * (via `Combobox`) does no filtering of its own — this is the whole of it.
 *
 * - A non-empty query keeps candidates whose full dotted `displayPath`
 *   contains it (case-insensitive substring), ordered by where the match
 *   starts, then alphabetically.
 * - An empty / whitespace query returns every candidate in three bands:
 *   same effective type as the edited token, then same file, then the rest —
 *   alphabetical within each band.
 *
 * The edited token's own path is never removed (it is flagged, not hidden).
 */
function emptyQueryBand(
	candidate: ReferenceCandidate,
	edited: EditedTokenContext,
): 0 | 1 | 2 {
	if (
		edited.effectiveType !== undefined &&
		candidate.effectiveType === edited.effectiveType
	) {
		return 0;
	}
	if (candidate.definitions.some((d) => d.file === edited.file)) {
		return 1;
	}
	return 2;
}

export function filterCandidates(
	candidates: readonly ReferenceCandidate[],
	query: string,
	edited: EditedTokenContext,
): readonly ReferenceCandidate[] {
	const q = query.trim().toLowerCase();
	if (q === "") {
		return [...candidates].sort((a, b) => {
			const bandDelta = emptyQueryBand(a, edited) - emptyQueryBand(b, edited);
			return bandDelta !== 0
				? bandDelta
				: a.displayPath.localeCompare(b.displayPath);
		});
	}
	return candidates
		.filter((c) => c.displayPath.toLowerCase().includes(q))
		.sort((a, b) => {
			const posDelta =
				a.displayPath.toLowerCase().indexOf(q) -
				b.displayPath.toLowerCase().indexOf(q);
			return posDelta !== 0
				? posDelta
				: a.displayPath.localeCompare(b.displayPath);
		});
}
