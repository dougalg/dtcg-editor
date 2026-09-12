---
feature: 011-font-weight-token-support
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 7
planned_at: 7b8a554
updated_at: 7b8a554
suite_baseline: red
---

# Test List: Font Weight Token Editor Support

**Note on `suite_baseline: red`**: the full CI gate (`pnpm test`, which includes
Playwright e2e) has 3 pre-existing failures unrelated to this feature — two
wall-clock performance budget flakes in `e2e/edit-token-references-perf.spec.ts`
(A18/SC-004) and one focus-order flake in `e2e/keyboard-navigation.spec.ts` (A3).
These predate this feature (an open backlog item, "fix editing perf CI flake",
already tracks them in a separate worktree) and are not touched by this work. The
subset this feature actually exercises — `pnpm exec vitest run` (704/704 passed)
and `pnpm --filter @dtcg-editor/token-core test` (101/101 passed) — is fully
green at baseline. The loop below starts from that green subset baseline, not on
top of the unrelated e2e reds.

This package has no dedicated Playwright acceptance layer of its own (neither
does `token-editor-dimension` nor `token-editor-color` — per-type editors are
validated at the component-render tier, which is the real entry point a
`token-editor-*` package owns; the host app's generic wiring, which this feature
only registers into, already has its own coverage). The outer loop below therefore
treats each component's rendered behavior (`@testing-library/react`) as the
acceptance tier for this feature, consistent with the existing precedent.

## Outer loop: acceptance behaviors

One per acceptance scenario in `spec.md`. Each stays red until the feature works
through its real entry point (the rendered `Editor`/`Preview` component, or the
host's built-in-type registry for A1).

| id  | behavior                                                                                          | traces               | kind    | state   | test                                                                                            |
| --- | -------------------------------------------------------------------------------------------------- | --------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------ |
| A1  | `fontWeight` is a registered built-in type, so the host stops routing it to the JSON fallback       | AC 1.1, FR-001        | example | DONE    | `apps/web-app/lib/token-editors/built-in.test.ts::BUILT_IN_TOKEN_TYPES includes dimension, color, and fontWeight` |
| A2  | Changing the editor's value updates the token's `$value` to the new integer                         | AC 1.2, FR-003, FR-006 | example | DONE    | `FontWeightEditor.test.tsx::editing the numeric value calls onChange with the updated integer` |
| A3  | An out-of-range or non-numeric value entered in the editor is not committed                         | AC 1.3, FR-004        | example | DONE    | `FontWeightEditor.test.tsx::entering an out-of-range integer does not call onChange` (+ non-numeric/non-integer cases) |
| A4  | A numeric `fontWeight` value shows as readable text in a reference/candidate preview                | AC 2.1, FR-005        | example | PENDING | `packages/token-editor-font-weight/.../FontWeightPreview.test.tsx::renders a numeric value`        |
| A5  | An alias `fontWeight` value shows as readable text in a reference/candidate preview                 | AC 2.2, FR-005        | example | PENDING | `packages/token-editor-font-weight/.../FontWeightPreview.test.tsx::renders an alias value`         |
| A6  | Selecting a keyword alias in the editor writes that exact string as `$value`                        | AC 3.1, FR-007        | example | PENDING | `packages/token-editor-font-weight/.../FontWeightEditor.test.tsx::alias selection calls onChange`  |
| A7  | Loading a token whose `$value` is already an alias shows that alias selected, not a raw number      | AC 3.2, FR-007        | example | PENDING | `packages/token-editor-font-weight/.../FontWeightEditor.test.tsx::reflects existing alias`         |

## Inner loop: unit behaviors

### `packages/token-core/src/font-weight.ts`

| id  | behavior                                                            | traces  | kind    | state   | test                                                          |
| --- | -------------------------------------------------------------------- | ------- | ------- | ------- | -------------------------------------------------------------- |
| U1  | Accepts the integer lower boundary, `1`                              | FR-002  | example | DONE    | `packages/token-core/src/font-weight.test.ts::accepts the integer lower boundary, 1` |
| U2  | Accepts the integer upper boundary, `1000`                           | FR-002  | example | DONE    | `packages/token-core/src/font-weight.test.ts::accepts the integer upper boundary, 1000` |
| U3  | Accepts a mid-range integer, `400`                                   | FR-002  | example | DONE    | `packages/token-core/src/font-weight.test.ts::accepts a mid-range integer, 400` |
| U4  | Accepts every one of the 18 documented keyword aliases                | FR-002  | example | DONE    | `packages/token-core/src/font-weight.test.ts::accepts every one of the 18 documented keyword aliases` |
| U5  | Rejects `0`, just below the lower boundary                           | FR-002  | example | DONE    | `packages/token-core/src/font-weight.test.ts::rejects 0, just below the lower boundary` |
| U6  | Rejects `1001`, just above the upper boundary                        | FR-002  | example | DONE    | `packages/token-core/src/font-weight.test.ts::rejects 1001, just above the upper boundary` |
| U7  | Rejects a non-integer number, `400.5`                                 | FR-002  | example | DONE    | `packages/token-core/src/font-weight.test.ts::rejects a non-integer number, 400.5` |
| U8  | Rejects an unrecognized string, `"extra-bold-ish"`                    | FR-002  | example | DONE    | `packages/token-core/src/font-weight.test.ts::rejects an unrecognized string, extra-bold-ish` |
| U9  | Rejects a non-string/non-number shape (an object)                     | FR-002  | example | DONE    | `packages/token-core/src/font-weight.test.ts::rejects a non-string/non-number shape, an object` |

### `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.tsx`

| id  | behavior                                                                                  | traces         | kind    | state   | test                                                                        |
| --- | -------------------------------------------------------------------------------------------| -------------- | ------- | ------- | ----------------------------------------------------------------------------- |
| U10 | Renders the current numeric value in a labeled number input with `min=1 max=1000 step=1`  | FR-003         | example | DONE    | `FontWeightEditor.test.tsx::renders the current value in a number input with the DTCG range attributes` |
| U11 | Editing the numeric value calls `onChange` with the updated integer                       | FR-003, AC 1.2 | example | DONE    | `FontWeightEditor.test.tsx::editing the numeric value calls onChange with the updated integer` |
| U12 | Entering a non-numeric value does not call `onChange`                                     | FR-004         | example | DONE    | `FontWeightEditor.test.tsx::entering a non-numeric value does not call onChange` / `::entering a non-integer numeric value does not call onChange` |
| U13 | Entering an out-of-range integer (e.g. `1001` or `0`) does not call `onChange`             | FR-004         | example | DONE    | `FontWeightEditor.test.tsx::entering an out-of-range integer does not call onChange` |
| U14 | Has no WCAG 2.2 AA violations for a numeric value                                          | Principle X    | example | DONE    | `FontWeightEditor.a11y.test.tsx::has no WCAG 2.2 AA violations`              |

### `packages/token-editor-font-weight/src/components/FontWeightPreview/FontWeightPreview.tsx`

| id  | behavior                                                             | traces  | kind    | state   | test                                                                |
| --- | ----------------------------------------------------------------------| ------- | ------- | ------- | --------------------------------------------------------------------- |
| U15 | Renders `"700"` for a numeric value `700`                            | FR-005  | example | PENDING | `FontWeightPreview.test.tsx::renders a numeric value`               |
| U16 | Renders `"bold"` for the alias value `"bold"`                        | FR-005  | example | PENDING | `FontWeightPreview.test.tsx::renders an alias value`                |
| U17 | Renders nothing (`null`) for a value that fails schema validation    | FR-005  | example | PENDING | `FontWeightPreview.test.tsx::declines to render an invalid value`   |
| U18 | Has no WCAG 2.2 AA violations for both a numeric and an alias value  | Principle X | example | PENDING | `FontWeightPreview.a11y.test.tsx::has no WCAG 2.2 AA violations`    |

### `apps/web-app/lib/token-editors/built-in.ts`

| id  | behavior                                                          | traces  | kind    | state   | test                                                                     |
| --- | -------------------------------------------------------------------| ------- | ------- | ------- | --------------------------------------------------------------------------- |
| U23 | `BUILT_IN_TOKEN_TYPES` includes `"fontWeight"` alongside dimension/color | FR-001  | example | DONE    | `built-in.test.ts::BUILT_IN_TOKEN_TYPES includes dimension, color, and fontWeight` |

### `packages/token-editor-font-weight/src/components/FontWeightEditor/FontWeightEditor.tsx` — keyword-alias picker (nice-to-have, Phase 5)

> FR-007 is a SHOULD, not a MUST (spec.md Assumption 1) — these behaviors are
> valuable but the feature is complete without them; see `plan.md`'s Design
> Decisions.

| id  | behavior                                                                           | traces        | kind    | state   | test                                                              |
| --- | -------------------------------------------------------------------------------------| ------------- | ------- | ------- | -------------------------------------------------------------------- |
| U19 | An alias picker is present, offering all 18 aliases plus a "custom number" option    | FR-007        | example | PENDING | `FontWeightEditor.test.tsx::offers an alias picker`               |
| U20 | Given an alias `$value`, the picker reflects that alias rather than a raw number     | FR-007, AC 3.2 | example | PENDING | `FontWeightEditor.test.tsx::reflects existing alias`              |
| U21 | Selecting a different alias calls `onChange` with that exact string                 | FR-007, AC 3.1 | example | PENDING | `FontWeightEditor.test.tsx::alias selection calls onChange`       |
| U22 | Has no WCAG 2.2 AA violations when an alias value is selected                       | Principle X    | example | PENDING | `FontWeightEditor.a11y.test.tsx::alias value has no violations`   |

## Invariants and edge cases still to place

- FR-006 (round-trip losslessness of an untouched `$value`) requires no new test:
  `token-core`'s `parse.ts`/`serialize.ts` treat every `$value` as opaque JSON
  regardless of `$type` (per-type validation happens only at the editor-contract
  layer, not the generic parse/serialize layer), and `serializeValue: (value) =>
  value` is the identity function — the existing generic round-trip test suite
  (Principle IX) already covers this for any `$value` shape, fontWeight's
  included. No fixture-level addition needed.

## Out of scope

- A dedicated Playwright acceptance spec for `fontWeight` specifically: neither
  `token-editor-dimension` nor `token-editor-color` has one; per-type editor
  behavior is validated at the component tier (see note above the Outer loop
  table).
- Numeric ⇄ alias translation in `Preview` or `Editor`: explicitly rejected in
  `plan.md`'s Design Decisions — out of scope by design, not an oversight.
- Reference-resolution/circular-reference mechanics for a token that references a
  `fontWeight` token: unchanged generic behavior, already covered by
  `resolve-reference.test.ts` et al.

## Verification commands

Copied from `.specify/memory/tdd-profile.md`:

- Single test (web-app/token-editor-* stack): `pnpm exec vitest run <file> -t "<name>"`
- Single test (token-core, node:test): `node --test --test-name-pattern "<name>" <file>`
- Full suite (fast, this feature's relevant subset): `pnpm exec vitest run` and
  `pnpm --filter @dtcg-editor/token-core test`
- Full suite (CI gate, includes unrelated pre-existing e2e reds): `pnpm test`
- Coverage: not configured (`@vitest/coverage-v8` not installed)
- Mutation: not configured — deliberate-mutant spot check applies per
  `.specify/memory/tdd-profile.md`
