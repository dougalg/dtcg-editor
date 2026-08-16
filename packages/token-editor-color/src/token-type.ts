import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { ColorValueSchema, type ColorValue } from "@dtcg-editor/token-core";
import { ColorEditorOptionsSchema } from "./configuration.ts";
import { ColorEditor } from "./components/editor.tsx";
import { ColorValidationErrorHandler } from "./components/validation-error-handler.tsx";

/**
 * Kept in its own module (separate from `components/editor.tsx`) so that
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
	editorOptionsSchema: ColorEditorOptionsSchema,
};
