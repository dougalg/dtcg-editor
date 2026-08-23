import type { UnknownError } from "@dtcg-editor/errors";
import { TokenParseError } from "@dtcg-editor/token-core";
import { PathTraversalError } from "./path-safety.ts";
import { FileNotFoundError } from "./read.ts";

/**
 * Renders a `readAndParseTokenFile` failure as a single display string.
 * Shared by `load-directory.ts` (building `FailedTokenFile.error`) and any
 * other caller wanting the same wording — extracted from `scan.ts`, which
 * used to be the only caller.
 */
export function describeReadError(
	error:
		| PathTraversalError
		| FileNotFoundError
		| TokenParseError
		| UnknownError,
): string {
	if (
		error instanceof PathTraversalError ||
		error instanceof FileNotFoundError ||
		error instanceof TokenParseError
	) {
		return error.message;
	}
	return error.context !== undefined
		? `Unexpected error (${error.context})`
		: "Unexpected error";
}
