# Cycle Log: Shadow Token Support

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite (vitest, `pnpm exec vitest run`, after regenerating stale
  `apps/web-app/assets/generated/*.ids.ts` icon assets and one `pnpm build` per
  `tdd-profile.md`'s prerequisite note): 177 passed, 0 failed (851 tests)
- suite (`packages/token-core`, `node --test src/*.test.ts`): 178 passed, 0 failed
- commit: `f1c1347`
- recorded: cycle 0, before any change

## Cycle 1: U1-U15 ShadowValueSchema accepts/rejects single-layer and array shapes

- test: `packages/token-core/src/shadow.test.ts` (new, 15 behaviors: accepts
  single-layer object, accepts one-item array, accepts multi-layer array,
  rejects object missing each of the five required keys individually,
  rejects an invalid `color`/`offsetX`/`offsetY`/`blur`/`spread` individually,
  rejects an array with one invalid layer, rejects an empty array)
- red: `node --test src/shadow.test.ts` (run from `packages/token-core`) ->
  `ERR_MODULE_NOT_FOUND` for `./shadow.ts` (module did not exist yet); all 1
  reported "test" node failed for that reason (no `shadow.ts` to import)
- green: `packages/token-core/src/shadow.ts` added — `ShadowLayerSchema =
  z.object({ color, offsetX, offsetY, blur, spread })` importing
  `ColorValueSchema`/`DimensionValueSchema` from their existing sibling
  modules, `ShadowValueSchema = z.union([ShadowLayerSchema,
  z.array(ShadowLayerSchema).min(1)])`. `node --test src/shadow.test.ts` -> 15
  passed, 0 failed. `packages/token-core/src/index.ts` extended to export
  `ShadowValue`/`ShadowLayer`/`ShadowValueSchema`/`ShadowLayerSchema`.
  Package suite (`pnpm --filter @dtcg-editor/token-core test`) -> 193 passed
  (178 baseline + 15 new), 0 failed.
- refactor: none needed — schema composition only, no duplicated logic to
  extract
- commit: `d753a99`

## Cycle 2: U16-U22 ShadowLayerFields embeds ColorEditor + 4 labeled DimensionEditors, no cross-talk

- test: `packages/token-editor-shadow/src/components/ShadowLayerFields/ShadowLayerFields.test.tsx`
  (new, 7 tests) and `ShadowLayerFields.a11y.test.tsx` (new, 1 test)
- red: `pnpm exec vitest run packages/token-editor-shadow --project 'packages/token-editor-shadow:unit'`
  -> `Failed to resolve import "./ShadowLayerFields.tsx"` (module did not
  exist yet) for both files
- green: `ShadowLayerFields.tsx` added, embedding `ColorEditor` (unlabeled,
  matching `BorderEditor`'s single-instance precedent) and four
  `DimensionEditor` instances each wrapped in its own `<fieldset>`/`<legend>`
  ("Offset X"/"Offset Y"/"Blur"/"Spread", mirroring `TransitionEditor`'s
  disambiguation pattern). Initial test draft used
  `group.querySelector('input[aria-label="Value"]')`, which failed with
  "Unable to fire a change event - please provide a DOM element" because
  `DimensionEditor` labels its input via a wrapping `<label>`, not an
  `aria-label` attribute — fixed by switching to
  `within(group).getByLabelText("Value")`. After the fix: unit suite 9/9,
  a11y suite 2/2 (including `ShadowEditor`'s a11y test from the same run).
- refactor: none needed
- commit: `cba651e`

## Cycle 3: A1-A5, U23-U24, U32 ShadowEditor renders one ShadowLayerFields for a bare-object value

- test: `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.test.tsx`
  (new, 2 tests) and `ShadowEditor.a11y.test.tsx` (new, 1 test)
- red: same run as Cycle 2 — `Failed to resolve import "./ShadowEditor.tsx"`
  (module did not exist yet)
- green: `ShadowEditor.tsx` added: a bare (non-array) `value` renders exactly
  one `ShadowLayerFields`, with an array branch stubbed in (iterating and
  splicing per-index) so a value that arrives as an array does not crash
  ahead of Phase 4's repeater work, though no repeater chrome exists yet.
  `pnpm exec vitest run packages/token-editor-shadow` (both projects) -> unit
  9/9, a11y 2/2.
- refactor: none needed
- commit: `cba651e`

## Cycle 4: A6-A9, U25-U31, U33 ShadowEditor's multi-layer repeater (add/remove/move)

- test: extended `ShadowEditor.test.tsx` with 6 new tests (multi-layer render,
  add, remove-middle, move-down, edit-second-layer-only, remove-disabled-at-
  one-layer, one-item-array-keeps-repeater-chrome) and `ShadowEditor.a11y.test.tsx`
  with 1 new test (multi-layer a11y)
- red: `pnpm exec vitest run packages/token-editor-shadow --project 'packages/token-editor-shadow:unit'`
  -> 6 of 16 tests in `ShadowEditor.test.tsx` failed — no "Add layer"/
  "Remove"/"Move up"/"Move down" buttons existed yet (the bare-object-only
  `ShadowEditor` from Cycle 3 had only a passthrough array stub with no
  repeater chrome), confirmed by `TestingLibraryElementError: Unable to find
  an accessible element with the role "button" and name /add layer/i`
- green: `ShadowEditor.tsx` rewritten with a `wasArray` flag (captured from
  whether the incoming `value` prop is an array, re-derived on prop change
  via a `useEffect` keyed on `JSON.stringify(value)`, per plan.md's Design
  Decisions) gating a repeater branch adapted from `FontFamilyEditor`'s
  add/remove/move-up/move-down list pattern — one `ShadowLayerFields` row per
  layer, `Button`s from `@dtcg-editor/design-system` for Move up/Move down/
  Remove (disabled at the array boundaries and, uniquely for shadow, Remove
  additionally disabled when exactly one layer remains since a zero-layer
  shadow is not schema-valid), and an "Add layer" button appending a fixed
  default layer. One test initially used `toBeDisabled()` (a jest-dom
  matcher not installed in this stack) — fixed to check `.disabled` directly,
  matching this repo's existing assertion style. After the fix: unit 16/16,
  a11y 3/3.
- refactor: none needed — the repeater logic is a direct structural
  adaptation of `FontFamilyEditor`'s existing splice-based
  add/remove/move handlers, not new logic needing extraction
- commit: `d1a0ea7`

## Cycle 5: A10-A12, U34-U42 ShadowPreview single-line vs. "N shadows" vs. decline

- test: `packages/token-editor-shadow/src/components/ShadowPreview/ShadowPreview.test.tsx`
  (new, 8 tests) and `ShadowPreview.a11y.test.tsx` (new, 2 tests)
- red: `pnpm exec vitest run packages/token-editor-shadow/src/components/ShadowPreview --project 'packages/token-editor-shadow:unit'`
  -> `Failed to resolve import "./ShadowPreview.tsx"` (module did not exist
  yet)
- green: `ShadowPreview.tsx` added: validates `value` via `ShadowValueSchema`
  and declines (`null`) on any mismatch, matching `BorderPreview`'s pattern;
  for an array with more than one layer renders `"N shadows"`; otherwise
  (bare object or one-item array) unwraps to the single layer and renders one
  line — embedded `ColorPreview` plus offsetX/offsetY/blur/spread text — all
  8 unit tests and both a11y tests passed on the first implementation attempt
  (no fix-up cycle needed, unlike Cycles 2/4's assertion-API corrections).
- refactor: none needed
- commit: `99f8913`

## Cycle 6: U43 shadowTokenType contract wiring

- test: `packages/token-editor-shadow/src/token-type.test.tsx` (new, 6 tests)
- red: `pnpm exec vitest run packages/token-editor-shadow/src/token-type.test.tsx --project 'packages/token-editor-shadow:unit'`
  -> `Failed to resolve import "./token-type.ts"` (module did not exist yet).
  Note: written as `.test.tsx` (Vitest), not `.test.ts` (`node:test`), because
  `token-type.ts` imports `ShadowEditor`/`ShadowPreview` (JSX) and `node:test`
  cannot parse JSX per the constitution's Technology Stack section — this
  deviates from `tasks.md`'s original text (which assumed a `node:test`
  file mirroring `border`'s pattern) for a discovered, unavoidable reason.
- green: `token-type.ts` added (`shadowTokenType: TokenTypeContract<ShadowValue>`,
  mirroring `token-editor-border/src/token-type.ts`). Initial test draft
  used untyped object literals for `arr`/`VALID_LAYER`, which failed
  `tsc -p tsconfig.json` (this package's build step, which type-checks test
  files too) because a wider `string` `colorSpace` isn't assignable to the
  `ColorSpace` union — fixed by typing `VALID_LAYER: ShadowLayer`. After the
  fix: unit 6/6, package build clean.
- refactor: none needed
- commit: pending (batched with Phase 6 completion)

## Cycle 7: A13-A15, U44 shadow registered as a built-in token type

- test: extended `apps/web-app/lib/token-editors/built-in.test.ts` with 2 new
  tests (`BUILT_IN_TOKEN_TYPES includes shadow`, `resolveBuiltInContract('shadow')`)
- red: `pnpm exec vitest run apps/web-app/lib/token-editors/built-in.test.ts --project 'apps/web-app:unit'`
  -> both new tests failed (`assert.ok(contract)` false; `includes("shadow")`
  false) — shadow not yet registered
- green: `shadow` added to `BUILT_IN_TOKEN_TYPES`, `shadowTokenType` imported
  and added to `builtInContractsByType` in
  `apps/web-app/lib/token-editors/built-in.ts`;
  `@dtcg-editor/token-editor-shadow` added as a `workspace:*` dependency of
  `apps/web-app` via `pnpm add ... --save-catalog` (adding the new catalog
  entry to `pnpm-workspace.yaml`, since no prior catalog entry existed for
  this brand-new package — every other dependency `pnpm add` in this feature
  used an existing catalog entry). Had to also update the pre-existing
  exhaustive-list test (`BUILT_IN_TOKEN_TYPES includes dimension, color, ...`)
  to include `"shadow"`, since adding a new built-in type is a genuine
  behavior change to that assertion, not scope creep. After the fix: 11/11
  in `built-in.test.ts`.
- **discovered fixture regression** (not a behavior of this feature, but
  blocking `pnpm test`): `apps/web-app/scripts/generate-large-fixture.ts`'s
  `dispatchShowcase()` used `shadow` as its "still-unregistered-type"
  exemplar for the JSON-textarea-fallback dispatch path (per commit
  `e30f6bb`, which had swapped it from `fontFamily` to `shadow` for the same
  reason). Registering `shadow` here meant that exemplar would incorrectly
  now render via `ShadowEditor` in `generate-large-fixture.test.ts`'s
  "puts one token of every editable dispatch path in the first 20" test.
  Fixed by swapping the exemplar to `gradient` (still unregistered in this
  worktree) and hand-editing only the `_showcase.exotic` block of the
  committed `e2e/fixtures/tokens/large_scale.tokens.json` fixture (not a
  full regeneration — a first attempt at full regeneration produced a
  ~14,000-line diff because `JSON.stringify(..., null, 2)`'s raw 2-space
  output doesn't match the file's committed tab-indented, biome-formatted
  form; a minimal hand-edit avoids disturbing every other seeded value in
  the file, preserving two pre-existing, already-failing Playwright specs'
  unrelated hardcoded expectations exactly as they were). Confirmed by
  running both affected Playwright specs
  (`render-stability.spec.ts`/`keyboard-navigation.spec.ts`) against the
  base commit `f1c1347` (before any shadow-feature changes): the same 2
  tests fail identically there, so this feature does not regress them —
  they are pre-existing failures out of this feature's scope.
- refactor: none needed
- commit: pending (batched with Phase 6 completion)

## Cycle 8: Deliberate-mutant spot check (T034, per tdd-profile.md — no mutation tool configured)

Three deliberate one-line mutations on high-risk changed files, each broken,
confirmed caught by a failing test, then restored exactly:

1. `packages/token-core/src/shadow.ts`: removed `.min(1)` from the array
   branch of `ShadowValueSchema`. Red: `node --test src/shadow.test.ts` ->
   `rejects an empty array` failed (`actual: true, expected: false`).
   Restored.
2. `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.tsx`:
   changed the "Remove" button's `disabled={layers.length === 1}` to
   `disabled={false}`. Red:
   `pnpm exec vitest run packages/token-editor-shadow/src/components/ShadowEditor`
   -> `remove is disabled when exactly one layer remains` failed
   (`expected false to be true`). Restored.
3. `packages/token-editor-shadow/src/components/ShadowPreview/ShadowPreview.tsx`:
   changed the "N shadows" collapse threshold from `parsed.data.length > 1`
   to `>= 1`. **Not caught** by the existing test suite — no test exercised
   a one-item *array* value against `ShadowPreview` (only a bare-object
   single layer and 2-/3-layer arrays were tested), so this boundary had a
   real gap. Per Principle XIII, added the missing boundary test first
   (`ShadowPreview.test.tsx::renders a single line (not '1 shadows') for a
   valid one-item array value` — new behavior `U45`), confirmed it fails
   red against the mutant (`0px 2px 4px 0px` not found; only saw the merged
   "1 shadows" text), then restored the `> 1` threshold and confirmed
   `U45` and the full `token-editor-shadow` suite (31/31) pass. This is a
   genuine strengthening of the suite, not a formality — the spot check did
   its job by surfacing an undertested boundary before merge.
- commit: pending (batched with Phase 7 completion)
