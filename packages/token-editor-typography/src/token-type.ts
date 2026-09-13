import {
	type TypographyValue,
	TypographyValueSchema,
} from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { TypographyEditor } from "./components/TypographyEditor/TypographyEditor.tsx";
import { TypographyPreview } from "./components/TypographyPreview/TypographyPreview.tsx";

/**
 * The `TokenTypeContract` implementation for the `typography` type. Kept in
 * its own module (separate from the component files) so that anything only
 * needing the wired contract doesn't have to load JSX that `node --test`
 * cannot load.
 */
export const typographyTokenType: TokenTypeContract<TypographyValue> = {
	type: "typography",
	valueSchema: TypographyValueSchema,
	serializeValue: (value) => value,
	Editor: TypographyEditor,
	Preview: TypographyPreview,
};
