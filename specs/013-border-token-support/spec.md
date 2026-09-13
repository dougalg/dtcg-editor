# Feature Specification: Border Token Support

**Feature Branch**: `worktree-border-token-support`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Add support for the DTCG \"border\" composite token type. \$value shape: { color: ColorValue, width: DimensionValue, style: StrokeStyleValue }. Reuse existing token-core schemas composed into a new BorderValueSchema. Create a new token-editor-border package whose Editor and Preview embed the existing ColorEditor/DimensionEditor/StrokeStyleEditor and their Previews rather than reimplementing sub-controls. Register the new type in the web app's built-in editor registry."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Author edits a border token's three sub-values (Priority: P1)

A design-token author opens a token of type `border` in the editor and sees one
combined control surface with three parts — a color picker, a width control,
and a stroke-style control — matching the color, dimension, and stroke-style
controls they already know from editing those token types standalone.
Changing any one part updates only that part of the border value; the other
two are left exactly as they were.

**Why this priority**: Without this, `border` tokens are entirely unsupported
in the editor — an author would have no way to inspect or change a border
token's value at all. This is the entire feature.

**Independent Test**: Render the border editor with a known `{ color, width,
style }` value, change only the width control, and verify the emitted value's
`color` and `style` are unchanged (identity-equal or deep-equal to the
originals) while `width` reflects the new value.

**Acceptance Scenarios**:

1. **Given** a border token with `color` red, `width` 1px, `style` solid,
   **When** the author changes the width to 2px, **Then** the token's value
   becomes `{ color: red, width: 2px, style: solid }`.
2. **Given** a border token, **When** the author changes only the color,
   **Then** `width` and `style` are unchanged in the emitted value.
3. **Given** a border token, **When** the author changes only the style,
   **Then** `color` and `width` are unchanged in the emitted value.

---

### User Story 2 - Author sees a compact preview of a resolved border reference (Priority: P2)

When a token references a `border` token (e.g. `{border.default}`), the
author sees a compact, single-line preview of the resolved border value next
to the reference — not a large expanded block — so that scanning a list of
tokens with border references stays readable.

**Why this priority**: Preview is required for every token type in this
editor (no type may fall back to a raw-JSON dump); a border token's preview
that took several lines would degrade the reference list's readability more
than any other type built so far, since it is the first composite of three
sub-values.

**Independent Test**: Render the border preview with a known border value and
verify it renders as one visually compact inline unit (a color swatch plus
short width/style text), and that it declines to render (renders nothing)
for a value that does not match the border shape.

**Acceptance Scenarios**:

1. **Given** a resolved border value `{ color: blue, width: 1px, style:
   solid }`, **When** the preview renders, **Then** it shows a color swatch
   and the text reflects the width and style, all on one line.
2. **Given** a value that is not a valid border shape (e.g. a plain number),
   **When** the preview renders, **Then** it renders nothing (declines),
   letting the host fall back to its own generic rendering.

---

### User Story 3 - Border token type is available in the token type registry (Priority: P1)

An author creating or classifying a token of `$type: "border"` sees the
dedicated border editor and preview used automatically — the same
zero-configuration experience every other built-in DTCG type already gets in
this editor.

**Why this priority**: Without registration, the new editor/preview exist as
code but are unreachable from the actual app; the feature isn't usable until
this is wired up.

**Independent Test**: Given a token file containing a token with `$type:
"border"` and a valid value, load it in the app and confirm the dedicated
border editor renders instead of the generic/JSON fallback.

**Acceptance Scenarios**:

1. **Given** a token document containing a `border`-typed token with a valid
   value, **When** the app renders that token's row, **Then** the dedicated
   border Editor is used.
2. **Given** a token document containing a `border`-typed token with an
   invalid value (fails schema validation), **When** the app renders that
   token's row, **Then** the app falls back to its existing
   invalid-value handling (no dedicated `ValidationErrorHandler` is required
   for this feature).

---

### Edge Cases

- What happens when a border token's `style` sub-value is the "custom dash
  pattern" object form (not one of the 8 named keywords)? The embedded
  stroke-style editor already supports this; the border editor must pass it
  through unchanged as `style` and not assume it is always a string.
- What happens when a border's `color` sub-value is the legacy bare-hex-string
  form rather than the full color object? The embedded color editor already
  supports this; no extra handling is needed in the border editor itself.
- What happens when a resolved reference's value has the right top-level
  shape (`color`/`width`/`style` keys) but one sub-value is itself invalid
  (e.g. `width` is a string, not a `{ value, unit }` object)? The preview
  MUST decline to render (treat the whole value as non-matching), not render
  a partially-broken preview.
- What happens when only one or two of the three keys are present? The
  preview MUST decline to render — a partial border value does not match the
  full `BorderValueSchema` shape.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST define a `border` token value schema whose
  shape is exactly `{ color, width, style }`, where `color` validates as an
  existing color value, `width` validates as an existing dimension value, and
  `style` validates as an existing stroke-style value — reusing those
  existing validation rules rather than redefining them.
- **FR-002**: The system MUST provide an editable UI for a `border` token's
  value that lets an author independently change the color, the width, and
  the style, each using the same control the author already sees when
  editing a standalone token of that sub-type.
- **FR-003**: Changing one sub-value in the border editor MUST leave the
  other two sub-values exactly as they were (no data loss, no unintended
  reformatting).
- **FR-004**: The system MUST provide a read-only, compact ("one line")
  preview rendering of a border value, for use wherever the app shows what a
  reference to a border token resolves to.
- **FR-005**: The preview MUST decline to render (produce no output) when
  given a value that does not conform to the border value shape, including a
  value missing one or more of the three required parts, or one whose
  `color`/`width`/`style` sub-value is itself invalid.
- **FR-006**: The system MUST register `border` as a built-in token type so
  that a token with `$type: "border"` (or a value inferred as a border shape)
  automatically uses this editor and preview, with no per-project
  configuration required.
- **FR-007**: The border value schema, editor, and preview MUST NOT duplicate
  validation or rendering logic already owned by the color, dimension, and
  stroke-style token types — they MUST reuse those existing implementations.

### Key Entities

- **Border value**: A composite value made of exactly three parts — a color,
  a width (a dimension), and a style (a stroke style) — describing one edge
  or outline treatment, per the DTCG design-token specification's border
  type.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An author can change any one of a border token's three parts
  (color, width, style) without needing to re-enter or lose the other two,
  in a single interaction with that part's own control.
- **SC-002**: A list of tokens containing resolved border references remains
  scannable — each border preview renders as a single compact line, not a
  multi-line block, regardless of the referenced border's `style` sub-value
  shape (named keyword or custom dash pattern).
- **SC-003**: 100% of the border type's behaviors (schema acceptance/
  rejection, editor delegation per sub-field, preview accept/decline) are
  covered by an automated test that was confirmed to fail before the
  corresponding behavior existed.
- **SC-004**: Opening a token file containing a valid `border`-typed token
  requires no manual configuration step to see the dedicated editor — it
  works the same way opening a `color` or `dimension` token already does.

## Assumptions

- The DTCG `border` type's `$value` shape is exactly `{ color, width, style }`
  as defined by the DTCG 2025.10 Format specification's Border type, with no
  additional required or optional sub-fields.
- The existing color, dimension, and stroke-style value schemas and their
  editor/preview components are stable and already meet this project's
  validation, accessibility, and design-system-usage requirements — this
  feature does not re-verify those, only composes them.
- No dedicated `ValidationErrorHandler` is required for the border type in
  this feature; a border token whose value fails schema validation falls
  back to the host app's existing generic invalid-value handling, consistent
  with most other built-in types that also omit this optional contract
  member.
- The three embedded sub-editors are visually arranged as the implementer
  judges best to keep the composite compact and usable (row vs. column
  layout); no specific layout is mandated by this specification, only that
  all three remain independently editable and clearly attributable to their
  sub-field.
