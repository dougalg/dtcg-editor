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

## Cycle 10: U10 renders the current value with range attributes

- test: `FontWeightEditor.test.tsx::renders the current value in a number
  input with the DTCG range attributes` (new)
- red: `pnpm exec vitest run packages/token-editor-font-weight/src/components/
  FontWeightEditor/FontWeightEditor.test.tsx` -> `Error: Failed to resolve
  import "./FontWeightEditor.tsx"` (component didn't exist — unresolved-symbol
  red per playbook Step 3)
- green: created `FontWeightEditor.tsx` (labeled `<input type="number" min=1
  max=1000 step=1>`, no `onChange` wiring yet) and its `.module.css`. Re-ran
  -> 1 passed
- refactor: none
- commit: `0b16c17` (see cycle 14's entry for the full commit boundary)

## Cycle 11: U11 editing the numeric value calls onChange with the updated integer

- test: `...::editing the numeric value calls onChange with the updated
  integer` (new)
- red: `pnpm exec vitest run .../FontWeightEditor.test.tsx -t "editing the
  numeric value calls onChange"` -> `AssertionError: expected "vi.fn()" to be
  called with arguments: [ 700 ]` / `Number of calls: 0` — genuine red, no
  `onChange` handler existed
- green: added `handleValueChange` (parses `Number(event.target.value)`,
  guards `!Number.isInteger(next) || next < 1 || next > 1000`, else calls
  `onChange(next)`) and wired it to the input's `onChange`. Re-ran -> pass
- refactor: none

## Cycle 12: U12 entering a non-numeric/non-integer value does not call onChange

- test: `...::entering a non-numeric value does not call onChange` and
  `...::entering a non-integer numeric value does not call onChange` (new)
- red/verification: the "abc" case passed on first run (jsdom reports an
  empty string for non-numeric text in a `type="number"` input, which the
  `< 1` branch already catches) — not a meaningful pin on its own, kept as
  documentation matching `DimensionEditor`'s analogous test. The "400.5" case
  is the real pin: passed on first run against the guard written in cycle 11,
  so applied the deliberate-mutant check — removed `!Number.isInteger(next)
  ||` from the guard, re-ran `-t "entering a non-integer numeric value does
  not call onChange"` -> `AssertionError: expected "vi.fn()" to not be called
  at all, but actually been called 1 times` with `[400.5]` — confirms the
  test is not vacuous. Restored the guard.
- green: already green
- refactor: none

## Cycle 13: U13 entering an out-of-range integer does not call onChange

- test: `...::entering an out-of-range integer does not call onChange` (new,
  1001 and 0)
- red/verification: passed on first run against cycle 11's guard. Deliberate
  mutant: narrowed the guard to `!Number.isInteger(next)` only (dropped the
  range check), re-ran -> `AssertionError: ... actually been called 2 times`
  with `[1001]` then `[0]` — confirms the range clause is load-bearing.
  Restored the full guard.
- green: already green. Full package suite:
  `pnpm exec vitest run packages/token-editor-font-weight` -> 5 unit tests
  passed (plus the a11y test below), 0 failed
- refactor: none

## Cycle 14: U14 FontWeightEditor has no WCAG 2.2 AA violations

- test: `FontWeightEditor.a11y.test.tsx::has no WCAG 2.2 AA violations` (new)
- red/verification: passed on first run against the already-built,
  already-labeled component (a valid outcome per Step 3's "if it already
  exists, mark covered" — but this is a *new* test for an existing
  implementation within the same overall step, not a pre-existing test, so
  verified with a deliberate mutant per the same rule): changed the wrapping
  `<label>` to a plain `<div>` (breaking the input's accessible-name
  association), re-ran -> axe reported a `label` rule violation (`target:
  ["input"]`, tags include `wcag2a`/`wcag412`). Confirms the test catches a
  real regression. Restored `<label>`.
- green: already green. Full package suite (unit + a11y):
  `pnpm exec vitest run packages/token-editor-font-weight` -> 2 files, 6
  tests passed, 0 failed
- refactor: none needed — component is 33 lines, one responsibility
- commit: `0b16c17` (cycles 10-14: `FontWeightEditor.tsx`,
  `FontWeightEditor.module.css`, both test files, plus the non-behavioral
  `token-type.ts`/`index.ts` wiring from `tasks.md` T012/T013, bundled per
  the same one-commit-per-logical-unit approach as cycle 2-9's entry)

## Cycle 15: A1/U23 BUILT_IN_TOKEN_TYPES includes fontWeight

- test: extended the existing assertion in
  `apps/web-app/lib/token-editors/built-in.test.ts` from `["dimension",
  "color"]` to `["dimension", "color", "fontWeight"]`
- red: `pnpm exec vitest run apps/web-app/lib/token-editors/built-in.test.ts
  -t "BUILT_IN_TOKEN_TYPES includes dimension, color, and fontWeight"` ->
  `AssertionError` diff showing `+ 'fontWeight'` missing from the received
  array — genuine red, `fontWeight` was not yet registered
- green: added `"@dtcg-editor/token-editor-font-weight": "workspace:*"` to
  `apps/web-app/package.json` (via `pnpm add`, then hand-corrected after
  `pnpm add` initially routed it through the strict pnpm catalog as
  `"catalog:"` with a stray `pnpm-workspace.yaml` catalog entry — removed
  that catalog entry and set the field to `"workspace:*"` directly, matching
  `dimension`/`color`'s existing pattern, then `pnpm install` to resync the
  lockfile), added `fontWeight`/`fontWeightTokenType` to
  `BUILT_IN_TOKEN_TYPES`/`builtInContractsByType` in `built-in.ts`. Re-ran the
  single test -> pass
- unexpected full-suite regression: `pnpm exec vitest run` afterward showed 2
  pre-existing tests in `lib/token-editors/define-config.test.ts` failing
  (`resolved.extensions.length` hardcoded to `2`/`3`, now `3`/`4` since a
  third built-in type is genuinely registered). Per the playbook's Step 4 ("a
  real regression, which you fix now") and Forbidden-Shortcuts #7 ("when code
  and test disagree, the specification decides which is wrong") — this
  feature's spec.md explicitly requires `fontWeight` to be a registered
  built-in type, so the count these two tests hardcoded is what's now wrong,
  not the code. Fixed as its own step: replaced both literals with
  `BUILT_IN_TOKEN_TYPES.length` / `BUILT_IN_TOKEN_TYPES.length + 1` (derived,
  so it can't go stale again — matching the existing AC-08 test's own
  "derived dynamically" technique in the same file). Re-ran
  `define-config.test.ts` -> 17 passed, 0 failed
- green (full suite): `pnpm exec vitest run` -> 144 files, 710 tests passed,
  0 failed (was 143/708 immediately after the regression, 142/704 at
  baseline: +6 from cycles 10-14's new component tests, +0 net from this
  cycle since it only added 1 new test and fixed 2 pre-existing ones back to
  green). Also confirmed `pnpm --filter @dtcg-editor/token-editor-font-weight
  build` and `pnpm --filter @dtcg-editor/web-app build` are both clean.
- refactor: none needed beyond the define-config.test.ts fix above
- commit: `19c4e35`
