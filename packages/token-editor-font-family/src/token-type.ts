import {
	type FontFamilyValue,
	FontFamilyValueSchema,
} from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { FontFamilyEditor } from "./components/FontFamilyEditor/FontFamilyEditor.tsx";
import { FontFamilyPreview } from "./components/FontFamilyPreview/FontFamilyPreview.tsx";

/**
 * The `TokenTypeContract` implementation for the `fontFamily` type. Kept in
 * its own module (separate from the component files) so that anything only
 * needing the wired contract doesn't have to load JSX that `node --test`
 * cannot load — matches `token-editor-font-weight`'s `token-type.ts`
 * precedent.
 */
export const fontFamilyTokenType: TokenTypeContract<FontFamilyValue> = {
	type: "fontFamily",
	valueSchema: FontFamilyValueSchema,
	serializeValue: (value) => value,
	Editor: FontFamilyEditor,
	Preview: FontFamilyPreview,
};
