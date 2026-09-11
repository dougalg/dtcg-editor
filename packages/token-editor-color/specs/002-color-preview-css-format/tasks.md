---

description: "Task list template for feature implementation"
---

# Tasks: Color Token Preview CSS-Style Formatting

**Input**: Design documents from `packages/token-editor-color/specs/002-color-preview-css-format/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (no contracts/ — no new external interface, see plan.md)

**Tests**: Included and MANDATORY, not optional — root constitution Principle XIII (TDD, NON-NEGOTIABLE) governs this package in full per its own constitution's Scope & Precedence section. Every behavior-changing task below must be preceded by a test observed failing for the right reason, and every acceptance criterion in spec.md gets at least one test that exercises the real entry point (`@playwright/test`), not only a component-level Vitest test. Each observed-red failure is recorded in `specs/002-color-preview-css-format/tdd/cycle-log.md` before its implementation task starts (Principle XIII).

**Organization**: Tasks are grouped by user story (spec.md: US1 "Read a previewed color token's value in CSS terms" P1, US2 "Editing stays exactly as it is today" P1, US3 "Non-color and invalid values keep declining gracefully" P3), each independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes its exact file path

## Path Conventions

Single package (`packages/token-editor-color`), no `src/`/`tests/` split — tests are co-located with the component they cover, per this package's own Principle IV. The one exception is the Playwright acceptance test, which lives at the app level (`apps/web-app/e2e/`) per repo-root Principle XIII.

---

## Phase 1: Setup

**Purpose**: Establish a clean pre-change baseline to diff against later (User Story 2's whole job is proving nothing outside `ColorPreview` moved).

- [X] T001 Run the full pre-change baseline and record it passing: `pnpm --filter @dtcg-editor/token-editor-color test` and, from repo root, `pnpm exec vitest run --project 'packages/token-editor-color:unit'` + `--project 'packages/token-editor-color:a11y'`. No file changes in this task.

---

## Phase 2: Foundational

**Purpose**: N/A for this feature. The formatting utility this feature reuses (`colorValueToCssColor` in `packages/token-editor-color/src/utils/css-color.ts`) and the schema it validates against (`ColorValueSchema` in `@dtcg-editor/token-core`) already exist and are already fully tested (`css-color.test.ts`). No blocking infrastructure work is needed before User Story 1 can start.

**Checkpoint**: Proceed directly to User Story 1 — no foundational tasks.

---

## Phase 3: User Story 1 - Read a previewed color token's value in CSS terms (Priority: P1) 🎯 MVP

**Goal**: `ColorPreview`'s text renders as a CSS Color 4 function/hex string — the same value `colorValueToCssColor` already computes for the swatch — instead of `JSON.stringify(value)`.

**Independent Test**: Render `ColorPreview` with a representative value from several DTCG color spaces and confirm the text is CSS syntax, not JSON, and matches what `colorValueToCssColor` returns for that value (quickstart.md Scenarios 1–2).

### Tests for User Story 1 ⚠️

> Write these first; confirm each fails against the current `JSON.stringify` output, for the expected reason, before touching `ColorPreview.tsx`.

- [X] T002 [P] [US1] [U1] [U2] [U3] [U4] [U5] [U6] Write `packages/token-editor-color/src/components/ColorPreview/ColorPreview.test.tsx`: render `ColorPreview` with representative values covering every color-space *family* `colorValueToCssColor` formats differently — `oklch` (with alpha), `hsl`, `display-p3` (a `color()`-predicate space), `lab` or `lch` (unbounded-channel form), one `"none"`-component case, and one no-alpha case — and assert the rendered text equals `colorValueToCssColor(value)`'s output for each. This does not re-test every one of the 14 DTCG spaces individually (that exhaustive coverage already exists in `css-color.test.ts`, unchanged by this feature); it proves `ColorPreview` actually delegates to that function for each syntactically-distinct case. (spec FR-001, FR-002, FR-006; quickstart Scenario 1)
- [X] T003 [P] [US1] [U9] Write `packages/token-editor-color/src/components/ColorPreview/ColorPreview.a11y.test.tsx`: Vitest Browser Mode + `axe-core` check on `ColorPreview` rendering a representative color value, per this package's Principle IV a11y-tier requirement.
- [X] T004 [US1] [A1] [A2] Update the real-entry-point acceptance test in `apps/web-app/e2e/edit-token-references.spec.ts` (test "A7", `~line 253`, and its sibling assertions at `~lines 302, 326-327` that check a previewed candidate's text): tighten `toContainText(/0\.2.*0\.4.*0\.9/)` (and the other number-sequence regexes) into an exact match on the new CSS-function text (e.g. `color(srgb 0.2 0.4 0.9)`), and correct the comment at `~lines 262-267` that currently says `ColorPreview` renders "the value's raw text form" — satisfies Principle XIII's real-entry-point acceptance-test requirement for spec.md's User Story 1 acceptance scenarios, and fixes that comment's soon-to-be-stale description in the same change.
- [X] T005 [US1] Run T002, T003, and T004 and confirm all three fail for the expected reason (current `JSON.stringify` output / current loose-regex text). Record each observed failure in `packages/token-editor-color/specs/002-color-preview-css-format/tdd/cycle-log.md` (create the file; one entry per test, per repo-root Principle XIII) before starting T006.

### Implementation for User Story 1

- [X] T006 [US1] [U1] In `packages/token-editor-color/src/components/ColorPreview/ColorPreview.tsx`, replace the local `formatRaw(value)` (`JSON.stringify`) with a call to `colorValueToCssColor` from `../../utils/css-color.ts`, passing the already-`ColorValueSchema`-validated value (the same `parsed.data` the component already computes for `Swatch`) — depends on T002–T005 existing and confirmed red first. This one change is the "obvious implementation" for U1 and, because `colorValueToCssColor` already handles every color space correctly, is expected to also turn U2–U6 green immediately — `/speckit-tdd-run` verifies each of those with the deliberate-mutant check per the playbook rather than a fresh red, and records that in the cycle log.
- [X] T007 [US1] Run T002, T003, and T004 to green. Confirm by inspection that `Swatch` and the preview text now read from the same `colorValueToCssColor(parsed.data)` call within `ColorPreview.tsx` (spec FR-002 / SC-002 — swatch and text cannot disagree because they share one call site, not because two outputs happen to match). Append the green result to `tdd/cycle-log.md`.

**Checkpoint**: User Story 1 fully functional and independently testable — every DTCG color space previews as CSS syntax, proven at both the component level and the real app entry point.

---

## Phase 4: User Story 2 - Editing stays exactly as it is today (Priority: P1)

**Goal**: Prove the interactive `ColorEditor` and its subtree are unaffected by User Story 1's change.

**Independent Test**: Run the existing `ColorEditor` test suite unmodified and diff the feature branch against its base to confirm no file under `ColorEditor/`, `ColorFunctionValue/`, `ChannelInput/`, `ColorSpaceSelect/`, or `SpaceConversionDialog/` changed (spec FR-003; quickstart Scenario 5).

### Verification for User Story 2

- [X] T008 [US2] After T007, re-run `packages/token-editor-color/src/components/ColorEditor/ColorEditor.test.tsx` and `ColorEditor.a11y.test.tsx` (plus the sibling `ColorFunctionValue`/`ChannelInput`/`ColorSpaceSelect`/`SpaceConversionDialog` suites) via the same commands as T001, and confirm the results are byte-for-byte the same pass count as the Phase 1 baseline — zero new failures, zero changed assertions.
- [X] T009 [US2] Run `git diff --stat` against this feature's base commit and confirm the only changed/added paths are under `packages/token-editor-color/src/components/ColorPreview/`, `apps/web-app/e2e/edit-token-references.spec.ts` (T004), and this `specs/002-color-preview-css-format/` directory — no file under `ColorEditor/` or its sibling editor components appears in the diff.

**Checkpoint**: User Stories 1 and 2 both hold — the preview changed, the editor provably did not.

---

## Phase 5: User Story 3 - Non-color and invalid values keep declining gracefully (Priority: P3)

**Goal**: Lock in, with a test, the pre-existing decline-on-invalid-value and pass-through-legacy-hex behaviors that this feature must not disturb.

**Independent Test**: Render `ColorPreview` with a value that fails `ColorValueSchema` and confirm it renders `null`; render it with a legacy bare-hex string and confirm the text is unchanged (spec FR-004, FR-005; quickstart Scenarios 3–4).

### Tests for User Story 3

> These characterize already-correct, pre-existing behavior (the decline branch and the hex passthrough are not being changed by T006) rather than driving a new implementation — still written before being declared done, per Principle IV's coverage requirement, but not expected to go through a literal red phase against `ColorPreview.tsx` itself.

- [X] T010 [US3] [U8] Add a test case to `ColorPreview.test.tsx` (from T002): render with a value that fails `ColorValueSchema` (e.g. `{ not: "a color" }`) and assert the component renders nothing (spec FR-005; quickstart Scenario 3).
- [X] T011 [US3] [U7] Add a test case to `ColorPreview.test.tsx` (from T002): render with a legacy bare-hex string (e.g. `"#3366ff"`) and assert the text renders that string unchanged (spec FR-004; quickstart Scenario 4).

**Checkpoint**: All three user stories independently verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation against the full design and repo gate.

- [X] T012 [P] Walk `packages/token-editor-color/specs/002-color-preview-css-format/quickstart.md` end-to-end (all 5 scenarios) and confirm each matches actual behavior.
- [X] T013 Run the full repo-root gate: `pnpm test` (build, all Vitest projects, every package's `node --test` suite, commitlint) and confirm green before considering the feature done.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first, establishes the baseline Phase 4 diffs against.
- **Foundational (Phase 2)**: N/A — no tasks, nothing blocks Phase 3.
- **User Story 1 (Phase 3)**: Depends on Phase 1 (baseline recorded). The only phase that changes production code (T006) or app-level test code (T004).
- **User Story 2 (Phase 4)**: Depends on Phase 3 (T007) — it verifies the state *after* User Story 1's change.
- **User Story 3 (Phase 5)**: Depends on T002 (same file, `ColorPreview.test.tsx`) — can run any time after T002 exists; ordered after Phase 4 here only for narrative clarity, not a hard requirement.
- **Polish (Phase 6)**: Depends on all of the above.

### Within Phase 3

- T002, T003, T004 are the red phase — T002 and T003 are different files and parallelizable; T004 touches a third, unrelated file, so it is also independent of T002/T003, but all three must exist and be confirmed red (T005) before T006 starts.
- T005 (record red) depends on T002, T003, T004.
- T006 (implement) depends on T005.
- T007 (confirm green, record it) depends on T006.

### Parallel Opportunities

- T002, T003, and T004 (three different files, no shared dependency) can run in parallel.
- T010 and T011 touch the same file (`ColorPreview.test.tsx`, extending T002) — not parallel with each other, but independent of Phase 4's tasks and could run concurrently with T008/T009 if staffed separately.

---

## Parallel Example: User Story 1

```bash
# T002, T003, and T004 together — three different files, no shared dependency:
Task: "Write ColorPreview.test.tsx covering CSS-format rendering across representative color-space families"
Task: "Write ColorPreview.a11y.test.tsx (axe-core coverage)"
Task: "Tighten edit-token-references.spec.ts's preview-text assertions to the new CSS syntax"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 (baseline).
2. Skip Phase 2 (nothing to do).
3. Complete Phase 3 (T002–T007) — this alone delivers the entire user-facing change, proven at both the component and real-app level, with red/green recorded in `tdd/cycle-log.md`.
4. **STOP & VALIDATE**: every DTCG color space previews as CSS syntax; `ColorEditor` untouched by inspection.

### Incremental Delivery

1. Phase 1 → baseline recorded.
2. Phase 3 (US1) → the feature itself, MVP.
3. Phase 4 (US2) → non-regression proof, cheap given US1 is this small.
4. Phase 5 (US3) → coverage for the two behaviors that were always correct but untested.
5. Phase 6 → full-suite confirmation.

### Notes

- This is a small, single-component feature — no parallel-team split is warranted; the phases above are sized for one implementer working sequentially.
- Commit after each phase (or after T007, the last task with production-code changes) rather than per-task, matching this repo's existing commit granularity for small features.
- Every task in Phase 3 stays inside `packages/token-editor-color/src/components/ColorPreview/`, except T004 (the Playwright acceptance test, deliberately at the app level) — Phase 4's whole point is confirming nothing *else* moved.

## Implementation Notes (added by /speckit-implement, post-hoc)

All 15 test-list behaviors (A1–A6, U1–U9) are `DONE` — see
`tdd/test-list.md` and the full cycle-by-cycle evidence in
`tdd/cycle-log.md`, produced by `/speckit-tdd-run`. Five tasks are ticked
here based on that evidence rather than by re-running their literal
original wording, each noted honestly:

- **T001**: the baseline was run repeatedly (see `tdd/cycle-log.md`'s
  Baseline and "Baseline re-check" entries) — it did **not** record
  passing on the first attempt (5, then 4, pre-existing perf/timing e2e
  failures unrelated to this feature). Proceeding on that red baseline was
  an explicit, user-approved deviation, fully documented. Ticked because
  the task's actual action (run it, record it) was performed and its
  result is the audit trail's foundation, not because the literal word
  "passing" was achieved.
- **T005 / T007**: written expecting one batched red-then-green pass
  across T002–T004. What actually happened (anticipated in T006's own
  task text, written during `/speckit-tdd-plan`) was outside-in,
  cycle-by-cycle: A1/A2 + U1 opened red and closed together in Cycle 1;
  T003's a11y test didn't exist yet when T006's implementation landed.
  Ticked because every test's red-then-green evidence is fully recorded
  in `tdd/cycle-log.md`, Cycles 1–5 — the discipline these tasks exist to
  enforce was honored throughout, just not in the single-batch shape
  originally described.
- **T012**: walked all 5 quickstart scenarios against the recorded
  cycle-log evidence — each maps directly onto a `DONE` behavior (Scenario
  1→U1, 2→U2–U6, 3→U8, 4→U7, 5→A4/A5).
- **T013**: `pnpm test` run at commit `e311870` — 71 passed, 2 failed, both
  from the accepted-deviation baseline (pre-existing perf/timing e2e
  flake, unrelated to this feature) — not a literal all-green gate, but
  the accepted exception, consistent throughout this feature's work.
