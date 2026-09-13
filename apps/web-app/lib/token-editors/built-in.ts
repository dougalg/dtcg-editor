import { borderTokenType } from "@dtcg-editor/token-editor-border";
import { colorTokenType } from "@dtcg-editor/token-editor-color";
import type { TokenTypeContract } from "@dtcg-editor/token-editor-contract";
import { cubicBezierTokenType } from "@dtcg-editor/token-editor-cubic-bezier";
import { dimensionTokenType } from "@dtcg-editor/token-editor-dimension";
import { durationTokenType } from "@dtcg-editor/token-editor-duration";
import { fontFamilyTokenType } from "@dtcg-editor/token-editor-font-family";
import { fontWeightTokenType } from "@dtcg-editor/token-editor-font-weight";
import { numberTokenType } from "@dtcg-editor/token-editor-number";
import { strokeStyleTokenType } from "@dtcg-editor/token-editor-stroke-style";
import { transitionTokenType } from "@dtcg-editor/token-editor-transition";
import type { TokenEditorExtension } from "./types.ts";

/**
 * Every DTCG token type this repo ships a built-in editor for. Adding a new
 * built-in token-type package means adding its type name here *and* to
 * `builtInContractsByType` below — the mapped type on that record makes
 * forgetting the second edit a compile error, not silent drift.
 */
export const BUILT_IN_TOKEN_TYPES = [
	"dimension",
	"color",
	"duration",
	"cubicBezier",
	"fontWeight",
	"strokeStyle",
	"fontFamily",
	"border",
	"transition",
	"number",
] as const;

export type TokenType = (typeof BUILT_IN_TOKEN_TYPES)[number];

const builtInContractsByType: {
	readonly [T in TokenType]: TokenTypeContract<unknown>;
} = {
	// `dimensionTokenType`'s `Editor` only ever receives values this registry
	// itself produced (via `TokenTree.tsx`'s existing `validateDimensionValue`
	// path), so erasing its value type to `unknown` here is safe — this
	// registry never inspects `value`, only threads it through opaquely
	// between the resolved component and `TokenTree.tsx`'s change handler.
	dimension: dimensionTokenType as unknown as TokenTypeContract<unknown>,
	// Same safety argument as `dimension` above.
	color: colorTokenType as unknown as TokenTypeContract<unknown>,
	// Same safety argument as `dimension` above.
	duration: durationTokenType as unknown as TokenTypeContract<unknown>,
	// Same safety argument as `dimension` above.
	cubicBezier: cubicBezierTokenType as unknown as TokenTypeContract<unknown>,
	// Same safety argument as `dimension` above.
	fontWeight: fontWeightTokenType as unknown as TokenTypeContract<unknown>,
	// Same safety argument as `dimension` above.
	strokeStyle: strokeStyleTokenType as unknown as TokenTypeContract<unknown>,
	// Same safety argument as `dimension` above.
	fontFamily: fontFamilyTokenType as unknown as TokenTypeContract<unknown>,
	// Same safety argument as `dimension` above.
	border: borderTokenType as unknown as TokenTypeContract<unknown>,
	// Same safety argument as `dimension` above.
	transition: transitionTokenType as unknown as TokenTypeContract<unknown>,
	// Same safety argument as `dimension` above.
	number: numberTokenType as unknown as TokenTypeContract<unknown>,
};

/** Built-in `{ type, editor }` entries, one per `BUILT_IN_TOKEN_TYPES` member. */
export const builtInExtensions: readonly TokenEditorExtension[] =
	BUILT_IN_TOKEN_TYPES.map((type) => ({
		type,
		editor: builtInContractsByType[type].Editor,
	}));

/**
 * Looks up the full contract (including `valueSchema`) for a built-in type,
 * or `undefined` if `type` has no built-in contract (e.g. a standard type
 * only reachable via a user-registered extension, which carries no schema
 * of its own). Lets `TokenTree.tsx` validate a non-dimension standard
 * token's value before treating it as editable, generalizing the same
 * guard `dimensionTokenType` already gets, without hard-coding a specific
 * non-dimension type into the component.
 */
export function resolveBuiltInContract(
	type: string,
): TokenTypeContract<unknown> | undefined {
	return (BUILT_IN_TOKEN_TYPES as readonly string[]).includes(type)
		? builtInContractsByType[type as TokenType]
		: undefined;
}
