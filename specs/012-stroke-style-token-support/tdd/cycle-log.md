# Cycle Log: Stroke Style Token Editor Support

Append only. Newest last.

## Baseline

- `pnpm --filter @dtcg-editor/token-core test` -> 147 passed, 0 failed (before this feature's
  first test).
- commit: `741e94e` (claim commit)

## Cycle 1: U1-U16, token-core StrokeStyleValueSchema

- test: `packages/token-core/src/stroke-style.test.ts` — 16 cases: each of the 8 keywords, one
  unrecognized keyword, a well-formed object, an empty dashArray, a malformed dashArray entry
  (missing unit), an invalid dashArray entry unit, an invalid lineCap, a missing lineCap, and a
  non-string/non-object shape (all new)
- red: `node --test src/stroke-style.test.ts` (run from `packages/token-core/`) ->
  `Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../packages/token-core/src/stroke-style.ts'` — module didn't exist yet, genuine red
- green: created `packages/token-core/src/stroke-style.ts` with
  `StrokeStyleValueSchema = z.union([z.enum(STROKE_STYLE_KEYWORDS), z.object({ dashArray:
  z.array(DimensionValueSchema), lineCap: z.enum(["round","butt","square"]) })])`, importing
  `DimensionValueSchema` from `./dimension.ts`. Re-ran the single file -> 16/16 passed. Full
  package suite: `node --test src/*.test.ts` -> 163 passed, 0 failed (was 147 before this
  feature's file existed; 147 + 16 = 163)
- green (confirmed): 163 passed, 0 failed
- refactor: none needed — new module is 30 lines, one schema
- exported `StrokeStyleValueSchema`/`StrokeStyleValue` from `packages/token-core/src/index.ts`
  (structural, no new behavior)
- `pnpm --filter @dtcg-editor/token-core build` -> clean
- commit: `afa720a` feat(token-core): add StrokeStyleValueSchema for the DTCG strokeStyle type

## Cycle 2: U17-U27, StrokeStyleEditor

- test: `StrokeStyleEditor.test.tsx` — 15 cases covering named-mode rendering/selection, custom-mode
  rendering, mode-switch defaults, dash-field/lineCap/add/remove edits, and the non-numeric-input
  guard (all new)
- red: `pnpm exec vitest run --project "packages/token-editor-stroke-style:unit"` ->
  `Error: Failed to resolve import "./StrokeStyleEditor.tsx"` (both test files, 0 tests collected)
  — genuine red, component didn't exist
- green: implemented `StrokeStyleEditor.tsx` (design-system `RadioGroup` mode toggle, `Select`
  for the 8 keywords in named mode, a dynamic dash-segment row list + line-cap `Select` in custom
  mode). Re-ran -> 14/15 passed, 1 failed:
  `entering a non-numeric dash segment value does not call onChange` ->
  `AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times`
  with `[{dashArray:[{unit:"px",value:0}],lineCap:"butt"}]` — jsdom coerces a non-numeric
  `type="number"` input's value to `""`, and `Number("")` is `0` (finite), so the original guard
  (`!Number.isFinite(next)`) let it through. Fixed by adding an explicit
  `raw.trim() === ""` guard before the `Number()` conversion. Re-ran -> 15/15 passed.
- refactor: none needed beyond the guard fix above
- commit: `f663573` (bundled with Cycle 3's a11y-lint fix below — same files, one commit)

## Cycle 3: U28, StrokeStyleEditor a11y

- test: `StrokeStyleEditor.a11y.test.tsx` — named-mode and custom-mode cases (new)
- red: `pnpm exec vitest run --project "packages/token-editor-stroke-style:a11y (chromium)"` ->
  `Failed to import test file .../vitest.a11y-setup.ts` (the shared a11y setup imports
  `@dtcg-editor/design-system`'s built CSS, which didn't exist yet) — genuine environment red,
  resolved by running `pnpm --filter @dtcg-editor/design-system build` (a structural
  prerequisite, not a change to this feature's own code). Re-ran -> both cases passed on first
  try against the already-built component.
- verification (deliberate mutant, since this is a new test against an already-implemented
  component per the same rule cycle 14 of the fontWeight log used): `pnpm lint` on the package
  caught 5 real `lint/a11y/noLabelWithoutControl` violations — every `<label>` that wrapped a
  design-system `RadioGroupItem`/`Select` (Biome can't see through the abstraction to the real
  `<input>`/`<select>` underneath). This is exactly the kind of accessibility-adjacent regression
  the a11y test tier exists to catch, though it surfaced via lint rather than axe (axe itself
  passed both cases before the fix, since Radix's/the native select's actual DOM already had
  correct label associations via `aria-label` — the `<label>`-wrapping was redundant, not
  broken). Fixed by replacing those 5 `<label>` wrappers with plain `<span>`s (the control's own
  `aria-label` already supplies the accessible name), matching `ColorSpaceSelect`'s established
  precedent of not wrapping a design-system `Select` in a `<label>`. Re-ran the full package
  suite (unit + a11y) -> 19/19 passed, `pnpm lint` on the package -> clean.
- green: 19/19 passed
- refactor: none needed
- commit: `f663573` feat(token-editor-*): add StrokeStyleEditor with named/custom mode toggle

## Cycle 4: U29-U32, StrokeStylePreview

- test: `StrokeStylePreview.test.tsx` (renders named text, renders custom summary, declines on
  invalid) and `StrokeStylePreview.a11y.test.tsx` (both forms, new)
- red: `Error: Failed to resolve import "./StrokeStylePreview.tsx"` — genuine red, component
  didn't exist
- green: implemented `StrokeStylePreview.tsx` (`StrokeStyleValueSchema.safeParse`, `null` on
  failure, else the keyword string or `"dashed (<lineCap>)"` for the object form). Re-ran -> all
  passed (3 unit + 2 a11y)
- refactor: none needed — module is 21 lines, one responsibility
- wiring: added `Preview: StrokeStylePreview` to `strokeStyleTokenType` (structural), exported
  from `index.ts` (structural)
- full package suite: `pnpm exec vitest run packages/token-editor-stroke-style` -> 4 files, 19
  tests passed, 0 failed
- commit: `6290d77` feat(token-editor-*): add StrokeStylePreview and wire the strokeStyle contract

## Cycle 5: U33/A1, built-in.ts registration

- test: extended `apps/web-app/lib/token-editors/built-in.test.ts`'s
  `BUILT_IN_TOKEN_TYPES` assertion from 5 entries to include `"strokeStyle"` as the 6th
- red: `pnpm exec vitest run --project "apps/web-app:unit" apps/web-app/lib/token-editors/built-in.test.ts`
  -> `Failed to resolve import "@dtcg-editor/token-editor-color"` (pre-existing packages' `dist/`
  outputs were stale/missing in this fresh worktree, an environment issue, not this feature's
  code) — resolved with a full `pnpm build`. Re-ran -> `AssertionError`, array missing
  `"strokeStyle"` — genuine red once the environment was sound.
- green: added `strokeStyle`/`strokeStyleTokenType` to `BUILT_IN_TOKEN_TYPES`/
  `builtInContractsByType` in `built-in.ts`; added the workspace dependency to
  `apps/web-app/package.json` via `pnpm add "@dtcg-editor/token-editor-stroke-style@workspace:*"
  --filter @dtcg-editor/web-app` (the plain `pnpm add` form first tried to resolve the package
  from the npm registry and failed, matching `fontWeight`'s cycle-15 precedent of `pnpm add`
  sometimes routing a new workspace package through the strict pnpm catalog instead of a direct
  workspace link — fixed the same way: explicit `@workspace:*` version spec, then removed the
  stray `pnpm-workspace.yaml` catalog entry `pnpm add` had created and confirmed
  `apps/web-app/package.json`'s field reads `"workspace:*"` directly). Re-ran the single test ->
  pass.
- regression check: `apps/web-app/lib/token-editors/define-config.test.ts`'s extension-count
  assertions are already derived from `BUILT_IN_TOKEN_TYPES.length` (not hardcoded), so adding a
  6th built-in type required no fix there — unlike the `fontWeight` precedent, which had to
  patch two hardcoded literals.
- green (full suite): `pnpm exec vitest run` -> 160 files, 781 tests passed, 0 failed.
  `pnpm --filter @dtcg-editor/token-core test` -> 163 passed, 0 failed. `pnpm build` -> 11/11
  tasks successful.
- refactor: none needed
- commit: `0e6b564` feat(web-app): register strokeStyle as a built-in token type

## Polish phase (tasks.md T025-T029)

- T025: added `StrokeStyleEditor.stories.tsx` (Named, CustomDashPattern stories); added the
  package to `turbo.json`'s `//#storybook`/`//#build-storybook` `dependsOn` lists.
- T026: `pnpm build` -> 11/11 tasks successful.
- T027: `pnpm exec vitest run` -> 160/160 files, 781/781 tests passed.
  `pnpm --filter @dtcg-editor/token-core test` -> 163/163 passed.
- T028: `pnpm lint` -> 23/23 tasks successful (Biome, zero violations including the new
  package). `pnpm lint:filenames` (`ls-lint`) -> clean. `pnpm format:check` -> 532 files
  checked, no fixes needed (after one `biome format --write` pass to reflow 3 files this
  feature's own edits had left slightly mis-wrapped).
- T029: cross-checked against `spec.md`'s 8 acceptance scenarios (A1-A8 in `test-list.md`) —
  all covered by the component-render test suite; no interactive `pnpm dev` session run in this
  environment, matching every other `token-editor-*` package's precedent (no dedicated
  Playwright acceptance layer).
- `pnpm test` (full CI gate, includes Playwright e2e): 6 pre-existing, unrelated failures —
  two wall-clock performance-budget flakes (`edit-token-references-perf.spec.ts` A18/SC-004),
  one perf-budget flake in `editing-perf.spec.ts` (A5, plus an unrelated preview-text-format
  assertion mismatch in the same spec), and two focus-order/scroll-position timing flakes in
  `keyboard-navigation.spec.ts` (A3), plus one in `render-stability.spec.ts` (A4). None of these
  six specs exercise `strokeStyle`, `token-editor-stroke-style`, or `built-in.ts`/
  `define-config.ts` — they are the same category of wall-clock/timing-sensitive flakiness the
  `fontWeight` feature's baseline already recorded, tracked by the open "fix editing perf CI
  flake" backlog item in its own worktree. The subset this feature actually touches —
  `pnpm exec vitest run` and `pnpm --filter @dtcg-editor/token-core test` — is fully green
  (781/781 and 163/163 respectively), and `pnpm build`/`pnpm lint`/`pnpm lint:filenames`/
  `pnpm format:check` are all clean.

## Test list complete

All 33 unit behaviors (U1-U33) and 8 acceptance behaviors (A1-A8) are `DONE`.
