"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useResolvedPreview } from "../../hooks/useResolvedPreview.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import type { FieldErrors } from "../../lib/tokens/staged-edits-store.ts";
import styles from "../TokenBlock/TokenBlock.module.css";
import { TokenBlock } from "../TokenBlock/TokenBlock.tsx";
import { TokenReferenceValue } from "../TokenReferenceValue/TokenReferenceValue.tsx";

type TokenNode = Extract<PlainDtcgNode, { kind: "token" }>;

/**
 * The reference row's resolved-value display. Its own component so
 * `useResolvedPreview` is called **only** by reference rows — a literal row
 * never mounts it. The store's live resolution supersedes the server-baked
 * outcome literal; the navigation structure stays server-computed.
 */
function ReferenceValueDisplay({
	tokenKey,
	relativePath,
	resolved,
	rawRef,
}: {
	readonly tokenKey: string;
	readonly relativePath: string;
	readonly resolved: ResolvedReference | undefined;
	readonly rawRef: string;
}) {
	const liveValue = useResolvedPreview(tokenKey);
	if (resolved === undefined) {
		return <span className={styles.value}>{rawRef}</span>;
	}
	const sameFile = resolved.outcomes.some(
		(outcome) => outcome.targetFile === relativePath,
	);
	return (
		<TokenReferenceValue
			resolved={resolved}
			liveValue={sameFile ? liveValue : undefined}
		/>
	);
}

/**
 * The value row for a token whose entire `$value` is a reference: the
 * read-only resolved-value display shown today (spec FR-001). Extracted
 * verbatim from `TreeTokenNode`'s path-1 branch so the repoint picker can be
 * hosted here in a following behavioral cycle.
 */
export function ReferenceEditControl({
	node,
	currentName,
	onNameChange,
	onNameBlur,
	error,
	headingId,
	rowTestId,
	effectiveType,
	headerExtra,
	tokenKey,
	relativePath,
	resolved,
	rawRef,
}: {
	readonly node: TokenNode;
	readonly currentName: string;
	readonly onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
	readonly onNameBlur: () => void;
	readonly error: FieldErrors | undefined;
	readonly headingId: string;
	readonly rowTestId: string;
	readonly effectiveType: string | undefined;
	readonly headerExtra: ReactNode;
	readonly tokenKey: string;
	readonly relativePath: string;
	readonly resolved: ResolvedReference | undefined;
	readonly rawRef: string;
}) {
	return (
		<TokenBlock
			name={currentName}
			onNameChange={onNameChange}
			onNameBlur={onNameBlur}
			error={error}
			nameAriaLabel={`${node.name} name`}
			headingId={headingId}
			rowTestId={rowTestId}
			type={effectiveType}
			isNonStandardType={false}
			headerExtra={headerExtra}
		>
			<span className={styles.field}>
				<span className={styles.fieldLabel}>Value</span>
				<ReferenceValueDisplay
					tokenKey={tokenKey}
					relativePath={relativePath}
					resolved={resolved}
					rawRef={rawRef}
				/>
			</span>
		</TokenBlock>
	);
}
