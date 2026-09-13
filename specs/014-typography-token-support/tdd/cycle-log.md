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
- commit: `6ec342b`

## Cycle 2: A1-A7 TypographyEditor five-field composite editing

- test: `packages/token-editor-typography/src/components/TypographyEditor/TypographyEditor.test.tsx`
  (new, 7 cases: A1 renders all five labeled controls with current values; A2
  changing font family updates only fontFamily; A3 changing font size updates
  only fontSize; A4 changing font weight updates only fontWeight; A5 changing
  letter spacing updates only letterSpacing; A6 changing line height updates
  only lineHeight; A7 Font Size and Letter Spacing groups are not confused)
- red: `pnpm exec vitest run --project packages/token-editor-typography:unit`
  -> `Error: Failed to resolve import "./TypographyEditor.tsx" ... Does the
  file exist?` (1 failed suite, component did not exist)
- green: `packages/token-editor-typography/src/components/TypographyEditor/TypographyEditor.tsx`
  added, embedding `FontFamilyEditor`, `DimensionEditor` (x2, each in its own
  `<fieldset>`/`<legend>`), `FontWeightEditor`, `NumberEditor`, each
  `onChange` spreading `value` and replacing only its own key. Added
  `TypographyEditor.module.css` (copied `TransitionEditor.module.css`'s
  `--dtcg-ed-*`-only rules verbatim). Re-run -> 7 passed, 0 failed
- refactor: none needed — the five-field embed is already the smallest
  faithful implementation, matching `TransitionEditor`'s precedent shape
- commit: (recorded after this cycle's commit lands)
