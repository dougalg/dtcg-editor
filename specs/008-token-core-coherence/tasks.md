---
description: "Task list for the token-core Coherence Pass"
---

# Tasks: token-core Coherence Pass

**Input**: Design documents from `/specs/008-token-core-coherence/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/token-core-api.md, quickstart.md

**Tests**: Included per this repo's constitution (Principle X mandates unit test coverage for every unit; Principle IX mandates round-trip tests) — colocated with the code they test (`x.ts` + `x.test.ts`), per Principle II, not a separate `test/` tree.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P4) after a shared Foundational phase, since User Stories 1 and 2 both require the same new node fields and resolution-pass plumbing to exist before either can be built or tested (spec.md explicitly notes US2 "depends on User Story 1 being resolved first").

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US4, mapped to spec.md's user stories

---

## Phase 1: Setup

- [ ] T001 Confirm `packages/token-core` has no new dependency added and `@styleframe/dtcg` does not appear in `packages/token-core/package.json` (FR-008) — no code change, a pre-flight check only.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New node fields and the single upfront resolution pass that both User Story 1 and User Story 2 are built on. **No user story work can begin until this phase is complete.**

- [ ] T002 Add `effectiveType: string | undefined` and `effectiveDeprecated: boolean | string | undefined` to both `TokenNode` and `GroupNode`, and `inferredType: string | undefined` to `TokenNode` only, in `packages/token-core/src/types.ts` (per data-model.md's "Entity: DtcgNode (extended)" and "Entity: TokenNode (extended)").
- [ ] T003 [P] Update the hand-built `TokenNode`/`GroupNode` literals in `packages/token-core/src/resolve-type.test.ts` to include the 3 new fields (breaking change per contracts/token-core-api.md) — set `effectiveType`/`effectiveDeprecated`/`inferredType` to values consistent with each fixture's existing `declaredType`/`deprecated` so existing assertions keep meaning.
- [ ] T004 [P] Update the hand-built `TokenNode`/`GroupNode` literals (the `token()`/group object helpers) in `packages/token-core/src/resolve-reference.test.ts` to include the 3 new fields, same approach as T003.
- [ ] T005 [P] [Foundational] Create `packages/token-core/src/classify-value.ts` exporting `classifyValue(value: unknown): DtcgTokenType | undefined`, implemented as a registry of `[DtcgTokenType, ZodSchema]` pairs seeded with `["color", ColorValueSchema]` and `["dimension", DimensionValueSchema]` (imported from `color.ts`/`dimension.ts`) — returns the single matching type, or `undefined` if zero or more than one schema matches (research.md Task 1).
- [ ] T006 [P] [Foundational] Create `packages/token-core/src/classify-value.test.ts` covering: an unambiguous color-object match, an unambiguous dimension-object match, a value matching neither (garbage), a bare 6-digit hex string (legacy color) match, and a synthetic ambiguous case (register two overlapping test-only schemas via the same registry mechanism, or test the "more than one match" branch directly) confirming `undefined` is returned for genuine ambiguity (FR-002).
- [ ] T007 Create `packages/token-core/src/resolve-effective.ts` exporting `resolveEffectiveDocument(document: TokenDocument): TokenDocument`. Walks the tree once (ancestors threaded internally, same shape as `plain-node.ts`'s `toPlainNode` walk): for each node, computes `effectiveType` via the existing `resolveEffectiveType` ancestor-walk primitive from `resolve-type.ts`, falling back to `classifyValue(node.value)` for a token with no declared type anywhere in its chain (setting `inferredType` to that same result); computes `effectiveDeprecated` via the same ancestor-precedence shape applied to `deprecated` instead of `declaredType` (research.md Task 3 — a new capability, not previously implemented anywhere). Returns a new immutable tree with every node carrying the materialized fields. Depends on T002, T005.
- [ ] T008 Create `packages/token-core/src/resolve-effective.test.ts` covering: a token with an unambiguous inferable value and no declared type anywhere in its chain gets `effectiveType`/`inferredType` set (US1 Acceptance Scenario 1); a token with an ambiguous/no-match value stays `effectiveType: undefined`, `inferredType: undefined` (US1 Scenario 2/3); a token with an explicit `$type` never gets `inferredType` set even if its value shape would also match (US1 Scenario 4); a group's own `effectiveType` resolves from its own/ancestor's `declaredType` only, never from inference (spec Edge Cases — groups have no `$value`); a token under a deprecated ancestor group (no own `$deprecated`) resolves `effectiveDeprecated` to the ancestor's value; a token with its own `$deprecated` overrides an ancestor's. Depends on T007.
- [ ] T009 Update `packages/token-core/src/parse.ts`'s `parseTokenFile` to call `resolveEffectiveDocument` on the parsed root as its final step before returning `ok({ root })`, so every `TokenDocument` `parseTokenFile` returns already has materialized fields (data-model.md's revised Research Task 2 decision). Depends on T007.
- [ ] T010 Update `packages/token-core/src/edit.ts`'s `applyTokenEdits` to call `resolveEffectiveDocument` on the rebuilt root as its final step before returning `ok({ root })`, so a document that just had edits applied has fresh materialized fields (a renamed/retyped/revalued token can change its own or descendants' effective type/deprecation). Depends on T007.
- [ ] T011 Update `packages/token-core/src/parse.test.ts` and `packages/token-core/src/edit.test.ts` (existing test files) to assert the returned document's nodes carry correct `effectiveType`/`effectiveDeprecated` values for at least one fixture each, confirming T009/T010's wiring. Depends on T009, T010.
- [ ] T012 Export `classifyValue` from `packages/token-core/src/classify-value.ts` and `resolveEffectiveDocument` from `packages/token-core/src/resolve-effective.ts` in `packages/token-core/src/index.ts`, per contracts/token-core-api.md's "New exports". Depends on T005, T007.

**Checkpoint**: `packages/token-core` builds, lints, and its full test suite passes with every `TokenDocument` now carrying materialized `effectiveType`/`effectiveDeprecated`/`inferredType` fields. User story implementation can now begin.

---

## Phase 3: User Story 1 - Untyped tokens become editable instead of dead weight (Priority: P1) 🎯 MVP

**Goal**: A token with an unambiguous, inferable value shape and no declared `$type` anywhere in its chain is editable in the token editor, with its inferred type offered as a pre-filled, explicitly-acceptable suggestion — never written automatically.

**Independent Test**: Load a token document containing such a token; confirm the editor shows it as editable with a correctly inferred type badge/suggestion, and that accepting the suggestion and saving round-trips correctly (per spec.md).

### Implementation for User Story 1

- [ ] T013 [US1] Add an optional `type?: string` field to `TokenEdit` in `packages/token-core/src/edit.ts`; in `applyOneEdit`, reject `type` on a group node (extend the existing `value`/`description`-on-group rejection branch for symmetry), and on a token node set `declaredType: edit.type ?? located.node.declaredType` in the patched token (FR-003a).
- [ ] T014 [US1] Add test cases to `packages/token-core/src/edit.test.ts`: setting `type` on a token updates `declaredType` and (after T010's wiring) the re-resolved `effectiveType`/`inferredType` reflect the now-declared type; setting `type` on a group returns a `TokenEditError`.
- [ ] T015 [US1] In `apps/web-app/app/api/tokens/[...path]/route.ts`, replace the direct `resolveEffectiveType(located.node, located.ancestors)` call (existing edit-authorization check, ~line 185) with a read of `located.node.effectiveType` — this is the one call site whose behavior change is load-bearing for this story (a previously-untyped-but-now-inferred token must pass this check to become editable, per FR-006).
- [ ] T016 [US1] In `apps/web-app/app/api/tokens/[...path]/route.ts`, thread a `type` field from the validated request body through to the `TokenEdit` passed to `applyTokenEdits`, validating it with `isDtcgTokenType` at this edge the same way the existing type-authorization check already does (FR-003a); reject with the existing `errorResponse(400, ...)` pattern if the client-provided `type` is not a recognized DTCG type.
- [ ] T017 [US1] Add `type: z.string().optional()` to the edit-item schema in `apps/web-app/lib/tokens/edit-request.ts`'s `EditRequestSchema`, mirroring `name`/`value`/`description` (contracts/token-core-api.md).
- [ ] T018 [US1] Add `readonly type?: string` to `ClientEdit` in `apps/web-app/lib/tokens/edit-state.ts`, and thread it through `applyEditsToPlainNode` so a staged type edit is reflected in the in-memory `PlainDtcgNode` tree the same way staged `value`/`description` edits already are.
- [ ] T019 [US1] Add `readonly inferredType: string | undefined` to both branches of `PlainDtcgNode` in `apps/web-app/lib/tokens/plain-node.ts`, and set it from the (now-materialized) `node.inferredType` for token nodes (`undefined` passthrough for groups, which have no such field) — this is the field the editor UI reads to render the pre-fill suggestion (FR-003b).
- [ ] T020 [US1] In `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx`, extend the "no usable type" branch (currently `isNonStandardType={effectiveType !== undefined && !isUsableType}`, around line 166–207) so that when `effectiveType === undefined && node.inferredType !== undefined`, the token renders as editable with a pre-filled, user-editable type suggestion (a control that stages `{ type: node.inferredType }` via `onStageEdit` when accepted, using the existing `pendingEdits`/`onFieldError` plumbing) rather than falling into the `DefaultValidationErrorHandler` read-only path — the suggestion is never staged/saved automatically, only on explicit user action (FR-003b, US1 Acceptance Scenario 6).
- [ ] T021 [US1] [P] Add/extend tests in `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx` covering: an inferred-but-undeclared-type token renders editable with the suggested type visible; accepting the suggestion stages a `type` edit via `onStageEdit`; a token with no inference available (ambiguous/unmatched value) still renders the existing read-only "untyped" path unchanged.
- [ ] T022 [US1] [P] Add a round-trip test (parse → resolve → serialize → re-parse) in `packages/token-core/src/serialize.test.ts` (or a new `serialize.test.ts` if none exists) confirming a token with only an *inferred* (never-accepted) type serializes with `$type` still absent — `nodeToRaw` must never read `effectiveType`/`inferredType` (Principle IX, SC-007, data-model.md's Round-Trip Fidelity Check).
- [ ] T023 [US1] Update `apps/web-app/e2e/` fixtures/tests (or add a new one) per quickstart.md Section 3: an unambiguous, undeclared-type token loads as editable with an inferred-type suggestion, and accepting + saving it persists `$type` and survives a reload.

**Checkpoint**: User Story 1 is fully functional and independently testable — an untyped-but-inferable token is now editable end-to-end, and accepting its suggested type persists as a normal declaration.

---

## Phase 4: User Story 2 - Effective type/deprecation is resolved once, not re-walked per call site (Priority: P2)

**Goal**: Every remaining call site that used to re-derive effective type via ancestor walking now reads the single upfront pass's materialized field instead.

**Independent Test**: Grep confirms no remaining ancestor-walking call sites outside the resolution pass itself; the full existing test suite for the 4 named files passes with no behavior regression (per spec.md).

### Implementation for User Story 2

- [ ] T024 [US2] In `apps/web-app/lib/tokens/reference-index.ts`'s `collectOccurrences`, replace `resolveEffectiveType(node, ancestors)` with `node.effectiveType`; if `ancestors`/`childAncestors` tracking in this function becomes unused as a result, remove it (research.md Task 2's "ancestors tracking... stops being used for resolveEffectiveType calls" — but keep `findNode`'s own ancestor tracking elsewhere untouched, since it serves path lookup, not effective-type computation).
- [ ] T025 [US2] In `apps/web-app/lib/tokens/reference-index.ts`'s `lookupForMode`, replace the `resolveEffectiveType(located.node, located.ancestors)` call with `located.node.effectiveType`.
- [ ] T026 [US2] In `apps/web-app/lib/tokens/plain-node.ts`'s `toPlainNode`, replace the `resolveEffectiveType(node, ancestors)` call with reading `node.effectiveType` directly (the `ancestors` parameter may become unused for this purpose but is still needed to recurse `childAncestors` for any remaining consumer — verify and remove only if genuinely dead). Also switch the `deprecated: node.deprecated` field on both branches to `deprecated: node.effectiveDeprecated`, so the UI reflects DTCG-spec-correct ancestor-inherited deprecation (research.md Task 3) rather than only a token's own declared value — call out this behavior change explicitly in the PR description per the Constitution Check.
- [ ] T027 [US2] Run `rg "resolveEffectiveType\(" apps/web-app` and confirm zero remaining matches (quickstart.md Section 2 / SC-002); fix any missed call site found.
- [ ] T028 [US2] [P] Update `packages/token-core/src/resolve-type.ts`'s doc comment on `resolveEffectiveType` to note it is now an internal primitive `resolve-effective.ts`'s upfront pass is built on, per the spec's own Assumptions section (User Story 2 Acceptance Scenario 3) — decision recorded: kept, not deprecated or removed, since `findNode` (which shares the file) remains directly used by `edit.ts`/`route.ts`/`reference-index.ts` for path lookup independent of effective-type resolution.
- [ ] T029 [US2] Update/extend existing tests in `apps/web-app/lib/tokens/reference-index.test.ts` and `apps/web-app/lib/tokens/plain-node.test.ts` (or add one if none exists) to assert the same results as before this migration, confirming no behavior regression (spec.md US2 Acceptance Scenario 2), plus a new case asserting a token under a deprecated ancestor group now reports `deprecated: true`/the message via `toPlainNode` (T026's behavior change).
- [ ] T030 [US2] Run the full `apps/web-app` test suite for the 4 originally-named files (`route.ts`, `reference-index.ts`, `plain-node.ts`, plus `edit.ts`'s consumers) and confirm 100% pass (SC-004), and re-run `reference-index.test.ts`'s existing SC-010 performance benchmark to confirm no regression (quickstart.md Section 5).

**Checkpoint**: All 4 originally-duplicated call sites now read the single materialized field; User Stories 1 and 2 both work independently and together.

---

## Phase 5: User Story 3 - token-core has a README explaining its shape (Priority: P3)

**Goal**: A new `packages/token-core/README.md` documents the package's purpose, its (now-updated) pipeline shape, and its full public API surface, describing the *post-change* shape from Stories 1–2.

**Independent Test**: A reviewer unfamiliar with `token-core` reads only the README and can correctly describe its pipeline stages, what "effective type" means and where it's resolved, and its full public API (per spec.md).

### Implementation for User Story 3

- [ ] T031 [US3] Write `packages/token-core/README.md` covering: the package's purpose and scope (parsing/typing/validating every DTCG token type, UI/framework-agnostic per Principle VII); its pipeline stages in order — `parseTokenFile` → `resolveEffectiveDocument` (internal, folded into parse/edit) → `applyTokenEdits` → `serializeTokenFile` — explaining what "effective type"/"effective deprecated" mean and that they're materialized once, not re-derived per call site; the full public API surface re-exported from `index.ts` (one line each); and an explicit "what this package deliberately does not do" section (no `@styleframe/dtcg` runtime dependency — design reference only, cited via `docs/research/styleframe-dtcg-spike.md` per research.md Task 4 — no filesystem/network access, no React/UI code).
- [ ] T032 [US3] [P] Cross-check the README against the actual post-Phase-4 `index.ts` exports and `resolve-effective.ts`/`edit.ts` behavior (spec.md US3 Acceptance Scenario 2) — fix any drift found.

**Checkpoint**: `packages/token-core/README.md` accurately describes the finished package.

---

## Phase 6: User Story 4 - Other coherence issues found during this pass are fixed or logged (Priority: P4)

**Goal**: Any additional naming/structural/duplicated-logic issue actually observed while doing Phases 2–5's work is either fixed in place (if small, low-risk, no public API break) or recorded as a new `docs/backlog.md` item — never fixed speculatively, never silently dropped.

**Independent Test**: Reviewing the change diff, every coherence fix outside Stories 1–3's explicit scope is small, localized, and traceable to a one-line rationale; anything larger is a new backlog item, not an in-place change (per spec.md).

- [ ] T033 [US4] Review the diff produced by T002–T032 for any other naming/structural/duplicated-logic issue actually noticed while doing that work (per this repo's existing `token-core` conventions, not `@styleframe/dtcg`'s — spec.md Assumptions). For each one found: if small and low-risk (no public API break beyond what T002–T032 already made), fix it in the same change with a one-line rationale in the commit; if larger or riskier, add a new dated item to `docs/backlog.md` instead (FR-009). If nothing is found, this task closes with no diff — it is not a mandate to invent cleanup work.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T034 [P] Run `pnpm build && pnpm lint && pnpm test` from repo root and confirm everything passes clean (quickstart.md Section 5).
- [ ] T035 Run through quickstart.md's Sections 1–6 end-to-end as a final validation pass, confirming every `SC-00N` success criterion in spec.md is actually met.
- [ ] T036 Update the `docs/backlog.md` item this feature implements (the `styleframe-dtcg-refactor` / token-core coherence line) to reflect completion, or hand off to the `archive-task` skill's normal post-implementation flow.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. **BLOCKS Phases 3–4** (both US1 and US2 need the new fields and `resolveEffectiveDocument`). T003/T004 are pure fixture updates independent of T005–T012 and can run in parallel with them, but the whole phase gates Phase 3.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independently testable/shippable as the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational. Reads the same materialized fields User Story 1 introduced consumption of in `route.ts` (T015) — T024–T026 mirror that same pattern for the other 3 call sites, so Phase 4 is easiest to start after Phase 3 lands (avoids the same file's `TreeTokenNode.tsx`/`route.ts` being touched by two in-flight stories at once), though it does not strictly require Phase 3's UI work (T020–T023) to be done first, only the Foundational phase.
- **User Story 3 (Phase 5)**: Should run last among the numbered stories — it documents the *result* of Phases 3–4 (spec.md explicitly orders it last for this reason).
- **User Story 4 (Phase 6)**: Runs after Phases 2–5, since it reviews the diff they produced.
- **Polish (Phase 7)**: Depends on all prior phases.

### Parallel Opportunities

- T003, T004, T005, T006 (Foundational) can all run in parallel — distinct files, no interdependency.
- T021, T022 (US1 tests) can run in parallel with each other once T020/T019 land.
- T028 (US2 doc comment) can run in parallel with T024–T026 (US2 call-site edits).
- T034 (build/lint/test) can run in parallel with T035 (manual quickstart walkthrough) once Phase 6 is done.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational) — the new fields and resolution pass.
2. Complete Phase 3 (User Story 1) — untyped-but-inferable tokens become editable.
3. **STOP and VALIDATE**: run quickstart.md Sections 1, 3, 4 independently.
4. This is a shippable increment even before Phase 4's remaining call-site cleanup lands, since Phase 3's T015 already migrated the one call site load-bearing for User Story 1's behavior.

### Incremental Delivery

1. Setup + Foundational → shared plumbing ready.
2. User Story 1 → validate → ship (MVP).
3. User Story 2 → validate (no user-visible behavior change, pure coherence + the flagged `effectiveDeprecated` correctness fix) → ship.
4. User Story 3 → README ships once Stories 1–2's shape is final.
5. User Story 4 → whatever incidental cleanup was actually found, or nothing.
6. Polish → full regression + backlog closure.
