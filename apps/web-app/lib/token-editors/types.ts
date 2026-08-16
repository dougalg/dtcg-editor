import type { DtcgTokenType } from "@dtcg-editor/token-core";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-type-contract";
import type { ReactElement } from "react";

/** Pairs a DTCG `$type` with the editor component to render for tokens of that type. */
export interface TokenEditorExtension {
	/**
	 * Typed as `DtcgTokenType` for config-authoring DX (autocomplete/type
	 * checking) only — a config author can still bypass the type checker
	 * (`as any`, ignored errors), so `defineConfig`'s runtime `isDtcgTokenType`
	 * check remains the actual enforcement point, unchanged by this type.
	 */
	readonly type: DtcgTokenType;
	readonly editor: (props: TokenTypeEditorProps<unknown>) => ReactElement;
	/** Type-specific options, validated at config-load time against the matching built-in contract's `editorOptionsSchema` (if any). */
	readonly editorOptions?: unknown;
}

/** Shape a user's `dtcg-editor.config.mts` passes to `defineConfig`. */
export interface DtcgEditorUserConfig {
	readonly tokensDir: string;
	readonly extensions?: readonly TokenEditorExtension[];
}

/** `defineConfig`'s return value: the user's config, validated and merged with built-in defaults. */
export interface ResolvedDtcgEditorConfig {
	readonly tokensDir: string;
	readonly extensions: readonly TokenEditorExtension[];
}
