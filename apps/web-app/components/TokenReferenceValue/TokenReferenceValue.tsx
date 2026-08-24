import Link from "next/link";
import type { ReactNode } from "react";
import { resolveBuiltInContract } from "../../lib/token-editors/built-in.ts";
import type {
	ResolvedOutcome,
	ResolvedReference,
} from "../../lib/tokens/reference-index.ts";
import { tokenHref } from "../../lib/tokens/token-fragment.ts";
import { ReferenceWarning } from "../ReferenceWarning/ReferenceWarning.tsx";
import styles from "./TokenReferenceValue.module.css";

function formatRaw(value: unknown): string {
	return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Presents a resolved literal value the same way an equivalent literal
 * value of that type is presented elsewhere in the app (spec FR-010),
 * delegating to that type's own built-in contract (e.g. color's swatch) —
 * this component holds no knowledge of any specific DTCG `$type` itself.
 * Falls back to the value's raw text form for a type with no built-in
 * contract, no `Preview`, or whose `Preview` declines to render (e.g. the
 * value doesn't actually parse as that type), matching how an
 * unrecognized or contract-less type is already shown elsewhere in this
 * tree (e.g. `TreeTokenNode`'s own `formatValue`).
 */
function formatLiteralValue(
	value: unknown,
	type: string | undefined,
): ReactNode {
	const preview =
		type !== undefined
			? resolveBuiltInContract(type)?.Preview?.({ value })
			: undefined;
	return preview ?? <span className={styles.text}>{formatRaw(value)}</span>;
}

/** Purely decorative — the row itself (see `OutcomeRow`) carries the link semantics/label, not this icon. */
function LinkGlyph() {
	return (
		<svg
			className={styles.linkIcon}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</svg>
	);
}

function pathText(path: readonly string[]): string {
	return path.join(".");
}

/**
 * One row of the reference-preview list: this outcome's own navigation
 * icon, its mode label (when the target is multiply defined), and either
 * the resolved literal's preview or — for a non-resolved outcome —
 * `ReferenceWarning`'s explanation in its place. The whole row is the
 * navigation control (spec FR-012/FR-013/FR-016) — a `Link` when the
 * outcome resolves to a single navigable target, or a plain, inert
 * container otherwise, since `ReferenceWarning` already explains why.
 */
function OutcomeRow({
	outcome,
	targetPath,
}: {
	readonly outcome: ResolvedOutcome;
	readonly targetPath: readonly string[];
}) {
	const modeLabel =
		outcome.mode !== undefined ? (
			<span className={styles.modeLabel}>{outcome.mode}:</span>
		) : null;

	const content = (
		<>
			<LinkGlyph />
			{modeLabel}
			{outcome.chain.outcome.kind === "resolved" ? (
				formatLiteralValue(
					outcome.chain.outcome.value,
					outcome.chain.outcome.type,
				)
			) : (
				<ReferenceWarning chain={outcome.chain} />
			)}
		</>
	);

	if (
		outcome.chain.outcome.kind !== "resolved" ||
		outcome.targetFile === undefined
	) {
		return <li className={styles.item}>{content}</li>;
	}

	const targetPathText = pathText(targetPath);
	const label =
		outcome.mode !== undefined
			? `Go to ${targetPathText} in ${outcome.targetFile} (${outcome.mode} mode)`
			: `Go to ${targetPathText} in ${outcome.targetFile}`;

	return (
		<li className={styles.item}>
			<Link
				href={tokenHref(outcome.targetFile, targetPath)}
				className={styles.itemLink}
				aria-label={label}
			>
				{content}
			</Link>
		</li>
	);
}

/**
 * Renders a reference exactly as authored — plain, non-activatable text,
 * navigation now lives on each row's own link icon below (spec FR-012/
 * FR-013/FR-016) — plus a list of what it resolves to, one `OutcomeRow`
 * per mode when the target is multiply defined (spec FR-005), otherwise
 * exactly one.
 */
export function TokenReferenceValue({
	resolved,
}: {
	readonly resolved: ResolvedReference;
}) {
	return (
		<span className={styles.reference}>
			<span className={styles.raw}>{resolved.reference.raw}</span>
			<ul className={styles.list}>
				{resolved.outcomes.map((outcome, index) => (
					<OutcomeRow
						key={outcome.mode ?? index}
						outcome={outcome}
						targetPath={resolved.reference.targetPath}
					/>
				))}
			</ul>
		</span>
	);
}
