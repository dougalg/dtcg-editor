import { type ShadowValue, ShadowValueSchema } from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { ShadowEditor } from "./components/ShadowEditor/ShadowEditor.tsx";
import { ShadowPreview } from "./components/ShadowPreview/ShadowPreview.tsx";

/**
 * The `TokenTypeContract` implementation for the DTCG `shadow` composite
 * type. Kept in its own module (separate from the components) so that
 * anything only needing the wired contract can still be reasoned about
 * independently of JSX, matching every sibling package's `token-type.ts`
 * precedent (e.g. `token-editor-border/src/token-type.ts`).
 * `ShadowValueSchema` itself lives in `@dtcg-editor/token-core`, not a
 * sibling module of this package.
 */
export const shadowTokenType: TokenTypeContract<ShadowValue> = {
	type: "shadow",
	valueSchema: ShadowValueSchema,
	serializeValue: (value) => value,
	Editor: ShadowEditor,
	Preview: ShadowPreview,
};
