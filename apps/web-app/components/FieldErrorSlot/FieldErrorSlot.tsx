import type { FieldErrors } from "../../lib/tokens/staged-edits-store.ts";
import styles from "./FieldErrorSlot.module.css";

/**
 * A fixed-height slot for a field's validation message(s). The reserving box
 * is **always** rendered (INV-14): its `min-height` is reserved in CSS so a
 * message appearing or clearing never moves anything around it (SC-002,
 * FR-012). Messages render as `role="alert"` inside that box, in normal block
 * flow, so a longer one grows the box downward only. The end-to-end pixel
 * guarantee is asserted by `e2e/render-stability.spec.ts` (A2).
 */
export function FieldErrorSlot({ errors }: { readonly errors: FieldErrors }) {
	return (
		<span className={styles.slot} data-testid="field-error-slot">
			{errors.name !== undefined && (
				<span role="alert" className={styles.message}>
					{errors.name}
				</span>
			)}
			{errors.value !== undefined && (
				<span role="alert" className={styles.message}>
					{errors.value}
				</span>
			)}
		</span>
	);
}
