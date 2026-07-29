import { z } from "zod";
import { builtInExtensions } from "./built-in.ts";
import type {
	DtcgEditorUserConfig,
	ResolvedDtcgEditorConfig,
	TokenEditorExtension,
} from "./types.ts";

/** Shared with `scripts/init-config.ts` so both validate `tokensDir` identically — one source of truth. */
export const TokensDirSchema = z.string().min(1, "tokensDir must be a non-empty string");

/** Thrown by `defineConfig` when a user's `dtcg-editor.config.mts` is structurally invalid. */
export class DtcgEditorConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DtcgEditorConfigError";
	}
}

/**
 * `entry` is `unknown`, not `TokenEditorExtension`, at this point — an
 * `.mts` author can still bypass their type checker (ignored errors, `as
 * any`, etc.), and this is the one runtime safety net for that. Every
 * branch below folds into `issues` rather than letting a malformed shape
 * (`null`, a non-object, a missing `filter`/`editor`) throw natively.
 */
function describeInvalidExtension(entry: unknown, index: number): string[] {
	if (entry === null || typeof entry !== "object") {
		return [`extensions[${index}] must be an object`];
	}
	const issues: string[] = [];
	const candidate = entry as Partial<TokenEditorExtension>;
	if (typeof candidate.filter !== "function") {
		issues.push(`extensions[${index}].filter must be a function`);
	}
	if (typeof candidate.editor !== "function") {
		issues.push(`extensions[${index}].editor must be a function`);
	}
	return issues;
}

/**
 * Validates a user's config and merges it with this repo's built-in editor
 * defaults (FR-03), placing user-supplied entries ahead of built-ins so a
 * matching user entry takes precedence (FR-04). Called from inside the
 * user's own `dtcg-editor.config.mts` — `export default defineConfig({ ... })`
 * — so a thrown `DtcgEditorConfigError` surfaces as a rejected dynamic
 * `import()` at the one place `instrumentation.ts`'s `register()` catches it
 * (see that file's own doc comment) — `lib/config.ts`'s `loadConfig()` can no
 * longer actually observe this failure itself, since it only ever runs after
 * this module has already evaluated successfully. Function/component values
 * can't be expressed as a Zod schema meaningfully, so `extensions` entries
 * get hand-rolled runtime checks instead; `tokensDir` (the one plain-data
 * field) still goes through Zod. `userConfig` and `userConfig.extensions`
 * are treated as `unknown`-shaped for validation purposes (not trusted as
 * their declared types) for the same "bypassed type checker" reason as
 * `describeInvalidExtension` above — a non-object `userConfig` or a
 * non-array `extensions` fails with a clear `DtcgEditorConfigError` instead
 * of a raw `TypeError`.
 */
export function defineConfig(
	userConfig: DtcgEditorUserConfig,
): ResolvedDtcgEditorConfig {
	if (userConfig === null || typeof userConfig !== "object") {
		throw new DtcgEditorConfigError(
			"Invalid dtcg-editor config: config must be an object",
		);
	}

	const issues: string[] = [];

	const tokensDirResult = TokensDirSchema.safeParse(userConfig.tokensDir);
	if (!tokensDirResult.success) {
		issues.push(
			...tokensDirResult.error.issues.map(
				(issue) => `tokensDir: ${issue.message}`,
			),
		);
	}

	const rawExtensions: unknown = userConfig.extensions ?? [];
	let userExtensions: readonly TokenEditorExtension[] = [];
	if (!Array.isArray(rawExtensions)) {
		issues.push("extensions must be an array");
	} else {
		userExtensions = rawExtensions as TokenEditorExtension[];
		rawExtensions.forEach((entry: unknown, index) => {
			issues.push(...describeInvalidExtension(entry, index));
		});
	}

	if (issues.length > 0) {
		throw new DtcgEditorConfigError(
			`Invalid dtcg-editor config: ${issues.join("; ")}`,
		);
	}

	return {
		tokensDir: userConfig.tokensDir,
		extensions: [...userExtensions, ...builtInExtensions],
	};
}
