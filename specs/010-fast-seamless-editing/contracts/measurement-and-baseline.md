# Contract: Measurement & Baseline

Maps to spec NFR-001, NFR-002, FR-015 and SC-008. Defines the automated guards that keep
the guarantees from regressing, and the baseline record.

## C-MB-1 — Edit-echo latency is guarded automatically

An `e2e/editing-perf.spec.ts` Playwright test, run against the production build
(`pnpm run start`, per `playwright.config.ts`), MUST:
- perform a real commit on the large fixture and measure `commit → value visible` with
  `performance.now()` deltas around `page.evaluate`d DOM reads;
- record the number via `testInfo.annotations.push({ type: "perf", description: ... })`
  (pattern from `e2e/color-editor-perf.spec.ts`);
- fail if the measured value exceeds **100 ms** (with a documented CI safety margin) **or**
  exceeds the recorded baseline for that interaction.

## C-MB-2 — Typing lag is guarded automatically

The same spec MUST type a burst into a field and assert no dropped characters and per-frame
echo (SC-006 / C-RI-2).

## C-MB-3 — Zero out-of-region layout shift is guarded automatically

An `e2e/render-stability.spec.ts` Playwright test MUST, using a `PerformanceObserver` for
`layout-shift` entries collected in-page (helper: `e2e/support/stability.ts`):
- run three interactions on the large fixture: (a) type + commit an edit, (b) full
  tab-through, (c) commit an edit to a token referenced by ≥ 100 others;
- assert that every observed shift's `sources` are confined to the actively edited field
  and its own error slot — any shift attributed to another row, a group header, the Save
  button, or page chrome fails the test (SC-002, SC-004).

## C-MB-4 — Row-render isolation is guarded at component level

A component test (`TreeTokenNode.test.tsx` or a new `useStagedEdits.test.tsx`) MUST render a
multi-row tree with a per-row render counter, type into one row, and assert every other
row's render count is unchanged (C-RI-1). A matching `*.a11y.test.tsx` asserts `axe` clean
during and after the interaction.

## C-MB-5 — Keyboard flow is guarded at e2e level

`e2e/keyboard-navigation.spec.ts` MUST be extended to run the full tab-through + visible
focus-indicator assertions over the **large** fixture (not only the small ones), covering
C-KL-2 / C-KL-3 / C-KL-7 at scale.

## C-MB-6 — Baseline record exists and is referenced

`specs/010-fast-seamless-editing/baseline.md` MUST be committed, containing a table of
`interaction → before (ms) → after (ms) → budget → pass/fail`, with "before" captured on the
pre-change code and "after" captured on the finished feature. FR-015's "documented measured
baseline the app is held to" is satisfied by this file. The perf specs reference these
numbers as their regression ceiling.

## C-MB-7 — Large fixture is generated, valid, and deterministic

`apps/web-app/scripts/generate-large-fixture.ts` MUST emit
`apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json`: ~2,000 tokens, nested groups,
deterministic output for a fixed seed, at least one token referenced by ≥ 100 others, and
loadable by the existing token route with no parse error (INV-11). The generator is run
once and its output committed; it is not run in CI.

## Out of scope for measurement

- Absolute frame-rate / jank profiling beyond the per-interaction budgets above.
- Page-level Cumulative Layout Shift as a single number (the per-region `sources` assertion
  in C-MB-3 is stricter and is what the spec requires).
- Documents larger than 2,000 tokens (SC-007 ceiling).
