import { TokenParseError } from "@dtcg-editor/token-core";
import type { UnknownError } from "@dtcg-editor/errors";
import { FileNotFoundError } from "../../../lib/tokens/read.ts";
import { PathTraversalError } from "../../../lib/tokens/path-safety.ts";

/**
 * Maps `readAndParseTokenFile`'s error union to a user-facing message,
 * exhaustively branching every named error (`PathTraversalError`,
 * `FileNotFoundError`, `TokenParseError`) before falling back to a generic
 * message — the generic fallback is reserved for `UnknownError` (and any
 * truly unmatched case), per the Server Component branching convention in
 * `docs/project.md`'s Error Handling constraint.
 */
export function describePageError(
	error:
		PathTraversalError | FileNotFoundError | TokenParseError | UnknownError,
	relativePath: string,
): string {
	if (
		error instanceof PathTraversalError ||
		error instanceof FileNotFoundError ||
		error instanceof TokenParseError
	) {
		return error.message;
	}
	return `Could not load "${relativePath}".`;
}
