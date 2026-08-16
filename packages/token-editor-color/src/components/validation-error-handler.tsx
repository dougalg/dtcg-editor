import type { TokenTypeValidationError } from "@dtcg-editor/token-editor-contract";
import {
	ColorObjectValueSchema,
	LegacyHexColorValueSchema,
} from "@dtcg-editor/token-core";
import styles from "./editor.module.css";

/**
 * Formats a single structural-parse issue for display. `ColorValueSchema`
 * itself is a `z.union` of the object and legacy-hex shapes, and Zod's
 * default union error collapses every structural failure to a
 * content-free "Invalid input" — so this validates against the two branch
 * schemas directly instead (chosen by `raw`'s own JS type, not the union),
 * which surfaces Zod's real per-field messages (e.g. which enum failed,
 * which field had the wrong shape). `error` (the host-supplied
 * `TokenTypeValidationError`) is used only as a signal that something
 * failed, not as the source of this message text — see
 * `contracts/token-editor-contract.md`'s "Limit" note on `z.union` collapse.
 */
function describeIssues(raw: unknown): readonly string[] {
	if (typeof raw === "string") {
		const hexResult = LegacyHexColorValueSchema.safeParse(raw);
		if (!hexResult.success) {
			return ['must be a 6-digit hex string like "#rrggbb"'];
		}
		return [];
	}

	const objectResult = ColorObjectValueSchema.safeParse(raw);
	if (!objectResult.success) {
		return objectResult.error.issues.map((issue) => {
			const path = issue.path.join(".");
			return path === "" ? issue.message : `${path}: ${issue.message}`;
		});
	}
	return [];
}

/**
 * `colorTokenType`'s `ValidationErrorHandler`: read-only rendering for a
 * color token whose raw value has already failed `ColorValueSchema`. No
 * swatch is ever rendered here, since `TreeNode.tsx` only calls this once a
 * value has already failed `ColorValueSchema` — both
 * `LegacyHexColorValueSchema` and `ColorObjectValueSchema` fail too, in that
 * case. The "valid but flagged" range-check display (a structurally valid
 * value with an out-of-range component) is a different case entirely,
 * handled by `ObjectColorEditor` itself, not here.
 */
export function ColorValidationErrorHandler({
	value,
}: {
	readonly value: unknown;
	readonly error: TokenTypeValidationError;
}) {
	const issues = describeIssues(value);
	if (issues.length === 0) {
		return null;
	}
	return (
		<div role="alert">
			<ul className={styles.colorIssues}>
				{issues.map((issue) => (
					<li key={issue}>{issue}</li>
				))}
			</ul>
		</div>
	);
}
