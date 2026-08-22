# Contract: `token-core` reference API

New public surface added to `packages/token-core`, exported from its `index.ts` alongside `findNode` and `resolveEffectiveType`. React-free, filesystem-free, single-source-of-truth for DTCG reference syntax (Principle VII).

## Syntax

```ts
export interface TokenReference {
	readonly targetPath: readonly string[];
	readonly at: readonly (string | number)[];
	readonly raw: string;
}

/** Detects the whole-string reference form. Returns undefined for any other string. */
export function parseReference(value: unknown): TokenReference | undefined;

/** Walks a `$value` of any shape and returns every reference inside it,
 *  including references nested in composite values. */
export function collectReferences(value: unknown): readonly TokenReference[];
```

**Rules**

- A string is a reference only if it matches `{<body>}` as its *entire* content, with a non-empty body containing no `{` or `}`. `"a {b} c"` is not a reference.
- `targetPath` is the body split on `.`. Unambiguous by specification: the DTCG format forbids `.`, `{`, `}` in token and group names.
- `collectReferences` descends objects and arrays. `at` records the route to each reference within the value (`[]` = the whole value is the reference).
- Both functions are pure and total — they never throw and never return a `Result`, because "this is not a reference" is an ordinary answer, not a failure.

## Resolution

```ts
export type ChainOutcome =
	| { readonly kind: "resolved"; readonly value: unknown; readonly type: string | undefined }
	| { readonly kind: "unresolved"; readonly missingPath: readonly string[] }
	| { readonly kind: "group-target"; readonly groupPath: readonly string[] }
	| { readonly kind: "circular"; readonly cyclePath: readonly string[] };

export interface ChainStep {
	readonly path: readonly string[];
	readonly file: string;
	readonly mode: string | undefined;
}

export interface ResolutionChain {
	readonly steps: readonly ChainStep[];
	readonly outcome: ChainOutcome;
}

/** What a lookup must return for one path. `file`/`mode` are opaque to
 *  token-core — it only carries them through into the chain. */
export interface LookupHit {
	readonly node: DtcgNode;
	readonly effectiveType: string | undefined;
	readonly file: string;
	readonly mode: string | undefined;
}

export type ReferenceLookup = (path: readonly string[]) => LookupHit | undefined;

export function resolveReference(
	reference: TokenReference,
	lookup: ReferenceLookup,
): ResolutionChain;
```

**Behavior**

- Follows the chain until it reaches a token with a non-reference value, per the DTCG requirement that tools "follow each reference until they find a token with an explicit value". **No depth limit** — termination comes from cycle detection, not a cap.
- Records **every** step traversed, not just the last (spec FR-003).
- Maintains a set of visited paths; revisiting one yields `circular` with the offending path. This is what makes unbounded recursion safe.
- A `lookup` miss yields `unresolved`; a hit whose node is a group yields `group-target`.
- `resolved.type` is the *final* token's effective type, which per the DTCG spec is also the aliasing token's type.
- Pure and total. Cross-file and mode concerns live entirely in the injected `lookup`, keeping this reusable by any headless consumer (Principle VI).

## Consumers

`apps/web-app/lib/tokens/reference-index.ts` supplies a `lookup` closed over the whole-directory index. `TreeTokenNode.tsx` and `app/api/tokens/[...path]/route.ts` both call `parseReference`/`collectReferences` to decide whether a value is a reference *before* per-type validation runs — see `reference-validation.md`.
