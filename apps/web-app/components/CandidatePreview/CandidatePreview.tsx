import type { ResolutionChain } from "@dtcg-editor/token-core";
import { memo, type ReactNode } from "react";
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
	if (diagnostic === "circular") {
		// Path data reproduced from lucide-react's `refresh-cw-off` icon
		// (ISC-licensed) rather than importing the package, which is only
		// approved for `packages/design-system`, not `apps/web-app`.
		return (
			<svg
				className={styles.icon}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M21 8L18.74 5.74A9.75 9.75 0 0 0 12 3C11 3 10.03 3.16 9.13 3.47" />
				<path d="M8 16H3v5" />
				<path d="M3 12C3 9.51 4 7.26 5.64 5.64" />
				<path d="m3 16 2.26 2.26A9.75 9.75 0 0 0 12 21c2.49 0 4.74-1 6.36-2.64" />
				<path d="M21 12c0 1-.16 1.97-.47 2.87" />
				<path d="M21 3v5h-5" />
				<path d="M22 22 2 2" />
			</svg>
		);
	}
	return (
		<svg
			className={styles.icon}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			aria-hidden="true"
		>
			{diagnostic === "group" ? (
				<path d="M2 4h5l1.5 2H14v6H2z" strokeLinejoin="round" />
			) : (
				<path d="M8 4v5m0 2.5v.5" strokeLinecap="round" />
			)}
		</svg>
	);
}

/**
 * The resolved-value preview for one candidate in the reference picker.
 *
 * What the user cares about is the effect of picking this row, not the
 * candidate's own value for its own sake (FR-009, revised 2026-09-12): when
 * `hypothetical` is supplied — the highlighted row, or a row FR-014 requires
 * cycle-naming for — the preview shows *only* what the token being edited
 * would itself resolve to if this candidate were chosen. Every other row has
 * no `hypothetical` computed (perf budget, SC-004) and falls back to showing
 * the candidate's own resolved value, per mode, the way an equivalent
 * literal of that type is shown elsewhere in the editor (e.g. a colour
 * swatch), or a `ReferenceWarning` for an outcome that does not resolve.
 */
export const CandidatePreview = memo(function CandidatePreview({
	candidate,
	diagnostic = "none",
	hypothetical,
}: {
	readonly candidate: ReferenceCandidate;
	readonly diagnostic?: CandidateDiagnostic;
	/** Set for the highlighted row (or a forced-circular row, FR-014): what
	 * the edited token would resolve to. Replaces the candidate's own
	 * preview entirely rather than appending to it. */
	readonly hypothetical?: HypotheticalResolution | undefined;
}) {
	const entries =
		hypothetical !== undefined
			? hypothetical.perMode.map((entry) => ({
					mode: entry.mode,
					chain: entry.chain,
				}))
			: candidate.preview.map((entry) => ({
					mode: entry.mode,
					chain: entry.outcome as unknown as ResolutionChain,
				}));
	const multiMode = entries.length > 1;
	return (
		<span className={styles.preview} data-multi-mode={multiMode || undefined}>
			{diagnostic !== "none" ? (
				<span className={styles.marker} data-diagnostic={diagnostic}>
					<DiagnosticIcon diagnostic={diagnostic} />
					<span className={styles.markerLabel}>
						{DIAGNOSTIC_LABEL[diagnostic]}
					</span>
				</span>
			) : null}
			{entries.map((entry, index) => (
				<span className={styles.outcome} key={entry.mode ?? index}>
					{multiMode && entry.mode !== undefined ? (
						<span className={styles.modeLabel}>{entry.mode}:</span>
					) : null}
					<OutcomeValue chain={entry.chain} />
				</span>
			))}
		</span>
	);
});
