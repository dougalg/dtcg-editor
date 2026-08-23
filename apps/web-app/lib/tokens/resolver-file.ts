import type { Logger, UnknownError } from "@dtcg-editor/errors";
import { consoleLogger, toLoggedUnknownError } from "@dtcg-editor/errors";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import type { ReadTextFile } from "../platform/node-fs.ts";
import { nodeReadFile } from "../platform/node-fs.ts";

const RESOLVER_FILE_NAME = "tokens.resolver.json";

const ResolverSourceSchema = z.object({ $ref: z.string() });

const ResolverSetSchema = z.object({
	type: z.literal("set"),
	name: z.string(),
	sources: z.array(ResolverSourceSchema),
});

const ResolverModifierSchema = z.object({
	type: z.literal("modifier"),
	name: z.string(),
	default: z.string(),
	contexts: z.record(z.string(), z.array(ResolverSourceSchema)),
});

/**
 * The DTCG 2025.10 resolver file format (designtokens.org/tr/2025.10/resolver/):
 * a `resolutionOrder` mixing `"set"` entries (always-included sources) and
 * `"modifier"` entries (named contexts, each adding further sources on top
 * of the sets already accumulated). Only the fields this feature needs are
 * validated; unrecognized `resolutionOrder` entry shapes fail the schema —
 * an externally-authored file read is exactly the edge Principle IV
 * requires validating, and a resolver whose shape this doesn't recognize
 * can't be trusted to label modes correctly.
 */
const ResolverFileSchema = z.object({
	resolutionOrder: z.array(
		z.union([ResolverSetSchema, ResolverModifierSchema]),
	),
});

/** Mode name -> the files contributing to it, in precedence order (last wins on a path conflict). */
export interface ResolverModes {
	readonly filesByMode: ReadonlyMap<string, readonly string[]>;
	readonly modes: readonly string[];
}

function refToRelativePath(ref: string): string {
	// Resolver $refs are relative paths from the resolver file's own
	// directory (e.g. "./dark.json"); this feature's directory-wide index
	// keys everything by path relative to the token root, and the resolver
	// file always lives at that root, so stripping a leading "./" is the
	// entire normalization needed.
	return ref.startsWith("./") ? ref.slice(2) : ref;
}

/**
 * Builds `filesByMode` from a validated resolver document: every mode name
 * comes from the first (and, per this feature's scope, only) `"modifier"`
 * entry's `contexts`, and each mode's file list is every `"set"` entry's
 * sources, in order, followed by that mode's own context sources — so a
 * later file in the list is the one that wins when a path is defined more
 * than once (spec FR-005).
 */
function buildResolverModes(
	document: z.infer<typeof ResolverFileSchema>,
): ResolverModes | undefined {
	const baseFiles = document.resolutionOrder
		.filter((entry) => entry.type === "set")
		.flatMap((entry) => entry.sources.map((s) => refToRelativePath(s.$ref)));

	const modifier = document.resolutionOrder.find(
		(entry) => entry.type === "modifier",
	);
	if (modifier === undefined) {
		return undefined;
	}

	const modes = Object.keys(modifier.contexts);
	const filesByMode = new Map<string, readonly string[]>(
		modes.map((mode) => [
			mode,
			[
				...baseFiles,
				...(modifier.contexts[mode] ?? []).map((s) =>
					refToRelativePath(s.$ref),
				),
			],
		]),
	);

	return { filesByMode, modes };
}

function isEnoent(cause: unknown): boolean {
	return (
		cause instanceof Error && (cause as NodeJS.ErrnoException).code === "ENOENT"
	);
}

/**
 * Reads and validates `tokens.resolver.json` at the root of `rootDir`, when
 * present, to learn which files belong to which mode.
 *
 * Resolves to `undefined` — not an error — in two distinct cases: the file
 * is genuinely absent (the token set simply defines no modes; callers then
 * identify definitions by filename alone, per spec FR-005), or it exists
 * but fails to parse as JSON or validate against the expected resolver
 * shape (mode labels are an enhancement on top of showing values, not a
 * prerequisite for it, so a malformed resolver degrades gracefully with a
 * logged warning rather than failing the page). A read failure for any
 * other reason (e.g. a permissions error) is a genuine `UnknownError`,
 * mirroring `read.ts`'s `classifyReadError` precedent for the same
 * ENOENT-vs-everything-else distinction.
 */
export function loadResolverModes(
	rootDir: string,
	logger: Logger = consoleLogger,
	readFileFn: ReadTextFile = nodeReadFile,
): ResultAsync<ResolverModes | undefined, UnknownError> {
	return new ResultAsync(
		(async (): Promise<Result<ResolverModes | undefined, UnknownError>> => {
			let raw: string;
			try {
				raw = await readFileFn(`${rootDir}/${RESOLVER_FILE_NAME}`);
			} catch (cause) {
				if (isEnoent(cause)) {
					return ok(undefined);
				}
				return err(toLoggedUnknownError(logger, cause, "loadResolverModes"));
			}

			let parsed: unknown;
			try {
				parsed = JSON.parse(raw);
			} catch (cause) {
				logger.error(
					{ cause, context: "loadResolverModes" },
					`${RESOLVER_FILE_NAME} is not valid JSON; proceeding without modes`,
				);
				return ok(undefined);
			}

			const validation = ResolverFileSchema.safeParse(parsed);
			if (!validation.success) {
				logger.error(
					{ issues: validation.error.issues, context: "loadResolverModes" },
					`${RESOLVER_FILE_NAME} does not match the expected resolver shape; proceeding without modes`,
				);
				return ok(undefined);
			}
			return ok(buildResolverModes(validation.data));
		})(),
	);
}
