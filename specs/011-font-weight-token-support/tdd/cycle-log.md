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

## Cycle 1: U1 accepts the integer lower boundary, 1

- test: `packages/token-core/src/font-weight.test.ts::accepts the integer lower
  boundary, 1` (new)
- red: `node --test --test-name-pattern "accepts the integer lower boundary, 1"
  src/font-weight.test.ts` (run from `packages/token-core/`) ->
  `Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../packages/token-core/src/font-weight.ts'` (module didn't exist yet —
  unresolved-symbol red per playbook Step 3)
- green: created `packages/token-core/src/font-weight.ts` with
  `FontWeightValueSchema = z.number().int().min(1).max(1000)` (numeric branch
  only — obvious-implementation move, smallest correct shape for this one
  boundary). Re-ran the single test -> pass. Full package suite:
  `pnpm --filter @dtcg-editor/token-core test` -> 102 passed, 0 failed (was 101)
- refactor: none needed — new module is 8 lines
- commit: `cfa343d` (also includes the new package's structural scaffold —
  package.json/tsconfig/vitest.setup.ts/vitest-a11y-tags.ts/css-modules.d.ts/
  vitest-env.d.ts and the `vitest.config.mts` registration — all non-behavioral
  setup from `tasks.md` T001/T003, bundled into this commit rather than left
  uncommitted)

## Cycle 2: U2 accepts the integer upper boundary, 1000

- test: `packages/token-core/src/font-weight.test.ts::accepts the integer upper
  boundary, 1000` (new)
- red: passed on first run against the U1 implementation (`min(1).max(1000)`
  already covers 1000). Per playbook Step 3, applied the deliberate-mutant
  check: changed `.max(1000)` to `.max(999)`, re-ran
  `node --test --test-name-pattern "accepts the integer upper boundary, 1000"
  src/font-weight.test.ts` -> `AssertionError: false !== true` (1 failed) — test
  is not vacuous. Restored `.max(1000)`.
- green: already green (no implementation change needed beyond the mutant
  restore)
- refactor: none
- commit: `2f9c9db` (bundled with cycles 2-9, see below)

## Cycle 3: U3 accepts a mid-range integer, 400

- test: `...::accepts a mid-range integer, 400` (new)
- red: passed on first run. Deliberate mutant: replaced the schema body with
  `z.union([z.literal(1), z.literal(1000)])`, re-ran the single test ->
  `AssertionError: false !== true` (1 failed). Restored
  `z.number().int().min(1).max(1000)`.
- green: already green
- refactor: none

## Cycle 4: U5 rejects 0, just below the lower boundary

- test: `...::rejects 0, just below the lower boundary` (new)
- red: passed on first run. Deliberate mutant: `.min(1)` -> `.min(0)`, re-ran
  -> `1 failed` (assertion diff, test id printed under failing tests).
  Restored `.min(1)`.
- green: already green
- refactor: none

## Cycle 5: U6 rejects 1001, just above the upper boundary

- test: `...::rejects 1001, just above the upper boundary` (new)
- red: passed on first run. Deliberate mutant: `.max(1000)` -> `.max(1001)`,
  re-ran -> `1 failed`. Restored `.max(1000)`.
- green: already green
- refactor: none

## Cycle 6: U7 rejects a non-integer number, 400.5

- test: `...::rejects a non-integer number, 400.5` (new)
- red: passed on first run. Deliberate mutant: removed `.int()`
  (`z.number().min(1).max(1000)`), re-ran -> `1 failed`. Restored `.int()`.
- green: already green
- refactor: none

## Cycle 7: U9 rejects a non-string/non-number shape, an object

- test: `...::rejects a non-string/non-number shape, an object` (new)
- red: passed on first run. Deliberate mutant: schema body replaced with
  `z.any()`, re-ran -> `1 failed`. Restored the numeric schema.
- green: already green
- refactor: none

## Cycle 8: U4 accepts every one of the 18 documented keyword aliases

- test: `...::accepts every one of the 18 documented keyword aliases` (new)
- red: `node --test --test-name-pattern "accepts every one of the 18
  documented keyword aliases" src/font-weight.test.ts` ->
  `AssertionError [ERR_ASSERTION]: expected "thin" to be accepted` (1 failed)
  — genuine red, the alias branch did not exist yet
- green: implemented `FontWeightValueSchema` as
  `z.union([z.number().int().min(1).max(1000), z.enum(FONT_WEIGHT_ALIASES)])`
  with the 18-alias `FONT_WEIGHT_ALIASES` const. Re-ran the single test ->
  pass. Full file: `node --test src/font-weight.test.ts` -> 8 passed, 0 failed
- refactor: none needed

## Cycle 9: U8 rejects an unrecognized string, extra-bold-ish

- test: `...::rejects an unrecognized string, extra-bold-ish` (new)
- red: passed on first run (the `z.enum` from cycle 8 is already exclusive).
  Deliberate mutant: alias branch widened to `z.string()`, re-ran -> `1
  failed`. Restored `z.enum(FONT_WEIGHT_ALIASES)`.
- green: already green. Full package suite:
  `pnpm --filter @dtcg-editor/token-core test` -> 110 passed, 0 failed (was
  101 at baseline + 9 new = 110). Also exported `FontWeightValueSchema`/
  `FontWeightValue` from `packages/token-core/src/index.ts` (T006, structural)
  and confirmed `pnpm --filter @dtcg-editor/token-core build` is clean.
- refactor: none needed — the module is 34 lines, one schema, one exported type
- commit: `2f9c9db` (cycles 2-9 plus the index.ts export, one commit — each
  cycle's red/green evidence is individually recorded above per Hard Rule 3;
  bundled into one commit because every one of these cycles touches the same
  two files and each mutant-check "red" was a temporary, immediately-reverted
  local edit rather than a distinct persisted state worth its own commit)
