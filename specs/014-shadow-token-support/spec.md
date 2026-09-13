# Feature Specification: Shadow Token Support

**Feature Branch**: `worktree-shadow-token-support`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Add support for the DTCG \"shadow\" composite token type. \$value shape: a single shadow layer object `{ color: ColorValue, offsetX: DimensionValue, offsetY: DimensionValue, blur: DimensionValue, spread: DimensionValue }`, or an array of such layer objects for multiple stacked shadows. Reuse existing token-core schemas (ColorValueSchema, DimensionValueSchema) composed into a new ShadowValueSchema (single layer, or array of layers). Create a new token-editor-shadow package whose Editor embeds the existing ColorEditor and four DimensionEditor instances (offsetX/offsetY/blur/spread) for a single layer, plus an add/remove/reorder repeater UI for the multi-layer array case (adapting token-editor-font-family's list pattern to composite objects instead of plain strings). Preview renders a single-line summary for one layer (embedding ColorPreview) and collapses to \"N shadows\" for multiple layers. Register the new type in the web app's built-in editor registry."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Author edits a single-layer shadow token's five sub-values (Priority: P1)

A design-token author opens a token of type `shadow` whose value is a single
shadow layer and sees one combined control surface with five parts — a color
picker and four dimension controls (horizontal offset, vertical offset, blur
radius, spread) — matching the color and dimension controls they already know
from editing those token types standalone. Changing any one part updates only
that part of the shadow layer; the other four are left exactly as they were.

**Why this priority**: Without this, `shadow` tokens are entirely unsupported
in the editor — an author would have no way to inspect or change a shadow
token's value at all. This is the entire feature's foundation; the multi-layer
case (User Story 2) builds directly on this single-layer control.

**Independent Test**: Render the shadow editor with a known single-layer
`{ color, offsetX, offsetY, blur, spread }` value, change only the blur
control, and verify the emitted value's `color`, `offsetX`, `offsetY`, and
`spread` are unchanged while `blur` reflects the new value.

**Acceptance Scenarios**:

1. **Given** a single-layer shadow token, **When** the author changes only
   `offsetX`, **Then** the emitted value has the new `offsetX` and every other
   sub-field unchanged.
2. **Given** a single-layer shadow token, **When** the author changes only
   `offsetY`, **Then** the emitted value has the new `offsetY` and every other
   sub-field unchanged.
3. **Given** a single-layer shadow token, **When** the author changes only
   `blur`, **Then** the emitted value has the new `blur` and every other
   sub-field unchanged.
4. **Given** a single-layer shadow token, **When** the author changes only
   `spread`, **Then** the emitted value has the new `spread` and every other
   sub-field unchanged.
5. **Given** a single-layer shadow token, **When** the author changes only the
   color, **Then** the emitted value has the new `color` and every offset/blur/
   spread sub-field unchanged.

---

### User Story 2 - Author manages a stack of multiple shadow layers (Priority: P2)

A design-token author opens a `shadow` token whose value is an array of
multiple shadow layers (a stacked/layered shadow effect) and can add a new
layer, remove an existing layer, reorder layers (move up/down), and
independently edit each layer's five sub-values using the same per-layer
control from User Story 1.

**Why this priority**: Multiple stacked shadows are an explicit part of the
DTCG shadow type's spec-defined value shape (an array form), and layered
shadows are a common real-world design pattern (e.g. elevation systems with 2+
shadow layers), but a single-layer editor alone already delivers a usable MVP
for the (likely more common) single-shadow case.

**Independent Test**: Render the shadow editor with a known two-layer array
value; add a third layer and verify the emitted array has three entries with
the first two unchanged; remove the second layer and verify the emitted array
drops exactly that entry; move a layer up/down and verify the emitted array
reflects the new order with no layer's own values altered.

**Acceptance Scenarios**:

1. **Given** a shadow token with two layers, **When** the author adds a new
   layer, **Then** the emitted value is a three-layer array, the first two
   layers unchanged, and the new layer is a valid (schema-conformant) default
   layer.
2. **Given** a shadow token with three layers, **When** the author removes the
   middle layer, **Then** the emitted value is a two-layer array containing
   exactly the first and third original layers, unchanged and in order.
3. **Given** a shadow token with two or more layers, **When** the author moves
   a layer up or down, **Then** the emitted value has the same layers with
   only the order changed — no layer's own sub-values are altered.
4. **Given** a shadow token with two layers, **When** the author changes one
   sub-value of the second layer, **Then** only that sub-value of that layer
   changes in the emitted value; the first layer and the second layer's other
   sub-values are unchanged.

---

### User Story 3 - Author sees a compact preview of a resolved shadow reference (Priority: P2)

When a token references a `shadow` token (e.g. `{shadow.elevation-1}`), the
author sees a compact, single-line preview of the resolved shadow value next
to the reference — a short CSS-like summary (offsets, blur, spread, color) for
a single layer, or a short "N shadows" summary when the resolved value has
multiple layers — so that scanning a list of tokens with shadow references
stays readable regardless of how many layers a given shadow token stacks.

**Why this priority**: Preview is required for every token type in this
editor (no type may fall back to a raw-JSON dump); a multi-layer shadow
rendered inline in full would be the least scannable preview built so far
(potentially many lines for a single reference), so the compact-collapse
behavior is core to keeping the reference list usable.

**Independent Test**: Render the shadow preview with a known single-layer
value and verify it renders as one line including a color swatch and the
offset/blur/spread numbers; render it with a known multi-layer array and
verify it renders the literal text "N shadows" (N = the actual layer count)
instead of expanding each layer; render it with a non-matching value and
verify it declines to render.

**Acceptance Scenarios**:

1. **Given** a resolved single-layer shadow value, **When** the preview
   renders, **Then** it shows one line combining a color swatch with the
   offsetX/offsetY/blur/spread values.
2. **Given** a resolved shadow value with 3 layers, **When** the preview
   renders, **Then** it shows the text "3 shadows" rather than any per-layer
   detail.
3. **Given** a value that is not a valid shadow shape (single layer or array
   of layers), **When** the preview renders, **Then** it renders nothing
   (declines), letting the host fall back to its own generic rendering.

---

### User Story 4 - Shadow token type is available in the token type registry (Priority: P1)

An author creating or classifying a token of `$type: "shadow"` sees the
dedicated shadow editor and preview used automatically — the same
zero-configuration experience every other built-in DTCG type already gets in
this editor.

**Why this priority**: Without registration, the new editor/preview exist as
code but are unreachable from the actual app; the feature isn't usable until
this is wired up.

**Independent Test**: Given a token file containing a token with `$type:
"shadow"` and a valid value (single layer or array), load it in the app and
confirm the dedicated shadow editor renders instead of the generic/JSON
fallback.

**Acceptance Scenarios**:

1. **Given** a token document containing a `shadow`-typed token with a valid
   single-layer value, **When** the app renders that token's row, **Then**
   the dedicated shadow Editor is used.
2. **Given** a token document containing a `shadow`-typed token with a valid
   multi-layer array value, **When** the app renders that token's row,
   **Then** the dedicated shadow Editor is used, showing the repeater UI.
3. **Given** a token document containing a `shadow`-typed token with an
   invalid value (fails schema validation), **When** the app renders that
   token's row, **Then** the app falls back to its existing invalid-value
   handling (no dedicated `ValidationErrorHandler` is required for this
   feature).

---

### Edge Cases

- What happens when a shadow token's value is a single-layer object (not
  wrapped in an array)? The editor renders exactly the User Story 1 controls,
  with no repeater UI shown (a single implicit layer, not a one-item list).
- What happens when a shadow token's value is an array containing exactly one
  layer? Per the DTCG spec both a bare object and a one-item array are valid
  shadow values; this is treated as the multi-layer (array) case for editing
  purposes — the repeater UI is shown — but MUST still round-trip as a
  one-item array (never silently collapsed to a bare object) since the
  on-disk shape the author chose is preserved.
- What happens when the author removes the last remaining layer from a
  multi-layer array? The system prevents removing the only remaining layer
  (an empty array is not a valid shadow value) — the remove control is
  disabled when exactly one layer remains.
- What happens when a resolved reference's value has the right top-level
  shape but one sub-field of one layer is itself invalid (e.g. `blur` is a
  string, not a `{ value, unit }` object)? The preview MUST decline to render
  the whole value, not render a partially-broken preview.
- What happens when the array form contains zero layers? This is invalid (a
  shadow value must describe at least one layer); the preview declines to
  render and the editor is not expected to construct or accept this shape.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST define a `shadow` token value schema whose
  shape is a single shadow layer object `{ color, offsetX, offsetY, blur,
  spread }` — where `color` validates as an existing color value and each of
  `offsetX`/`offsetY`/`blur`/`spread` validates as an existing dimension
  value — OR an array of one or more such layer objects, reusing those
  existing validation rules rather than redefining them.
- **FR-002**: The system MUST provide an editable UI for a single shadow
  layer's value that lets an author independently change the color and each
  of the four dimension sub-fields, each using the same control the author
  already sees when editing a standalone token of that sub-type, and clearly
  labeled so the four dimension controls are distinguishable from one another.
- **FR-003**: Changing one sub-value of a shadow layer in the editor MUST
  leave the other four sub-values of that layer exactly as they were (no data
  loss, no unintended reformatting).
- **FR-004**: The system MUST let an author add a new layer, remove an
  existing layer (except when only one layer remains), and reorder layers
  (move up / move down) when a shadow token's value is (or becomes) an array
  of layers.
- **FR-005**: Adding, removing, or reordering a layer MUST NOT alter the
  sub-values of any other layer in the array.
- **FR-006**: The system MUST provide a read-only, compact ("one line")
  preview rendering of a single-layer shadow value, for use wherever the app
  shows what a reference to a shadow token resolves to.
- **FR-007**: The system MUST provide a read-only preview of a multi-layer
  shadow value that renders as a short "N shadows" summary (N = the actual
  layer count) rather than expanding every layer inline.
- **FR-008**: The preview MUST decline to render (produce no output) when
  given a value that does not conform to the shadow value shape, including a
  value missing one or more required sub-fields of any layer, or one whose
  `color` or any dimension sub-field is itself invalid.
- **FR-009**: The system MUST register `shadow` as a built-in token type so
  that a token with `$type: "shadow"` (or a value inferred as a shadow shape)
  automatically uses this editor and preview, with no per-project
  configuration required.
- **FR-010**: The shadow value schema, editor, and preview MUST NOT duplicate
  validation or rendering logic already owned by the color and dimension
  token types — they MUST reuse those existing implementations.

### Key Entities

- **Shadow layer**: A composite value made of exactly five parts — a color, a
  horizontal offset, a vertical offset, a blur radius, and a spread distance
  (each of the four offset/blur/spread parts a dimension) — describing one
  drop-shadow effect, per the DTCG design-token specification's shadow type.
- **Shadow value**: Either a single shadow layer, or an ordered list of one or
  more shadow layers stacked together (multiple shadows applied together).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An author can change any one of a shadow layer's five parts
  (color, offsetX, offsetY, blur, spread) without needing to re-enter or lose
  the other four, in a single interaction with that part's own control.
- **SC-002**: An author can add, remove, and reorder shadow layers in a
  multi-layer shadow token without any other layer's values changing as a
  side effect.
- **SC-003**: A list of tokens containing resolved shadow references remains
  scannable — each shadow preview renders as a single compact line regardless
  of whether the referenced shadow has one layer or many.
- **SC-004**: 100% of the shadow type's behaviors (schema acceptance/
  rejection for both single-layer and array shapes, editor delegation per
  sub-field with no cross-talk, add/remove/reorder for the multi-layer case,
  preview single-line vs. "N shadows" branching and decline-on-mismatch) are
  covered by an automated test that was confirmed to fail before the
  corresponding behavior existed.
- **SC-005**: Opening a token file containing a valid `shadow`-typed token
  (single layer or array) requires no manual configuration step to see the
  dedicated editor — it works the same way opening a `color` or `dimension`
  token already does.

## Assumptions

- The DTCG `shadow` type's `$value` shape is exactly a single layer object
  `{ color, offsetX, offsetY, blur, spread }`, or an array of one or more such
  objects, as defined by the DTCG 2025.10 Format specification's Shadow type,
  with no additional required or optional sub-fields.
- The existing color and dimension value schemas and their editor/preview
  components are stable and already meet this project's validation,
  accessibility, and design-system-usage requirements — this feature does not
  re-verify those, only composes them.
- No dedicated `ValidationErrorHandler` is required for the shadow type in
  this feature; a shadow token whose value fails schema validation falls back
  to the host app's existing generic invalid-value handling, consistent with
  most other built-in types that also omit this optional contract member.
- A newly-added layer (User Story 2's "add layer" action) defaults to a fixed,
  schema-valid starting value (e.g. an opaque black color at `0,0,0,0`
  offset/blur/spread) that the author is expected to then edit — no specific
  default color/dimension values are mandated by this specification beyond
  "schema-valid."
- The one-layer-array-vs-bare-object editing distinction (Edge Cases) is
  UI-only: both are equally valid on disk per FR-001, and the editor's choice
  of which UI to show (single-layer controls vs. repeater) does not silently
  convert one form into the other.
