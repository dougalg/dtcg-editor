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
 * The pluggable interface a token-editor package (e.g. `@dtcg-editor/token-editor-dimension`)
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

	/**
	 * Read-only rendering for a token of this type whose raw value has
	 * already failed `valueSchema` — used wherever the host can't show an
	 * interactive `Editor` because the value doesn't parse. The host (`TreeNode.tsx`)
	 * only ever calls this once it has already run `validateTokenValue` and
	 * confirmed the result is an `err`, so `error` is always a concrete
	 * `TokenTypeValidationError`, not a `Result` an implementer would need to
	 * unwrap. Types with nothing extra to show (e.g. dimension) omit this;
	 * the host falls back to plain text. Note this is strictly for the
	 * doesn't-parse-at-all case — a value that parses successfully but that a
	 * type wants to flag for some other reason (e.g. color's in-range check)
	 * is the `Editor`'s own concern, since `Editor` already receives an
	 * already-validated `TValue` to inspect.
	 */
	ValidationErrorHandler?(props: {
		readonly value: unknown;
		readonly error: TokenTypeValidationError;
	}): ReactElement | null;
}

/** One issue from a `valueSchema` parse, in the same shape Zod itself reports it. */
export interface TokenTypeValidationIssue {
	/**
	 * Raw path segments to the offending field (e.g. `["components", 0]`),
	 * left unjoined so an implementer can decide how to use it. Empty for a
	 * top-level/whole-value issue.
	 */
	readonly path: readonly PropertyKey[];
	/** Zod's human-readable message for this issue alone. */
	readonly message: string;
	/** Zod's issue code (e.g. `"invalid_type"`, `"invalid_union"`). */
	readonly code: string;
}

/** Returned by `validateTokenValue` when a raw value doesn't conform to a contract's `valueSchema`. */
export class TokenTypeValidationError extends Error {
	/**
	 * Structured per-issue detail from `valueSchema`'s Zod parse. For a
	 * `z.union`-typed `valueSchema` (e.g. color's), Zod collapses all branch
	 * failures into one issue (`code: "invalid_union"`, `path: []`, `message:
	 * "Invalid input"`) rather than one per failing field — an implementer
	 * wanting better structural detail in that case must still validate the
	 * raw value against its own branch schemas directly.
	 */
	readonly issues: readonly TokenTypeValidationIssue[];

	constructor(message: string, issues: readonly TokenTypeValidationIssue[]) {
		super(message);
		this.name = "TokenTypeValidationError";
		this.issues = issues;
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
		const issues = parsed.error.issues.map((issue) => ({
			path: issue.path,
			message: issue.message,
			code: issue.code,
		}));
		return err(
			new TokenTypeValidationError(
				`Invalid ${contract.type} value: ${reasons}`,
				issues,
			),
		);
	}
	return ok(parsed.data);
}
