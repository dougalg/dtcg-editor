import type { TokenTypeContract } from "@dtcg-editor/token-type-contract";
import {
	ColorEditorOptionsSchema,
	ColorValueSchema,
	type ColorValue,
} from "./color.ts";
import { ColorEditor } from "./editor.tsx";

/**
 * Kept in its own module (separate from `color.ts`'s schema) so that
 * anything only needing `ColorValueSchema` — like `color.test.ts` — doesn't
 * transitively pull in `editor.tsx`'s JSX, which `node --test` cannot load.
 */
export const colorTokenType: TokenTypeContract<ColorValue> = {
	type: "color",
	valueSchema: ColorValueSchema,
	serializeValue: (value) => value,
	Editor: ColorEditor,
	editorOptionsSchema: ColorEditorOptionsSchema,
};
