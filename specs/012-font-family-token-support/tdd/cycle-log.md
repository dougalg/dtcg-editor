# Cycle Log: Font Family Token Editor Support

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite: `pnpm --filter @dtcg-editor/token-core test` -> 131 passed, 0 failed
- commit: `4dd7606`
- recorded: cycle 0, before any change

## Cycle 1: U1-U7 FontFamilyValueSchema accepts/rejects the DTCG Font Family shapes

- test: `packages/token-core/src/font-family.test.ts` (new, 7 cases: U1 single
  string, U2 array of strings, U3 empty array, U4 non-string array element
  rejected, U5 number rejected, U6 null rejected, U7 plain object rejected)
- red: `node --test src/font-family.test.ts` (run from `packages/token-core/`)
  -> `Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../packages/token-core/src/font-family.ts'` (1 failed — module doesn't exist)
- green: `packages/token-core/src/font-family.ts` added
  (`FontFamilyValueSchema = z.union([z.string(), z.array(z.string())])`). Rerun
  of `node --test src/font-family.test.ts` -> 7 passed, 0 failed. Also exported
  from `packages/token-core/src/index.ts`. Full package suite
  `pnpm --filter @dtcg-editor/token-core test` -> 138 passed, 0 failed (131 + 7)
- refactor: none needed — schema is a two-branch union, no duplication introduced
- notes: batched all 7 boundary/shape behaviors (U1-U7) into one cycle since
  they're all trivial branches of the same two-line union schema and the same
  test file — treated as one indivisible unit of implementation, per the
  playbook's guidance that a step should not be split smaller than the smallest
  sufficient move
- commit: (recorded after this entry is written, see repo history)
