import {
	type DimensionValue,
	DimensionValueSchema,
} from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { DimensionEditor } from "./components/DimensionEditor/DimensionEditor.tsx";

/**
 * The first concrete implementation of `TokenTypeContract`. Kept in its own
 * module (separate from `components/DimensionEditor/DimensionEditor.tsx`) so that anything only
 * needing the wired contract doesn't have to load JSX that `node --test`
 * cannot load. `DimensionValueSchema` itself now lives in
 * `@dtcg-editor/token-core`, not a sibling module of this package.
 */
export const dimensionTokenType: TokenTypeContract<DimensionValue> = {
	type: "dimension",
	valueSchema: DimensionValueSchema,
	serializeValue: (value) => value,
	Editor: DimensionEditor,
};
