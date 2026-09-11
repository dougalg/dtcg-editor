# Feature Specification: Color Editor CSS-Style Formatting

**Feature Branch**: `002-color-editor-css-format`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "color-editor formats should look like css representation instead of raw json"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Read a color token's value at a glance (Priority: P1)

A designer or developer opens a color token in the editor to check or share
its value. Today the value is shown as a bare list of numbers (the DTCG
component array) with no indication of what color function those numbers
belong to. They want to see the value written the way they'd write it in a
stylesheet — `rgb(...)`, `hsl(...)`, `oklch(...)`, a hex string, and so on —
so they can read it, and copy it into other CSS-facing conversations, without
mentally reconstructing the DTCG JSON shape first.

**Why this priority**: This is the entire point of the feature — every other
story builds on the value being displayed in a recognizable CSS form. Without
this, nothing else in the feature has a reason to exist.

**Independent Test**: Open a color token in each of the DTCG-supported color
spaces and confirm the editor shows a CSS color function (or hex string)
appropriate to that space, with the function name/keyword visible, instead of
an unlabeled sequence of numbers.

**Acceptance Scenarios**:

1. **Given** a color token stored in the `srgb` color space, **When** its
   editor is shown, **Then** the value is presented as an `rgb(...)`-style
   function rather than a bare `[r, g, b]` array.
2. **Given** a color token stored in the `hsl` color space, **When** its
   editor is shown, **Then** the value is presented as an `hsl(...)`-style
   function, with the hue channel visually distinguishable from the
   percentage-based saturation and lightness channels.
3. **Given** a color token in a color space with no dedicated CSS function
   name (e.g. `display-p3`, `xyz-d65`), **When** its editor is shown,
   **Then** the value is presented using the generic CSS `color(...)`
   predicate form, naming the color space, rather than a bare array.
4. **Given** a color token that carries an alpha channel, **When** its editor
   is shown, **Then** the alpha is presented using the CSS `/ <alpha>` slash
   syntax within the function, matching how alpha is written in hand-authored
   CSS.

---

### User Story 2 - Edit a channel without losing the CSS-shaped context (Priority: P2)

A user adjusts one channel of a color token — say, the lightness of an
`oklch` value — directly in the editor. They expect the editing experience
they already have today (click a channel, type a new number, tab to the
next) to keep working exactly as before; only the surrounding presentation
should look like CSS now, not the interaction.

**Why this priority**: The formatting change is worthless if it breaks the
one thing people actually do with this editor — changing values. This must
hold before the feature can ship.

**Independent Test**: Edit each channel (including alpha) of a color token in
several color spaces and confirm the token's stored value updates correctly,
with no change in behavior compared to before the formatting change.

**Acceptance Scenarios**:

1. **Given** a color token displayed as `rgb(...)`, **When** the user edits
   one channel's value and commits it (blur or Enter), **Then** the token's
   underlying value updates to reflect the new channel, unchanged in every
   other respect.
2. **Given** a color token with no alpha channel, **When** the user adds an
   alpha value, **Then** the `/ <alpha>` portion of the CSS-style function
   appears and becomes editable, matching today's add-alpha behavior.
3. **Given** a color token with an out-of-range channel value, **When** the
   editor is shown, **Then** the existing range-validation warning still
   appears, anchored to the correct channel within the new formatted layout.

---

### User Story 3 - Recognize a "none" channel in CSS terms (Priority: P3)

A color token has a channel explicitly set to DTCG's `"none"` marker (e.g. an
achromatic color with no defined hue). The user sees this rendered using
CSS's own `none` keyword — which means the same thing in CSS Color 4 syntax —
rather than a blank field or a `0` that would misrepresent the value.

**Why this priority**: A real but comparatively rare case; worth getting
right for correctness and to avoid silently changing what looks like a
channel's numeric value, but it does not block the core formatting change.

**Independent Test**: Open a color token with a `"none"` component and
confirm it renders and can be cleared/restored consistent with the CSS
`none` keyword's meaning.

**Acceptance Scenarios**:

1. **Given** a color token with a channel value of `"none"`, **When** its
   editor is shown, **Then** that channel displays the literal word `none`,
   not a blank field or `0`.

---

### Edge Cases

- What happens for a legacy bare-hex token (a plain `"#RRGGBB"` string
  value, predating the object color format)? It already displays and edits
  as a CSS hex string today — it MUST continue to do so unchanged; this
  feature does not need to alter it further.
- What happens when a color space is switched mid-edit (e.g. `srgb` → `hsl`
  via the existing color-space selector)? The newly-selected space's value
  MUST render in that space's own CSS-style form immediately, matching
  today's space-switch behavior.
- What happens to the out-of-range validation message and swatch preview
  that already sit alongside the value? Both MUST keep working exactly as
  today, just alongside the reformatted value.
- What happens for color spaces whose CSS syntax uses percentages for some
  channels but not others (e.g. `lab`'s lightness vs. its unbounded `a`/`b`
  channels)? Each channel MUST follow that color space's own CSS Color
  Module 4 formatting convention, not a single one-size-fits-all rule.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display every color token's value as a CSS Color
  Module 4 function matching its `colorSpace`: `rgb()` for `srgb`, `hsl()`
  for `hsl`, `hwb()` for `hwb`, `lab()` for `lab`, `lch()` for `lch`,
  `oklab()` for `oklab`, `oklch()` for `oklch`, and the generic `color()`
  predicate (naming the space) for color spaces without a dedicated
  function name (`srgb-linear`, `display-p3`, `a98-rgb`, `prophoto-rgb`,
  `rec2020`, `xyz-d65`, `xyz-d50`).
- **FR-002**: System MUST keep every channel individually editable within
  the CSS-style representation — no regression from today's per-channel
  editing to a single free-text field.
- **FR-003**: System MUST represent a present alpha channel with the CSS
  `/ <alpha>` slash syntax, and omit that syntax entirely when no alpha is
  set, matching today's add/remove-alpha behavior.
- **FR-004**: System MUST render a DTCG `"none"` component using the literal
  CSS `none` keyword.
- **FR-005**: System MUST preserve the existing swatch preview, color-space
  selector, and out-of-range validation messaging unchanged alongside the
  newly-formatted value.
- **FR-006**: System MUST leave legacy bare-hex token values (plain
  `"#RRGGBB"` strings) displaying and editing exactly as they do today.
- **FR-007**: System MUST NOT change the DTCG JSON structure written back to
  a token document as a result of this formatting change — only the
  editor's on-screen presentation changes; the stored value's shape and
  precision are unaffected.
- **FR-008**: System MUST keep the color editor's screen-reader
  accessibility at least equal to today's, including a per-channel
  accessible name that still identifies the color space and channel being
  edited.

### Key Entities

- **Color Token Value**: The DTCG color value already stored on a token —
  either a legacy hex string, or an object with a `colorSpace`, three
  numeric (or `"none"`) `components`, and optional `alpha`/`hex` fallback.
  This feature does not change this entity's shape.
- **CSS-Style Representation**: The on-screen, editable rendering of a Color
  Token Value as a CSS Color Module 4 function or hex string appropriate to
  its `colorSpace` — a presentation-layer view over the same underlying
  value, not a new stored format.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every one of the 14 DTCG-supported color spaces renders with
  an explicit, recognizable CSS function name or `color()` predicate — none
  render as an unlabeled number sequence.
- **SC-002**: Every existing color-editing interaction (typing a new channel
  value, switching color spaces, adding or removing alpha, encountering an
  out-of-range value) continues to update the token and surface validation
  exactly as it did before this change — zero behavioral regressions.
- **SC-003**: A person reading a color token's value in the editor can
  identify which CSS color function it corresponds to without opening or
  consulting the underlying JSON document.

## Assumptions

- CSS Color Module 4 is the reference syntax for "looks like CSS" — this
  matches the DTCG 2025.10 color-space set the editor already supports,
  which itself maps directly onto CSS Color 4's color spaces.
- This feature changes *presentation and formatting only*. It does not
  introduce free-text CSS parsing (e.g. pasting a raw `rgb(255 0 0)`
  string) as a new input method — the discrete per-channel editing model
  already in place is assumed to continue, per User Story 2.
- Component numeric domains and validation ranges (e.g. `srgb` 0–1, `hsl`
  hue 0–360) are unchanged by this feature — only how those numbers are
  displayed changes, not what values are considered valid.
- Where CSS Color 4 permits more than one valid notation for a channel
  (e.g. an `rgb()` component as a percentage or as a 0–255 number), the
  exact choice is a formatting/implementation detail to be settled during
  planning, not a product-scope question.
