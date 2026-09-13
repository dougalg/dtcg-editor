---
feature: 014-typography-token-support
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 10
planned_at: 9e8d51d
updated_at: 9e8d51d
suite_baseline: green
---

# Test List: Typography Token Editor Support

This feature has no dedicated acceptance/e2e runner of its own (it lives in
`packages/token-editor-typography`, a `node-packages`/`web-app`-Vitest-projects
hybrid — schema in `node-packages`, components under the `web-app` stack's shared
`vitest.config.mts` projects — per `.specify/memory/tdd-profile.md`; the profile's
only `acceptance` entry is scoped to `apps/web-app`'s Playwright suite, which this
feature does not need to touch to satisfy its spec). The highest testable level
for this feature's "real entry point" is therefore each component's own
render/interaction test (`TypographyEditor.test.tsx`, `TypographyPreview.test.tsx`)
— the outer loop below targets those files directly, one behavior per `spec.md`
Acceptance Scenario, mirroring `013-transition-token-support`'s precedent.

## Outer loop: acceptance behaviors

| id  | behavior                                                                                                             | traces          | kind    | state   | test                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------- | --------------- | ------- | ------- | --------------------------------------------------------------------------------------------------- |
| A1  | Renders labeled "Font Family", "Font Size", "Font Weight", "Letter Spacing", "Line Height" controls, each showing that field's value | US1-AS1 | example | PENDING | `TypographyEditor.test.tsx::renders labeled controls for all five fields showing the current value` |
| A2  | Changing the font family control updates only `$value.fontFamily`                                                      | US1-AS2         | example | PENDING | `TypographyEditor.test.tsx::changing the font family control updates only fontFamily`               |
| A3  | Changing the font size control updates only `$value.fontSize`                                                          | US1-AS3         | example | PENDING | `TypographyEditor.test.tsx::changing the font size control updates only fontSize`                   |
| A4  | Changing the font weight control updates only `$value.fontWeight`                                                      | US1-AS4         | example | PENDING | `TypographyEditor.test.tsx::changing the font weight control updates only fontWeight`               |
| A5  | Changing the letter spacing control updates only `$value.letterSpacing`                                                | US1-AS5         | example | PENDING | `TypographyEditor.test.tsx::changing the letter spacing control updates only letterSpacing`         |
| A6  | Changing the line height control updates only `$value.lineHeight`                                                      | US1-AS6         | example | PENDING | `TypographyEditor.test.tsx::changing the line height control updates only lineHeight`               |
| A7  | The "Font Size" group shows `fontSize`'s value and the "Letter Spacing" group shows `letterSpacing`'s value, not swapped, for two distinct values | US1-AS7 | example | PENDING | `TypographyEditor.test.tsx::the Font Size and Letter Spacing controls are not confused with one another` |
| A8  | A zero-letter-spacing value's preview renders one line combining font size, line height, font family, font weight, no letter-spacing mention | US2-AS1 | example | PENDING | `TypographyPreview.test.tsx::renders one line combining size, line height, family and weight, letter spacing omitted when zero` |
| A9  | A non-zero-letter-spacing value's preview includes the letter spacing in that same one line                           | US2-AS2         | example | PENDING | `TypographyPreview.test.tsx::includes letter spacing in that same line when it is non-zero`         |
| A10 | The preview text matches `DimensionPreview`'s `{value}{unit}`, `FontFamilyPreview`'s joined-stack text, and `FontWeightPreview`'s `String(value)` formatting exactly | FR-007 | example | PENDING | `TypographyPreview.test.tsx::matches DimensionPreview/FontFamilyPreview/FontWeightPreview's own formatting exactly` |
| A11 | A schema-invalid value's preview renders nothing                                                                       | US2-AS3, FR-008 | example | PENDING | `TypographyPreview.test.tsx::declines to render for a value that does not conform to the typography schema` |

## Inner loop: unit behaviors

### `packages/token-core/src/typography.ts`

| id  | behavior                                                                                            | traces             | kind    | state   | test                                                       |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------ | ------- | ------- | --------------------------------------------------------------- |
| U1  | Accepts a valid object with all five fields (`fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`) | FR-002              | example | DONE | `typography.test.ts::accepts a valid typography value`         |
| U2  | Rejects a value missing `fontFamily`                                                                   | FR-002              | example | DONE | `typography.test.ts::rejects a value missing fontFamily`       |
| U3  | Rejects a value missing `fontSize`                                                                     | FR-002              | example | DONE | `typography.test.ts::rejects a value missing fontSize`         |
| U4  | Rejects a value missing `fontWeight`                                                                   | FR-002              | example | DONE | `typography.test.ts::rejects a value missing fontWeight`       |
| U5  | Rejects a value missing `letterSpacing`                                                                | FR-002              | example | DONE | `typography.test.ts::rejects a value missing letterSpacing`    |
| U6  | Rejects a value missing `lineHeight`                                                                   | FR-002              | example | DONE | `typography.test.ts::rejects a value missing lineHeight`       |
| U7  | Rejects a value whose nested `fontSize` is itself invalid (e.g. missing `unit`), proving the nested schema is enforced | FR-002, Edge Cases | example | DONE | `typography.test.ts::rejects an invalid nested fontSize` |

### `packages/token-editor-typography/src/components/TypographyEditor/TypographyEditor.tsx`

Behaviors A1-A7 above are this component's own render/interaction tests — no
additional inner-loop behaviors beyond the outer loop are needed for this
component, since every rule FR-003/FR-004/FR-005/FR-006 impose is already
exercised at the "real entry point" (the rendered component) rather than at some
smaller unit beneath it.

### `packages/token-editor-typography/src/components/TypographyPreview/TypographyPreview.tsx`

Behaviors A8-A11 above cover this component directly. No additional inner-loop
behaviors are needed beyond A10's formatting-match check.

## Invariants and edge cases still to place

- Round-trip fidelity of an untouched `typography` token (`serializeValue` is the
  identity function; `TypographyEditor` only ever replaces one field via
  `{ ...value, field: next }`) is a structural property of the implementation
  chosen in `plan.md`'s Design Decisions, not a separately id'd behavior — it is
  exercised as a side effect of A2-A6 asserting the *other* four fields are
  unchanged after each edit.
- `letterSpacing.value === 0` while the editor still shows the full five-control
  view regardless of value (spec Edge Cases) is implicitly covered by A1
  rendering all five controls unconditionally; no separate behavior id is needed
  since there is no conditional-rendering logic in the Editor to test.
- `lineHeight` accepting a fractional multiplier (e.g. `1.4`) with no unit is
  exercised by A1/A6's fixture values already using a fractional `lineHeight`;
  no separate boundary test is warranted since `z.number()` places no
  min/max/integer constraint to test either side of.

## Out of scope

- A `token-core`-level "parse a full token document containing a `typography`
  token" integration test: the existing generic parse/serialize round-trip
  machinery already exercises any registered `$type`'s schema generically,
  matching how `border`/`transition` were each added without one.
- `axe-core` a11y checks are not separately id'd here as A/U behaviors — the
  constitution's Principle X requires an `.a11y.test.tsx` file per component
  regardless of feature-specific behavior, tracked instead as task T019 in
  `tasks.md` (structural, not behavioral).
- Storybook stories (`tasks.md` T020): presentational only, not a testable
  behavior.
- Whether `token-editor-font-family`'s `FontFamilyEditor`,
  `token-editor-dimension`'s `DimensionEditor`, `token-editor-font-weight`'s
  `FontWeightEditor`, or `token-editor-number`'s `NumberEditor` correctly handle
  their own internal edge cases: already covered by those packages' own test
  suites, which this feature must not modify or duplicate.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` (`node-packages` stack for
`token-core`; `web-app` stack's `single`/`suite_fast` pattern for the new
package's Vitest-run component tests, since the new package is included in the
root `vitest.config.mts` projects):

- Single test (token-core): `node --test --test-name-pattern "{name}" {file}`
- Single test (component/a11y): `pnpm exec vitest run {file} -t "{name}"`
- Full suite: `pnpm test`
- Fast inner loop (Vitest projects only, requires `pnpm build` first):
  `pnpm exec vitest run`
- `token-core` package suite: `pnpm --filter @dtcg-editor/token-core test`
- New package suite (once scaffolded):
  `pnpm --filter @dtcg-editor/token-editor-typography test`
