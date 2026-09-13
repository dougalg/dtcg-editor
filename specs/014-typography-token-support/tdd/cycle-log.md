# Cycle Log: Typography Token Editor Support

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite: `node --test src/*.test.ts` (packages/token-core) -> 178 passed, 0 failed
- commit: `9e8d51d`
- recorded: cycle 0, before any change

## Cycle 1: U1-U7 TypographyValueSchema composition and field-presence/nested validation

- test: `packages/token-core/src/typography.test.ts` (new, 7 cases: U1 accepts a
  valid typography value; U2-U6 rejects a value missing each of
  fontFamily/fontSize/fontWeight/letterSpacing/lineHeight; U7 rejects an invalid
  nested fontSize)
- red: `node --test src/typography.test.ts` -> `ERR_MODULE_NOT_FOUND:
  Cannot find module '.../src/typography.ts'` (1 failed, module did not exist)
- green: `packages/token-core/src/typography.ts` added
  (`TypographyValueSchema = z.object({ fontFamily: FontFamilyValueSchema,
  fontSize: DimensionValueSchema, fontWeight: FontWeightValueSchema,
  letterSpacing: DimensionValueSchema, lineHeight: z.number() })`). Re-run
  `node --test src/typography.test.ts` -> 7 passed, 0 failed
- refactor: exported `TypographyValueSchema`/`TypographyValue` from
  `packages/token-core/src/index.ts`; re-ran full package suite
  `node --test src/*.test.ts` -> 185 passed, 0 failed
- commit: (recorded after this cycle's commit lands)
