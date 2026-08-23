import { ColorValueSchema } from "@dtcg-editor/token-core";
import { colorValueToCssColor } from "@dtcg-editor/token-editor-color";
import type { CSSProperties, ReactNode } from "react";
import type {
	ResolvedOutcome,
	ResolvedReference,
} from "../../lib/tokens/reference-index.ts";
import { ReferenceWarning } from "../ReferenceWarning/ReferenceWarning.tsx";
import styles from "./TokenReferenceValue.module.css";

function formatRaw(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

function swatchStyle(color: string): CSSProperties {
	return { "--swatch-color": color } as CSSProperties;
}

/**
 * Presents a resolved literal value the same way an equivalent literal
 * value of that type is presented elsewhere in the app (spec FR-010) — a
 * color gets the same swatch treatment as `ColorEditor`'s own read path,
 * computed via the same `colorValueToCssColor` utility so a referenced
 * color is exactly as recognizable as a directly-specified one. Every
 * other type falls back to its raw text form, matching how an unrecognized
 * or contract-less type is already shown elsewhere in this tree (e.g.
 * `TreeTokenNode`'s own `formatValue`).
 */
function formatLiteralValue(
	value: unknown,
	type: string | undefined,
): ReactNode {
	if (type === "color") {
		const parsed = ColorValueSchema.safeParse(value);
		if (parsed.success) {
			const cssColor = colorValueToCssColor(parsed.data);
			return (
				<>
					<span className={styles.swatch} style={swatchStyle(cssColor)} />
					<span className={styles.text}>{formatRaw(value)}</span>
				</>
			);
		}
	}
	return <span className={styles.text}>{formatRaw(value)}</span>;
}

function OutcomeDisplay({ outcome }: { readonly outcome: ResolvedOutcome }) {
	const modeLabel =
		outcome.mode !== undefined ? (
			<span className={styles.modeLabel}>{outcome.mode}:</span>
		) : null;

	if (outcome.chain.outcome.kind === "resolved") {
		return (
			<span className={styles.outcome}>
				{modeLabel}
				{formatLiteralValue(
					outcome.chain.outcome.value,
					outcome.chain.outcome.type,
				)}
			</span>
		);
	}

	return (
		<span className={styles.outcome}>
			{modeLabel}
			<ReferenceWarning chain={outcome.chain} />
		</span>
	);
}

/**
 * Renders a reference exactly as the file says it, plus what it resolves
 * to — one `OutcomeDisplay` per mode when the target is multiply defined
 * (spec FR-005), otherwise exactly one. A failing outcome delegates to
 * `ReferenceWarning` rather than duplicating its distinct-per-case wording
 * here.
 */
export function TokenReferenceValue({
	resolved,
}: {
	readonly resolved: ResolvedReference;
}) {
	return (
		<span className={styles.reference}>
			<span className={styles.raw}>{resolved.reference.raw}</span>
			{resolved.outcomes.map((outcome, index) => (
				<OutcomeDisplay key={outcome.mode ?? index} outcome={outcome} />
			))}
		</span>
	);
}
