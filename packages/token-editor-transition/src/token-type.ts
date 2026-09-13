import {
	type TransitionValue,
	TransitionValueSchema,
} from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { TransitionEditor } from "./components/TransitionEditor/TransitionEditor.tsx";
import { TransitionPreview } from "./components/TransitionPreview/TransitionPreview.tsx";

/**
 * The `TokenTypeContract` implementation for the `transition` type. Kept in
 * its own module (separate from the component files) so that anything only
 * needing the wired contract doesn't have to load JSX that `node --test`
 * cannot load.
 */
export const transitionTokenType: TokenTypeContract<TransitionValue> = {
	type: "transition",
	valueSchema: TransitionValueSchema,
	serializeValue: (value) => value,
	Editor: TransitionEditor,
	Preview: TransitionPreview,
};
