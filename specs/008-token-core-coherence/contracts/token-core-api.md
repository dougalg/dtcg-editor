# Contract: `packages/token-core` Public API (post-feature)

`token-core` is a library, not a network service — its "contract" is the surface re-exported from `src/index.ts`. This documents the delta from today's surface; everything not listed is unchanged.

## New exports

```ts
// classify-value.ts
export function classifyValue(value: unknown): DtcgTokenType | undefined;
```
Given a token's raw `$value`, returns the single `DtcgTokenType` whose known value schema matches it, or `undefined` if zero or more than one schema matches (ambiguous or unrecognized). Pure, total, no `Result` wrapper (cannot fail — "no match" is a valid, expected output, not an error).

```ts
// resolve-effective.ts (internal to parse.ts/edit.ts; exported for direct/test use if needed)
export function resolveEffectiveDocument(document: TokenDocument): TokenDocument;
```
Walks the whole tree once and returns a new `TokenDocument` where every node's `effectiveType`/`effectiveDeprecated` (and, for tokens, `inferredType`) are materialized. Called internally by `parseTokenFile` and `applyTokenEdits` as their final step (see `data-model.md`'s revised Research Task 2 decision) — most callers never need to call this directly, but it is exported for tests and for any caller holding a hand-built `TokenDocument` outside the normal parse/edit path.

## Changed exports

```ts
// types.ts
export interface TokenNode {
	// ...existing fields unchanged...
	readonly effectiveType: string | undefined;       // NEW
	readonly effectiveDeprecated: boolean | string | undefined; // NEW
	readonly inferredType: string | undefined;         // NEW
}
export interface GroupNode {
	// ...existing fields unchanged...
	readonly effectiveType: string | undefined;       // NEW
	readonly effectiveDeprecated: boolean | string | undefined; // NEW
}
```
**Breaking for any code hand-constructing a `TokenNode`/`GroupNode` literal** (e.g. existing test fixtures across the monorepo that build nodes by hand, per `resolve-type.test.ts`'s `group(...)` helper) — every such fixture must add the 2–3 new required fields. `tasks.md` must enumerate every test file constructing node literals so none is missed (FR-009's "update every call site in the same change").

```ts
// edit.ts
export interface TokenEdit {
	// ...existing fields unchanged...
	readonly type?: string; // NEW — sets declaredType, token nodes only
}
```
Non-breaking (optional field addition).

## Unchanged (kept as internal primitives, per spec Assumption)

```ts
export function resolveEffectiveType(node: DtcgNode, ancestors: readonly GroupNode[]): string | undefined;
export function findNode(root: GroupNode, path: readonly string[]): { node: DtcgNode; ancestors: readonly GroupNode[] } | undefined;
```
Both remain exported, unchanged in behavior and signature. `resolveEffectiveType` becomes an internal building block `resolveEffectiveDocument` calls per node rather than something external callers invoke directly for that purpose; `findNode` continues to be used both by `resolveEffectiveDocument` (internally, to walk ancestors) and by `edit.ts`/`route.ts`/`reference-index.ts` for its original purpose (locating a node by path), which is orthogonal to effective-type resolution.

## Contract: `apps/web-app`'s `PATCH /api/tokens/[...path]` request body

```ts
// edit-request.ts — EditRequestSchema, one item of `edits[]`
{
  path: string[];
  name?: string;
  value?: unknown;
  type?: string;        // NEW — validated as a string here; narrowed to DtcgTokenType in route.ts via isDtcgTokenType, same edge pattern as the existing type-authorization check
  description?: string;
}
```
Additive, non-breaking to existing clients (new field is optional).

## Non-goals of this contract

- No new HTTP endpoint or route.
- No change to `serializeTokenFile`'s output shape for a document with no `type` edits applied (round-trip fidelity, verified in `data-model.md`).
- `@styleframe/dtcg` is not part of this or any `token-core` contract — FR-008.
