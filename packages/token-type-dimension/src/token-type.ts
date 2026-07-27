import type { TokenTypeContract } from "@dtcg-editor/token-type-contract";
import { DimensionValueSchema, type DimensionValue } from "./dimension.ts";
import { DimensionEditor } from "./editor.tsx";

/**
 * The first concrete implementation of `TokenTypeContract`. Kept in its own
 * module (separate from `dimension.ts`'s schema) so that anything only
 * needing `DimensionValueSchema` — like `dimension.test.ts` — doesn't
 * transitively pull in `editor.tsx`'s JSX, which `node --test` cannot load.
 */
export const dimensionTokenType: TokenTypeContract<DimensionValue> = {
  type: "dimension",
  valueSchema: DimensionValueSchema,
  serializeValue: (value) => value,
  Editor: DimensionEditor,
};
