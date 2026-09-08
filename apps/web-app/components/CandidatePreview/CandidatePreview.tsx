import type { ResolutionChain } from "@dtcg-editor/token-core";
import { formatLiteralValue } from "../../lib/tokens/format-literal-value.tsx";
import type { ReferenceCandidate } from "../../lib/tokens/reference-catalogue-wire.ts";
import { ReferenceWarning } from "../ReferenceWarning/ReferenceWarning.tsx";
import styles from "./CandidatePreview.module.css";

/**
 * The resolved-value preview for one candidate in the reference picker:
 * per mode, the concrete value it resolves to (shown the way an equivalent
 * literal of that type is shown elsewhere — e.g. a colour swatch) or a
 * `ReferenceWarning` for an outcome that does not resolve.
 */
export function CandidatePreview({
	candidate,
}: {
	readonly candidate: ReferenceCandidate;
}) {
	const multiMode = candidate.preview.length > 1;
	return (
		<span className={styles.preview}>
			{candidate.preview.map((entry, index) => {
				const outcome = entry.outcome.outcome;
				return (
					<span className={styles.outcome} key={entry.mode ?? index}>
						{multiMode && entry.mode !== undefined ? (
							<span className={styles.modeLabel}>{entry.mode}:</span>
						) : null}
						{outcome.kind === "resolved" ? (
							formatLiteralValue(outcome.value, outcome.type)
						) : (
							// The wire chain is structurally token-core's `ResolutionChain`
							// (built by `previewOutcome`, which always populates `mode`).
							<ReferenceWarning
								chain={entry.outcome as unknown as ResolutionChain}
							/>
						)}
					</span>
				);
			})}
		</span>
	);
}
