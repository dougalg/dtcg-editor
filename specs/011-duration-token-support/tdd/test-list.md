---
feature: 011-duration-token-support
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 7
planned_at: 1c832dd
updated_at: 1c832dd
suite_baseline: green
---

# Test List: Duration Token Support

This feature has no dedicated page/route of its own — its "real entry point" is
the exported component/module surface of a `token-editor-*` package (the same
level `token-editor-dimension`/`token-editor-color` are tested at; neither has a
dedicated Playwright spec per type). The outer loop below is therefore pinned at
that component-export boundary rather than at a Playwright acceptance spec — see
"Out of scope" for why a Playwright spec is not added here.

## Outer loop: acceptance behaviors

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| A1 | Opening a `duration` token in the editor shows a numeric input + unit select (not a JSON textarea) | US1-AC1 | example | DONE | `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.test.tsx::renders the current value and unit` |
| A2 | Changing the value and unit through the editor produces the updated `$value` | US1-AC2 | example | DONE | `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.test.tsx::editing the numeric value calls onChange` |
| A3 | The editor rejects/prevents a negative numeric entry | US1-AC3 | example | DONE | `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.test.tsx::rejects a negative value` |
| A4 | A resolved `{value:200,unit:"ms"}` preview renders as `200ms` | US2-AC1 | example | DONE | `packages/token-editor-duration/src/components/DurationPreview/DurationPreview.test.tsx::renders ms` |
| A5 | A resolved `{value:1,unit:"s"}` preview renders as `1s` | US2-AC2 | example | DONE | `packages/token-editor-duration/src/components/DurationPreview/DurationPreview.test.tsx::renders s` |
| A6 | `duration` appears in `BUILT_IN_TOKEN_TYPES` / the type picker's built-in list | US3-AC1 | example | DONE | `apps/web-app/lib/token-editors/built-in.test.ts::includes duration` |
| A7 | A syntactically valid `duration` token parses/validates successfully and round-trips losslessly | US3-AC2 | example | DONE | `packages/token-core/src/duration.test.ts::accepts a valid ms value` (validation) + existing `packages/token-core/src/serialize.test.ts` round-trip pattern (fidelity) |

## Inner loop: unit behaviors

### `packages/token-core/src/duration.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U1 | Accepts a valid `{value:200,unit:"ms"}` | FR-003 | example | DONE | `duration.test.ts::accepts a valid ms value` |
| U2 | Accepts a valid `{value:0,unit:"s"}` (zero is a valid boundary) | FR-003 | example | DONE | `duration.test.ts::accepts a valid zero s value` |
| U3 | Rejects a negative `value` (boundary just below 0) | FR-003, US1-AC3 | example | DONE | `duration.test.ts::rejects a negative value` |
| U4 | Rejects an unrecognized `unit` (e.g. `"vh"`) | FR-003 | example | DONE | `duration.test.ts::rejects an unsupported unit` |
| U5 | Rejects a missing `unit` | FR-003 | example | DONE | `duration.test.ts::rejects a missing unit` |
| U6 | Rejects a non-numeric `value` | FR-003 | example | DONE | `duration.test.ts::rejects a non-numeric value` |

### `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U7 | Renders the current value and unit | FR-001, FR-002, US1-AC1 | example | DONE | `DurationEditor.test.tsx::renders the current value and unit` |
| U8 | Offers exactly `["ms","s"]` as unit options | FR-002 | example | DONE | `DurationEditor.test.tsx::offers both ms and s units` |
| U9 | Editing the numeric value calls `onChange` with value updated, unit preserved | FR-002, US1-AC2 | example | DONE | `DurationEditor.test.tsx::editing the numeric value calls onChange` |
| U10 | A non-numeric value input is rejected by the number input itself, reporting `0` | FR-002 | example | DONE | `DurationEditor.test.tsx::a non-numeric value input is rejected` |
| U11 | Changing the unit calls `onChange` with unit updated, value preserved | FR-002 | example | DONE | `DurationEditor.test.tsx::changing the unit calls onChange` |
| U12 | A negative numeric entry never reaches `onChange` (boundary at 0, the other side of U2) | FR-003, US1-AC3 | example | DONE | `DurationEditor.test.tsx::rejects a negative value` |
| U13 | Has no WCAG 2.2 AA violations for an `ms` value | Constitution X | example | DONE | `DurationEditor.a11y.test.tsx::has no WCAG 2.2 AA violations` |
| U14 | Has no WCAG 2.2 AA violations for an `s` value | Constitution X | example | DONE | `DurationEditor.a11y.test.tsx::a seconds value has no WCAG 2.2 AA violations` |

### `packages/token-editor-duration/src/components/DurationPreview/DurationPreview.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U15 | Renders `{value:200,unit:"ms"}` as text `"200ms"` | FR-004, US2-AC1 | example | DONE | `DurationPreview.test.tsx::renders ms` |
| U16 | Renders `{value:1,unit:"s"}` as text `"1s"` | FR-004, US2-AC2 | example | DONE | `DurationPreview.test.tsx::renders s` |
| U17 | Renders `{value:1.5,unit:"s"}` as text `"1.5s"` (fractional value) | FR-004 | example | DONE | `DurationPreview.test.tsx::renders a fractional value` |
| U18 | Declines to render (`null`) for a value that fails duration validation | FR-004 | example | DONE | `DurationPreview.test.tsx::declines to render for an invalid value` |
| U19 | Has no WCAG 2.2 AA violations for a rendered preview | Constitution X | example | DONE | `DurationPreview.a11y.test.tsx::has no WCAG 2.2 AA violations` |

### `packages/token-editor-duration/src/token-type.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U20 | `durationTokenType` wires `type: "duration"`, `valueSchema`, `serializeValue` (identity), `Editor`, and `Preview` together | FR-005, FR-006 | example | DONE | covered indirectly by U7-U19 exercising the wired components; no separate test file needed (mirrors `dimensionTokenType`, which also has no dedicated test) |

### `apps/web-app/lib/token-editors/built-in.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U21 | `BUILT_IN_TOKEN_TYPES` includes `"duration"` | FR-005, US3-AC1 | example | DONE | `built-in.test.ts::includes duration` (new, or extend an existing registry test if one already asserts this list) |
| U22 | `resolveBuiltInContract("duration")` returns `durationTokenType` | FR-005 | example | DONE | `built-in.test.ts::resolves the duration contract` |

## Invariants and edge cases still to place

- Round-trip fidelity (Principle IX) for an unmodified `duration` token — placed
  under A7 above via `token-core`'s existing generic round-trip fixture pattern
  (`parse.test.ts`/`serialize.test.ts`), not a new per-type fixture, since that
  pattern is already type-agnostic.

## Out of scope

- A dedicated `apps/web-app/e2e/*.spec.ts` Playwright acceptance spec for
  `duration` specifically: no such spec exists for `dimension` or `color` either
  — the existing e2e suite exercises token editing generically, not per-type. Not
  adding one here keeps parity with the existing precedent rather than introducing
  asymmetric coverage.
- Property-based/mutation testing (`kind: property`): the stack profile records no
  `fast-check`/mutation tool installed; Constitution XIII's deliberate-mutant spot
  check substitutes (tasks.md T025).

## Verification commands

- Single test (token-core): `node --test --test-name-pattern "<name>" packages/token-core/src/duration.test.ts`
- Single test (token-editor-duration, vitest): `pnpm exec vitest run packages/token-editor-duration/src/components/DurationEditor/DurationEditor.test.tsx -t "<name>"`
- Full suite: `pnpm test`
- Fast inner loop (vitest projects only, requires `pnpm build` first): `pnpm exec vitest run`
- Coverage: not configured (`@vitest/coverage-v8` not installed)
- Mutation: not configured (no StrykerJS) — deliberate-mutant spot check substitutes
