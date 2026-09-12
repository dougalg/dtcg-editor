# Cycle Log: Duration Token Support

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite (vitest, fast inner-loop subset, after `pnpm build` so workspace
  packages resolve): `pnpm exec vitest run` -> 142 test files passed, 704 tests
  passed, 0 failed
- suite (token-core, node:test): `node --test src/*.test.ts` (run from
  `packages/token-core`) -> 101 passed, 0 failed
- commit: `1c832dd`
- note: a fresh worktree needs `apps/web-app/assets/generated/*.ids.ts` (icon
  sprite ids) regenerated via `pnpm --filter @dtcg-editor/web-app generate:icons`
  before `pnpm exec vitest run` is green — these are gitignored build outputs,
  not a code regression. Confirmed green above only after regenerating them.
- recorded: cycle 0, before any change

## Cycle 1: U1-U6 DurationValueSchema validation

- test: `packages/token-core/src/duration.test.ts` (new, 6 cases: accepts ms,
  accepts zero s, rejects negative, rejects unsupported unit, rejects missing
  unit, rejects non-numeric value)
- red: `node --test src/duration.test.ts` (from `packages/token-core`) ->
  `ERR_MODULE_NOT_FOUND: Cannot find module '.../packages/token-core/src/duration.ts'`
  (1 failed — module doesn't exist yet, the right reason)
- green: `packages/token-core/src/duration.ts` added
  (`DurationValueSchema = z.object({ value: z.number().min(0), unit: z.enum(["ms","s"]) })`).
  `node --test src/duration.test.ts` -> 6 passed, 0 failed. Full package suite
  `node --test src/*.test.ts` -> 107 passed, 0 failed (was 101 at baseline).
  `pnpm --filter @dtcg-editor/token-core build` -> clean, no type errors.
- refactor: none needed — six lines, already minimal
- commit: `eb4cff2`

## Cycle 2: U7-U14, A1-A3 DurationEditor

- test: `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.test.tsx`
  (new, 7 cases) and `DurationEditor.a11y.test.tsx` (new, 2 cases)
- red: `pnpm exec vitest run packages/token-editor-duration/src/components/DurationEditor/DurationEditor.test.tsx`
  -> `Error: Failed to resolve import "./DurationEditor.tsx" ... Does the file
  exist?` (1 test file failed to even collect — the right reason, component
  doesn't exist yet)
- green: `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.tsx`
  added (mirrors `DimensionEditor.tsx`; numeric handler additionally guards
  `Number.isNaN(next) || next < 0` so a negative edit never reaches
  `onChange`, covering U12/A3) + `DurationEditor.module.css`. `pnpm exec
  vitest run .../DurationEditor.test.tsx` -> 7 passed. `pnpm exec vitest run
  .../DurationEditor.a11y.test.tsx` -> 2 passed. `pnpm --filter
  @dtcg-editor/token-editor-duration build` -> clean.
- refactor: none needed
- commit: (this session, see repo history)
