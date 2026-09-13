---
feature: 014-shadow-token-support
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 15
planned_at: f1c1347
updated_at: f1c1347
suite_baseline: green
---

# Test List: Shadow Token Support

## Outer loop: acceptance behaviors

One per acceptance scenario in `spec.md`. Each stays red until the feature works
end to end through its real entry point (the rendered `ShadowEditor`/
`ShadowPreview` component, per this repo's component-level acceptance tier —
no dedicated Playwright flow is required by spec.md for this feature, matching
`border`/`transition`'s precedent of relying on the component-render tier as
the "real entry point" for a pluggable editor component with no page of its
own).

| id  | behavior                                                                                   | traces        | kind    | state   | test                                                                                     |
| --- | ------------------------------------------------------------------------------------------- | ------------- | ------- | ------- | ----------------------------------------------------------------------------------------- |
| A1  | Changing only offsetX on a single-layer shadow leaves color/offsetY/blur/spread unchanged   | US1-AS1       | example | DONE |                                                                                             `ShadowEditor.test.tsx::a bare-object value's edit calls onChange with the updated bare object` |
| A2  | Changing only offsetY on a single-layer shadow leaves the other four sub-fields unchanged    | US1-AS2       | example | DONE |                                                                                             `ShadowEditor.test.tsx::a bare-object value's edit calls onChange with the updated bare object` |
| A3  | Changing only blur on a single-layer shadow leaves the other four sub-fields unchanged       | US1-AS3       | example | DONE |                                                                                             `ShadowEditor.test.tsx::a bare-object value's edit calls onChange with the updated bare object` |
| A4  | Changing only spread on a single-layer shadow leaves the other four sub-fields unchanged     | US1-AS4       | example | DONE |                                                                                             `ShadowEditor.test.tsx::a bare-object value's edit calls onChange with the updated bare object` |
| A5  | Changing only color on a single-layer shadow leaves offsetX/offsetY/blur/spread unchanged    | US1-AS5       | example | DONE |                                                                                             `ShadowLayerFields.test.tsx::changing only the color control calls onChange with color updated` |
| A6  | Adding a layer to a two-layer shadow yields a 3-layer array, first two layers unchanged      | US2-AS1       | example | DONE |                                                                                             `ShadowEditor.test.tsx::adding a layer to a two-layer array yields a 3-layer array, first two layers unchanged` |
| A7  | Removing the middle of three layers yields the first+third layers, unchanged and in order    | US2-AS2       | example | DONE |                                                                                             `ShadowEditor.test.tsx::removing the middle of three layers yields the first and third layers, unchanged and in order` |
| A8  | Moving a layer up/down reorders layers without altering any layer's own sub-values           | US2-AS3       | example | DONE |                                                                                             `ShadowEditor.test.tsx::moving the first of two layers down swaps the layers without altering their values` |
| A9  | Editing one sub-value of the second of two layers changes only that field of that layer      | US2-AS4       | example | DONE |                                                                                             `ShadowEditor.test.tsx::editing a sub-field of the second of two layers changes only that layer's field` |
| A10 | A resolved single-layer shadow value previews as one line with a color swatch + offsets      | US3-AS1       | example | DONE |                                                                                             `ShadowPreview.test.tsx::renders an embedded ColorPreview plus offsetX/offsetY/blur/spread text for a valid single-layer value` |
| A11 | A resolved 3-layer shadow value previews as the literal text "3 shadows"                     | US3-AS2       | example | DONE |                                                                                             `ShadowPreview.test.tsx::renders the literal text "3 shadows" for a valid 3-layer array (N is dynamic)` |
| A12 | A non-shadow-shaped value declines to render in the preview                                  | US3-AS3       | example | DONE |                                                                                             `ShadowPreview.test.tsx::declines to render for a completely unrelated shape` |
| A13 | A `shadow`-typed token with a valid single-layer value renders the dedicated `ShadowEditor`  | US4-AS1       | example | PENDING |                                                                                             |
| A14 | A `shadow`-typed token with a valid multi-layer array value renders `ShadowEditor`'s repeater | US4-AS2       | example | PENDING |                                                                                             |
| A15 | A `shadow`-typed token with an invalid value falls back to generic invalid-value handling     | US4-AS3       | example | PENDING |                                                                                             |

## Inner loop: unit behaviors

Grouped by the component from `plan.md` that owns them.

### `packages/token-core/src/shadow.ts`

| id  | behavior                                                                          | traces      | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------- | ----------- | ------- | ------- | ---- |
| U1  | Accepts a valid single-layer object `{ color, offsetX, offsetY, blur, spread }`    | FR-001      | example | DONE |      `shadow.test.ts::accepts a valid single-layer object` |
| U2  | Accepts a valid one-item array of layers                                          | FR-001      | example | DONE |      `shadow.test.ts::accepts a valid one-item array of layers` |
| U3  | Accepts a valid multi-layer (3-entry) array                                       | FR-001      | example | DONE |      `shadow.test.ts::accepts a valid multi-layer (3-entry) array` |
| U4  | Rejects a single-layer object missing `color`                                     | FR-001      | example | DONE |      `shadow.test.ts::rejects a single-layer object missing color` |
| U5  | Rejects a single-layer object missing `offsetX`                                   | FR-001      | example | DONE |      `shadow.test.ts::rejects a single-layer object missing offsetX` |
| U6  | Rejects a single-layer object missing `offsetY`                                   | FR-001      | example | DONE |      `shadow.test.ts::rejects a single-layer object missing offsetY` |
| U7  | Rejects a single-layer object missing `blur`                                      | FR-001      | example | DONE |      `shadow.test.ts::rejects a single-layer object missing blur` |
| U8  | Rejects a single-layer object missing `spread`                                    | FR-001      | example | DONE |      `shadow.test.ts::rejects a single-layer object missing spread` |
| U9  | Rejects a layer whose `color` is not a valid `ColorValue`                          | FR-001      | example | DONE |      `shadow.test.ts::rejects a layer whose color is not a valid ColorValue` |
| U10 | Rejects a layer whose `offsetX` is not a valid `DimensionValue`                    | FR-001      | example | DONE |      `shadow.test.ts::rejects a layer whose offsetX is not a valid DimensionValue` |
| U11 | Rejects a layer whose `offsetY` is not a valid `DimensionValue`                    | FR-001      | example | DONE |      `shadow.test.ts::rejects a layer whose offsetY is not a valid DimensionValue` |
| U12 | Rejects a layer whose `blur` is not a valid `DimensionValue`                       | FR-001      | example | DONE |      `shadow.test.ts::rejects a layer whose blur is not a valid DimensionValue` |
| U13 | Rejects a layer whose `spread` is not a valid `DimensionValue`                     | FR-001      | example | DONE |      `shadow.test.ts::rejects a layer whose spread is not a valid DimensionValue` |
| U14 | Rejects an array containing one invalid layer even when the others are valid       | FR-001      | example | DONE |      `shadow.test.ts::rejects an array containing one invalid layer even when the others are valid` |
| U15 | Rejects an empty array                                                             | Edge Case   | example | DONE |      `shadow.test.ts::rejects an empty array` |

### `packages/token-editor-shadow/src/components/ShadowLayerFields/ShadowLayerFields.tsx`

| id  | behavior                                                                                     | traces  | kind    | state   | test |
| --- | ----------------------------------------------------------------------------------------------| ------- | ------- | ------- | ---- |
| U16 | Renders the embedded `ColorEditor` and four `DimensionEditor`s, each labeled via its own fieldset/legend ("Offset X"/"Offset Y"/"Blur"/"Spread") | FR-002  | example | DONE |      `ShadowLayerFields.test.tsx::renders the embedded ColorEditor and four DimensionEditor instances` |
| U17 | Changing offsetX calls `onChange` with only `offsetX` updated                                 | FR-003  | example | DONE |      `ShadowLayerFields.test.tsx::changing only offsetX calls onChange with offsetX updated` |
| U18 | Changing offsetY calls `onChange` with only `offsetY` updated                                 | FR-003  | example | DONE |      `ShadowLayerFields.test.tsx::changing only offsetY calls onChange with offsetY updated` |
| U19 | Changing blur calls `onChange` with only `blur` updated                                       | FR-003  | example | DONE |      `ShadowLayerFields.test.tsx::changing only blur calls onChange with blur updated` |
| U20 | Changing spread calls `onChange` with only `spread` updated                                   | FR-003  | example | DONE |      `ShadowLayerFields.test.tsx::changing only spread calls onChange with spread updated` |
| U21 | Changing color calls `onChange` with only `color` updated                                     | FR-003  | example | DONE |      `ShadowLayerFields.test.tsx::changing only the color control calls onChange with color updated` |
| U22 | Has no WCAG 2.2 AA violations                                                                  | Const-X | example | DONE |      `ShadowLayerFields.a11y.test.tsx::has no WCAG 2.2 AA violations` |

### `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.tsx`

| id  | behavior                                                                                             | traces        | kind    | state   | test |
| --- | ------------------------------------------------------------------------------------------------------| ------------- | ------- | ------- | ---- |
| U23 | A bare-object value renders exactly one `ShadowLayerFields` block and no repeater controls            | Edge Case     | example | DONE |      `ShadowEditor.test.tsx::a bare-object value renders exactly one ShadowLayerFields block and no repeater controls` |
| U24 | A bare-object value's edit calls `onChange` with the updated bare object (not array-wrapped)           | FR-002        | example | DONE |      `ShadowEditor.test.tsx::a bare-object value's edit calls onChange with the updated bare object` |
| U25 | An array value renders one `ShadowLayerFields` row per layer plus add/remove/move controls             | FR-004        | example | DONE |      `ShadowEditor.test.tsx::an array value renders one ShadowLayerFields row per layer plus repeater controls` |
| U26 | "Add layer" appends a schema-valid default layer, existing layers unchanged                            | FR-004        | example | DONE |      `ShadowEditor.test.tsx::adding a layer to a two-layer array yields a 3-layer array, first two layers unchanged` |
| U27 | "Remove" on a middle layer drops exactly that layer, others unchanged and in order                     | FR-004, FR-005 | example | DONE |     `ShadowEditor.test.tsx::removing the middle of three layers yields the first and third layers, unchanged and in order` |
| U28 | "Move down"/"Move up" reorders layers without altering any layer's own sub-values                      | FR-004, FR-005 | example | DONE |     `ShadowEditor.test.tsx::moving the first of two layers down swaps the layers without altering their values` |
| U29 | Editing a sub-field of one layer among several changes only that layer's field                         | FR-005        | example | DONE |      `ShadowEditor.test.tsx::editing a sub-field of the second of two layers changes only that layer's field` |
| U30 | "Remove" is disabled when exactly one layer remains                                                     | Edge Case     | example | DONE |      `ShadowEditor.test.tsx::remove is disabled when exactly one layer remains` |
| U31 | A one-item *array* value keeps showing repeater chrome (not the bare-object UI) and round-trips as a one-item array, never unwrapped to a bare object | Edge Case | example | DONE | `ShadowEditor.test.tsx::a one-item array value still shows repeater chrome, not the bare-object UI, and edits stay array-wrapped` |
| U32 | Has no WCAG 2.2 AA violations for a bare-object value                                                   | Const-X       | example | DONE |      `ShadowEditor.a11y.test.tsx::has no WCAG 2.2 AA violations for a bare-object value` |
| U33 | Has no WCAG 2.2 AA violations for a multi-layer array value                                            | Const-X       | example | DONE |      `ShadowEditor.a11y.test.tsx::has no WCAG 2.2 AA violations for a multi-layer array value` |

### `packages/token-editor-shadow/src/components/ShadowPreview/ShadowPreview.tsx`

| id  | behavior                                                                                   | traces  | kind    | state   | test |
| --- | --------------------------------------------------------------------------------------------| ------- | ------- | ------- | ---- |
| U34 | Renders one line combining a `ColorPreview` swatch with offsetX/offsetY/blur/spread text for a single (bare-object) layer | FR-006 | example | DONE | `ShadowPreview.test.tsx::renders an embedded ColorPreview plus offsetX/offsetY/blur/spread text for a valid single-layer value` |
| U35 | Renders the literal text "2 shadows" for a valid 2-layer array (boundary: smallest multi-layer case) | FR-007 | example | DONE | `ShadowPreview.test.tsx::renders the literal text "2 shadows" for a valid 2-layer array` |
| U36 | Renders the literal text "3 shadows" for a valid 3-layer array (N is dynamic, not hardcoded)        | FR-007 | example | DONE | `ShadowPreview.test.tsx::renders the literal text "3 shadows" for a valid 3-layer array (N is dynamic)` |
| U37 | Declines to render for a single layer missing one of its five required keys                | FR-008  | example | DONE |      `ShadowPreview.test.tsx::declines to render for a single layer missing one of its five required keys` |
| U38 | Declines to render for a layer whose `blur` sub-value is invalid, even though the other four are valid | FR-008 | example | DONE | `ShadowPreview.test.tsx::declines to render for a layer whose blur sub-value is invalid, even though the other four are valid` |
| U39 | Declines to render for an array containing one invalid layer                               | FR-008  | example | DONE |      `ShadowPreview.test.tsx::declines to render for an array containing one invalid layer` |
| U40 | Declines to render for an empty array                                                      | Edge Case | example | DONE |    `ShadowPreview.test.tsx::declines to render for an empty array` |
| U41 | Declines to render for a completely unrelated shape (e.g. a plain number)                  | FR-008  | example | DONE |      `ShadowPreview.test.tsx::declines to render for a completely unrelated shape` |
| U42 | Has no WCAG 2.2 AA violations for a single-layer value and for a multi-layer value          | Const-X | example | DONE |      `ShadowPreview.a11y.test.tsx::has no WCAG 2.2 AA violations for a single-layer value and a multi-layer value` |

### `packages/token-editor-shadow/src/token-type.ts`

| id  | behavior                                                                                                 | traces  | kind    | state   | test |
| --- | ----------------------------------------------------------------------------------------------------------| ------- | ------- | ------- | ---- |
| U43 | `shadowTokenType.type === "shadow"`, `valueSchema` is `ShadowValueSchema`, `serializeValue` is identity for both bare-object and array forms, `Editor`/`Preview` are `ShadowEditor`/`ShadowPreview` | FR-009, FR-010 | example | PENDING | |

### `apps/web-app/lib/token-editors/built-in.ts`

| id  | behavior                                                                                                    | traces  | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------- | ------- | ------- | ---- |
| U44 | `resolveBuiltInContract("shadow")` returns `shadowTokenType`; `BUILT_IN_TOKEN_TYPES` includes `"shadow"`; `builtInExtensions` contains a `{ type: "shadow", editor: ShadowEditor }` entry | FR-009 | example | PENDING | |

## Invariants and edge cases still to place

(None outstanding — every edge case in spec.md is placed above: U15/U40 (empty
array), U23/U31 (bare-object vs. one-item-array UI distinction), U30 (last-layer
remove guard), U14/U38/U39 (invalid-sub-layer decline cases).)

## Out of scope

- A dedicated `ValidationErrorHandler` for the `shadow` type: spec.md
  Assumptions explicitly defer to the host app's existing generic
  invalid-value handling (covered by A15/U-none — this is a "does NOT need a
  test for a component that doesn't exist" statement, not a gap).
- End-to-end Playwright coverage of the shadow editor inside a real running
  app page: not required by spec.md's acceptance scenarios, which are stated
  at the component-render level (matching `border`/`transition`'s
  precedent); the existing e2e suite is untouched by this feature.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` at planning time:

- Single test (web-app/vitest stack, root-scoped — covers `token-editor-shadow`'s
  `.test.tsx`/`.a11y.test.tsx`): `pnpm exec vitest run {file} -t "{name}"`
- Single test (node-packages stack — `token-core`'s `shadow.test.ts`):
  `node --test --test-name-pattern "{name}" {file}` (run from
  `packages/token-core`)
- Full file (vitest): `pnpm exec vitest run {file}`
- Full file (node:test): `node --test {file}`
- Fast inner-loop subset (vitest projects only, requires `pnpm build` once
  first): `pnpm exec vitest run`
- `token-core` package suite: `pnpm --filter @dtcg-editor/token-core test`
- Full suite (authoritative CI gate): `pnpm test`
- Coverage: not available (`@vitest/coverage-v8` not installed; see
  `tdd-profile.md` Missing capabilities)
- Mutation: not available (no StrykerJS; use a deliberate-mutant spot check
  per `tdd-profile.md` Missing capabilities)
