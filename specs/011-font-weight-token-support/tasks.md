---
description: "Task list for fontWeight token editor support"
---

# Tasks: Font Weight Token Editor Support

**Input**: Design documents from `specs/011-font-weight-token-support/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required — Principle XIII (TDD, NON-NEGOTIABLE) mandates every behavior change be
driven by a test observed failing first. Test tasks are ordered before their implementation
task in every phase below, and `speckit-implement`'s `before_implement` hook
(`speckit-tdd-run`) enforces the red-green-refactor loop over them.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3)

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create package scaffold `packages/token-editor-font-weight/` (package.json,
      tsconfig.json, vitest.setup.ts, vitest-a11y-tags.ts, src/css-modules.d.ts,
      src/vitest-env.d.ts), mirroring `packages/token-editor-dimension`'s equivalent files
      file-for-file (same devDependencies, same `build`/`test`/`lint` scripts, package name
      `@dtcg-editor/token-editor-font-weight`)
- [ ] T002 Run `pnpm install` at repo root so the new workspace package and its
      `@dtcg-editor/token-core`/`@dtcg-editor/token-editor-contract` dependencies (added via
      `pnpm add --filter @dtcg-editor/token-editor-font-weight`, per CLAUDE.md's pnpm rule) are
      linked
- [ ] T003 [P] Add `"packages/token-editor-font-weight"` to the `packages` array in
      `vitest.config.mts` so its `.test.tsx`/`.a11y.test.tsx` files run under the shared
      unit/a11y Vitest projects

**Checkpoint**: package scaffold exists and is wired into the workspace/test runner; no source
code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `token-core`'s schema is the shared prerequisite every user story's `Editor`/
`Preview` component depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Write failing `node:test` cases in `packages/token-core/src/font-weight.test.ts` for
      `FontWeightValueSchema`: accepts integer `1`, `1000`, and a mid-range value (e.g. `400`);
      accepts each of the 18 keyword aliases; rejects `0`; rejects `1001`; rejects a non-integer
      number (e.g. `400.5`); rejects an unrecognized string (e.g. `"extra-bold-ish"`); rejects a
      non-string/non-number value (e.g. an object) — record the observed red in
      `specs/011-font-weight-token-support/tdd/cycle-log.md` per Principle XIII
- [ ] T005 Implement `FontWeightValueSchema`/`FontWeightValue` in
      `packages/token-core/src/font-weight.ts` (`z.union([z.number().int().min(1).max(1000),
      z.enum([...18 aliases])])`, matching `dimension.ts`'s file shape) so T004 passes
- [ ] T006 Export `FontWeightValueSchema` (value) and `FontWeightValue` (type) from
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

### Tests for User Story 1 ⚠️ (write first, confirm failing, then implement)

- [ ] T007 [P] [US1] Write failing tests in
      `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.test.tsx`:
      renders the current numeric value in a labeled number input; calling `onChange` fires with
      an updated integer when the input changes (mirror
      `DimensionEditor.test.tsx`'s structure); the input's `min`/`max`/`step` attributes are `1`/
      `1000`/`1`; entering a non-numeric value does not call `onChange` with `NaN`
- [ ] T008 [P] [US1] Write failing tests in
      `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.a11y.test.tsx`:
      zero WCAG 2.2 AA `axe-core` violations for a numeric value (mirror
      `DimensionEditor.a11y.test.tsx`'s structure/tag set)
- [ ] T009 [US1] Record the observed red for T007/T008 in
      `specs/011-font-weight-token-support/tdd/cycle-log.md`

### Implementation for User Story 1

- [ ] T010 [US1] Implement `FontWeightEditor` in
      `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.tsx`:
      a single labeled `<input type="number" min="1" max="1000" step="1">` bound to
      `TokenTypeEditorProps<FontWeightValue>`, calling `onChange` with the parsed integer (only
      the numeric-literal branch of `FontWeightValue` is directly editable here — see plan.md's
      Design Decisions; guard against `Number.isNaN` the same way `DimensionEditor` does) so
      T007/T008 pass
- [ ] T011 [US1] Add
      `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.module.css`
      styled only with `--dtcg-ed-*` custom properties (Principle XII), matching
      `DimensionEditor.module.css`'s layout pattern
- [ ] T012 [US1] Create `packages/token-editor-font-weight/src/token-type.ts` exporting
      `fontWeightTokenType: TokenTypeContract<FontWeightValue>` with `type: "fontWeight"`,
      `valueSchema: FontWeightValueSchema`, `serializeValue: (value) => value`,
      `Editor: FontWeightEditor` (per contracts/token-type-contract.md; `Preview` added in
      Phase 4, US2)
- [ ] T013 [US1] Create `packages/token-editor-font-weight/src/index.ts` exporting
      `FontWeightEditor` and `fontWeightTokenType`, mirroring
      `token-editor-dimension/src/index.ts`
- [ ] T014 [US1] Register `"fontWeight"` in `apps/web-app/lib/token-editors/built-in.ts`:
      add to `BUILT_IN_TOKEN_TYPES`, add `fontWeight: fontWeightTokenType as unknown as
      TokenTypeContract<unknown>` to `builtInContractsByType` (same erasure-safety comment
      rationale as the existing `dimension`/`color` entries), and add
      `"@dtcg-editor/token-editor-font-weight": "workspace:*"` to
      `apps/web-app/package.json` via `pnpm add @dtcg-editor/token-editor-font-weight --filter
      @dtcg-editor/web-app` (per CLAUDE.md's pnpm rule — do not hand-edit the dependency)
- [ ] T015 [US1] Run `pnpm --filter @dtcg-editor/token-editor-font-weight build` and fix any
      TypeScript errors (Principle III: no relaxed strictness)

**Checkpoint**: A `fontWeight` token opened in the web app now shows `FontWeightEditor`, not the
JSON fallback, and editing it writes a valid integer `$value`. User Story 1 is independently
testable and deployable as the MVP slice.

---

## Phase 4: User Story 2 - See a readable preview of a fontWeight token's resolved value (Priority: P2)

**Goal**: A read-only preview renders a `fontWeight` token's resolved literal value as readable
text wherever the host shows a reference/candidate preview.

**Independent Test**: Render `FontWeightPreview` standalone with a numeric value, an alias
value, and an invalid value; confirm it renders text for the first two and `null` for the third.

### Tests for User Story 2 ⚠️ (write first, confirm failing, then implement)

- [ ] T016 [P] [US2] Write failing tests in
      `packages/token-editor-font-weight/src/components/FontWeightPreview/FontWeightPreview.test.tsx`:
      renders `"700"` for a numeric value `700`; renders `"bold"` for the alias value `"bold"`;
      renders nothing (`container.firstChild` is `null`) for a value that fails
      `FontWeightValueSchema` (mirror `ColorPreview.test.tsx`'s structure)
- [ ] T017 [P] [US2] Write failing tests in
      `packages/token-editor-font-weight/src/components/FontWeightPreview/FontWeightPreview.a11y.test.tsx`:
      zero WCAG 2.2 AA `axe-core` violations for both a numeric and an alias value (mirror
      `ColorPreview.a11y.test.tsx`'s structure)
- [ ] T018 [US2] Record the observed red for T016/T017 in
      `specs/011-font-weight-token-support/tdd/cycle-log.md`

### Implementation for User Story 2

- [ ] T019 [US2] Implement `FontWeightPreview` in
      `packages/token-editor-font-weight/src/components/FontWeightPreview/FontWeightPreview.tsx`:
      `{ value: unknown }` props, `FontWeightValueSchema.safeParse(value)`, return `null` on
      failure, otherwise render `<span>{String(parsed.data)}</span>` styled via
      `FontWeightPreview.module.css` (mirror `ColorPreview.tsx`'s validate-then-render shape) so
      T016/T017 pass
- [ ] T020 [US2] Add
      `packages/token-editor-font-weight/src/components/FontWeightPreview/FontWeightPreview.module.css`
      styled only with `--dtcg-ed-*` custom properties (e.g. `var(--dtcg-ed-font-mono)`,
      matching `ColorPreview.module.css`)
- [ ] T021 [US2] Wire `Preview: FontWeightPreview` into `fontWeightTokenType` in
      `packages/token-editor-font-weight/src/token-type.ts`
- [ ] T022 [US2] Export `FontWeightPreview` from `packages/token-editor-font-weight/src/index.ts`
- [ ] T023 [US2] Run `pnpm --filter @dtcg-editor/token-editor-font-weight build` and fix any
      TypeScript errors

**Checkpoint**: `fontWeight` tokens now show a readable preview wherever other types already do,
for both numeric and alias values. User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Author a fontWeight token using a keyword alias (Priority: P3, nice-to-have)

**Goal**: A user can pick a DTCG keyword alias instead of typing a number.

**Independent Test**: Render `FontWeightEditor` with an alias value and confirm an alias picker
reflects it; selecting a different alias calls `onChange` with that exact string.

> This phase is explicitly a nice-to-have (FR-007, spec.md Assumption 1) — the feature is
> functionally complete after Phase 4. Implement this phase only if time allows; skipping it is
> not a scope regression.

### Tests for User Story 3 ⚠️ (write first, confirm failing, then implement)

- [ ] T024 [P] [US3] Write failing tests in `FontWeightEditor.test.tsx` (extending the file from
      T007): an alias picker (`<select>`) is present offering all 18 aliases plus a "custom
      number" option; given an alias `$value` (e.g. `"bold"`), the picker reflects that alias
      rather than showing a raw number in the numeric field; selecting a different alias calls
      `onChange` with that exact string (not a number)
- [ ] T025 [P] [US3] Extend `FontWeightEditor.a11y.test.tsx` (from T008) with a case asserting
      zero WCAG 2.2 AA violations when an alias value is selected
- [ ] T026 [US3] Record the observed red for T024/T025 in
      `specs/011-font-weight-token-support/tdd/cycle-log.md`

### Implementation for User Story 3

- [ ] T027 [US3] Extend `FontWeightEditor` in `FontWeightEditor.tsx` with a keyword-alias
      `<select>` (mirroring `DimensionEditor`'s unit `<select>` pattern) that, when the current
      `value` is a string, shows/edits the alias directly; toggling to/from "custom number" swaps
      between the numeric input and the alias select without losing round-trip fidelity (writing
      exactly the alias string or exactly the typed integer, never a converted value) so
      T024/T025 pass
- [ ] T028 [US3] Update `FontWeightEditor.module.css` for the added alias `<select>`, styled only
      with `--dtcg-ed-*` custom properties
- [ ] T029 [US3] Run `pnpm --filter @dtcg-editor/token-editor-font-weight build` and fix any
      TypeScript errors

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T030 [P] Add `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.stories.tsx`
      (Storybook), mirroring `DimensionEditor.stories.tsx`'s controlled-wrapper pattern, with
      stories for a numeric value and (if Phase 5 was implemented) an alias value
- [ ] T031 Run `pnpm build` (whole-repo Turbo build, the sole type-checking gate) and fix any
      cross-package errors
- [ ] T032 Run `pnpm test` (whole-repo Turbo test: commits/format-staged/vitest across every
      package) and fix any failures
- [ ] T033 Run `pnpm lint` and `pnpm format:check` and fix any violations (Biome, `@ls-lint/ls-lint`
      filename/folder conventions per Principle X)
- [ ] T034 Manually execute `specs/011-font-weight-token-support/quickstart.md`'s manual
      validation steps against the running web app (`pnpm dev`) and confirm every Acceptance
      Scenario in spec.md passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (the schema every
  `Editor`/`Preview` imports).
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational and on `token-type.ts` existing (T012,
  US1) since it adds a field to the same object — implement after US1, but its own tests
  (T016/T017) are independent of US1's component.
- **User Story 3 (Phase 5)**: Depends on Foundational and extends `FontWeightEditor.tsx` from
  US1 (T010) — implement after US1; independent of US2.
- **Polish (Phase 6)**: Depends on whichever of US1/US2/US3 were completed.

### Parallel Opportunities

- T001 and T003 can run in parallel (different files).
- T007 and T008 can run in parallel (different test files, same component under test).
- T016 and T017 can run in parallel.
- T024 and T025 can run in parallel.

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
