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
- commit: `e856424`

## Cycle 3: U15-U19, A4-A5 DurationPreview

- test: `packages/token-editor-duration/src/components/DurationPreview/DurationPreview.test.tsx`
  (new, 4 cases) and `DurationPreview.a11y.test.tsx` (new, 1 case)
- red: `pnpm exec vitest run .../DurationPreview.test.tsx` -> `Error: Failed
  to resolve import "./DurationPreview.tsx" ... Does the file exist?` (1 test
  file failed to collect, 0 tests ran — component doesn't exist yet)
- green: `packages/token-editor-duration/src/components/DurationPreview/DurationPreview.tsx`
  added (mirrors `ColorPreview.tsx`: `DurationValueSchema.safeParse(value)`,
  `null` on failure, else `${value}${unit}` text) + `DurationPreview.module.css`.
  `pnpm exec vitest run packages/token-editor-duration/src/components/DurationPreview/`
  -> 5 passed (4 unit + 1 a11y). `Preview: DurationPreview` wired into
  `durationTokenType` (completes U20). `pnpm exec vitest run
  packages/token-editor-duration` -> 4 test files, 14 tests, all passed.
  `pnpm --filter @dtcg-editor/token-editor-duration build` -> clean.
- refactor: none needed
- commit: `e856424`

## Cycle 4: U21-U22, A6-A7 built-in registration

- test: extended `apps/web-app/lib/token-editors/built-in.test.ts` (existing
  file — the `BUILT_IN_TOKEN_TYPES` deepEqual assertion already asserted an
  exact list, so it doubles as the failing test for U21 once `"duration"` is
  added to the expected array) plus a new `resolveBuiltInContract('duration')`
  case (U22); also extended `built-in.a11y.test.tsx` with a duration-editor
  smoke case (non-TDD-gated — durationTokenType.Editor already existed and
  passing before this cycle, so this addition has no red/green transition of
  its own; kept for parity with the dimension/color entries already there)
- red: `pnpm exec vitest run apps/web-app/lib/token-editors/built-in.test.ts`
  -> `AssertionError: Expected values to be strictly equal` (deepEqual
  mismatch: actual `["dimension","color"]` vs expected `[...,"duration"]`)
  and `AssertionError: Expected values to be strictly equal: + undefined -
  'duration'` for `resolveBuiltInContract` (2 failed, 1 passed — right
  reasons: `duration` not yet registered)
- green: `apps/web-app/lib/token-editors/built-in.ts` imports
  `durationTokenType` from the new `@dtcg-editor/token-editor-duration`
  workspace dependency (added via `pnpm add ... --workspace`, then corrected
  from the erroneous `catalog:` protocol pnpm's `add` produced to
  `workspace:*` matching every sibling entry — `packages/token-editor-duration`
  is a workspace member, not a catalog-versioned external package),
  adds `"duration"` to `BUILT_IN_TOKEN_TYPES` and
  `builtInContractsByType`. `pnpm exec vitest run
  apps/web-app/lib/token-editors/built-in` -> 2 test files, 6 tests, all
  passed.
- refactor: none needed
- commit: (this session, see repo history)
