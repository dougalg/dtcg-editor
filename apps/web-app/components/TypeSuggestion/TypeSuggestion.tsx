import { Badge } from "@dtcg-editor/design-system/components/Badge/Badge.tsx";
import { Button } from "@dtcg-editor/design-system/components/Button/Button.tsx";
import styles from "./TypeSuggestion.module.css";

/**
 * The pre-filled, explicitly-acceptable type suggestion for a token whose
 * `$type` was inferred from its value's shape rather than declared (spec
 * FR-003b, User Story 1). Rendered only for a token that already has a
 * usable, inferred `effectiveType` — accepting the suggestion here is what
 * turns it into a normal, permanently declared type (FR-003a); nothing is
 * ever written on load or as a side effect of an unrelated edit — only
 * this button's own click stages the edit.
 */
export function TypeSuggestion({
	inferredType,
	onAccept,
}: {
	readonly inferredType: string;
	readonly onAccept: (type: string) => void;
}) {
	return (
		<span className={styles.suggestion}>
			<Badge>Suggested type: {inferredType}</Badge>
			<Button type="button" onClick={() => onAccept(inferredType)}>
				Use this type
			</Button>
		</span>
	);
}
