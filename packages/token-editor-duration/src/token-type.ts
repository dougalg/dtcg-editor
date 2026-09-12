import {
	type DurationValue,
	DurationValueSchema,
} from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { DurationEditor } from "./components/DurationEditor/DurationEditor.tsx";

/**
 * The `TokenTypeContract` implementation for the `duration` type. Kept in
 * its own module (separate from the component files) so that anything only
 * needing the wired contract doesn't have to load JSX that `node --test`
 * cannot load. `Preview` is wired in once `DurationPreview` exists (User
 * Story 2).
 */
export const durationTokenType: TokenTypeContract<DurationValue> = {
	type: "duration",
	valueSchema: DurationValueSchema,
	serializeValue: (value) => value,
	Editor: DurationEditor,
};
