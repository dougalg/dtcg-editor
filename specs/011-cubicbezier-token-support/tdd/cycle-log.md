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

## Cycle 1: U1-U14 CubicBezierValueSchema validates the DTCG tuple shape

- test: `packages/token-core/src/cubic-bezier.test.ts` (new, 14 tests: valid tuple,
  P1x/P2x boundary at 0 and 1 both sides, negative P1y, P2y > 1, 3-element array,
  5-element array, non-numeric entry)
- red: `node --test src/cubic-bezier.test.ts` (run from `packages/token-core`) ->
  `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/cubic-bezier.ts'` (1
  failed — file didn't exist yet)
- green: created `packages/token-core/src/cubic-bezier.ts`
  (`CubicBezierValueSchema` as a `z.tuple` with `.min(0).max(1)` on indices 0/2,
  bare `z.number()` on indices 1/3). `node --test src/cubic-bezier.test.ts` -> 14
  passed, 0 failed. Full package suite `node --test src/*.test.ts` -> 116 passed
  (115 pre-existing + 14 new, minus 0 changed — see Cycle 2 for the 116th)
- refactor: none needed — the module already matches `dimension.ts`'s existing
  doc-comment/export style, nothing to extract
- commit: (this cycle + Cycle 2 committed together, see below)

## Cycle 2: A7 a cubicBezier token with out-of-range y-coordinates round-trips unchanged

- test: `packages/token-core/src/serialize.test.ts::round-trips a cubicBezier
  token with out-of-range y-coordinates unchanged (AC-07, spec 011 US3)` (new)
- red: N/A — test passed on first run (`node --test --test-name-pattern
  "round-trips a cubicBezier token" src/serialize.test.ts` -> 1 passed), because
  `token-core`'s generic node parse/serialize path (`parse.ts`/`serialize.ts`)
  already treats every `$value` opaquely regardless of `$type` — there is no
  per-type schema check at that layer to add. Per the loop playbook, applied the
  deliberate-mutant check instead of treating this as done: temporarily changed
  `serialize.ts`'s `raw.$value = node.value;` to
  `raw.$value = Array.isArray(node.value) ? node.value.slice(0, 3) : node.value;`
  (drops the 4th tuple element for any array value). Re-ran the same test ->
  failed with `AssertionError [ERR_ASSERTION]: ... deepStrictEqual` (a diff
  showing the mutated document dropped `1.55`, the 4th tuple element, vs. the
  original). Confirmed the test actually catches this class of regression, then
  reverted `serialize.ts` to its exact original line.
- green: no implementation change was needed (see above) — `node --test
  src/*.test.ts` -> 116 passed, 0 failed after the revert
- refactor: none
- commit: `docs/impl commit below — Cycles 1 and 2 landed together as one
  token-core commit`

## Notes and deviations

- Cycles 1 and 2 are committed together in a single commit
  (`feat(token-core): add cubicBezier value schema`) since Cycle 2 introduced no
  net code change (the mutant was reverted) — only a new test file addition to
  `serialize.test.ts`, alongside Cycle 1's new module. This is a single git
  commit covering two list-row completions, not a merged/skipped cycle.
