import type { CandidateDiagnostic } from "../../components/CandidatePreview/CandidatePreview.tsx";
import { isCircularIfSelected } from "./candidate-selectability.ts";
import type { ReferenceCandidate } from "./reference-catalogue-wire.ts";

/**
 * The worst thing wrong with pointing the edited token at this candidate —
 * drives the row's marker in the picker list (FR-015, FR-016, FR-024).
 * Circular takes precedence: it is the one diagnostic that makes a candidate
 * unselectable, so it must win over a merely-informational missing/group
 * flag. Among the per-mode preview outcomes, the first non-resolved kind
 * found determines the label (a candidate is either missing or a group
 * target for the picker's purposes, never both at once in practice).
 */
export function diagnosticFor(
	editedTokenPath: readonly string[],
	candidate: ReferenceCandidate,
): CandidateDiagnostic {
	if (isCircularIfSelected(editedTokenPath, candidate)) {
		return "circular";
	}
	for (const entry of candidate.preview) {
		if (entry.outcome.outcome.kind === "unresolved") {
			return "missing";
		}
		if (entry.outcome.outcome.kind === "group-target") {
			return "group";
		}
	}
	return "none";
}
