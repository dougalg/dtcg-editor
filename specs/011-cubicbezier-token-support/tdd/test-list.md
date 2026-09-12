---
feature: 011-cubicbezier-token-support
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 7
planned_at: 6c6dd26
updated_at: d8b0ebd
suite_baseline: red
---

# Test List: cubicBezier Token Support

`suite_baseline: red` is a pre-existing, unrelated flake, not caused by this
feature: `apps/web-app/lib/tokens/reference-index.test.ts`'s wall-clock benchmark
("builds the reference index for 5,000 tokens ... under 50ms", SC-010) took
129ms instead of <50ms under full-suite CPU contention (704 other tests
running concurrently across jsdom/browser projects on this machine). All other
703 tests passed. This feature never touches `lib/tokens/reference-index.ts` or
its test. The loop below does not start on top of *this* feature's own red — it
starts on top of an unrelated, timing-sensitive pre-existing test. Re-run
targeted/`vitest run <file>` commands are used for the actual TDD loop (per the
stack profile's exit-code-caveat note), not the full contended suite, for exactly
this reason.

## Outer loop: acceptance behaviors

One per acceptance criterion (spec.md's Acceptance Scenarios, numbered
`US<story>.<n>`) in `spec.md` order. Each stays red until the feature works
end-to-end through its real entry point: the exported `Editor`/`Preview`
components and the `token-core` schema they're built on (this feature ships
library packages consumed by the host app, not a page of its own — the
"real entry point" for a `token-editor-*` package, per this repo's own
precedent in `token-editor-dimension`'s test suite, is rendering the exported
component directly with `@testing-library/react`, the same way
`DimensionEditor.test.tsx` does; there is no separate page/route this feature
adds to `apps/web-app` to exercise end-to-end via Playwright).

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| A1 | `CubicBezierEditor` shows all four control-point values pre-filled, not the JSON fallback | US1.1 | example | DONE | `packages/token-editor-cubic-bezier/src/components/CubicBezierEditor/CubicBezierEditor.test.tsx::renders the current value in four labeled fields` |
| A2 | Editing P1y updates only that coordinate in the emitted value | US1.2 | example | DONE | `CubicBezierEditor.test.tsx::editing P1y calls onChange with only that coordinate changed` |
| A3 | Setting P1x above 1 never reaches the emitted value as `>1` | US1.3 | example | DONE | `CubicBezierEditor.test.tsx::setting P1x above 1 clamps to 1` |
| A4 | Setting P1x below 0 never reaches the emitted value as `<0` | US1.4 | example | DONE | `CubicBezierEditor.test.tsx::setting P1x below 0 clamps to 0` |
| A5 | `CubicBezierPreview` renders a short readable string for a valid resolved value | US2.1 | example | DONE | `packages/token-editor-cubic-bezier/src/components/CubicBezierPreview/CubicBezierPreview.test.tsx::renders a cubic-bezier(...) string for a valid value` |
| A6 | `CubicBezierPreview` renders nothing for a value that isn't a valid cubicBezier tuple | US2.2 | example | DONE | `CubicBezierPreview.test.tsx::renders nothing for a malformed value` |
| A7 | A `cubicBezier` token with out-of-range y-coordinates round-trips through parse -> serialize unchanged | US3.1, US3.2 | example | DONE | `packages/token-core/src/serialize.test.ts::round-trips a cubicBezier token with out-of-range y-coordinates unchanged (AC-07, spec 011 US3)` |

## Inner loop: unit behaviors

### `packages/token-core/src/cubic-bezier.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U1 | Accepts a valid 4-tuple with in-range x-coordinates | FR-001 | example | DONE | `cubic-bezier.test.ts::accepts a valid tuple` |
| U2 | Accepts P1x exactly at the lower boundary `0` | FR-002 | example | DONE | `cubic-bezier.test.ts::accepts P1x at 0` |
| U3 | Accepts P1x exactly at the upper boundary `1` | FR-002 | example | DONE | `cubic-bezier.test.ts::accepts P1x at 1` |
| U4 | Rejects P1x just below the lower boundary (e.g. `-0.0001`) | FR-002 | example | DONE | `cubic-bezier.test.ts::rejects P1x below 0` |
| U5 | Rejects P1x just above the upper boundary (e.g. `1.0001`) | FR-002 | example | DONE | `cubic-bezier.test.ts::rejects P1x above 1` |
| U6 | Accepts P2x exactly at the lower boundary `0` | FR-002 | example | DONE | `cubic-bezier.test.ts::accepts P2x at 0` |
| U7 | Accepts P2x exactly at the upper boundary `1` | FR-002 | example | DONE | `cubic-bezier.test.ts::accepts P2x at 1` |
| U8 | Rejects P2x just below the lower boundary | FR-002 | example | DONE | `cubic-bezier.test.ts::rejects P2x below 0` |
| U9 | Rejects P2x just above the upper boundary | FR-002 | example | DONE | `cubic-bezier.test.ts::rejects P2x above 1` |
| U10 | Accepts a large negative P1y (overshoot easing) | FR-003 | example | DONE | `cubic-bezier.test.ts::accepts a negative P1y` |
| U11 | Accepts a P2y greater than 1 (bounce easing) | FR-003 | example | DONE | `cubic-bezier.test.ts::accepts a P2y greater than 1` |
| U12 | Rejects a tuple with 3 elements | Edge case (spec.md) | example | DONE | `cubic-bezier.test.ts::rejects a 3-element array` |
| U13 | Rejects a tuple with 5 elements | Edge case (spec.md) | example | DONE | `cubic-bezier.test.ts::rejects a 5-element array` |
| U14 | Rejects a tuple containing a non-numeric entry | Edge case (spec.md) | example | DONE | `cubic-bezier.test.ts::rejects a non-numeric entry` |

### `packages/token-editor-cubic-bezier/src/components/CubicBezierEditor/CubicBezierEditor.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U15 | Renders four fields labeled P1x/P1y/P2x/P2y | FR-005 | example | DONE | `CubicBezierEditor.test.tsx::labels each of the four fields` |
| U16 | Editing P1x within range (e.g. `0.6`) commits that exact value | FR-008 | example | DONE | `CubicBezierEditor.test.tsx::editing P1x within range commits it exactly` |
| U17 | Editing P2x above 1 clamps to 1 | FR-006 | example | DONE | `CubicBezierEditor.test.tsx::setting P2x above 1 clamps to 1` |
| U18 | Editing P2x below 0 clamps to 0 | FR-006 | example | DONE | `CubicBezierEditor.test.tsx::setting P2x below 0 clamps to 0` |
| U19 | Editing P2y accepts a value greater than 1 unclamped | FR-007 | example | DONE | `CubicBezierEditor.test.tsx::editing P2y accepts a value greater than 1` |
| U20 | Editing P1y accepts a negative value unclamped | FR-007 | example | DONE | `CubicBezierEditor.test.tsx::editing P1y accepts a negative value` |
| U21 | A non-numeric typed value does not crash and does not commit `NaN` | Edge case (spec.md) | example | DONE | `CubicBezierEditor.test.tsx::a non-numeric value does not commit NaN` |
| U22 | Has no WCAG 2.2 AA violations for a typical value | Constitution Principle X | example | DONE | `CubicBezierEditor.a11y.test.tsx::has no WCAG 2.2 AA violations` |
| U23 | Has no WCAG 2.2 AA violations for an out-of-range-y value | Constitution Principle X | example | DONE | `CubicBezierEditor.a11y.test.tsx::an overshoot value has no WCAG 2.2 AA violations` |

### `packages/token-editor-cubic-bezier/src/components/CubicBezierPreview/CubicBezierPreview.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U24 | Renders `cubic-bezier(a, b, c, d)`-style text for a valid value | FR-009 | example | DONE | `CubicBezierPreview.test.tsx::renders a cubic-bezier(...) string for a valid value` |
| U25 | Renders the same for an extreme-but-valid (negative/`>1` y) value | FR-009 | example | DONE | `CubicBezierPreview.test.tsx::renders text for an out-of-range-y value` |
| U26 | Renders nothing for a 3-element array | FR-010 | example | DONE | `CubicBezierPreview.test.tsx::renders nothing for a short array` |
| U27 | Renders nothing for a non-array value (string/object) | FR-010 | example | DONE | `CubicBezierPreview.test.tsx::renders nothing for a non-array value` |
| U28 | Has no WCAG 2.2 AA violations | Constitution Principle X | example | DONE | `CubicBezierPreview.a11y.test.tsx::has no WCAG 2.2 AA violations` |

### `apps/web-app/lib/token-editors/built-in.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U29 | `BUILT_IN_TOKEN_TYPES` includes `"cubicBezier"` | FR-011 | example | DONE | `built-in.test.ts::includes cubicBezier in BUILT_IN_TOKEN_TYPES` |
| U30 | `resolveBuiltInContract("cubicBezier")` returns a contract of that type | FR-011 | example | DONE | `built-in.test.ts::resolves the cubicBezier contract` |

## Invariants and edge cases still to place

- None outstanding — every edge case named in `spec.md` is placed on a component
  above (U4/U5/U8/U9 for the x-bound; U10/U11/U19/U20 for unconstrained y;
  U12/U13/U14 for tuple-shape errors; U21 for a non-numeric editor input;
  U26/U27 for the Preview's decline case).

## Out of scope

- A live SVG curve-preview rendering: `plan.md`'s research.md records this as
  deliberately deferred past v1 (cosmetic, no FR/SC backs it) — no test needed.
- Wiring `cubicBezier` as a sub-field of a composite `transition` token's editor:
  `spec.md`'s Assumptions section marks this out of scope for this feature.
- A `@playwright/test` acceptance spec exercising the running app's tree UI:
  this feature ships library-package components with no new `apps/web-app`
  page/route of their own; the outer-loop behaviors above already exercise the
  real entry point available to this feature (the exported components), matching
  `token-editor-dimension`'s own precedent (which likewise has no dedicated
  Playwright spec).

## Verification commands

Copied from `.specify/memory/tdd-profile.md` (`web-app`/`node-packages` stacks):

- Single test (vitest, e.g. `token-editor-cubic-bezier`):
  `pnpm exec vitest run <file> -t "<name>"`
- Single test (node:test, `token-core`):
  `node --test --test-name-pattern "<name>" <file>`
- Full file (either stack, safer when a test name isn't settled yet):
  `pnpm exec vitest run <file>` / `node --test <file>`
- Full suite (CI gate): `pnpm test`
- Inner-loop fast subset (vitest projects only, requires `pnpm build` first):
  `pnpm exec vitest run`
- Coverage: not available (`@vitest/coverage-v8` not installed)
- Mutation: not available (no StrykerJS) — deliberate-mutant spot check instead
