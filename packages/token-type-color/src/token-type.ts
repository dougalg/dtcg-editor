import type { TokenTypeContract } from "@dtcg-editor/token-type-contract";
import { ColorValueSchema, type ColorValue } from "./color.ts";
import { ColorEditorOptionsSchema } from "./configuration.ts";
import { ColorEditor } from "./components/editor.tsx";
import { ColorValidationErrorHandler } from "./components/validation-error-handler.tsx";

/**
 * Kept in its own module (separate from `color.ts`'s schema) so that
 * anything only needing `ColorValueSchema` — like `color.test.ts` — doesn't
 * transitively pull in `components/editor.tsx`'s JSX, which `node --test`
 * cannot load.
 */
export const colorTokenType: TokenTypeContract<ColorValue> = {
	type: "color",
	valueSchema: ColorValueSchema,
	serializeValue: (value) => value,
	Editor: ColorEditor,
	ValidationErrorHandler: ColorValidationErrorHandler,
	editorOptionsSchema: ColorEditorOptionsSchema,
};
