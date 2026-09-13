import {
	type StrokeStyleValue,
	StrokeStyleValueSchema,
} from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { StrokeStyleEditor } from "./components/StrokeStyleEditor/StrokeStyleEditor.tsx";
import { StrokeStylePreview } from "./components/StrokeStylePreview/StrokeStylePreview.tsx";

/**
 * The `TokenTypeContract` implementation for the `strokeStyle` type. Kept in
 * its own module (separate from the component files) so that anything only
 * needing the wired contract doesn't have to load JSX — matches
 * `token-editor-font-weight`'s `token-type.ts` precedent.
 */
export const strokeStyleTokenType: TokenTypeContract<StrokeStyleValue> = {
	type: "strokeStyle",
	valueSchema: StrokeStyleValueSchema,
	serializeValue: (value) => value,
	Editor: StrokeStyleEditor,
	Preview: StrokeStylePreview,
};
