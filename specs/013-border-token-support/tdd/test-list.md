---
feature: 013-border-token-support
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 7
planned_at: dd8495e
updated_at: dd8495e
suite_baseline: red
---

# Test List: Border Token Support

Baseline note: `suite_baseline: red` records a pre-existing, feature-unrelated
failure — all 20 `apps/web-app:a11y (chromium)` Vitest Browser Mode projects
fail with `Failed to fetch dynamically imported module` (a dev-server/browser
transport issue, not an assertion failure), independent of any code this
feature touches. Every non-browser-mode project is green: 686/686 tests pass
(`pnpm exec vitest run`, 144/164 files — the 20 failing files are all
pre-existing `*.a11y.test.tsx` under `apps/web-app`, none in a package this
feature adds to or edits), and `packages/token-core`'s `node --test` suite is
154/154 green. This feature's own new a11y tests
(`packages/token-editor-border/**/*.a11y.test.tsx`) are a new package/project,
not one of the 20 pre-existing failures, so this baseline does not block
starting the loop on this feature's own behaviors — but confirming those new
a11y tests actually execute (not silently swallowed by the same transport
issue) is itself part of their red-phase evidence.

Acceptance criteria counted: spec.md's 3 user stories carry 3 + 2 + 2 = 7
acceptance scenarios.

## Outer loop: acceptance behaviors

One per acceptance scenario in `spec.md`. Acceptance runner: this repo's
profile has no Playwright acceptance coverage for individual editor
components (Playwright is reserved for whole-page/keyboard flows per the
constitution's testing tiers) — the real entry point for a `token-editor-*`
package's contract is its own `Editor`/`Preview` component rendered directly,
the same level every sibling package's own acceptance-equivalent tests
operate at (e.g. `DimensionEditor.test.tsx`). Recorded here as `example`
tests against that real entry point (`BorderEditor`/`BorderPreview` directly),
not a unit beneath it.

| id | behavior                                                                                                   | traces  | kind    | state   | test |
| -- | ------------------------------------------------------------------------------------------------------------ | ------- | ------- | ------- | ---- |
| A1 | Changing a border token's width in `BorderEditor` updates the value to the new width, color and style unchanged | US1.1   | example | DONE | `packages/token-editor-border/src/components/BorderEditor/BorderEditor.test.tsx` |
| A2 | Changing a border token's color in `BorderEditor` leaves width and style unchanged in the emitted value        | US1.2   | example | DONE | `packages/token-editor-border/src/components/BorderEditor/BorderEditor.test.tsx` |
| A3 | Changing a border token's style in `BorderEditor` leaves color and width unchanged in the emitted value        | US1.3   | example | DONE | `packages/token-editor-border/src/components/BorderEditor/BorderEditor.test.tsx` |
| A4 | `BorderPreview` renders a resolved border value as one compact line (swatch + width + style text)              | US2.1   | example | PENDING |      |
| A5 | `BorderPreview` declines to render (produces no output) for a value that isn't a valid border shape            | US2.2   | example | PENDING |      |
| A6 | A `border`-typed token with a valid value uses `borderTokenType`'s dedicated `Editor`, not a generic fallback  | US3.1   | example | PENDING |      |
| A7 | `borderTokenType`'s `valueSchema` rejects an invalid border value the same way `BorderValueSchema` does (so the host's existing invalid-value fallback path, not a dedicated `ValidationErrorHandler`, is what activates) | US3.2   | example | PENDING |      |

## Inner loop: unit behaviors

### `packages/token-core/src/border.ts`

| id  | behavior                                                                          | traces      | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------- | ----------- | ------- | ------- | ---- |
| U1  | Accepts a value with a full color-object `color`, valid `width`, named-keyword `style` | FR-001      | example | DONE | `packages/token-core/src/border.test.ts` |
| U2  | Accepts a value with a legacy bare-hex-string `color`                              | FR-001, FR-007 | example | DONE | `packages/token-core/src/border.test.ts` |
| U3  | Accepts a value whose `style` is the custom dash-pattern object form               | FR-001, FR-007 | example | DONE | `packages/token-core/src/border.test.ts` |
| U4  | Rejects a value missing `color`                                                    | FR-001      | example | DONE | `packages/token-core/src/border.test.ts` |
| U5  | Rejects a value missing `width`                                                    | FR-001      | example | DONE | `packages/token-core/src/border.test.ts` |
| U6  | Rejects a value missing `style`                                                    | FR-001      | example | DONE | `packages/token-core/src/border.test.ts` |
| U7  | Rejects a value whose `width` is not a valid `DimensionValue` (e.g. missing `unit`) | FR-001, FR-007 | example | DONE | `packages/token-core/src/border.test.ts` |
| U8  | Rejects a value whose `color` is not a valid `ColorValue` (e.g. wrong-length hex)   | FR-001, FR-007 | example | DONE | `packages/token-core/src/border.test.ts` |
| U9  | Rejects a value whose `style` is not a valid `StrokeStyleValue` (e.g. unrecognized keyword) | FR-001, FR-007 | example | DONE | `packages/token-core/src/border.test.ts` |

### `packages/token-editor-border/src/components/BorderEditor/BorderEditor.tsx`

| id  | behavior                                                                                          | traces        | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------- | ------------- | ------- | ------- | ---- |
| U10 | Renders the embedded `ColorEditor`, `DimensionEditor`, and `StrokeStyleEditor` with each sub-field's current value | FR-002        | example | DONE | `BorderEditor.test.tsx` |
| U11 | Changing only the width control calls `onChange` with `width` updated and `color`/`style` deep-equal to their originals | FR-002, FR-003 | example | DONE | `BorderEditor.test.tsx` |
| U12 | Changing only the color control calls `onChange` with `color` updated and `width`/`style` deep-equal to their originals | FR-002, FR-003 | example | DONE | `BorderEditor.test.tsx` |
| U13 | Changing only the style control calls `onChange` with `style` updated and `color`/`width` deep-equal to their originals | FR-002, FR-003 | example | DONE | `BorderEditor.test.tsx` |
| U14 | Composes correctly when `style` starts as the custom dash-pattern object form, not just a named keyword | FR-002, edge case | example | DONE | `BorderEditor.test.tsx` |
| U15 | Has zero WCAG 2.2 AA violations (axe-core) for a representative border value                     | Principle X   | example | DONE | `BorderEditor.a11y.test.tsx` |

### `packages/token-editor-border/src/components/BorderPreview/BorderPreview.tsx`

| id  | behavior                                                                                          | traces      | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------- | ----------- | ------- | ------- | ---- |
| U16 | Renders an embedded `ColorPreview` plus width/style text for a valid border value                | FR-004      | example | PENDING |      |
| U17 | Renders correctly when `style` is the custom dash-pattern object form                            | FR-004, edge case | example | PENDING |      |
| U18 | Declines to render for a value missing one of `color`/`width`/`style`                             | FR-005, edge case | example | PENDING |      |
| U19 | Declines to render when `width` is present but not a valid `DimensionValue`, even though `color`/`style` are valid | FR-005, edge case | example | PENDING |      |
| U20 | Declines to render when `color` is present but not a valid `ColorValue`                          | FR-005      | example | PENDING |      |
| U21 | Declines to render when `style` is present but not a valid `StrokeStyleValue`                    | FR-005      | example | PENDING |      |
| U22 | Declines to render for a completely unrelated shape (e.g. a plain number)                        | FR-005      | example | PENDING |      |
| U23 | Has zero WCAG 2.2 AA violations (axe-core) for a representative valid border value                | Principle X | example | PENDING |      |

### `packages/token-editor-border/src/token-type.ts`

| id  | behavior                                                                          | traces          | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------- | --------------- | ------- | ------- | ---- |
| U24 | `borderTokenType.type` is `"border"`                                             | FR-006          | example | PENDING |      |
| U25 | `borderTokenType.valueSchema` accepts/rejects the same fixtures as U1-U9 (it *is* `BorderValueSchema`) | FR-001, FR-006 | example | PENDING |      |
| U26 | `borderTokenType.serializeValue` returns its input unchanged (identity) for a valid `BorderValue` | FR-007, Principle IX | example | PENDING |      |
| U27 | `borderTokenType.Editor`/`Preview` are the `BorderEditor`/`BorderPreview` functions | FR-006          | example | PENDING |      |

### `apps/web-app/lib/token-editors/built-in.ts`

| id  | behavior                                                                          | traces | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------- | ------ | ------- | ------- | ---- |
| U28 | `resolveBuiltInContract("border")` returns `borderTokenType`                     | FR-006 | example | PENDING |      |
| U29 | `BUILT_IN_TOKEN_TYPES` includes `"border"`, and `builtInExtensions` has a `{ type: "border", editor: BorderEditor }` entry | FR-006 | example | PENDING |      |

## Invariants and edge cases still to place

- None outstanding — every edge case from spec.md's Edge Cases section is
  covered above (U3/U14/U17 for custom dash-pattern `style`; U2 for legacy
  hex `color`; U18-U22 for partial/invalid resolved-reference shapes).

## Out of scope

- A dedicated `ValidationErrorHandler` for `border` — spec.md's Assumptions
  explicitly defer to the host's existing generic invalid-value fallback;
  see A7.
- Any change to `packages/token-editor-contract` or the sibling
  `token-editor-color`/`token-editor-dimension`/`token-editor-stroke-style`
  packages' own internals — this feature only consumes their existing
  exports (out of scope per plan.md/the task brief).
- Whole-page/keyboard Playwright acceptance coverage — no such tier exists
  per-component in this repo; see the Outer loop section's note above.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md`:

- Single test (web-app stack, `node-packages` stack for `token-core`):
  - web-app stack: `pnpm exec vitest run {file} -t "{name}"`
  - node-packages stack: `node --test --test-name-pattern "{name}" {file}`
- Full suite: `pnpm test`
- Fast inner-loop subset (vitest projects only, requires `pnpm build` first):
  `pnpm exec vitest run`
- `packages/token-core` package suite: `node --test src/*.test.ts` (run from
  `packages/token-core`)
- `packages/token-editor-border` package suite (once scaffolded):
  `node --test src/*.test.ts` (run from `packages/token-editor-border`) for
  any React-free `.test.ts` files; JSX-rendering `.test.tsx`/`.a11y.test.tsx`
  files run only via the aggregated `pnpm exec vitest run` (root
  `vitest.config.mts`), once the package is added to its `packages` array.
- Coverage: not configured (`@vitest/coverage-v8` not installed).
- Mutation: not configured — deliberate-mutant spot check applies per
  `.specify/memory/tdd-profile.md`.
