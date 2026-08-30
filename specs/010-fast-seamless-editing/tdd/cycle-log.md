# Cycle Log: Fast, Seamless Editing

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite (inner loop): `pnpm build && pnpm exec vitest run` -> 107 files, 491 passed, 0 failed (~30s wall)
- suite (full CI gate): `pnpm test` -> 15 turbo tasks green — vitest 491 passed; `node:test` packages green (token-core 101 passed sampled); Playwright 39 passed / 5 skipped (project-routing, intentional); commitlint + format:check green (~39s wall, turbo cache warm)
- commit: `b55f969`
- recorded: cycle 0, before any change
- note: `pnpm build` (turbo `^build`) MUST precede `pnpm exec vitest run`. Without it,
  `apps/web-app` test files fail with Vite import-resolution errors on
  `@dtcg-editor/design-system` / `token-core` (they resolve to `dist/`) — a false
  red, not a test failure. `pnpm test` handles this itself.
- known flake: one `components/TypeSuggestion/TypeSuggestion.test.tsx` failure was
  seen on one of three baseline runs (`@testing-library` cleanup race under the
  multi-project browser load); passed on the other two. Re-run once before
  attributing a lone `TypeSuggestion` failure to a cycle.

## Cycle 1: U67 generator emits byte-identical output for a fixed seed

- test: `apps/web-app/scripts/generate-large-fixture.test.ts::generateLargeFixture emits byte-identical output for a fixed seed` (new)
- red: `pnpm exec vitest run apps/web-app/scripts/generate-large-fixture.test.ts -t "generateLargeFixture emits byte-identical output for a fixed seed"`
  -> first: `Failed to resolve import "./generate-large-fixture.ts"` (module absent) ->
  added minimal stub returning `{ sample: { $type: "number", $value: Math.random() } }` ->
  re-ran: `AssertionError: Expected values to be strictly equal` (1 failed) — the two
  JSON dumps differ because the stub is nondeterministic
- green: `apps/web-app/scripts/generate-large-fixture.ts` — replaced `Math.random()` with a
  seeded `mulberry32(options.seed)` PRNG so the output is a pure function of `seed`.
  Suite `pnpm exec vitest run` -> 108 files, 492 passed, 0 failed (~19s)
- refactor: none needed — one ~25-line pure function; `mulberry32` is a standalone
  helper, no duplication against existing code (no PRNG elsewhere in the repo), test
  uses a named `SEED` constant and one assertion
- notes: deviation from strict list order — `next` targets the first PENDING behaviour,
  which is `A1`, but `A1`'s acceptance test (`editing-perf.spec.ts`) needs the large
  fixture and `e2e/support/stability.ts` to exist first, so its red would be a
  broken-fixture red (not a valid red per the playbook). `U67` is the first unblocked
  behaviour on `A1`'s critical path. `tasks.md` T001 carries `[U67] [U68] [U69]`, so it
  stays unticked until U68/U69 are also DONE.
- commit: not committed — this session also holds uncommitted planning artifacts from
  `speckit-tdd-setup` / `speckit-tdd-plan` / `speckit-constitution`; commit boundary
  left to the user (see report).

## Cycle 2: U68 generator emits ~2,000 tokens nested ≥3 levels deep

- test: `apps/web-app/scripts/generate-large-fixture.test.ts::generateLargeFixture emits ~2,000 tokens nested at least 3 levels deep` (new)
- red: `pnpm exec vitest run apps/web-app/scripts/generate-large-fixture.test.ts -t "emits ~2,000 tokens nested at least 3 levels deep"`
  -> `AssertionError: token count 1 is outside 1900-2200` (the cycle-1 stub returned one token)
- green: `apps/web-app/scripts/generate-large-fixture.ts` — build a deterministic
  10 groups × 10 subgroups × 20 leaves = 2,000-token tree (group depth 3), leaf values
  from the seeded `rand()`. New test + cycle-1 test both pass:
  `pnpm exec vitest run apps/web-app/scripts/generate-large-fixture.test.ts` -> 2 passed
- refactor: none needed — added a `walkTokens` helper in the test file (local, matches
  the repo's per-file helper convention); generator is a plain nested loop
- notes: **full-suite run is NOT clean** — `pnpm exec vitest run` reports
  `lib/tokens/reference-index.test.ts::builds the reference index for 5,000 tokens
  at chain depth 5 in under 50ms` failing (`best of 5 runs took 54.35ms`, budget 50ms,
  SC-010). This is a pre-existing load-sensitive perf assertion: it passed 3/3 at the
  Phase-0 baseline (suite ~20s) and passes in isolation now (14/14), but fails by ~9%
  under the sustained machine load of this session's continuous test running (suite now
  ~40s). This cycle's change is an isolated new file under `apps/web-app/scripts/` and
  cannot affect `reference-index.ts`. Not attributed to this cycle; not fixed
  (Hard Rule 4/6 — adjusting another feature's perf threshold is its own decision).
- commit: not committed
- STOP: `all` mode halted here — the full-suite green gate is unreliable on this
  machine under load, so subsequent per-cycle "nothing else broke" checks can't be
  certified honestly. See report.
