import { z } from "zod";
import { COLOR_SPACES, type ColorSpace } from "./color.ts";

/**
 * `editorOptions` shape for the `color` extension entry (FR-04). Restricts
 * which `colorSpace`s `ColorEditor`'s dropdown offers when authoring —
 * purely a client-side authoring affordance, not a new validation boundary
 * (see `components/editor.tsx`'s allow-list handling and
 * `checkColorValueIssues`, which this doesn't touch).
 */
export interface ColorEditorOptions {
	readonly colorSpaces?: readonly ColorSpace[] | undefined;
}

/**
 * An explicitly empty `colorSpaces` array is rejected (`.min(1)`) rather
 * than silently producing a picker with zero selectable spaces — fails fast
 * in `defineConfig`, consistent with how other malformed config already
 * fails there.
 */
export const ColorEditorOptionsSchema: z.ZodType<ColorEditorOptions> = z.object(
	{
		colorSpaces: z.array(z.enum(COLOR_SPACES)).min(1).optional(),
	},
);

/**
 * Typed identity helper giving compile-time type-checking/autocomplete when
 * authoring `editorOptions` for a `color` extension entry — performs no
 * runtime validation itself. `defineConfig`'s `ColorEditorOptionsSchema`
 * check remains the actual enforcement point, so a config author bypassing
 * this helper (raw object literal, `as any`, etc.) is still caught.
 */
export function defineColorConfig(
	options: ColorEditorOptions,
): ColorEditorOptions {
	return options;
}
