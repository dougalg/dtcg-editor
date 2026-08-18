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
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Monorepo root: `/Users/dougalgraham/Projects/dtcg-editor/.claude/worktrees/react-component-file-lint/`. Paths below are repo-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the `ls-lint` dependency and wire it into the existing `pnpm lint` pipeline, before any rule content exists.

- [ ] T001 Add `@ls-lint/ls-lint` as a root devDependency: `pnpm add -D -w @ls-lint/ls-lint` (per CLAUDE.md — always use `pnpm add`, never hand-edit `package.json` dependency fields)
- [ ] T002 [P] Add a `"lint:filenames": "ls-lint"` script to the root `package.json`'s `"scripts"` block
- [ ] T003 [P] In `turbo.json`, add a `"//#lint:filenames": { "outputs": [] }` task entry (alongside the existing `"//#lint:root"` entry) and append `"//#lint:filenames"` to the `"lint"` task's `"dependsOn"` array, so it runs in parallel with `"//#lint:root"` under the single `pnpm lint` command (FR-006)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the `.ls-lint.yml` config skeleton every user story's rules get added to.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Create root `.ls-lint.yml` with an empty `ls:` block and an `ignore:` list containing `node_modules`, `dist`, `.next`, `coverage`, `out`, `build`, and `apps/web-app/app` (the last one excludes Next.js's framework-reserved files — `page.tsx`, `layout.tsx`, `route.ts`, etc. — per FR-010, since no rule in this feature ever targets that path)

**Checkpoint**: `pnpm lint:filenames` runs successfully (exit 0, no rules configured yet) — confirms the dependency, script, and turbo wiring all work before any rule is added.

---

## Phase 3: User Story 1 - Catch naming/placement violations automatically (Priority: P1) 🎯 MVP

**Goal**: The lint rule enforces PascalCase filenames, folder-per-component placement, and folder-name-matches-component-name across both component locations (FR-001–FR-003, FR-007, FR-009). `packages/design-system/src/components/ui/*`'s existing lowercase files (already one-per-folder) are renamed to comply — a pure naming fix, no folder restructuring needed there.

**Independent Test**: Add a misnamed or misplaced `.tsx` file under `apps/web-app/components/`, run `pnpm lint:filenames`, confirm it fails with a message identifying the file and rule broken (FR-007); remove the file and confirm it passes again.

### Implementation for User Story 1

- [ ] T005 [P] [US1] In `.ls-lint.yml`, add a rule group for `apps/web-app/components/*`: `.tsx: PascalCase | regex:${0} | exists:1` (PascalCase filename, folder name matches file base name via `${0}`, exactly one component file per folder)
- [ ] T006 [P] [US1] In `.ls-lint.yml`, add a rule group for `packages/design-system/src/components/ui/*`: `.tsx: PascalCase | regex:${0} | exists:1`
- [ ] T007 [US1] Rename each of the 19 existing `packages/design-system/src/components/ui/*/*.tsx` files (and their matching `.css` files where present) from lowercase to PascalCase in place — `accordion/accordion.tsx`→`accordion/Accordion.tsx`, `alert/alert.tsx`→`alert/Alert.tsx`, `avatar/avatar.tsx`→`avatar/Avatar.tsx`, `badge/badge.tsx`→`badge/Badge.tsx`, `button/button.tsx`+`button/button.css`→`button/Button.tsx`+`button/Button.css`, `card/card.tsx`+`card/card.css`→`card/Card.tsx`+`card/Card.css`, `checkbox/checkbox.tsx`→`checkbox/Checkbox.tsx`, `combobox/combobox.tsx`→`combobox/Combobox.tsx`, `command/command.tsx`→`command/Command.tsx`, `dialog/dialog.tsx`→`dialog/Dialog.tsx`, `dropdown-menu/dropdown-menu.tsx`→`dropdown-menu/DropdownMenu.tsx`, `input/input.tsx`→`input/Input.tsx`, `label/label.tsx`→`label/Label.tsx`, `popover/popover.tsx`→`popover/Popover.tsx`, `radio-group/radio-group.tsx`→`radio-group/RadioGroup.tsx`, `select/select.tsx`→`select/Select.tsx`, `switch/switch.tsx`→`switch/Switch.tsx`, `tabs/tabs.tsx`→`tabs/Tabs.tsx`, `textarea/textarea.tsx`→`textarea/Textarea.tsx` (use `git mv` for each, and each corresponding `.css` file)
- [ ] T008 [US1] Rename each of the 19 component folders from T007 to match their new PascalCase file name — `ui/accordion/`→`ui/Accordion/`, `ui/alert/`→`ui/Alert/`, `ui/avatar/`→`ui/Avatar/`, `ui/badge/`→`ui/Badge/`, `ui/button/`→`ui/Button/`, `ui/card/`→`ui/Card/`, `ui/checkbox/`→`ui/Checkbox/`, `ui/combobox/`→`ui/Combobox/`, `ui/command/`→`ui/Command/`, `ui/dialog/`→`ui/Dialog/`, `ui/dropdown-menu/`→`ui/DropdownMenu/`, `ui/input/`→`ui/Input/`, `ui/label/`→`ui/Label/`, `ui/popover/`→`ui/Popover/`, `ui/radio-group/`→`ui/RadioGroup/`, `ui/select/`→`ui/Select/`, `ui/switch/`→`ui/Switch/`, `ui/tabs/`→`ui/Tabs/`, `ui/textarea/`→`ui/Textarea/` (use `git mv` for each folder)
- [ ] T009 [US1] Run `pnpm build && pnpm test` for `packages/design-system` to confirm the T007/T008 renames broke nothing (research.md confirmed no cross-imports exist between these files today, and no other package currently imports them by path, so this should pass cleanly)
- [ ] T010 [US1] Manually validate User Story 1's acceptance scenarios per `quickstart.md`'s "US1" section: temporarily copy `apps/web-app/components/SaveButton.tsx` (pre-migration path) or any existing `.tsx` to a misnamed/misplaced location, run `pnpm lint:filenames`, confirm non-zero exit with a violation message identifying the file, then remove it and confirm `pnpm lint:filenames` passes again

**Checkpoint**: User Story 1 is fully functional and independently testable — the lint rule catches naming/placement violations, and `packages/design-system` is fully renamed and passing.

---

## Phase 4: User Story 2 - Find a component's tests and styles without searching (Priority: P2)

**Goal**: `apps/web-app/components/`'s flat files are restructured into one folder per component, with each component's test(s) and style file co-located inside it (FR-002, FR-004, FR-005, FR-011 for this location).

**Independent Test**: Open any `apps/web-app/components/<Name>/` folder and confirm its test file(s) and style file are present alongside the component, per `quickstart.md`'s "US2" section.

### Implementation for User Story 2

- [ ] T011 [US2] Write a throwaway migration script at `$CLAUDE_JOB_DIR/tmp/migrate-web-app-components.mjs` (per research.md §4 — not part of the shipped feature) that, for each `apps/web-app/components/<Name>.tsx`, creates `apps/web-app/components/<Name>/` and `git mv`s `<Name>.tsx` plus every co-located `<Name>.*` file (e.g. `<Name>.test.tsx`, `<Name>.a11y.test.tsx`, `<Name>.module.css`) into it
- [ ] T012 [US2] Run the migration script from T011 against all 8 existing `apps/web-app/components/` component groups: `SaveButton` (+`.test.tsx`, `.a11y.test.tsx`, `.module.css`), `FallbackValueEditor` (+`.test.tsx`, `.module.css`), `FolderOverview` (+`.test.tsx`, `.a11y.test.tsx`, `.module.css`), `TokenTree` (+`.test.tsx`, `.a11y.test.tsx`, `.generic-editor.test.tsx`, `.override.test.tsx`, `.module.css`), `TreeGroupNode`, `TreeNode`, `TreeTokenNode`, `DefaultValidationErrorHandler` (+`.test.tsx`)
- [ ] T013 [US2] Update every relative import referencing a file moved in T012, across `apps/web-app` — at minimum: `TokenTree.tsx`'s imports of `TreeGroupNode`, `TreeNode`, `TreeTokenNode`, plus every moved component's own test file(s) importing that component and its `.module.css`
- [ ] T014 [US2] Run `pnpm build && pnpm test` for `apps/web-app` to confirm every import from T013 was updated correctly and nothing broke
- [ ] T015 [US2] Confirm co-location per `quickstart.md`'s "US2" section: `ls apps/web-app/components/SaveButton/` shows `SaveButton.tsx`, `SaveButton.test.tsx`, `SaveButton.a11y.test.tsx`, and `SaveButton.module.css` together, and repeat spot-checks for at least two other migrated components

**Checkpoint**: User Stories 1 and 2 are both fully functional — every component repo-wide is now PascalCase, folder-per-component, with tests/styles co-located.

---

## Phase 5: User Story 3 - One documented convention to point contributors to (Priority: P3)

**Goal**: The expected file/folder convention is documented somewhere contributors and future maintainers can find it (FR-008).

**Independent Test**: A contributor reads the documented convention and correctly creates a new, compliant component folder without additional guidance, per `quickstart.md`'s "US3" section.

### Implementation for User Story 3

- [ ] T016 [US3] Extend Principle X ("Component Granularity & Testing") in `.specify/memory/constitution.md` with the PascalCase-filename + folder-per-component convention this feature enforces, following the constitution's own amendment procedure (a Sync Impact Report comment documenting the version bump and rationale), and explicitly noting that the one-component-per-file clause already in Principle X remains unenforced by any tooling (per spec.md Assumptions) — a known, pre-existing gap this feature does not close

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final repo-wide verification that the feature is complete per FR-012/SC-002.

- [ ] T017 [P] Run `pnpm lint` from the repo root and confirm zero violations — both `//#lint:root` (Biome) and `//#lint:filenames` (`ls-lint`) pass, running in parallel under the single command (FR-006, FR-012)
- [ ] T018 [P] Run `pnpm build && pnpm test` from the repo root to confirm the full migration (T007–T009, T011–T014) is safe repo-wide
- [ ] T019 Delete the throwaway migration script created in T011 (`$CLAUDE_JOB_DIR/tmp/migrate-web-app-components.mjs`) — it is a one-time migration aid, not part of the shipped feature, per research.md §4

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (needs `ls-lint` installed and `pnpm lint:filenames` runnable) — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Phase 2. Independent of US1's design-system renames (different directory tree), though both can be validated together once done.
- **User Story 3 (Phase 5)**: Depends on Phase 2 only — can run in parallel with US1/US2 (pure documentation, touches no shared file).
- **Polish (Phase 6)**: Depends on US1 and US2 both being complete (US3 does not affect repo-wide lint/build/test state).

### Within Each User Story

- T005/T006 (US1, different files' rule blocks in the same `.ls-lint.yml`) can be done in parallel, but both must land before T007 begins editing the design-system tree the rules target.
- T007 must complete before T008 (folder rename depends on the file inside already being renamed, for a clean single-object `git mv` per component — or do both per-component in one step; order stated for clarity).
- T011 (script) must exist before T012 (running it); T012 before T013 (import fixup needs the files already moved); T013 before T014 (build/test validates the fixup).

### Parallel Opportunities

- T002 and T003 (Setup) can run in parallel — different files.
- T005 and T006 (US1 rule blocks) can run in parallel — same file, non-overlapping sections; treat as parallel-safe but land as one combined edit if working solo.
- US1 (Phase 3) and US2 (Phase 4) touch entirely different directory trees (`packages/design-system` vs `apps/web-app/components`) and can be worked in parallel once Phase 2 is done.
- US3 (Phase 5) touches only `.specify/memory/constitution.md` and can run in parallel with US1 and US2.
- T017 and T018 (Polish) can run in parallel.

---

## Parallel Example: User Story 1 vs User Story 2

```bash
# Once Phase 2 (Foundational) is complete, these two phases can proceed at the same time:
Task: "Rename packages/design-system/src/components/ui/* to PascalCase (T005-T009, US1)"
Task: "Restructure apps/web-app/components/* into per-component folders (T011-T015, US2)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004)
3. Complete Phase 3: User Story 1 (T005–T010)
4. **STOP and VALIDATE**: `pnpm lint:filenames` catches violations; `packages/design-system` fully renamed and passing build/test.

### Incremental Delivery

1. Setup + Foundational → lint pipeline wired, no rules active yet.
2. Add User Story 1 → naming/placement enforced, design-system renamed → validate independently.
3. Add User Story 2 → `apps/web-app` restructured into per-component folders → validate independently.
4. Add User Story 3 → convention documented → validate independently.
5. Polish → repo-wide `pnpm lint`/`pnpm build`/`pnpm test` all green, migration script discarded.

---

## Notes

- No test tasks: this feature ships no application code of its own (a third-party tool + config + a one-time migration), so "tests" here are the manual/CI validation tasks (T010, T015, T017, T018) rather than unit tests.
- The one-component-per-file rule is intentionally absent from this task list — dropped from scope per spec.md Assumptions and research.md §3.
- Commit after each phase's checkpoint, not after every individual task, given how many tasks are mechanical renames within one logical change.
