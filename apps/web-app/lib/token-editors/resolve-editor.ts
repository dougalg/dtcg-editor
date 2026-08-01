import type { TokenEditorExtension } from "./types.ts";

/**
 * First-match-wins lookup over `extensions` for the given token type.
 * `extensions` should already have user-supplied entries ordered ahead of
 * built-in defaults (see `defineConfig`), so a user override for a given
 * type naturally takes precedence here without needing to know about or
 * exclude the built-in entry directly.
 *
 * `type` comes from `PlainDtcgNode.effectiveType`, an unvalidated
 * `string | undefined` — a direct equality compare needs no cast; an
 * unrecognized string simply matches nothing.
 */
export function resolveEditorForType(
	extensions: readonly TokenEditorExtension[],
	type: string,
): TokenEditorExtension["editor"] | undefined {
	return extensions.find((entry) => entry.type === type)?.editor;
}
