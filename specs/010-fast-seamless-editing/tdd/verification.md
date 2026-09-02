---
feature: 010-fast-seamless-editing
verdict: PASS_WITH_GAPS
standard: .specify/extensions/tdd/templates/tdd-test-quality-rubric.md
verified_at: 6654e24
behaviors: 84 # 13 acceptance (A1-A12 + A3a) + 71 unit (U1-U78, some ids retired/merged)
proven: 82
likely: 2 # U63 (no cycle-log entry), U71 (e2e helper, no runner — evidence is mutant + before/after)
test_after: 0
no_test: 0
high_smells: 0
criteria_total: 8 # SC-001..SC-008
criteria_covered: 8 # all via an e2e test; SC-001/002/007 through a documented proxy metric
mutation_score: n/a # no StrykerJS; 3 fresh deliberate mutants this audit + ~40 recorded in cycle-log, all caught
mutants_survived: 0
suite: 572 vitest passed (0 failed) + 52 Playwright passed / 9 skipped (0 failed); ~30s vitest, ~2min e2e
---

# TDD Verification: Fast, Seamless Editing

**Verdict: PASS_WITH_GAPS.** The loop discipline holds across all 111 feature
commits — every behavior has a test, the git history is textbook test-then-code,
no pre-existing test was weakened, skipped, or deleted, and every Success
Criterion reaches an end-to-end Playwright test. Three deliberate mutants planted
during this audit (commit-rejection, preview-cache invalidation scope,
reference-chain recursion) were each caught by 2–7 tests. The gaps are all *weak
evidence*, not defects: one behavior (U63) has no cycle-log entry, SC-001 / SC-002
/ SC-007 are verified through documented proxy measurements rather than their
literal metric, and a handful of behavior-tagged `tasks.md` boxes were left
unticked though their behavior is `DONE`.

**This audit was not independent** — it was run by the same session that authored
the A1–A12 acceptance cycles and the U41e–U49 unit cycles. Every file cited below
was re-read cold, and core logic was re-checked by mutation, but a fresh-context
smell pass over the full unit-test surface (~30 files) is recommended before
archiving.

## Test-first evidence

Representative classification (full per-id table would repeat `tdd/test-list.md`,
where every row is `DONE` with a named test):

| Behavior group | Class | Evidence |
| --- | --- | --- |
| U1–U62, U64–U78 (store, resolver, hooks, components) | PROVEN | Each cycle in `cycle-log.md` records the `pnpm exec vitest run … -t "…"` red command and its assertion output (or, for pass-first-run cycles, a recorded deliberate-mutant check per playbook Step 3). Git history: `test(web-app): …` commit precedes or accompanies its `feat(web-app): …` (e.g. `1062e89`→`bacbe5f`, `4ae2260`→`350cbe3`). |
| U63 (`FieldErrorSlot.a11y` axe clean) | LIKELY | Commit `9c92601` is test-only and sits in-sequence between U62's and U64's cycles, but **cycle-log numbering jumps 75 → 77** — there is no Cycle 76 entry, so no red output or deliberate-mutant is recorded for U63. |
| U69 (generator output loads through the pipeline) | PROVEN | Cycle 3 is pass-first-run but records a deliberate mutant (`{}`→`[]` per subgroup → `Expected an object …, got array`) **and** notes the first assertion draft was vacuous (`$value:null` passed `isOk()`) and was widened — exactly the rubric's prescribed handling. |
| U70 / U71 / U71a (e2e stability helpers) | LIKELY / N/A | Profile has no vitest runner for `e2e/**`; evidence is a before/after measurement plus a deliberate ≥200 ms in-page block (cycle 83) that pushes the number over budget. Exercised green by the A-specs. |
| A1, A2, A3, A3a, A4, A7, A8, A9, A12 | PROVEN | Pass-first-run (correct rewrite of a skeleton), each with a recorded deliberate mutant that fails the test: A1 150 ms `commitDraft` block → 12 long tasks; A2 `min-height:0` → +21 px; A3 `outline:none` → 0/40; A3a `overflow:hidden` on `.token` → 20 clipped; A4 `<TreeNode key={hasPendingEdits}>` → unrelated rows re-render; A12 theme-driven `setDraft({})` → draft cleared. |
| A5, A6, A10 | PROVEN | Genuine red first: A5 `Test timeout` (referrer selector could not match — fixed as its own step); A6 `Received: "…dogdimension"` (caret at 0 — retargeted to a value field); A10 `locator.focus: Test timeout` (reference rows have no description field — retargeted to the hub). Deliberate mutants recorded for each. |
| A11 | PROVEN (strongest) | Real red — `A11 focus after accept: <body> (body=true)` — fixed by a real production change (`0dbde43`: `handleAcceptInferredType` focuses `headingId` after `commit`). |

## Findings

Ordered by severity.

| # | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| 1 | MED | **U63 has no cycle-log entry.** Numbering skips Cycle 76; U63 appears only in passing mentions (`cycle-log.md:1317`, `:1344`). No recorded red, no deliberate-mutant. The test itself is a standard axe-clean check and the commit is test-only in-sequence, so this is a bookkeeping gap, not a test-after — but the evidence chain is broken. | `specs/010-fast-seamless-editing/tdd/cycle-log.md` (75 → 77); `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.a11y.test.tsx`; commit `9c92601` |
| 2 | MED | **SC-001's literal metric ("updated value visible within 100 ms of commit") is not asserted.** A1 measures `PerformanceObserver('longtask')` count across a run of commits instead. The reinterpretation (local-draft architecture makes "visible" latency ~0, so a `perf.now()` self-echo is vacuous) is documented in `test-list.md` A1 and `baseline.md`, and the long-task proxy is a defensible — arguably stricter — guard. But a reader taking SC-001 at face value will not find its measurement. | `apps/web-app/e2e/editing-perf.spec.ts:50-86`; `test-list.md` row A1 |
| 3 | MED | **SC-002's literal metric ("measured layout shift … is zero") is not asserted via the layout-shift API.** A2 uses direct row-height delta, A4 uses `innerHTML` DOM-diff, because the `layout-shift` API filters any shift within 500 ms of a discrete input (`hadRecentInput`) and is blind to commit-adjacent shifts. Documented in cycles 88/91 and `test-list.md`. The geometry/DOM measurement is stricter, but it is a proxy for the SC's wording. | `apps/web-app/e2e/render-stability.spec.ts:37-79` (A2), `:148-232` (A4) |
| 4 | MED | **SC-007 is verified by a fixture-size proxy.** A7 asserts only `large_scale.tokens.json` renders ≥ 2,000 rows; it does not itself run SC-001..SC-006 at the ceiling. The guarantee rests on A1/A2/A4/A5/A6 all navigating that same fixture (which they do) plus the re-measurement recorded in cycles 85–87. Sound, but A7's assertion is one step removed from its stated behavior. | `apps/web-app/e2e/editing-perf.spec.ts:191-205` |
| 5 | MED | **FR-010's focus-movement half has no test.** "Committing an edit *and moving focus between rows and controls* MUST preserve … every group's expanded/collapsed state." The commit side is covered (A4 checks `<details open>` flags; A10 checks scroll). The tab-through side — that a full Tab/Shift+Tab pass leaves every `<details>` open-state unchanged — is only covered for *layout shift* (the "supports A3 / SC-003" test asserts `layout-shift total === 0`), not for the open-state flags directly. `tasks.md` T032 (C-KL-6) is the intended home and is still open. | `render-stability.spec.ts:81-102`; `tasks.md:143` (T032, open) |
| 6 | MED | **FR-008 has no test, by design.** "Supplementary UI revealed on focus occupies pre-reserved space." Cycle 96 established the editor ships no such UI — `TypeSuggestion` is condition-mounted on an inferred `$type`, not focus-triggered. A11 was refined to the real surface (focus-not-stranded-on-`<body>` on accept). Acceptable, but FR-008 is an untested requirement and the rationale lives only in `test-list.md` §"Invariants … still to place". | `test-list.md:282-287`; `apps/web-app/e2e/inferred-type.spec.ts:85-128` |
| 7 | LOW | **Behavior-complete `tasks.md` boxes left unticked.** T045 `[A5]`, T046 `[A4]`, T032 `[A3][U54]`, T035 `[A2]`, T031 `[A11]` are all unchecked though every behavior id they carry is `DONE`. `cycle-log.md` explains each was "not ticked — bundles other PENDING behaviors" *at the time*; those behaviors have since closed. `/speckit-implement` reads checkboxes alone and would re-implement A4/A5's e2e cases (T045/T046 in particular describe work A5/A4's cycles already did). | `tasks.md:142-146,176-177` |
| 8 | LOW | **A6 asserts a 100 ms long-task budget, not SC-006's "one animation frame (~16 ms)" trailing bound.** The 0-dropped-characters assertion (`shown === BURST` after `pressSequentially` at 100 ms/char) is exact and strong; the lag half is only pinned to ≤ 100 ms, not ≤ 16 ms. | `apps/web-app/e2e/editing-perf.spec.ts:184-188` |

No HIGH smells found in the files read (all four acceptance specs, `TreeTokenNode.render-isolation.test.tsx`, and the `staged-edits-store` / `preview-resolver` suites via mutation). No assertion-free, tautological, re-implemented-expectation, doubled-subject, or vacuous-assertion test observed. No `test.skip`/`.only`/`.todo` in the committed state other than Playwright's documented `test.skip(testInfo.project.name !== …)` project-routing guard (5 sites in `keyboard-navigation.spec.ts`).

## Mutation results

No mutation tool in the profile. Three deliberate mutants planted and reverted
during this audit, plus the ~40 recorded across `cycle-log.md` (every acceptance
behavior has one).

| Mutant | File | Behavior(s) that should catch it | Caught |
| --- | --- | --- | --- |
| `commit`: gate the invalid-draft rejection on `if (false && …)` | `lib/tokens/staged-edits-store.ts:324` | U5, U8 | Yes — 2 tests fail (`… invalid value is rejected`, `… colliding rename …`) |
| `#invalidatePreview`: iterate `[]` instead of `#reverseDeps.get(key)` (invalidate only the edited key, not its dependents) | `lib/tokens/staged-edits-store.ts:350` | U19, U47, U48, U37, U38 | Yes — 7 tests fail across `staged-edits-store`, `TreeTokenNode.draft`, `useResolvedPreview` |
| `resolveFrom`: return `{kind:"value"}` instead of recursing on a resolvable hop | `lib/tokens/preview-resolver.ts:114` | U23, U26, U27 | Yes — 3 tests fail (`… multi-hop in-file chain`, `… cycle marker`, `… no stale carry-over`) |

Restore verified: `git diff` on `apps/web-app/**/*.ts(x)` is empty; `vitest run
lib/tokens/ hooks/` → 161 passed.

## Traceability

| Criterion | Tests | End to end |
| --- | --- | --- |
| SC-001 | A1 (long-task proxy), U44 | Yes (proxy — finding #2) |
| SC-002 | A2, A4 (direct geometry / DOM-diff), U60, U65 | Yes (proxy — finding #3) |
| SC-003 | A3, A3a, "supports A3 / SC-003" tab-through | Yes |
| SC-004 | A4, U39 | Yes |
| SC-005 | A5, U47, U19 | Yes |
| SC-006 | A6, U43a, U41e | Yes |
| SC-007 | A7 (fixture-size proxy), + A1/A2/A4/A5/A6 all on the 2,005-token fixture | Yes (indirect — finding #4) |
| SC-008 | A8 (`baseline.md` + A5 `≤ BASELINE_A5_MS` assertion) | Partial (A5 only asserts *at* baseline; other interactions assert *at* their after-value, argued in cycle 93 to be the ceiling) |
| FR-002 | A9, A11, U43, U49 | Yes |
| FR-003 | A10 | Yes |
| FR-005 / FR-006 / FR-007 | A3, A3a | Yes |
| FR-008 | — (no product surface; finding #6) | No (n/a) |
| FR-009 / FR-011 | A4, A5, U47, U19 | Yes |
| FR-010 | A4 + A10 (commit side); tab-through open-state half untested (finding #5) | Partial |
| FR-012 | A2, U60, U61, U64, U65 | Yes |
| FR-013 | A6, U43a | Yes |
| FR-014 | A12, U49 | Yes |
| FR-015 | A7, A8 | Yes |
| NFR-001 / NFR-002 | `editing-perf.spec.ts`, `render-stability.spec.ts`, `keyboard-navigation.spec.ts` exist as the automated guards | Yes |

Untested criteria: none among SC-001..SC-008 (three via a documented proxy).
Untested requirements: FR-008 (no surface), FR-010 focus-movement half.
Tests tracing to nothing: none found.

## What was not audited

- **Independence.** Same session authored the acceptance and late-unit cycles. Core
  logic was re-checked by mutation; the full-surface smell pass was a sample.
- **Smell pass coverage.** Cold-read in full: the 4 acceptance specs
  (`editing-perf`, `render-stability`, `keyboard-navigation`, `inferred-type`) and
  `TreeTokenNode.render-isolation.test.tsx`. Read structurally / via mutation:
  `staged-edits-store.test.ts`, `preview-resolver.test.ts`,
  `useResolvedPreview.test.tsx`, `TreeTokenNode.draft.test.tsx`. **Not opened this
  audit:** `useStagedEdits.test.tsx`, `useTokenSlice.test.tsx`,
  `TreeNode.memo.test.tsx`, `TreeNode.test.tsx`, `TreeGroupNode.draft.test.tsx`,
  `TreeGroupNode.test.tsx`, `TreeTokenNode.dispatch-memo.test.tsx`,
  `TokenTree.test.tsx`, `TokenBlock.test.tsx`, `generate-large-fixture.test.ts`,
  and all `*.a11y.test.tsx`.
- **Mutation** was 3 hand-placed mutants on the two React-free core modules plus
  the cycle-log's recorded set. No systematic run — no tool in the profile.
- **Coverage** — `@vitest/coverage-v8` not installed; no line/branch data.
- **Full suite re-run this session.** `vitest run lib/tokens/ hooks/` (161) was
  re-run after the mutant reverts. The full 572-vitest / 52-e2e green is cited from
  Cycle 97 at this same HEAD (`6654e24`), not re-executed here.
- **`node-packages` stack** — feature 010 touches no `packages/*` source; out of scope.
- **Working-tree noise (not feature work).** `package.json`, `pnpm-workspace.yaml`,
  `pnpm-lock.yaml`, `packages/design-system/package.json` show uncommitted drift
  (pnpm `packageManager` 11.24 → 11.25, catalog semver bumps for `zod`,
  `lucide-react`, `@biomejs/biome`, etc.) auto-written by `pnpm` during this
  session's test runs. Not produced by any audit or feature step; the user should
  revert or review it separately. It is **not** included in the verification commit.
