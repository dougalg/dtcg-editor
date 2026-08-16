---
description: "Task list template for feature implementation"
---

# Tasks: Simplify TokenTree / TreeNode Editor Coupling

**Input**: Design documents from `/specs/002-simplify-tree-node/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/token-type-contract.md, quickstart.md (all present)

**Tests**: No new test infrastructure is introduced. FR-008 requires existing automated tests to keep passing; they may only be _edited_ where they assert an internal implementation detail that necessarily changes (e.g. a direct call to the deleted `validateDimensionValue`), never where they assert user-facing behavior. Tasks below therefore include updating/running existing suites, not writing new ones.

**Organization**: Tasks are grouped by user story (US1/US2/US3, all operating on the same refactor of `TreeNode.tsx` and the two first-party token-type packages, per spec.md's own priority framing: US1 is the refactor itself, US2 verifies no regression, US3 verifies the resulting code is auditably generic).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Confirm the pre-refactor baseline is green before touching anything.

- [ ] T001 Run `pnpm --filter @dtcg-editor/web-app test`, `pnpm --filter @dtcg-editor/token-type-color test`, `pnpm --filter @dtcg-editor/token-type-dimension test`, and `pnpm --filter @dtcg-editor/token-type-contract test` from the repo root and confirm all suites pass before making any change

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the shared `TokenTypeContract` interface with the one new member every later phase depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add an optional `ValidationErrorHandler?(props: { readonly value: unknown }): ReactElement | null` member to `TokenTypeContract<TValue>` in `packages/token-type-contract/src/contract.ts`, per `contracts/token-type-contract.md`'s "After" shape (no other member's type changes)
- [ ] T003 [P] Extend `packages/token-type-contract/src/contract.test.ts` to cover the new optional `ValidationErrorHandler` member — a contract that omits it and a contract that supplies it should both type-check and behave correctly

**Checkpoint**: `TokenTypeContract` now has the `ValidationErrorHandler` member; every implementer of the interface (built-in or third-party) remains valid unmodified.

---

## Phase 3: User Story 1 - Add a new token-type editor without touching the tree (Priority: P1) 🎯 MVP

**Goal**: `TreeNode.tsx` resolves and renders every standard type — built-in or custom — through one generic dispatch path (`resolveBuiltInContract` + `validateTokenValue` for validation, `resolveEditorForType` + a single render for the UI), with the dimension and color special cases deleted.

**Independent Test**: Register a new token-type editor via the existing extension mechanism only, with no changes to `TreeNode.tsx`/`TokenTree.tsx`; confirm it renders and handles value changes/validation.

### Package retrofit: `token-type-color` (FR-009/FR-010/FR-011)

- [ ] T004 [P] [US1] Create `packages/token-type-color/src/configuration.ts` holding `ColorEditorOptions`, `ColorEditorOptionsSchema`, and `defineColorConfig`, moved out of `packages/token-type-color/src/color.ts` (importing `ColorSpace`/`COLOR_SPACES` from `color.ts`); `color.ts` keeps only `ColorValueSchema`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`, `checkColorValueIssues`, and `COLOR_SPACES`/`ColorSpace`
- [ ] T005 [P] [US1] Create `packages/token-type-color/src/components/` and move `packages/token-type-color/src/editor.tsx` → `packages/token-type-color/src/components/editor.tsx` and `packages/token-type-color/src/editor.module.css` → `packages/token-type-color/src/components/editor.module.css`, updating the `./editor.module.css` import; logic unchanged
- [ ] T006 [P] [US1] Create `packages/token-type-color/src/components/validation-error-handler.tsx` implementing the new `ValidationErrorHandler` contract member, moving `ColorDisplayInfo`/`describeColorForDisplay`'s logic from `apps/web-app/lib/tokens/color-display.ts` (built from `color.ts`'s `ColorObjectValueSchema`/`LegacyHexColorValueSchema`/`checkColorValueIssues` and `css-color.ts`'s `colorValueToCssColor`)
- [ ] T007 [US1] Update `packages/token-type-color/src/token-type.ts` to assemble `colorTokenType` with `Editor` from `./components/editor.tsx`, the new `ValidationErrorHandler` from `./components/validation-error-handler.tsx`, and `editorOptionsSchema` from `./configuration.ts` (depends on T004, T005, T006)
- [ ] T008 [P] [US1] Update `packages/token-type-color/src/index.ts`'s export paths to match the new `components/`/`configuration.ts` locations (depends on T004, T005, T006)

### Package retrofit: `token-type-dimension` (FR-009/FR-010/FR-011, structural only)

- [ ] T009 [P] [US1] Create `packages/token-type-dimension/src/configuration.ts` as an initially empty module (no exports yet) per FR-009/FR-010/FR-011 and research.md Decision 6
- [ ] T010 [P] [US1] Create `packages/token-type-dimension/src/components/` and move `packages/token-type-dimension/src/editor.tsx` → `packages/token-type-dimension/src/components/editor.tsx`; logic unchanged
- [ ] T011 [US1] Update `packages/token-type-dimension/src/token-type.ts` to import `DimensionEditor` from `./components/editor.tsx` (depends on T010)
- [ ] T012 [P] [US1] Update `packages/token-type-dimension/src/index.ts`'s export path for the moved editor (depends on T010)

### `TreeNode.tsx` generic dispatch (FR-001–FR-003, FR-006)

- [ ] T013 [US1] In `apps/web-app/components/TreeNode.tsx`, remove the direct imports of `dimensionTokenType`/`DimensionValue` (`@dtcg-editor/token-type-dimension`) and `colorTokenType` (`@dtcg-editor/token-type-color`), and remove the `DimensionEditorComponent` cast type (depends on T007, T011)
- [ ] T014 [US1] In `apps/web-app/components/TreeNode.tsx`, replace the `isDimension`-gated `builtInContract` resolution with a single `resolveBuiltInContract(effectiveType)` lookup used for every standard type; delete `isDimension`, `dimensionValueValidation`, and `existingDimensionValue` (depends on T013)
- [ ] T015 [US1] In `apps/web-app/components/TreeNode.tsx`'s read-only (`!canEdit`) branch, replace the `isColor`/`describeColorForDisplay` swatch-and-issues rendering with a generic render of `builtInContract?.ValidationErrorHandler`, falling back to today's plain name/type/value text when absent (depends on T014, T006)
- [ ] T016 [US1] In `apps/web-app/components/TreeNode.tsx`'s editable branch, replace the `editableColorIssues` color-specific computation with the same generic `builtInContract?.ValidationErrorHandler`-driven rendering introduced in T015 (depends on T015)
- [ ] T017 [US1] In `apps/web-app/components/TreeNode.tsx`, collapse `handleDimensionValueChange`/`handleGenericValueChange` into one value-change handler used for every standard type, and replace the `DimensionEditor`/`GenericEditor` dual-cast render branch with a single resolved-editor render (depends on T016)
- [ ] T018 [P] [US1] In `apps/web-app/lib/tokens/edit-state.ts`, delete `DimensionValidationResult` and `validateDimensionValue`, and remove the now-unused `dimensionTokenType`/`DimensionValue` imports (depends on T017)
- [ ] T019 [P] [US1] Delete `apps/web-app/lib/tokens/color-display.ts` now that its logic lives in `packages/token-type-color/src/components/validation-error-handler.tsx` (depends on T017, T006)

**Checkpoint**: A new token-type editor can be registered purely as an extension (built-in `built-in.ts` entry or user `dtcg-editor.config.mts` entry) with zero source changes to `TreeNode.tsx`/`TokenTree.tsx`; dimension and color are two ordinary entries in that same mechanism.

---

## Phase 4: User Story 2 - Existing token editing behaves exactly as before (Priority: P1)

**Goal**: Every existing color/dimension editing scenario — view, edit, invalid-value feedback, save — behaves identically to before the refactor.

**Independent Test**: Run the existing color/dimension editing scenarios and confirm every outcome matches pre-refactor behavior.

- [ ] T020 [P] [US2] Update `apps/web-app/lib/token-editors/color-editor.test.tsx` (and any other test importing from the old `packages/token-type-color/src/editor.tsx` or `color.ts`'s config exports) to the new `components/editor.tsx`/`configuration.ts` locations, without changing any assertion on rendered/user-facing behavior (depends on T004–T008)
- [ ] T021 [P] [US2] Update any test in `apps/web-app/components/TokenTree*.test.tsx` or `apps/web-app/lib/tokens/*.test.ts` that directly references the deleted `validateDimensionValue` or `describeColorForDisplay`/`color-display.ts` to use the generic `validateTokenValue`/`resolveBuiltInContract` path instead, without changing any user-facing assertion (depends on T018, T019)
- [ ] T022 [US2] Run `pnpm --filter @dtcg-editor/web-app test` and confirm `components/TokenTree.test.tsx`, `components/TokenTree.generic-editor.test.tsx`, `components/TokenTree.override.test.tsx`, and `components/TokenTree.a11y.test.tsx` all pass with no changes to user-facing assertions (depends on T020, T021)
- [ ] T023 [P] [US2] Run `pnpm --filter @dtcg-editor/token-type-color test` and `pnpm --filter @dtcg-editor/token-type-dimension test` and confirm both suites pass against the retrofitted package layout (depends on T020)
- [ ] T024 [US2] Manually verify color and dimension token editing (view, edit, invalid-value feedback, save) via `pnpm dev`, per quickstart.md §1, confirming the swatch, inputs, and validation messages are behaviorally identical to before the refactor (depends on T022, T023)

**Checkpoint**: Stories 1 and 2 both hold — dispatch is generic and no user-facing behavior regressed.

---

## Phase 5: User Story 3 - Tree components are auditable as generic, editor-agnostic code (Priority: P2)

**Goal**: `TreeNode.tsx`/`TokenTree.tsx` are verifiably free of concrete token-type imports and type-name conditionals, and both first-party packages follow the `components/` + `configuration.ts` convention.

**Independent Test**: Inspect `TreeNode.tsx`'s imports and logic; confirm no direct references to a specific token-type package and no branching on a specific type name.

- [ ] T025 [P] [US3] Run `grep -n "@dtcg-editor/token-type-color\|@dtcg-editor/token-type-dimension" apps/web-app/components/TreeNode.tsx apps/web-app/components/TokenTree.tsx` and confirm no output (SC-003) (depends on T013)
- [ ] T026 [P] [US3] Run `grep -n '=== "color"\|=== "dimension"\|isDimension\|isColor' apps/web-app/components/TreeNode.tsx` and confirm no output (SC-004) (depends on T014, T015, T016, T017)
- [ ] T027 [P] [US3] Confirm `packages/token-type-color/src/components/editor.tsx`, `packages/token-type-color/src/components/validation-error-handler.tsx`, `packages/token-type-color/src/configuration.ts`, `packages/token-type-dimension/src/components/editor.tsx`, and `packages/token-type-dimension/src/configuration.ts` all exist (SC-005) (depends on T004–T012)
- [ ] T028 [P] [US3] Run `grep -n "EditorOptions" packages/token-type-color/src/color.ts packages/token-type-dimension/src/dimension.ts` and confirm no output (SC-005) (depends on T004)
- [ ] T029 [P] [US3] Re-verify `apps/web-app/components/TokenTree.tsx` contains no editor-type-specific logic (FR-006) — confirm no source change was needed beyond re-verification, per plan.md Decision 4

**Checkpoint**: All three stories' acceptance criteria and every SC-00x measurable outcome hold.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final, whole-feature acceptance gate.

- [ ] T030 Register a stub editor extension for an unused token type (e.g. `fontFamily`) in a scratch/local `dtcg-editor.config.mts`, add a matching token under `sample_data/`, confirm it renders and handles value changes/validation in the running tree (`pnpm dev`) with zero source changes to `TreeNode.tsx`/`TokenTree.tsx` (quickstart.md §4 / SC-001), then revert the scratch config and sample data
- [ ] T031 [P] Run the repo's strict TypeScript build/typecheck and lint across `packages/token-type-contract`, `packages/token-type-color`, `packages/token-type-dimension`, and `apps/web-app` to confirm no relaxation was needed (Constitution Principle III)
- [ ] T032 Run the complete quickstart.md validation checklist end-to-end (all four sections) as the final acceptance gate before merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (the `ValidationErrorHandler` contract member must exist before any package implements or consumes it)
- **User Story 1 (Phase 3)**: Depends on Foundational; this phase _is_ the refactor — it must complete before Stories 2 and 3 can be verified
- **User Story 2 (Phase 4)**: Depends on Phase 3 (verifies the Phase 3 refactor introduced no regression)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (audits the Phase 3 refactor's structure); independent of Phase 4 — Phases 4 and 5 may run in parallel once Phase 3 completes
- **Polish (Phase 6)**: Depends on Phases 3, 4, and 5 all being complete

### Within Phase 3 (User Story 1)

- The two package retrofits (T004–T008 for color, T009–T012 for dimension) are independent of each other and of the `TreeNode.tsx` work, but T013 (removing `TreeNode.tsx`'s direct package imports) depends on both retrofits' `token-type.ts` updates (T007, T011) being done first
- T013 → T014 → T015 → T016 → T017 is a strict sequence (all edit the same file, each building on the last)
- T018 and T019 can run in parallel once T017 completes (different files)

### Parallel Opportunities

- T004, T005, T006 (color: configuration.ts, components/editor.tsx, components/validation-error-handler.tsx) — different files, no dependency on each other
- T009, T010 (dimension: configuration.ts, components/editor.tsx) — different files, no dependency on each other
- T008 and T007 — different files, both depend on T004–T006 but not on each other
- T012 and T011 — different files, both depend on T010 but not on each other
- T018 and T019 — different files, both depend on T017
- T020 and T021 — different test files, no dependency on each other
- T023 can run alongside T022 — different package test suites
- All of T025–T029 (Phase 5) are read-only verification steps and can run fully in parallel once their respective Phase 3 prerequisites land

---

## Parallel Example: Phase 3 package retrofits

```bash
# Launch the color package's independent file moves/splits together:
Task: "Create packages/token-type-color/src/configuration.ts (T004)"
Task: "Move editor.tsx to packages/token-type-color/src/components/ (T005)"
Task: "Create packages/token-type-color/src/components/validation-error-handler.tsx (T006)"

# In parallel, the dimension package's independent structural work:
Task: "Create packages/token-type-dimension/src/configuration.ts (T009)"
Task: "Move editor.tsx to packages/token-type-dimension/src/components/ (T010)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (confirm green baseline)
2. Complete Phase 2: Foundational (`ValidationErrorHandler` contract member)
3. Complete Phase 3: User Story 1 — the generic dispatch refactor itself
4. **STOP and VALIDATE**: `TreeNode.tsx` now has one dispatch path; a stub type registers with zero tree-component changes

### Incremental Delivery

1. Setup + Foundational → contract ready
2. User Story 1 → the refactor lands (MVP: coupling removed)
3. User Story 2 → regression-verify against existing suites and manual editing scenarios
4. User Story 3 → structurally audit the result (grep-based SC checks)
5. Polish → new-type end-to-end proof, typecheck/lint, full quickstart re-run

### Notes

- Every phase after Phase 3 largely re-examines the _same_ files Phase 3 changed (verification, not new construction) — this matches spec.md's own priority rationale: Story 3 is "a consequence of satisfying [Stories 1–2] correctly, not a separately testable behavior in itself."
- No task in this list adds a new third-party dependency, changes the `TokenTypeContract` interface's existing members, or alters DTCG token file I/O — consistent with plan.md's Constraints and Assumptions.
- Commit after each task or logical group; stop at any checkpoint to validate independently.
