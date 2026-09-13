---
description: "Task list for transition token editor support"
---

# Tasks: Transition Token Editor Support

**Input**: Design documents from `specs/013-transition-token-support/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required — Principle XIII (TDD, NON-NEGOTIABLE) mandates every behavior change be
driven by a test observed failing first. Test tasks are ordered before their implementation task
in every phase below. Every behavioral task below carries the `tdd/test-list.md` behavior id(s)
it covers in brackets (e.g. `[U5]`, `[A2]`) — this marker is load-bearing: `speckit-tdd-run` ticks
a task's checkbox only once it can read a behavior id from it and that behavior's test is
observed failing-then-passing. Tasks with no behavior marker are structural/setup and are ticked
directly.

**Organization**: Tasks are grouped by user story (spec.md priorities P1, P2).

## Format: `[ID] [P?] [Story] [Behavior?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2)
- **[U#]/[A#]**: `tdd/test-list.md` behavior id(s) this task drives to green

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create package scaffold `packages/token-editor-transition/` (package.json,
      tsconfig.json, vitest.setup.ts, vitest-a11y-tags.ts, src/css-modules.d.ts,
      src/vitest-env.d.ts), mirroring `packages/token-editor-duration`'s equivalent files
      file-for-file (same devDependencies, same `build`/`test`/`lint` scripts, package name
      `@dtcg-editor/token-editor-transition`)
- [ ] T002 Run `pnpm add --filter @dtcg-editor/token-editor-transition @dtcg-editor/token-core
      @dtcg-editor/token-editor-contract @dtcg-editor/token-editor-duration
      @dtcg-editor/token-editor-cubic-bezier react zod` (workspace deps) plus the matching
      devDependencies (`@testing-library/react`, `@types/react`, `@types/react-dom`,
      `@vitejs/plugin-react`, `@vitest/browser`, `@vitest/browser-playwright`, `axe-core`,
      `jsdom`, `react-dom`, `typescript`, `vitest`, `@types/node`), per CLAUDE.md's pnpm rule
      (never hand-edit `package.json` dependency fields)
- [ ] T003 [P] Add `"packages/token-editor-transition"` to the `packages` array in
      `vitest.config.mts` so its `.test.tsx`/`.a11y.test.tsx` files run under the shared
      unit/a11y Vitest projects

**Checkpoint**: package scaffold exists, depends on both sibling editor packages, and is wired
into the workspace/test runner; no source code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `token-core`'s schema is the shared prerequisite every user story's `Editor`/
`Preview` component depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [U1] [U2] [U3] [U4] [U5] Write failing `node:test` cases in
      `packages/token-core/src/transition.test.ts` for `TransitionValueSchema`: accepts a valid
      object with all three fields (U1); rejects a value missing `duration` (U2); rejects a
      value missing `delay` (U3); rejects a value missing `timingFunction` (U4); rejects a value
      whose `duration` is itself invalid (e.g. negative `value`), proving the nested schema is
      actually enforced, not just field presence (U5). Run it, confirm it fails (module doesn't
      exist yet), and record the observed red in
      `specs/013-transition-token-support/tdd/cycle-log.md`
- [X] T005 [U1] [U2] [U3] [U4] [U5] Implement `TransitionValueSchema`/`TransitionValue` in
      `packages/token-core/src/transition.ts` (`z.object({ duration: DurationValueSchema, delay:
      DurationValueSchema, timingFunction: CubicBezierValueSchema })`, importing both sub-schemas
      rather than redefining them, matching `duration.ts`/`cubic-bezier.ts`'s JSDoc/export shape)
      — smallest change to make T004 pass; record the green in `tdd/cycle-log.md`
- [X] T006 [P] Export `TransitionValueSchema`/`TransitionValue` from
      `packages/token-core/src/index.ts`
- [X] T007 [U1] [U2] [U3] [U4] [U5] Run `pnpm --filter @dtcg-editor/token-core test` and confirm
      all transition cases (U1-U5) pass (green); refactor while green if needed

**Checkpoint**: `TransitionValueSchema` exists, tested, exported — user story work can begin.

---

## Phase 3: User Story 1 - Edit a transition token's three sub-fields (Priority: P1) 🎯 MVP

**Goal**: A composite editor embedding the real `DurationEditor` (twice, labeled) and the real
`CubicBezierEditor`, each independently wired so an edit to one field never touches the other two.

**Independent Test**: Open a `transition` token; confirm three labeled sub-controls render;
confirm editing each one updates only its own field of `$value`.

### Tests for User Story 1 ⚠️

> Write these tests FIRST, run them, confirm they fail (component doesn't exist yet).

- [ ] T008 [P] [US1] [A1] [A2] [A3] [A4] [A5] Write failing tests in
      `packages/token-editor-transition/src/components/TransitionEditor/TransitionEditor.test.tsx`
      covering: renders a "Duration" labeled control, a "Delay" labeled control, and a timing
      function control, each showing the corresponding field's current value (A1); changing the
      duration control's value calls `onChange` with only `duration` replaced, `delay`/
      `timingFunction` unchanged by reference-equal deep value (A2); changing the delay control's
      value calls `onChange` with only `delay` replaced (A3); changing a timing-function
      control-point calls `onChange` with only `timingFunction` replaced (A4); rendering with
      distinct `duration`/`delay` values and asserting the "Duration" control shows the duration
      value and the "Delay" control shows the delay value, not swapped (A5, guards against the
      two `DurationEditor` instances being confused for one another). Run it, confirm it fails,
      and record the observed red in `specs/013-transition-token-support/tdd/cycle-log.md`

### Implementation for User Story 1

- [ ] T009 [US1] [A1] [A2] [A3] [A4] [A5] Implement `TransitionEditor` in
      `packages/token-editor-transition/src/components/TransitionEditor/TransitionEditor.tsx`,
      embedding `DurationEditor` (from `@dtcg-editor/token-editor-duration`) twice — wrapped in
      separately labeled containers ("Duration", "Delay") — and `CubicBezierEditor` (from
      `@dtcg-editor/token-editor-cubic-bezier`) once, each wired via
      `onChange={(next) => onChange({ ...value, field: next })}`, satisfying T008 — smallest
      change to go green; record the green in `tdd/cycle-log.md`
- [ ] T010 [US1] Add
      `packages/token-editor-transition/src/components/TransitionEditor/TransitionEditor.module.css`
      using `--dtcg-ed-*` custom properties only (Principle XII), for the wrapping
      layout/labels only (not the embedded sub-editors' own styling, which stays owned by their
      packages)
- [ ] T011 [US1] [A1] [A2] [A3] [A4] [A5] Run the new `TransitionEditor.test.tsx` suite, confirm
      all green (A1-A5 must be green before User Story 1 is considered complete); refactor while
      green

**Checkpoint**: User Story 1's three-field composite editing is fully functional and
independently testable, and the duration/delay non-cross-talk property is proven by a test.

---

## Phase 4: User Story 2 - See a readable preview of a transition token's resolved value (Priority: P2)

**Goal**: A read-only `Preview` component: one short line combining duration + timing function,
including delay only when non-zero, and decline-to-render on schema mismatch.

**Independent Test**: Render `TransitionPreview` with a zero-delay value, a non-zero-delay value,
and a schema-invalid value; confirm each renders per spec.

### Tests for User Story 2 ⚠️

- [ ] T012 [P] [US2] [A6] [A7] [A8] [A9] Write failing tests in
      `packages/token-editor-transition/src/components/TransitionPreview/TransitionPreview.test.tsx`
      covering: a value with `delay.value === 0` renders one line combining duration + timing
      function text with no delay mention (A6); a value with `delay.value !== 0` renders that
      same line plus the delay (A7); the rendered text matches the exact formatting conventions
      of `DurationPreview` (`{value}{unit}`) and `CubicBezierPreview`
      (`cubic-bezier(p1x, p1y, p2x, p2y)`) for the duration/timing-function portions (A8); a
      schema-invalid value (e.g. missing `timingFunction`, or a `duration` with a negative
      value) renders nothing, `container.firstChild` is `null` (A9). Run it, confirm it fails,
      and record the observed red in `tdd/cycle-log.md`

### Implementation for User Story 2

- [ ] T013 [US2] [A6] [A7] [A8] [A9] Implement `TransitionPreview` in
      `packages/token-editor-transition/src/components/TransitionPreview/TransitionPreview.tsx`
      — `TransitionValueSchema.safeParse`, decline (`null`) on failure, otherwise compose one
      `<span>` text combining duration + timing function (delay appended only when non-zero),
      satisfying T012 — smallest change to go green; record the green in `tdd/cycle-log.md`
- [ ] T014 [US2] Add
      `packages/token-editor-transition/src/components/TransitionPreview/TransitionPreview.module.css`
      using `--dtcg-ed-*` custom properties only
- [ ] T015 [US2] [A6] [A7] [A8] [A9] Run the new `TransitionPreview.test.tsx` suite, confirm all
      green (A6-A9 must be green before User Story 2 is considered complete); refactor while
      green

**Checkpoint**: Both user stories are independently functional and tested.

---

## Phase 5: Contract Wiring & Registration

**Purpose**: Wire the tested components into the `TokenTypeContract` and register the built-in
type so the host app actually uses them (closes SC-001).

- [ ] T016 Implement `transitionTokenType: TokenTypeContract<TransitionValue>` in
      `packages/token-editor-transition/src/token-type.ts` per
      `contracts/token-type-contract.md` (`valueSchema: TransitionValueSchema`,
      `serializeValue: (value) => value`, `Editor: TransitionEditor`, `Preview:
      TransitionPreview`)
- [ ] T017 [P] Create `packages/token-editor-transition/src/index.ts` exporting
      `TransitionEditor`, `TransitionPreview`, `transitionTokenType`
- [ ] T018 Register `"transition"` in `apps/web-app/lib/token-editors/built-in.ts`'s
      `BUILT_IN_TOKEN_TYPES` array and add the matching `transition: transitionTokenType as
      unknown as TokenTypeContract<unknown>` entry to `builtInContractsByType` (shared file —
      expect a rebase conflict with sibling in-flight `number`/`border` features; that's
      expected, handled by the coordinator)
- [ ] T019 Add `.a11y.test.tsx` files for both components (`TransitionEditor.a11y.test.tsx`,
      `TransitionPreview.a11y.test.tsx`), matching `token-editor-duration`'s WCAG 2.2 AA pattern
      (`vitest-a11y-tags.ts`); run and confirm zero violations, including that the two embedded
      `DurationEditor` instances each expose distinct accessible names (via the wrapping label)

**Checkpoint**: `transition` tokens are fully editable/previewable end-to-end in the web app.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T020 [P] Add `TransitionEditor.stories.tsx` Storybook story if this repo's other
      `token-editor-*` packages ship them (check `token-editor-duration` for precedent; match if
      present)
- [ ] T021 Run `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm format:check` at repo root; fix any
      type-check/lint/test/format failures
- [ ] T022 Execute `quickstart.md`'s manual validation steps against the running web app if an
      interactive browser is available in this session; otherwise leave for a human/manual pass
      before merge and note that the equivalent scenarios are already exercised by
      `TransitionEditor.test.tsx`/`TransitionPreview.test.tsx` at the component level

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational only (separate `TransitionPreview`
  component/file) — can run in parallel with Phase 3 if staffed separately
- **Contract Wiring (Phase 5)**: Depends on Phases 3 and 4 both being complete
- **Polish (Phase 6)**: Depends on Phase 5

### Parallel Opportunities

- T003 can run parallel to T001/T002 once the scaffold files exist
- T006 can run parallel to T007
- Phase 4 (US2, `TransitionPreview`) can be developed in parallel with Phase 3 (US1,
  `TransitionEditor`) since they're separate files
- T017 can run parallel to T016 once both exist textually (index.ts just re-exports)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (composite editing of all three fields)
4. **STOP and VALIDATE**: three-field editing works end-to-end in isolation (component test
   level), especially the duration/delay non-cross-talk property
5. Continue to Phase 4 (Preview) before considering the feature complete, since `Preview` is
   required on `TokenTypeContract`

### Incremental Delivery

1. Setup + Foundational → schema ready
2. User Story 1 → three-field composite editing works
3. User Story 2 → Preview works (parallel-safe with 3)
4. Contract Wiring & Registration → feature is live in the web app
5. Polish → stories, full-suite green, manual validation
