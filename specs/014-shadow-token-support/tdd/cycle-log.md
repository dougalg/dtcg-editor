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
- commit: pending (batched with Phase 3 completion)

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
- commit: pending (batched with Phase 3 completion)
