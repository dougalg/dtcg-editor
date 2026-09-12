import {
	type FontWeightValue,
	FontWeightValueSchema,
} from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { FontWeightEditor } from "./components/FontWeightEditor/FontWeightEditor.tsx";
import { FontWeightPreview } from "./components/FontWeightPreview/FontWeightPreview.tsx";

/**
 * The `TokenTypeContract` implementation for the `fontWeight` type. Kept in
 * its own module (separate from the component files) so that anything only
 * needing the wired contract doesn't have to load JSX that `node --test`
 * cannot load — matches `token-editor-dimension`'s `token-type.ts` precedent.
 */
export const fontWeightTokenType: TokenTypeContract<FontWeightValue> = {
	type: "fontWeight",
	valueSchema: FontWeightValueSchema,
	serializeValue: (value) => value,
	Editor: FontWeightEditor,
	Preview: FontWeightPreview,
};
