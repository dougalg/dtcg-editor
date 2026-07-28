import type { Logger } from "./logger.ts";

/**
 * Wraps anything unexpected surfacing from code outside this monorepo's
 * control (a third-party call, a built-in that throws). Not meant to be
 * handled/branched on by callers — only logged and surfaced, unlike a named
 * error such as `TokenParseError`.
 */
export interface UnknownError {
	readonly kind: "unknown";
	readonly cause: unknown;
	readonly context?: string;
}

/**
 * Converts a caught throw into an `UnknownError` and logs it immediately,
 * at the point it's caught — not left for whoever eventually unwraps the
 * `Result` to remember to log. Callers use this as the error-mapper
 * argument to `neverthrow`'s own `fromThrowable`/`ResultAsync.fromPromise`,
 * rather than a bespoke wrapping abstraction.
 */
export function toLoggedUnknownError(
	logger: Logger,
	cause: unknown,
	context?: string,
): UnknownError {
	const error: UnknownError =
		context === undefined
			? { kind: "unknown", cause }
			: { kind: "unknown", cause, context };
	const logPayload: Record<string, unknown> =
		context === undefined ? { cause } : { cause, context };
	logger.error(logPayload, "Unexpected error");
	return error;
}
