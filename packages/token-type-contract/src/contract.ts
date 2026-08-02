import { err, ok, type Result } from "neverthrow";
import type { ReactElement } from "react";
import type { z } from "zod";

/** Props every token-type editor component receives: a fully controlled value plus a change handler. */
export interface TokenTypeEditorProps<TValue> {
	readonly value: TValue;
	readonly onChange: (next: TValue) => void;
	/** This type's resolved `editorOptions` from the host app's config, or `undefined` when none was supplied. */
	readonly options?: unknown;
}

/**
 * The pluggable interface a token-type package (e.g. `@dtcg-editor/token-type-dimension`)
 * implements, and that host apps use generically without hard-coding
 * knowledge of any specific DTCG `$type`.
 */
export interface TokenTypeContract<TValue> {
	/** The DTCG `$type` this contract handles, e.g. `"dimension"`. */
	readonly type: string;
	/** Validates/parses a raw, untrusted `$value` into this type's typed shape. */
	readonly valueSchema: z.ZodType<TValue>;
	/** Turns a typed value back into its plain, DTCG-JSON-serializable `$value` shape. */
	serializeValue(value: TValue): unknown;
	/** The editable UI for this type. */
	Editor(props: TokenTypeEditorProps<TValue>): ReactElement;
	/** Optional schema `defineConfig` validates a matching extension entry's `editorOptions` against, at config-load time. */
	readonly editorOptionsSchema?: z.ZodType<unknown>;
}

/** Returned by `validateTokenValue` when a raw value doesn't conform to a contract's `valueSchema`. */
export class TokenTypeValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TokenTypeValidationError";
	}
}

/** Validates `raw` against `contract`'s `valueSchema`, per this repo's Error Handling (Result Pattern) convention. */
export function validateTokenValue<TValue>(
	contract: TokenTypeContract<TValue>,
	raw: unknown,
): Result<TValue, TokenTypeValidationError> {
	const parsed = contract.valueSchema.safeParse(raw);
	if (!parsed.success) {
		const reasons = parsed.error.issues
			.map((issue) => issue.message)
			.join(", ");
		return err(
			new TokenTypeValidationError(
				`Invalid ${contract.type} value: ${reasons}`,
			),
		);
	}
	return ok(parsed.data);
}
