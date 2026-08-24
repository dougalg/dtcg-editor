# Quickstart: Validating the token-core Coherence Pass

Prerequisites: repo installed (`pnpm install` from root), on this feature's branch/worktree.

## 1. Unit-level: type inference (User Story 1, SC-001)

```bash
pnpm --filter @dtcg-editor/token-core test
```
Expected: `classify-value.test.ts` and `resolve-effective.test.ts` pass, including:
- An untyped token whose `$value` is `{ colorSpace: "srgb", components: [0,0,0] }` resolves `effectiveType: "color"` and `inferredType: "color"`.
- A synthetic ambiguous-shape case (two schemas both matching) resolves `effectiveType: undefined`.
- A token with a declared `$type` never has its `inferredType` set, regardless of value shape (FR-003).

## 2. Unit-level: single upfront pass (User Story 2, SC-002)

```bash
rg "resolveEffectiveType\(" apps/web-app --type ts
```
Expected: zero matches outside `resolve-effective.ts` itself and its own test file — confirms FR-005's 4 call sites were migrated to read `node.effectiveType` directly.

```bash
pnpm --filter web-app test -- reference-index route plain-node
```
Expected: all pre-existing tests for the 4 affected files still pass (SC-004), plus new coverage for reading the materialized field.

## 3. End-to-end: inferred type becomes editable and savable (SC-001, SC-006)

```bash
pnpm dev
```
1. Open a token document with a token whose value is a well-formed `{colorSpace, components}` object and no `$type` anywhere in its ancestor chain (a fixture under `apps/web-app/e2e/fixtures/` or a hand-crafted local file).
2. Confirm the token now renders as editable (not the previous "untyped, unsupported" state) with an inferred-type badge/suggestion.
3. Accept the suggested type via the normal field-edit save action.
4. Reload the document; confirm `$type` is now present in the raw JSON and the token behaves as a normally-declared token from then on.

## 4. Round-trip fidelity guard (Principle IX, SC-007)

```bash
pnpm --filter @dtcg-editor/token-core test -- serialize
```
Expected: a new/updated round-trip test confirms a document containing only an *inferred* (not accepted/declared) type serializes with `$type` still absent for that token — parse → resolve → serialize → re-parse is a no-op on an untouched inferred-only token.

## 5. Full regression + performance gate

```bash
pnpm build && pnpm lint && pnpm test
```
Expected: all packages build/lint/test clean; `reference-index.test.ts`'s existing SC-010 benchmark assertion (`buildReferenceIndex` + `parseTokenFile` under 50ms) still passes, confirming the upfront pass didn't regress load performance.

## 6. README sanity check (User Story 3, SC-003)

Have someone unfamiliar with `token-core` read only `packages/token-core/README.md` and answer, without opening any source file:
- What does this package parse, and what's the pipeline order (parse → resolve → edit → serialize)?
- What does "effective type" mean, and where is it computed?
- What's the full public API surface (everything `index.ts` re-exports)?
- What does this package deliberately not do (no `@styleframe/dtcg` dependency, no filesystem/network access, no React)?

If they can answer all four from the README alone, SC-003 is met.
