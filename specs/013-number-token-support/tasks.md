---
description: "Task list for number token editor support"
---

# Tasks: Number Token Editor Support

**Input**: Design documents from `specs/013-number-token-support/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required — Principle XIII (TDD, NON-NEGOTIABLE) mandates every behavior change be
driven by a test observed failing first. Test tasks are ordered before their implementation task
in every phase below. Every behavioral task below carries the `tdd/test-list.md` behavior id(s)
it covers in brackets (e.g. `[U5]`, `[A2]`) — this marker is load-bearing: `speckit-tdd-run` ticks
a task's checkbox only once it can read a behavior id from it and that behavior's test is
observed failing-then-passing. Tasks with no behavior marker are structural/setup and are ticked
directly.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2).

## Format: `[ID] [P?] [Story] [Behavior?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2)
- **[U#]/[A#]**: `tdd/test-list.md` behavior id(s) this task drives to green (added by
  `speckit-tdd-plan`)

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create package scaffold `packages/token-editor-number/` (package.json, tsconfig.json,
      vitest.setup.ts, vitest-a11y-tags.ts, src/css-modules.d.ts, src/vitest-env.d.ts), mirroring
      `packages/token-editor-font-weight`'s equivalent files file-for-file (same devDependencies,
      same `build`/`test`/`lint` scripts, package name `@dtcg-editor/token-editor-number`)
- [X] T002 Run `pnpm install` at repo root so the new workspace package and its
      `@dtcg-editor/token-core`/`@dtcg-editor/token-editor-contract` dependencies (added via
      `pnpm add --filter @dtcg-editor/token-editor-number`, per CLAUDE.md's pnpm rule) are linked
- [X] T003 [P] Add `"packages/token-editor-number"` to the `packages` array in
      `vitest.config.mts` so its `.test.tsx`/`.a11y.test.tsx` files run under the shared unit/a11y
      Vitest projects

**Checkpoint**: package scaffold exists and is wired into the workspace/test runner; no source
code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `token-core`'s schema is the shared prerequisite every user story's `Editor`/
`Preview` component depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [U1] [U2] [U3] [U4] [U5] [U6] [U7] [U8] [U9] [U10] Write failing `node:test` cases in
      `packages/token-core/src/number.test.ts` for `NumberValueSchema`: accepts a positive
      integer, e.g. `2` (U1); accepts a positive fraction, e.g. `1.5` (U2); accepts `0` (U3);
      accepts a negative number, e.g. `-1` (U4); accepts a negative fraction, e.g. `-0.5` (U5);
      rejects `NaN` (U6); rejects `Infinity` (U7); rejects `-Infinity` (U8); rejects a non-number
      shape, a string `"1.5"` (U9); rejects a non-number shape, an object (U10). Run it, confirm
      it fails (module doesn't exist yet), and record the observed red in
      `specs/013-number-token-support/tdd/cycle-log.md`
- [X] T005 [U1] [U2] [U3] [U4] [U5] [U6] [U7] [U8] [U9] [U10] Implement `NumberValueSchema`/
      `NumberValue` in `packages/token-core/src/number.ts` (`z.number()`, matching
      `font-weight.ts`'s file shape but without the union/enum) — smallest change to make T004
      pass, then run the full `token-core` suite and confirm still green, then refactor if needed
- [X] T006 Export `NumberValueSchema` (value) and `NumberValue` (type) from
      `packages/token-core/src/index.ts`, alongside the existing `FontWeightValue`/
      `FontWeightValueSchema` exports

**Checkpoint**: `token-core`'s number schema is implemented, tested, and exported — user story
work can now begin.

---

## Phase 3: User Story 1 - Edit a number token's value (Priority: P1) 🎯 MVP

**Goal**: A dedicated numeric editor replaces the generic JSON-textarea fallback for `number`
tokens, and edits made through it write a valid `$value`.

**Independent Test**: Render `NumberEditor` standalone with a `number` value and confirm it
displays the value and calls `onChange` with a valid updated value; separately confirm the type
is registered so the web app no longer routes `number` to the JSON fallback.

### Tests for User Story 1 ⚠️ (write first, run, confirm failing for the right reason, only then implement)

- [X] T007 [P] [US1] [U11] [U12] [U13] [U14] [U15] [U16] Write failing tests in
      `packages/token-editor-number/src/components/NumberEditor/NumberEditor.test.tsx`: renders
      the current numeric value in a labeled number input (U11); calling `onChange` fires with an
      updated finite number when the input changes (U12, mirror `FontWeightEditor.test.tsx`'s
      structure); entering a non-numeric value does not call `onChange` (U13); clearing the field
      (empty string) does not call `onChange` (U14); entering a negative number calls `onChange`
      with that exact negative value (U15); entering a fractional number calls `onChange` with
      that exact fractional value (U16). Run it against the not-yet-created component and confirm
      it fails
- [X] T008 [P] [US1] [U17] Write failing tests in
      `packages/token-editor-number/src/components/NumberEditor/NumberEditor.a11y.test.tsx`: zero
      WCAG 2.2 AA `axe-core` violations for a numeric value (mirror
      `FontWeightEditor.a11y.test.tsx`'s structure/tag set). Run it and confirm it fails
- [X] T009 [US1] Record the observed red for T007/T008 (exact failure output, e.g. "Cannot find
      module") in `specs/013-number-token-support/tdd/cycle-log.md`

### Implementation for User Story 1

- [X] T010 [US1] [U11] [U12] [U13] [U14] [U15] [U16] [U17] Implement `NumberEditor` in
      `packages/token-editor-number/src/components/NumberEditor/NumberEditor.tsx`: a single
      labeled `<input type="number" step="any">` (no `min`/`max` — the spec places none) bound to
      `TokenTypeEditorProps<NumberValue>`, calling `onChange` with the parsed number only when it
      is finite (`Number.isFinite`, mirroring `FontWeightEditor`'s `Number.isInteger` guard
      pattern but without the integer/range check) — smallest change to make T007/T008 pass, run
      the full package suite, confirm green, then refactor
- [X] T011 [US1] Add
      `packages/token-editor-number/src/components/NumberEditor/NumberEditor.module.css` styled
      only with `--dtcg-ed-*` custom properties (Principle XII), matching
      `FontWeightEditor.module.css`'s layout pattern
- [X] T012 [US1] Create `packages/token-editor-number/src/token-type.ts` exporting
      `numberTokenType: TokenTypeContract<NumberValue>` with `type: "number"`,
      `valueSchema: NumberValueSchema`, `serializeValue: (value) => value`,
      `Editor: NumberEditor`, `Preview: NumberPreview` (per contracts/token-type-contract.md;
      `Preview` is required on `TokenTypeContract`, so this task pulls forward the Phase 4
      component's import — see Phase 4 for `NumberPreview`'s own implementation)
- [X] T013 [US1] Create `packages/token-editor-number/src/index.ts` exporting `NumberEditor`,
      `NumberPreview`, and `numberTokenType`, mirroring
      `token-editor-font-weight/src/index.ts`
- [X] T014 [US1] [A1] [U22] Extend the existing assertion in
      `apps/web-app/lib/token-editors/built-in.test.ts` (the one enumerating
      `BUILT_IN_TOKEN_TYPES`) to also expect `"number"`. Run it and confirm it fails against the
      current array before touching `built-in.ts`
- [X] T015 [US1] [A1] [U22] Register `"number"` in `apps/web-app/lib/token-editors/built-in.ts`: add to
      `BUILT_IN_TOKEN_TYPES`, add `number: numberTokenType as unknown as
      TokenTypeContract<unknown>` to `builtInContractsByType` (same erasure-safety comment
      rationale as the existing `dimension`/`fontWeight` entries), and add
      `"@dtcg-editor/token-editor-number": "workspace:*"` to `apps/web-app/package.json` via
      `pnpm add @dtcg-editor/token-editor-number --filter @dtcg-editor/web-app` (per CLAUDE.md's
      pnpm rule — do not hand-edit the dependency) — smallest change to make T014 pass
- [X] T015a [US1] Record the observed red for T014 and the green for T015 in
      `specs/013-number-token-support/tdd/cycle-log.md`
- [X] T016 [US1] Run `pnpm --filter @dtcg-editor/token-editor-number build` and
      `pnpm --filter @dtcg-editor/web-app build`, fix any TypeScript errors (Principle III: no
      relaxed strictness)

**Checkpoint**: A `number` token opened in the web app now shows `NumberEditor`, not the JSON
fallback, and editing it writes a valid finite-number `$value`. User Story 1 is independently
testable and deployable as the MVP slice (once `NumberPreview` exists from Phase 4, since
`Preview` is a required contract field — see Dependencies below).

---

## Phase 4: User Story 2 - See a readable preview of a number token's resolved value (Priority: P2)

**Goal**: A read-only preview renders a `number` token's resolved literal value as readable text
wherever the host shows a reference/candidate preview.

**Independent Test**: Render `NumberPreview` standalone with a numeric value and an invalid
value; confirm it renders text for the first and `null` for the second.

### Tests for User Story 2 ⚠️ (write first, run, confirm failing, only then implement)

- [X] T017 [P] [US2] [U18] [U19] [U20] Write failing tests in
      `packages/token-editor-number/src/components/NumberPreview/NumberPreview.test.tsx`: renders
      `"1.5"` for a numeric value `1.5` (U18); renders `"-2"` for a negative value `-2` (U19);
      renders nothing (`container.firstChild` is `null`) for a value that fails
      `NumberValueSchema`, e.g. `{ not: "valid" }` (U20) (mirror `FontWeightPreview.test.tsx`'s
      structure). Run it against the not-yet-created component and confirm it fails
- [X] T018 [P] [US2] [U21] Write failing tests in
      `packages/token-editor-number/src/components/NumberPreview/NumberPreview.a11y.test.tsx`:
      zero WCAG 2.2 AA `axe-core` violations for a numeric value (mirror
      `FontWeightPreview.a11y.test.tsx`'s structure). Run it and confirm it fails
- [X] T019 [US2] Record the observed red for T017/T018 in
      `specs/013-number-token-support/tdd/cycle-log.md`

### Implementation for User Story 2

- [X] T020 [US2] [U18] [U19] [U20] [U21] Implement `NumberPreview` in
      `packages/token-editor-number/src/components/NumberPreview/NumberPreview.tsx`:
      `{ value: unknown }` props, `NumberValueSchema.safeParse(value)`, return `null` on failure,
      otherwise render `<span>{String(parsed.data)}</span>` styled via
      `NumberPreview.module.css` (mirror `FontWeightPreview.tsx`'s validate-then-render shape) —
      smallest change to make T017/T018 pass, confirm full suite green, then refactor
- [X] T021 [US2] Add
      `packages/token-editor-number/src/components/NumberPreview/NumberPreview.module.css` styled
      only with `--dtcg-ed-*` custom properties (e.g. `var(--dtcg-ed-font-mono)`, matching
      `FontWeightPreview.module.css`)
- [X] T022 [US2] [A5] [A6] Confirm `Preview: NumberPreview` is wired into `numberTokenType` in
      `packages/token-editor-number/src/token-type.ts` (already referenced by T012 — this task
      is the point at which that reference actually resolves to a real component)
- [X] T023 [US2] Run `pnpm --filter @dtcg-editor/token-editor-number build` and fix any
      TypeScript errors

**Checkpoint**: `number` tokens now show a readable preview wherever other types already do. User
Stories 1 and 2 both work. Feature is functionally complete per spec.md.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T024 [P] Add
      `packages/token-editor-number/src/components/NumberEditor/NumberEditor.stories.tsx`
      (Storybook), mirroring `FontWeightEditor.stories.tsx`'s controlled-wrapper pattern
- [X] T025 Run `pnpm build` (whole-repo Turbo build, the sole type-checking gate) and fix any
      cross-package errors
- [X] T026 Run `pnpm test` (whole-repo Turbo test: commits/format-staged/vitest across every
      package) and fix any failures introduced by this feature
- [X] T027 Run `pnpm lint` and `pnpm format:check` and fix any violations (Biome, `@ls-lint/ls-lint`
      filename/folder conventions per Principle X)
- [X] T028 [A1] [A2] [A3] [A4] [A5] [A6] Manually execute
      `specs/013-number-token-support/quickstart.md`'s manual validation steps against the
      running web app (`pnpm dev`) and confirm every Acceptance Scenario in spec.md passes —
      this is the outer-loop acceptance evidence for A1-A6 (see `tdd/test-list.md`'s Outer loop
      note on why this feature relies on component tests + manual quickstart rather than a new
      Playwright spec, matching `token-editor-font-weight`'s precedent)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (the schema every
  `Editor`/`Preview` imports).
- **User Story 1 (Phase 3)**: Depends on Foundational. T012 (`token-type.ts`) references
  `NumberPreview`, so while US1's own tests/editor work (T007-T011) are independent of US2, T012
  itself is only fully correct once Phase 4's `NumberPreview` exists — implement Phase 3 through
  T011, then Phase 4, then close out T012/T013 (or implement Phase 4 immediately after T011, as
  the Implementation Strategy below recommends), since `Preview` is a required
  `TokenTypeContract` field (unlike `fontWeight`, which could ship `Preview` as a later addition
  because it was optional at the time).
- **User Story 2 (Phase 4)**: Depends on Foundational. Its own tests (T017/T018) are independent
  of US1's component.
- **Polish (Phase 5)**: Depends on both US1 and US2 being complete (T012's `Preview` field
  requires it).

### Parallel Opportunities

- T001 and T003 can run in parallel (different files).
- T007 and T008 can run in parallel (different test files, same component under test).
- T017 and T018 can run in parallel.
- Phase 3's test-writing (T007/T008) and Phase 4's test-writing (T017/T018) can run in parallel
  with each other (different components), even though Phase 4's *implementation* is needed
  before Phase 3's T012 can be considered final.

## Implementation Strategy

### MVP First (User Story 1, with Preview as a same-pass dependency)

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1, T007-T011) → Phase 4 (US2, in full)
   → close out Phase 3's T012/T013.
2. **STOP and VALIDATE**: `number` tokens are editable via a dedicated numeric control and show a
   readable preview, satisfying the backlog item's core ask. Because `Preview` is a required
   contract field, this feature's practical MVP is US1+US2 together, not US1 alone.

### Incremental Delivery

1. Setup + Foundational → Foundation ready.
2. US1 editor + US2 preview → both required for a working `numberTokenType` contract.
3. Polish → full-suite green, manual quickstart pass, `archive-task`.
