---
feature: 013-number-token-support
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 6
planned_at: 33cb73d
updated_at: 33cb73d
suite_baseline: red
---

# Test List: Number Token Editor Support

`suite_baseline: red` — see "Notes and deviations" in `tdd/cycle-log.md`'s Baseline entry: the
pre-existing red is 21 `apps/web-app:a11y` test files failing to import (a real-Chromium
browser-mode startup/module-fetch issue in this sandboxed environment, unrelated to any
`apps/web-app` source change) plus one pre-existing wall-clock benchmark flake
(`reference-index.test.ts`, 51.10ms vs a 50ms budget — a timing-sensitive SC-010 guard, not a
correctness test). Neither touches this feature's files (`packages/token-core`,
`packages/token-editor-number`, or the two registration edits). `packages/token-core`'s own
`node:test` suite is green (154/154) at baseline. The loop below must not introduce any *new*
red beyond these two pre-existing ones.

## Outer loop: acceptance behaviors

One per acceptance criterion in `spec.md`. Each stays red until the feature works end to end
through its real entry point. This repository's acceptance runner is Playwright
(`apps/web-app/e2e/`, real running app) per the stack profile; a `number` token's dedicated
editor/preview is small enough that this feature relies on the existing
`apps/web-app/lib/token-editors/built-in.test.ts` registration test plus manual
`quickstart.md` verification as its real-entry-point evidence, matching `token-editor-font-weight`'s
precedent (that feature also had no new Playwright spec of its own) — recorded here explicitly
rather than silently assumed.

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| A1 | A `number` token selected in the editor shows a dedicated editor control, not the generic JSON fallback | AC-1.1 | example | DONE | `built-in.test.ts::resolveBuiltInContract('number') returns the number contract` + manual run: DOM shows `<input type="number" ...>`, not JSON textarea |
| A2 | Changing a `number` token's value through the editor updates and persists its `$value` | AC-1.2 | example | DONE | `NumberEditor.test.tsx` U-behaviors + manual run: editing to `2.75` updated the DOM and activated the Save button |
| A3 | The editor rejects/prevents a non-numeric value entered for a `number` token | AC-1.3 | example | DONE | `NumberEditor.test.tsx::entering a non-numeric value does not call onChange` / `::clearing the field does not call onChange` |
| A4 | The editor accepts a negative or fractional `number` value as-is | AC-1.4 | example | DONE | `NumberEditor.test.tsx` U15/U16 + manual run: `2.75` accepted live |
| A5 | A reference/candidate preview of a `number` token renders its resolved value as readable text | AC-2.1 | example | DONE | `NumberPreview.test.tsx` U-behaviors + manual run: `opacity-ref`'s preview showed `1.5` then live-updated to `2.75` |
| A6 | A preview declines to render (falls back to generic rendering) for a value that fails the number schema | AC-2.2 | example | DONE | `NumberPreview.test.tsx::declines to render for a value that fails schema validation` |

## Inner loop: unit behaviors

Grouped by the component from `plan.md` that owns them.

### `packages/token-core/src/number.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U1 | Accepts a positive integer, e.g. `2` | FR-002 | example | DONE | `number.test.ts::accepts a positive integer` |
| U2 | Accepts a positive fraction, e.g. `1.5` | FR-002 | example | DONE | `number.test.ts::accepts a positive fraction` |
| U3 | Accepts `0` | FR-002, Edge Case "0/-0" | example | DONE | `number.test.ts::accepts zero` |
| U4 | Accepts a negative number, e.g. `-1` | FR-002, FR-003 | example | DONE | `number.test.ts::accepts a negative number` |
| U5 | Accepts a negative fraction, e.g. `-0.5` | FR-002 | example | DONE | `number.test.ts::accepts a negative fraction` |
| U6 | Rejects `NaN` | FR-002, Edge Case "NaN/Infinity" | example | DONE | `number.test.ts::rejects NaN` |
| U7 | Rejects `Infinity` | FR-002, Edge Case "NaN/Infinity" | example | DONE | `number.test.ts::rejects Infinity` |
| U8 | Rejects `-Infinity` | FR-002, Edge Case "NaN/Infinity" | example | DONE | `number.test.ts::rejects -Infinity` |
| U9 | Rejects a non-number shape, a string, e.g. `"1.5"` | FR-002 | example | DONE | `number.test.ts::rejects a string` |
| U10 | Rejects a non-number shape, an object | FR-002 | example | DONE | `number.test.ts::rejects an object` |

### `packages/token-editor-number/src/components/NumberEditor/NumberEditor.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U11 | Renders the current value in a labeled number input | AC-1.1, FR-003 | example | DONE | `NumberEditor.test.tsx::renders the current value in a number input` |
| U12 | Editing the numeric value calls `onChange` with the updated finite number | AC-1.2, FR-003 | example | DONE | `NumberEditor.test.tsx::editing the value calls onChange with the updated finite number` |
| U13 | Entering a non-numeric value does not call `onChange` | AC-1.3, FR-004 | example | DONE | `NumberEditor.test.tsx::entering a non-numeric value does not call onChange` |
| U14 | Clearing the field (empty string) does not call `onChange` | AC-1.3, FR-004 | example | DONE | `NumberEditor.test.tsx::clearing the field does not call onChange` |
| U15 | Entering a negative number calls `onChange` with that exact negative value | AC-1.4, FR-003 | example | DONE | `NumberEditor.test.tsx::entering a negative value calls onChange with that exact negative value` |
| U16 | Entering a fractional number calls `onChange` with that exact fractional value | AC-1.4, FR-003 | example | DONE | `NumberEditor.test.tsx::entering a fractional value calls onChange with that exact fractional value` |
| U17 | Has zero WCAG 2.2 AA `axe-core` violations for a numeric value | Constitution X/Technology Stack (a11y tier) | example | DONE | `NumberEditor.a11y.test.tsx::has no WCAG 2.2 AA violations` |

### `packages/token-editor-number/src/components/NumberPreview/NumberPreview.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U18 | Renders a positive numeric value as text | AC-2.1, FR-005 | example | DONE | `NumberPreview.test.tsx::renders a numeric value` |
| U19 | Renders a negative numeric value as text | AC-2.1, FR-005 | example | DONE | `NumberPreview.test.tsx::renders a negative value` |
| U20 | Declines to render (`null`) for a value that fails schema validation | AC-2.2 | example | DONE | `NumberPreview.test.tsx::declines to render for a value that fails schema validation` |
| U21 | Has zero WCAG 2.2 AA `axe-core` violations for a numeric value | Constitution X/Technology Stack (a11y tier) | example | DONE | `NumberPreview.a11y.test.tsx::a numeric value preview has no WCAG 2.2 AA violations` |

### `apps/web-app/lib/token-editors/built-in.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U22 | `BUILT_IN_TOKEN_TYPES`/`builtInContractsByType` include `"number"` | AC-1.1, FR-001 | example | DONE | `built-in.test.ts::BUILT_IN_TOKEN_TYPES includes ... and number` + `built-in.test.ts::resolveBuiltInContract('number') returns the number contract` |

## Invariants and edge cases still to place

- Round-trip fidelity (FR-006, SC-004): parsing and re-serializing an untouched `number` token
  produces the same `$value`. This is exercised structurally by `serializeValue: (value) => value`
  (identity) and by `token-core`'s existing generic parse/serialize round-trip test suite
  (Principle IX), not by a new dedicated test — no behavior id assigned; flagged here so the
  quality-bar check on this list has a place to point to, matching how `font-weight`'s equivalent
  requirement was handled (no separate FR-006-specific test beyond the existing generic
  round-trip fixture coverage).

## Out of scope

- A dedicated Playwright acceptance spec for `number` tokens specifically: no new `apps/web-app/e2e/*.spec.ts`
  file is added by this feature, matching `token-editor-font-weight`'s precedent (component-level
  tests + manual quickstart stand in as the acceptance evidence — see the Outer loop table's note).
- Extending `token-core`'s `classifyValue`/`KNOWN_VALUE_SCHEMAS` registry to include `number`:
  out of scope per `research.md`'s registration-points decision (no other single-type feature has
  added itself there either).
- A keyword-alias picker or any secondary editing control: the DTCG Number type has no aliases
  (spec.md Assumptions).

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md`:

- Single test (web-app/vitest stack): `pnpm exec vitest run {file} -t "{name}"`
- Single test (token-core/node:test stack): `node --test --test-name-pattern "{name}" {file}` (run from `packages/token-core`)
- Full suite: `pnpm test`
- Fast inner-loop subset (vitest projects only, requires `pnpm build` first): `pnpm exec vitest run`
- `token-core` package suite: `pnpm --filter @dtcg-editor/token-core test`
- Coverage: not available (`@vitest/coverage-v8` not installed)
- Mutation: not available (no StrykerJS) — deliberate-mutant spot check used instead, per Constitution Principle XIII
