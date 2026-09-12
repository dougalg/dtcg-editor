# Cycle Log: cubicBezier Token Support

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite (fast, vitest projects only): `pnpm exec vitest run` -> 703 passed, 1
  failed (`apps/web-app` bench project's wall-clock benchmark,
  `lib/tokens/reference-index.test.ts`, SC-010 timing assertion — pre-existing,
  unrelated to this feature, flaky under full-suite CPU contention per
  `.specify/memory/tdd-profile.md`'s own documented flake note; not touched by
  this feature)
- suite (token-core, node:test): not yet run standalone at baseline (no
  `cubic-bezier.*` files exist yet to affect it)
- commit: `6c6dd26`
- recorded: cycle 0, before any change
