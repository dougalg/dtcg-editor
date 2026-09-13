# Cycle Log: Number Token Editor Support

Append only. Newest last. Every entry's `red` block is the evidence that the test existed and
failed before the implementation.

## Baseline

- `packages/token-core` suite: `pnpm --filter @dtcg-editor/token-core test` -> 154 passed, 0
  failed
- vitest projects (`pnpm exec vitest run`, after `pnpm build`): 685 passed, 1 failed test; 143
  passed / 21 failed test files
- commit: `33cb73d`
- recorded: cycle 0, before any change

## Cycle 1: U1-U10 NumberValueSchema accepts/rejects the DTCG Number `$value` shape

- test: `packages/token-core/src/number.test.ts` (new, 10 cases: U1-U10)
- red: `node --test src/number.test.ts` (run from `packages/token-core`) ->
  `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/number.ts'` (1 failed
  — the file didn't exist yet)
- green: `packages/token-core/src/number.ts` added, exporting
  `NumberValueSchema = z.number()` and `NumberValue`. Test file suite ->
  `tests 10, pass 10, fail 0`. Exported from `packages/token-core/src/index.ts`.
  Full package suite `pnpm --filter @dtcg-editor/token-core test` -> 164 passed
  (154 baseline + 10 new), 0 failed
- refactor: none needed — matches `font-weight.ts`'s file shape exactly, already
  minimal (a single `z.number()` schema plus its inferred type export)
- commit: `965bd7e`

## Cycle 2: U11-U17 NumberEditor renders, edits, validates, and is accessible

- test: `packages/token-editor-number/src/components/NumberEditor/NumberEditor.test.tsx`
  (new, 6 cases: U11-U16) and `NumberEditor.a11y.test.tsx` (new, 1 case: U17)
- red: `pnpm exec vitest run packages/token-editor-number` (unit project) ->
  `Error: Failed to resolve import "./NumberEditor.tsx" ... Does the file exist?`
  (1 test file failed, 0 tests collected — component didn't exist yet)
- green: `packages/token-editor-number/src/components/NumberEditor/NumberEditor.tsx`
  added: a single labeled `<input type="number" step="any">` bound to
  `TokenTypeEditorProps<NumberValue>`, calling `onChange` only when
  `Number.isFinite` and the raw string isn't empty. Plus
  `NumberEditor.module.css`. Unit suite -> 6 passed
- a11y note: `NumberEditor.a11y.test.tsx` passed on first run against the
  already-implemented component (the unit and a11y tests were written together
  before either ran, per Hard Rule 1 — one cycle, one component). Per the
  deliberate-mutant check for a test that passes immediately: removed the
  `<label>` wrapper (input left with no accessible name), re-ran ->
  `expected [ {...} ] to deeply equal []` (1 violation: `aria-input-field-name`
  fail), confirming the test actually catches a missing label; restored the
  `<label>` exactly. Full package suite (`pnpm exec vitest run
  packages/token-editor-number`) -> 2 test files passed, 7 tests passed
- refactor: none needed — matches `FontWeightEditor`'s file shape, already
  minimal (no alias branch, since this type has none)
- commit: `705e71e`

## Cycle 3: U18-U21 NumberPreview renders text and declines invalid values

- test: `packages/token-editor-number/src/components/NumberPreview/NumberPreview.test.tsx`
  (new, 3 cases: U18-U20) and `NumberPreview.a11y.test.tsx` (new, 1 case: U21;
  covers A6 too)
- red: `pnpm exec vitest run packages/token-editor-number --project
  'packages/token-editor-number:unit'` -> `Error: Failed to resolve import
  "./NumberPreview.tsx" ... Does the file exist?` (1 test file failed, 0 tests
  collected)
- green: `packages/token-editor-number/src/components/NumberPreview/NumberPreview.tsx`
  added: `{ value: unknown }` props, `NumberValueSchema.safeParse`, `null` on
  failure, otherwise `<span>{String(parsed.data)}</span>`. Plus
  `NumberPreview.module.css`. Unit project -> 9 passed
- a11y note: `NumberPreview.a11y.test.tsx` passed immediately. Deliberate-mutant
  check: first tried `aria-labelledby="nonexistent-id"` (not caught — axe's
  WCAG tag set doesn't flag a dangling `aria-labelledby` reference on its own),
  then `role="button"` (not caught — a static role alone isn't a violation
  without interaction), then `aria-hidden="true" tabIndex={0}` (caught:
  `expected [ {...} ] to deeply equal []`, `aria-hidden-focus` rule violation,
  confirming the test does catch a real a11y regression); restored the plain
  `<span>` exactly. Full package suite -> 4 test files passed, 11 tests passed
- refactor: none needed — matches `FontWeightPreview`'s exact
  validate-then-render shape
- commit: `3fff721`

## Cycle 4: U22 (closes A1's automated proxy) — number registered in built-in.ts

- test: `apps/web-app/lib/token-editors/built-in.test.ts` — extended the existing
  `BUILT_IN_TOKEN_TYPES` array assertion to include `"number"`, and added
  `resolveBuiltInContract('number') returns the number contract`
- red: `pnpm exec vitest run apps/web-app/lib/token-editors/built-in.test.ts
  --project 'apps/web-app:unit'` -> array assertion diff missing `"number"`;
  `assert.ok(contract)` "The expression evaluated to a falsy value" (2 failed,
  4 passed — pre-existing tests for other types unaffected)
- green: `apps/web-app/lib/token-editors/built-in.ts` — added
  `numberTokenType` import, `"number"` to `BUILT_IN_TOKEN_TYPES`, and
  `number: numberTokenType as unknown as TokenTypeContract<unknown>` to
  `builtInContractsByType` (same erasure-safety rationale as `dimension`/
  `fontWeight`). Added `@dtcg-editor/token-editor-number` to
  `apps/web-app/package.json` via `pnpm add
  "@dtcg-editor/token-editor-number@workspace:*" --filter @dtcg-editor/web-app`
  (pnpm auto-added it to the workspace catalog, resolving to `"catalog:"` in
  `package.json` — consistent with `token-editor-cubic-bezier`/
  `token-editor-font-family`'s existing catalog entries, not a deviation).
  Test file -> 6 passed. `pnpm --filter @dtcg-editor/token-editor-number build`
  and `pnpm --filter @dtcg-editor/web-app build` both succeed (TypeScript
  clean)
- refactor: none needed
- commit: (recorded after this cycle's commit below)

## Notes and deviations

- The 21 failed `apps/web-app:a11y` test files (e.g.
  `components/TreeGroupNode/TreeGroupNode.a11y.test.tsx`, `components/TreeNode/TreeNode.a11y.test.tsx`,
  `components/TreeTokenNode/TreeTokenNode.a11y.test.tsx`) all fail identically: `TypeError: Failed
  to fetch dynamically imported module` during Vitest Browser Mode's real-Chromium startup — an
  environmental/sandbox browser-launch issue, not a code regression. None of the failing files are
  under `packages/token-core` or `packages/token-editor-*`, and none are files this feature
  touches. This pre-dates this feature's work (present before any change on this branch) and is
  out of this feature's scope to fix.
- The 1 failed test, `lib/tokens/reference-index.test.ts`'s
  "builds the reference index for 5,000 tokens at chain depth 5 in under 50ms" (SC-010), is a
  wall-clock performance guard that failed by 1.1ms (51.10ms vs the 50ms budget) — a
  scheduling-contention flake of the kind the tdd-profile itself documents ("dozens of other test
  files scheduled concurrently... can push a sample well past budget"), not a correctness
  regression, and unrelated to `number` token support.
- Per `spec.md`, `plan.md`: this feature's new/changed files are confined to
  `packages/token-core/src/number.ts` (+ test), a new `packages/token-editor-number` package, and
  two registration-only edits (`apps/web-app/lib/token-editors/built-in.ts`,
  `vitest.config.mts`). The loop below tracks only whether *those* files stay green; the two
  pre-existing reds above are recorded here as the documented baseline so `speckit-tdd-verify`
  does not mistake them for regressions introduced by this feature.
