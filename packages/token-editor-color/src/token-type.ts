import { type ColorValue, ColorValueSchema } from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { ColorEditor } from "./components/ColorEditor/ColorEditor.tsx";
import { ColorPreview } from "./components/ColorPreview/ColorPreview.tsx";
import { ColorValidationErrorHandler } from "./components/ColorValidationErrorHandler/ColorValidationErrorHandler.tsx";
import { ColorEditorOptionsSchema } from "./configuration.ts";

/**
 * Kept in its own module (separate from `components/ColorEditor/ColorEditor.tsx`) so that
 * anything only needing the wired contract doesn't have to load JSX that
 * `node --test` cannot load. `ColorValueSchema` itself now lives in
 * `@dtcg-editor/token-core`, not a sibling module of this package.
 */
export const colorTokenType: TokenTypeContract<ColorValue> = {
	type: "color",
	valueSchema: ColorValueSchema,
	serializeValue: (value) => value,
	Editor: ColorEditor,
	ValidationErrorHandler: ColorValidationErrorHandler,
	Preview: ColorPreview,
	editorOptionsSchema: ColorEditorOptionsSchema,
};
