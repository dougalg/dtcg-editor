# Cycle Log: Color Token Preview CSS-Style Formatting

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite: `pnpm test` -> 68 passed, 5 failed, 10 skipped (`apps/web-app` project); `@dtcg-editor/token-editor-color` (14 tests), `@dtcg-editor/token-core` (101 tests) both fully green
- commit: `a38c355`
- recorded: cycle 0, before any change
- **Baseline is RED, pre-existing and unrelated to this feature.** The 5 failures are all e2e performance/timing and keyboard-navigation flake, none touching color tokens, `ColorPreview`, or `ColorEditor`:
  - `edit-token-references-perf.spec.ts` — Long Task budget (A18)
  - `edit-token-references-perf.spec.ts` — keystroke-to-updated-list p95 latency (SC-004)
  - `editing-perf.spec.ts` — >=100-referrer update budget (A5)
  - `editing-perf.spec.ts` — sustained-typing no-lag budget (A6)
  - `keyboard-navigation.spec.ts` — Tab/Shift+Tab visual-order regression count (A3)
  - Git history already has a dedicated `worktree-fix-editing-perf-ci-flake` branch tracking this class of flake, consistent with this being known, pre-existing, environment/timing-sensitive breakage rather than something this feature introduced.

## Baseline re-check: rebased onto main

- Rebased (fast-forward, no conflicts — this branch was already an ancestor of `main`) onto `main` at the user's request, hoping `3fbc94b fix(root): serialize a11y browser tests into their own sequence group` would clear the baseline.
- suite: `pnpm test` -> 69 passed, 4 failed, 10 skipped. One of the five (`editing-perf.spec.ts` sustained-typing no-lag budget, A6) now passes; the other four remain:
  - `edit-token-references-perf.spec.ts` — Long Task budget (A18)
  - `edit-token-references-perf.spec.ts` — keystroke-to-updated-list p95 latency (SC-004)
  - `editing-perf.spec.ts` — >=100-referrer update budget (A5)
  - `keyboard-navigation.spec.ts` — Tab/Shift+Tab visual-order regression count (A3)
- commit: `3fbc94b`
- **Deliberate deviation from this command's Phase 0 rule, approved explicitly by the user**: asked whether to (a) proceed on this known-red, unrelated baseline with the deviation recorded, or (b) hold until the perf-flake branch lands. User chose (a). The loop proceeds from here with these 4 failures as the accepted baseline — a **new** failure outside this set is this feature's regression; continued failure of exactly these 4 is not, and is not attributed to any cycle below.
