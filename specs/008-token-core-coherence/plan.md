# Implementation Plan: token-core Coherence Pass

**Branch**: `worktree-styleframe-dtcg-refactor` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-token-core-coherence/spec.md`

## Summary

`token-core` today drops any token with no `$type` anywhere in its ancestor chain — even when the value's shape is unambiguous (e.g. a `{colorSpace, components}` object). This feature adds a shape-based type-inference fallback (`classifyValue`) that only fires when no declared type exists and the shape unambiguously matches exactly one of `token-core`'s known value schemas, replaces the 4 duplicated ancestor-walk call sites with a single upfront resolution pass that materializes each node's effective `$type`/`$deprecated` once, extends the existing edit mechanism so a token's `$type` can be set like any other field (letting the editor pre-fill an inferred type as an acceptable suggestion), and adds a `packages/token-core/README.md`. No new runtime dependency is added; `@styleframe/dtcg` is a design reference only (per `docs/research/styleframe-dtcg-spike.md`), never adopted as code.

## Technical Context

**Language/Version**: TypeScript (strict mode, repo-wide `tsconfig.base.json`)

**Primary Dependencies**: Zod (schema validation), neverthrow (`Result`/`ResultAsync`) — both already approved dependencies of `token-core`; no new dependency added (FR-008)

**Storage**: N/A — `token-core` is a pure in-memory parse/resolve/edit/serialize library; the web app's filesystem I/O (`apps/web-app/lib/tokens/read.ts`/`write.ts`) is outside this feature's scope except for the 4 named call sites reading the new materialized fields

**Testing**: `node:test` + `node:assert/strict` for `packages/token-core` (no JSX); Vitest + `@testing-library/react` for the `apps/web-app` call sites and any editor UI touched (type-field pre-fill)

**Target Platform**: Node.js (library) / browser via Next.js (web app consumer)

**Project Type**: Monorepo library package (`packages/token-core`) + 4 call sites in a Next.js web app (`apps/web-app`)

**Performance Goals**: No regression to `reference-index.test.ts`'s existing SC-010 benchmark (`buildReferenceIndex` + `parseTokenFile` under 50ms for the existing benchmark token count) — the upfront pass adds one full tree walk per document load, replacing the ancestor-walk-per-call-site cost that already existed, so this is expected to be a wash or improvement, not a regression, but the existing benchmark test is the acceptance gate.

**Constraints**: No new runtime dependency (FR-008, Principle VIII); no public API break without updating every call site in the same change (FR-009); `token-core` stays UI/React-free (Principle VII); Result-pattern error handling throughout (Principle V); round-trip fidelity preserved — an inferred (not yet declared) type must never be serialized into the document (FR-002/SC-007, Principle IX)

**Scale/Scope**: `packages/token-core` (parse/resolve/edit modules) + 4 named `apps/web-app` files (`route.ts`, `reference-index.ts` ×2 call sites, `plain-node.ts`) + `EditRequestSchema` + the token-type editor UI's type field + one new `README.md`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Check | Status |
|---|---|---|
| I. DTCG Spec Compliance | Type inference is an internal editing convenience, never serialized as a spec deviation — an inferred type is written to `$type` only via an explicit, spec-conformant edit (FR-003a/b). Effective-`$deprecated` inheritance mirrors the existing effective-`$type` inheritance model already in the codebase; if DTCG 2025.10 does not actually define `$deprecated` as inheriting the same way `$type` does, that must be flagged explicitly in this plan (see Research Task 3) rather than silently assumed. | PASS (pending Research Task 3) |
| II. Feature-Based Code Organization | New logic (`classifyValue`, the upfront resolution pass) lives inside `token-core` alongside the code it extends, not a new layer; call-site updates stay within their existing files. | PASS |
| III. TypeScript Strictness | All new code extends the existing strict config; no `any`; materialized fields are typed, not `unknown`. | PASS |
| IV. Validation at the Edges | `classifyValue` reuses `token-core`'s existing Zod value schemas (`ColorValueSchema`, `DimensionValueSchema`) as the shape-match test — no new, separately-maintained validation logic. | PASS |
| V. Result-Pattern Error Handling | The upfront resolution pass is a pure, total function (every node gets a resolved value, including `undefined`) — it has no failure mode of its own, so it does not need to return a `Result`. `applyTokenEdits` continues returning `Result` as it already does. | PASS |
| VI. Dependency Injection | No new I/O/platform externality introduced by this feature. | N/A |
| VII. Token-Editor Package Contract | `token-core` stays React-free; the type-field pre-fill (FR-003b) is a `token-editor-*`/web-app UI concern reading `token-core`'s materialized `effectiveType`/`declaredType`, not new UI logic inside `token-core` itself. | PASS |
| VIII. Minimal Dependencies | No new dependency; `@styleframe/dtcg` is referenced only as documentation, per FR-008. | PASS |
| IX. Round-Trip Fidelity | FR-002/SC-007 explicitly forbid persisting an inferred type as a side effect — `serializeTokenFile` must keep serializing only `declaredType` (never `effectiveType`), which Phase 1 design must confirm stays true after this change. | PASS (verify in data-model.md) |
| X. Component Granularity & Testing | Any editor-UI change for the type-field pre-fill (FR-003b) is scoped to the existing type-field component, not a new one — deferred to `tasks.md`, which decomposes the actual component-level work. | PASS |
| XI. Modern Defaults | N/A — no legacy-vs-modern tooling choice in this feature. | N/A |
| XII. Design System Usage | N/A at the plan level — any UI touched for the type-field pre-fill must use existing `packages/design-system` components/tokens; enforced at task/implementation time, not a plan-time gate. | N/A |

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-token-core-coherence/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── token-core-api.md  # Phase 1 output — token-core's public API surface (library contract)
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

```text
packages/token-core/
├── src/
│   ├── classify-value.ts        # NEW — shape-based type inference (User Story 1)
│   ├── classify-value.test.ts   # NEW
│   ├── resolve-effective.ts     # NEW — single upfront resolution pass (User Story 2)
│   ├── resolve-effective.test.ts # NEW
│   ├── resolve-type.ts          # KEPT as internal primitive (ancestor walk), consumed by resolve-effective.ts
│   ├── resolve-type.test.ts     # MODIFIED (fixtures only) — hand-built TokenNode/GroupNode literals gain the 3 new fields; assertions/behavior unchanged
│   ├── resolve-reference.test.ts # MODIFIED (fixtures only) — same reason as resolve-type.test.ts
│   ├── edit.ts                  # MODIFIED — TokenEdit gains an optional `type` field (FR-003a)
│   ├── edit.test.ts             # MODIFIED — new cases for type edits
│   ├── types.ts                 # MODIFIED — TokenNode/GroupNode gain effectiveType/effectiveDeprecated + inferredType (or equivalent) fields
│   ├── index.ts                 # MODIFIED — export new public API (classifyValue, resolveDocument or equivalent)
│   ├── parse.ts                 # MODIFIED — parseTokenFile calls resolveEffectiveDocument internally as its final step (FR-004)
│   ├── parse.test.ts            # MODIFIED — asserts materialized fields on the returned document
│   ├── serialize.ts              # VERIFIED unchanged — must keep serializing only declaredType
│   ├── serialize.test.ts         # MODIFIED — new round-trip test that an inferred (undeclared) type is never serialized (Principle IX, SC-007)
│   └── ... (color.ts, dimension.ts, schema.ts, token-types.ts, reference.ts unchanged)
└── README.md                     # NEW (User Story 3, FR-007)

apps/web-app/
├── app/api/tokens/[...path]/route.ts   # MODIFIED — reads materialized field instead of resolveEffectiveType(); EditRequestSchema/TokenEdit plumbing for `type`
├── components/
│   ├── TreeTokenNode/TreeTokenNode.tsx # MODIFIED — dispatches to the new TypeSuggestion component on the inferred-but-undeclared-type path (FR-003b)
│   └── TypeSuggestion/                 # NEW — TypeSuggestion.tsx, .test.tsx, .a11y.test.tsx; built from an existing packages/design-system component per Principle XII
├── lib/tokens/
│   ├── reference-index.ts              # MODIFIED — 2 call sites (collectOccurrences, lookupForMode) read materialized field
│   ├── plain-node.ts                   # MODIFIED — reads materialized field; PlainDtcgNode gains an `inferredType` field for FR-003b's pre-fill, and `deprecated` switches to `node.effectiveDeprecated`
│   ├── edit-state.ts                   # MODIFIED — ClientEdit gains an optional `type` field
│   └── edit-request.ts                 # MODIFIED — EditRequestSchema gains an optional `type` field
```

**Structure Decision**: This is a library-and-consumers change, not a new project. All new logic lands inside the existing `packages/token-core` package (new sibling modules alongside `resolve-type.ts`/`edit.ts`, not a new package — Principle II), plus the 4 already-named `apps/web-app` call sites and the request-validation/editor-UI plumbing needed to satisfy FR-003a/b. No new top-level directory is created.

## Complexity Tracking

_No Constitution Check violations — this section is not applicable._
