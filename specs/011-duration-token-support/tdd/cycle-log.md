# Cycle Log: Duration Token Support

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite (vitest, fast inner-loop subset, after `pnpm build` so workspace
  packages resolve): `pnpm exec vitest run` -> 142 test files passed, 704 tests
  passed, 0 failed
- suite (token-core, node:test): `node --test src/*.test.ts` (run from
  `packages/token-core`) -> 101 passed, 0 failed
- commit: `1c832dd`
- note: a fresh worktree needs `apps/web-app/assets/generated/*.ids.ts` (icon
  sprite ids) regenerated via `pnpm --filter @dtcg-editor/web-app generate:icons`
  before `pnpm exec vitest run` is green — these are gitignored build outputs,
  not a code regression. Confirmed green above only after regenerating them.
- recorded: cycle 0, before any change
