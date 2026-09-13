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
- commit: `600ddae`

## Cycle 3: A8-A11 TypographyPreview composed one-line summary

- test: `packages/token-editor-typography/src/components/TypographyPreview/TypographyPreview.test.tsx`
  (new, 4 cases: A8 zero-letter-spacing renders one line with no spacing
  mention; A9 non-zero letter spacing appends it to that line; A10 the
  fontFamily-array/keyword-fontWeight formatting matches
  FontFamilyPreview/FontWeightPreview's own conventions; A11 a schema-invalid
  value renders nothing)
- red: `pnpm exec vitest run --project packages/token-editor-typography:unit`
  -> `Error: Failed to resolve import "./TypographyPreview.tsx" ... Does the
  file exist?` (1 of 2 suites failed, component did not exist)
- green: `packages/token-editor-typography/src/components/TypographyPreview/TypographyPreview.tsx`
  added — `TypographyValueSchema.safeParse`, decline (`null`) on failure,
  otherwise compose `{fontSize.value}{fontSize.unit}/{lineHeight}
  {fontFamily} {fontWeight}` with letter spacing appended only when
  non-zero. Added `TypographyPreview.module.css` (copied
  `TransitionPreview.module.css`'s `--dtcg-ed-*`-only rules verbatim).
  Re-run -> 11 passed, 0 failed (both TypographyEditor and TypographyPreview
  suites)
- refactor: none needed
- commit: `07b070c`

## Notes and deviations

- Contract wiring (`token-type.ts`, `index.ts`), built-in registration
  (`apps/web-app/lib/token-editors/built-in.ts` + its test), a11y tests, the
  Storybook story, and the full-suite polish pass are structural/non-behavioral
  work with no `tdd/test-list.md` behavior marker — left for `/speckit-implement`
  per this extension's division of labor, and completed there (`tasks.md`
  T016-T022). See `tasks.md` T021 for the full-suite verification detail,
  including the pre-existing-and-unrelated e2e flakes ruled out by comparison
  against unmodified `main`.
