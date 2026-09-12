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
- commit: (pending, see next commit in this session)
