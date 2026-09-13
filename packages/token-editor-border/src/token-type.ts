import { type BorderValue, BorderValueSchema } from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { BorderEditor } from "./components/BorderEditor/BorderEditor.tsx";
import { BorderPreview } from "./components/BorderPreview/BorderPreview.tsx";

/**
 * The `TokenTypeContract` implementation for the DTCG `border` composite
 * type. Kept in its own module (separate from the components) so that
 * anything only needing the wired contract can still be reasoned about
 * independently of JSX, matching every sibling package's `token-type.ts`
 * precedent (e.g. `token-editor-dimension/src/token-type.ts`).
 * `BorderValueSchema` itself lives in `@dtcg-editor/token-core`, not a
 * sibling module of this package.
 */
export const borderTokenType: TokenTypeContract<BorderValue> = {
	type: "border",
	valueSchema: BorderValueSchema,
	serializeValue: (value) => value,
	Editor: BorderEditor,
	Preview: BorderPreview,
};
