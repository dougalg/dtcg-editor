---
description: "Task list for fontFamily token editor support"
---

# Tasks: Font Family Token Editor Support

**Input**: Design documents from `specs/012-font-family-token-support/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required — Principle XIII (TDD, NON-NEGOTIABLE) mandates every behavior change be
driven by a test observed failing first. Test tasks are ordered before their implementation task
in every phase below. Every behavioral task below carries the `tdd/test-list.md` behavior id(s)
it covers in brackets (e.g. `[U5]`, `[A2]`) — this marker is load-bearing: `speckit-tdd-run` ticks
a task's checkbox only once it can read a behavior id from it and that behavior's test is
observed failing-then-passing. Tasks with no behavior marker are structural/setup and are ticked
directly.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P2).

## Format: `[ID] [P?] [Story] [Behavior?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3)
- **[U#]/[A#]**: `tdd/test-list.md` behavior id(s) this task drives to green

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create package scaffold `packages/token-editor-font-family/` (package.json,
      tsconfig.json, vitest.setup.ts, vitest-a11y-tags.ts, src/css-modules.d.ts,
      src/vitest-env.d.ts), mirroring `packages/token-editor-font-weight`'s equivalent files
      file-for-file (same devDependencies plus `@dtcg-editor/design-system`, same
      `build`/`test`/`lint` scripts, package name `@dtcg-editor/token-editor-font-family`)
- [X] T002 Run `pnpm install` at repo root so the new workspace package and its
      `@dtcg-editor/token-core`/`@dtcg-editor/token-editor-contract`/`@dtcg-editor/design-system`
      dependencies (added via `pnpm add --filter @dtcg-editor/token-editor-font-family`, per
      CLAUDE.md's pnpm rule) are linked
- [X] T003 [P] Add `"packages/token-editor-font-family"` to the `packages` array in
      `vitest.config.mts` so its `.test.tsx`/`.a11y.test.tsx` files run under the shared
      unit/a11y Vitest projects

**Checkpoint**: package scaffold exists and is wired into the workspace/test runner; no source
code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `token-core`'s schema is the shared prerequisite every user story's `Editor`/
`Preview` component depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [U1] [U2] [U3] [U4] [U5] [U6] [U7] Write failing `node:test` cases in
      `packages/token-core/src/font-family.test.ts` for `FontFamilyValueSchema`: accepts a
      single string (U1); accepts an array of strings (U2); accepts an empty array (U3); rejects
      an array containing a non-string element (U4); rejects a bare number (U5); rejects `null`
      (U6); rejects a plain object (U7). Run it, confirm it fails (module doesn't exist yet), and
      record the observed red in `specs/012-font-family-token-support/tdd/cycle-log.md`
- [X] T005 [U1] [U2] [U3] [U4] [U5] [U6] [U7] Implement `FontFamilyValueSchema`/`FontFamilyValue`
      in `packages/token-core/src/font-family.ts` (`z.union([z.string(), z.array(z.string())])`,
      matching `font-weight.ts`'s JSDoc/export shape) — smallest change to make T004 pass; record
      the green in `tdd/cycle-log.md`
- [X] T006 [P] Export `FontFamilyValueSchema`/`FontFamilyValue` from
      `packages/token-core/src/index.ts`
- [X] T007 [U1] [U2] [U3] [U4] [U5] [U6] [U7] Run `pnpm --filter @dtcg-editor/token-core test`
      and confirm all font-family cases (U1-U7) pass (green); refactor while green if needed

**Checkpoint**: `FontFamilyValueSchema` exists, tested, exported — user story work can begin.

---

## Phase 3: User Story 1 - Edit a fontFamily token's fallback stack (Priority: P1) 🎯 MVP

**Goal**: A dedicated list editor for the array form of `$value`: add, remove, reorder.

**Independent Test**: Open a `fontFamily` token with an array `$value`; confirm the list editor
renders each entry, and add/remove/reorder interactions update `$value` correctly.

### Tests for User Story 1 ⚠️

> Write these tests FIRST, run them, confirm they fail (module/component doesn't exist yet).

- [X] T008 [P] [US1] [A1] [A2] [A3] [A4] [A5] [U8] [U9] [U10] Write failing tests in
      `packages/token-editor-font-family/src/components/FontFamilyEditor/FontFamilyEditor.test.tsx`
      covering: renders an array value as one row per entry (A1); "Add" appends a new entry
      (A2); "Remove" removes the targeted entry (A3), including removing the last remaining
      entry down to `onChange([])` (U8); "move up"/"move down" swap adjacent entries (A4) and
      are disabled/no-op at the top (U9) and bottom (U10) respectively; submitting a
      blank/whitespace-only entry does not call `onChange` (A5). Run it, confirm it fails
      (component doesn't exist yet), and record the observed red in
      `specs/012-font-family-token-support/tdd/cycle-log.md`

### Implementation for User Story 1

- [X] T009 [US1] [A1] [A2] [A3] [A4] [A5] [U8] [U9] [U10] Implement `FontFamilyEditor` in
      `packages/token-editor-font-family/src/components/FontFamilyEditor/FontFamilyEditor.tsx`
      using `@dtcg-editor/design-system`'s `Input`/`Button` for rows and add/remove/move
      controls, satisfying T008 (array-form behaviors only in this pass) — smallest change to go
      green; record the green in `tdd/cycle-log.md`
- [X] T010 [US1] Add
      `packages/token-editor-font-family/src/components/FontFamilyEditor/FontFamilyEditor.module.css`
      using `--dtcg-ed-*` custom properties only (Principle XII)
- [X] T011 [US1] [A1] [A2] [A3] [A4] [A5] [U8] [U9] [U10] Run the new `FontFamilyEditor.test.tsx`
      suite, confirm all green (all of A1-A5, U8-U10 must be green before User Story 1 is
      considered complete); refactor while green

**Checkpoint**: User Story 1's array-form add/remove/reorder editing is fully functional and
independently testable.

---

## Phase 4: User Story 2 - Edit a fontFamily token authored as a single string (Priority: P1)

**Goal**: The same `FontFamilyEditor` promotes a string `$value` to a one-item list, and
preserves the string shape on serialize when left at exactly one entry.

**Independent Test**: Open a `fontFamily` token with a string `$value`; confirm the list editor
shows one entry; confirm editing that entry's text keeps `onChange` calls as a string; confirm
adding a second entry switches `onChange` calls to an array.

### Tests for User Story 2 ⚠️

- [X] T012 [P] [US2] [A6] [A7] [A8] Write failing tests (extending `FontFamilyEditor.test.tsx`)
      covering: a string `value` prop renders exactly one row showing that string (A6); editing
      the sole entry's text calls `onChange` with a new string, not a one-item array (A7);
      adding a second entry to a string-sourced single-item list calls `onChange` with a
      two-element array (A8); removing back down to one entry from an array-sourced list calls
      `onChange` with a bare string (A8, reverse direction). Run it, confirm it fails, and
      record the observed red in `tdd/cycle-log.md`

### Implementation for User Story 2

- [X] T013 [US2] [A6] [A7] [A8] Extend `FontFamilyEditor.tsx`'s internal state/`onChange`
      boundary logic to satisfy T012's string-vs-array rules (see `data-model.md`'s boundary
      table) — smallest change to go green; record the green in `tdd/cycle-log.md`
- [X] T014 [US2] [A6] [A7] [A8] Run the full `FontFamilyEditor.test.tsx` suite (US1 + US2
      cases), confirm all green (A6-A8 must be green before User Story 2 is considered
      complete); refactor while green

**Checkpoint**: Both on-disk shapes (string, array) are fully editable through one control.

---

## Phase 5: User Story 3 - See a readable preview of a fontFamily token's resolved value (Priority: P2)

**Goal**: A read-only `Preview` component: comma-joined rendering, "+N more" truncation, and
decline-to-render on schema mismatch.

**Independent Test**: Render `FontFamilyPreview` with a string value, a short array, a long
array (>3 entries), and a schema-invalid value; confirm each renders per spec.

### Tests for User Story 3 ⚠️

- [X] T015 [P] [US3] [A9] [A10] [A11] [A12] [U11] Write failing tests in
      `packages/token-editor-font-family/src/components/FontFamilyPreview/FontFamilyPreview.test.tsx`
      covering: a string value renders as itself (A10); a short array
      (`["Arial", "sans-serif"]`) renders `"Arial, sans-serif"` (A9); an array of more than 3
      entries renders the first 3 comma-joined plus `"+N more"` (A11); an empty array renders
      empty text without throwing (U11); a schema-invalid value (e.g. `{ not: "valid" }`, or an
      array containing a number) renders nothing, `container.firstChild` is `null` (A12). Run
      it, confirm it fails, and record the observed red in `tdd/cycle-log.md`

### Implementation for User Story 3

- [X] T016 [US3] [A9] [A10] [A11] [A12] [U11] Implement `FontFamilyPreview` in
      `packages/token-editor-font-family/src/components/FontFamilyPreview/FontFamilyPreview.tsx`,
      mirroring `FontWeightPreview`'s validate-then-render pattern, satisfying T015 — smallest
      change to go green; record the green in `tdd/cycle-log.md`
- [X] T017 [US3] Add
      `packages/token-editor-font-family/src/components/FontFamilyPreview/FontFamilyPreview.module.css`
      using `--dtcg-ed-*` custom properties only
- [X] T018 [US3] [A9] [A10] [A11] [A12] [U11] Run the new `FontFamilyPreview.test.tsx` suite,
      confirm all green (A9-A12, U11 must be green before User Story 3 is considered complete);
      refactor while green

**Checkpoint**: All three user stories are independently functional and tested.

---

## Phase 6: Contract Wiring & Registration

**Purpose**: Wire the tested components into the `TokenTypeContract` and register the built-in
type so the host app actually uses them (closes SC-001).

- [X] T019 Implement `fontFamilyTokenType: TokenTypeContract<FontFamilyValue>` in
      `packages/token-editor-font-family/src/token-type.ts` per
      `contracts/token-type-contract.md` (`valueSchema: FontFamilyValueSchema`,
      `serializeValue: (value) => value`, `Editor: FontFamilyEditor`, `Preview: FontFamilyPreview`)
- [X] T020 [P] Create `packages/token-editor-font-family/src/index.ts` exporting
      `FontFamilyEditor`, `FontFamilyPreview`, `fontFamilyTokenType`
- [X] T021 Register `"fontFamily"` in `apps/web-app/lib/token-editors/built-in.ts`'s
      `BUILT_IN_TOKEN_TYPES` array and add the matching `fontFamily: fontFamilyTokenType as
      unknown as TokenTypeContract<unknown>` entry to `builtInContractsByType` (shared file —
      expect a rebase conflict with a sibling `strokeStyle` in-flight feature; that's expected)
- [X] T022 Add `.a11y.test.tsx` files for both components
      (`FontFamilyEditor.a11y.test.tsx`, `FontFamilyPreview.a11y.test.tsx`), matching
      `token-editor-font-weight`'s WCAG 2.2 AA pattern (`vitest-a11y-tags.ts`); run and confirm
      zero violations across representative value states (empty list, one entry, multiple
      entries, long list for Preview)

**Checkpoint**: `fontFamily` tokens are fully editable/previewable end-to-end in the web app.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T023 [P] Add `FontFamilyEditor.stories.tsx`/`FontFamilyPreview.stories.tsx` Storybook
      stories if this repo's other `token-editor-*` packages ship them (check
      `token-editor-font-weight` for precedent; match if present)
- [X] T024 Run `pnpm build` and `pnpm test` at repo root; fix any type-check/lint/test failures.
      `pnpm build` green across all 11 packages. `pnpm exec vitest run` (unit+a11y+bench): 786
      passed, 0 failed. `pnpm test` (full CI gate, including Playwright e2e) surfaced 2
      pre-existing web-app unit tests that hard-coded `fontFamily` as their "still unsupported"
      exemplar (fixed, see tdd/cycle-log.md) and 5 pre-existing, unrelated Playwright e2e
      failures already documented on `main` (commit `6248e38`) as a known flake baseline with
      its own tracked backlog item (`fix-editing-perf-ci-flake`) — not touched by this feature.
- [ ] T025 Execute `quickstart.md`'s manual validation steps against the running web app
      (`pnpm dev`) — NOT performed in this session (no interactive browser available); the
      equivalent scenarios are exercised by `FontFamilyEditor.test.tsx`/`FontFamilyPreview.test.tsx`
      at the component level instead. Left open for a human/manual pass before merge.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational; extends the same `FontFamilyEditor.tsx`
  file US1 creates, so it runs after Phase 3 completes (same-file, not a true story-independence
  violation — both stories together fully define one component's contract)
- **User Story 3 (Phase 5)**: Depends on Foundational only (separate `FontFamilyPreview`
  component/file) — can run in parallel with Phases 3-4 if staffed separately
- **Contract Wiring (Phase 6)**: Depends on Phases 3, 4, and 5 all being complete
- **Polish (Phase 7)**: Depends on Phase 6

### Parallel Opportunities

- T003 can run parallel to T001/T002 once the scaffold files exist
- T006 can run parallel to T007
- Phase 5 (US3, `FontFamilyPreview`) can be developed in parallel with Phases 3-4 (US1/US2,
  `FontFamilyEditor`) since they're separate files
- T020 can run parallel to T019 once both exist textually (index.ts just re-exports)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (array-form editing)
4. **STOP and VALIDATE**: array-form add/remove/reorder works end-to-end in isolation (component
   test level)
5. Continue to Phase 4 (string-form support) before considering the Editor complete, since both
   P1 stories together define the full spec'd Editor contract

### Incremental Delivery

1. Setup + Foundational → schema ready
2. User Story 1 → array-form list editing works
3. User Story 2 → string-form promotion works (same component, extended)
4. User Story 3 → Preview works (parallel-safe with 2-3)
5. Contract Wiring & Registration → feature is live in the web app
6. Polish → stories, full-suite green, manual validation
