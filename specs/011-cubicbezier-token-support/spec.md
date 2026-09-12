# Feature Specification: cubicBezier Token Support

**Feature Branch**: `worktree-cubicbezier-token-support`

**Created**: 2026-09-12

**Status**: Implemented (2026-09-12)

**Input**: User description: "Add support for \"cubicBezier\" tokens. DTCG cubicBezier $value is a 4-tuple [P1x, P1y, P2x, P2y] of numbers representing the two control points of a cubic bezier easing curve (designtokens.org/tr/2025.10/format, Cubic Bezier type). Per spec, P1x and P2x (indices 0 and 2) MUST be within [0,1]; P1y/P2y (indices 1 and 3) are unconstrained (can be negative or greater than 1, for overshoot/bounce easings). Currently the app can parse/display a cubicBezier token only as an unsupported type (readonly JSON textarea fallback via FallbackValueEditor) — there is no dedicated editor. This feature adds full editor support, following this repo's existing token-editor-dimension package as structural precedent."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Edit a cubicBezier token's control points (Priority: P1)

A designer/developer opens a token file containing a `cubicBezier` token (e.g. an easing curve used by a `transition` composite token) and wants to adjust its four control-point coordinates directly in the editor, instead of hand-editing raw JSON.

**Why this priority**: This is the core value of the feature — without it, `cubicBezier` tokens remain stuck on the generic, error-prone JSON-textarea fallback, which is the exact gap this feature exists to close.

**Independent Test**: Can be fully tested by opening a token tree containing a `cubicBezier` token, verifying a dedicated four-field editor renders (not the JSON fallback), changing one coordinate, and confirming the token's `$value` updates to reflect only that coordinate while preserving the other three.

**Acceptance Scenarios**:

1. **Given** a token with `$type: "cubicBezier"` and `$value: [0.4, 0, 0.2, 1]`, **When** the token is selected for editing, **Then** the editor shows four numeric fields pre-filled with 0.4, 0, 0.2, and 1 respectively, and no JSON textarea fallback is shown.
2. **Given** the cubicBezier editor is open, **When** the user changes the second field (P1y) to `-0.5`, **Then** the token's `$value` becomes `[0.4, -0.5, 0.2, 1]`.
3. **Given** the cubicBezier editor is open, **When** the user changes the first field (P1x) to `1.5`, **Then** the value is clamped/rejected so the stored `$value` never exceeds `1` for that coordinate.
4. **Given** the cubicBezier editor is open, **When** the user changes the first field (P1x) to `-0.2`, **Then** the value is clamped/rejected so the stored `$value` never goes below `0` for that coordinate.

---

### User Story 2 - See a resolved cubicBezier value at a glance (Priority: P2)

A user viewing a token that references another `cubicBezier` token (or viewing a reference candidate list) wants to see a compact, readable rendering of the resolved curve's four numbers, rather than raw JSON or nothing at all.

**Why this priority**: Important for usability and consistency with how other resolved reference values (e.g. color swatches) are already previewed, but the feature is still valuable without it if the editor alone ships.

**Independent Test**: Can be fully tested by rendering the read-only preview for a resolved `cubicBezier` value and confirming it shows a short, human-readable string of the four numbers, and that it declines gracefully (renders nothing) for a value that isn't a valid cubicBezier tuple.

**Acceptance Scenarios**:

1. **Given** a resolved reference whose literal value is `[0.4, 0, 0.2, 1]` and whose type is `cubicBezier`, **When** the preview is rendered, **Then** it displays a short readable representation of the four numbers (e.g. `cubic-bezier(0.4, 0, 0.2, 1)`).
2. **Given** a resolved reference value that does not conform to the cubicBezier shape (e.g. a 3-element array, or a non-numeric entry), **When** the preview is rendered, **Then** it renders nothing and the host's generic fallback rendering is used instead.

---

### User Story 3 - Existing cubicBezier tokens keep parsing/round-tripping unchanged (Priority: P3)

A user with existing `cubicBezier` tokens in their file (previously only viewable via the JSON fallback) opens the file after this feature ships and expects nothing about the file's other data to change, and the new editor to load their existing value correctly, including spec-valid edge values like overshoot easings.

**Why this priority**: Protects data integrity and backward compatibility; lower priority than the two above only because it's a non-regression guarantee rather than new functionality.

**Independent Test**: Can be fully tested by round-tripping a token file containing a `cubicBezier` token with a P1y/P2y value outside `[0,1]` (e.g. `[0.68, -0.55, 0.27, 1.55]`, a common "back" easing) through parse → edit-nothing → serialize, and confirming the output is unchanged.

**Acceptance Scenarios**:

1. **Given** a `cubicBezier` token with `$value: [0.68, -0.55, 0.27, 1.55]`, **When** the file is parsed, **Then** parsing succeeds and the editor displays all four values exactly, including the out-of-range P1y/P2y values.
2. **Given** the same token is loaded and no edit is made, **When** the file is re-serialized, **Then** the output `$value` is identical to the input.

### Edge Cases

- A raw `$value` with fewer or more than 4 elements MUST fail validation and fall back to the existing unsupported-type / validation-error handling — it MUST NOT crash the editor.
- A raw `$value` where `P1x` or `P2x` is outside `[0, 1]` MUST fail validation (per DTCG spec) and be treated as an invalid token value, not silently clamped at parse time.
- A raw `$value` containing a non-numeric entry (e.g. a string) MUST fail validation.
- Typing a non-numeric string into one of the editor's four number fields MUST NOT crash the editor or corrupt the other three values.
- `P1y`/`P2y` MAY be negative or greater than 1 (overshoot/bounce easings) and MUST be accepted by both validation and the editor UI.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST validate a `cubicBezier` token's `$value` as an exact 4-tuple of numbers `[P1x, P1y, P2x, P2y]`.
- **FR-002**: The system MUST reject a `cubicBezier` `$value` where `P1x` (index 0) or `P2x` (index 2) falls outside the inclusive range `[0, 1]`, per the DTCG format spec.
- **FR-003**: The system MUST accept any finite numeric value (including negative numbers and numbers greater than 1) for `P1y` (index 1) and `P2y` (index 3).
- **FR-004**: The system MUST provide a dedicated interactive editor for `cubicBezier` tokens, replacing the generic JSON-textarea fallback for this type.
- **FR-005**: The editor MUST expose exactly four independently editable numeric fields, one per control-point coordinate, labeled so a user can tell which coordinate (P1x, P1y, P2x, P2y) each field controls.
- **FR-006**: The editor MUST enforce the `[0, 1]` bound on the two x-coordinate fields (P1x, P2x) at the input level, and MUST NOT allow committing a value outside that bound for those two fields.
- **FR-007**: The editor MUST allow the two y-coordinate fields (P1y, P2y) to accept negative values and values greater than 1.
- **FR-008**: Editing one field MUST update only that coordinate in the token's `$value`, leaving the other three coordinates unchanged.
- **FR-009**: The system MUST provide a read-only preview rendering for a resolved `cubicBezier` reference value, showing a short human-readable representation of all four numbers.
- **FR-010**: The preview MUST decline (render nothing, deferring to the host's generic fallback) when given a value that does not conform to the cubicBezier shape.
- **FR-011**: The system MUST register `cubicBezier` as a built-in supported token type alongside the existing `dimension` and `color` types, requiring no additional host-app configuration to activate.
- **FR-012**: Parsing and re-serializing a file containing a `cubicBezier` token, with no edits made, MUST produce byte-for-byte-equivalent `$value` data (round-trip fidelity), including for out-of-range y-coordinates.

### Key Entities

- **CubicBezier value**: The DTCG `$value` payload for a `cubicBezier`-typed token — a 4-element numeric tuple `[P1x, P1y, P2x, P2y]` where P1x and P2x are constrained to `[0, 1]` and P1y/P2y are unconstrained.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can view and edit any valid `cubicBezier` token in the tree using the dedicated editor, with zero instances of the JSON-textarea fallback appearing for a value that passes validation.
- **SC-002**: 100% of attempts to set an x-coordinate field outside `[0, 1]` are prevented by the editor (verified by automated test), with zero out-of-range values ever reaching the saved token file.
- **SC-003**: 100% of existing `cubicBezier` tokens (including out-of-range-y "overshoot" easings) round-trip through parse → serialize with no data change.
- **SC-004**: A resolved `cubicBezier` reference's preview is legible at a glance (a single short line of text) rather than requiring the user to open the token to see its value.

## Assumptions

- The visual curve-preview (an SVG rendering of the bezier curve) is a nice-to-have, not required for this feature's v1 scope; the plan will record whether it is included.
- "Enforce the bound at the input level" means the UI prevents committing an out-of-range x-coordinate (e.g. via native input `min`/`max`/clamping-on-change), not that the backing Zod schema is loosened — invalid values must still fail `valueSchema` validation if they ever reach it by another path (e.g. direct file edit).
- No new approved dependency is required; the editor uses plain HTML number inputs, consistent with `DimensionEditor`'s precedent.
- This feature only adds first-class support for the standalone `cubicBezier` token type; wiring cubicBezier as a sub-field of a composite `transition` token's editor is out of scope (tracked separately if `transition` support becomes a feature).
