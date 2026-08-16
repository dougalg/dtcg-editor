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

- [x] T001 Run `pnpm --filter @dtcg-editor/web-app test`, `pnpm --filter @dtcg-editor/token-type-color test`, `pnpm --filter @dtcg-editor/token-type-dimension test`, and `pnpm --filter @dtcg-editor/token-type-contract test` from the repo root and confirm all suites pass before making any change

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the shared `TokenTypeContract` interface with the new members every later phase depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add an optional `ValidationErrorHandler?(props: { readonly value: unknown; readonly error: TokenTypeValidationError }): ReactElement | null` member to `TokenTypeContract<TValue>` in `packages/token-type-contract/src/contract.ts`, per `contracts/token-type-contract.md`'s "After" shape — `error` is a plain `TokenTypeValidationError`, not a `Result`, since the host only ever calls this once it has already confirmed validation failed (no other member's type changes)
- [x] T003 Export a new `TokenTypeValidationIssue` interface (`{ readonly path: readonly PropertyKey[]; readonly message: string; readonly code: string }`) and add a parallel `readonly issues: readonly TokenTypeValidationIssue[]` field to `TokenTypeValidationError`, both in `packages/token-type-contract/src/contract.ts`; populate `issues` in `validateTokenValue` by mapping each Zod issue to `{ path: issue.path, message: issue.message, code: issue.code }` from the same `safeParse` call already producing `message`, without changing `message`'s existing derivation/format (depends on T002)
- [x] T004 [P] Extend `packages/token-type-contract/src/contract.test.ts` to cover: a contract that omits `ValidationErrorHandler` and one that supplies it (receiving `{ value, error }`, `error` always a concrete `TokenTypeValidationError`) both type-check and behave correctly; `validateTokenValue`'s returned `err`'s `issues` array has one `{ path, message, code }` entry per Zod issue (with `path` as the raw unjoined segment array) while `message` is unchanged from today's joined format (depends on T003)

**Checkpoint**: `TokenTypeContract` now has the `ValidationErrorHandler` member (receiving `value` and a plain `error`) and `TokenTypeValidationError` now has `issues`; every implementer of the interface (built-in or third-party) remains valid unmodified.

---

## Phase 3: User Story 1 - Add a new token-type editor without touching the tree (Priority: P1) 🎯 MVP

**Goal**: `TreeNode.tsx` resolves and renders every standard type — built-in or custom — through one generic dispatch path (`resolveBuiltInContract` + `validateTokenValue` for validation, `resolveEditorForType` + a single render for the UI), with the dimension and color special cases deleted.

**Independent Test**: Register a new token-type editor via the existing extension mechanism only, with no changes to `TreeNode.tsx`/`TokenTree.tsx`; confirm it renders and handles value changes/validation.

### Package retrofit: `token-type-color` (FR-009/FR-010/FR-011)

- [x] T005 [P] [US1] Create `packages/token-type-color/src/configuration.ts` holding `ColorEditorOptions`, `ColorEditorOptionsSchema`, and `defineColorConfig`, moved out of `packages/token-type-color/src/color.ts` (importing `ColorSpace`/`COLOR_SPACES` from `color.ts`); `color.ts` keeps only `ColorValueSchema`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`, `checkColorValueIssues`, and `COLOR_SPACES`/`ColorSpace`
- [x] T006 [P] [US1] Create `packages/token-type-color/src/components/` and move `packages/token-type-color/src/editor.tsx` → `packages/token-type-color/src/components/editor.tsx` and `packages/token-type-color/src/editor.module.css` → `packages/token-type-color/src/components/editor.module.css`, updating the `./editor.module.css` import; logic unchanged (new range-issue-display logic is added separately in T007)
- [x] T007 [P] [US1] In `packages/token-type-color/src/components/editor.tsx`'s `ObjectColorEditor`, render `checkColorValueIssues(value)`'s issue list (the same `<div role="alert"><ul>...</ul></div>` structure `TreeNode.tsx` currently renders via `editableColorIssues`), computed directly from the `ColorValue` already available as its `value` prop — no new prop, no `TreeNode.tsx` involvement; `LegacyHexColorEditor` needs no equivalent since `checkColorValueIssues` always returns `[]` for string (legacy-hex) values (depends on T006)
- [x] T008 [P] [US1] Create `packages/token-type-color/src/components/validation-error-handler.tsx` implementing the new `ValidationErrorHandler` contract member (`(props: { value: unknown; error: TokenTypeValidationError }) => ReactElement | null`), moving only the doesn't-parse-at-all half of `ColorDisplayInfo`/`describeColorForDisplay`'s logic from `apps/web-app/lib/tokens/color-display.ts` (the range-issue/swatch half for successfully-parsed values moved separately into `components/editor.tsx` per T007); this component only ever renders once a value has failed `ColorValueSchema` (a `z.union`), so no swatch is ever shown here (both `LegacyHexColorValueSchema` and `ColorObjectValueSchema` also fail in that case) and the incoming `error.issues` collapses to a single `{ code: "invalid_union", path: [], message: "Invalid input" }` entry — validate the raw `value` against `ColorObjectValueSchema`/`LegacyHexColorValueSchema` directly for the per-field issue text exactly as `describeColorForDisplay` does today, using `error` only as a signal that something failed, not as the source of message text (depends on T006)
- [x] T009 [US1] Update `packages/token-type-color/src/token-type.ts` to assemble `colorTokenType` with `Editor` from `./components/editor.tsx`, the new `ValidationErrorHandler` from `./components/validation-error-handler.tsx`, and `editorOptionsSchema` from `./configuration.ts` (depends on T005, T007, T008)
- [x] T010 [P] [US1] Update `packages/token-type-color/src/index.ts`'s export paths to match the new `components/`/`configuration.ts` locations (depends on T005, T007, T008)

### Package retrofit: `token-type-dimension` (FR-009/FR-010/FR-011, structural only)

- [x] T011 [P] [US1] Create `packages/token-type-dimension/src/configuration.ts` as an initially empty module (no exports yet) per FR-009/FR-010/FR-011 and research.md Decision 6
- [x] T012 [P] [US1] Create `packages/token-type-dimension/src/components/` and move `packages/token-type-dimension/src/editor.tsx` → `packages/token-type-dimension/src/components/editor.tsx`; logic unchanged
- [x] T013 [US1] Update `packages/token-type-dimension/src/token-type.ts` to import `DimensionEditor` from `./components/editor.tsx` (depends on T012)
- [x] T014 [P] [US1] Update `packages/token-type-dimension/src/index.ts`'s export path for the moved editor (depends on T012)

### `TreeNode.tsx` generic dispatch (FR-001–FR-003, FR-006)

- [x] T015 [US1] In `apps/web-app/components/TreeNode.tsx`, remove the direct imports of `dimensionTokenType`/`DimensionValue` (`@dtcg-editor/token-type-dimension`) and `colorTokenType` (`@dtcg-editor/token-type-color`), and remove the `DimensionEditorComponent` cast type (depends on T009, T013)
- [x] T016 [US1] In `apps/web-app/components/TreeNode.tsx`, replace the `isDimension`-gated `builtInContract` resolution with a single `resolveBuiltInContract(effectiveType)` lookup used for every standard type; delete `isDimension`, `dimensionValueValidation`, and `existingDimensionValue` (depends on T015)
- [x] T017 [US1] In `apps/web-app/components/TreeNode.tsx`'s read-only (`!canEdit`) branch, replace the `isColor`/`describeColorForDisplay` swatch-and-issues rendering with a generic render of `builtInContract?.ValidationErrorHandler`, invoked with `{ value: node.value, error: genericValueValidation.error }` — safe because `!canEdit` with a defined `builtInContract` only occurs when `genericValueValidation.isErr()` (per T016's `canEdit` formula), so `.error` always exists — falling back to today's plain name/type/value text when `ValidationErrorHandler` is absent (depends on T016, T008)
- [x] T018 [US1] In `apps/web-app/components/TreeNode.tsx`'s editable branch, delete the `editableColorIssues` computation and its rendering entirely — no replacement needed in `TreeNode.tsx`, since `ColorEditor` now renders this range-issue list itself (T007); `ValidationErrorHandler` is never invoked from the editable branch, since (per T002) it's only ever called once validation has already failed, and `canEdit` being true here means it hasn't (depends on T017, T007)
- [x] T019 [US1] In `apps/web-app/components/TreeNode.tsx`, collapse `handleDimensionValueChange`/`handleGenericValueChange` into one value-change handler used for every standard type: when `builtInContract` is defined, validate the next value via `validateTokenValue(builtInContract, next)` before staging, blocking the stage and calling `onFieldError` on failure exactly as `handleDimensionValueChange` does today (generalizing dimension's validate-before-stage gate to color too, per research.md's Decision 1 addendum); when no `builtInContract` exists, stage the value as-is (today's generic-editor trust-as-is behavior). Also replace the `DimensionEditor`/`GenericEditor` dual-cast render branch with a single resolved-editor render (depends on T018)
- [x] T020 [P] [US1] In `apps/web-app/lib/tokens/edit-state.ts`, delete `DimensionValidationResult` and `validateDimensionValue`, and remove the now-unused `dimensionTokenType`/`DimensionValue` imports (depends on T019)
- [x] T021 [P] [US1] Delete `apps/web-app/lib/tokens/color-display.ts` now that both halves of its logic live in `packages/token-type-color/src/components/editor.tsx` (T007) and `packages/token-type-color/src/components/validation-error-handler.tsx` (T008) (depends on T019, T007, T008)

**Checkpoint**: A new token-type editor can be registered purely as an extension (built-in `built-in.ts` entry or user `dtcg-editor.config.mts` entry) with zero source changes to `TreeNode.tsx`/`TokenTree.tsx`; dimension and color are two ordinary entries in that same mechanism.

---

## Phase 4: User Story 2 - Existing token editing behaves exactly as before (Priority: P1)

**Goal**: Every existing color/dimension editing scenario — view, edit, invalid-value feedback, save — behaves identically to before the refactor.

**Independent Test**: Run the existing color/dimension editing scenarios and confirm every outcome matches pre-refactor behavior.

- [x] T022 [P] [US2] Update `apps/web-app/lib/token-editors/color-editor.test.tsx` (and any other test importing from the old `packages/token-type-color/src/editor.tsx` or `color.ts`'s config exports) to the new `components/editor.tsx`/`configuration.ts` locations, including coverage for the range-issue list now rendered by `ObjectColorEditor` itself (T007), without changing any assertion on rendered/user-facing behavior (depends on T005–T010)
- [x] T023 [P] [US2] Update any test in `apps/web-app/components/TokenTree*.test.tsx` or `apps/web-app/lib/tokens/*.test.ts` that directly references the deleted `validateDimensionValue` or `describeColorForDisplay`/`color-display.ts` to use the generic `validateTokenValue`/`resolveBuiltInContract` path instead, without changing any user-facing assertion (depends on T020, T021)
- [x] T024 [US2] Run `pnpm --filter @dtcg-editor/web-app test` and confirm `components/TokenTree.test.tsx`, `components/TokenTree.generic-editor.test.tsx`, `components/TokenTree.override.test.tsx`, and `components/TokenTree.a11y.test.tsx` all pass with no changes to user-facing assertions (depends on T022, T023)
- [x] T025 [P] [US2] Run `pnpm --filter @dtcg-editor/token-type-color test` and `pnpm --filter @dtcg-editor/token-type-dimension test` and confirm both suites pass against the retrofitted package layout (depends on T022)
- [x] T026 [US2] Manually verify color and dimension token editing (view, edit, invalid-value feedback, save) via `pnpm dev`, per quickstart.md §1, confirming the swatch, inputs, and validation messages — including the color range-issue list while editing — are behaviorally identical to before the refactor (depends on T024, T025)

**Checkpoint**: Stories 1 and 2 both hold — dispatch is generic and no user-facing behavior regressed.

---

## Phase 5: User Story 3 - Tree components are auditable as generic, editor-agnostic code (Priority: P2)

**Goal**: `TreeNode.tsx`/`TokenTree.tsx` are verifiably free of concrete token-type imports and type-name conditionals, and both first-party packages follow the `components/` + `configuration.ts` convention.

**Independent Test**: Inspect `TreeNode.tsx`'s imports and logic; confirm no direct references to a specific token-type package and no branching on a specific type name.

- [x] T027 [P] [US3] Run `grep -n "@dtcg-editor/token-type-color\|@dtcg-editor/token-type-dimension" apps/web-app/components/TreeNode.tsx apps/web-app/components/TokenTree.tsx` and confirm no output (SC-003) (depends on T015)
- [x] T028 [P] [US3] Run `grep -n '=== "color"\|=== "dimension"\|isDimension\|isColor' apps/web-app/components/TreeNode.tsx` and confirm no output (SC-004) (depends on T016, T017, T018, T019)
- [x] T029 [P] [US3] Confirm `packages/token-type-color/src/components/editor.tsx`, `packages/token-type-color/src/components/validation-error-handler.tsx`, `packages/token-type-color/src/configuration.ts`, `packages/token-type-dimension/src/components/editor.tsx`, and `packages/token-type-dimension/src/configuration.ts` all exist (SC-005) (depends on T005–T014)
- [x] T030 [P] [US3] Run `grep -n "EditorOptions" packages/token-type-color/src/color.ts packages/token-type-dimension/src/dimension.ts` and confirm no output (SC-005) (depends on T005)
- [x] T031 [P] [US3] Re-verify `apps/web-app/components/TokenTree.tsx` contains no editor-type-specific logic (FR-006) — confirm no source change was needed beyond re-verification, per plan.md Decision 4

**Checkpoint**: All three stories' acceptance criteria and every SC-00x measurable outcome hold.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final, whole-feature acceptance gate.

- [x] T032 Register a stub editor extension for an unused token type (e.g. `fontFamily`) in a scratch/local `dtcg-editor.config.mts`, add a matching token under `sample_data/`, confirm it renders and handles value changes/validation in the running tree (`pnpm dev`) with zero source changes to `TreeNode.tsx`/`TokenTree.tsx` (quickstart.md §4 / SC-001), then revert the scratch config and sample data
- [x] T033 [P] Run the repo's strict TypeScript build/typecheck and lint across `packages/token-type-contract`, `packages/token-type-color`, `packages/token-type-dimension`, and `apps/web-app` to confirm no relaxation was needed (Constitution Principle III)
- [x] T034 Run the complete quickstart.md validation checklist end-to-end (all four sections) as the final acceptance gate before merge

---

## Phase 7: User Story 1 follow-up - Split TreeNode.tsx and simplify token dispatch to the explicit 5-path model

**Purpose**: Post-implementation design refinement (2026-08-16 follow-up, see plan.md). Phase 3's `TreeNode.tsx` rewrite works but (a) its dispatch logic (`isStandard`/`builtInContract`/`canEdit` computed piecemeal, an `effectiveType !== undefined` guard duplicated at three call sites) reads as more branches than the behavior actually has, and (b) it's one component doing two unrelated jobs — token editing/validation and group rename/recursion — split only by an early `if`. This phase (1) splits `TreeNode.tsx` into a thin dispatcher plus `TreeTokenNode.tsx`/`TreeGroupNode.tsx`, and (2) restates the token half's dispatch as the explicit 5-path model, entirely inside `TreeTokenNode.tsx` — per plan.md's "TreeNode.tsx / TreeTokenNode.tsx / TreeGroupNode.tsx split" and "TreeNode.tsx dispatch design" sections, and data-model.md's `TreeNodeProps`/`DefaultValidationErrorHandler` entries. No FR, user story, or `TokenTypeContract` shape changes (FR-001/FR-003/SC-003/SC-004's audit target widens from one file to three, per plan.md).

**Goal**: `TreeNode.tsx` is a two-line dispatcher on `node.kind`; `TreeGroupNode.tsx` holds only rename/expand-collapse/recursion; `TreeTokenNode.tsx` holds 100% of the token logic, computing exactly `isUsableType` → `contract` → `validation` → `isValid`, then dispatching to one of the two branches (editable: registered editor or `FallbackValueEditor`; read-only: `contract?.ValidationErrorHandler ?? DefaultValidationErrorHandler`, called once) — with no other intermediate flags.

**Independent Test**: Read `TreeTokenNode.tsx` top to bottom; confirm each of the 5 paths (valid+editor, valid+no editor, invalid+package handler, invalid+no package handler, no usable type) is reachable through exactly one shared derivation, with no duplicated `effectiveType !== undefined` guard, and confirm `TreeGroupNode.tsx` contains no token-editing logic and `TreeNode.tsx` contains no logic beyond the `node.kind` dispatch.

- [ ] T035 [P] [US1] Create `apps/web-app/components/DefaultValidationErrorHandler.tsx` implementing `(props: { readonly value: unknown; readonly error?: TokenTypeValidationError }) => ReactElement | null` — renders `<span role="alert">{error.message}</span>` when `error` is defined, `null` otherwise; this is the same "extra content below name/type/value" slot a package's own `ValidationErrorHandler` already fills (e.g. `packages/token-type-color/src/components/validation-error-handler.tsx`), not the name/type/value shell itself, which stays the token component's own unconditional rendering (T036). Add `apps/web-app/components/DefaultValidationErrorHandler.test.tsx` covering both cases (with `error`, without) directly, unit-level, no tree-component involvement
- [ ] T036 [US1] Create `apps/web-app/components/TreeTokenNode.tsx` exporting `TreeTokenNode(props: TreeNodeProps)`: move `TreeNode.tsx`'s current `if (node.kind === "token") { ... }` body into it verbatim as a starting point, then rewrite its dispatch to the explicit 5-path model per plan.md's "TreeNode.tsx dispatch design" — compute `isUsableType` (`effectiveType !== undefined && isDtcgTokenType(effectiveType)`), `contract` (`resolveBuiltInContract(effectiveType)`, only when `isUsableType`), `validation` (`validateTokenValue(contract, node.value)`, only when `contract` exists), and `isValid` (`isUsableType && (contract === undefined || validation.isOk())`) — replacing the old `isStandard`/`builtInContract`/`canEdit` computed piecemeal; the editable branch (paths 1-2, `isValid`) resolves and renders `resolveEditorForType`'s editor or falls back to `FallbackValueEditor`, exactly as today (no behavior change); the read-only branch (paths 3-5, `!isValid`) computes `errorForHandler = validation?.isErr() === true ? validation.error : undefined` and `Handler = contract?.ValidationErrorHandler ?? DefaultValidationErrorHandler`, calling it once (`<Handler value={node.value} error={errorForHandler} />`) as the sole extra-content call site beneath the unconditional name/type/value fields; delete the `effectiveType !== undefined` guard duplicated across the old `isStandard` computation and both JSX label conditionals, deriving the type label directly from `effectiveType` where still needed (depends on T035)
- [ ] T037 [P] [US1] Create `apps/web-app/components/TreeGroupNode.tsx` exporting `TreeGroupNode(props: TreeNodeProps)`: move `TreeNode.tsx`'s current group-branch body (everything after the `node.kind === "token"` `if` returns — `isRoot`, `groupKey`/`groupPending`/`groupErrors`/`currentGroupName`, `handleGroupNameChange`, the `<li className={styles.group}>` render, and the `node.children.map` recursion) into it verbatim — no logic change; recursion continues to render `<TreeNode key={...} node={child} ... />` (the dispatcher, unchanged reference — not `TreeGroupNode` recursing into itself)
- [ ] T038 [US1] Rewrite `apps/web-app/components/TreeNode.tsx` to a thin dispatcher: keep `TreeNodeProps`/`FieldErrors`/`EditablePatch` (still the shared exported types) and `pathKey`, but replace the entire body with `return node.kind === "token" ? <TreeTokenNode {...props} /> : <TreeGroupNode {...props} />`; delete every other helper/handler now that they live in T036/T037 (depends on T036, T037)
- [ ] T039 [P] [US1] Add a `apps/web-app/components/TokenTree.test.tsx` case: a token with a recognized standard type (`dimension`) and a value that fails `DimensionValueSchema` now renders a generic `role="alert"` with `error.message` via `DefaultValidationErrorHandler` — previously showed no error indication at all in this case, since dimension has no package `ValidationErrorHandler` (this is path 4 of the model, explicitly requested per the 2026-08-16 clarification, not a regression) (depends on T038)
- [ ] T040 [P] [US1] Add a `apps/web-app/components/TokenTree.test.tsx` case: a token with a non-standard/unrecognized declared type (or no `effectiveType`) still renders read-only with no extra alert (path 5, `DefaultValidationErrorHandler` called with `error` undefined) — regression coverage confirming the existing "(non-standard)" read-only behavior is unchanged (depends on T038)
- [ ] T041 [US1] Run `pnpm --filter @dtcg-editor/web-app test` and confirm every suite passes, including T035/T039/T040's new coverage, with no changes to any other test's existing assertions (depends on T035, T039, T040)
- [ ] T042 [P] [US1] Re-run `grep -n "@dtcg-editor/token-type-color\|@dtcg-editor/token-type-dimension" apps/web-app/components/TreeNode.tsx apps/web-app/components/TreeTokenNode.tsx apps/web-app/components/TreeGroupNode.tsx apps/web-app/components/TokenTree.tsx` and `grep -n '=== "color"\|=== "dimension"\|isDimension\|isColor' apps/web-app/components/TreeNode.tsx apps/web-app/components/TreeTokenNode.tsx apps/web-app/components/TreeGroupNode.tsx`, confirming both still produce no output after the split (SC-003/SC-004 still hold across all three files, per quickstart.md §2) (depends on T038)
- [ ] T043 [P] Run the repo's strict TypeScript build/typecheck (`next build`) and lint (`eslint`) across `apps/web-app` to confirm no relaxation was needed (Constitution Principle III) (depends on T038)

**Checkpoint**: `TreeNode.tsx` is a pure dispatcher; `TreeGroupNode.tsx` contains only group logic; `TreeTokenNode.tsx`'s dispatch matches plan.md's 5-path model exactly; SC-001–SC-005 and FR-001–FR-008 still hold across all three files; the only observable behavior change is the intentionally-requested one (an invalid dimension value now shows a generic error line in read-only mode, per path 4).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (the `ValidationErrorHandler` contract member and `TokenTypeValidationError.issues` must exist before any package implements or consumes them)
- **User Story 1 (Phase 3)**: Depends on Foundational; this phase _is_ the refactor — it must complete before Stories 2 and 3 can be verified
- **User Story 2 (Phase 4)**: Depends on Phase 3 (verifies the Phase 3 refactor introduced no regression)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (audits the Phase 3 refactor's structure); independent of Phase 4 — Phases 4 and 5 may run in parallel once Phase 3 completes
- **Polish (Phase 6)**: Depends on Phases 3, 4, and 5 all being complete
- **User Story 1 follow-up (Phase 7)**: Depends on Phase 6 (the whole feature was already shipped once); restates Phase 3's `TreeNode.tsx` dispatch, so it re-touches the same file — no other phase depends on it

### Within Phase 2 (Foundational)

- T002 → T003 → T004 is a strict sequence (each builds on the prior addition to the same `contract.ts`/`contract.test.ts` pair)

### Within Phase 3 (User Story 1)

- The two package retrofits (T005–T010 for color, T011–T014 for dimension) are independent of each other and of the `TreeNode.tsx` work, but T015 (removing `TreeNode.tsx`'s direct package imports) depends on both retrofits' `token-type.ts` updates (T009, T013) being done first
- Within the color retrofit: T007 and T008 both depend on T006 (they add logic to/alongside the file T006 creates) but are independent of each other (different files); T009/T010 depend on T005, T007, T008
- T015 → T016 → T017 → T018 → T019 is a strict sequence (all edit the same file, each building on the last)
- T020 and T021 can run in parallel once T019 completes (different files)

### Parallel Opportunities

- T005, T006 (color: configuration.ts, components/editor.tsx move) — different files, no dependency on each other; T007 and T008 can then run in parallel once T006 lands (different files)
- T011, T012 (dimension: configuration.ts, components/editor.tsx) — different files, no dependency on each other
- T009 and T010 — different files, both depend on T005, T007, T008 but not on each other
- T013 and T014 — different files, both depend on T012 but not on each other
- T020 and T021 — different files, both depend on T019
- T022 and T023 — different test files, no dependency on each other
- T025 can run alongside T024 — different package test suites
- All of T027–T031 (Phase 5) are read-only verification steps and can run fully in parallel once their respective Phase 3 prerequisites land

### Within Phase 7 (User Story 1 follow-up)

- T035 (new component) and T037 (extracting the group half) have no dependency on each other or on T036, and can run in parallel; T036 (extracting + rewriting the token half) depends on T035, since its read-only branch calls `DefaultValidationErrorHandler`
- T038 (thinning `TreeNode.tsx` to a dispatcher) depends on both T036 and T037 existing first
- T039, T040, T042, T043 all depend on T038 but are independent of each other (different files/read-only checks); T041 depends on T039 and T040 (runs the suite they add to)

---

## Parallel Example: Phase 3 package retrofits

```bash
# Launch the color package's independent file moves/splits together:
Task: "Create packages/token-type-color/src/configuration.ts (T005)"
Task: "Move editor.tsx to packages/token-type-color/src/components/ (T006)"

# Once T006 lands, its two independent follow-ons:
Task: "Add range-issue rendering to ObjectColorEditor (T007)"
Task: "Create packages/token-type-color/src/components/validation-error-handler.tsx (T008)"

# In parallel, the dimension package's independent structural work:
Task: "Create packages/token-type-dimension/src/configuration.ts (T011)"
Task: "Move editor.tsx to packages/token-type-dimension/src/components/ (T012)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (confirm green baseline)
2. Complete Phase 2: Foundational (`ValidationErrorHandler` contract member + `TokenTypeValidationError.issues`)
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
- `ValidationErrorHandler` (T002) is invoked exactly once in `TreeNode.tsx`, in the read-only/invalid branch (T017, restated by T036), and always with a concrete `error` — never in the editable branch (T018), since a value reaching that branch has already passed validation. Any "valid but flagged" display (color's range check) is the `Editor`'s own concern (T007), not `ValidationErrorHandler`'s.
- No task in this list adds a new third-party dependency, changes the `TokenTypeContract` interface's existing members, or alters DTCG token file I/O — consistent with plan.md's Constraints and Assumptions.
- Phase 7 is a design-clarity refactor of Phase 3's own output, not new scope: `isUsableType`/`contract`/`validation`/`isValid`/`errorForHandler`/`Handler` are the same facts Phase 3's `isStandard`/`builtInContract`/`canEdit` already computed, just named, sequenced to match plan.md's 5-path model instead of being interleaved, and now split out of the group-handling code they were never related to. The one deliberate, disclosed behavior change (T039) — an invalid dimension value now shows a generic alert in read-only mode, where before it silently showed nothing — is exactly path 4 of the model the user asked for, not a side effect.
- Commit after each task or logical group; stop at any checkpoint to validate independently.
