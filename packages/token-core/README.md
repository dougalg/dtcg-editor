# `@dtcg-editor/token-core`

Parsing, typing, and value validation for [DTCG](https://www.designtokens.org/tr/2025.10/format/) (Design Tokens Community Group) token documents — every token type's schema and shape logic lives here, once, so every consumer (this repo's editor UI, a future CLI, a server-side validator) shares one spec-conformant source of truth.

This package is completely UI/framework-agnostic: no React import, no knowledge of which (if any) editor renders a token's value, no filesystem or network access. It is a pure, in-memory data-transformation library. Rendering and registration are deliberately left to `token-editor-*` packages and their host app — see `TokenTypeContract` in `@dtcg-editor/token-editor-contract`.

## Pipeline

A token document flows through four stages, in order:

1. **Parse** (`parseTokenFile`) — turns raw DTCG JSON text into a typed `TokenDocument` tree of `TokenNode`/`GroupNode`s. Validates the envelope and per-node metadata (`$type`, `$description`, `$deprecated`) via Zod; preserves every unrecognized `$`-prefixed field verbatim for round-trip fidelity. Internally finishes by running the upfront resolution pass (step 2) before returning, so a `TokenDocument` this function returns is always fully resolved.
2. **Resolve** (`resolveEffectiveDocument`) — a single tree walk, run once per parse and once per edit batch, that materializes each node's *effective* type and deprecation status:
   - **`effectiveType`**: the node's own declared `$type`, else the nearest ancestor group's declared `$type`, else — for a token only — a shape-based inference from its `$value` (`classifyValue`) when no declaration exists anywhere in its chain, else `undefined`.
   - **`effectiveDeprecated`**: the node's own `$deprecated`, else the nearest ancestor's, else `undefined` — the same inheritance shape as `effectiveType`, generalized to deprecation.
   - **`inferredType`** (tokens only): set exactly when `effectiveType` came from shape inference rather than a declaration — the value a UI can offer as an accept-or-change suggestion, never written into the document as a side effect.

   Every call site that needs a node's effective type or deprecation status reads these materialized fields directly; nothing outside this module re-walks ancestors to compute them. `resolveEffectiveType`/`findNode` (`resolve-type.ts`) remain exported as the lower-level ancestor-walk/path-lookup primitives this pass and `edit.ts` are built on — most callers should never need them directly.
3. **Edit** (`applyTokenEdits`) — applies a batch of `TokenEdit`s (rename, retype, revalue, redescribe) to a document, producing a new immutable tree. Re-runs the resolution pass (step 2) internally before returning, so an edited document's materialized fields always reflect its current content — there is no incremental/partial recompute, and no externally-observable "stale" state between an edit and a fresh parse of the same content.
4. **Serialize** (`serializeTokenFile`) — the inverse of parse: turns a `TokenDocument` back into DTCG JSON text. Only ever writes a node's *declared* fields (`declaredType`, `description`, `deprecated`, `extensions`) — the materialized `effectiveType`/`effectiveDeprecated`/`inferredType` fields are never serialized, so an inferred-but-not-yet-accepted type can never leak into a saved file.

## Public API

Everything below is re-exported from `index.ts`.

**Parsing & serialization**
- `parseTokenFile(raw: unknown): Result<TokenDocument, TokenParseError>` — the sanctioned entry point from raw file text to a typed, fully-resolved document.
- `serializeTokenFile(document: TokenDocument): Result<string, TokenSerializeError>` — the inverse.
- `TokenParseError`, `TokenSerializeError` — the error types each can return.

**Types & structure**
- `TokenDocument`, `DtcgNode`, `TokenNode`, `GroupNode` — the parsed document model.
- `DTCG_TOKEN_TYPES`, `DtcgTokenType`, `isDtcgTokenType` — the complete set of DTCG 2025.10 `$type` values this package targets.

**Effective-field resolution** — computing each node's *effective* `$type`/`$deprecated` (declared-or-inherited-or-inferred, per Pipeline step 2 above) so downstream code never has to re-walk ancestors itself:
- `resolveEffectiveDocument(document: TokenDocument): TokenDocument` — the single upfront resolution pass; called internally by `parseTokenFile`/`applyTokenEdits`, exported for direct/test use.
- `classifyValue(value: unknown): DtcgTokenType | undefined` — shape-based type inference, given a value and no declared type in its chain.
- `resolveEffectiveType(node: DtcgNode, ancestors: readonly GroupNode[]): string | undefined`, `findNode(root: GroupNode, path: readonly string[]): { node: DtcgNode; ancestors: readonly GroupNode[] } | undefined` — lower-level primitives (`resolve-type.ts`) most callers shouldn't need directly; see Pipeline step 2.

**Editing**
- `applyTokenEdits(document: TokenDocument, edits: readonly TokenEdit[]): Result<TokenDocument, TokenEditError>` — pure: never mutates `document` or any node in it, always returns a new tree. Despite the name, it edits groups too (currently just renaming) as well as tokens, both through the same `TokenEdit` batch — `TokenEdit`, `TokenEditError`.

**References** — a *reference* is a token value pointing at another token's path via DTCG's `{a.b.c}` alias syntax; this package can detect and parse that syntax, and walk a chain of them, but has no concept of a multi-file document set on its own — the caller supplies that via `ReferenceLookup`.
- `TokenReference: { targetPath: readonly string[]; at: readonly (string | number)[]; raw: string }` — one parsed reference: `targetPath` is the dot-separated path it points to, `at` is where inside the token's `$value` it was found (empty when the reference *is* the whole value), `raw` is the original text.
- `parseReference(value: unknown): TokenReference | undefined` — detects the whole-string `{...}` form; pure and total, `undefined` just means "not a reference" (e.g. plain text, or a string merely containing braces), never a thrown error.
- `collectReferences(value: unknown): readonly TokenReference[]` — walks a `$value` of any shape (object, array, nested arbitrarily deep) and returns every reference found inside it, e.g. every color reference nested in a `shadow` token's layers.
- `ReferenceLookup: (path: readonly string[]) => LookupHit | undefined` — a caller-supplied function resolving one path to the node found there (across whatever file/document set the caller manages); `undefined` means "no node at this path."
- `LookupHit: { node: DtcgNode; effectiveType: string | undefined; file: string; mode: string | undefined }` — what a `ReferenceLookup` returns for a resolved path; `file`/`mode` are opaque to this package, only carried through into the chain for the caller's own display/bookkeeping.
- `resolveReference(reference: TokenReference, lookup: ReferenceLookup): ResolutionChain` — follows `reference` through every further reference it points to (via repeated `lookup` calls) until it reaches a token with a non-reference value, per the DTCG spec's "follow each reference until an explicit value" requirement. Pure and total: no depth limit, but a `circular` outcome (instead of an infinite loop) if a path is revisited.
- `ResolutionChain: { steps: readonly ChainStep[]; outcome: ChainOutcome }` — the full result: every token traversed (`steps`, in order — not just the final one, so a UI can show the whole chain), plus how it ended (`outcome`).
- `ChainStep: { path: readonly string[]; file: string; mode: string | undefined }` — one token traversed while following the chain.
- `ChainOutcome` — a discriminated union of how a chain ended: `{ kind: "resolved", value, type }` (reached a literal value), `{ kind: "unresolved", missingPath }` (a target in the chain doesn't exist), `{ kind: "group-target", groupPath }` (a reference points at a group, not a token), or `{ kind: "circular", cyclePath }` (a path was revisited).

**Per-type value schemas** (only types with a real schema today — see Type Coverage below)
- `color.ts`: `ColorValueSchema`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`, `COLOR_SPACES`, and the `ColorValue`/`ColorObjectValue`/`ColorSpace`/`ColorComponent` types.
- `dimension.ts`: `DimensionValueSchema`, `DimensionValue`.

## Type coverage

DTCG 2025.10 defines 13 token types (`DTCG_TOKEN_TYPES`). Today, `token-core` has a real, spec-conformant Zod value schema for only 2 of them — `color` and `dimension`. `classifyValue`'s shape-inference registry iterates whatever schemas exist, so adding a schema for another type (e.g. `fontWeight`) automatically extends inference coverage with no further change to the inference logic itself.

## What this package deliberately does not do

- **No `@styleframe/dtcg` dependency.** This package's `parse → resolve → edit → serialize` pipeline shape was informed by that library's own `parse → validate → applyInheritance → resolveAliases` staged design (see `docs/research/styleframe-dtcg-spike.md`), but the library itself was evaluated and deliberately not adopted — its `resolve()`/`resolveAliases()` abort the entire document on the first cycle or missing target found anywhere, which conflicts with this app's graceful-degradation requirement (one broken token must not block every other token from resolving). Everything in this package is hand-rolled.
- **No filesystem or network access.** A host app reads/writes files and passes raw text in and out; this package only ever transforms in-memory data.
- **No React or UI framework dependency.** Rendering and registration are `token-editor-*` packages' job, via `TokenTypeContract` (`@dtcg-editor/token-editor-contract`) — this package never imports React and has no opinion on how a value is displayed or edited.
