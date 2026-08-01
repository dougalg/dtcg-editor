import {
	checkColorValueIssues,
	colorValueToCssColor,
	ColorValueSchema,
} from "@dtcg-editor/token-type-color";

export interface ColorDisplayInfo {
	readonly cssColor: string | undefined;
	readonly issues: readonly string[];
}

/**
 * Read-only-display-focused counterpart to `edit-state.ts`'s
 * `validateDimensionValue` — never produces a `ClientEdit`, only what
 * `TokenTree.tsx`'s read-only branch needs to render a color token's swatch
 * and any per-colorSpace validation issues (see `feature.md`'s FR-05).
 */
export function describeColorForDisplay(raw: unknown): ColorDisplayInfo {
	const result = ColorValueSchema.safeParse(raw);
	if (!result.success) {
		return {
			cssColor: undefined,
			issues: result.error.issues.map((issue) => issue.message),
		};
	}
	return {
		cssColor: colorValueToCssColor(result.data),
		issues: checkColorValueIssues(result.data),
	};
}
