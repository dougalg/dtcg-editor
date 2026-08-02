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
 *
 * Returns the whole matched entry's `editor`/`editorOptions` pair (not a
 * bare editor reference), so a matching type-specific `editorOptions` can be
 * threaded through to the resolved editor. `editorOptions` is `undefined`
 * when the matched entry doesn't declare one — `TokenEditorExtension.editorOptions`
 * is already optional.
 */
export function resolveEditorForType(
	extensions: readonly TokenEditorExtension[],
	type: string,
):
	| { editor: TokenEditorExtension["editor"]; editorOptions: unknown }
	| undefined {
	const entry = extensions.find((entry) => entry.type === type);
	return entry
		? { editor: entry.editor, editorOptions: entry.editorOptions }
		: undefined;
}
