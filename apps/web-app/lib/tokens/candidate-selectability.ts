import type { ReferenceCandidate } from "./reference-catalogue-wire.ts";

function samePath(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((seg, i) => seg === b[i]);
}

/**
 * Whether repointing the edited token at `candidate` would make it part of a
 * reference cycle — the one diagnostic that makes a candidate unselectable in
 * the picker (spec FR-013, FR-014, FR-024).
 *
 * True when the candidate *is* the edited token's own path (the smallest,
 * one-hop cycle — a self-reference is not a separate category), or when the
 * edited token's path already appears somewhere in the candidate's own
 * resolution chain (any mode), so pointing at it closes the loop back here.
 *
 * A candidate that is merely broken — resolving to a missing path, a group,
 * or a pre-existing cycle that does not run through the edited token — is
 * NOT circular in this sense; it stays selectable and is only flagged.
 */
export function isCircularIfSelected(
	editedTokenPath: readonly string[],
	candidate: ReferenceCandidate,
): boolean {
	if (samePath(candidate.path, editedTokenPath)) {
		return true;
	}
	return candidate.preview.some((entry) =>
		entry.outcome.steps.some((step) => samePath(step.path, editedTokenPath)),
	);
}
