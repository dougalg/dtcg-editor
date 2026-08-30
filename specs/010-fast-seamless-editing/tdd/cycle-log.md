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

## Notes and deviations

- Cycles 1–2 committed after the fact (session also held earlier planning artifacts):
  `1cde422` / `317dff8` / `f006e99`, then rebased onto `main` (`9026644`, semver dep
  upgrades) as `8d18096` (cycle 1+2 code), `0bc7971` (profile + list), `4a235c9`
  (constitution). Rebase also picked up `604ef7e` from a parallel session, which
  moved `reference-index.test.ts` into a dedicated non-concurrent `apps/web-app:bench`
  Vitest project — the SC-010 perf flake that stopped the loop at cycle 2 is resolved;
  the full suite is a reliable gate again (494 green, ~21s).

## Cycle 3: U69 generator output loads through the token pipeline with no parse error

- test: `apps/web-app/scripts/generate-large-fixture.test.ts::generateLargeFixture output loads through the token pipeline with no parse error` (new)
- red: not a red-first cycle — the behaviour (structurally-valid DTCG that
  `parseTokenFile` + `buildReferenceIndex` accept) is already satisfied by the
  cycle-2 generator. Verified the test is not vacuous with a deliberate mutant:
  emitting each subgroup as `[]` instead of `{}` →
  `pnpm exec vitest run apps/web-app/scripts/generate-large-fixture.test.ts -t "loads through the token pipeline with no parse error"`
  -> `AssertionError: Expected an object at "group-0.sub-0", got array` (1 failed);
  code restored exactly, test green again.
  (An earlier draft asserted only `parseTokenFile(...).isOk()`; the mutant check
  showed `$value: null` passes it — token-core defers value-vs-type validation to
  `validateTokenValue` by design — so the assertion was widened to also require the
  reference index to land in the ~2,000 band, which the array mutant does trip.)
- green: no production change — test-only cycle. Full suite `pnpm exec vitest run`
  -> 108 files, 494 passed, 0 failed (~21s)
- refactor: none needed
- notes: `walkTokens` split test-list behaviour U68 into U68 + appended U72
  (≥100-referrer token), U73 (dispatch paths in first 20 tokens), U74 (injected
  file-writer / no I/O in the pure fn); T001's marker updated to
  `[U67][U68][U69][U72][U73][U74]` so it is not ticked until the generator is
  actually complete.
- commit: `51fb0ca`

## Cycle 4: U72 generator output has a token referenced by ≥100 other tokens

- test: `apps/web-app/scripts/generate-large-fixture.test.ts::generateLargeFixture output has a token referenced by at least 100 other tokens` (new)
- red: `pnpm exec vitest run apps/web-app/scripts/generate-large-fixture.test.ts -t "referenced by at least 100 other tokens"`
  -> `AssertionError: most-referenced token has 0 referrers, expected >= 100`
- green: `apps/web-app/scripts/generate-large-fixture.ts` — designate a `HUB_PATH`
  (`group-0.sub-0.token-0`) and point the first `HUB_REFERRERS` (130) non-hub leaves
  at it via `$value: "{group-0.sub-0.token-0}"`; the rest keep a literal dimension.
  Referrer choice is leaf-index based, so U67 determinism is unaffected.
  Full suite `pnpm exec vitest run` -> 108 files, 495 passed, 0 failed (~21s)
- refactor: none needed — added a `referrerCounts` test helper
- commit: `56ecbf9`

## Cycle 5: U73 first 20 tokens cover every editable dispatch path

- test: `apps/web-app/scripts/generate-large-fixture.test.ts::generateLargeFixture puts one token of every editable dispatch path in the first 20` (new; adds a `dispatchPathOf` classifier mirroring TreeTokenNode's editor dispatch — `resolveBuiltInContract` + `validateTokenValue`)
- red: `pnpm exec vitest run apps/web-app/scripts/generate-large-fixture.test.ts -t "every editable dispatch path in the first 20"`
  -> `AssertionError: no "color" token in the first 20 (saw: invalid, reference)`
  (the classifier also revealed the bulk `$value: "42px"` dimension strings classify
  as `invalid` — they aren't valid for the dimension contract, which wants
  `{ value, unit }` — see U75 below)
- green: `apps/web-app/scripts/generate-large-fixture.ts` — prepend a `_showcase`
  group with one token per path: `color` (`"#3366cc"`), `dimension`
  (`{ value: 8, unit: "px" }`), `reference` (`{HUB_PATH}`), `exotic`
  (`$type: "cubicBezier"` — no built-in contract → fallback), `broken`
  (`$type: "dimension"`, `$value: "definitely-not-a-dimension"` → invalid).
  Full suite `pnpm exec vitest run` -> 108 files, 496 passed, 0 failed (~22s)
- refactor: none needed
- notes: appended **U75** to the list — the ~2,000 bulk leaves currently hold
  `"42px"` strings, invalid for the dimension contract, so they'd all render the
  error editor rather than the real one. A1/A3 need editable bulk rows; U75 covers
  making them valid `{ value, unit }` objects (the `_showcase` `exotic`/`broken`
  tokens stay deliberately invalid). Not fixed this cycle (one behaviour per cycle).
- commit: `<pending>`
