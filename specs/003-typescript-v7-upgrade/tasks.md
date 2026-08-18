---
description: "Task list for TypeScript v7 Upgrade"
---

# Tasks: TypeScript v7 Upgrade

**Input**: Design documents from `/specs/003-typescript-v7-upgrade/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No dedicated test tasks — this feature is validated by the existing `pnpm build`/`pnpm lint`/`pnpm test` gates (Constitution: `pnpm build` is the sole type-checking gate), exercised via `quickstart.md`'s scenarios rather than new test code.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable independent validation of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bump the single shared `typescript` version pin that every other task depends on.

- [X] T001 Bump the `typescript` catalog entry in `pnpm-workspace.yaml` from `^5.9.3` to `^7.0.2` using `pnpm up -w typescript@^7.0.2` (per `CLAUDE.md`: always use `pnpm` commands to manage dependency versions, never hand-edit a package/catalog version directly) — done via `pnpm update -r --latest typescript` (the `-w`-only form errored `ERR_PNPM_CATALOG_VERSION_MISMATCH`; the recursive `--latest` form is what pnpm 11.22.0 uses to update a catalog entry itself)
- [X] T002 Run `pnpm install` at the repo root to resolve TypeScript 7 across every workspace package and regenerate `pnpm-lock.yaml` — resolved as part of the same `pnpm update` invocation; `pnpm-lock.yaml` now resolves `typescript@7.0.2` everywhere
- [X] T003 [P] Verify no TS6 compatibility alias was introduced anywhere in the dependency tree: `grep -n "typescript6" pnpm-lock.yaml` must return no matches (spec FR-007, `quickstart.md` scenario 4) — confirmed, zero matches

**Checkpoint**: `node_modules/typescript` resolves to a 7.x install repo-wide; no user story work should begin before this completes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm the Phase 0 research audit's "no removed compiler option in use" finding still holds against the actual TS7 install (belt-and-suspenders — research.md's audit was done by inspection, this re-confirms it compiles).

**⚠️ CRITICAL**: This phase's failure would mean research.md's audit missed something; resolve any surfaced issue before proceeding to user story phases.

- [X] T004 Run `pnpm exec tsc -p tsconfig.base.json --showConfig` (or equivalent) from repo root to confirm `tsconfig.base.json` parses cleanly under TypeScript 7 with no unknown/rejected compiler options, per the `research.md` breaking-change audit table — confirmed, config resolves cleanly with no rejected options

**Checkpoint**: Base tsconfig is confirmed TS7-clean; per-package and per-story implementation can proceed.

---

## Phase 3: User Story 1 - Type-check and build the whole monorepo on TypeScript 7 (Priority: P1) 🎯 MVP

**Goal**: Every workspace package builds/type-checks cleanly under TypeScript 7, including the Next.js app via the `useTypeScriptCli` CLI-shim path.

**Independent Test**: From a clean install, `pnpm build` (root) exits 0 across all workspace packages with zero TypeScript errors.

### Implementation for User Story 1

- [X] T005 [US1] Add `experimental: { useTypeScriptCli: true }` to the `NextConfig` object in `apps/web-app/next.config.ts` — done
- [X] T006 [P] [US1] Run `pnpm --filter @dtcg-editor/errors build` and fix any TypeScript 7 errors surfaced in `packages/errors` (expected per `research.md`: none — any fix must be traceable to a documented TS7 breaking change per spec FR-006) — builds clean, zero errors, no fix needed
- [X] T007 [P] [US1] Run `pnpm --filter @dtcg-editor/token-core build` and fix any TypeScript 7 errors surfaced in `packages/token-core` — builds clean, zero errors, no fix needed
- [X] T008 [P] [US1] Run `pnpm --filter @dtcg-editor/token-editor-contract build` and fix any TypeScript 7 errors surfaced in `packages/token-editor-contract` — builds clean, zero errors, no fix needed
- [X] T009 [P] [US1] Run `pnpm --filter @dtcg-editor/token-editor-dimension build` and fix any TypeScript 7 errors surfaced in `packages/token-editor-dimension` — builds clean, zero errors, no fix needed
- [X] T010 [US1] Run `pnpm --filter @dtcg-editor/token-editor-color build` and fix any TypeScript 7 errors surfaced in `packages/token-editor-color`, verifying the trailing CSS-module copy step (`cp src/components/editor.module.css dist/...`) still runs after `tsc` succeeds (depends on T007, since `token-editor-color` consumes `token-core`) — builds clean, CSS copy step ran, no fix needed
- [X] T011 [US1] Run `pnpm --filter @dtcg-editor/web-app build` (`next build`, using the `useTypeScriptCli` flag from T005) and fix any TypeScript 7 errors surfaced in `apps/web-app` (depends on T005–T010, since the web app consumes every library package) — `next build` succeeded end-to-end via the CLI-shim path ("Running TypeScript ... Finished TypeScript"), zero errors, no fix needed (required building `packages/design-system` first — see T012 — since Turborepo's build-order dependency isn't exercised when filtering to a single package)
- [X] T012 [US1] Run `pnpm --filter @dtcg-editor/design-system build` (`sugarcube generate`) and confirm it still completes successfully with TypeScript 7 installed in the workspace (verification only — no `tsc` step of its own to fix) — succeeded, unaffected by the TypeScript bump
- [X] T013 [US1] Run `pnpm build` (full `turbo run build`) from the repo root and confirm it exits 0 with zero TypeScript errors across every workspace package (depends on T006–T012; this is `quickstart.md` scenario 1 and satisfies spec SC-001/SC-002) — 7/7 tasks successful, zero errors

**Checkpoint**: The repo-wide build/typecheck gate is green on TypeScript 7 — this alone is a shippable MVP.

---

## Phase 4: User Story 2 - Lint and format tooling continues to work under TypeScript 7 (Priority: P2)

**Goal**: Confirm Biome's lint/format checks are unaffected by the TypeScript version bump.

**Independent Test**: `pnpm lint` and `pnpm format:check` both exit 0 after the upgrade, enforcing the same rule set as before.

### Implementation for User Story 2

- [X] T014 [P] [US2] Run `pnpm lint` (`turbo run lint`) from the repo root and confirm it completes successfully with no new failures caused by the TypeScript version bump (`quickstart.md` scenario 2; depends on Phase 3 being green, since Biome's `noExplicitAny`/DI rules and `next build`'s own lint step run against the upgraded packages) — 14/14 tasks successful, zero lint errors
- [X] T015 [P] [US2] Run `pnpm format:check` from the repo root and confirm it completes successfully with no changes required — found 2 pre-existing formatting errors in `packages/token-editor-color/src/index.ts` and `.../utils/range-validation.ts`; confirmed via `git diff origin/main -- <files>` (empty diff) that these files are byte-identical to `main` and untouched by this feature, so this is pre-existing formatting debt, not a regression caused by the TypeScript version bump — FR-005 ("no reduction in enforced rules... caused by the bump") is satisfied; this pre-existing debt is out of scope to fix here

**Checkpoint**: Lint/format gates confirmed unaffected — User Stories 1 AND 2 both hold.

---

## Phase 5: User Story 3 - Pre-existing type-checking behavior is preserved (Priority: P3)

**Goal**: Every non-mechanical source change made during this upgrade is traceable to a documented TypeScript 7 breaking change, not an incidental behavior change.

**Independent Test**: Diff the branch against `main`; every changed line outside `pnpm-workspace.yaml`/`pnpm-lock.yaml`/`apps/web-app/next.config.ts` maps to an entry in `research.md`'s breaking-change table or is called out as a documented exception.

### Implementation for User Story 3

- [X] T016 [US3] Review the full diff produced by Phase 3/4 tasks against `research.md`'s breaking-change audit table; for any source change not predicted by that table, add a one-line note to the PR description (or an inline code comment, per repo comment conventions) explaining which TS7 breaking change it addresses (spec FR-006, SC-005; depends on T013–T015 being complete so the diff is final) — reviewed via `git diff --stat origin/main`: only `pnpm-workspace.yaml` (catalog version) and `apps/web-app/next.config.ts` (+3 lines for the flag) changed outside the lockfile; zero source-code fixes were needed anywhere, exactly matching research.md's "Action needed: None" prediction across every audited breaking change — FR-006/SC-005 trivially satisfied, nothing to explain
- [X] T017 [US3] Run the full test suite (`pnpm test`) and confirm it passes unchanged, verifying the upgrade altered build/type-checking only, not runtime behavior (`quickstart.md` scenario 3) — `node:test`/Vitest/axe-core suites: 100% pass (173/173 unit/component tests, all a11y checks). Playwright e2e: 4/6 pass; 2 fail (`e2e/keyboard-navigation.spec.ts` FR-03 and AC-12) on a `locator.evaluate` timeout waiting for a link to `spacing_scale.tokens.json`/`color_scale.tokens.json`. Root-caused as **pre-existing, unrelated to this feature**: `apps/web-app/lib/config.ts` statically imports `dtcg-editor.config.mts` (pointing `tokensDir` at `packages/design-system/src/design-tokens`, which has neither fixture file), not `dtcg-editor.config.json` (which does point at `sample_data/` and does have them) — `.json` is dead/unused. Confirmed pre-existing via `git diff origin/main -- apps/web-app/lib/config.ts apps/web-app/dtcg-editor.config.mts apps/web-app/dtcg-editor.config.json apps/web-app/e2e/keyboard-navigation.spec.ts` (empty diff, none touched by this branch) — fallout from the prior "start to integrate design-system" work on `main`, not this TypeScript version bump. Out of this feature's scope to fix (spec Assumptions: this feature is build/type-checking only); flagging for a separate follow-up

**Checkpoint**: All three user stories verified — the upgrade is complete and traceable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close out the backlog item and record the outcome.

- [ ] T018 Update the "Upgrade `typescript` to v7" line in `docs/backlog.md` / hand off to `archive-task` per the repo's SDD workflow (`CLAUDE.md`) once all prior phases are green, moving the completed item to `docs/backlog-completed.md` and appending a `docs/history.md` entry noting the `^7.0.2` version, the `useTypeScriptCli` flag, and (per T016) that no TS7 breaking change required a source fix beyond the two config changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (T001–T003) completing — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. This is the MVP; User Stories 2 and 3 both depend on Phase 3 being green (their validation runs against the upgraded, building codebase).
- **User Story 2 (Phase 4)**: Depends on Phase 3 (T013) completing.
- **User Story 3 (Phase 5)**: Depends on Phase 3 (T013) completing; T016 additionally depends on Phase 4 being done so the reviewed diff is final.
- **Polish (Phase 6)**: Depends on Phases 3–5 all being complete.

Unlike a typical greenfield feature, User Stories 2 and 3 here are *verification* stories over the same artifact User Story 1 produces (there's one shared codebase being upgraded, not independent slices of new functionality) — so they are sequenced after US1 rather than parallelizable against it, even though each remains independently testable per its own Independent Test criterion.

### Within User Story 1

- T005 (Next.js flag) has no package dependencies and can run in parallel with T006–T009.
- T006 (`errors`) and T007 (`token-core`) have no dependency on each other and can run in parallel.
- T008 (`token-editor-contract`) and T009 (`token-editor-dimension`) depend only on `token-core`'s types being stable, not on `token-core`'s build having been re-run this session — parallelizable with T006/T007.
- T010 (`token-editor-color`) depends on T007 (`token-core`) per the package's actual dependency graph.
- T011 (`web-app`) depends on all of T005–T010, since it's the top of the dependency graph and imports from every library package.
- T012 (`design-system`) has no `tsc` dependency chain and can run in parallel with T006–T011.
- T013 (full repo build) depends on all of the above.

### Parallel Opportunities

- T003 can run in parallel with nothing else in Phase 1 (it depends on T002's lockfile) but is independent of any later task's outcome.
- T006, T007, T009, T012 (and T005) can be run in parallel — different packages/files, no cross-dependency.
- T014 and T015 (Phase 4) are independent of each other and can run in parallel.

---

## Parallel Example: User Story 1

```bash
# After T001-T004 (Setup + Foundational) are complete, launch together:
Task: "Add experimental.useTypeScriptCli to apps/web-app/next.config.ts"          # T005
Task: "Build packages/errors and fix any TS7 errors"                              # T006
Task: "Build packages/token-core and fix any TS7 errors"                          # T007
Task: "Build packages/token-editor-contract and fix any TS7 errors"               # T008
Task: "Build packages/token-editor-dimension and fix any TS7 errors"              # T009
Task: "Build packages/design-system (sugarcube generate) and verify it's unaffected" # T012

# Then, once T007 finishes:
Task: "Build packages/token-editor-color and fix any TS7 errors"                  # T010

# Then, once T005-T010 all finish:
Task: "Build apps/web-app (next build) and fix any TS7 errors"                    # T011

# Then:
Task: "Run pnpm build repo-wide and confirm zero errors"                          # T013
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003).
2. Complete Phase 2: Foundational (T004).
3. Complete Phase 3: User Story 1 (T005–T013).
4. **STOP and VALIDATE**: `pnpm build` is green repo-wide on TypeScript 7 — this is a mergeable MVP even before Phases 4–6.

### Incremental Delivery

1. Setup + Foundational → TypeScript 7 resolves cleanly workspace-wide.
2. User Story 1 → repo-wide build green (MVP; the backlog item's core ask).
3. User Story 2 → lint/format confirmed unaffected.
4. User Story 3 → diff reviewed for traceability, full test suite confirmed unchanged.
5. Polish → backlog/history updated, feature archived.

## Notes

- [P] tasks touch different files/packages and have no dependency on each other's completion.
- [Story] labels map each task to its spec.md user story for traceability.
- Because this feature upgrades one shared toolchain version rather than building independent new capabilities, User Stories 2 and 3 are verification passes over User Story 1's output, not parallel feature slices — sequence accordingly, per the Dependencies section above.
- If any task surfaces a TypeScript 7 error not predicted by `research.md`'s breaking-change table, fix it and note the specific documented breaking change it maps to (or, if genuinely undocumented, describe it precisely) as part of T016 — do not loosen any `tsconfig.base.json` strict flag to work around it (Constitution Principle III).
