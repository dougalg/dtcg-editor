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
- commit: `9602458`

## Cycle 2: U2–U6, each passes on first run — verified with a shared deliberate-mutant check

- Behaviors: U2 (hsl percent channels), U3 (display-p3 `color()` predicate), U4 (lab unbounded a/b), U5 (`"none"` component -> CSS `none`), U6 (no-alpha -> `/` omitted).
- test: `packages/token-editor-color/src/components/ColorPreview/ColorPreview.test.tsx` — one new `test()` per behavior (new), each asserting the exact `colorValueToCssColor` output for its space.
- **Each passed on first run** (the U1 implementation already handles every space): `pnpm exec vitest run --project 'packages/token-editor-color:unit' packages/token-editor-color/src/components/ColorPreview/ColorPreview.test.tsx` -> 6 passed (U1 + U2–U6), 0 failed.
- **Deliberate mutant check** (playbook Step 3, "test passes on first run" path — batched across U2–U6 rather than one mutant per behavior, since all five exercise the identical `cssColor` computation; a batched kill still proves each assertion string is load-bearing, not vacuous): temporarily changed `ColorPreview.tsx`'s `const cssColor = colorValueToCssColor(parsed.data);` to append a stray `"X"`. Re-ran the same command -> **6 failed** (all six, each showing its own expected-vs-actual mismatch, e.g. `Unable to find an element with the text: color(srgb 0.5 0.2 0.8)`), confirming none of the six is vacuous. Restored the line exactly (`git diff` on `ColorPreview.tsx` empty before proceeding) -> 6 passed again.
- green: no implementation change needed — already correct from Cycle 1.
- refactor: none needed; the five new tests follow the same one-`render`-one-`expect` shape as U1's, no duplication beyond the fixture literal each needs.
- commit: `79e54b6`

## Cycle 3: U7 renders a legacy bare-hex string unchanged

- test: `ColorPreview.test.tsx::renders a legacy bare-hex string unchanged` (new)
- **Passed on first run**: `pnpm exec vitest run --project 'packages/token-editor-color:unit' packages/token-editor-color/src/components/ColorPreview/ColorPreview.test.tsx -t "legacy bare-hex"` -> 1 passed (`ColorValueSchema` already accepts a bare `#RRGGBB` string via `LegacyHexColorValueSchema`, and `colorValueToCssColor` already passes a string through unchanged).
- **Deliberate mutant check**: same `+ "X"` mutation as Cycles 1–2 on `ColorPreview.tsx`'s `cssColor` line -> re-ran the same command -> 1 failed (`Unable to find an element with the text: #3366ff`). Restored exactly (`git diff` empty).
- green: no implementation change needed.
- refactor: none needed.
- commit: `d93886b`

## Cycle 4: U8 declines to render for a value that fails color validation

- test: `ColorPreview.test.tsx::declines to render for a value that fails color validation` (new)
- red (test-broken, not behavior-missing — playbook Step 3's "broken test" path): first attempt used `expect(container).toBeEmptyDOMElement()` -> `Error: Invalid Chai property: toBeEmptyDOMElement` (this repo's Vitest setup doesn't register `@testing-library/jest-dom` matchers; its own convention, per `ColorEditor.test.tsx` and others, is `expect(x).toBeNull()`). Fixed the test to `expect(container.firstChild).toBeNull()` before re-running — not counted as behavior evidence, per the playbook's explicit carve-out for a broken-test red.
- **Passed on first run** once fixed: same command with `-t "declines to render"` -> 1 passed (the decline branch already existed, unchanged by Cycles 1–3).
- **Deliberate mutant check**: temporarily replaced the guard `if (!parsed.success)` with `if (false)` (never decline) -> re-ran -> 1 failed, with a React render crash (`colorValueToCssColor` called on data that never actually parsed as a `ColorValue`) rather than a clean assertion mismatch — still a genuine kill: the mutant demonstrably breaks something the test catches. Restored the guard exactly (`git diff` empty, confirmed both by diff and by the full 8-test file re-run: 8 passed).
- green: no implementation change needed.
- refactor: none needed.
- commit: `d93886b`

## Cycle 5: U9 zero axe WCAG 2.2 AA violations

- test: `ColorPreview.a11y.test.tsx::a rendered color preview has no WCAG 2.2 AA violations` (new), following the `ColorFunctionValue.a11y.test.tsx` exemplar's `expectNoViolations` pattern.
- **Passed on first run**: `pnpm exec vitest run --project 'packages/token-editor-color:a11y' packages/token-editor-color/src/components/ColorPreview/ColorPreview.a11y.test.tsx` -> 1 passed.
- **Deliberate mutant check — three attempts, first two false negatives worth recording**:
  1. Gave the text `<span>` `role="button"` with no keyboard handling -> still passed. Axe's automated ruleset doesn't flag a named, roled element for missing keyboard interactivity on its own; not a real kill.
  2. Added `aria-labelledby="does-not-exist"` -> still passed. Not a real kill either (this axe version/ruleset didn't flag the dangling reference automatically here).
  3. Set inline `style={{ color: "#fafafa", backgroundColor: "#ffffff" }}` on the text span (contrast ratio 1.04:1, needs 4.5:1) -> **failed**, `color-contrast` rule, `serious` impact, `wcag2aa`/`wcag143` tags. A genuine kill.
  - Restored the span to its original form after each attempt; final `git diff` on `ColorPreview.tsx` empty, confirmed clean.
  - Noted here rather than silently discarded, per the hard rule against fabricating or reconstructing evidence: attempts 1–2 are not claimed as red evidence for anything, only attempt 3 is.
- green: no implementation change needed (this was always true; the component has no interactive semantics and the design-system's default text color already clears contrast).
- refactor: none needed.
- Full package suite re-run after restoring: `pnpm exec vitest run --project 'packages/token-editor-color:unit' --project 'packages/token-editor-color:a11y'` -> 71 passed, 0 failed.
- commit: `fc30239`

## A4/A5 verification (no new test/code — User Story 2's own point)

- A4/A5 are proved by absence of change, not by a new assertion (spec User Story 2 / tasks.md T008–T009):
  - `ColorEditor` + sibling suites (`ColorFunctionValue`, `ChannelInput`, `ColorSpaceSelect`, `SpaceConversionDialog`): `pnpm exec vitest run --project 'packages/token-editor-color:unit' --project 'packages/token-editor-color:a11y'` scoped to those five components -> 56 passed, 0 failed (matches Phase 1's baseline pass count exactly, per `tasks.md` T001/T008).
  - `git diff --stat main...HEAD -- packages/token-editor-color/src apps/web-app` -> only `ColorPreview/ColorPreview.tsx`, `ColorPreview/ColorPreview.test.tsx`, `ColorPreview/ColorPreview.a11y.test.tsx`, and `apps/web-app/e2e/edit-token-references.spec.ts` — no file under `ColorEditor/` or its siblings appears.
- A4 and A5 marked `DONE` on this evidence. tasks.md T008, T009 ticked.
- commit: `fc30239`

## Session re-entry: /speckit-tdd-verify's remediation (T014, T015)

- `/speckit-tdd-verify` (commit `46bdcec`) found verdict `FAIL` (10 `TEST_AFTER`
  behaviors — explained fully in `tdd/verification.md` as an accepted,
  explained exception, not fixable retroactively) plus two actionable
  findings, appended as `tasks.md` T014/T015. Added `U10`/`U11` to the test
  list to drive them properly.
- Phase 0 baseline re-check at this re-entry: `pnpm test` -> 70 passed, 3
  failed (`edit-token-references-perf.spec.ts` ×2 — A18, SC-004;
  `keyboard-navigation.spec.ts` — A3), 10 skipped. Same class, same specific
  tests, as the standing user-approved deviation from earlier this session
  (see "Baseline re-check: rebased onto main" above) — not re-litigated as a
  new decision; proceeding on that standing approval.
- Both `U10` and `U11` characterize **already-correct existing behavior**
  (the swatch already computes the right CSS color; the no-alpha/hex
  branches already have no a11y issues) — not new behavior to drive. Per the
  playbook's brownfield section, these follow the characterization path
  (write the test, expect it green immediately, verify with a deliberate
  mutant, set state `BASELINE`), not red-green-refactor.
- Split T015's bundled "no-alpha and legacy-hex" description into two
  separate behaviors (`U11`, `U12`) per Hard Rule 1 (one behavior per
  cycle) — the remediation task itself may cover two things, but each gets
  its own test and its own mutant check.

## Cycle 6 (characterization): U10 — swatch/text agreement, pinned

- test: `ColorPreview.test.tsx::the swatch's rendered color matches the adjacent text (SC-002)` (new)
- **Green immediately, as expected for a characterization test** (the behavior already exists and is correct): `pnpm exec vitest run --project 'packages/token-editor-color:unit' packages/token-editor-color/src/components/ColorPreview/ColorPreview.test.tsx -t "SC-002"` -> 1 passed.
- **Deliberate mutant** (this is `tdd/verification.md` Finding #1's exact mutant, reused because it's precisely the bug this test now exists to catch): `<Swatch value={value} />` -> `<Swatch value="#000000" />` in `ColorPreview.tsx`. Re-ran -> 1 failed: `Expected: "--swatch-color: oklch(0.7 0.1 180 / 0.8)" / Received: "--swatch-color: #000000;"`. Restored exactly (`git diff` empty).
- refactor: none needed.
- Full `ColorPreview` suite after restore: 10 passed, 0 failed.
- State: `BASELINE`.
- commit: `ceafe3c`

## Cycle 7 (characterization): U11 — no-alpha branch has no a11y violations

- test: `ColorPreview.a11y.test.tsx::a color preview with no alpha has no WCAG 2.2 AA violations` (new)
- **Green immediately**: `pnpm exec vitest run --project 'packages/token-editor-color:a11y' packages/token-editor-color/src/components/ColorPreview/ColorPreview.a11y.test.tsx -t "no alpha"` -> 1 passed.
- **Deliberate mutant** (the low-contrast style proven reliable during Cycle 5's U9 hunt): text span given `style={{ color: "#fafafa", backgroundColor: "#ffffff" }}` -> re-ran -> 1 failed, `color-contrast` violation. Restored exactly.
- refactor: none needed.
- State: `BASELINE`.
- commit: `ceafe3c`

## Cycle 8 (characterization): U12 — legacy-hex branch has no a11y violations

- test: `ColorPreview.a11y.test.tsx::a legacy bare-hex color preview has no WCAG 2.2 AA violations` (new)
- **Green immediately**: `pnpm exec vitest run --project 'packages/token-editor-color:a11y' packages/token-editor-color/src/components/ColorPreview/ColorPreview.a11y.test.tsx -t "legacy bare-hex"` -> 1 passed.
- **Deliberate mutant**: same low-contrast style -> re-ran -> 1 failed, `color-contrast` violation. Restored exactly.
- refactor: none needed.
- Full `ColorPreview` suite after restore and a `biome check --write` formatting fix (Prettier-equivalent JSX line-wrap, no semantic change): 12 passed, 0 failed.
- State: `BASELINE`.
- commit: `ceafe3c`

## T016 (refactor on green): U10's swatch assertion loosened to whitespace-tolerant

- Closes `tdd/verification.md` (re-run) Finding #5. Not a new behavior — a
  refactor of `U10`'s existing test to match the pattern already established
  in `apps/web-app/e2e/edit-token-references.spec.ts:277-282` for the
  identical check.
- Before: `expect(swatch?.getAttribute("style")).toContain("--swatch-color: oklch(0.7 0.1 180 / 0.8)")`
- After: `expect(swatch?.getAttribute("style")).toMatch(/--swatch-color:\s*oklch\(0\.7 0\.1 180 \/ 0\.8\)/)`
- Confirmed still green after the change:
  `pnpm exec vitest run --project 'packages/token-editor-color:unit' packages/token-editor-color/src/components/ColorPreview/ColorPreview.test.tsx -t "SC-002"` -> 1 passed.
- **Confirmed not weakened**: re-applied the exact `Swatch value={value}` -> `Swatch value="#000000"` mutant from `U10`'s original cycle -> still 1 failed. Restored exactly (`git diff` empty).
- Full `ColorPreview` suite: 12 passed, 0 failed.
- commit: `98f1529`

## T017 (decision, no code behavior change): U11's redundancy — kept, documented

- Closes `tdd/verification.md` (re-run) Finding #6. Decision: **keep** `U11`
  (the no-alpha a11y test) rather than remove it — matches this package's
  established per-variant a11y convention (`ColorFunctionValue.a11y.test.tsx`
  tests alpha-present and alpha-absent separately too), and is a low-cost
  tripwire if the alpha/no-alpha branches ever structurally diverge, even
  though today axe can't distinguish the two renders (both are DOM-identical
  aside from text content).
- Change: added a comment above `U11`'s test explaining this reasoning
  explicitly, so a future reader doesn't have to re-derive it or assume it
  was an oversight.
- Not a behavior change — no test added, removed, or reworded in substance.
  Full `ColorPreview` suite re-confirmed: 12 passed, 0 failed.
- commit: `98f1529`
