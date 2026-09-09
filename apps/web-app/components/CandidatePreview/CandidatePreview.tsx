import type { ResolutionChain } from "@dtcg-editor/token-core";
import type { ReactNode } from "react";
import { formatLiteralValue } from "../../lib/tokens/format-literal-value.tsx";
import type { HypotheticalResolution } from "../../lib/tokens/hypothetical-resolution.ts";
import type { ReferenceCandidate } from "../../lib/tokens/reference-catalogue-wire.ts";
import { ReferenceWarning } from "../ReferenceWarning/ReferenceWarning.tsx";
import styles from "./CandidatePreview.module.css";

/** One resolution outcome shown as a literal preview, or a warning if it doesn't resolve. */
function OutcomeValue({
	chain,
}: {
	readonly chain: ResolutionChain;
}): ReactNode {
	if (chain.outcome.kind === "resolved") {
		return formatLiteralValue(chain.outcome.value, chain.outcome.type);
	}
	return <ReferenceWarning chain={chain} />;
}

/** The worst thing wrong with pointing at this candidate — drives the row marker. */
export type CandidateDiagnostic = "none" | "missing" | "group" | "circular";

const DIAGNOSTIC_LABEL: Record<Exclude<CandidateDiagnostic, "none">, string> = {
	missing: "missing target",
	group: "group target",
	circular: "circular-reference",
};

/** Inline SVG (no `lucide-react` in `apps/web-app`, per Principle VIII). */
function DiagnosticIcon({
	diagnostic,
}: {
	readonly diagnostic: Exclude<CandidateDiagnostic, "none">;
}) {
	return (
		<svg
			className={styles.icon}
			viewBox="0 0 16 16"
			width="14"
			height="14"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			aria-hidden="true"
		>
			{diagnostic === "circular" ? (
				<path d="M4 8a4 4 0 1 1 1.2 2.8M4 8V5m0 3H1" strokeLinecap="round" />
			) : diagnostic === "group" ? (
				<path d="M2 4h5l1.5 2H14v6H2z" strokeLinejoin="round" />
			) : (
				<path d="M8 4v5m0 2.5v.5" strokeLinecap="round" />
			)}
		</svg>
	);
}

/**
 * The resolved-value preview for one candidate in the reference picker:
 * per mode, the concrete value it resolves to (shown the way an equivalent
 * literal of that type is shown elsewhere — e.g. a colour swatch) or a
 * `ReferenceWarning` for an outcome that does not resolve.
 */
export function CandidatePreview({
	candidate,
	diagnostic = "none",
	hypothetical,
}: {
	readonly candidate: ReferenceCandidate;
	readonly diagnostic?: CandidateDiagnostic;
	/** Set for the highlighted row: what the edited token would resolve to. */
	readonly hypothetical?: HypotheticalResolution;
}) {
	const multiMode = candidate.preview.length > 1;
	const hypoMultiMode =
		hypothetical !== undefined && hypothetical.perMode.length > 1;
	return (
		<span className={styles.preview}>
			{diagnostic !== "none" ? (
				<span className={styles.marker} data-diagnostic={diagnostic}>
					<DiagnosticIcon diagnostic={diagnostic} />
					<span className={styles.markerLabel}>
						{DIAGNOSTIC_LABEL[diagnostic]}
					</span>
				</span>
			) : null}
			{candidate.preview.map((entry, index) => (
				<span className={styles.outcome} key={entry.mode ?? index}>
					{multiMode && entry.mode !== undefined ? (
						<span className={styles.modeLabel}>{entry.mode}:</span>
					) : null}
					<OutcomeValue chain={entry.outcome as unknown as ResolutionChain} />
				</span>
			))}
			{hypothetical !== undefined ? (
				<span className={styles.hypothetical}>
					<span className={styles.hypotheticalCaption}>
						This token would resolve to:
					</span>
					{hypothetical.perMode.map((entry, index) => (
						<span className={styles.outcome} key={entry.mode ?? index}>
							{hypoMultiMode && entry.mode !== undefined ? (
								<span className={styles.modeLabel}>{entry.mode}:</span>
							) : null}
							<OutcomeValue chain={entry.chain} />
						</span>
					))}
				</span>
			) : null}
		</span>
	);
}
