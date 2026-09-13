# Cycle Log: Shadow Token Support

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite (vitest, `pnpm exec vitest run`, after regenerating stale
  `apps/web-app/assets/generated/*.ids.ts` icon assets and one `pnpm build` per
  `tdd-profile.md`'s prerequisite note): 177 passed, 0 failed (851 tests)
- suite (`packages/token-core`, `node --test src/*.test.ts`): 178 passed, 0 failed
- commit: `f1c1347`
- recorded: cycle 0, before any change
