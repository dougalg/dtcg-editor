---
description: "Task list for typography token editor support"
---

# Tasks: Typography Token Editor Support

**Input**: Design documents from `specs/014-typography-token-support/`

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

- [X] T001 Create package scaffold `packages/token-editor-typography/` (package.json,
      tsconfig.json, vitest.setup.ts, vitest-a11y-tags.ts, src/css-modules.d.ts,
      src/vitest-env.d.ts), mirroring `packages/token-editor-transition`'s equivalent files
      file-for-file (same devDependencies, same `build`/`test`/`lint` scripts, package name
      `@dtcg-editor/token-editor-typography`)
- [X] T002 Run `pnpm add --filter @dtcg-editor/token-editor-typography @dtcg-editor/token-core
      @dtcg-editor/token-editor-contract @dtcg-editor/token-editor-font-family
      @dtcg-editor/token-editor-dimension @dtcg-editor/token-editor-font-weight
      @dtcg-editor/token-editor-number react zod` (workspace deps) plus the matching
      devDependencies (`@testing-library/react`, `@types/react`, `@types/react-dom`,
      `@vitejs/plugin-react`, `@vitest/browser`, `@vitest/browser-playwright`, `axe-core`,
      `jsdom`, `react-dom`, `typescript`, `vitest`, `@types/node`), per CLAUDE.md's pnpm rule
      (never hand-edit `package.json` dependency fields)
- [X] T003 [P] Add `"packages/token-editor-typography"` to the `packages` array in
      `vitest.config.mts` so its `.test.tsx`/`.a11y.test.tsx` files run under the shared
      unit/a11y Vitest projects

**Checkpoint**: package scaffold exists, depends on all four sibling editor packages, and is
wired into the workspace/test runner; no source code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `token-core`'s schema is the shared prerequisite every user story's `Editor`/
`Preview` component depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [U1] [U2] [U3] [U4] [U5] [U6] [U7] Write failing `node:test` cases in
      `packages/token-core/src/typography.test.ts` for `TypographyValueSchema`: accepts a valid
      object with all five fields (U1); rejects a value missing `fontFamily` (U2); rejects a
      value missing `fontSize` (U3); rejects a value missing `fontWeight` (U4); rejects a value
      missing `letterSpacing` (U5); rejects a value missing `lineHeight` (U6); rejects a value
      whose `fontSize` is itself invalid (e.g. missing `unit`), proving the nested schema is
      actually enforced, not just field presence (U7). Run it, confirm it fails (module doesn't
      exist yet), and record the observed red in
      `specs/014-typography-token-support/tdd/cycle-log.md`
- [X] T005 [U1] [U2] [U3] [U4] [U5] [U6] [U7] Implement `TypographyValueSchema`/`TypographyValue`
      in `packages/token-core/src/typography.ts` (`z.object({ fontFamily: FontFamilyValueSchema,
      fontSize: DimensionValueSchema, fontWeight: FontWeightValueSchema, letterSpacing:
      DimensionValueSchema, lineHeight: z.number() })`, importing the three sub-schemas rather
      than redefining them, matching `border.ts`/`transition.ts`'s JSDoc/export shape) —
      smallest change to make T004 pass; record the green in `tdd/cycle-log.md`
- [X] T006 [P] Export `TypographyValueSchema`/`TypographyValue` from
      `packages/token-core/src/index.ts`
- [X] T007 [U1] [U2] [U3] [U4] [U5] [U6] [U7] Run `pnpm --filter @dtcg-editor/token-core test`
      and confirm all typography cases (U1-U7) pass (green); refactor while green if needed

**Checkpoint**: `TypographyValueSchema` exists, tested, exported — user story work can begin.

---

## Phase 3: User Story 1 - Edit a typography token's five sub-fields (Priority: P1) 🎯 MVP

**Goal**: A composite editor embedding the real `FontFamilyEditor`, `DimensionEditor` (twice,
labeled), `FontWeightEditor`, and `NumberEditor`, each independently wired so an edit to one
field never touches the other four.

**Independent Test**: Open a `typography` token; confirm five labeled sub-controls render;
confirm editing each one updates only its own field of `$value`.

### Tests for User Story 1 ⚠️

> Write these tests FIRST, run them, confirm they fail (component doesn't exist yet).

- [ ] T008 [P] [US1] [A1] [A2] [A3] [A4] [A5] [A6] [A7] Write failing tests in
      `packages/token-editor-typography/src/components/TypographyEditor/TypographyEditor.test.tsx`
      covering: renders "Font Family", "Font Size", "Font Weight", "Letter Spacing", and "Line
      Height" labeled controls, each showing the corresponding field's current value (A1);
      changing the font family control calls `onChange` with only `fontFamily` replaced, the
      other four fields unchanged by reference-equal deep value (A2); changing the font size
      control's value/unit calls `onChange` with only `fontSize` replaced (A3); changing the
      font weight control calls `onChange` with only `fontWeight` replaced (A4); changing the
      letter spacing control's value/unit calls `onChange` with only `letterSpacing` replaced
      (A5); changing the line height control calls `onChange` with only `lineHeight` replaced
      (A6); rendering with distinct `fontSize`/`letterSpacing` values and asserting the "Font
      Size" group shows the font-size value and the "Letter Spacing" group shows the
      letter-spacing value, not swapped (A7, guards against the two `DimensionEditor` instances
      being confused for one another). Run it, confirm it fails, and record the observed red in
      `specs/014-typography-token-support/tdd/cycle-log.md`

### Implementation for User Story 1

- [ ] T009 [US1] [A1] [A2] [A3] [A4] [A5] [A6] [A7] Implement `TypographyEditor` in
      `packages/token-editor-typography/src/components/TypographyEditor/TypographyEditor.tsx`,
      embedding `FontFamilyEditor` (from `@dtcg-editor/token-editor-font-family`),
      `DimensionEditor` (from `@dtcg-editor/token-editor-dimension`) twice — wrapped in
      separately labeled `<fieldset>`/`<legend>` groups ("Font Size", "Letter Spacing") —
      `FontWeightEditor` (from `@dtcg-editor/token-editor-font-weight`), and `NumberEditor`
      (from `@dtcg-editor/token-editor-number`, wrapped in a "Line Height" `<fieldset>`/
      `<legend>` group for label consistency), each wired via
      `onChange={(next) => onChange({ ...value, field: next })}`, satisfying T008 — smallest
      change to go green; record the green in `tdd/cycle-log.md`
- [ ] T010 [US1] Add
      `packages/token-editor-typography/src/components/TypographyEditor/TypographyEditor.module.css`
      using `--dtcg-ed-*` custom properties only (Principle XII), for the wrapping
      layout/labels only (not the embedded sub-editors' own styling, which stays owned by their
      packages)
- [ ] T011 [US1] [A1] [A2] [A3] [A4] [A5] [A6] [A7] Run the new `TypographyEditor.test.tsx`
      suite, confirm all green (A1-A7 must be green before User Story 1 is considered complete);
      refactor while green

**Checkpoint**: User Story 1's five-field composite editing is fully functional and
independently testable, and the fontSize/letterSpacing non-cross-talk property is proven by a
test.

---

## Phase 4: User Story 2 - See a readable preview of a typography token's resolved value (Priority: P2)

**Goal**: A read-only `Preview` component: one short line combining all five fields, including
letter spacing only when non-zero, and decline-to-render on schema mismatch.

**Independent Test**: Render `TypographyPreview` with a zero-letter-spacing value, a
non-zero-letter-spacing value, and a schema-invalid value; confirm each renders per spec.

### Tests for User Story 2 ⚠️

- [ ] T012 [P] [US2] [A8] [A9] [A10] [A11] Write failing tests in
      `packages/token-editor-typography/src/components/TypographyPreview/TypographyPreview.test.tsx`
      covering: a value with `letterSpacing.value === 0` renders one line combining font size,
      line height, font family, and font weight, with no letter-spacing mention (A8); a value
      with `letterSpacing.value !== 0` renders that same line plus the letter spacing (A9); the
      rendered text matches the exact formatting conventions of `DimensionPreview`
      (`{value}{unit}`), `FontFamilyPreview` (plain/joined string), and `FontWeightPreview`
      (`String(value)`) for their respective portions, including an array `fontFamily` rendering
      as a comma-joined stack (A10); a schema-invalid value (e.g. missing `lineHeight`, or a
      `fontSize` with a missing `unit`) renders nothing, `container.firstChild` is `null` (A11).
      Run it, confirm it fails, and record the observed red in `tdd/cycle-log.md`

### Implementation for User Story 2

- [ ] T013 [US2] [A8] [A9] [A10] [A11] Implement `TypographyPreview` in
      `packages/token-editor-typography/src/components/TypographyPreview/TypographyPreview.tsx`
      — `TypographyValueSchema.safeParse`, decline (`null`) on failure, otherwise compose one
      `<span>` text in the shape `{fontSize.value}{fontSize.unit}/{lineHeight} {fontFamily}
      {fontWeight}` (letter spacing appended only when non-zero as ` +{value}{unit}`),
      satisfying T012 — smallest change to go green; record the green in `tdd/cycle-log.md`
- [ ] T014 [US2] Add
      `packages/token-editor-typography/src/components/TypographyPreview/TypographyPreview.module.css`
      using `--dtcg-ed-*` custom properties only
- [ ] T015 [US2] [A8] [A9] [A10] [A11] Run the new `TypographyPreview.test.tsx` suite, confirm
      all green (A8-A11 must be green before User Story 2 is considered complete); refactor
      while green

**Checkpoint**: Both user stories are independently functional and tested.

---

## Phase 5: Contract Wiring & Registration

**Purpose**: Wire the tested components into the `TokenTypeContract` and register the built-in
type so the host app actually uses them (closes SC-001).

- [ ] T016 Implement `typographyTokenType: TokenTypeContract<TypographyValue>` in
      `packages/token-editor-typography/src/token-type.ts` per
      `contracts/typography-token-type.md` (`valueSchema: TypographyValueSchema`,
      `serializeValue: (value) => value`, `Editor: TypographyEditor`, `Preview:
      TypographyPreview`)
- [ ] T017 [P] Create `packages/token-editor-typography/src/index.ts` exporting
      `TypographyEditor`, `TypographyPreview`, `typographyTokenType`
- [ ] T018 Register `"typography"` in `apps/web-app/lib/token-editors/built-in.ts`'s
      `BUILT_IN_TOKEN_TYPES` array and add the matching `typography: typographyTokenType as
      unknown as TokenTypeContract<unknown>` entry to `builtInContractsByType` (shared file —
      expect a rebase conflict with the sibling in-flight `shadow` feature in another worktree;
      that's expected, handled by the coordinator)
- [ ] T019 Add `.a11y.test.tsx` files for both components (`TypographyEditor.a11y.test.tsx`,
      `TypographyPreview.a11y.test.tsx`), matching `token-editor-transition`'s WCAG 2.2 AA
      pattern (`vitest-a11y-tags.ts`); run and confirm zero violations, including that the two
      embedded `DimensionEditor` instances each expose distinct accessible names (via the
      wrapping fieldset/legend)

**Checkpoint**: `typography` tokens are fully editable/previewable end-to-end in the web app.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T020 [P] Add `TypographyEditor.stories.tsx` Storybook story, matching
      `token-editor-transition`'s precedent
- [ ] T021 Run `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm format:check` at repo root; fix any
      type-check/lint/test/format failures. Update
      `apps/web-app/lib/token-editors/built-in.test.ts` if it asserts `BUILT_IN_TOKEN_TYPES`'s
      exact list, extending it to include `"typography"` and a
      `resolveBuiltInContract("typography")` case
- [ ] T022 Execute `quickstart.md`'s manual validation steps against the running web app (or
      record why not performed, matching prior features' precedent if no interactive browser is
      available in this session)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational only (separate `TypographyPreview`
  component/file) — can run in parallel with Phase 3 if staffed separately
- **Contract Wiring (Phase 5)**: Depends on Phases 3 and 4 both being complete
- **Polish (Phase 6)**: Depends on Phase 5

### Parallel Opportunities

- T003 can run parallel to T001/T002 once the scaffold files exist
- T006 can run parallel to T007
- Phase 4 (US2, `TypographyPreview`) can be developed in parallel with Phase 3 (US1,
  `TypographyEditor`) since they're separate files
- T017 can run parallel to T016 once both exist textually (index.ts just re-exports)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (composite editing of all five fields)
4. **STOP and VALIDATE**: five-field editing works end-to-end in isolation (component test
   level), especially the fontSize/letterSpacing non-cross-talk property
5. Continue to Phase 4 (Preview) before considering the feature complete, since `Preview` is
   required on `TokenTypeContract`

### Incremental Delivery

1. Setup + Foundational → schema ready
2. User Story 1 → five-field composite editing works
3. User Story 2 → Preview works (parallel-safe with 3)
4. Contract Wiring & Registration → feature is live in the web app
5. Polish → stories, full-suite green, manual validation
