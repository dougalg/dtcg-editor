import type { ReactElement } from "react";
import type { TokenTypeEditorProps } from "@dtcg-editor/token-type-contract";
import type { TokenType } from "./built-in.ts";

export type { TokenType };

/** Pairs a DTCG `$type` with the editor component to render for tokens of that type. */
export interface TokenEditorExtension {
	readonly type: string;
	readonly editor: (props: TokenTypeEditorProps<unknown>) => ReactElement;
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
