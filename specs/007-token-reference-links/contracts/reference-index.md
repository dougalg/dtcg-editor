# Contract: whole-directory reference index

`apps/web-app/lib/tokens/reference-index.ts` (kebab-case per Principle X's `lib/` rule), plus a companion `load-directory.ts` and `resolver-file.ts`.

## Loading every file, once

```ts
export interface LoadedTokenFile {
	readonly relativePath: string;
	readonly document: TokenDocument;
}

export function loadTokenDirectory(
	rootDir: string,
	logger?: Logger,
	readDirFn?: ReadDirEntries,
	readFileFn?: ReadTextFile,
): ResultAsync<LoadedTokenFile[], UnknownError>;
```

- Extracted from the traversal currently inside `scanTokenDirectory`, which is then rewritten to consume this and reduce each document to a summary. One traversal, not two (research.md §3).
- Preserves the existing behavior exactly: recursive, symlinks skipped, and **a file that fails to parse is omitted rather than aborting the load** — which is what makes spec FR-007's "reference into an unparseable file" edge case behave correctly.
- Injected fs dependencies with real defaults, matching `scanTokenDirectory`'s existing signature (Principle VI).
- Returns `ResultAsync` because directory reads genuinely fail (Principle V).

## Modes

```ts
export interface ResolverModes {
	/** Mode name -> the files contributing to it, in precedence order. */
	readonly filesByMode: ReadonlyMap<string, readonly string[]>;
	readonly modes: readonly string[];
}

export function loadResolverModes(
	rootDir: string,
	readFileFn?: ReadTextFile,
): ResultAsync<ResolverModes | undefined, UnknownError>;
```

- Reads `tokens.resolver.json` when present, **Zod-validated** — an externally-authored file read is exactly the edge Principle IV requires validating.
- Resolves to `undefined` when no resolver file exists; callers then identify definitions by filename alone (spec FR-005).
- A malformed resolver file degrades to `undefined` with a logged warning rather than failing the page — mode labels are an enhancement, not a prerequisite for showing values.

## The index

```ts
export interface ReferenceIndex {
	readonly definitions: ReadonlyMap<string, readonly TokenDefinition[]>;
	readonly referencesFrom: ReadonlyMap<string, readonly TokenReference[]>;
	readonly referencedBy: ReadonlyMap<string, readonly ReferencingToken[]>;
	readonly modes: readonly string[];
}

export function buildReferenceIndex(
	files: readonly LoadedTokenFile[],
	resolverModes?: ResolverModes,
): ReferenceIndex;
```

- Pure and synchronous — all I/O already happened. Directly unit-testable with hand-built documents, no filesystem.
- Walks each document once, recording definitions, forward references, and reverse edges in the same pass.
- `referencedBy` de-duplicates by referencing token, so a token referencing one target twice appears once (spec FR-019).
- Measured on this project's own token set: **1.40 ms** to parse and index 16 files / 565 tokens, producing **130 reverse entries over 228 edges**, **14.6 KB** serialized.

## The per-file slice

```ts
export function buildReferenceView(
	index: ReferenceIndex,
	relativePath: string,
): TokenReferenceView;
```

- Extracts only what the file being viewed needs: resolved references for its tokens, and referrer lists for its tokens. This — not the whole index — is what crosses the Server/Client boundary.
- Resolves once per mode when a target path has multiple definitions, returning one outcome each, never silently picking a winner (spec FR-005).
- Omits empty referrer lists so no indicator renders at zero (spec FR-021).

## Lifecycle

Built per request in `app/tokens/[...path]/page.tsx`, consumed to produce the view, then discarded along with the parsed documents. **No cache, no invalidation** — see research.md §2. This is what makes the spec's "derived, never stored, so they cannot drift" assumption true by construction, which matters because this app writes token files on save.

**Verification owed during implementation**: the 1.40 ms figure is a floor measured with raw `JSON.parse`; re-measure with `token-core`'s Zod-validating `parseTokenFile` once dependencies are installed in this worktree. Only a surprising result (hundreds of ms) would reopen the caching decision.
