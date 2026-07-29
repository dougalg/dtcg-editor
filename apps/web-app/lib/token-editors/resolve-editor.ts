import type { TokenEditorExtension, TokenType } from "./types.ts";

/**
 * First-match-wins lookup over `extensions` for the given token type.
 * `extensions` should already have user-supplied entries ordered ahead of
 * built-in defaults (see `defineConfig`), so a user override for a given
 * type naturally takes precedence here without needing to know about or
 * exclude the built-in entry directly (FR-04).
 *
 * `type` comes from `PlainDtcgNode.effectiveType`, an unvalidated
 * `string | undefined` — the cast to `TokenType` is safe because `filter`
 * predicates only ever compare it for equality; an unrecognized string
 * simply matches nothing, no unsound access occurs.
 */
export function resolveEditorForType(
	extensions: readonly TokenEditorExtension[],
	type: string,
): TokenEditorExtension["editor"] | undefined {
	return extensions.find((entry) => entry.filter({ type: type as TokenType }))
		?.editor;
}
