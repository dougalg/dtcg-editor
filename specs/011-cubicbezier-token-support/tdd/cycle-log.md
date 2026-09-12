# Cycle Log: cubicBezier Token Support

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite (fast, vitest projects only): `pnpm exec vitest run` -> 703 passed, 1
  failed (`apps/web-app` bench project's wall-clock benchmark,
  `lib/tokens/reference-index.test.ts`, SC-010 timing assertion — pre-existing,
  unrelated to this feature, flaky under full-suite CPU contention per
  `.specify/memory/tdd-profile.md`'s own documented flake note; not touched by
  this feature)
- suite (token-core, node:test): not yet run standalone at baseline (no
  `cubic-bezier.*` files exist yet to affect it)
- commit: `6c6dd26`
- recorded: cycle 0, before any change

## Cycle 1: U1-U14 CubicBezierValueSchema validates the DTCG tuple shape

- test: `packages/token-core/src/cubic-bezier.test.ts` (new, 14 tests: valid tuple,
  P1x/P2x boundary at 0 and 1 both sides, negative P1y, P2y > 1, 3-element array,
  5-element array, non-numeric entry)
- red: `node --test src/cubic-bezier.test.ts` (run from `packages/token-core`) ->
  `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/cubic-bezier.ts'` (1
  failed — file didn't exist yet)
- green: created `packages/token-core/src/cubic-bezier.ts`
  (`CubicBezierValueSchema` as a `z.tuple` with `.min(0).max(1)` on indices 0/2,
  bare `z.number()` on indices 1/3). `node --test src/cubic-bezier.test.ts` -> 14
  passed, 0 failed. Full package suite `node --test src/*.test.ts` -> 116 passed
  (115 pre-existing + 14 new, minus 0 changed — see Cycle 2 for the 116th)
- refactor: none needed — the module already matches `dimension.ts`'s existing
  doc-comment/export style, nothing to extract
- commit: (this cycle + Cycle 2 committed together, see below)

## Cycle 2: A7 a cubicBezier token with out-of-range y-coordinates round-trips unchanged

- test: `packages/token-core/src/serialize.test.ts::round-trips a cubicBezier
  token with out-of-range y-coordinates unchanged (AC-07, spec 011 US3)` (new)
- red: N/A — test passed on first run (`node --test --test-name-pattern
  "round-trips a cubicBezier token" src/serialize.test.ts` -> 1 passed), because
  `token-core`'s generic node parse/serialize path (`parse.ts`/`serialize.ts`)
  already treats every `$value` opaquely regardless of `$type` — there is no
  per-type schema check at that layer to add. Per the loop playbook, applied the
  deliberate-mutant check instead of treating this as done: temporarily changed
  `serialize.ts`'s `raw.$value = node.value;` to
  `raw.$value = Array.isArray(node.value) ? node.value.slice(0, 3) : node.value;`
  (drops the 4th tuple element for any array value). Re-ran the same test ->
  failed with `AssertionError [ERR_ASSERTION]: ... deepStrictEqual` (a diff
  showing the mutated document dropped `1.55`, the 4th tuple element, vs. the
  original). Confirmed the test actually catches this class of regression, then
  reverted `serialize.ts` to its exact original line.
- green: no implementation change was needed (see above) — `node --test
  src/*.test.ts` -> 116 passed, 0 failed after the revert
- refactor: none
- commit: `docs/impl commit below — Cycles 1 and 2 landed together as one
  token-core commit`

## Cycle 3: A1-A4, U15-U21 CubicBezierEditor renders and edits all four coordinates with the x-bound clamped

- test: `packages/token-editor-cubic-bezier/src/components/CubicBezierEditor/CubicBezierEditor.test.tsx`
  (new, 11 tests: labels each field; renders current values; edits P1x/P1y
  within range; clamps P1x/P2x both above 1 and below 0; accepts unclamped
  negative P1y and >1 P2y; a non-numeric input reports 0, not NaN)
- red: `pnpm exec vitest run
  packages/token-editor-cubic-bezier/src/components/CubicBezierEditor/CubicBezierEditor.test.tsx`
  -> `Error: Failed to resolve import "./CubicBezierEditor.tsx" ... Does the
  file exist?` (1 failed suite, 0 tests ran — component didn't exist yet)
- green: created `CubicBezierEditor.module.css` (styled via `--dtcg-ed-*`
  tokens only, copied naming convention from `DimensionEditor.module.css`) and
  `CubicBezierEditor.tsx` (four labeled `<input type="number">` fields, P1x/P2x
  clamped to `[0,1]` via `Math.min(1, Math.max(0, next))`, P1y/P2y unclamped,
  `Number.isNaN` guarded to `0`). Re-ran the same file -> 11 passed, 0 failed.
- refactor: extracted the four fields into a `FIELDS` array of
  `{ index, label, bounded }` objects mapped over in JSX, rather than
  hand-writing four near-identical `<label>` blocks — done inline while
  writing the passing implementation (not as a separate post-green step, since
  the naive four-block version was never committed); re-ran the test file
  after finalizing this shape, still 11 passed.
- commit: `feat(token-editor-cubic-bezier): add CubicBezierEditor component`
  (bundled with T012/T013's contract-wiring/index-export scaffolding, which
  carry no behavior marker of their own — see tasks.md)

## Cycle 4: U22-U23 CubicBezierEditor has no WCAG 2.2 AA violations

- test: `CubicBezierEditor.a11y.test.tsx` (new, 2 tests: a typical value, an
  out-of-range-y/"overshoot" value)
- red: N/A — both tests passed on first run (`pnpm exec vitest run
  .../CubicBezierEditor.a11y.test.tsx` -> 2 passed; a first attempt failed on
  an unrelated Vite dependency-optimization reload, "Failed to fetch
  dynamically imported module" — a documented infra flake, not a code issue;
  the immediate re-run succeeded), since `CubicBezierEditor.tsx` already
  existed from Cycle 3 with correctly labeled inputs. Per the loop playbook,
  applied the deliberate-mutant check: temporarily added `aria-hidden="true"`
  to each field's label `<span>` (removing the input's accessible name).
  Re-ran -> both tests failed with an axe `label` rule violation
  ("Form elements must have labels", target `input[value="..."]`\), for both
  values tested. Confirmed the tests catch this class of regression, then
  reverted the `aria-hidden` change exactly.
- green: no implementation change was needed (see above) — re-ran
  `packages/token-editor-cubic-bezier/src/components/CubicBezierEditor/` (unit
  + a11y) -> 13 passed, 0 failed after the revert
- refactor: none
- commit: `feat(token-editor-cubic-bezier): add CubicBezierEditor component`
  (same commit as Cycle 3 — both landed together as this component's complete
  test suite)

## Cycle 5: A5-A6, U24-U27 CubicBezierPreview renders a short string, or declines on a bad value

- test: `CubicBezierPreview.test.tsx` (new, 4 tests: a typical value, an
  out-of-range-y value, a short array, a non-array value)
- red: `pnpm exec vitest run
  .../CubicBezierPreview/CubicBezierPreview.test.tsx` -> `Error: Failed to
  resolve import "./CubicBezierPreview.tsx" ... Does the file exist?` (1
  failed suite, 0 tests ran)
- green: created `CubicBezierPreview.module.css` (mirrors `ColorPreview.module.css`
  exactly — `--dtcg-ed-font-mono`) and `CubicBezierPreview.tsx`
  (`CubicBezierValueSchema.safeParse` -> `null` on failure, else a `<span>`
  with `cubic-bezier(p1x, p1y, p2x, p2y)` text, mirroring `ColorPreview`'s
  `safeParse`-then-render pattern). Re-ran -> 4 passed, 0 failed.
- refactor: none needed
- commit: `feat(token-editor-*): add CubicBezierPreview component`

## Cycle 6: U28 CubicBezierPreview has no WCAG 2.2 AA violations

- test: `CubicBezierPreview.a11y.test.tsx` (new, 1 test)
- red: N/A — passed on first run (component already existed from Cycle 5).
  Per the loop playbook, applied the deliberate-mutant check: temporarily
  replaced the rendered `<span>` with an `<img src="" />` (no `alt`). Re-ran
  -> failed with an axe `image-alt` rule violation ("Images must have
  alternate text"). Confirmed the test catches this class of regression, then
  reverted to the original `<span>` exactly.
- green: no implementation change needed — re-ran the full package suite
  (`pnpm exec vitest run packages/token-editor-cubic-bezier/`) -> 18 passed, 0
  failed after the revert
- refactor: none
- commit: `feat(token-editor-*): add CubicBezierPreview component` (same
  commit as Cycle 5, plus the `Preview: CubicBezierPreview` contract wiring
  and index export, which carry no behavior marker of their own)

## Cycle 7: U29-U30 cubicBezier is registered as a built-in token type

- test: `apps/web-app/lib/token-editors/built-in.test.ts` (extended: the
  existing "includes both dimension and color" test updated to also expect
  `"cubicBezier"`, since it's a direct, exact-array assertion about
  `BUILT_IN_TOKEN_TYPES`'s contents — not a weakening, an update tracking the
  new built-in type per FR-011; plus one new test,
  "resolveBuiltInContract resolves the cubicBezier contract (spec 011
  U29/U30)")
- red: `pnpm exec vitest run apps/web-app/lib/token-editors/built-in.test.ts`
  -> 2 failed: the array-contents assertion (`deepEqual` diff showing
  `cubicBezier` missing) and `assert.ok(contract)` (`resolveBuiltInContract`
  returned `undefined`)
- green: added `cubicBezier` to `BUILT_IN_TOKEN_TYPES` and a
  `cubicBezier: cubicBezierTokenType as unknown as TokenTypeContract<unknown>`
  entry to `builtInContractsByType` in `apps/web-app/lib/token-editors/built-in.ts`,
  after building `token-editor-cubic-bezier` and adding it as an
  `apps/web-app` dependency via `pnpm --filter @dtcg-editor/web-app add
  "@dtcg-editor/token-editor-cubic-bezier@workspace:*"` (never hand-edited
  `package.json`, per CLAUDE.md). Re-ran -> 3 passed, 0 failed.
- refactor: none needed
- regression found and fixed in the same cycle (per playbook Phase 4 — "a
  real regression, which you fix now as part of this cycle"): registering
  `cubicBezier` as built-in broke two *other* pre-existing tests that
  hard-code counts/behavior tied to `BUILT_IN_TOKEN_TYPES`:
  - `apps/web-app/lib/token-editors/define-config.test.ts`'s two
    `resolved.extensions.length` assertions (2->3, 3->4) — mechanically tied
    to the built-in count, updated to match.
  - `apps/web-app/scripts/generate-large-fixture.test.ts`'s
    "puts one token of every editable dispatch path" test failed because its
    fixture's `exotic` token used `$type: "cubicBezier"` as the
    still-unregistered-type/fallback exemplar — no longer true once
    `cubicBezier` gained a built-in editor. Fixed by changing
    `generate-large-fixture.ts`'s `dispatchShowcase()` to use
    `{ $type: "fontFamily", $value: "Arial" }` instead (a type with no
    built-in editor), and regenerating + `biome format`-ing the committed
    `apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json` fixture (used
    by several Playwright e2e specs) so its `_showcase.exotic` token matches —
    a 2-line diff (`$type`/`$value` only; the rest of the 2,000-token fixture
    is unchanged, same PRNG seed/sequence).
- commit: `feat(web-app): register cubicBezier as a built-in token type`

## Session summary (all 30 behaviors DONE)

- All 7 outer-loop acceptance behaviors (A1-A7) and all 23 inner-loop unit
  behaviors (U1-U30, minus none dropped) are `DONE` as of commit `d8b0ebd`.
  `specs/011-cubicbezier-token-support/tdd/test-list.md` has no remaining
  `PENDING`/`RED`/`GREEN`/`BLOCKED` rows.
- Remaining open `tasks.md` items (T024-T028) carry no behavior marker —
  lint/build/full-suite/quickstart validation, left for `/speckit-implement`.
- Full fast suite (`pnpm exec vitest run`) after Cycle 7: 519/519
  `apps/web-app` unit tests passed, plus the rest of the aggregated
  `test.projects` run green except the one pre-existing, unrelated
  `reference-index.test.ts` wall-clock flake noted at Baseline (not
  re-checked every cycle; targeted per-file/per-package runs were used
  instead, per the stack profile's own guidance).
- `packages/token-core`'s `node --test src/*.test.ts`: 116/116 passed
  (Cycles 1-2).
- `packages/token-editor-cubic-bezier`'s Vitest unit+a11y projects: 18/18
  passed (Cycles 3-6).

## Notes and deviations

- Cycles 1 and 2 are committed together in a single commit
  (`feat(token-core): add cubicBezier value schema`) since Cycle 2 introduced no
  net code change (the mutant was reverted) — only a new test file addition to
  `serialize.test.ts`, alongside Cycle 1's new module. This is a single git
  commit covering two list-row completions, not a merged/skipped cycle.
