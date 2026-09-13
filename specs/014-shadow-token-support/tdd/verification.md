# TDD Verification: Shadow Token Support

**Verdict**: PASS

## Test-first evidence

Every behavior in `tdd/test-list.md` (A1-A15, U1-U45) traces to a cycle in
`tdd/cycle-log.md` recording the exact command run, the observed red
(failure output confirming the test existed and failed for the intended
reason before its implementation), and the subsequent green. No test was
written after its implementation. `tasks.md`'s test tasks precede their
paired implementation tasks throughout, each carrying the behavior-id
brackets (`[U1]`, `[A1]`, etc.) that tie task to test-list entry.

## Test strength: deliberate-mutant spot check

No mutation-testing tool is configured in this repo
(`.specify/memory/tdd-profile.md`: `mutation: null`), so per that profile's
documented fallback, three deliberate one-line mutations were made on
high-risk changed files, confirmed to produce a failing test, then restored
exactly (see cycle-log.md Cycle 8):

1. `token-core/src/shadow.ts` — removed the empty-array guard. Caught.
2. `token-editor-shadow`'s `ShadowEditor.tsx` — disabled the last-layer
   remove guard. Caught.
3. `token-editor-shadow`'s `ShadowPreview.tsx` — widened the "N shadows"
   threshold from `> 1` to `>= 1`. **Not initially caught** — this surfaced
   a real gap (no test exercised a one-item array value against
   `ShadowPreview`). The gap was closed by adding behavior `U45` before
   restoring the implementation, and the mutant is now caught.

The third case is exactly what this check is for: it found and closed a real
coverage hole rather than rubber-stamping the existing suite.

## Acceptance-criteria coverage

Every acceptance scenario across spec.md's four user stories has at least
one `A` behavior with a `DONE` state and a named test in `test-list.md`'s
outer-loop table. No criterion is unmapped.

## Full suite state at completion

- `pnpm build`: 16/16 tasks succeed.
- `pnpm lint`: 33/33 tasks succeed, no findings.
- `pnpm exec vitest run` (root-aggregated `test.projects`, covers every JSX
  package including the new `token-editor-shadow` unit + a11y projects):
  184 files / 888 tests passed, 0 failed.
- `node --test src/*.test.ts` in `packages/token-core`: 193/193 passed
  (178 baseline + 15 new `shadow.test.ts` behaviors).
- `pnpm --filter @dtcg-editor/web-app exec playwright test` (the acceptance
  tier `pnpm test` also runs via `apps/web-app`'s own `test` script): 64
  passed, 10 skipped, **2 pre-existing failures** —
  `keyboard-navigation.spec.ts`'s large-fixture Tab-order test and
  `render-stability.spec.ts`'s hub-referrer-update test. Both were confirmed
  to fail identically against the base commit `f1c1347`, before any change
  in this feature, by stashing this feature's changes and re-running the
  same two specs. They are unrelated to shadow-token-editor behavior and out
  of this feature's scope to fix.

## Notes and deviations from `tasks.md`'s original text

- T025's test file is `token-type.test.tsx` (Vitest), not `token-type.test.ts`
  (`node:test`), because `shadowTokenType` imports JSX components and
  `node:test` cannot parse JSX (constitution's Technology Stack section).
  Discovered during implementation; recorded in cycle-log.md Cycle 6.
- T029's registration required discovering and fixing a fixture regression
  in `apps/web-app/scripts/generate-large-fixture.ts` (its "still-
  unregistered-type" showcase exemplar was `shadow`, per a prior commit);
  swapped to `gradient` and hand-patched the committed
  `large_scale.tokens.json` fixture's `_showcase.exotic` block only, to
  avoid disturbing unrelated seeded values elsewhere in that large committed
  file. See cycle-log.md Cycle 7 for the full account and the base-commit
  confirmation that the two remaining Playwright failures predate this
  feature.
