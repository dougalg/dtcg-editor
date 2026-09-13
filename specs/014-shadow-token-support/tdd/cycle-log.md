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
- commit: pending (batched with Phase 5 completion)
