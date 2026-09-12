import {
	type CubicBezierValue,
	CubicBezierValueSchema,
} from "@dtcg-editor/token-core";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { CubicBezierEditor } from "./components/CubicBezierEditor/CubicBezierEditor.tsx";

/**
 * The `TokenTypeContract` implementation for the DTCG `cubicBezier` type,
 * mirroring `dimensionTokenType`'s shape. Kept in its own module (separate
 * from the JSX components) so that anything only needing the wired contract
 * doesn't have to load JSX that `node --test` cannot load.
 */
export const cubicBezierTokenType: TokenTypeContract<CubicBezierValue> = {
	type: "cubicBezier",
	valueSchema: CubicBezierValueSchema,
	serializeValue: (value) => value,
	Editor: CubicBezierEditor,
};
