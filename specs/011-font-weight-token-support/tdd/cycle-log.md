# Cycle Log: Font Weight Token Editor Support

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite (fast, this feature's relevant subset): `pnpm exec vitest run` -> 704
  passed, 0 failed (142 test files). `pnpm --filter @dtcg-editor/token-core test`
  -> 101 passed, 0 failed.
- suite (full CI gate): `pnpm test` -> 3 failed (all pre-existing, unrelated —
  see `tdd/test-list.md`'s `suite_baseline` note: two perf-budget flakes in
  `e2e/edit-token-references-perf.spec.ts`, one focus-order flake in
  `e2e/keyboard-navigation.spec.ts`), rest passed.
- commit: `7b8a554`
- recorded: cycle 0, before any change
