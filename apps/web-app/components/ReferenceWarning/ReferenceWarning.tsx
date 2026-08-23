import type { ChainOutcome, ResolutionChain } from "@dtcg-editor/token-core";
import styles from "./ReferenceWarning.module.css";

function pathText(path: readonly string[]): string {
	return path.join(".");
}

/**
 * The message for each of the three failure outcomes, distinct in wording
 * (not merely in styling) — spec FR-011a requires the three be
 * distinguishable, and FR-011b requires each to name its own offending
 * path from its outcome's own payload. `resolved` never reaches this
 * component in practice (callers only render `ReferenceWarning` for a
 * non-resolved outcome), but is handled for totality.
 */
function describe(
	outcome: ChainOutcome,
	steps: ResolutionChain["steps"],
): { readonly label: string; readonly path: string } | undefined {
	switch (outcome.kind) {
		case "resolved":
			return undefined;
		case "unresolved":
			return {
				label: "Missing target",
				path: `no token exists at "${pathText(outcome.missingPath)}"`,
			};
		case "group-target":
			return {
				label: "Invalid target",
				path: `"${pathText(outcome.groupPath)}" is a group, not a token — references may only target complete tokens`,
			};
		case "circular": {
			// `outcome.cyclePath` is the one path revisited; the full cycle is
			// every step already traversed, followed by that repeat.
			const cycle = [...steps.map((step) => step.path), outcome.cyclePath]
				.map(pathText)
				.join(" → ");
			return { label: "Circular reference", path: cycle };
		}
	}
}

/**
 * One of the three distinct, user-facing warnings a reference that doesn't
 * resolve can show (spec FR-011/FR-011a/FR-011b) — never activatable
 * (FR-016), and deliberately offers no in-app repair (spec Assumptions).
 * Distinguished from the other two by wording, not color alone — the
 * error color below is a visual reinforcement, not the sole signal, since
 * the three cases would still read as distinct with the color stripped
 * entirely.
 */
export function ReferenceWarning({
	chain,
}: {
	readonly chain: ResolutionChain;
}) {
	const description = describe(chain.outcome, chain.steps);
	if (description === undefined) {
		return null;
	}
	return (
		<span role="alert" className={styles.warning}>
			<span className={styles.label}>{description.label}:</span>
			<span className={styles.path}>{description.path}</span>
		</span>
	);
}
