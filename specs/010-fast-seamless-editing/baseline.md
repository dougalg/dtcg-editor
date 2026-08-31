# Performance & Stability Baseline

Satisfies **C-MB-6** / **SC-008** / **FR-015**: the documented measured baseline the
app is held to. The perf specs
(`apps/web-app/e2e/editing-perf.spec.ts`, `apps/web-app/e2e/render-stability.spec.ts`)
use the **budget** column as a hard ceiling and the **after** column as a
regression ceiling — a measured value that exceeds either fails the build.

- **before**: captured on the pre-change code (`git merge-base HEAD main` =
  `9026644`), with the perf harness + `large_scale.tokens.json` ported on top.
- **after**: captured on the finished feature, on the same machine profile.

Numbers are the median of 5 runs. Record the machine/OS/CPU alongside a capture.

## Measurements

| Interaction (large fixture, ~2,000 tokens) | before | after | budget | pass/fail |
| --- | --- | --- | --- | --- |
| `commit → value visible` — a single dimension value edit (A1, SC-001) | _pending_ | _pending_ | ≤ 100 ms | _pending_ |
| `commit → value visible` — edit a token referenced by ≥ 100 others (A5, SC-005) | _pending_ | _pending_ | ≤ 100 ms | _pending_ |
| typing burst — 5 s at ~10 cps, dropped characters (A6, SC-006) | _pending_ | _pending_ | 0 dropped | _pending_ |
| typing burst — max frame the displayed text trailed the input (A6, C-RI-2) | _pending_ | _pending_ | ≤ 1 frame (~16.7 ms) | _pending_ |
| layout-shift sources outside the edited field + its slot — type + commit (A2, SC-002) | _pending_ | _pending_ | 0 | _pending_ |
| layout-shift entries during a full Tab / Shift+Tab pass (A10/A11, SC-002/SC-003) | _pending_ | _pending_ | 0 | _pending_ |
| layout-shift sources outside the previews — ≥ 100-referrer commit (A4, SC-004) | _pending_ | _pending_ | 0 | _pending_ |

CI safety margin applied by the specs: `editing-perf` asserts `< budget × 3` to
absorb shared-runner jitter; the `layout-shift` assertions are exact (`=== 0`).

## How to capture the "before" column

Run against the pre-change code **without** disturbing the feature worktree:

```sh
# from the repo root, in a throwaway sibling worktree at the merge-base
git worktree add /tmp/dtcg-baseline "$(git merge-base HEAD main)"
cd /tmp/dtcg-baseline
pnpm install

# port the harness + fixture from the feature branch (they don't exist at the merge-base)
git --work-tree=. checkout <feature-branch> -- \
  apps/web-app/e2e/support/stability.ts \
  apps/web-app/e2e/editing-perf.spec.ts \
  apps/web-app/e2e/render-stability.spec.ts \
  apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json

pnpm --filter @dtcg-editor/web-app exec playwright test \
  editing-perf.spec.ts render-stability.spec.ts --reporter=list

# transcribe the `perf` annotations + the layout-shift counts into the table above
cd - && git worktree remove /tmp/dtcg-baseline --force
```

The "after" column is captured the same way, minus the port step, on the
finished feature branch (task T007's completion + the story checkpoints).
