---
description: "Task list for fontWeight token editor support"
---

# Tasks: Font Weight Token Editor Support

**Input**: Design documents from `specs/011-font-weight-token-support/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required — Principle XIII (TDD, NON-NEGOTIABLE) mandates every behavior change be
driven by a test observed failing first. Test tasks are ordered before their implementation
task in every phase below. Every behavioral task below carries the `tdd/test-list.md` behavior
id(s) it covers in brackets (e.g. `[U5]`, `[A2]`) — this marker is load-bearing: `speckit-tdd-run`
ticks a task's checkbox only once it can read a behavior id from it and that behavior's test is
observed failing-then-passing. Tasks with no behavior marker are structural/setup and are ticked
directly.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3).

## Format: `[ID] [P?] [Story] [Behavior?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3)
- **[U#]/[A#]**: `tdd/test-list.md` behavior id(s) this task drives to green

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create package scaffold `packages/token-editor-font-weight/` (package.json,
      tsconfig.json, vitest.setup.ts, vitest-a11y-tags.ts, src/css-modules.d.ts,
      src/vitest-env.d.ts), mirroring `packages/token-editor-dimension`'s equivalent files
      file-for-file (same devDependencies, same `build`/`test`/`lint` scripts, package name
      `@dtcg-editor/token-editor-font-weight`)
- [X] T002 Run `pnpm install` at repo root so the new workspace package and its
      `@dtcg-editor/token-core`/`@dtcg-editor/token-editor-contract` dependencies (added via
      `pnpm add --filter @dtcg-editor/token-editor-font-weight`, per CLAUDE.md's pnpm rule) are
      linked
- [X] T003 [P] Add `"packages/token-editor-font-weight"` to the `packages` array in
      `vitest.config.mts` so its `.test.tsx`/`.a11y.test.tsx` files run under the shared
      unit/a11y Vitest projects

**Checkpoint**: package scaffold exists and is wired into the workspace/test runner; no source
code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `token-core`'s schema is the shared prerequisite every user story's `Editor`/
`Preview` component depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [U1] [U2] [U3] [U4] [U5] [U6] [U7] [U8] [U9] Write failing `node:test` cases in
      `packages/token-core/src/font-weight.test.ts` for `FontWeightValueSchema`: accepts integer
      `1` (U1), `1000` (U2), and a mid-range value `400` (U3); accepts each of the 18 keyword
      aliases (U4); rejects `0` (U5); rejects `1001` (U6); rejects a non-integer number `400.5`
      (U7); rejects an unrecognized string `"extra-bold-ish"` (U8); rejects a non-string/
      non-number value, e.g. an object (U9). Run it, confirm it fails (module doesn't exist yet),
      and record the observed red in `specs/011-font-weight-token-support/tdd/cycle-log.md`
- [X] T005 [U1] [U2] [U3] [U4] [U5] [U6] [U7] [U8] [U9] Implement `FontWeightValueSchema`/
      `FontWeightValue` in `packages/token-core/src/font-weight.ts`
      (`z.union([z.number().int().min(1).max(1000), z.enum([...18 aliases])])`, matching
      `dimension.ts`'s file shape) — smallest change to make T004 pass, then run the full
      `token-core` suite and confirm still green, then refactor if needed
- [X] T006 Export `FontWeightValueSchema` (value) and `FontWeightValue` (type) from
      `packages/token-core/src/index.ts`, alongside the existing `DimensionValue`/
      `DimensionValueSchema` exports

**Checkpoint**: `token-core`'s fontWeight schema is implemented, tested, and exported — user
story work can now begin.

---

## Phase 3: User Story 1 - Edit a fontWeight token's value (Priority: P1) 🎯 MVP

**Goal**: A dedicated numeric editor replaces the generic JSON-textarea fallback for `fontWeight`
tokens, and edits made through it write a valid `$value`.

**Independent Test**: Render `FontWeightEditor` standalone with a `fontWeight` value and confirm
it displays the value and calls `onChange` with a valid updated value; separately confirm the
type is registered so the web app no longer routes `fontWeight` to the JSON fallback.

### Tests for User Story 1 ⚠️ (write first, run, confirm failing for the right reason, only then implement)

- [X] T007 [P] [US1] [U10] [U11] [U12] [U13] Write failing tests in
      `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.test.tsx`:
      renders the current numeric value in a labeled number input with `min=1 max=1000 step=1`
      attributes (U10); calling `onChange` fires with an updated integer when the input changes
      (U11, mirror `DimensionEditor.test.tsx`'s structure); entering a non-numeric value does not
      call `onChange` (U12); entering an out-of-range integer (`1001` or `0`) does not call
      `onChange` (U13). Run it against the not-yet-created component and confirm it fails
- [X] T008 [P] [US1] [U14] Write failing tests in
      `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.a11y.test.tsx`:
      zero WCAG 2.2 AA `axe-core` violations for a numeric value (mirror
      `DimensionEditor.a11y.test.tsx`'s structure/tag set). Run it and confirm it fails
- [X] T009 [US1] Record the observed red for T007/T008 (exact failure output, e.g. "Cannot find
      module") in `specs/011-font-weight-token-support/tdd/cycle-log.md`

### Implementation for User Story 1

- [X] T010 [US1] [U10] [U11] [U12] [U13] [U14] Implement `FontWeightEditor` in
      `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.tsx`:
      a single labeled `<input type="number" min="1" max="1000" step="1">` bound to
      `TokenTypeEditorProps<FontWeightValue>`, calling `onChange` with the parsed integer only
      when it is a finite integer in `[1, 1000]` (only the numeric-literal branch of
      `FontWeightValue` is directly editable here — see plan.md's Design Decisions) — smallest
      change to make T007/T008 pass, run the full package suite, confirm green, then refactor
- [X] T011 [US1] Add
      `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.module.css`
      styled only with `--dtcg-ed-*` custom properties (Principle XII), matching
      `DimensionEditor.module.css`'s layout pattern
- [X] T012 [US1] Create `packages/token-editor-font-weight/src/token-type.ts` exporting
      `fontWeightTokenType: TokenTypeContract<FontWeightValue>` with `type: "fontWeight"`,
      `valueSchema: FontWeightValueSchema`, `serializeValue: (value) => value`,
      `Editor: FontWeightEditor` (per contracts/token-type-contract.md; `Preview` added in
      Phase 4, US2)
- [X] T013 [US1] Create `packages/token-editor-font-weight/src/index.ts` exporting
      `FontWeightEditor` and `fontWeightTokenType`, mirroring
      `token-editor-dimension/src/index.ts`
- [X] T014 [US1] [A1] [U23] Extend the existing assertion in
      `apps/web-app/lib/token-editors/built-in.test.ts` (`"BUILT_IN_TOKEN_TYPES includes both
      dimension and color"`) to also expect `"fontWeight"`. Run it and confirm it fails against
      the current two-entry array before touching `built-in.ts`
- [X] T015 [US1] [A1] [U23] Register `"fontWeight"` in `apps/web-app/lib/token-editors/built-in.ts`:
      add to `BUILT_IN_TOKEN_TYPES`, add `fontWeight: fontWeightTokenType as unknown as
      TokenTypeContract<unknown>` to `builtInContractsByType` (same erasure-safety comment
      rationale as the existing `dimension`/`color` entries), and add
      `"@dtcg-editor/token-editor-font-weight": "workspace:*"` to `apps/web-app/package.json` via
      `pnpm add @dtcg-editor/token-editor-font-weight --filter @dtcg-editor/web-app` (per
      CLAUDE.md's pnpm rule — do not hand-edit the dependency) — smallest change to make T014
      pass
- [X] T015a [US1] Record the observed red for T014 and the green for T015 in
      `specs/011-font-weight-token-support/tdd/cycle-log.md`
- [X] T016 [US1] Run `pnpm --filter @dtcg-editor/token-editor-font-weight build` and
      `pnpm --filter @dtcg-editor/web-app build`, fix any TypeScript errors (Principle III: no
      relaxed strictness)

**Checkpoint**: A `fontWeight` token opened in the web app now shows `FontWeightEditor`, not the
JSON fallback, and editing it writes a valid integer `$value`. User Story 1 is independently
testable and deployable as the MVP slice. Acceptance behaviors A1–A3 green.

---

## Phase 4: User Story 2 - See a readable preview of a fontWeight token's resolved value (Priority: P2)

**Goal**: A read-only preview renders a `fontWeight` token's resolved literal value as readable
text wherever the host shows a reference/candidate preview.

**Independent Test**: Render `FontWeightPreview` standalone with a numeric value, an alias
value, and an invalid value; confirm it renders text for the first two and `null` for the third.

### Tests for User Story 2 ⚠️ (write first, run, confirm failing, only then implement)

- [ ] T017 [P] [US2] [U15] [U16] [U17] Write failing tests in
      `packages/token-editor-font-weight/src/components/FontWeightPreview/FontWeightPreview.test.tsx`:
      renders `"700"` for a numeric value `700` (U15); renders `"bold"` for the alias value
      `"bold"` (U16); renders nothing (`container.firstChild` is `null`) for a value that fails
      `FontWeightValueSchema`, e.g. `{ not: "valid" }` (U17) (mirror `ColorPreview.test.tsx`'s
      structure). Run it against the not-yet-created component and confirm it fails
- [ ] T018 [P] [US2] [U18] Write failing tests in
      `packages/token-editor-font-weight/src/components/FontWeightPreview/FontWeightPreview.a11y.test.tsx`:
      zero WCAG 2.2 AA `axe-core` violations for both a numeric and an alias value (mirror
      `ColorPreview.a11y.test.tsx`'s structure). Run it and confirm it fails
- [ ] T019 [US2] Record the observed red for T017/T018 in
      `specs/011-font-weight-token-support/tdd/cycle-log.md`

### Implementation for User Story 2

- [ ] T020 [US2] [U15] [U16] [U17] [U18] Implement `FontWeightPreview` in
      `packages/token-editor-font-weight/src/components/FontWeightPreview/FontWeightPreview.tsx`:
      `{ value: unknown }` props, `FontWeightValueSchema.safeParse(value)`, return `null` on
      failure, otherwise render `<span>{String(parsed.data)}</span>` styled via
      `FontWeightPreview.module.css` (mirror `ColorPreview.tsx`'s validate-then-render shape) —
      smallest change to make T017/T018 pass, confirm full suite green, then refactor
- [ ] T021 [US2] Add
      `packages/token-editor-font-weight/src/components/FontWeightPreview/FontWeightPreview.module.css`
      styled only with `--dtcg-ed-*` custom properties (e.g. `var(--dtcg-ed-font-mono)`,
      matching `ColorPreview.module.css`)
- [ ] T022 [US2] [A4] [A5] Wire `Preview: FontWeightPreview` into `fontWeightTokenType` in
      `packages/token-editor-font-weight/src/token-type.ts`
- [ ] T023 [US2] Export `FontWeightPreview` from `packages/token-editor-font-weight/src/index.ts`
- [ ] T024 [US2] Run `pnpm --filter @dtcg-editor/token-editor-font-weight build` and fix any
      TypeScript errors

**Checkpoint**: `fontWeight` tokens now show a readable preview wherever other types already do,
for both numeric and alias values. User Stories 1 and 2 both work independently. Acceptance
behaviors A4–A5 green.

---

## Phase 5: User Story 3 - Author a fontWeight token using a keyword alias (Priority: P3, nice-to-have)

**Goal**: A user can pick a DTCG keyword alias instead of typing a number.

**Independent Test**: Render `FontWeightEditor` with an alias value and confirm an alias picker
reflects it; selecting a different alias calls `onChange` with that exact string.

> This phase is explicitly a nice-to-have (FR-007, spec.md Assumption 1) — the feature is
> functionally complete after Phase 4. Implement this phase only if time allows; skipping it is
> not a scope regression, but if skipped, behaviors U19–U22/A6–A7 stay `PENDING` in
> `tdd/test-list.md` with a `DROPPED`/deferred note, not silently vanish.

### Tests for User Story 3 ⚠️ (write first, run, confirm failing, only then implement)

- [ ] T025 [P] [US3] [U19] [U20] [U21] Write failing tests in `FontWeightEditor.test.tsx`
      (extending the file from T007): an alias picker (`<select>`) is present offering all 18
      aliases plus a "custom number" option (U19); given an alias `$value` (e.g. `"bold"`), the
      picker reflects that alias rather than showing a raw number in the numeric field (U20);
      selecting a different alias calls `onChange` with that exact string, not a number (U21).
      Run it and confirm it fails against the numeric-only editor from Phase 3
- [ ] T026 [P] [US3] [U22] Extend `FontWeightEditor.a11y.test.tsx` (from T008) with a case
      asserting zero WCAG 2.2 AA violations when an alias value is selected. Run it and confirm
      it fails
- [ ] T027 [US3] Record the observed red for T025/T026 in
      `specs/011-font-weight-token-support/tdd/cycle-log.md`

### Implementation for User Story 3

- [ ] T028 [US3] [U19] [U20] [U21] [U22] [A6] [A7] Extend `FontWeightEditor` in
      `FontWeightEditor.tsx` with a keyword-alias `<select>` (mirroring `DimensionEditor`'s unit
      `<select>` pattern) that, when the current `value` is a string, shows/edits the alias
      directly; toggling to/from "custom number" swaps between the numeric input and the alias
      select without losing round-trip fidelity (writing exactly the alias string or exactly the
      typed integer, never a converted value) — smallest change to make T025/T026 pass, confirm
      full suite green, then refactor
- [ ] T029 [US3] Update `FontWeightEditor.module.css` for the added alias `<select>`, styled only
      with `--dtcg-ed-*` custom properties
- [ ] T030 [US3] Run `pnpm --filter @dtcg-editor/token-editor-font-weight build` and fix any
      TypeScript errors

**Checkpoint**: All three user stories are independently functional. Acceptance behaviors A6–A7
green (or explicitly deferred, per the note above).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T031 [P] Add
      `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.stories.tsx`
      (Storybook), mirroring `DimensionEditor.stories.tsx`'s controlled-wrapper pattern, with
      stories for a numeric value and (if Phase 5 was implemented) an alias value
- [ ] T032 Run `pnpm build` (whole-repo Turbo build, the sole type-checking gate) and fix any
      cross-package errors
- [ ] T033 Run `pnpm test` (whole-repo Turbo test: commits/format-staged/vitest across every
      package) and fix any failures introduced by this feature (pre-existing unrelated e2e reds
      recorded in `tdd/test-list.md`'s baseline note are not this feature's to fix)
- [ ] T034 Run `pnpm lint` and `pnpm format:check` and fix any violations (Biome, `@ls-lint/ls-lint`
      filename/folder conventions per Principle X)
- [ ] T035 [A1] [A2] [A3] [A4] [A5] [A6] [A7] Manually execute
      `specs/011-font-weight-token-support/quickstart.md`'s manual validation steps against the
      running web app (`pnpm dev`) and confirm every Acceptance Scenario in spec.md passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (the schema every
  `Editor`/`Preview` imports).
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational and on `token-type.ts` existing (T012,
  US1) since it adds a field to the same object — implement after US1, but its own tests
  (T017/T018) are independent of US1's component.
- **User Story 3 (Phase 5)**: Depends on Foundational and extends `FontWeightEditor.tsx` from
  US1 (T010) — implement after US1; independent of US2.
- **Polish (Phase 6)**: Depends on whichever of US1/US2/US3 were completed.

### Parallel Opportunities

- T001 and T003 can run in parallel (different files).
- T007 and T008 can run in parallel (different test files, same component under test).
- T017 and T018 can run in parallel.
- T025 and T026 can run in parallel.

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1).
2. **STOP and VALIDATE**: `fontWeight` tokens are editable via a dedicated numeric control,
   satisfying the backlog item's core ask.

### Incremental Delivery

1. Setup + Foundational → Foundation ready.
2. US1 → dedicated editor (MVP).
3. US2 → readable preview, consistent with other token types.
4. US3 (optional) → keyword-alias authoring.
5. Polish → full-suite green, manual quickstart pass, `archive-task`.
