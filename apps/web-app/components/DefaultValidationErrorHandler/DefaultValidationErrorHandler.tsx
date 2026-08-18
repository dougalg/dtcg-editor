import type { TokenTypeValidationError } from "@dtcg-editor/token-editor-contract";

/**
 * `TreeTokenNode`'s fallback for the extra-content slot beneath a token's
 * name/type/value fields — used whenever a token-type contract has no
 * `ValidationErrorHandler` of its own, or the token has no usable type to
 * look a contract up for at all. `error` is present only when a recognized
 * type's value failed to validate; absent when there's no usable type.
 */
export function DefaultValidationErrorHandler({
	error,
}: {
	readonly value: unknown;
	readonly error?: TokenTypeValidationError | undefined;
}) {
	if (error === undefined) {
		return null;
	}
	return <span role="alert">{error.message}</span>;
}
