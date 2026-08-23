import { Badge } from "@dtcg-editor/design-system/components/Badge/Badge.tsx";
import type { DtcgTokenType } from "@dtcg-editor/token-core";
import type { ChangeEvent, ReactNode } from "react";
import { resolveTokenTypeIconId } from "../../assets/resolve-token-type-icon-id.ts";
import styles from "./TokenBlock.module.css";

function noop() {}

export interface TokenBlockProps {
	/** The token's current (possibly pending-edit) name, rendered as an
	 * inline-editable input in this block's heading. */
	readonly name: string;
	/** Called as the heading input changes. Renaming validation/staging is
	 * the caller's concern — this block just reflects whatever `name` it's
	 * given. */
	readonly onNameChange?: (event: ChangeEvent<HTMLInputElement>) => void;
	/** Accessible name for the heading input, since its visible content is
	 * now user-editable text rather than a fixed label. Defaults to "Name",
	 * which is ambiguous across sibling rows — callers rendering more than
	 * one `TokenBlock` should pass something unique (e.g. the token's
	 * original key). */
	readonly nameAriaLabel?: string;
	/** Id placed on the heading input so field labels elsewhere in this block
	 * can reference it via `aria-labelledby`, disambiguating same-named
	 * fields (e.g. "Description") across sibling tokens without repeating
	 * the token's name as a string in multiple places. */
	readonly headingId?: string;
	/** Stable identifier for this row's `<li>`, independent of the (now
	 * editable, and thus mutable) heading text — lets tests find "this
	 * token's row" reliably even after its name has been edited. */
	readonly rowTestId?: string;
	/** The token's resolved type, if any. `undefined` renders no type pill. */
	readonly type: DtcgTokenType | string | undefined;
	/** Whether `type` is present but not a recognized standard DTCG type. */
	readonly isNonStandardType: boolean;
	/** The token's editor/value/description content — this block doesn't
	 * know or care what's inside. */
	readonly children: ReactNode;
	/** Rendered in the heading row, after the type badge — e.g.
	 * `ReferencedByBadge`. This block doesn't know or care what's inside. */
	readonly headerExtra?: ReactNode;
	readonly className?: string;
}

/**
 * The presentational "block" (CUBE CSS sense) shared by every token row in
 * the tree, regardless of whether the token is on the valid/editable path or
 * the invalid/read-only path in `TreeTokenNode`. Purely a dumb renderer of
 * whatever it's given — no validation or staged-edit state lives here; see
 * `TreeTokenNode` for that.
 */
export function TokenBlock({
	name,
	onNameChange = noop,
	nameAriaLabel = "Name",
	headingId,
	rowTestId,
	type,
	isNonStandardType,
	children,
	headerExtra,
	className,
}: TokenBlockProps) {
	const iconId = resolveTokenTypeIconId(type);

	return (
		<li
			className={[styles.token, className].filter(Boolean).join(" ")}
			data-testid={rowTestId}
		>
			<div className={styles.identity}>
				<svg className={styles.icon} aria-hidden="true" focusable="false">
					<use xlinkHref={`/token-types-sprite.svg#${iconId}`} />
				</svg>
				<h2 className={styles.heading}>
					<input
						id={headingId}
						data-inline
						value={name}
						onChange={onNameChange}
						aria-label={nameAriaLabel}
					/>
				</h2>
				{type !== undefined && (
					<>
						<span className={[styles.typeLabel, "visually-hidden"].join(" ")}>
							Type:
						</span>
						<Badge>{type}</Badge>
						{isNonStandardType && (
							<span className={styles.nonStandard}>(non-standard)</span>
						)}
					</>
				)}
				{headerExtra}
			</div>
			{children}
		</li>
	);
}
