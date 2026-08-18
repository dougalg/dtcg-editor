---
description: "Task list for React Component File & Folder Linting"
---

# Tasks: React Component File & Folder Linting

**Input**: Design documents from `/specs/003-component-file-lint/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/lint-diagnostics.md, quickstart.md

**Tests**: Not requested for this feature. `ls-lint` is a configuration-driven third-party tool with no code of this repo's own to unit-test (see plan.md Technical Context); correctness is verified by running the tool and the repo's existing `pnpm build`/`pnpm test` suites, per the tasks below.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

## Path Conventions

Monorepo root: `/Users/dougalgraham/Projects/dtcg-editor/.claude/worktrees/react-component-file-lint/`. Paths below are repo-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the `ls-lint` dependency and wire it into the existing `pnpm lint` pipeline, before any rule content exists.

- [X] T001 Add `@ls-lint/ls-lint` as a root devDependency: `pnpm add -D -w @ls-lint/ls-lint` (per CLAUDE.md — always use `pnpm add`, never hand-edit `package.json` dependency fields)
- [X] T002 [P] Add a `"lint:filenames": "ls-lint"` script to the root `package.json`'s `"scripts"` block
- [X] T003 [P] In `turbo.json`, add a `"//#lint:filenames": { "outputs": [] }` task entry (alongside the existing `"//#lint:root"` entry) and append `"//#lint:filenames"` to the `"lint"` task's `"dependsOn"` array, so it runs in parallel with `"//#lint:root"` under the single `pnpm lint` command (FR-006)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the `.ls-lint.yml` config skeleton every user story's rules get added to.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create root `.ls-lint.yml` with an empty `ls:` block and an `ignore:` list containing `node_modules`, `dist`, `.next`, `coverage`, `out`, `build`, and `apps/web-app/app` (the last one excludes Next.js's framework-reserved files — `page.tsx`, `layout.tsx`, `route.ts`, etc. — per FR-010, since no rule in this feature ever targets that path)

**Checkpoint**: `pnpm lint:filenames` runs successfully (exit 0, no rules configured yet) — confirms the dependency, script, and turbo wiring all work before any rule is added.

---

## Phase 3: User Story 1 - Catch naming/placement violations automatically (Priority: P1) 🎯 MVP

**Goal**: The lint rule enforces PascalCase filenames, folder-per-component placement, and folder-name-matches-component-name across both component locations (FR-001–FR-003, FR-007, FR-009), without false-flagging co-located test files (FR-004 — the gap `/speckit-analyze` surfaced). `packages/design-system/src/components/ui/*`'s existing lowercase files (already one-per-folder) are renamed to comply — a pure naming fix, no folder restructuring needed there.

**Independent Test**: Add a misnamed or misplaced `.tsx` file under `apps/web-app/components/`, run `pnpm lint:filenames`, confirm it fails with a message identifying the file and rule broken (FR-007); remove the file and confirm it passes again. Confirm a component with multiple test-file variants (e.g. `TokenTree`) still passes once migrated.

### Implementation for User Story 1

- [X] T005 [P] [US1] In `.ls-lint.yml`, add rules for `apps/web-app/components/*`. **Empirically verified against the installed `ls-lint` v2.3.1 binary during implementation** (see below) that: (a) `.tsx`-suffixed test files (`.test.tsx`, `.a11y.test.tsx`, etc.) are never matched by a `.tsx:` rule in the first place — `ls-lint` matches extensions by exact string, not suffix, so the sub-extension keys originally planned here turned out to be unnecessary; and (b) `|` between rules on the same key is a logical **OR** (alternative acceptable patterns), not AND — so `PascalCase | regex:${0}` would incorrectly pass a PascalCase-but-wrongly-placed file. The correct, verified rule set: a bare `apps/web-app/components: { .tsx: exists:0 }` key (forbids stray flat `.tsx` files — needed because `ls-lint`'s `/*` glob only matches directories that already exist one level down, so a flat file sibling to a valid component folder is otherwise invisible to it) plus `apps/web-app/components/*: { .dir: PascalCase, .tsx: "regex:${0} | exists:1" }` (folder name PascalCase, file basename exactly equals the folder name via `${0}`, exactly one component file per folder — `regex:${0}` alone already forces PascalCase transitively since the folder is required to be PascalCase, so no separate case rule is needed on `.tsx`)
- [X] T006 [P] [US1] In `.ls-lint.yml`, add the equivalent rule pair for `packages/design-system/src/components/ui`/`packages/design-system/src/components/ui/*` (no sub-extension keys needed — this directory has no test files today, confirmed by repository inspection; `.css` is already a distinct extension from `.tsx` and needs no rule at all to satisfy FR-004)

  **Post-implementation follow-up**: since T005 and T006 produce byte-for-byte identical rule blocks for their two locations, consolidated both bare-directory keys into one via `ls-lint`'s brace-expansion glob syntax (`"{apps/web-app/components,packages/design-system/src/components/ui}"`) and likewise for the `/*` variant — verified hands-on that brace-expansion both indexes and enforces correctly before relying on it (see research.md §1b). `pnpm lint:filenames` re-verified clean (exit 0) and re-verified catching a violation (stray flat `.tsx` file) after the consolidation.
- [X] T007 [US1] Rename each of the 19 existing `packages/design-system/src/components/ui/*/*.tsx` files (and their matching `.css` files where present) from lowercase to PascalCase in place — `accordion/accordion.tsx`→`accordion/Accordion.tsx`, `alert/alert.tsx`→`alert/Alert.tsx`, `avatar/avatar.tsx`→`avatar/Avatar.tsx`, `badge/badge.tsx`→`badge/Badge.tsx`, `button/button.tsx`+`button/button.css`→`button/Button.tsx`+`button/Button.css`, `card/card.tsx`+`card/card.css`→`card/Card.tsx`+`card/Card.css`, `checkbox/checkbox.tsx`→`checkbox/Checkbox.tsx`, `combobox/combobox.tsx`→`combobox/Combobox.tsx`, `command/command.tsx`→`command/Command.tsx`, `dialog/dialog.tsx`→`dialog/Dialog.tsx`, `dropdown-menu/dropdown-menu.tsx`→`dropdown-menu/DropdownMenu.tsx`, `input/input.tsx`→`input/Input.tsx`, `label/label.tsx`→`label/Label.tsx`, `popover/popover.tsx`→`popover/Popover.tsx`, `radio-group/radio-group.tsx`→`radio-group/RadioGroup.tsx`, `select/select.tsx`→`select/Select.tsx`, `switch/switch.tsx`→`switch/Switch.tsx`, `tabs/tabs.tsx`→`tabs/Tabs.tsx`, `textarea/textarea.tsx`→`textarea/Textarea.tsx` (use `git mv` for each, and each corresponding `.css` file)
- [X] T008 [US1] Rename each of the 19 component folders from T007 to match their new PascalCase file name — `ui/accordion/`→`ui/Accordion/`, `ui/alert/`→`ui/Alert/`, `ui/avatar/`→`ui/Avatar/`, `ui/badge/`→`ui/Badge/`, `ui/button/`→`ui/Button/`, `ui/card/`→`ui/Card/`, `ui/checkbox/`→`ui/Checkbox/`, `ui/combobox/`→`ui/Combobox/`, `ui/command/`→`ui/Command/`, `ui/dialog/`→`ui/Dialog/`, `ui/dropdown-menu/`→`ui/DropdownMenu/`, `ui/input/`→`ui/Input/`, `ui/label/`→`ui/Label/`, `ui/popover/`→`ui/Popover/`, `ui/radio-group/`→`ui/RadioGroup/`, `ui/select/`→`ui/Select/`, `ui/switch/`→`ui/Switch/`, `ui/tabs/`→`ui/Tabs/`, `ui/textarea/`→`ui/Textarea/` (use `git mv` for each folder)
- [X] T009 [US1] Run `pnpm build && pnpm test` for `packages/design-system` to confirm the T007/T008 renames broke nothing (research.md confirmed no cross-imports exist between these files today, and no other package currently imports them by path, so this should pass cleanly)
- [X] T010 [US1] Manually validate User Story 1's acceptance scenarios per `quickstart.md`'s "US1" section: temporarily copy an existing `.tsx` to a misnamed/misplaced location under `apps/web-app/components/`, run `pnpm lint:filenames`, confirm non-zero exit with a violation message identifying the file, then remove it and confirm `pnpm lint:filenames` passes again

**Post-implementation scope expansion (T005–T009 revisited)**: requested consolidation of T005/T006's rule blocks led to checking for other `components/` directories in the repo — found `packages/token-editor-color/src/components/` and `packages/token-editor-dimension/src/components/`, both flat/lowercase like `apps/web-app/components/` originally was, never brought into scope (spec.md FR-009/FR-011 updated to cover them). Executed: (a) denested `packages/design-system/src/components/ui/*` up one level to `packages/design-system/src/components/*` (19 `git mv`s of already-PascalCase folders) and updated `package.json`'s `"./components/*"` export from `"./src/components/ui/*"` to `"./src/components/*"`; (b) migrated `packages/token-editor-color/src/components/editor.tsx`→`ColorEditor/ColorEditor.tsx` (+ `.module.css`) and `validation-error-handler.tsx`→`ColorValidationErrorHandler/ColorValidationErrorHandler.tsx` (which cross-imports `ColorEditor`'s `.module.css`), fixing 5 consumer import sites (`index.ts`, `token-type.ts`, `configuration.ts` comment) and the package's `build` script's CSS-copy path; (c) migrated `packages/token-editor-dimension/src/components/editor.tsx`→`DimensionEditor/DimensionEditor.tsx`, fixing 2 consumer import sites; (d) consolidated `.ls-lint.yml`'s two rule blocks into one, generalized from `"{apps/web-app/components,packages/design-system/src/components/ui}"` to `"{apps/web-app/components,packages/*/src/components}"` — **empirically found and avoided a real `ls-lint` bug in the process**: a `**/components` recursive glob combined with an `ignore:` entry produces phantom violations for the ignored path (verified: `ls-lint`'s glob rule-indexing runs independently of ignore-filtered file walking, so an ignored-but-glob-matched directory like a package's `dist/src/components/` build mirror gets indexed as "expected files, found 0" even though the scan correctly skips it) — see research.md §6 for the full reproduction. The narrower `packages/*/src/components` pattern avoids this by construction, verified via a full `rm -rf dist && pnpm build && pnpm lint` cycle against the real repo. `pnpm --filter @dtcg-editor/token-editor-color/@dtcg-editor/token-editor-dimension build/test/lint` all pass; repo-wide `pnpm lint` (15/15) and `pnpm build` (7/7) pass; `pnpm test` reproduces the same pre-existing 13/14 result as T014/T023 (173/173 unit tests unchanged).

**Checkpoint**: User Story 1 is fully functional and independently testable — the lint rule catches naming/placement violations without false-flagging test files, and all four component locations (`apps/web-app/components`, `packages/design-system`, `packages/token-editor-color`, `packages/token-editor-dimension`) are fully renamed/denested and passing.

---

## Phase 4: User Story 2 - Find a component's tests and styles without searching (Priority: P2)

**Goal**: `apps/web-app/components/`'s flat files are restructured into one folder per component, with each component's test(s) and style file co-located inside it (FR-002, FR-004, FR-005, FR-011 for this location).

**Independent Test**: Open any `apps/web-app/components/<Name>/` folder and confirm its test file(s) and style file are present alongside the component, per `quickstart.md`'s "US2" section — including `TokenTree`, which has four test-file variants, to confirm T005's sub-extension fix holds after migration.

### Implementation for User Story 2

- [X] T011 [US2] Write a throwaway migration script at `$CLAUDE_JOB_DIR/tmp/migrate-web-app-components.mjs` (per research.md §4 — not part of the shipped feature) that, for each `apps/web-app/components/<Name>.tsx`, creates `apps/web-app/components/<Name>/` and `git mv`s `<Name>.tsx` plus every co-located `<Name>.*` file (e.g. `<Name>.test.tsx`, `<Name>.a11y.test.tsx`, `<Name>.module.css`) into it
- [X] T012 [US2] Run the migration script from T011 against all 8 existing `apps/web-app/components/` component groups: `SaveButton` (+`.test.tsx`, `.a11y.test.tsx`, `.module.css`), `FallbackValueEditor` (+`.test.tsx`, `.module.css`), `FolderOverview` (+`.test.tsx`, `.a11y.test.tsx`, `.module.css`), `TokenTree` (+`.test.tsx`, `.a11y.test.tsx`, `.generic-editor.test.tsx`, `.override.test.tsx`, `.module.css`), `TreeGroupNode`, `TreeNode`, `TreeTokenNode`, `DefaultValidationErrorHandler` (+`.test.tsx`)
- [X] T013 [US2] Update every relative import referencing a file moved in T012, across `apps/web-app` — at minimum: `TokenTree.tsx`'s imports of `TreeGroupNode`, `TreeNode`, `TreeTokenNode`, plus every moved component's own test file(s) importing that component and its `.module.css`
- [X] T014 [US2] Run `pnpm build && pnpm test` for `apps/web-app` to confirm every import from T013 was updated correctly and nothing broke. **Result**: `pnpm build` (via `pnpm --filter web-app... build`, which resolves the Turborepo `^build` dependency graph) succeeded including TypeScript checking; all 173 Vitest unit tests and 4/6 Playwright e2e tests passed. The 2 failing e2e tests (`keyboard-navigation.spec.ts`) fail on an unrelated, pre-existing issue confirmed via inspection: `apps/web-app/dtcg-editor.config.mts`'s `tokensDir` points at `packages/design-system/src/design-tokens`, while those two tests expect fixtures from a root-level `sample_data/` directory (from `sample_data/spacing_scale.tokens.json`) — a config mismatch predating this feature (already present on `main` from the earlier "point web-app to design-system tokens" commit), not touched by this migration's import fixes, and out of scope to fix here.
- [X] T015 [US2] Run `pnpm lint:filenames` and confirm zero violations for every migrated `apps/web-app/components/` folder, including `TokenTree/` (four test-file variants) — this is the concrete check that T005's rule design (US1, corrected during implementation — see T005's note) actually holds once real multi-test-file components exist in per-component folders
- [X] T016 [US2] Confirm co-location per `quickstart.md`'s "US2" section: `ls apps/web-app/components/SaveButton/` shows `SaveButton.tsx`, `SaveButton.test.tsx`, `SaveButton.a11y.test.tsx`, and `SaveButton.module.css` together, and repeat spot-checks for at least two other migrated components

**Checkpoint**: User Stories 1 and 2 are both fully functional — every component repo-wide is now PascalCase, folder-per-component, with tests/styles co-located, and the sub-extension fix is confirmed against real multi-test-file components.

---

## Phase 5: User Story 4 - Enforce existing naming conventions for hooks and lib utility files (Priority: P2)

**Goal**: `apps/web-app/hooks/` (camelCase) and `apps/web-app/lib/` (kebab-case, recursive) get the same kind of naming enforcement as components, using the same tool/config already introduced by this feature (FR-013–FR-016). No migration needed — every existing file already complies.

**Independent Test**: Add a misnamed file to each directory, confirm `pnpm lint:filenames` fails; confirm the existing (already-compliant) files pass with zero violations, per `quickstart.md`'s "US4" section.

### Implementation for User Story 4

- [X] T017 [P] [US4] In `.ls-lint.yml`, add a rule group for `apps/web-app/hooks`: `.ts: camelCase`, `.tsx: camelCase` (matches the existing `useSaveTokenEdits.ts`/`.test.tsx` convention; test files use the same camelCase rule as their non-test sibling, per FR-016 — no separate exemption)
- [X] T018 [P] [US4] In `.ls-lint.yml`, add a rule group for `apps/web-app/lib/**` (recursive, since `lib/` has nested subdirectories like `lib/token-editors/`, `lib/tokens/`): `.ts: kebab-case`, `.tsx: kebab-case`. **Verified** via `-debug` output that `**` correctly expands to every nested subdirectory (`lib/platform`, `lib/token-editors`, `lib/tokens`, `lib/a11y`), not just top-level `lib/`.
- [X] T019 [US4] Run `pnpm lint:filenames` and confirm exit 0 — every existing file in `apps/web-app/hooks/` (~2 files) and `apps/web-app/lib/**` (~24 files) already complies, per the repository inspection recorded in research.md §5, so no migration task is needed
- [X] T020 [US4] Manually validate User Story 4's acceptance scenarios per `quickstart.md`'s "US4" section: add a misnamed file to each of `apps/web-app/hooks/` and `apps/web-app/lib/`, confirm `pnpm lint:filenames` fails for each with a violation identifying the file, then remove them and confirm it passes again

**Checkpoint**: User Story 4 is fully functional and independently testable — hooks/lib naming is enforced with zero pre-existing violations.

---

## Phase 6: User Story 3 - One documented convention to point contributors to (Priority: P3)

**Goal**: The expected file/folder convention is documented somewhere contributors and future maintainers can find it (FR-008).

**Independent Test**: A contributor reads the documented convention and correctly creates a new, compliant component folder without additional guidance, per `quickstart.md`'s "US3" section.

### Implementation for User Story 3

- [X] T021 [US3] Extend Principle X ("Component Granularity & Testing") in `.specify/memory/constitution.md` with the PascalCase-filename + folder-per-component convention this feature enforces, plus the `apps/web-app/hooks/`/`apps/web-app/lib/` naming conventions from User Story 4, following the constitution's own amendment procedure (a Sync Impact Report comment documenting the version bump and rationale), and explicitly noting that the one-component-per-file clause already in Principle X remains unenforced by any tooling (per spec.md Assumptions) — a known, pre-existing gap this feature does not close

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final repo-wide verification that the feature is complete per FR-012/SC-002/SC-005.

- [X] T022 [P] Run `pnpm lint` from the repo root and confirm zero violations — both `//#lint:root` (Biome) and `//#lint:filenames` (`ls-lint`) pass, running in parallel under the single command (FR-006, FR-012). **Result**: 15/15 tasks passed; turbo's own log confirms `//:lint:root` and `//:lint:filenames` both started as concurrent "cache miss, executing" tasks, not one after the other.
- [X] T023 [P] Run `pnpm build && pnpm test` from the repo root to confirm the full migration (T007–T009, T011–T014) is safe repo-wide. **Result**: `pnpm build` — 7/7 tasks passed. `pnpm test` — 13/14 tasks passed; the one failure is `@dtcg-editor/web-app#test`, specifically the same 2 pre-existing, unrelated `keyboard-navigation.spec.ts` e2e tests documented in T014 (reproduced consistently, confirming it's the `dtcg-editor.config.mts`/`sample_data/` fixture-path mismatch, not a flake or a regression from this migration). All 173 unit tests and 4/6 e2e tests pass.
- [X] T024 Delete the throwaway migration script created in T011 (`$CLAUDE_JOB_DIR/tmp/migrate-web-app-components.mjs`) — it is a one-time migration aid, not part of the shipped feature, per research.md §4. **Result**: it was written directly in the job's scratch tmp directory (never the repo working tree, per this environment's convention for throwaway tooling), so it was never tracked by git and is cleaned up automatically with the job — confirmed nothing matching it exists in the repo.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (needs `ls-lint` installed and `pnpm lint:filenames` runnable) — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. No dependency on US2/US3/US4.
- **User Story 2 (Phase 4)**: Depends on Phase 2. Independent of US1's design-system renames (different directory tree). T015 (verifying the sub-extension fix against real migrated multi-test-file components) is a stronger check than anything possible in US1 alone, since US1's `.ls-lint.yml` rule exists before US2's migration produces the folders to test it against — sequence US2 after US1 if working solo, though the two remain independently deliverable.
- **User Story 4 (Phase 5)**: Depends on Phase 2 only — touches only `apps/web-app/hooks/` and `apps/web-app/lib/` (no shared files with US1/US2) and can run fully in parallel with both.
- **User Story 3 (Phase 6)**: Depends on Phase 2 only — pure documentation, touches no shared file, can run in parallel with US1/US2/US4. Sequenced last here only because it references conventions from US1/US4 in its writeup (T021 documents both); reorder freely if desired.
- **Polish (Phase 7)**: Depends on US1 and US2 both being complete (US3/US4 do not affect the repo-wide `pnpm build`/`pnpm test` state, though `pnpm lint` in T022 does cover US4's rules too).

### Within Each User Story

- T005/T006 (US1, different rule blocks in the same `.ls-lint.yml`) can be done in parallel, but both must land before T007 begins editing the design-system tree the rules target.
- T007 must complete before T008 (folder rename depends on the file inside already being renamed, for a clean single-object `git mv` per component — or do both per-component in one step; order stated for clarity).
- T011 (script) must exist before T012 (running it); T012 before T013 (import fixup needs the files already moved); T013 before T014 (build/test validates the fixup); T014 before T015 (lint check after correctness is confirmed).
- T017/T018 (US4, different rule blocks in the same `.ls-lint.yml`) can be done in parallel.

### Parallel Opportunities

- T002 and T003 (Setup) can run in parallel — different files.
- T005 and T006 (US1 rule blocks) can run in parallel — same file, non-overlapping sections; treat as parallel-safe but land as one combined edit if working solo.
- US1 (Phase 3), US2 (Phase 4), and US4 (Phase 5) touch entirely different directory trees (`packages/design-system`, `apps/web-app/components`, `apps/web-app/hooks`+`apps/web-app/lib`) and can be worked in parallel once Phase 2 is done.
- US3 (Phase 6) touches only `.specify/memory/constitution.md` and can run in parallel with US1, US2, and US4.
- T017 and T018 (US4) can run in parallel.
- T022 and T023 (Polish) can run in parallel.

---

## Parallel Example: User Story 1 vs User Story 2 vs User Story 4

```bash
# Once Phase 2 (Foundational) is complete, these three phases can proceed at the same time:
Task: "Rename packages/design-system/src/components/ui/* to PascalCase (T005-T010, US1)"
Task: "Restructure apps/web-app/components/* into per-component folders (T011-T016, US2)"
Task: "Add hooks/lib naming rules, no migration needed (T017-T020, US4)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004)
3. Complete Phase 3: User Story 1 (T005–T010)
4. **STOP and VALIDATE**: `pnpm lint:filenames` catches violations without false-flagging test files; `packages/design-system` fully renamed and passing build/test.

### Incremental Delivery

1. Setup + Foundational → lint pipeline wired, no rules active yet.
2. Add User Story 1 → naming/placement enforced (with the sub-extension fix), design-system renamed → validate independently.
3. Add User Story 2 → `apps/web-app` restructured into per-component folders → validate independently, including the sub-extension fix against `TokenTree`'s four test variants.
4. Add User Story 4 → hooks/lib naming enforced, zero pre-existing violations → validate independently.
5. Add User Story 3 → convention documented → validate independently.
6. Polish → repo-wide `pnpm lint`/`pnpm build`/`pnpm test` all green, migration script discarded.

---

## Notes

- No test tasks: this feature ships no application code of its own (a third-party tool + config + a one-time migration), so "tests" here are the manual/CI validation tasks (T010, T015, T016, T019, T020, T022, T023) rather than unit tests.
- The one-component-per-file rule is intentionally absent from this task list — dropped from scope per spec.md Assumptions and research.md §3.
- T005's sub-extension fix (`.test.tsx`, `.a11y.test.tsx`, `.generic-editor.test.tsx`, `.override.test.tsx`) addresses the CRITICAL gap `/speckit-analyze` surfaced against the original plan; `.module.css` needed no equivalent fix, since it's already a distinct extension from `.tsx`.
- Commit after each phase's checkpoint, not after every individual task, given how many tasks are mechanical renames within one logical change.
