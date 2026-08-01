import {
	checkColorValueIssues,
	colorValueToCssColor,
	ColorObjectValueSchema,
	LegacyHexColorValueSchema,
} from "@dtcg-editor/token-type-color";

export interface ColorDisplayInfo {
	readonly cssColor: string | undefined;
	readonly issues: readonly string[];
}

/**
 * Formats a single structural-parse issue for display. `ColorValueSchema`
 * itself is a `z.union` of the object and legacy-hex shapes, and Zod's
 * default union error collapses every structural failure to a
 * content-free "Invalid input" — so this validates against the two branch
 * schemas directly instead (chosen by `raw`'s own JS type, not the union),
 * which surfaces Zod's real per-field messages (e.g. which enum failed,
 * which field had the wrong shape).
 */
function describeIssue(issue: {
	path: PropertyKey[];
	message: string;
}): string {
	const path = issue.path.join(".");
	return path === "" ? issue.message : `${path}: ${issue.message}`;
}

/**
 * Read-only-display-focused counterpart to `edit-state.ts`'s
 * `validateDimensionValue` — never produces a `ClientEdit`, only what
 * `TokenTree.tsx`'s read-only branch needs to render a color token's swatch
 * and any per-colorSpace validation issues (see `feature.md`'s FR-05).
 */
export function describeColorForDisplay(raw: unknown): ColorDisplayInfo {
	if (typeof raw === "string") {
		const hexResult = LegacyHexColorValueSchema.safeParse(raw);
		if (!hexResult.success) {
			return {
				cssColor: undefined,
				issues: ['must be a 6-digit hex string like "#rrggbb"'],
			};
		}
		return { cssColor: hexResult.data, issues: [] };
	}

	const objectResult = ColorObjectValueSchema.safeParse(raw);
	if (!objectResult.success) {
		return {
			cssColor: undefined,
			issues: objectResult.error.issues.map(describeIssue),
		};
	}
	return {
		cssColor: colorValueToCssColor(objectResult.data),
		issues: checkColorValueIssues(objectResult.data),
	};
}
