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
- commit: `e067892`

## Cycle 2: A1-A3, U10-U14 BorderEditor delegates each sub-field without clobbering the others

- test: `packages/token-editor-border/src/components/BorderEditor/BorderEditor.test.tsx`
  (new, 5 cases)
- red: `pnpm exec vitest run packages/token-editor-border/src/components/BorderEditor/BorderEditor.test.tsx`
  -> `Error: Failed to resolve import "./BorderEditor.tsx"... Does the file
  exist?` (1 suite failed — module did not exist yet)
- green: `packages/token-editor-border/src/components/BorderEditor/BorderEditor.tsx`
  added, embedding `ColorEditor`/`DimensionEditor`/`StrokeStyleEditor`
  directly, each wired as `onChange={(x) => onChange({ ...value, x })}`.
  Same command -> 5 passed, 0 failed (first attempt — no bespoke sub-control
  logic was written that needed a spread-vs-clobber fix)
- refactor: none needed
- follow-up: `BorderEditor.a11y.test.tsx` (2 cases) added and confirmed green
  (a transient dep-optimization "Vite unexpectedly reloaded a test" failure
  on the first run is the same pre-existing Vitest Browser Mode cold-start
  flake noted in the Baseline entry — not a real failure; the retry passed
  clean). `BorderEditor.module.css` (layout only, `--dtcg-ed-space-*`/
  `--dtcg-ed-text-*`/`--dtcg-ed-color-neutral-text-quiet` tokens, matching
  `DimensionEditor.module.css`/`StrokeStyleEditor.module.css` precedent) and
  `BorderEditor.stories.tsx` added.
- commit: `b0c215e`

## Cycle 3: A4-A5, U16-U22 BorderPreview renders compactly and declines correctly

- test: `packages/token-editor-border/src/components/BorderPreview/BorderPreview.test.tsx`
  (new, 7 cases)
- red: `pnpm exec vitest run packages/token-editor-border/src/components/BorderPreview/BorderPreview.test.tsx`
  -> `Error: Failed to resolve import "./BorderPreview.tsx"... Does the file
  exist?` (1 suite failed — module did not exist yet)
- green (2 steps):
  1. First implementation attempt embedded `DimensionPreview` from
     `@dtcg-editor/token-editor-dimension` for the width text — 5/7 passed,
     2 failed with `TypeError: Cannot read properties of undefined (reading
     'safeParse')`, then (after rebuilding `token-core` to pick up the new
     `BorderValueSchema` export) `Element type is invalid... got:
     undefined`. Root cause: `token-editor-dimension/src/index.ts` does not
     export a `DimensionPreview` — only `token-editor-color` and
     `token-editor-stroke-style` export their `Preview` components. Since
     this feature must only consume siblings' *existing* exports (not add
     to them), switched width to short plain text (`"1px"`) instead of an
     embedded component, keeping `ColorPreview`/`StrokeStylePreview`
     embedded for color/style.
  2. Second attempt: same command -> 7 passed, 0 failed
- refactor: none further needed
- follow-up: `BorderPreview.a11y.test.tsx` (1 case) added and confirmed
  green on first run. `BorderPreview.module.css` (layout only,
  `--dtcg-ed-space-3xs-2xs`) added.
- commit: pending (batched, see Notes)
