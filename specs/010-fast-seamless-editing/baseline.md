# Performance & Stability Baseline

Satisfies **C-MB-6** / **SC-008** / **FR-015**: the documented measured baseline
the app is held to. Each acceptance test that produces a number asserts against a
**budget** (a hard SC ceiling) and, where the budget leaves slack, against the
**after** value recorded here as a regression ceiling — a measured value that
exceeds either fails the build.

## Measurement method changed mid-implementation

The "before" column was captured once (2026-08-31) with the *first-draft* perf
harness: a wall-clock `commit → value visible` delta (`performance.now()` around
Playwright `fill`/`blur`) and a `PerformanceObserver('layout-shift')` gate.
Cycles 83–91 replaced those:

- **U71a / cycle 83** — `measureCommitToVisible` now runs its whole timed span in
  one `page.evaluate`; the old number was ~700 ms of Playwright protocol
  overhead, not app work.
- **A1 / cycle 85** — SC-001's "value visible" has no latency to time under the
  local-draft model (the typed value never leaves the screen). A1 now counts
  `PerformanceObserver('longtask')` blocks over a run of real commits.
- **A2 / cycle 88, A4 / cycle 91** — the `layout-shift` API filters shifts within
  500 ms of a discrete input (a commit-on-blur always is), so A2 measures the
  edited row's height directly and A4 diffs the rendered markup of unrelated
  rows / group headers / `<details open>` state.

So for A1 / A2 / A4 the "before" and "after" cells measure **different
quantities**; they are kept for history, annotated with the method. A5 and A6
have a genuine, comparable before → after.

- **before**: pre-change code (`git merge-base HEAD main` = `9026644`), the perf
  harness + `large_scale.tokens.json` checked out on top.
- **after**: the finished feature, captured across cycles 85–92 (see
  `tdd/cycle-log.md`); single representative run except A5 (varies ~25–50 ms).
  Playwright 1.62.1 / Chromium, `next build` + `pnpm run start`, macOS
  (Darwin 25.6.0), `large_scale.tokens.json` (2,005 tokens).

## Measurements

| Interaction (large fixture, 2,005 tokens) | before | after | budget | regression ceiling in spec |
| --- | --- | --- | --- | --- |
| **A1** commit → main-thread block (SC-001). *before:* wall-clock `commit→visible`; *after:* `longtask` count over 12 steady-state commits | **~354 ms** (full-tree re-render per keystroke, 2,000 unmemoised `TreeNode`s) | **0 long tasks** (one-time ~160 ms cold-start warm-up excluded) | ≤ 100 ms | `longestBlockMs ≤ ECHO_BUDGET_MS` (100) — already at the "after" (0) |
| **A5** hub edit → every referrer's resolved preview updates (SC-005) | **not observed** — no live referring-preview pre-change (referrers refresh only on save) | **~32 ms** | ≤ 100 ms | `elapsed ≤ BASELINE_A5_MS` (100) — the C-MB-6 regression ceiling; = raw budget, ≈ 3× the ~32 ms after |
| **A6** typing burst in a value field — dropped characters (SC-006) | **0 dropped** | **0 dropped** | 0 dropped | `shown === BURST` — exact |
| **A6** typing burst — main-thread block per keystroke (SC-006 / C-RI-2) | **caret jumped to offset 0** mid-burst (controlled-`value` re-render); drops: 0 | **0 long tasks, caret stable** (uncontrolled fallback field; U43a) | ≤ 100 ms / caret preserved | `max(longTasks) ≤ ECHO_BUDGET_MS` (100) — already at the "after" (0) |
| **A2** validation message appears — edited row height (SC-002 / FR-012). *before:* layout-shift sources outside the row; *after:* `nextRow.top − row.top` delta | **0** out-of-region shifts (`hadRecentInput`-filtered) | **0 px** row-height delta (162 → 162) | ≤ 1 px | `abs(Δheight) ≤ 1` — already at the "after" (0) |
| **A4** ≥100-referrer commit — change confined to edited row + referrers (SC-004). *before:* layout-shift; *after:* DOM diff of non-referrer rows / group headers / `<details open>` / back-link | **0** out-of-region shifts (`hadRecentInput`-filtered) | **unchanged** — non-referrer rows byte-identical, node not remounted, all `<details>` still open, back-link Y unchanged | exact | `after.unrelated ≡ before.unrelated`, `nodeSurvived`, `detailsOpen.every(true)` — exact |
| **A3 / A3a** full Tab / Shift+Tab pass — control + focus indicator at every stop, ring unclipped (SC-003) | keyboard flow worked pre-change on the small fixtures; not measured at 2,000 | **40/40 on a control, 40/40 visible indicator, 0 order regressions, 0 clipped, 0 obscured**; header unmoved | 100% / 0 | `=== STOPS` (40) and `toEqual([])` — exact |
| **A10 / A11** full Tab / Shift+Tab pass — `layout-shift` entries | **0** | **0** | 0 | `report.total === 0` — exact |

## Reading this as a regression ceiling (C-MB-6)

Only **A5** has budget slack above its "after" (32 ms vs a 100 ms budget), so it
carries an explicit `BASELINE_A5_MS` constant in `editing-perf.spec.ts`. Every
other measured interaction is already asserted at its "after" value (0 long
tasks, 0 px, exact DOM equality, `=== 0`), so the assertion *is* the regression
ceiling — there is no looser budget to hide a regression behind. Raising
`BASELINE_A5_MS`, or loosening any of the exact assertions, requires re-capturing
this table. (CI enforces a separate, higher A5 ceiling for slower hardware —
see §"CI vs local" — not a change to the local budget here.)

## CI vs local

The "after" column and every budget above were captured on macOS dev hardware
(Darwin 25.6.0). The suite also runs in CI on GitHub-hosted `ubuntu-latest`
(2-vCPU Linux), which is materially slower for CPU/DOM-bound work.

Only **A5** is sensitive to this. Its interaction is ~132 reference-row React
re-renders (the hub's reverse-dependency set — linear in that count, not in the
2,005-token tree size). That is ~32 ms locally but **496–545 ms across repeated
CI runs** (measured 2026-09-09), a ~15× hardware factor with no code change.
`editing-perf.spec.ts` therefore asserts two ceilings:

| env | constant | ceiling | rationale |
| --- | --- | --- | --- |
| local | `BASELINE_A5_MS` | 100 ms | the SC-005 / C-MB-1 budget; a regression trips here first |
| CI | `BASELINE_A5_CI_MS` | 800 ms | observed CI max (~545 ms) + headroom |

The CI ceiling is a hardware allowance, not a looser correctness bar: a
full-tree-rebuild regression still trips the 2 s `measureCommitToVisible`
timeout and the distant-node "did not rebuild" assertion regardless of env.
The spec is selected by `testInfo.config.metadata.isCI`, set from
`process.env.CI` in `playwright.config.ts` (the one file `no-process-env.grit`
exempts, so specs stay env-pure). Re-capture the CI row the same way as the
local column — from a CI run's `perf` annotation — if the runner class changes.

## How to re-capture a column

Round-trip in this worktree (no reinstall — no feature commit touches
`package.json` / the lockfile):

```sh
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git checkout "$(git merge-base HEAD main)"
git checkout "$BRANCH" -- \
  apps/web-app/e2e/support/stability.ts \
  apps/web-app/e2e/editing-perf.spec.ts \
  apps/web-app/e2e/render-stability.spec.ts \
  apps/web-app/e2e/keyboard-navigation.spec.ts \
  apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json
pnpm build
cd apps/web-app && pnpm exec playwright test \
  editing-perf.spec.ts render-stability.spec.ts keyboard-navigation.spec.ts \
  --project=default --reporter=list && cd -
# transcribe the `perf` annotations into the table above
git checkout -f "$BRANCH"
rm -rf apps/web-app/test-results
```

The A2 / A4 rows do not round-trip cleanly — they select `FieldErrorSlot`, the
resolved-value `<a>`, and `data-testid` rows that do not exist pre-change — so
their "before" cells are the original layout-shift numbers, not the reworked
measurement. The "after" column is captured the same way on the finished branch,
minus the checkout/restore steps.
