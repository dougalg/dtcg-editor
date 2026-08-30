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
- commit: `f1ca163`

## Cycle 6: U74 fixture is written through an injected file-writer

- test: `apps/web-app/scripts/generate-large-fixture.test.ts::writeLargeFixture serializes the pure output through an injected writer` (new)
- red: `pnpm exec vitest run apps/web-app/scripts/generate-large-fixture.test.ts -t "serializes the pure output through an injected writer"`
  -> `TypeError: writeLargeFixture is not a function`
- green: `apps/web-app/scripts/generate-large-fixture.ts` — add
  `writeLargeFixture({ seed, outPath, writeFile })` that serializes
  `generateLargeFixture(...)` and hands it to the injected `writeFile`; no `fs`
  import in the module. Full suite `pnpm exec vitest run` -> 108 files, 497 passed,
  0 failed (~22s)
- refactor: none needed — `WriteLargeFixtureOptions extends GenerateLargeFixtureOptions`
- notes: the CLI entrypoint binding `writeFile` to real `fs.writeFileSync` is
  non-behavioural scaffolding left for T002 / `/speckit-implement`.
- commit: `5a29c63`

## Cycle 7: U75 bulk generated tokens are valid for their declared $type

- test: `apps/web-app/scripts/generate-large-fixture.test.ts::every non-showcase generated token holds a value valid for its declared $type` (new)
- red: `pnpm exec vitest run apps/web-app/scripts/generate-large-fixture.test.ts -t "valid for its declared"`
  -> `AssertionError: group-0.sub-0.token-0 classified as "invalid" — bulk rows must drive a real editor`
- green: `apps/web-app/scripts/generate-large-fixture.ts` — bulk literal leaves now
  emit `$value: { value: <n>, unit: "px" }` (valid for the dimension contract)
  instead of the `"<n>px"` string. Full suite `pnpm exec vitest run` -> 108 files,
  498 passed, 0 failed (~21s)
- refactor: none needed
- notes: **T001 complete** — all seven generator behaviours (U67, U68, U69, U72,
  U73, U74, U75) DONE; T001 ticked in tasks.md. The `_showcase` `exotic`/`broken`
  tokens stay deliberately invalid (they exercise the fallback + error dispatch
  paths for U73 / A3).
- commit: `<pending>`

## Cycle 8: U1 StagedEditsStore read methods are bound to the instance

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::StagedEditsStore read methods are bound and callable when destructured off the instance` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts`
  -> minimal stub with prototype methods -> `TypeError: Cannot read properties of undefined (reading '#tree')` when `getTree` is called detached from the instance
- green: `apps/web-app/lib/tokens/staged-edits-store.ts` (new) — `subscribe` / `getTree` /
  `getHasPending` as bound arrow-fn class fields, not prototype methods, so
  `useSyncExternalStore(store.subscribe, () => store.getFields(key))` can hold bare
  references (INV-2 / INV-19). Full suite `pnpm exec vitest run` -> 109 files, 499 passed (~25s)
- refactor: none needed
- commit: `<pending>`

## Cycle 9: U2 getFields returns cached base fields for a token

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::getFields returns a token's base fields, and the same object on repeated reads` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "getFields returns a token's base fields"`
  -> `TypeError: store.getFields is not a function`
- green: `apps/web-app/lib/tokens/staged-edits-store.ts` — add `PathKey` / `EditableFields`
  types, build `#index: Map<PathKey, PlainDtcgNode>` at construction, and
  `getFields(key)` returning `{ name, value, description, type? }` behind a
  `#fieldsCache` so repeated reads are reference-stable (INV-3). Base-only for now;
  the pending overlay lands with `commit` (U4). Full suite `pnpm exec vitest run`
  -> 109 files, 500 passed (~23s)
- refactor: none needed
- commit: `<pending>`

## Cycle 10: U3 commit is surgical about the field cache

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit to one token leaves getFields identity unchanged for an untouched token` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "leaves getFields identity unchanged for an untouched token"`
  -> `TypeError: store.commit is not a function`
- green: `apps/web-app/lib/tokens/staged-edits-store.ts` — add `#pending: Map<PathKey, ClientEdit>`
  and `commit(key, draft)` that stages the draft and invalidates only `#fieldsCache[key]`.
  Deliberate-mutant check: swapping `#fieldsCache.delete(key)` for `.clear()` ->
  `AssertionError: Values have same structure but are not reference-equal` (test is
  not vacuous). Restored. Full suite `pnpm exec vitest run` -> 109 files, 501 passed (~22s)
- refactor: none needed
- notes: `commit` has no validation yet (fakes `return true`) — U4/U5 force it. U3's
  list wording narrowed to `getFields` only; `getError` / `getResolvedPreview` identity
  fold in when those methods exist (U16 / US3).
- commit: `<pending>`

## Cycle 11: U4 commit overlays the drafted value on getFields

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit with a valid value overlays the drafted value on getFields` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "overlays the drafted value on getFields"`
  -> `AssertionError: Expected values to be strictly deep-equal: value: 4 (expected 8)` —
  getFields was base-only, ignoring `#pending`
- green: `getFields` now merges `#pending[key]` over the base node
- refactor: extracted the base⊕pending merge into a module-level `mergeFields(key, node, pending)`
  (pure) — suite unchanged, re-run green (502). **Deviation:** this structural change
  rode in the same commit as the behaviour change rather than its own commit
  (playbook cadence prefers separate); it is a ~20-line pure extraction with the suite
  untouched. Full suite `pnpm exec vitest run` -> 109 files, 502 passed (~21s)
- notes: `commit` still returns `true` unconditionally — U5 wires `validateTokenValue`
  and the invalid path; U6 adds the unchanged-value boundary.
- commit: `<pending>`

## Cycle 12: U5 commit rejects an invalid draft

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit with an invalid value is rejected: returns false, stages nothing, records an error` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "invalid value is rejected"`
  -> `AssertionError: true !== false` — `commit` staged the bad value and returned `true`
- green: `apps/web-app/lib/tokens/staged-edits-store.ts` — wire `validateTokenValue` +
  `resolveBuiltInContract` (both existing) into `commit` via a private
  `#validateDraftValue`; on failure set `#errors[key] = { name: undefined, value: msg }`,
  skip staging, return `false`. Add `#errors` map + `getError(key)`. Full suite
  `pnpm exec vitest run` -> 109 files, 503 passed (~21s)
- refactor: none needed
- notes: `commit` clears `#errors[key]` on the success path; a draft with no `value`
  key, an untyped token, or an unregistered `$type` skips value validation (returns
  `undefined` from `#validateDraftValue`). Rename-collision validation is U8.
- commit: `<pending>`

## Cycle 13: U9 getHasPending reflects staged edits

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::getHasPending reflects whether any edit is staged` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "getHasPending reflects whether any edit is staged"`
  -> `AssertionError: false !== true` (getHasPending was hardcoded `false`)
- green: `getHasPending = () => this.#pending.size > 0` (INV-4). Full suite -> 109 files, 504 passed (~21s)
- refactor: none needed
- notes: taken ahead of list order — U6 (unchanged-value boundary) needs a real
  `getHasPending` to observe "nothing staged". `discard` / `save` sides of the
  boundary come with those cycles.
- commit: `<pending>`

## Cycle 14: U6 commit with an unchanged value stages nothing

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit with the token's current value stages nothing` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "current value stages nothing"`
  -> `AssertionError: true !== false` — `getHasPending()` was `true` after committing
  the token's own current value
- green: `apps/web-app/lib/tokens/staged-edits-store.ts` — add `sameValue` (JSON-equality,
  fine for plain-JSON DTCG values) and `changedFields(draft, current)`; `commit` now
  stages only the fields that differ from the current effective value, and skips
  `#pending.set` entirely when nothing changed. This also delivers U4's "stages only
  the changed fields". Full suite `pnpm exec vitest run` -> 109 files, 505 passed (~21s)
- refactor: none needed
- notes: the revert-an-existing-pending-back-to-base case (draft matches base while a
  pending edit exists for that field) is not yet handled — deferred; `discard` (U15)
  is the clean "drop the pending" path.
- commit: `<pending>`

## Cycle 15: U7 successive commits accumulate into one staged edit

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::successive commits to one key accumulate into a single staged edit` (new)
- red: passes with the cycle-14 code (the `...existing` spread in `commit` already
  accumulates). Deliberate-mutant check: dropping `...existing` from `#pending.set`
  -> `AssertionError: Expected values to be strictly equal` on `fields.description`
  (second commit clobbered the first). Restored.
- green: no production change. Full suite `pnpm exec vitest run` -> 109 files, 506 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 16: U8 commit rejects a colliding rename

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit renaming a token onto a sibling's name is rejected with a name error` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "renaming a token onto a sibling"`
  -> `AssertionError: true !== false` — `commit` staged the colliding rename
- green: `apps/web-app/lib/tokens/staged-edits-store.ts` — add `#validateDraftName`
  reusing `findSiblings` + `checkRenameAvailable` from `edit-state.ts`; `commit` now
  computes `nameError` and `valueError` together and rejects (setting
  `#errors[key] = { name, value }`, staging nothing) if either fails. Full suite
  `pnpm exec vitest run` -> 109 files, 507 passed (~21s)
- refactor: none needed — `#validateDraftName` mirrors `#validateDraftValue`
- commit: `<pending>`

## Cycle 17: U10 getEdits returns a fresh array

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::getEdits returns a fresh array of the staged edits on each call` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "getEdits returns a fresh array"`
  -> `TypeError: store.getEdits is not a function`
- green: `getEdits = () => Array.from(this.#pending.values())` — fresh array, imperative
  use only (for `save()`), never a subscribed snapshot (INV-3). Full suite -> 109 files, 508 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 18: U11 save folds the overlay into the base tree once

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::save applies the staged edits into the base tree once, then clears the overlay` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "save applies the staged edits"`
  -> `TypeError: store.save is not a function`
- green: `apps/web-app/lib/tokens/staged-edits-store.ts` — store the injected `#save`;
  `save()` awaits `#save(getEdits())` and, on success, `#tree = applyEditsToPlainNode(#tree, edits)`
  (once), clears `#pending`/`#errors`, rebuilds the index, clears `#fieldsCache` (INV-7).
- refactor: extracted the index rebuild (constructor + save) into `#rebuildIndex()`;
  suite re-run green. Full suite `pnpm exec vitest run` -> 109 files, 509 passed (~21s)
- notes: subscriber notification (`#emit` on `commit`/`save`) is not wired yet —
  `subscribe` is still the U1 no-op stub; appended **U76** to the list for it.
- commit: `<pending>`

## Cycle 19: U12 only save changes the tree reference

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit leaves getTree identity unchanged; only save rebuilds the tree` (new)
- red: passes with the cycle-18 code (commit never touches `#tree`). Deliberate-mutant
  check: adding `this.#tree = applyEditsToPlainNode(this.#tree, [...])` into `commit` ->
  `AssertionError: Values have same structure but are not reference-equal` (getTree
  changed after commit). Restored.
- green: no production change. Full suite `pnpm exec vitest run` -> 109 files, 510 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 20: U13 a failed save leaves state intact

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::a failed save leaves the overlay and tree untouched and returns false` (new)
- red: passes with the cycle-18 `if (ok)` guard. Deliberate-mutant check: changing
  `if (ok)` to `if (true)` -> `AssertionError: Expected values to be strictly equal`
  (a failed save cleared pending / rebuilt the tree). Restored.
- green: no production change. Full suite `pnpm exec vitest run` -> 109 files, 511 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 21: U14 store does no I/O of its own

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::save() has no I/O fallback: it propagates whatever the injected save does` (new)
- red: passes with the cycle-18 code (`#save` is awaited directly). Deliberate-mutant
  check: wrapping `await this.#save(edits)` in `try { } catch { ok = false }` ->
  `AssertionError: Missing expected rejection` (the store swallowed the injected
  failure). Restored.
- green: no production change. Also confirmed `grep -c "useSaveTokenEdits|route|fetch("
  staged-edits-store.ts` -> 0 (no fetcher import; INV-5 / Principle VI). Full suite
  `pnpm exec vitest run` -> 109 files, 512 passed (~21s)
- refactor: none needed
- notes: the constructor's `save` is a required (non-optional) option, so "constructed
  without an injected save" is a compile error, not a runtime path — the behaviour is
  "`#save` is the only save path", tested via error propagation.
- commit: `<pending>`

## Cycle 22: U15 discard drops one key's overlay

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::discard drops one key's pending and error, leaving other keys untouched` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "discard drops one key"`
  -> `TypeError: store.discard is not a function`
- green: `discard(key)` deletes `#pending[key]` / `#errors[key]` / `#fieldsCache[key]`
  only; other keys' `getFields` reference identity is preserved (INV-1). Full suite
  `pnpm exec vitest run` -> 109 files, 513 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 23: U16 reportError records a component-side error

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::reportError records a component-supplied error without staging anything` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "reportError records"`
  -> `TypeError: store.reportError is not a function`
- green: `reportError(key, errors)` sets `#errors[key]` and nothing else (no `#pending`
  touch); `getHasPending()` stays false. Full suite `pnpm exec vitest run` -> 109 files,
  514 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 24: U17 validate is a pure candidate check

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::validate reports errors for a candidate draft without writing anything` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "validate reports errors"`
  -> `TypeError: store.validate is not a function`
- green: `validate(key, draft)` returns `{ name: #validateDraftName(...), value:
  #validateDraftValue(...) }` with no writes.
- refactor: `commit` now delegates to `this.validate(key, draft)` instead of calling
  the two private validators directly — suite re-run green (515).
- full suite `pnpm exec vitest run` -> 109 files, 515 passed (~21s)
- commit: `<pending>`

## Cycle 25: U21 + U76 subscriber notification

- **U21** (`getServerSnapshot`-equivalent stable at construction) — already covered by
  U2's test (`getFields ... same object on repeated reads`), which reads identity at
  construction before any commit. Marked DONE, no new cycle.
- **U76** — the store notifies subscribers after commit / save.
  - test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::the store notifies subscribers after a state-changing commit and after save` (new)
  - red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "notifies subscribers after a state-changing commit"`
    -> `AssertionError: Expected values to be strictly equal` (`notifications` stayed 0 —
    `subscribe` was the U1 no-op stub)
  - green: `#listeners: Set<() => void>`; real `subscribe` (add + return delete); private
    `#emit()`; call it from `commit` (both the reject and stage paths) and from
    `save()` on success. `unsubscribe()` removes the listener. Full suite
    `pnpm exec vitest run` -> 109 files, 516 passed (~21s)
  - refactor: none needed
  - notes: a no-op successful `commit` also `#emit()`s (list text says "changed state");
    harmless — `useSyncExternalStore` compares snapshots, which are unchanged, so no
    re-render. Tightening to emit-only-if-changed is not worth a cycle. `discard` /
    `reportError` do NOT emit yet — appended **U77** for that.
- commit: `<pending>`

## Cycle 26: U77 discard and reportError notify subscribers

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::discard and reportError also notify subscribers` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "discard and reportError also notify"`
  -> `AssertionError: Expected values to be strictly equal` (notifications stayed 0)
- green: add `this.#emit()` to `discard` and `reportError`. Full suite
  `pnpm exec vitest run` -> 109 files, 517 passed (~21s)
- refactor: none needed
- notes: **StagedEditsStore core is complete** (minus the `#previewCache` — U18–U20,
  US3 phase). T009 and T010 ticked in tasks.md (all their `[U#]` markers DONE). 20
  store unit tests.
- commit: `<pending>`

## Cycle 27: U22 resolvePreview returns a literal value

- test: `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview returns a literal value with an empty via chain` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/preview-resolver.test.ts`
  -> `Failed to resolve import "./preview-resolver.ts"` (module absent)
- green: `apps/web-app/lib/tokens/preview-resolver.ts` (new) — `ResolvedValue` type +
  `resolvePreview(key, getEffectiveNode, serverPreview)`; for a non-reference value it
  returns `{ kind: "value", value, via: [] }` (reference following stubbed for U23-U26).
  Full suite `pnpm exec vitest run` -> 110 files, 518 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 28: U23 resolvePreview follows a multi-hop chain

- test: `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview follows a multi-hop in-file chain to the final value` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/preview-resolver.test.ts -t "multi-hop in-file chain"`
  -> `AssertionError: kind: 'unresolved' (expected 'value')` — the reference branch was
  a stub
- green: `resolvePreview` delegates to a recursive `resolveFrom(key, ..., via)` that, on
  a `{x}` value, recurses on `x` and appends it to `via`. Full suite
  `pnpm exec vitest run` -> 110 files, 519 passed (~21s)
- refactor: none needed — `resolveFrom` is the recursion carrier
- notes: plain recursion for now; the `visited` cycle guard is U26.
- commit: `<pending>`
