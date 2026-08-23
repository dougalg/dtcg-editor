import type {
	DtcgNode,
	GroupNode,
	ReferenceLookup,
	ResolutionChain,
	TokenReference,
} from "@dtcg-editor/token-core";
import {
	collectReferences,
	findNode,
	resolveEffectiveType,
	resolveReference,
} from "@dtcg-editor/token-core";
import type { LoadedTokenFile } from "./load-directory.ts";
import type { ResolverModes } from "./resolver-file.ts";

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

// A NUL byte can't appear in a token path segment (DTCG forbids `.`, `{`,
// `}`, but this app never emits NUL in a path either way) or in a filename
// on any platform this app runs on, so it's a safe, unambiguous separator
// for a composite (file, path) key.
function fileAndPathKey(file: string, key: string): string {
	return `${file}\u0000${key}`;
}

/** One place a token path is defined. A path may have several — see `ReferenceIndex.definitions`. */
export interface TokenDefinition {
	readonly path: readonly string[];
	readonly file: string;
	/** From the resolver file; `undefined` when the token set defines no
	 * modes, or when this path has only one definition and so needs none. */
	readonly mode: string | undefined;
	readonly value: unknown;
	readonly effectiveType: string | undefined;
}

/** An entry in a target's reverse index: one other token that references it directly. */
export interface ReferencingToken {
	readonly path: readonly string[];
	readonly file: string;
}

/**
 * The whole-directory index. `documentsByFile` is not part of this
 * feature's original contract sketch but is needed at `buildReferenceView`
 * time to resolve a reference's lookup against the correct file's node
 * tree — kept here rather than threaded as a separate parameter, since
 * `buildReferenceView`'s signature takes only `(index, relativePath)`.
 */
export interface ReferenceIndex {
	readonly definitions: ReadonlyMap<string, readonly TokenDefinition[]>;
	readonly referencesFrom: ReadonlyMap<string, readonly TokenReference[]>;
	readonly referencedBy: ReadonlyMap<string, readonly ReferencingToken[]>;
	readonly modes: readonly string[];
	readonly documentsByFile: ReadonlyMap<string, GroupNode>;
}

interface RawOccurrence {
	readonly path: readonly string[];
	readonly file: string;
	readonly value: unknown;
	readonly effectiveType: string | undefined;
}

function collectOccurrences(
	root: GroupNode,
	file: string,
): {
	readonly tokens: readonly RawOccurrence[];
	readonly groupPaths: ReadonlySet<string>;
} {
	const tokens: RawOccurrence[] = [];
	const groupPaths = new Set<string>();

	function walk(node: DtcgNode, ancestors: readonly GroupNode[]): void {
		if (node.kind === "token") {
			tokens.push({
				path: node.path,
				file,
				value: node.value,
				effectiveType: resolveEffectiveType(node, ancestors),
			});
			return;
		}
		if (node.path.length > 0) {
			groupPaths.add(pathKey(node.path));
		}
		const childAncestors = [...ancestors, node];
		for (const child of node.children.values()) {
			walk(child, childAncestors);
		}
	}

	walk(root, []);
	return { tokens, groupPaths };
}

function toDefinition(
	occ: RawOccurrence,
	mode: string | undefined,
): TokenDefinition {
	return {
		path: occ.path,
		file: occ.file,
		mode,
		value: occ.value,
		effectiveType: occ.effectiveType,
	};
}

/**
 * Builds the `TokenDefinition[]` for one path from its raw occurrences.
 * A path defined in exactly one file is unambiguous — a single entry,
 * `mode: undefined`. A path defined in more than one file is resolved once
 * per mode (spec FR-005): for each mode, the occurrence whose file appears
 * *last* in that mode's file precedence order wins (matching how the real
 * resolver composes files — a later source overrides an earlier one for
 * the same path). When there's no resolver at all, every raw occurrence is
 * listed instead, since there's no principled way to pick a winner without
 * one.
 */
function buildDefinitionsForPath(
	occurrences: readonly RawOccurrence[],
	resolverModes: ResolverModes | undefined,
): readonly TokenDefinition[] {
	if (occurrences.length <= 1) {
		return occurrences.map((occ) => toDefinition(occ, undefined));
	}
	if (resolverModes === undefined) {
		return occurrences.map((occ) => toDefinition(occ, undefined));
	}

	const perMode: TokenDefinition[] = [];
	for (const mode of resolverModes.modes) {
		const fileOrder = resolverModes.filesByMode.get(mode) ?? [];
		let winner: RawOccurrence | undefined;
		let winnerRank = -1;
		for (const occ of occurrences) {
			const rank = fileOrder.indexOf(occ.file);
			if (rank > winnerRank) {
				winner = occ;
				winnerRank = rank;
			}
		}
		if (winner !== undefined) {
			perMode.push(toDefinition(winner, mode));
		}
	}
	// Defensive fallback: if this path's files don't appear in any mode's
	// file list at all (a resolver that doesn't actually cover this file),
	// fall back to listing every raw occurrence rather than silently
	// producing zero definitions for a path that demonstrably exists.
	return perMode.length > 0
		? perMode
		: occurrences.map((occ) => toDefinition(occ, undefined));
}

/**
 * Walks every loaded file once, recording every token's definition,
 * forward references, and reverse edges in the same pass. Pure and
 * synchronous — all I/O already happened in `loadTokenDirectory`.
 */
export function buildReferenceIndex(
	files: readonly LoadedTokenFile[],
	resolverModes?: ResolverModes,
): ReferenceIndex {
	const documentsByFile = new Map<string, GroupNode>();
	const allTokens: RawOccurrence[] = [];
	const groupPathToFile = new Map<string, string>();

	for (const file of files) {
		documentsByFile.set(file.relativePath, file.document.root);
		const { tokens, groupPaths } = collectOccurrences(
			file.document.root,
			file.relativePath,
		);
		allTokens.push(...tokens);
		for (const groupPath of groupPaths) {
			if (!groupPathToFile.has(groupPath)) {
				groupPathToFile.set(groupPath, file.relativePath);
			}
		}
	}

	const occurrencesByPath = new Map<string, RawOccurrence[]>();
	for (const occ of allTokens) {
		const key = pathKey(occ.path);
		const list = occurrencesByPath.get(key);
		if (list === undefined) {
			occurrencesByPath.set(key, [occ]);
		} else {
			list.push(occ);
		}
	}

	const definitions = new Map<string, readonly TokenDefinition[]>();
	for (const [key, occurrences] of occurrencesByPath) {
		definitions.set(key, buildDefinitionsForPath(occurrences, resolverModes));
	}

	// referencesFrom deliberately includes an empty array for a token with
	// no references (not just tokens that have some) — buildReferenceView
	// discovers every token in a file by scanning this map's keys for that
	// file's prefix, so a token with nothing to reference still needs an
	// entry for its `referencedBy` list (if any) to be found.
	const referencesFrom = new Map<string, readonly TokenReference[]>();
	const referencedBy = new Map<string, ReferencingToken[]>();

	for (const occ of allTokens) {
		const key = pathKey(occ.path);
		const refs = collectReferences(occ.value);
		referencesFrom.set(fileAndPathKey(occ.file, key), refs);

		for (const ref of refs) {
			const targetKey = pathKey(ref.targetPath);
			const list = referencedBy.get(targetKey) ?? [];
			// De-duplicates by the referencing token's own path, not by file or
			// by how many reference sites within its value point at this same
			// target — spec FR-019: a distinct referencing token counts once,
			// however many times (or from however many of its own definitions)
			// it references this target.
			if (!list.some((referrer) => pathKey(referrer.path) === key)) {
				list.push({ path: occ.path, file: occ.file });
			}
			referencedBy.set(targetKey, list);
		}
	}

	return {
		definitions,
		referencesFrom,
		referencedBy,
		modes: resolverModes?.modes ?? [],
		documentsByFile,
	};
}

/** One reference site's resolution, one outcome per mode when its target is multiply defined. */
export interface ResolvedOutcome {
	readonly mode: string | undefined;
	readonly chain: ResolutionChain;
	readonly targetFile: string | undefined;
}

/** A single reference found in a token's value, together with every outcome resolving it produces. */
export interface ResolvedReference {
	readonly reference: TokenReference;
	readonly outcomes: readonly ResolvedOutcome[];
}

/** The per-file slice handed from the Server Component to the client. */
export interface TokenReferenceView {
	readonly references: ReadonlyMap<string, readonly ResolvedReference[]>;
	readonly referencedBy: ReadonlyMap<string, readonly ReferencingToken[]>;
}

/**
 * Builds a `ReferenceLookup` that resolves any path as it would appear
 * under `mode` specifically: a token with more than one definition picks
 * the one tagged with `mode` (falling back to the last-listed definition if
 * none matches, which only happens for a path whose definitions predate any
 * resolver), a token with exactly one definition uses it regardless of
 * `mode`, and a path found only among tracked group paths resolves to that
 * group (its own file/mode are irrelevant to the caller, since
 * `resolveReference` never carries a group hit's file/mode into a chain
 * step — it returns `group-target` immediately instead).
 */
function lookupForMode(
	index: ReferenceIndex,
	mode: string | undefined,
): ReferenceLookup {
	return (path) => {
		const key = pathKey(path);
		const defs = index.definitions.get(key);
		if (defs !== undefined && defs.length > 0) {
			const chosen =
				defs.length === 1
					? defs[0]
					: (defs.find((d) => d.mode === mode) ?? defs.at(-1));
			if (chosen !== undefined) {
				const root = index.documentsByFile.get(chosen.file);
				const located = root !== undefined ? findNode(root, path) : undefined;
				if (located !== undefined) {
					return {
						node: located.node,
						effectiveType: resolveEffectiveType(
							located.node,
							located.ancestors,
						),
						file: chosen.file,
						mode: chosen.mode,
					};
				}
			}
		}

		for (const [file, root] of index.documentsByFile) {
			const located = findNode(root, path);
			if (located !== undefined && located.node.kind === "group") {
				return {
					node: located.node,
					effectiveType: undefined,
					file,
					mode: undefined,
				};
			}
		}
		return undefined;
	};
}

function resolveReferenceSite(
	reference: TokenReference,
	index: ReferenceIndex,
): ResolvedReference {
	const targetKey = pathKey(reference.targetPath);
	const targetDefs = index.definitions.get(targetKey);
	// Per-mode outcomes are produced only when the target is genuinely
	// multiply defined (spec FR-005) — an unresolvable, group, or circular
	// target gets exactly one outcome regardless of how many modes the
	// token set defines, since there's nothing mode-specific to disambiguate.
	const modesToTry: readonly (string | undefined)[] =
		targetDefs !== undefined && targetDefs.length > 1
			? targetDefs.map((d) => d.mode)
			: [undefined];

	const outcomes = modesToTry.map((mode): ResolvedOutcome => {
		const chain = resolveReference(reference, lookupForMode(index, mode));
		const targetFile =
			chain.outcome.kind === "resolved" ? chain.steps.at(-1)?.file : undefined;
		return { mode, chain, targetFile };
	});

	return { reference, outcomes };
}

/**
 * Extracts the per-file slice a page needs: for each token defined in
 * `relativePath`, its resolved references (omitted when it holds none) and
 * its referrer list (omitted when empty, so no "referenced N times"
 * indicator renders at zero — spec FR-021).
 */
export function buildReferenceView(
	index: ReferenceIndex,
	relativePath: string,
): TokenReferenceView {
	const prefix = fileAndPathKey(relativePath, "");
	const references = new Map<string, readonly ResolvedReference[]>();
	const referencedBy = new Map<string, readonly ReferencingToken[]>();

	for (const [key, refs] of index.referencesFrom) {
		if (!key.startsWith(prefix)) {
			continue;
		}
		const tokenPathKey = key.slice(prefix.length);

		if (refs.length > 0) {
			references.set(
				tokenPathKey,
				refs.map((ref) => resolveReferenceSite(ref, index)),
			);
		}

		const referrers = index.referencedBy.get(tokenPathKey);
		if (referrers !== undefined && referrers.length > 0) {
			referencedBy.set(tokenPathKey, referrers);
		}
	}

	return { references, referencedBy };
}
