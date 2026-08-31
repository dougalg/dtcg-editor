# Performance & Stability Baseline

Satisfies **C-MB-6** / **SC-008** / **FR-015**: the documented measured baseline the
app is held to. The perf specs
(`apps/web-app/e2e/editing-perf.spec.ts`, `apps/web-app/e2e/render-stability.spec.ts`)
use the **budget** column as a hard ceiling and the **after** column as a
regression ceiling — a measured value that exceeds either fails the build.

- **before**: captured on the pre-change code (`git merge-base HEAD main` =
  `9026644`), with the perf harness + `large_scale.tokens.json` checked out on
  top (they do not exist at the merge-base). Round-trip done in-place in this
  worktree — see the procedure below.
- **after**: to be captured on the finished feature, on the same machine.

**before capture**: 2026-08-31, single run (not yet median-of-5), Playwright
1.62.1 / Chromium, production build (`next build` + `pnpm run start`), macOS
(Darwin 25.6.0). Re-run as median-of-5 when the "after" column is filled.

## Measurements

| Interaction (large fixture, ~2,000 tokens) | before | after | budget | pass/fail |
| --- | --- | --- | --- | --- |
| `commit → value visible` — a single dimension value edit (A1, SC-001) | **~354 ms** | _pending_ | ≤ 100 ms | **FAIL (before)** |
| `commit → value visible` — edit a token referenced by ≥ 100 others (A5, SC-005) | **not observed** — no live referring-preview pre-change (referrers only refresh on save) | _pending_ | ≤ 100 ms | **FAIL (before)** |
| typing burst — 54 chars at ~10 cps, dropped characters (A6, SC-006) | **0 dropped** | _pending_ | 0 dropped | PASS (before) |
| typing burst — caret preserved during the burst (A6, C-RI-2 / INV-11) | **NOT preserved** — caret jumps to offset 0 mid-burst (typed text lands before the original) | _pending_ | preserved | **FAIL (before)** |
| layout-shift sources outside the edited field + its slot — type + commit (A2, SC-002) | **0** | _pending_ | 0 | PASS (before) |
| layout-shift entries during a full Tab / Shift+Tab pass (A10/A11, SC-002/SC-003) | **0** | _pending_ | 0 | PASS (before) |
| layout-shift sources outside the previews — ≥ 100-referrer commit (A4, SC-004) | **0** | _pending_ | 0 | PASS (before) |

Notes on the "before" run:

- **A1 ~354 ms** is dominated by the pre-change full-tree re-render on every
  keystroke (2,000 unmemoised `TreeNode`s). This is the headline number the
  feature must bring under 100 ms (`useSyncExternalStore` per-row slices +
  `memo` + local `draft`).
- **A5** could not be timed: on the pre-change code, editing the hub does not
  update any referring token's shown value until a save round-trip, so there is
  nothing to observe. The spec's `/px$/` referrer selector also needs
  tightening — folded into T045.
- **A6 caret** — the burst assertion fails on the pre-change code because the
  controlled `value` re-render resets the selection to 0 each keystroke; this
  is exactly the INV-11 behaviour the feature fixes. No characters are dropped
  either way.
- The **layout-shift** interactions already record 0 on the pre-change code for
  these small `_showcase.dimension` edits (the `hadRecentInput` filter plus a
  250 ms settle). The `=== 0` budget — not a before/after delta — is the real
  gate for A2 / A4 / A10 / A11 on the large fixture.

## How to capture / refresh a column

Round-trip in this worktree (no sibling worktree, no reinstall — no feature
commit touches `package.json` / the lockfile, so `node_modules` is already
valid for the merge-base):

```sh
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git checkout "$(git merge-base HEAD main)"
git checkout "$BRANCH" -- \
  apps/web-app/e2e/support/stability.ts \
  apps/web-app/e2e/editing-perf.spec.ts \
  apps/web-app/e2e/render-stability.spec.ts \
  apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json
pnpm build
cd apps/web-app && pnpm exec playwright test \
  editing-perf.spec.ts render-stability.spec.ts --reporter=list && cd -
# transcribe the `perf` annotations + pass/fail into the table above
git checkout -f "$BRANCH"
rm -rf apps/web-app/test-results
```

The "after" column is captured the same way, minus the checkout/restore steps,
on the finished feature branch (T007 completion + the story checkpoints).
