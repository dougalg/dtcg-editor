# Feature Specification: Color Token Preview CSS-Style Formatting

**Feature Branch**: `002-color-preview-css-format`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "color-editor formats should look like css representation instead of raw json" — refined: "this spec is currently written about editing, but it is just about previews. this shouldn't touch existing edit behaviour, but the visual rendering should align for the user. the difference is that this is for preview only so it isn't editable"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Read a previewed color token's value in CSS terms (Priority: P1)

A user is shown a color token's value in a read-only preview — for example,
while picking what a reference should point at, seeing the live resolved
value of a candidate token before committing to it. Today that preview shows
a swatch next to the token's raw DTCG JSON shape (e.g.
`{"colorSpace":"oklch","components":[0.7,0.1,180],"alpha":0.8}`). They want
the text next to the swatch written the way they'd write it in a stylesheet
instead, matching what the swatch itself is already rendered from, so the
preview reads naturally and agrees with what they see.

**Why this priority**: This is the entire feature. Every other story is a
guardrail around this one change.

**Independent Test**: Show a preview for a color token in each
DTCG-supported color space and confirm the text next to the swatch is a CSS
color function/hex string, not a JSON object or array.

**Acceptance Scenarios**:

1. **Given** a previewed color token in the `oklch` color space with alpha
   set, **When** the preview renders, **Then** the text reads as an
   `oklch(...)`-style CSS function with the alpha expressed via the CSS `/`
   syntax, not as a JSON object.
2. **Given** a previewed color token in any of the 14 DTCG-supported color
   spaces, **When** the preview renders, **Then** the swatch's rendered
   color and the adjacent text describe the same value — the text is not a
   separately-invented format that could ever disagree with what the swatch
   shows.
3. **Given** a previewed legacy bare-hex color token, **When** the preview
   renders, **Then** the text continues to show the plain hex string
   unchanged (it already reads as CSS).

---

### User Story 2 - Editing stays exactly as it is today (Priority: P1)

A user opens a color token to edit it directly (not to preview it via a
reference). Their editing experience — per-channel inputs, color-space
switching, alpha add/remove, range validation — must be completely
unaffected by this change. Only the separate, read-only preview path
changes.

**Why this priority**: Equal priority to Story 1 — this feature is
worthless, and actively harmful, if it regresses the thing people actually
edit with. The preview and the editor are already two separate rendering
paths in this codebase; this story is the guarantee that they stay that
way.

**Independent Test**: Exercise the existing color-editing test suite (per
channel edit, space switch, alpha add/remove, out-of-range validation) and
confirm zero behavioral change.

**Acceptance Scenarios**:

1. **Given** a color token opened for direct editing, **When** it is
   displayed, **Then** it renders exactly as it does today — unaffected by
   this feature.
2. **Given** a color token opened for direct editing, **When** any channel
   or alpha is edited, **Then** the resulting stored value and validation
   behavior are unchanged from today.

---

### User Story 3 - Non-color and invalid values keep declining gracefully (Priority: P3)

A preview is asked to render some value that isn't actually a valid color
(e.g. resolving a reference to a token of a different type, or malformed
data). Today the preview declines and lets the host fall back to its own
generic rendering. That must keep working exactly as before.

**Why this priority**: An existing safety behavior, not new functionality —
low risk of ever needing attention here, but worth stating so it isn't
accidentally lost.

**Independent Test**: Preview a non-color or malformed value and confirm the
preview still declines (renders nothing) rather than showing a broken or
malformed CSS-looking string.

**Acceptance Scenarios**:

1. **Given** a value that fails color validation, **When** the preview is
   asked to render it, **Then** it declines exactly as today, leaving the
   host's generic rendering to take over.

---

### Edge Cases

- What happens for a color token with a channel value of DTCG's `"none"`
  marker? The preview text must express it using CSS's own `none` keyword,
  consistent with what the swatch already does when computing its color.
- What happens for a color token with no alpha set? The preview text must
  omit the `/` alpha syntax entirely, exactly as the swatch's own color
  computation already does.
- What happens for a color space with no dedicated CSS function name (e.g.
  `display-p3`, `xyz-d65`)? The preview text must use whatever CSS
  representation the swatch's own color computation already uses for that
  space — this feature does not introduce a new/independent choice here.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The read-only color preview MUST display a token's value as a
  CSS color function or hex string, never as a raw JSON object or array.
- **FR-002**: The preview's displayed text MUST be derived from the same
  formatting logic already used to compute the swatch's rendered color, so
  the two can never disagree about what value they're showing.
- **FR-003**: This feature MUST NOT alter the interactive color editor's
  behavior, layout, or formatting in any way — it is scoped entirely to the
  read-only preview path, which is already a separate component from the
  editor in this codebase.
- **FR-004**: Legacy bare-hex color token previews MUST continue to display
  their existing hex string, unaffected by this change.
- **FR-005**: The preview MUST continue to decline (render nothing) for any
  value that fails color validation, exactly as it does today.
- **FR-006**: Every DTCG-supported color space MUST have a CSS-style
  preview text — none may fall back to a raw/unlabeled representation.

### Key Entities

- **Color Token Preview**: The existing read-only rendering path (a swatch
  plus adjacent text) used to show a color value the user is not currently
  editing — for example, a resolved reference's live preview. This feature
  changes only how its text is formatted.
- **Color Token Editor**: The existing interactive, per-channel editing UI.
  Already a separate component from the Preview in this codebase; explicitly
  out of scope for this feature.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every previewed color token, across all DTCG-supported color
  spaces and the legacy hex format, displays as a recognizable CSS color
  value — zero previews show a raw JSON structure.
- **SC-002**: A previewed color token's swatch and its adjacent text always
  describe the same value, with no possible source of disagreement between
  them.
- **SC-003**: Every existing color-editing interaction continues to behave
  exactly as before this change — zero regressions in the interactive
  editor.

## Assumptions

- This feature is scoped entirely to the color token type's existing
  read-only `Preview` rendering (used e.g. when previewing what a reference
  resolves to) — not its `Editor` rendering, which is already a distinct
  component in this codebase and is explicitly unaffected.
- The codebase already has a single formatting utility that computes a CSS
  color value for the swatch's rendered color, covering every
  DTCG-supported color space. This feature's job is to reuse that same
  formatting for the adjacent text, not to invent a new or independent
  mapping — that reuse is what guarantees the swatch and text can never
  disagree.
- Per-color-space CSS syntax choices (e.g. whether an RGB-family space uses
  a dedicated function name or the generic predicate form) are already
  decided by that existing formatting utility; this feature does not
  revisit or change those choices.
