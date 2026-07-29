import type { TokenTypeContract } from "@dtcg-editor/token-type-contract";
import { dimensionTokenType } from "@dtcg-editor/token-type-dimension";
import type { TokenEditorExtension } from "./types.ts";

/**
 * Every DTCG token type this repo ships a built-in editor for. Adding a new
 * built-in token-type package means adding its type name here *and* to
 * `builtInContractsByType` below — the mapped type on that record makes
 * forgetting the second edit a compile error, not silent drift.
 */
export const BUILT_IN_TOKEN_TYPES = ["dimension"] as const;

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
};

/** Built-in `{ filter, editor }` entries, one per `BUILT_IN_TOKEN_TYPES` member. */
export const builtInExtensions: readonly TokenEditorExtension[] =
	BUILT_IN_TOKEN_TYPES.map((type) => ({
		filter: (metadata) => metadata.type === type,
		editor: builtInContractsByType[type].Editor,
	}));
