# Cycle Log: Number Token Editor Support

Append only. Newest last. Every entry's `red` block is the evidence that the test existed and
failed before the implementation.

## Baseline

- `packages/token-core` suite: `pnpm --filter @dtcg-editor/token-core test` -> 154 passed, 0
  failed
- vitest projects (`pnpm exec vitest run`, after `pnpm build`): 685 passed, 1 failed test; 143
  passed / 21 failed test files
- commit: `33cb73d`
- recorded: cycle 0, before any change

## Notes and deviations

- The 21 failed `apps/web-app:a11y` test files (e.g.
  `components/TreeGroupNode/TreeGroupNode.a11y.test.tsx`, `components/TreeNode/TreeNode.a11y.test.tsx`,
  `components/TreeTokenNode/TreeTokenNode.a11y.test.tsx`) all fail identically: `TypeError: Failed
  to fetch dynamically imported module` during Vitest Browser Mode's real-Chromium startup — an
  environmental/sandbox browser-launch issue, not a code regression. None of the failing files are
  under `packages/token-core` or `packages/token-editor-*`, and none are files this feature
  touches. This pre-dates this feature's work (present before any change on this branch) and is
  out of this feature's scope to fix.
- The 1 failed test, `lib/tokens/reference-index.test.ts`'s
  "builds the reference index for 5,000 tokens at chain depth 5 in under 50ms" (SC-010), is a
  wall-clock performance guard that failed by 1.1ms (51.10ms vs the 50ms budget) — a
  scheduling-contention flake of the kind the tdd-profile itself documents ("dozens of other test
  files scheduled concurrently... can push a sample well past budget"), not a correctness
  regression, and unrelated to `number` token support.
- Per `spec.md`, `plan.md`: this feature's new/changed files are confined to
  `packages/token-core/src/number.ts` (+ test), a new `packages/token-editor-number` package, and
  two registration-only edits (`apps/web-app/lib/token-editors/built-in.ts`,
  `vitest.config.mts`). The loop below tracks only whether *those* files stay green; the two
  pre-existing reds above are recorded here as the documented baseline so `speckit-tdd-verify`
  does not mistake them for regressions introduced by this feature.
