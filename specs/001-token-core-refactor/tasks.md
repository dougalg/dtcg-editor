---
description: "Task list for Token-Core Parsing Consolidation & Token-Editor Rename"
---

# Tasks: Token-Core Parsing Consolidation & Token-Editor Rename

**Input**: Design documents from `/specs/001-token-core-refactor/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: This is a pure internal refactor (spec User Story 3) — no new test *behavior* is requested. Existing tests move alongside their code; no new test-writing tasks are generated beyond what each move/split requires.

**Organization**: Tasks are grouped by user story (all three are P1 in spec.md) to enable independent verification of each. Because this refactor moves files between packages, the stories have a real, sequential dependency (US2 needs US1's `token-core` exports to repoint to; US3 needs US2's renamed packages to repoint to) — noted explicitly in Dependencies below, unlike a typical feature where stories are parallel-independent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes its exact file path(s)

## Path Conventions

pnpm workspace monorepo: `packages/*` (library packages), `apps/web-app` (Next.js app). No `src/`/`tests/` single-project layout applies — see `plan.md`'s Project Structure section for the full post-refactor tree.

---

## Phase 1: Setup

**Purpose**: Confirm a clean, buildable starting point before any move begins.

- [ ] T001 Run `pnpm install` at the repo root to confirm the workspace resolves cleanly on current `main` (post-002-simplify-tree-node) before any package is touched

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the pre-refactor baseline that every story's zero-regression success criteria (SC-003, SC-004) are checked against.

**⚠️ CRITICAL**: No user story work should begin until this baseline is captured.

- [ ] T002 Run `pnpm build && pnpm lint && pnpm test` at the repo root and record the pass/fail state and test count as the pre-refactor baseline (compared against in T046)

**Checkpoint**: Baseline captured — user story implementation can now begin.

---

## Phase 3: User Story 1 - Import type-specific parsing without pulling in editor UI (Priority: P1) 🎯 MVP

**Goal**: `token-core` becomes an importable, React-free source of every DTCG token type's value schema, derived types, and structural-validation logic — additive only in this phase (existing `token-type-*` packages are untouched here, trimmed in US2).

**Independent Test**: Import `ColorValueSchema`/`DimensionValueSchema` from `@dtcg-editor/token-core` alone (no `token-type-*`/`token-editor-*` package in the dependency tree) and successfully validate a sample value; inspect `token-core/package.json` and confirm no `react` dependency.

### Implementation for User Story 1

- [ ] T003 [US1] Create `packages/token-core/src/color.ts` containing the structural exports currently in `packages/token-type-color/src/color.ts` (`COLOR_SPACES`, `ColorSpace`, `ColorComponent`, `ColorObjectValue`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`, `ColorValueSchema`, `ColorValue`) — copy only; the source file is trimmed later in T010, not here, so `token-type-color` keeps building unmodified through this phase
- [ ] T004 [P] [US1] Create `packages/token-core/src/dimension.ts` as a copy of `packages/token-type-dimension/src/dimension.ts` (`DimensionValueSchema`, `DimensionValue`) — source file deleted later in T024
- [ ] T005 [P] [US1] Create `packages/token-core/src/color.test.ts` containing only the structural-schema test cases (`ColorValueSchema`/`ColorObjectValueSchema`/`LegacyHexColorValueSchema`) copied from `packages/token-type-color/src/color.test.ts`
- [ ] T006 [P] [US1] Create `packages/token-core/src/dimension.test.ts` as a copy of `packages/token-type-dimension/src/dimension.test.ts`
- [ ] T007 [US1] Update `packages/token-core/src/index.ts` to export `color.ts` and `dimension.ts`'s new modules (depends on T003, T004)
- [ ] T008 [US1] Update the stale "must not depend on `token-type-color`" comment in `packages/token-core/src/color-sample.test.ts` to reflect that `token-core` now defines `ColorValueSchema` itself
- [ ] T009 [US1] Confirm `packages/token-core/package.json` still declares no dependency on `react`, `colorjs.io`, or any `token-type-*`/`token-editor-*` package (zod-only addition; nothing to change, verify only)

**Checkpoint**: `token-core` now exports `ColorValueSchema`/`DimensionValueSchema` and their derived types independently of any editor package — User Story 1's acceptance scenarios are verifiable in isolation.

---

## Phase 4: User Story 2 - Each token-editor package is UI-only, and named to match (Priority: P1)

**Goal**: `token-type-color`/`token-type-dimension`/`token-type-contract` are trimmed to hold only editor UI, editor config, value-adjacent utilities (grouped under a new `utils/` subfolder per FR-011), and `TokenTypeContract` wiring — then renamed to the `token-editor-*` family.

**Independent Test**: Audit each renamed `token-editor-*` package's source tree and confirm every file is UI, config, a `utils/`-grouped value-adjacent utility, or contract wiring — no standalone structural value-schema module — and confirm no `token-type-*` name remains anywhere in the codebase.

**Depends on**: User Story 1 (needs `token-core`'s new `color.ts`/`dimension.ts` exports to repoint to).

### Implementation for User Story 2 — trim & reorganize `token-type-color`

- [ ] T010 [P] [US2] Create `packages/token-type-color/src/utils/range-validation.ts`, moved and trimmed from `src/color.ts`: keep only `COMPONENT_RANGES`, `checkColorValueIssues`, and their private helpers (`ComponentRange`, `ComponentRanges`, `isWithinRange`, `UNIT_RGB_RANGES`, `UNIT_XYZ_RANGES`); import `ColorSpace`/`ColorValue`/`ColorComponent` from `@dtcg-editor/token-core` instead of defining them locally; delete `src/color.ts` (depends on T003)
- [ ] T011 [P] [US2] Create `packages/token-type-color/src/utils/range-validation.test.ts`, moved and trimmed from `src/color.test.ts` to keep only `checkColorValueIssues`/`COMPONENT_RANGES` test cases; delete `src/color.test.ts` (depends on T010)
- [ ] T012 [P] [US2] Move `packages/token-type-color/src/conversion.ts` to `packages/token-type-color/src/utils/conversion.ts` unchanged (`colorjs.io` import and dependency stay as-is)
- [ ] T013 [P] [US2] Move `packages/token-type-color/src/conversion.test.ts` to `packages/token-type-color/src/utils/conversion.test.ts` unchanged
- [ ] T014 [P] [US2] Move `packages/token-type-color/src/css-color.ts` to `packages/token-type-color/src/utils/css-color.ts` unchanged
- [ ] T015 [P] [US2] Move `packages/token-type-color/src/css-color.test.ts` to `packages/token-type-color/src/utils/css-color.test.ts` unchanged
- [ ] T016 [US2] Update imports in `packages/token-type-color/src/components/editor.tsx`: `COLOR_SPACES`/`ColorObjectValue`/`ColorSpace`/`ColorValue` from `@dtcg-editor/token-core`; `checkColorValueIssues`/`COMPONENT_RANGES` from `../utils/range-validation.ts`; `colorValueToCssColor` from `../utils/css-color.ts`; `colorValueToSrgbHex`/`srgbHexToColorSpaceComponents` from `../utils/conversion.ts` (depends on T003, T010, T012, T014)
- [ ] T017 [US2] Update imports in `packages/token-type-color/src/components/validation-error-handler.tsx`: `ColorObjectValueSchema`/`LegacyHexColorValueSchema` from `@dtcg-editor/token-core` (depends on T003)
- [ ] T018 [US2] Update the import in `packages/token-type-color/src/configuration.ts`: `COLOR_SPACES`/`ColorSpace` from `@dtcg-editor/token-core` instead of `./color.ts` (depends on T003)
- [ ] T019 [US2] Update `packages/token-type-color/src/token-type.ts`: `colorTokenType` imports `ColorValueSchema`/`ColorValue` from `@dtcg-editor/token-core` instead of `./color.ts` (depends on T003)
- [ ] T020 [US2] Update `packages/token-type-color/src/index.ts` exports: `components/`'s `Editor`/`ValidationErrorHandler`, `configuration.ts`'s config type/schema, `utils/`'s `checkColorValueIssues`/`COMPONENT_RANGES`/`colorValueToCssColor`/`colorValueToSrgbHex`/`srgbHexToColorSpaceComponents`, and the wired contract — drop the structural schema/type exports (depends on T010–T019)
- [ ] T021 [US2] Add `@dtcg-editor/token-core` as a `workspace:*` dependency to `packages/token-type-color/package.json` via `pnpm add @dtcg-editor/token-core@workspace:* --filter token-type-color` (depends on T016–T019)

### Implementation for User Story 2 — trim `token-type-dimension`

- [ ] T022 [P] [US2] Update the import in `packages/token-type-dimension/src/components/editor.tsx`: `DimensionValue` type from `@dtcg-editor/token-core` instead of `../dimension.ts` (depends on T004)
- [ ] T023 [P] [US2] Update `packages/token-type-dimension/src/token-type.ts`: `dimensionTokenType` imports `DimensionValueSchema`/`DimensionValue` from `@dtcg-editor/token-core` (depends on T004)
- [ ] T024 [P] [US2] Delete `packages/token-type-dimension/src/dimension.ts` and `dimension.test.ts` (moved to `token-core` in T004/T006)
- [ ] T025 [US2] Update `packages/token-type-dimension/src/index.ts` exports to `Editor` + wired contract only (depends on T022–T024)
- [ ] T026 [US2] Add `@dtcg-editor/token-core` as a `workspace:*` dependency to `packages/token-type-dimension/package.json` via `pnpm add @dtcg-editor/token-core@workspace:* --filter token-type-dimension` (depends on T022–T023)

### Implementation for User Story 2 — rename the package family

- [ ] T027 [US2] Rename `packages/token-type-color` to `packages/token-editor-color` via `git mv` (depends on T010–T021)
- [ ] T028 [P] [US2] Rename `packages/token-type-dimension` to `packages/token-editor-dimension` via `git mv` (depends on T022–T026)
- [ ] T029 [P] [US2] Rename `packages/token-type-contract` to `packages/token-editor-contract` via `git mv` (content unchanged)
- [ ] T030 [US2] Update `packages/token-editor-color/package.json`'s `name` to `@dtcg-editor/token-editor-color` via `pnpm pkg set name=@dtcg-editor/token-editor-color --filter <path>`, and its `@dtcg-editor/token-type-contract` dependency entry to `@dtcg-editor/token-editor-contract` via `pnpm remove`/`pnpm add` (depends on T027, T029)
- [ ] T031 [P] [US2] Update `packages/token-editor-dimension/package.json`'s `name` to `@dtcg-editor/token-editor-dimension` and its contract dependency to `@dtcg-editor/token-editor-contract` (depends on T028, T029)
- [ ] T032 [P] [US2] Update `packages/token-editor-contract/package.json`'s `name` to `@dtcg-editor/token-editor-contract` (depends on T029)
- [ ] T033 [US2] Run `grep -rn "token-type-" --include="*.ts" --include="*.tsx" --include="*.json" packages apps | grep -v node_modules` and confirm no remaining source-code matches (SC-006) (depends on T027–T032)

**Checkpoint**: All three packages are renamed `token-editor-*`, each holding only UI/config/`utils/`/wiring — User Story 2's acceptance scenarios are verifiable (packages still won't build against `apps/web-app` until US3 repoints it).

---

## Phase 5: User Story 3 - Existing app behavior is unchanged (Priority: P1)

**Goal**: `apps/web-app` and the whole monorepo build/lint/test clean against the renamed packages and new `token-core` exports, with zero behavior change.

**Independent Test**: Run the full existing web-app test suite (unit + accessibility) and confirm it passes unchanged; exercise the color and dimension editors and confirm identical behavior to pre-refactor.

**Depends on**: User Story 2 (needs the renamed `token-editor-*` packages to repoint to).

### Implementation for User Story 3

- [ ] T034 [P] [US3] Update the import in `apps/web-app/app/api/tokens/[...path]/route.ts` from `@dtcg-editor/token-type-contract` to `@dtcg-editor/token-editor-contract` (depends on T029, T032)
- [ ] T035 [P] [US3] Update the import in `apps/web-app/components/DefaultValidationErrorHandler.tsx` to `@dtcg-editor/token-editor-contract` (depends on T029, T032)
- [ ] T036 [P] [US3] Update the import in `apps/web-app/components/TreeTokenNode.tsx` to `@dtcg-editor/token-editor-contract` (depends on T029, T032)
- [ ] T037 [P] [US3] Update the import in `apps/web-app/components/FallbackValueEditor.tsx` to `@dtcg-editor/token-editor-contract` (depends on T029, T032)
- [ ] T038 [P] [US3] Update the import in `apps/web-app/lib/token-editors/types.ts` to `@dtcg-editor/token-editor-contract` (depends on T029, T032)
- [ ] T039 [US3] Update `apps/web-app/lib/token-editors/built-in.ts`: `colorTokenType`/`dimensionTokenType` imports from `@dtcg-editor/token-editor-color`/`@dtcg-editor/token-editor-dimension`; contract types from `@dtcg-editor/token-editor-contract` (depends on T027, T028, T029)
- [ ] T040 [P] [US3] Update imports in `apps/web-app/lib/token-editors/built-in.test.ts` to `token-editor-*` (depends on T039)
- [ ] T041 [P] [US3] Update imports in `apps/web-app/lib/token-editors/built-in.a11y.test.tsx` to `token-editor-*` (depends on T039)
- [ ] T042 [P] [US3] Update `apps/web-app/lib/token-editors/color-editor.test.tsx`: `ColorEditor`/`ColorEditorOptions` import stays on `@dtcg-editor/token-editor-color` (name change only); its `ColorValue` type import repoints to `@dtcg-editor/token-core` (depends on T003, T027)
- [ ] T043 [P] [US3] Update `apps/web-app/lib/token-editors/color-validation-error-handler.test.tsx`: `ColorValidationErrorHandler`/`colorTokenType` imports to `@dtcg-editor/token-editor-color` (depends on T027)
- [ ] T044 [US3] Update `apps/web-app/package.json` dependency names `token-type-*` → `token-editor-*` via `pnpm remove`/`pnpm add --filter web-app` per each renamed package (depends on T030–T032)
- [ ] T045 [US3] Run `pnpm install` at the repo root to resolve all renamed workspace dependencies (depends on T021, T026, T030–T032, T044)
- [ ] T046 [US3] Run `pnpm build && pnpm lint && pnpm test` at the repo root and confirm zero errors with no reduction in test count versus the T002 baseline (SC-003, SC-004) (depends on T045 and all prior tasks)
- [ ] T047 [US3] Run quickstart.md's Section 1 (structural checks) and Section 3 (import-boundary smoke test) and confirm expected output (depends on T046)

**Checkpoint**: All user stories are complete — the refactor is fully verifiable end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final sanity pass, no further behavior change.

- [ ] T048 [P] Run quickstart.md's Section 4 manual editor smoke check (`pnpm --filter web-app dev`; edit a color and a dimension token) as a human sanity check on top of T046's automated suite
- [ ] T049 Review `git status`/`git diff` for the whole change set and confirm no stray `token-type-*` reference, leftover empty directory, or unintended file survives outside archived spec documents (SC-006 final pass)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — establishes the baseline all later verification compares against.
- **User Story 1 (Phase 3)**: Depends on Foundational. Additive-only against `token-core`; does not touch `token-type-color`/`token-type-dimension`, so it is genuinely independently completable and testable.
- **User Story 2 (Phase 4)**: Depends on User Story 1 (repoints `token-type-color`/`token-type-dimension` to `token-core`'s new exports from T003/T004).
- **User Story 3 (Phase 5)**: Depends on User Story 2 (repoints `apps/web-app` to the renamed `token-editor-*` packages).
- **Polish (Phase 6)**: Depends on User Story 3.

Unlike a typical multi-story feature, these three stories are **not** parallel-independent — each moves files the next story's repointing depends on. They remain separately *verifiable* (each has its own Independent Test), just not separately *implementable* out of order.

### Within Each User Story

- US1: `token-core` module creation (T003–T006, parallel) → `index.ts` export update (T007) → cleanup/verification (T008–T009)
- US2: per-package trim (T010–T021 for color, T022–T026 for dimension, largely parallel across the two packages) → directory renames (T027–T029, parallel) → `package.json` metadata updates (T030–T032, parallel) → verification (T033)
- US3: per-file consumer repoints (T034–T043, mostly parallel) → `package.json`/install (T044–T045) → full verification (T046–T047)

### Parallel Opportunities

- T003–T006 (US1 module creation) can run in parallel — different files, no cross-dependencies among themselves.
- T010, T012, T014 (US2 color file moves) can run in parallel; T011, T013, T015 (their tests) likewise, once their non-test counterpart lands.
- T022–T024 (US2 dimension trim) can run in parallel with the entire color-package trim (T010–T021) — different packages, no shared files.
- T027–T029 (US2 directory renames) can run in parallel — three independent packages.
- T031–T032 can run in parallel with T030 — independent `package.json` files.
- T034–T038 (US3 single-line contract-import repoints) can all run in parallel — five independent files.
- T040–T043 (US3 test-file repoints) can run in parallel with each other, once T039 lands.

---

## Parallel Example: User Story 1

```bash
Task: "Create packages/token-core/src/color.ts with color.ts's structural exports"
Task: "Create packages/token-core/src/dimension.ts as a copy of dimension.ts"
Task: "Create packages/token-core/src/color.test.ts with structural-schema tests"
Task: "Create packages/token-core/src/dimension.test.ts as a copy of dimension.test.ts"
```

## Parallel Example: User Story 3 (contract-import repoints)

```bash
Task: "Update apps/web-app/app/api/tokens/[...path]/route.ts import to @dtcg-editor/token-editor-contract"
Task: "Update apps/web-app/components/DefaultValidationErrorHandler.tsx import to @dtcg-editor/token-editor-contract"
Task: "Update apps/web-app/components/TreeTokenNode.tsx import to @dtcg-editor/token-editor-contract"
Task: "Update apps/web-app/components/FallbackValueEditor.tsx import to @dtcg-editor/token-editor-contract"
Task: "Update apps/web-app/lib/token-editors/types.ts import to @dtcg-editor/token-editor-contract"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (baseline capture)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `token-core` exports `ColorValueSchema`/`DimensionValueSchema` correctly, React-free, independent of any `token-type-*` package
5. Note: US1 alone does not yet satisfy the full feature — `token-type-color`/`token-type-dimension` still duplicate the structural schema until US2 trims them. This is an intentional, safe intermediate state (no consumer is broken), not the finished refactor.

### Incremental Delivery

1. Setup + Foundational → baseline captured
2. User Story 1 → `token-core` has the new exports, verified independently
3. User Story 2 → `token-type-*` trimmed and renamed `token-editor-*`, verified independently (packages build; `apps/web-app` not yet repointed)
4. User Story 3 → `apps/web-app` repointed, full monorepo build/lint/test green — feature complete
5. Polish → final sanity pass

### Single-Session Strategy

Given the strict US1 → US2 → US3 dependency chain (unlike parallel-independent stories), this refactor is best executed as one continuous pass through all three phases in order, committing at each Checkpoint rather than attempting to parallelize story ownership across multiple developers/agents.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- This is a rename-and-move refactor: "delete"/"move" language above always means the source location no longer has that code afterward — verify with `git status` after each task, not just that the destination exists
- Commit after each Checkpoint (end of Phase 3, 4, 5) at minimum; more granular commits are fine within a phase
- Stop at any checkpoint to re-run `pnpm test` and confirm nothing regressed before continuing
- Avoid: re-introducing a `token-type-*` reference anywhere outside archived spec documents (SC-006)
