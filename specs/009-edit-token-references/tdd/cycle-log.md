# Cycle Log: Edit Token References

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite (fast, vitest projects): `pnpm build && pnpm exec vitest run` -> 572 passed, 0 failed, 120 files
- suite (full): `pnpm test` -> non-zero exit, but only `@dtcg-editor/web-app#test` (Playwright) failed, and only because the turbo pipeline started `next start` without a fresh `next build`. No test regression. Run `pnpm build` before `pnpm test` locally.
- commit: `4da9386`
- recorded: cycle 0, before any change
- pre-existing reds: none in the vitest tier
