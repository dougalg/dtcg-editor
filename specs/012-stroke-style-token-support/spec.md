# Feature Specification: Stroke Style Token Editor Support

**Feature Branch**: `worktree-stroke-style-token-support`

**Created**: 2026-09-13

**Status**: Implemented (2026-09-13)

**Input**: User description: "Add support for \"strokeStyle\" tokens: implement full editor support for the DTCG strokeStyle token type. Currently strokeStyle tokens parse and display via the generic unsupported-type JSON textarea fallback (read-only) — there is no dedicated editor. Per the DTCG 2025.10 Format spec (Stroke Style type), $value is either one of 8 named-style keywords, or an object { dashArray: DimensionValue[], lineCap }. Follow the token-core + token-editor-font-weight/token-editor-cubic-bezier precedent."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Edit a strokeStyle token's value (Priority: P1)

A designer or developer opens a design token file containing a `strokeStyle` token (e.g.
`{"$type": "strokeStyle", "$value": "dashed"}` or a custom dash-pattern object) and wants to
change its value using a purpose-built control, instead of hand-editing raw JSON.

**Why this priority**: This is the core value of the feature — without it, `strokeStyle` tokens
remain read-only/JSON-only, which is the exact gap being closed.

**Independent Test**: Open a token tree containing a `strokeStyle` token; confirm a dedicated
editor (not the generic JSON textarea) renders for it, offering both a named-style keyword picker
and a custom dash-pattern editor, and that changing the value updates the token's `$value`.

**Acceptance Scenarios**:

1. **Given** a token with `$type: "strokeStyle"` and `$value: "dashed"`, **When** the token is
   selected in the editor, **Then** a dedicated strokeStyle editor control is displayed with the
   named-style mode selected and "dashed" shown.
2. **Given** the strokeStyle editor in named-style mode, **When** the user picks a different
   keyword, **Then** the token's `$value` is updated to that exact keyword string.
3. **Given** a token whose `$value` is a `{ dashArray, lineCap }` object, **When** the token is
   selected, **Then** the editor shows the custom-dash-pattern mode selected, with each
   `dashArray` entry and the `lineCap` editable.
4. **Given** the strokeStyle editor, **When** the user toggles between named-style and
   custom-dash-pattern mode, **Then** the editor writes a valid default value for the newly
   selected mode (a keyword string, or a dash object) rather than an invalid intermediate value.
5. **Given** the custom-dash-pattern editor, **When** the user edits a dash segment's value/unit,
   changes the line cap, or adds/removes a dash segment, **Then** the token's `$value` is updated
   accordingly, and an invalid edit (e.g. a non-numeric dash value) is not committed.

---

### User Story 2 - See a readable preview of a strokeStyle token's resolved value (Priority: P2)

A user browsing a token tree wants to see, at a glance, what a `strokeStyle` token (or a token
that references one) resolves to, without opening its editor.

**Why this priority**: Consistent with how other token types already show a reference/candidate
preview; without it, `strokeStyle` tokens are inconsistent with the rest of the editor's UI.

**Independent Test**: Reference a `strokeStyle` token from another token, or view it in a
reference/candidate preview context; confirm a short, readable rendering appears.

**Acceptance Scenarios**:

1. **Given** a `strokeStyle` token with a named-style `$value` (e.g. `"dashed"`), **When** its
   value is shown in a preview, **Then** the preview renders that keyword text.
2. **Given** a `strokeStyle` token with a custom dash-pattern `$value`, **When** its value is
   shown in a preview, **Then** the preview renders a short, readable summary (e.g.
   `"dashed (butt)"`) rather than a raw JSON dump.
3. **Given** a value that does not conform to `StrokeStyleValueSchema` (e.g. it came from
   resolving an unrelated token type), **When** shown in the preview, **Then** the preview
   declines to render (returns nothing) so the host can fall back to its own generic rendering.

### Edge Cases

- What happens when a `strokeStyle` token's `$value` in the file is an unrecognized keyword
  string, or an object with a malformed `dashArray` entry or invalid `lineCap`? The token is
  treated as invalid per the existing invalid-value handling used by other token types.
- What happens when `dashArray` is empty? Valid per the DTCG spec (no restriction on array
  length) — the schema accepts it and the editor renders zero dash-segment rows plus the
  line-cap control and an "Add segment" affordance.
- What happens when a `strokeStyle` token is referenced by another token rather than holding a
  literal? The existing reference-resolution and preview mechanics apply unchanged; only the
  literal-value editing and preview rendering are new.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST recognize `strokeStyle` as a supported token `$type` and stop
  routing it to the generic unsupported-type/JSON-textarea fallback.
- **FR-002**: The system MUST validate a `strokeStyle` token's `$value` as either one of the 8
  DTCG-defined named-style keywords (`solid`, `dashed`, `dotted`, `double`, `groove`, `ridge`,
  `outset`, `inset`), or an object `{ dashArray: DimensionValue[], lineCap: "round" | "butt" |
  "square" }` where each `DimensionValue` reuses `token-core`'s existing `DimensionValueSchema`
  shape (`{ value: number, unit: "px" | "rem" }`) — rejecting any other value.
- **FR-003**: The system MUST provide a dedicated editing control offering both forms: a
  named-style keyword picker, and a custom dash-pattern editor (dash segment value/unit fields
  plus a line-cap picker), with a way to switch between the two modes.
- **FR-004**: The system MUST reject/prevent committing an invalid value from the editing control
  (e.g. a non-numeric dash segment value).
- **FR-005**: The system MUST provide a read-only preview rendering of a `strokeStyle` token's
  resolved literal value — the keyword directly for the named-style form, a short readable
  summary for the custom dash-pattern form — used wherever other token types already show such a
  preview, styled using the editor's existing shared design tokens.
- **FR-006**: The system MUST round-trip a `strokeStyle` token's `$value` losslessly when the user
  makes no edit to it.
- **FR-007**: Switching between named-style and custom-dash-pattern mode MUST write a valid
  default value for the newly selected mode, never an invalid intermediate value.

### Key Entities

- **Stroke Style Token Value**: The `$value` of a token whose `$type` is `strokeStyle` — either
  one of the 8 named-style keywords, or a `{ dashArray, lineCap }` object.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can open any `strokeStyle` token in the editor and see a dedicated,
  non-JSON editing control 100% of the time.
- **SC-002**: A user can change a `strokeStyle` token's value (in either form) and see the change
  reflected in the token tree/preview without needing to hand-edit JSON.
- **SC-003**: 100% of malformed `strokeStyle` values entered through the editor are rejected
  before being written to the token's `$value`.
- **SC-004**: Existing `strokeStyle` tokens in a loaded file that are untouched by the user retain
  byte-for-value-identical `$value` after a save/round-trip.

## Assumptions

- The mode toggle plus per-field custom-pattern editor (User Story 1) is sufficient to consider
  this feature complete; the exact visual layout is an implementer judgment call, recorded with
  rationale in `plan.md`.
- "Preview" here follows the same UI contract already used by other token types (color,
  dimension, fontWeight, etc.) for rendering a resolved literal value in reference/candidate
  contexts.
- No new external dependency is required; the design system's existing `RadioGroup`/`Select`
  components plus plain `<input>`s are sufficient.
- This feature only adds editor support for the `strokeStyle` type; it does not change how
  `strokeStyle` tokens are referenced, resolved, or validated at the document/parse level beyond
  adding the type's own schema.
