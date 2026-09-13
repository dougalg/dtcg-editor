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
- commit: pending (batched with Phase 2 completion)
