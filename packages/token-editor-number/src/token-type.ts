import { type NumberValue, NumberValueSchema } from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { NumberEditor } from "./components/NumberEditor/NumberEditor.tsx";
import { NumberPreview } from "./components/NumberPreview/NumberPreview.tsx";

/**
 * The `TokenTypeContract` implementation for the `number` type. Kept in its own
 * module (separate from the component files) so that anything only needing the
 * wired contract doesn't have to load JSX that `node --test` cannot load —
 * matches `token-editor-font-weight`'s `token-type.ts` precedent.
 */
export const numberTokenType: TokenTypeContract<NumberValue> = {
	type: "number",
	valueSchema: NumberValueSchema,
	serializeValue: (value) => value,
	Editor: NumberEditor,
	Preview: NumberPreview,
};
