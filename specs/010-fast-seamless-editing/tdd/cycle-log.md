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

## Cycle 29: U24 resolvePreview returns unresolved for a missing target

- test: `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview returns unresolved when a reference target is missing` (new)
- red: `AssertionError: kind: 'value', value: undefined (expected 'unresolved')` — the
  recursion hit a missing node and reported it as a literal `undefined`
- green: before recursing on a `{x}` hop, if `getEffectiveNode(x) === undefined` return
  `{ kind: "unresolved", ref: ref.raw }`. Full suite `pnpm exec vitest run` -> 110 files,
  520 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 30: U25 resolvePreview splices the server value for cross-file targets

- test: `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview splices in the server value for a target outside the file` (new)
- red: `AssertionError: Expected "actual" to be reference-equal ... kind: 'unresolved'` —
  a cross-file hop was reported unresolved instead of using `serverPreview`
- green: in the missing-node branch, `return serverPreview.get(targetKey) ?? { kind:
  "unresolved", ref: ref.raw }` (INV-18). Full suite `pnpm exec vitest run` -> 110 files,
  521 passed (~21s); lint clean (`serverPreview` now used)
- refactor: none needed
- commit: `<pending>`

## Cycle 31: U26 resolvePreview is cycle-safe

- test: `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview returns a cycle marker for a reference loop, without looping` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/preview-resolver.test.ts -t "cycle marker for a reference loop"`
  -> `TypeError: undefined is not a function` from a deeply-repeated `resolveFrom` stack
  (`a -> {b} -> {a} -> ...` recursed until the stack gave out) — i.e. it did not return
  in bounded time
- green: thread a `visited: Set<PathKey>` through `resolveFrom`; before recursing on a
  `{x}` hop, `visited.has(x)` -> `{ kind: "cycle", ref: ref.raw }` (INV-16). Full suite
  `pnpm exec vitest run` -> 110 files, 522 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 32: U27 resolvePreview has no stale carry-over

- test: `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview reflects the current effective value each call, with no stale carry-over` (new)
- red: passes with the current pure resolver (no cache). Deliberate-mutant check: adding
  a module-level `Map` result cache keyed by `key` -> `AssertionError: Expected values
  to be strictly deep-equal` (second call, with `a` now `{x}`, returned the cached
  literal). Restored.
- green: no production change — the resolver reads `getEffectiveNode` fresh every call
  (C-LR-4: becoming / ceasing to be a reference). Full suite `pnpm exec vitest run`
  -> 110 files, 523 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 33: U28 buildReverseDeps builds transitive in-file referrer sets

- test: `apps/web-app/lib/tokens/preview-resolver.test.ts::buildReverseDeps maps each target to its transitive in-file referrers` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/preview-resolver.test.ts -t "transitive in-file referrers"`
  -> `TypeError: buildReverseDeps is not a function`
- green: `apps/web-app/lib/tokens/preview-resolver.ts` — `collectRefEdges` walks the tree
  gathering `key -> targetKey` whole-value edges + the set of in-file keys;
  `buildReverseDeps` walks each referrer's chain (stopping at a cross-file key or a
  repeat) and adds the referrer to `reverse[each in-file key on the chain]`. Full suite
  `pnpm exec vitest run` -> 110 files, 524 passed (~21s)
- refactor: none needed — the `seen` set in the chain walk also guards cycles (U29)
- commit: `<pending>`

## Cycle 34: U29 buildReverseDeps terminates on cycles

- test: `apps/web-app/lib/tokens/preview-resolver.test.ts::buildReverseDeps terminates on a cyclic reference graph` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/preview-resolver.test.ts -t "terminates on a cyclic reference graph"`
  -> `× buildReverseDeps terminates on a cyclic reference graph` (assertion failure) — the
  chain wrapped `a->{b}->{a}` and listed each token as its own referrer
  (`reverse.get("a") == {a, b}`, expected `{b}`)
- green: skip `set.add(referrer)` when `target === referrer`. The `seen` guard already
  bounded the loop; this fixes the *contents* for a cycle. Full suite
  `pnpm exec vitest run` -> 110 files, 525 passed (~21s)
- refactor: none needed
- commit: `<pending>`

## Cycle 35: U30 resolvePreview is total (boundary-sampled)

- test: `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview is total: every effective-node value yields a ResolvedValue kind, never throws` (new) — 11 boundary values (`undefined`, `null`, `""`, `"{}"`, `"{ }"`, `"{dangling.path}"`, `"{t}"` self-ref, a nested object, `0`, `NaN`, `"a {b} c"`)
- red: passes with the resolver as built (U22-U26 made it total by construction).
  Deliberate-mutant check: `return value as any` in the literal branch (instead of
  `{ kind: "value", ... }`) -> `AssertionError: kind was "undefined" ...`. Restored.
- green: no production change. Full suite `pnpm exec vitest run` -> 110 files, 526 passed (~21s)
- refactor: none needed
- notes: **preview-resolver.ts complete** — U22-U30 all DONE (`resolvePreview` +
  `buildReverseDeps`). Ticked T038 / T039. No `fast-check` in the profile, so totality
  is sampled at boundaries, not proven.
- commit: `<pending>`

## Note on `commit:` fields

Entries for cycles 8–35 carry `commit: <pending>`. Each cycle is exactly one
commit, in order; the commit that added a cycle's log entry *is* that cycle's
commit (its message names the cycle). Recover the mapping with
`git log --reverse -p specs/010-fast-seamless-editing/tdd/cycle-log.md`. From
cycle 36 on, the field reads "this entry's commit" for the same meaning. The
append-only evidence (red command + output, green change, suite counts) is intact
and unaltered.

## Cycle 36: U18 store.getResolvedPreview over the committed overlay

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::getResolvedPreview resolves a reference over the committed overlay, not the base` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "getResolvedPreview resolves a reference over the committed overlay"`
  -> `TypeError: store.getResolvedPreview is not a function`
- green: `apps/web-app/lib/tokens/staged-edits-store.ts` — add `#previewCache`,
  `#reverseDeps` (built by `buildReverseDeps` in `#rebuildIndex`), `#serverPreview`
  (empty Map for now), a private `#getEffectiveNode(key)` = base node ⊕ committed
  pending value (never a draft, INV-8), and `getResolvedPreview(key)` delegating to
  `resolvePreview` behind `#previewCache`. `commit` / `discard` / `save` clear
  `#previewCache` wholesale for now. Full suite `pnpm exec vitest run` -> 110 files,
  527 passed (~21s)
- refactor: none needed
- notes: `#reverseDeps` built but unused (biome warning) — U19 uses it to scope
  invalidation. `#serverPreview` empty — real `TokenReferenceView` conversion is
  appended as U78.
- commit: this entry's commit

## Cycle 37: U19 commit scopes preview-cache invalidation

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit invalidates the preview cache for only the edited key and its dependents` (new)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "invalidates the preview cache for only the edited key"`
  -> `AssertionError: Values have same structure but are not reference-equal` — an
  independent token's preview was recomputed because `commit` cleared the whole cache
- green: `#invalidatePreview(key)` deletes `#previewCache[key]` + every
  `#reverseDeps.get(key)` entry; `commit` calls it instead of `#previewCache.clear()`
  (INV-17). Full suite `pnpm exec vitest run` -> 110 files, 528 passed (~21s); lint
  clean (`#reverseDeps` now used)
- refactor: none needed — `discard`/`save` keep their whole-cache clear for now (safe,
  just less optimal)
- commit: this entry's commit

## Cycle 38: U20 getResolvedPreview cache lifecycle

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::getResolvedPreview is cached across reads; save clears the whole preview cache` (new)
- red: a first draft (commit `g.a` then check `g.b`) passed even with `save`'s
  `#previewCache.clear()` removed — `commit`'s scoped invalidation already covered that
  key. Rewrote to read an **unrelated, never-committed** token `g.y`, commit `g.x`
  (assert `g.y` still cached), then `save` (assert `g.y` rebuilt). Deliberate-mutant:
  removing `#previewCache.clear()` from `save` -> `AssertionError: Expected "actual"
  not to be reference-equal` (g.y stayed cached after save). Restored.
- green: no production change — `getResolvedPreview` already caches (cycle 36) and
  `save` already clears the whole cache (cycle 36). Full suite `pnpm exec vitest run`
  -> 110 files, 529 passed (~21s)
- refactor: none needed
- notes: **U18–U20 done — the store's preview subsystem is complete** (bar the real
  `TokenReferenceView` → `#serverPreview` conversion, tracked as U78).
- commit: this entry's commit

## Cycle 39: U31 useStagedEdits — one store per mount

- test: `apps/web-app/hooks/useStagedEdits.test.tsx::useStagedEdits makes one store per mount and keeps it across re-renders` (new — first React hook test, `renderHook` from `@testing-library/react`)
- red: `pnpm exec vitest run apps/web-app/hooks/useStagedEdits.test.tsx`
  -> `Failed to resolve import "./useStagedEdits.ts"` (module absent)
- green: `apps/web-app/hooks/useStagedEdits.ts` (new) — `useRef` lazily makes one
  `new StagedEditsStore(options)` per mount and returns it stably across re-renders
  (INV-5). Full suite `pnpm exec vitest run` -> 111 files, 530 passed (~21s)
- refactor: none needed
- commit: this entry's commit

## Cycle 40: U32 useStagedEdits threads the injected save

- test: `apps/web-app/hooks/useStagedEdits.test.tsx::useStagedEdits threads the injected save through to the store` (new)
- red: passes with cycle-39's `new StagedEditsStore(options)`. Deliberate-mutant:
  `new StagedEditsStore({ ...options, save: async () => true })` -> `AssertionError:
  expected undefined to deeply equal []` (the injected save was never called). Restored.
- green: no production change — the hook passes `options` (incl. `save`) straight to the
  constructor (Principle VI). Full suite `pnpm exec vitest run` -> 111 files, 531 passed (~21s)
- refactor: none needed
- notes: the "store module imports no fetcher" half of U32 is U14. The data-model's
  "default: useSaveTokenEdits's call" is satisfied by `TokenTree` injecting it
  explicitly (T015) rather than a hidden default in the hook.
- commit: this entry's commit

## Cycle 41: U33 useStagedEdits SSR smoke test

- test: `apps/web-app/hooks/useStagedEdits.test.tsx::useStagedEdits renders server-side (getServerSnapshot path) without throwing` (new — `renderToString` from `react-dom/server`)
- red: passes first run (the hook + store are pure JS, no browser globals).
  Mutant leverage is limited here — no meaningful small break makes a pure hook throw
  under `renderToString`. Recorded as a smoke test; the real `getServerSnapshot`
  assertion belongs with `useTokenSlice` (U36) which actually calls
  `useSyncExternalStore`.
- green: no production change. Full suite `pnpm exec vitest run` -> 111 files, 532 passed (~21s)
- refactor: none needed
- notes: U31 + U32 already cover the hook's real behaviour (per-mount instance,
  injected save). With U33 done, T011/T012 (`useStagedEdits` impl + tests) are complete.
- commit: this entry's commit

## Session-resume note (before Cycle 42): green-baseline repair

On resuming `/speckit-tdd-run all`, the `turbo run build` gate (`next build`
type-check, typescript `^7.0.2`) was red on already-committed feature code —
`pnpm exec vitest run` (esbuild, no type-check) had stayed green so the loop
never caught it:

- `staged-edits-store.ts` `changedFields` assigned to `readonly` members of a
  `Partial<EditableFields>` accumulator (4 errors) — switched the local to a
  mapped mutable type, return type unchanged.
- `generate-large-fixture.test.ts` indexed `writes[0]` under a stricter
  possibly-undefined check (2 errors) — destructure once + `assert.ok`.

Type-only, no behaviour change; vitest stayed 532. Committed as `ac890a5`
before Cycle 42 so the baseline is genuinely green (`pnpm build` 7/7 + vitest).

## Cycle 42: U34 useTokenSlice — token slice bound to key

- test: `apps/web-app/hooks/useTokenSlice.test.tsx::useTokenSlice returns the token's fields and error, with commit/discard bound to the key` (new)
- red: `pnpm exec vitest run apps/web-app/hooks/useTokenSlice.test.tsx`
  -> `AssertionError: expected undefined to deeply equal { name: 'x', ... }` at
  `hooks/useTokenSlice.test.tsx:57:32` (against a hollow stub returning
  `{ fields: undefined, error: undefined, commit: () => false, discard: () => {} }`).
- green: `apps/web-app/hooks/useTokenSlice.ts` (new) reads the store from
  `StagedEditsContext`, two `useSyncExternalStore` reads (`getFields`, `getError`),
  and returns `commit: (draft) => store.commit(key, draft)` / `discard: () =>
  store.discard(key)`. Full suite `pnpm exec vitest run` -> 112 files, 533 passed
  (~22s); `pnpm build` 7/7.
- refactor: none needed. The test's `group`/`dimensionToken` factories duplicate
  `staged-edits-store.test.ts`'s, which is the profile's sanctioned local-per-file
  convention, not shared-helper duplication.
- notes: added the `StagedEditsContext` seam to `useStagedEdits.ts` (a bare
  `createContext<StagedEditsStore | null>(null)`) — data-model §7 gives
  `useTokenSlice` the signature `(key) => …`, so the store must come from context.
  `TokenTree` provides it in U56 (T015). Inline getsnapshot closures for now; their
  stability is U36's behaviour.
- commit: this entry's commit

## Cycle 43: U35 useTokenSlice — unrelated commit does not disturb this slice

- test: `apps/web-app/hooks/useTokenSlice.test.tsx::a commit to an unrelated key leaves this slice's identity intact and does not re-render the consumer` (new)
- red: passes first run — `getFields` caching (cycle 37) plus `commit`'s scoped
  `#fieldsCache.delete(key)` already give `g.x` a stable snapshot across a
  `commit("g.y", …)`, so `useSyncExternalStore` sees `Object.is`-equal and never
  re-renders. Deliberate-mutant: `commit`'s success-path `#fieldsCache.delete(key)`
  -> `#fieldsCache.clear()` -> `pnpm exec vitest run apps/web-app/hooks/useTokenSlice.test.tsx`
  -> `expect(result.current.fields).toBe(fieldsBefore)` fails at
  `hooks/useTokenSlice.test.tsx:98:32` ("Received: serializes to the same string" —
  a fresh re-merged object). Restored.
- green: no production change. Full suite `pnpm exec vitest run` -> 112 files, 534
  passed (~23s); `pnpm build` tsc clean.
- refactor: none needed.
- notes: T013/T014 stay open — they carry `[U34] [U35] [U36]` and U36 is still
  PENDING.
- commit: this entry's commit

## Cycle 44: U36 useTokenSlice — subscription never thrashes

- test: `apps/web-app/hooks/useTokenSlice.test.tsx::subscribes to the store once and never re-subscribes as the consumer re-renders` (new)
- red: first attempt used `vi.spyOn(React, "useSyncExternalStore")` to assert
  getSnapshot-closure identity directly ->
  `TypeError: Cannot spy on export "useSyncExternalStore". Module namespace is not
  configurable in ESM`. Not a valid red (test-infra failure). Rewrote to the
  *observable* consequence of INV-19 — subscription thrash — by wrapping
  `store.subscribe` with a counter. That passes first run (the hook already passes
  the bound `store.subscribe`). Deliberate-mutant: pass `(l) => store.subscribe(l)`
  (fresh closure per render) for both reads ->
  `pnpm exec vitest run apps/web-app/hooks/useTokenSlice.test.tsx` ->
  `expect(subscribeCalls).toBe(afterMount)` fails `- 2 / + 6` at
  `hooks/useTokenSlice.test.tsx:124:25` (re-subscribes on every rerender). Restored.
- green: no behavioural change for the subscribe path.
- refactor: wrapped the two getsnapshot closures in `useCallback([store, key])`
  (INV-19: "stable getsnapshot closures / bound store methods") and passed the same
  closure as both client and server snapshot. A per-render closure would not
  re-subscribe (`subscribe` is the only effect dep) but churns the per-render
  snapshot comparison; closure identity itself has no independent runtime observable
  in jsdom (ESM namespace is unspyable), so it rides on this cycle's thrash test
  plus the refactor. Full suite `pnpm exec vitest run` -> 112 files, 535 passed
  (~23s); `pnpm build` tsc clean; biome clean.
- notes: appended **U36a** to the list — the deferred (cycle 41) real
  `getServerSnapshot` coverage: a `useTokenSlice` consumer under `renderToString`.
  T013/T014 still open until U36a lands.
- commit: this entry's commit

## Cycle 45: U36a useTokenSlice — renders under renderToString (getServerSnapshot)

- test: `apps/web-app/hooks/useTokenSlice.test.tsx::a useTokenSlice consumer renders under renderToString (getServerSnapshot path)` (new; `renderToString` from `react-dom/server`) — the real server-snapshot coverage deferred from cycle 41.
- red: first assertion (`toContain('{"value":1,"unit":"px"}')`) failed only on
  HTML-escaping (`&quot;`) — the render itself succeeded, so not a true red for the
  behaviour. Rewrote the probe to emit `<output>1px</output>` and assert that.
  Passes on the current impl (getFields/getError are already passed as the 3rd
  `useSyncExternalStore` arg). Deliberate-mutant: drop the 3rd arg from both reads
  -> `renderToString` throws
  `Missing getServerSnapshot, which is required for server-rendered content` (only
  the U36a test fails, 3 others pass). Restored from a backup copy.
- green: no production change. Full suite `pnpm exec vitest run` -> 112 files, 536
  passed (~30s under load); `pnpm build` tsc clean.
- refactor: none needed.
- notes: **U34–U36 + U36a all DONE — `useTokenSlice` is complete.** T013 and T014
  ticked (their `[U34] [U35] [U36]` markers are all satisfied).
- commit: this entry's commit

## Cycle 46: U37 useResolvedPreview — mirrors the store's preview snapshot

- test: `apps/web-app/hooks/useResolvedPreview.test.tsx::useResolvedPreview mirrors the store's preview for the key, and follows a dependency edit` (new)
- red: `pnpm exec vitest run apps/web-app/hooks/useResolvedPreview.test.tsx`
  -> `expect(result.current).toEqual(store.getResolvedPreview("g.b"))` fails at
  `hooks/useResolvedPreview.test.tsx:66:25` (hollow stub returned
  `{ kind: "unresolved", ref: "" }`).
- green: `apps/web-app/hooks/useResolvedPreview.ts` (new) reads the store from
  `StagedEditsContext` and does one `useSyncExternalStore` read of
  `getResolvedPreview(key)` with a `useCallback([store, key])` snapshot closure.
  Committing `g.a` flows into `g.b`'s preview (reverse-dep invalidation, U19);
  committing unrelated `g.c` leaves `g.b`'s preview reference-identical and does not
  re-render. Full suite `pnpm exec vitest run` -> 113 files, 537 passed (~21s);
  `pnpm build` tsc clean.
- refactor: none needed — mirrors the `useTokenSlice` context+snapshot shape; the
  local `group`/`dimensionToken` factories are the profile's per-file convention.
- notes: `useDeferredValue` wrapping is U38, next. T042 stays open until then.
- commit: this entry's commit

## Cycle 47: U38 useResolvedPreview — useDeferredValue wrapping

- test: `apps/web-app/hooks/useResolvedPreview.test.tsx::defers the preview update: the consumer first re-renders with the stale value, then the fresh one` (new)
- red: `pnpm exec vitest run apps/web-app/hooks/useResolvedPreview.test.tsx`
  -> `AssertionError: expected 1 to be greater than or equal to 2` at
  `hooks/useResolvedPreview.test.tsx:113:22` — without `useDeferredValue` a
  dependency commit produces exactly one consumer render (the fresh value).
- green: wrap the `useSyncExternalStore` read in `useDeferredValue` in
  `useResolvedPreview.ts`. The commit now splits into two consumer renders — stale
  `{value:4}` then fresh `{value:7}` — proving the preview update rides a later
  low-priority render (research §3, C-LR-8). Full suite `pnpm exec vitest run` ->
  113 files, 538 passed (~21s); `pnpm build` tsc clean.
- refactor: none needed.
- notes: **U37 + U38 done — `useResolvedPreview` is complete.** T042 ticked.
- commit: this entry's commit

## Cycle 48: U78 store — TokenReferenceView -> #serverPreview conversion

- test: `apps/web-app/lib/tokens/staged-edits-store.test.ts::resolves a cross-file reference hop through the server-computed preview (U78)` (new) — an in-file token `g.a` valued `{ext.x}` with `ext.x` outside the tree; a `TokenReferenceView` whose one outcome chain resolves to `{value:12,unit:"px"}`.
- red: `pnpm exec vitest run apps/web-app/lib/tokens/staged-edits-store.test.ts -t "cross-file reference hop"`
  -> `assert.deepEqual` at `lib/tokens/staged-edits-store.test.ts:489:9` — expected
  `{ kind: "value", value: { value: 12, unit: "px" }, via: [] }`, got
  `{ kind: "unresolved", ref: "{ext.x}" }` (`#serverPreview` was always empty).
- green: `staged-edits-store.ts` — new module fn `buildServerPreview(view)` walks
  `view.references`, keys each `reference.targetPath.join(".")` to a `ResolvedValue`
  from `outcomes[0].chain.outcome` (`resolved` -> value, `circular` -> cycle, else
  unresolved); constructor sets `this.#serverPreview = buildServerPreview(options.referenceView)`
  before `#rebuildIndex()`. Full suite `pnpm exec vitest run` -> 113 files, 539
  passed (~24s); `pnpm build` tsc clean.
- refactor: none needed — standalone pure fn, no duplication.
- notes: U78 carries **no `tasks.md` marker** (T040 covered U18–U20 only), so nothing
  to tick. `#serverPreview` is derived purely from the constructor's `referenceView`
  and never changes on `save()`, so it is built once.
- commit: this entry's commit

## Session-resume note (before Cycle 49): the component-seam refactor

The four tree components (`TokenTree`, `TreeNode`, `TreeTokenNode`,
`TreeGroupNode`) shared one prop bundle (`TreeNodeProps` with
`pendingEdits`/`fieldErrors`/`onStageEdit`/`onFieldError`), so moving them onto
`StagedEditsContext` + `useTokenSlice` is a single atomic change that no
one-behaviour cycle can carry. Per this skill's Phase 1 ("introducing the seam
is a refactor on green code"), it was done as a **behaviour-preserving
`refactor:` commit `7d140ae`**, not a cycle:

- `TokenTree` → `useStagedEdits` + `StagedEditsContext.Provider`; tree +
  hasPending via `useSyncExternalStore`; drops its three `useState` maps.
- `TreeNode` props reduced to `{ node, relativePath }` (no `memo` yet).
- `TreeTokenNode`/`TreeGroupNode` → `useTokenSlice(key)`; **keystroke still
  stages immediately** (`onChange` → `store.commit`), so the existing suite's
  "type one char → Save enables" assertions stay green. Validation +
  collision now happen inside `store.commit`.
- Existing tests: `TreeNode.{test,a11y}` setup rewired to a real store +
  provider (no assertion changes); three collision assertions moved to the
  store's canonical wording ("… already used by a sibling") — deliberate
  message consolidation, behaviour (reject/don't-stage/alert/Save-disabled)
  unchanged.

vitest stayed 539; `pnpm build` 7/7. The behaviour cycles below build on this.

## Cycle 49: U54 TreeNode is memoised

- test: `apps/web-app/components/TreeNode/TreeNode.memo.test.tsx::TreeNode is memoised: a parent re-render with the same node does not re-render the row` (new; dedicated `vi.mock` file — the two row renderers are replaced by render-counting `vi.fn` spies)
- red: `pnpm exec vitest run apps/web-app/components/TreeNode/TreeNode.memo.test.tsx`
  -> `AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times`
  at `components/TreeNode/TreeNode.memo.test.tsx:58:24` — a parent re-render
  cascaded through the un-memoised `TreeNode` into the row.
- green: `export const TreeNode = memo(function TreeNode …)`. Parent re-render
  with the same `node` / `relativePath` is now skipped. Full suite
  `pnpm exec vitest run` -> 114 files, 540 passed (~45s); `pnpm build` tsc clean.
- refactor: none needed.
- notes: T017 also carries `[U55]` (still PENDING — "renders the structure
  after the prop-surface reduction"), so it is not ticked yet.
- commit: this entry's commit

## Cycle 50: U55 TreeNode still renders the structure (covered by existing tests)

- Already covered by `apps/web-app/components/TreeNode/TreeNode.test.tsx` —
  `dispatches a token node to TreeTokenNode`, `dispatches a group node to
  TreeGroupNode`, `the reference path reaches TokenReferenceValue's resolved
  rendering` — all three pass against the prop-reduced + memoised `TreeNode`
  (their setup was rewired to a real store + provider in refactor `7d140ae`,
  assertions unchanged).
- Verified with a deliberate mutant: make the `kind === "token"` branch render
  `TreeGroupNode` -> `pnpm exec vitest run apps/web-app/components/TreeNode/TreeNode.test.tsx`
  -> 2 of 3 fail (token + reference cases). Restored.
- No red-green cycle: Phase 1 "already covered by an existing passing test" path.
  state -> DONE. With U54 + U55 both DONE, T017 is ticked.

## Cycle 51: U39 a keystroke re-renders only its own row

- test: `apps/web-app/components/TreeTokenNode/TreeTokenNode.render-isolation.test.tsx::a keystroke in one row re-renders only that row — siblings do not re-render` (new; dedicated `vi.mock` file — `TokenBlock` replaced by a render-counting `vi.fn` that still renders a real name input + `children`, so a per-`rowTestId` call count is the render spy)
- red: passes first run. The context migration (`7d140ae`) + `TreeNode` memo
  (U54) + `getFields` caching already isolate a commit to its own key: after
  the tree is dirty, a keystroke in row `a` leaves `getHasPending`/`getTree`
  unchanged so `TokenTree` doesn't re-render, and siblings' `useTokenSlice`
  snapshots are reference-equal. Deliberate-mutant: `commit`'s
  `#fieldsCache.delete(key)` -> `#fieldsCache.clear()` ->
  `pnpm exec vitest run apps/web-app/components/TreeTokenNode/TreeTokenNode.render-isolation.test.tsx`
  -> `expect(rendersOf("token-g.b")).toBe(bBefore)` fails at
  `TreeTokenNode.render-isolation.test.tsx:99` (siblings re-rendered). Restored.
- green: no production change. Full suite `pnpm exec vitest run` -> 115 files,
  541 passed (~46s); `pnpm build` tsc clean.
- refactor: none needed.
- notes: T021 also carries U40–U46 (all PENDING), so it is not ticked.
- commit: this entry's commit

## Cycle 52: U40 staged-payload parity with the pre-change ClientEdit shape

- test: `apps/web-app/components/TokenTree/TokenTree.test.tsx::the staged payload handed to Save keeps the pre-change ClientEdit shape (U40)` (new; reuses `stubSuccessfulFetch` + `tree()` + `getNameInput`) — rename + description edit on one token, click Save, assert the PATCH body is exactly `{"edits":[{"path":["small"],"name":"tiny","description":"note"}]}`.
- red: passes first run — the migration keeps keystroke-immediate staging and
  `commit` merges each patch into one `#pending` entry per key, so `getEdits()`
  (the `save` payload) matches the old `pendingEdits`-map shape byte for byte.
  Deliberate-mutant: `commit`'s `#pending.set(key, { path, ...existing, ...changed })`
  -> drop `...existing` ->
  `pnpm exec vitest run apps/web-app/components/TokenTree/TokenTree.test.tsx -t "keeps the pre-change ClientEdit shape"`
  -> `expect(fetch).toHaveBeenCalledWith(...)` fails at
  `components/TokenTree/TokenTree.test.tsx:825` (the second edit dropped `name`).
  Restored.
- green: no production change. Full suite `pnpm exec vitest run` -> 115 files,
  542 passed (~59s); `pnpm build` tsc clean.
- refactor: none needed.
- notes: T021 still carries U41–U46 (PENDING) — not ticked.
- commit: this entry's commit

## Cycle 53: U41 (name field) — a keystroke buffers to local draft, no store call

- prep: the existing `TokenTree` / `TreeGroupNode` interaction tests that did
  `fireEvent.change` then asserted a staged/error/save consequence were adapted
  first (commit `3f5d0c7`) to `fireEvent.change` + `fireEvent.blur` — INV-9 moves
  staging from keystroke to blur. No assertion loosened; suite stayed 542 against
  the still-stage-on-change impl.
- test: `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a keystroke in the name field updates only local draft — no store.commit until blur` (new; a real `StagedEditsStore` with `commit` wrapped by a `vi.fn` spy, `TreeTokenNode` rendered directly under `StagedEditsContext`)
- red: `pnpm exec vitest run apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx`
  -> `expect(commitSpy).not.toHaveBeenCalled()` fails at
  `components/TreeTokenNode/TreeTokenNode.draft.test.tsx:61` ("Number of calls: 1"
  — the name field committed on change).
- green: `TreeTokenNode` gains `const [draft, setDraft] = useState<Partial<EditableFields>>({})`
  and `shown = { ...fields, ...draft }`; `handleNameChange` -> `setDraft` only;
  a new `commitDraft()` (`commit(draft)` + `setDraft({})` when non-empty) is wired
  to the heading input's blur via a new `onNameBlur` passthrough on `TokenBlock`.
  Full suite `pnpm exec vitest run` -> 116 files, 543 passed (~45s); `pnpm build`
  tsc clean.
- refactor: none needed.
- notes: **scope split** — this cycle covers the **name field only**. The value
  editor and description field still `commit` on change; the fallback JSON editor
  too. Appended **U41b** (description-field draft), **U41c** (fallback-editor text
  draft + parse-on-commit), **U41d** (typed value-editor draft) to the list. U42
  (clear-only-on-success / retain-on-failure) builds on this cycle's `commitDraft`.
  T018/T021 stay open.
- commit: this entry's commit

## Outer-loop status (opened via `/speckit-tdd-run outer`, HEAD a24929a)

The perf/stability harness (T003–T006) is live. Ran
`playwright test editing-perf.spec.ts render-stability.spec.ts` against a real
production build of the **current mid-migration code**:

| behaviour | spec | current result | note |
| --- | --- | --- | --- |
| A1  | editing-perf: value-edit commit ≤ 100 ms×3 | **PASS** (skeleton strength) | pre-change was ~354 ms (baseline.md); the migration (memo'd `TreeNode` + per-row `useSyncExternalStore` slices + `#fieldsCache` + name draft) already brings it under budget on the 2,000-token fixture |
| A2  | render-stability: type+commit, out-of-region shift | **PASS** | 0 out-of-region shifts |
| A4  | render-stability: hub commit, out-of-region shift | **PASS** | 0 out-of-region shifts |
| A10/A11 | render-stability: full tab-through, any shift | **PASS** | 0 shifts total |
| A5  | editing-perf: hub → referrer preview ≤ 100 ms | **FAIL** | spec defect — `getByTestId(HUB_REFERRER).getByText(/px$/)` times out; the referrer row renders a reference, not an `…px` string. Selector work belongs to **T045**. Not evidence about A5's real behaviour. |
| A6  | editing-perf: typing burst, 0 dropped | **FAIL** | 0 chars dropped, but the typed text lands at offset 0 (caret not preserved during the burst — the INV-11 behaviour **U43** delivers; still PENDING). May also need the spec's cursor handling revisited. |

No state transitions, no commit — this was a read-only status run. Nothing to
**close**: A1's units (U41–U47) are not all `DONE` and the skeleton assertions
gain their `baseline.md` ceiling in T024/T025. A1–A12 stay `PENDING`. The
skeletons passing early is a strong signal the render-isolation approach is
sound; A1 formally closes once U41–U47 land + T024 tightens it.

## Cycle 54: U41b — description field buffers to local draft, commit on blur

- test: `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a keystroke in the description field updates only local draft — no store.commit until blur` (new, mirrors the U41 name-field test)
- red: `pnpm exec vitest run apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx -t "description field"`
  -> `expect(commitSpy).not.toHaveBeenCalled()` fails at
  `components/TreeTokenNode/TreeTokenNode.draft.test.tsx:76` ("Number of calls: 1"
  — `handleDescriptionChange` committed on change).
- green: `handleDescriptionChange` -> `setDraft((c) => ({ ...c, description }))`;
  `currentDescription = shown.description`; `onBlur={commitDraft}` on the
  `<textarea>`. Full suite `pnpm exec vitest run` -> 116 files, 544 passed
  (~21s); `pnpm build` tsc clean. (One earlier full run reported a transient
  1-file error from overlapping vitest processes in the same shell command; a
  clean re-run is 544/544.)
- refactor: none needed — reuses `commitDraft` / `setDraft` from U41.
- notes: T018/T021 stay open (U41c, U41d, U42 pending).
- commit: this entry's commit

## Cycle 55: U41c — fallback JSON editor buffers text, parses + commits on blur

- test: `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a keystroke in the fallback JSON editor buffers text — no store call until blur` (new; a `duration` token -> `FallbackValueEditor` path; `store.commit` and `store.reportError` both wrapped by `vi.fn` spies)
- red: `pnpm exec vitest run apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx -t "fallback JSON editor"`
  -> `expect(commitSpy).not.toHaveBeenCalled()` fails at
  `components/TreeTokenNode/TreeTokenNode.draft.test.tsx:106` ("Number of calls: 1"
  — `handleFallbackValueChange` parsed + committed on change).
- green: new `fallbackDraft: string | undefined` state; `handleFallbackValueChange`
  -> `setFallbackDraft(text)` only; `FallbackValueEditor value={fallbackDraft ??
  JSON.stringify(currentRawValue, null, 2)}`. `commitFallbackDraft` parses: on
  success `commit({ value: parsed })` + clear; on `JSON.parse` failure
  `store.reportError(...)` and keep the text. First pass wrapped the editor in a
  `<span onBlur>` (it had no `onBlur` prop). Full suite `pnpm exec vitest run`
  -> 116 files, 545 passed (~23s); `pnpm build` tsc clean.
- refactor: dropped the `<span>` wrapper — added an optional `onBlur` prop to
  `FallbackValueEditor` (an app component, not a contract-typed editor) and put
  it straight on the `<textarea>`. Its own two tests still pass; suite stays
  545/545, tsc clean.
- notes: T018/T021 stay open (U41d, U42 pending).
- commit: this entry's commit

## Cycle 56: U41d — registered value editor buffers to draft, commit on editor blur

- test: `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a keystroke in the typed value editor updates only local draft — no store.commit until blur` (new; a `dimension` token -> `DimensionEditor`; `store.commit` spied)
- red: `pnpm exec vitest run apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx -t "typed value editor"`
  -> `expect(commitSpy).not.toHaveBeenCalled()` fails at
  `components/TreeTokenNode/TreeTokenNode.draft.test.tsx:124` ("Number of calls: 1"
  — `handleValueChange` committed on the editor's `onChange`).
- green: `handleValueChange` -> `setDraft((c) => ({ ...c, value: next }))`;
  `currentRawValue = shown.value`. The registered editor is contract-typed and
  pluggable (a user extension can't take an `onBlur` prop), so blur is caught on
  a wrapping `<span onBlur={handleValueEditorBlur}>` via bubbling `focusout`;
  `handleValueEditorBlur` commits only when `relatedTarget` is outside the span
  (focus moving Value -> Unit inside `DimensionEditor` is not a commit). Full
  suite `pnpm exec vitest run` -> 116 files, 546 passed (~23s); `pnpm build`
  tsc clean; biome clean (one `noStaticElementInteractions` ignore on the span).
- refactor: none needed. (Asymmetry with U41c's direct `onBlur` prop is
  deliberate — `FallbackValueEditor` is an app component, the registered
  editors are not.)
- notes: **U41 + U41b + U41c + U41d done — every editable field now buffers to
  a local draft and commits on blur (INV-9).** U42 (clear-only-on-success /
  retain-on-failure) is next. T018/T021 stay open.
- commit: this entry's commit

## Cycle 57: U42 — commitDraft clears the buffer only on a successful commit

- test: `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a rejected commit keeps the draft on screen and surfaces the error (U42)` (new; a `small` + sibling `large` store so a rename collision is rejected by `store.commit`)
- red: `pnpm exec vitest run apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx -t "rejected commit"`
  -> `expect(nameInput.value).toBe("large")` fails at
  `components/TreeTokenNode/TreeTokenNode.draft.test.tsx:144` ("Received: \"small\""
  — `commitDraft` cleared the buffer even though `store.commit` returned `false`,
  so the rejected value was lost).
- green: `commitDraft` -> `if (commit(draft)) setDraft({})`. On a rejected
  commit the draft stays (the field keeps the value being fixed) and the reason
  shows via `getError(key)` (INV-10 / INV-12). Full suite `pnpm exec vitest run`
  -> 116 files, 547 passed (~23s); `pnpm build` tsc clean.
- refactor: none needed.
- notes: **U41 + U41b + U41c + U41d + U42 done** — the whole draft-buffer /
  commit-on-blur / clear-on-success mechanism is in place. U43 (caret preserved),
  U44 (no spinner), U45 (dispatch memo), U46 (fallback reportError path) remain
  before T018/T021 close.
- commit: this entry's commit

## Cycle 58: U43 — the focused field's caret survives an unrelated row edit

- test: `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::editing another row does not move the caret in the focused field (U43)` (new; two `TreeTokenNode`s — `small` + `big` — under one store; focus `small`'s name, draft "smalll", caret at 3, then `store.commit("big", …)`)
- red: first assertion used `expect(aName).toHaveFocus()` -> `Invalid Chai
  property: toHaveFocus` (this repo's vitest has no jest-dom matchers — not a
  valid red). Switched to `document.activeElement` / `.value` / `.selectionStart`.
  Passes first run. Deliberate-mutant: `currentName = shown.name` ->
  `currentName = fields.name` (name input ignores the draft) ->
  `pnpm exec vitest run apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx -t "does not move the caret"`
  -> `AssertionError: expected 'small' to be 'smalll'` (the controlled input
  forced the value back, which also resets the caret). Restored.
- green: no production change — `shown = { ...fields, ...draft }` (U41) already
  means no store update changes the focused input's value underneath the user,
  so React never touches the DOM node and the caret/selection is preserved
  (INV-11). A sibling commit doesn't even re-render row `small` (its
  `useTokenSlice` snapshot is unchanged). Full suite `pnpm exec vitest run`
  -> 116 files, 548 passed (~23s); `pnpm build` tsc clean.
- refactor: none needed.
- notes: this unit covers the "unrelated row edited" half of U43. The "deferred
  ripple recompute" half is an e2e concern (the editing row holds a literal
  value and a draft, so it isn't subscribed to `useResolvedPreview` at all) —
  it rides A2 / A3. T018/T021 stay open (U44, U45, U46).
- commit: this entry's commit
