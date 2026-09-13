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
- commit: `49fc6e4`

## Cycle 2: A1-A5, U8-U10 FontFamilyEditor array-form list editing

- test: `packages/token-editor-font-family/src/components/FontFamilyEditor/FontFamilyEditor.test.tsx`
  (new, 8 cases: A1 renders one row per array entry, A2 add appends, A3 remove
  removes a targeted entry, U8 removing the last entry yields `onChange([])`,
  A4 move-down+move-up reorder, U9 move-up disabled at the top, U10 move-down
  disabled at the bottom, A5 blank entry does not call onChange)
- red: `pnpm exec vitest run
  packages/token-editor-font-family/src/components/FontFamilyEditor/FontFamilyEditor.test.tsx`
  -> `Error: Failed to resolve import "./FontFamilyEditor.tsx" ... Does the file
  exist?` (1 failed suite, 0 tests ran — component doesn't exist yet)
- green: `FontFamilyEditor.tsx` and `FontFamilyEditor.module.css` added (list
  editor over `@dtcg-editor/design-system`'s `Input`/`Button`, with
  `toList`/`fromList` helpers implementing the array-form behaviors). Rerun ->
  8 passed, 0 failed
- refactor: none needed on first pass — extracted `commit()` helper was written
  as part of the initial implementation, not a follow-up refactor
- commit: `bc1a2c4` (placeholder, see repo history for the actual SHA this
  cycle's changes landed in)

## Cycle 3: A6-A8 FontFamilyEditor string-form promotion and boundary rule

- test: extended `FontFamilyEditor.test.tsx` with 4 more cases (A6 a string
  value renders one row, A7 editing the sole entry of a string-sourced list
  calls `onChange` with a new string, A8 adding a second entry to a
  string-sourced list produces an array, and the reverse direction: removing
  back down to one entry from an array-sourced list calls `onChange` with a
  bare string)
- **notes (test-after admission)**: these 4 assertions passed immediately on
  first run against the Cycle 2 implementation — no red observed for A6-A8.
  This is because Cycle 2's `toList`/`fromList` helpers (`list.length === 1 ?
  list[0] : [...list]`) were written as one atomic two-branch function
  covering both the "promote a string to a list" and "collapse a list back to
  a string" rules together — splitting that single length check into two
  separate implementation steps (array-only now, string-boundary later) would
  have meant shipping a `fromList` that always returns an array as
  Cycle 2's "smallest sufficient move," which is not in fact smaller (the
  boundary condition is one ternary, not extra code), and doing so would have
  required knowingly implementing FR-005/data-model.md's boundary table
  incorrectly for one cycle only to "discover" the fix already known from
  planning. Recorded here transparently per Hard Rule 2 rather than silently
  presented as a red-then-green cycle it was not.
- verification: ran `pnpm exec vitest run
  packages/token-editor-font-family/src/components/FontFamilyEditor/FontFamilyEditor.test.tsx`
  -> 12 passed, 0 failed (all of A1-A8, U8-U10 green together)
- commit: same commit as Cycle 2 (both landed together; see repo history)

## Cycle 4: A9-A12, U11 FontFamilyPreview comma-joined rendering and decline-on-mismatch

- test: `packages/token-editor-font-family/src/components/FontFamilyPreview/FontFamilyPreview.test.tsx`
  (new, 6 cases: A10 string value renders as itself, A9 short array renders
  comma-joined, A11 a 5-entry list truncates to "Helvetica, Arial, Verdana, +2
  more", U11 an empty array renders empty text without throwing, A12 a
  schema-invalid object renders nothing, and an additional mismatch case: an
  array containing a non-string element also renders nothing)
- red: `pnpm exec vitest run
  packages/token-editor-font-family/src/components/FontFamilyPreview/FontFamilyPreview.test.tsx`
  -> `Error: Failed to resolve import "./FontFamilyPreview.tsx" ... Does the
  file exist?` (1 failed suite, 0 tests ran — component doesn't exist yet)
- green: `FontFamilyPreview.tsx`/`.module.css` added, mirroring
  `FontWeightPreview`'s validate-then-render pattern plus a
  `formatFamilies()` helper for the 3-entry truncation rule. First rerun
  attempt failed for an unrelated reason (`@dtcg-editor/token-core`'s `dist/`
  output didn't exist yet — the package had never been built in this
  worktree), fixed with `pnpm --filter @dtcg-editor/token-core build`, then
  the test file itself passed 6/6 on the next run. Full package suite
  (`pnpm exec vitest run packages/token-editor-font-family`) -> 18 passed
  (12 Editor + 6 Preview), 0 failed
- refactor: none needed
- commit: `2c39f31`

## Notes and deviations

- Cycle 3 (A6-A8) was test-after, not test-first — see that cycle's entry for
  the full rationale. Every other behavior (U1-U11, A1-A5, A9-A12) followed
  the strict red-then-green sequence with observed failure output recorded
  above.
- After all behaviors reached `DONE`, contract wiring (`token-type.ts`,
  `index.ts`), built-in registration (`apps/web-app/lib/token-editors/built-in.ts`),
  a11y tests, and a Storybook story were added as structural/non-behavioral
  work (`tasks.md` T019-T023, no behavior markers) — commit `dae4748`.
- `pnpm test` (repo root) surfaced two *pre-existing* web-app unit tests that
  hard-coded `fontFamily` as their "still unsupported type" exemplar
  (`built-in.test.ts`'s `BUILT_IN_TOKEN_TYPES` assertion, and
  `generate-large-fixture.ts`'s `_showcase.exotic` token). Both were updated
  (exemplar switched to `shadow`, still unregistered) and the committed
  `large_scale.tokens.json` fixture regenerated — commit `47b5278`. This is
  the same category of update `fontWeight`/`cubicBezier` each required when
  they landed.
- `pnpm test` also surfaced 5 failing Playwright e2e specs
  (`editing-perf.spec.ts`, `edit-token-references-perf.spec.ts`,
  `keyboard-navigation.spec.ts` x2, `render-stability.spec.ts`), all about
  dimension-hub referrer-text formatting and Tab-order timing, none
  referencing `fontFamily`/`shadow`/`_showcase.exotic`. Confirmed pre-existing
  and unrelated: `main` already has commit `6248e38` ("record pre-existing
  e2e flake baseline for strokeStyle feature") documenting this exact flake
  as a known baseline issue from a sibling feature, and there is a dedicated
  backlog worktree (`fix-editing-perf-ci-flake`) tracking it. Not touched by
  this feature.
- The full Vitest suite (`pnpm exec vitest run`, unit + a11y + bench
  projects) is green: 786 passed, 0 failed, across 160 test files.
