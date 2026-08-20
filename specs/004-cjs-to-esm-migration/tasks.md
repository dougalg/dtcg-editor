---
description: "Task list for CommonJS to ES Module Migration & Modern-Defaults Constitution Principle"
---

# Tasks: CommonJS to ES Module Migration & Modern-Defaults Constitution Principle

**Input**: Design documents from `/specs/004-cjs-to-esm-migration/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `quickstart.md`

**Tests**: No dedicated test-writing tasks are included — `commit-conventions.test.cjs`/`format-staged.test.cjs` already exist and are being migrated in place (module syntax only), not authored fresh; running the existing suites is a validation task within each story.

**Organization**: Tasks are grouped by user story (US1, US2) per `spec.md`, in priority order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2)
- File paths are repo-root-relative (this feature touches no `apps/`/`packages/` code)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Swap the commitizen adapter dependency before any file that references it can be finished.

- [ ] T001 Remove the `cz-customizable` devDependency: `pnpm remove cz-customizable` (repo root)
- [ ] T002 Add the replacement commitizen adapter and its peer dependency: `pnpm add -D -w @commitlint/cz-commitlint inquirer` (repo root) — depends on T001 (sequential: both edit `package.json`/`pnpm-lock.yaml`)

**Checkpoint**: `package.json`'s `devDependencies` list `@commitlint/cz-commitlint` and `inquirer`, no longer `cz-customizable`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Not applicable to this feature.** User Story 1 (file/tooling migration) and User Story 2 (constitution amendment) touch fully disjoint files and share no blocking prerequisite beyond the Phase 1 dependency swap, which only US1 needs (per `plan.md`'s Structure Decision). Proceed directly to the user story phases below.

---

## Phase 3: User Story 1 - Contributor reads and edits tooling scripts without switching mental models (Priority: P1) 🎯 MVP

**Goal**: Every root-level tooling script uses one consistent modern format (ESM or plain JSON, never CommonJS), and the commit workflow (pre-commit formatting, commit-message linting, interactive commit prompt) behaves identically to before, now via `@commitlint/cz-commitlint` instead of `cz-customizable`.

**Independent Test**: Open each of `commit-conventions.json`, `commitlint.config.mjs`, `commit-conventions.test.mjs`, `format-staged.mjs`, `format-staged.test.mjs` and confirm no `require()`/`module.exports` remain and `.cz-config.cjs` no longer exists (per `spec.md` US1 + `quickstart.md` §2); then run the commit workflow end-to-end (`quickstart.md` §3) and confirm identical behavior.

### Implementation for User Story 1

- [ ] T003 [US1] Convert `commit-conventions.cjs` to `commit-conventions.json` in repo root: same `types`/`scopes` data (`{value, description}` arrays), pure JSON with no `require()`/`module.exports` wrapper; delete the old `.cjs` file
- [ ] T004 [US1] Delete `.cz-config.cjs` from repo root — no longer needed once `@commitlint/cz-commitlint` replaces `cz-customizable` (research.md)
- [ ] T005 [US1] Rewrite `commitlint.config.cjs` as `commitlint.config.mjs` in repo root: `import` `commit-conventions.json` via a JSON import attribute (`with { type: "json" }`), build `type-enum`/`scope-enum` rules with `.map()` in ESM, `export default`; delete the old `.cjs` file — depends on T003
- [ ] T006 [US1] Rewrite `format-staged.cjs` as `format-staged.mjs` in repo root: convert `require()`/`module.exports` to `import`/`export`, preserving the injected-`exec` structure documented in the file's own header exactly as-is; delete the old `.cjs` file
- [ ] T007 [US1] Rewrite `format-staged.test.cjs` as `format-staged.test.mjs` in repo root: convert to `import`/`export`, updating its import of the module under test to `./format-staged.mjs`; delete the old `.cjs` file — depends on T006
- [ ] T008 [US1] Rewrite `commit-conventions.test.cjs` as `commit-conventions.test.mjs` in repo root: convert to `import`/`export`, updating its import to `./commit-conventions.json` (JSON import attribute); delete the old `.cjs` file — depends on T003
- [ ] T009 [US1] Update `package.json` in repo root: `config.commitizen.path` → `"@commitlint/cz-commitlint"`; remove the `config["cz-customizable"]` block entirely; `test:commits` script → `node --test commit-conventions.test.mjs`; `test:format-staged` script → `node --test format-staged.test.mjs`; `lint:root` script's file list → `commitlint.config.mjs commit-conventions.test.mjs format-staged.mjs format-staged.test.mjs` (drop `.cz-config.cjs`; confirm whether Biome should also lint `commit-conventions.json` and include it if so) — depends on T002–T008
- [ ] T010 [US1] Update `.husky/prepare-commit-msg` in repo root: `node format-staged.cjs` → `node format-staged.mjs` — depends on T006
- [ ] T011 [US1] Run `pnpm test:commits` and `pnpm test:format-staged` (repo root) and fix any failures until both pass — depends on T009
- [ ] T012 [US1] Run `pnpm lint:root` (repo root) and fix any Biome findings on the rewritten files until it passes — depends on T009
- [ ] T013 [US1] Manually validate the live commit workflow per `quickstart.md` §3: an empty throwaway commit exercises `.husky/prepare-commit-msg` and `.husky/commit-msg` without error, then `pnpm commit` launches the `@commitlint/cz-commitlint` prompt with the same types/scopes as before migration (Ctrl+C out, no real commit needed) — depends on T010, T011, T012

**Checkpoint**: User Story 1 is fully functional and independently testable — no CommonJS remains in this feature's file set, and the commit workflow works end-to-end under the new adapter.

---

## Phase 4: User Story 2 - Future contributor is steered toward modern choices without needing to be told (Priority: P2)

**Goal**: The project constitution states a general "default to modern code, tools, and formats" principle, with ESM-over-CommonJS named as one concrete example (not the principle's own scope), and an explicit exception-handling clause for unavoidable legacy constraints.

**Independent Test**: Read `.specify/memory/constitution.md` and confirm the new principle is present, general in scope, names the ESM/CommonJS case as an example, and states how to handle a legitimate legacy-tool exception (per `spec.md` US2 + `quickstart.md` §1) — independent of whether any file migration (US1) has happened.

### Implementation for User Story 2

- [ ] T014 [US2] Add a new Core Principle to `.specify/memory/constitution.md` (after the existing Principle X, so XI): title along the lines of "Modern Defaults", stating that code, tools, and file formats default to the modern, currently-recommended choice over a legacy one; name ESM-over-CommonJS as the concrete example; state that legitimate exceptions (a tool/dependency that only supports a legacy format) must be named explicitly in place (e.g., a comment) rather than left ambiguous — per `research.md`'s "Constitution amendment shape" and `spec.md` FR-003–FR-005
- [ ] T015 [US2] Update `.specify/memory/constitution.md`'s Sync Impact Report (prepended comment block, matching the existing entries' format) and the `**Version**: ... | **Ratified**: ... | **Last Amended**: ...` footer line: MINOR version bump (new principle added, nothing removed/redefined), `Last Amended` set to today's date — depends on T014 (same file)

**Checkpoint**: User Story 2 is fully functional and independently testable — the constitution documents the principle regardless of migration progress.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup that spans both stories.

- [ ] T016 [P] Update `CONTRIBUTING.md`'s reference to `commit-conventions.cjs` (line ~57, "see `commit-conventions.cjs`, the single source of truth...") to `commit-conventions.json`, and adjust the surrounding sentence if it implies `pnpm commit` reads the file directly (it now reads it indirectly, via `commitlint.config.mjs` and `@commitlint/cz-commitlint`) (repo root `CONTRIBUTING.md`)
- [ ] T017 [P] Search the repo for any other stale reference to `cz-customizable`, `.cz-config.cjs`, `commit-conventions.cjs`, `commitlint.config.cjs`, `format-staged.cjs`, or `format-staged.test.cjs` (`grep -rn` across root docs/config, excluding `node_modules`/`.git`) and update or remove each hit
- [ ] T018 Run the full `quickstart.md` validation sequence (§1–§4) end-to-end as a final sanity check covering both user stories together

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: N/A for this feature
- **User Story 1 (Phase 3)**: Depends on Phase 1 (needs the adapter dependency swap before `package.json`/prompt validation tasks)
- **User Story 2 (Phase 4)**: No dependency on Phase 1 or Phase 3 — can start immediately in parallel with Phase 3
- **Polish (Phase 5)**: Depends on both Phase 3 and Phase 4 being complete

### Within User Story 1

T003 → T005, T008 (both import the JSON file T003 produces)
T006 → T007 (test imports the renamed module), T010 (hook references the renamed file)
T002, T003–T008 → T009 (package.json update needs every final filename decided and the new adapter installed)
T009, T010 → T011, T012 (validation needs the updated scripts/hook in place)
T010, T011, T012 → T013 (final manual validation)

### Within User Story 2

T014 → T015 (same file, principle body before its own version-bump footer)

### Parallel Opportunities

- T014 (US2) can run in parallel with all of Phase 3 (US1) — disjoint files, no shared dependency
- T016 and T017 (Polish) can run in parallel with each other — disjoint files
- Within US1, T006 and T003 are independent of each other and can run in parallel (different files, no shared dependency) even though each has its own downstream chain (T003→T005/T008; T006→T007/T010)

---

## Parallel Example: Phase 3 kickoff

```bash
# After Phase 1 completes, these two US1 tasks have no dependency on each other:
Task: "Convert commit-conventions.cjs to commit-conventions.json in repo root"
Task: "Rewrite format-staged.cjs as format-staged.mjs in repo root"

# Meanwhile, US2 can proceed independently of all of Phase 3:
Task: "Add new Core Principle to .specify/memory/constitution.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (adapter dependency swap)
2. Complete Phase 3: User Story 1 (file migration + adapter rewiring)
3. **STOP and VALIDATE**: Run `quickstart.md` §2–§3 to confirm the commit workflow behaves identically
4. This alone delivers the concrete migration value even before the constitution is amended

### Incremental Delivery

1. Phase 1 (Setup) → Phase 3 (US1) → validate → this is a complete, mergeable increment on its own
2. Phase 4 (US2) can land before, after, or interleaved with Phase 3 — fully independent
3. Phase 5 (Polish) once both are done

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task
- [Story] label maps each task to US1 or US2 for traceability back to `spec.md`
- Every file-rename task deletes the old `.cjs` file as part of the same task — there should be no point where both the old and new filename exist committed together
- Commit after each task or logical group, per this repo's own conventional-commit tooling (which this feature is itself modifying — take care running `pnpm commit`/`git commit` mid-feature, since T001–T010 temporarily change how commits are validated)
