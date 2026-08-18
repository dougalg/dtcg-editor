import styles from "./SaveButton.module.css";

/**
 * Primary call-to-action button for committing pending token edits to disk.
 *
 * Owns only the button's own presentation (icon, label, CTA styling,
 * disabled/pending appearance) — the save-error message shown after a
 * failed save is a separate concern and stays with the caller (see
 * `TokenTree.tsx`), since it's about the save *result*, not this button's
 * anatomy.
 */
export function SaveButton({
	onClick,
	disabled,
	pending,
}: {
	onClick: () => void;
	disabled: boolean;
	pending: boolean;
}) {
	return (
		<button
			type="button"
			className={styles.button}
			onClick={onClick}
			disabled={disabled}
		>
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
				<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
				<path d="M17 21v-8H7v8" />
				<path d="M7 3v5h8" />
			</svg>
			<span className={styles.label}>{pending ? "Saving…" : "Save"}</span>
		</button>
	);
}
