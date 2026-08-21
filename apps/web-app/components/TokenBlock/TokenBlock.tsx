import { Badge } from "@dtcg-editor/design-system/components/Badge/Badge.tsx";
import type { DtcgTokenType } from "@dtcg-editor/token-core";
import type { ReactNode } from "react";
import { resolveTokenTypeIconId } from "../../lib/tokens/token-type-icon-sprite.ts";
import styles from "./TokenBlock.module.css";

export interface TokenBlockProps {
	/** The token's name, rendered once as this block's heading. */
	readonly name: string;
	/** The token's resolved type, if any. `undefined` renders no type pill. */
	readonly type: DtcgTokenType | string | undefined;
	/** Whether `type` is present but not a recognized standard DTCG type. */
	readonly isNonStandardType: boolean;
	/** The token's editor/value/description content — this block doesn't
	 * know or care what's inside. */
	readonly children: ReactNode;
	readonly className?: string;
}

/**
 * The presentational "block" (CUBE CSS sense) shared by every token row in
 * the tree, regardless of whether the token is on the valid/editable path or
 * the invalid/read-only path in `TreeTokenNode`. Purely a dumb renderer of
 * whatever it's given — no editing, validation, or staged-edit state lives
 * here; see `TreeTokenNode` for that.
 */
export function TokenBlock({
	name,
	type,
	isNonStandardType,
	children,
	className,
}: TokenBlockProps) {
	const iconId = resolveTokenTypeIconId(type);

	return (
		<li className={[styles.token, className].filter(Boolean).join(" ")}>
			<div className={styles.identity}>
				<svg className={styles.icon} aria-hidden="true" focusable="false">
					<use href={`#${iconId}`} />
				</svg>
				<h2 className={styles.heading}>{name}</h2>
			</div>
			{type !== undefined && (
				<span className={styles.typeRow}>
					<span className={styles.typeLabel}>Type:</span>
					<Badge>{type}</Badge>
					{isNonStandardType && (
						<span className={styles.nonStandard}>(non-standard)</span>
					)}
				</span>
			)}
			{children}
		</li>
	);
}
