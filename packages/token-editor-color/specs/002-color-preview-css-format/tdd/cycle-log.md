# Cycle Log: Color Token Preview CSS-Style Formatting

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite: `pnpm test` -> 68 passed, 5 failed, 10 skipped (`apps/web-app` project); `@dtcg-editor/token-editor-color` (14 tests), `@dtcg-editor/token-core` (101 tests) both fully green
- commit: `a38c355`
- recorded: cycle 0, before any change
- **Baseline is RED, pre-existing and unrelated to this feature.** The 5 failures are all e2e performance/timing and keyboard-navigation flake, none touching color tokens, `ColorPreview`, or `ColorEditor`:
  - `edit-token-references-perf.spec.ts` — Long Task budget (A18)
  - `edit-token-references-perf.spec.ts` — keystroke-to-updated-list p95 latency (SC-004)
  - `editing-perf.spec.ts` — >=100-referrer update budget (A5)
  - `editing-perf.spec.ts` — sustained-typing no-lag budget (A6)
  - `keyboard-navigation.spec.ts` — Tab/Shift+Tab visual-order regression count (A3)
  - Git history already has a dedicated `worktree-fix-editing-perf-ci-flake` branch tracking this class of flake, consistent with this being known, pre-existing, environment/timing-sensitive breakage rather than something this feature introduced.

## Baseline re-check: rebased onto main

- Rebased (fast-forward, no conflicts — this branch was already an ancestor of `main`) onto `main` at the user's request, hoping `3fbc94b fix(root): serialize a11y browser tests into their own sequence group` would clear the baseline.
- suite: `pnpm test` -> 69 passed, 4 failed, 10 skipped. One of the five (`editing-perf.spec.ts` sustained-typing no-lag budget, A6) now passes; the other four remain:
  - `edit-token-references-perf.spec.ts` — Long Task budget (A18)
  - `edit-token-references-perf.spec.ts` — keystroke-to-updated-list p95 latency (SC-004)
  - `editing-perf.spec.ts` — >=100-referrer update budget (A5)
  - `keyboard-navigation.spec.ts` — Tab/Shift+Tab visual-order regression count (A3)
- commit: `3fbc94b`
- **Deliberate deviation from this command's Phase 0 rule, approved explicitly by the user**: asked whether to (a) proceed on this known-red, unrelated baseline with the deviation recorded, or (b) hold until the perf-flake branch lands. User chose (a). The loop proceeds from here with these 4 failures as the accepted baseline — a **new** failure outside this set is this feature's regression; continued failure of exactly these 4 is not, and is not attributed to any cycle below.

## Cycle 1: A1/A2 opened, U1 driven, A1/A2 closed

- **A1/A2 (outer, opened)**: test: `apps/web-app/e2e/edit-token-references.spec.ts::a literal candidate's concrete value is previewed the same way the editor shows that type elsewhere (A7)` (tightened, not new — same test already asserted the swatch's exact `--swatch-color`; the text assertion was loosened to a number-sequence regex that happened to also match JSON)
  - red: `pnpm exec playwright test e2e/edit-token-references.spec.ts -g "a literal candidate's concrete value is previewed the same way the editor shows that type elsewhere"` (run from `apps/web-app`)
    -> `Error: expect(locator).toContainText(expected) failed — Expected substring: "color(srgb 0.2 0.4 0.9)" — Received string: "color.brand.blue{\"colorSpace\":\"srgb\",\"components\":[0.2,0.4,0.9]}..."` (1 failed)
- **U1 (inner, drove the implementation)**: test: `packages/token-editor-color/src/components/ColorPreview/ColorPreview.test.tsx::renders an oklch value with alpha as CSS Color 4 syntax, not JSON` (new)
  - red: `pnpm exec vitest run --project 'packages/token-editor-color:unit' packages/token-editor-color/src/components/ColorPreview/ColorPreview.test.tsx`
    -> `TestingLibraryElementError: Unable to find an element with the text: oklch(0.7 0.1 180 / 0.8)` — DOM showed the swatch's `--swatch-color` already correctly `oklch(0.7 0.1 180 / 0.8)` while the adjacent text span still held the raw JSON (1 failed)
  - green: `packages/token-editor-color/src/components/ColorPreview/ColorPreview.tsx` — replaced `formatRaw()` (`JSON.stringify`) with `ColorValueSchema.safeParse` + `colorValueToCssColor(parsed.data)`, the same call `Swatch` already makes; declines (`null`) on parse failure. Obvious-implementation move, not fake-it: `colorValueToCssColor` already existed and already handled every case this feature needs. Same-package suite -> Vitest 63 passed (was ~62 + this new test), `node --test` 41 passed, both 0 failed.
  - refactor: none needed — the change mirrors `Swatch`'s existing parse pattern exactly; `biome check` and `tsc --noEmit` both clean on the changed files.
- **A1/A2 (outer, closed)**: green: re-ran the same Playwright test after the implementation landed -> 1 passed. Ran the full file (`edit-token-references.spec.ts`, 18 tests) to confirm zero regression in sibling tests whose looser regexes (A8/A9) still happen to match the new CSS text -> 18 passed.
- notes: U1's implementation change also satisfies U2–U6's assertions by construction (colorValueToCssColor already handles every color-space family and the no-alpha case) — those will be written and mutant-verified as their own cycles next, per the playbook's "test passes on first run" path, not re-implemented.
- commit: (recorded below, this entry committed together with the code change)
