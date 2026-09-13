# Cycle Log: Border Token Support

Append only. Newest last. Every entry's `red` block is the evidence that the
test existed and failed before the implementation.

## Baseline

- suite (vitest, root): `pnpm exec vitest run` -> 686 passed, 0 failed in
  144/164 files; 20 files failed to import
  (`apps/web-app:a11y (chromium)` projects, pre-existing
  `Failed to fetch dynamically imported module` transport error, unrelated to
  this feature — none of the 20 files are under a package this feature
  touches)
- suite (`packages/token-core`, node:test): `node --test src/*.test.ts` ->
  154 passed, 0 failed
- build: `pnpm build` -> 12/12 tasks successful
- commit: `dd8495e`
- recorded: cycle 0, before any change

## Cycle 1: U1-U9 BorderValueSchema accepts/rejects the border value shape

- test: `packages/token-core/src/border.test.ts` (new, 9 cases)
- red: `node --test src/border.test.ts` (run from `packages/token-core`) ->
  `ERR_MODULE_NOT_FOUND: .../packages/token-core/src/border.ts` (1 failed —
  module did not exist yet)
- green: `packages/token-core/src/border.ts` added
  (`BorderValueSchema = z.object({ color: ColorValueSchema, width:
  DimensionValueSchema, style: StrokeStyleValueSchema })`, composed from the
  three existing sibling schemas, no redefinition). `node --test
  src/border.test.ts` -> 9 passed, 0 failed
- refactor: none needed — the schema is a one-line composition
- follow-up: exported `BorderValue`/`BorderValueSchema` from
  `packages/token-core/src/index.ts`
- commit: pending (batched with subsequent cycles, see Notes)
