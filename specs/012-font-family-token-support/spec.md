# Feature Specification: Font Family Token Editor Support

**Feature Branch**: `worktree-font-family-token-support`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Add support for \"fontFamily\" tokens: implement full editor support for the DTCG fontFamily token type. Currently fontFamily tokens parse and display via the generic unsupported-type JSON textarea fallback (read-only) — there is no dedicated editor. Per the DTCG 2025.10 Format spec (Font Family type), $value is either a single string (one font family name) or an array of strings (a preference-ordered fallback stack). Follow the token-core + token-editor-font-weight/token-editor-duration precedent."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Edit a fontFamily token's fallback stack (Priority: P1)

A designer or developer opens a design token file containing a `fontFamily` token (e.g. `{"$type": "fontFamily", "$value": ["Helvetica", "Arial", "sans-serif"]}`) and wants to add, remove, and reorder font family names using a purpose-built control, instead of hand-editing raw JSON.

**Why this priority**: This is the core value of the feature — without it, `fontFamily` tokens remain read-only/JSON-only, which is the exact gap being closed.

**Independent Test**: Open a token tree containing a `fontFamily` token with an array value; confirm a dedicated list editor (not the generic JSON textarea) renders, showing each family name as a separate, orderable entry, and that adding/removing/reordering entries updates the token's `$value` and is reflected in the resolved preview.

**Acceptance Scenarios**:

1. **Given** a token with `$type: "fontFamily"` and `$value: ["Helvetica", "Arial", "sans-serif"]`, **When** the token is selected in the editor, **Then** a dedicated fontFamily list editor (not the generic read-only JSON fallback) is displayed showing three ordered entries.
2. **Given** the fontFamily editor showing an existing stack, **When** the user adds a new family name, **Then** it is appended to the token's `$value` array.
3. **Given** the fontFamily editor showing an existing stack, **When** the user removes an entry, **Then** it is removed from the token's `$value` array (and the array may become empty).
4. **Given** the fontFamily editor showing an existing stack, **When** the user reorders two entries (e.g. moves the last entry to first), **Then** the token's `$value` array reflects the new order, preserving preference order semantics.
5. **Given** the fontFamily editor, **When** the user submits a blank/empty family name, **Then** the editor prevents or flags the invalid entry and does not write an empty string into the array.

---

### User Story 2 - Edit a fontFamily token authored as a single string (Priority: P1)

A user opens a `fontFamily` token authored as a single string (e.g. `{"$type": "fontFamily", "$value": "Helvetica"}`, the DTCG spec's other permitted shape) and wants to edit it with the same control used for the array form, without needing to first understand which of the two on-disk shapes it uses.

**Why this priority**: Both shapes are equally valid per the DTCG spec; an editor that only handles the array form would leave a real subset of valid tokens unsupported, reproducing the original gap for those files.

**Independent Test**: Open a token tree containing a `fontFamily` token whose raw `$value` is a single string; confirm the same list editor renders (single-string value promoted to a one-item list for editing), and that adding a second entry to it results in an array `$value` on save.

**Acceptance Scenarios**:

1. **Given** a token with `$type: "fontFamily"` and `$value: "Helvetica"`, **When** the token is selected in the editor, **Then** the list editor displays one entry, `"Helvetica"`.
2. **Given** the single-entry list editor from a string-shaped token, **When** the user leaves the list at exactly one entry and only edits that entry's text, **Then** the token's `$value` is written back as a single string (not a one-item array), preserving the original shape for an otherwise-untouched single value.
3. **Given** the single-entry list editor from a string-shaped token, **When** the user adds a second entry, **Then** the token's `$value` is written as an array of both entries.

---

### User Story 3 - See a readable preview of a fontFamily token's resolved value (Priority: P2)

A user browsing a token tree wants to see, at a glance, what a `fontFamily` token (or a token that references one) resolves to, without opening its editor.

**Why this priority**: Consistent with how other token types (e.g. color, dimension, fontWeight) already show an inline/reference preview; without it, `fontFamily` tokens are inconsistent with the rest of the editor's UI when referenced from other tokens or shown as a candidate/hypothetical value.

**Independent Test**: Reference a `fontFamily` token from another token, or view it in a context that shows a resolved-value preview; confirm a short, readable, comma-joined rendering of the family stack appears, styled consistently with the rest of the editor, with long stacks truncated and summarized.

**Acceptance Scenarios**:

1. **Given** a `fontFamily` token with `$value: ["Arial", "sans-serif"]`, **When** its value is shown in a reference/candidate preview, **Then** the preview renders `"Arial, sans-serif"` using the editor's shared design tokens (no hardcoded styles).
2. **Given** a `fontFamily` token with a single-string `$value` (e.g. `"Helvetica"`), **When** its value is shown in a preview, **Then** the preview renders `"Helvetica"`.
3. **Given** a `fontFamily` token with a long fallback stack (more entries than the preview's display limit), **When** its value is shown in a preview, **Then** the preview shows the first few entries followed by a "+N more" indicator rather than the full list.
4. **Given** a value that does not conform to the `fontFamily` schema (e.g. an array containing a non-string, or a plain object), **When** the preview is asked to render it, **Then** it declines to render (returns nothing) rather than throwing or showing incorrect text, letting the host fall back to its own generic rendering.

---

### Edge Cases

- What happens when a `fontFamily` token's `$value` in the file is an empty array (`[]`)? Treated as a valid, if unusual, editable state — the DTCG spec does not forbid an empty preference list; the editor shows zero entries and allows adding to it. The preview renders empty text rather than erroring.
- What happens when `$value` is an array containing a non-string element (e.g. a number), or is some other JSON shape entirely (object, boolean, null)? Treated as invalid per the existing invalid-value handling used by other token types (surfaced as a validation error / decline-to-render in `Preview`, not silently coerced).
- What happens when the user tries to remove the only remaining entry? Allowed — the result is an empty array, matching the empty-array edge case above.
- What happens when a `fontFamily` token is referenced by another token (an alias/reference value) rather than holding a literal? The existing reference-resolution and preview mechanics apply unchanged; only the literal-value editing and preview rendering are new.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST recognize `fontFamily` as a supported token `$type` and stop routing it to the generic unsupported-type/JSON-textarea fallback.
- **FR-002**: The system MUST validate a `fontFamily` token's `$value` as either a single string or an array of strings, rejecting any other shape (including an array containing non-string elements).
- **FR-003**: The system MUST provide a dedicated list-editing control for a `fontFamily` token's literal value that lets a user add a new family name, remove an existing one, and reorder the list.
- **FR-004**: The system MUST reject/prevent committing an empty (blank/whitespace-only) family name entry from the editing control.
- **FR-005**: The system MUST edit a single-string-shaped `$value` using the same list control (promoted to a one-item list for editing), and MUST write the value back as a single string when the list is left at exactly one entry, or as an array when it has zero entries or more than one.
- **FR-006**: The system MUST provide a read-only preview rendering of a `fontFamily` token's resolved literal value as a comma-joined string, truncated with a "+N more" indicator when the list exceeds the preview's display limit, used wherever other token types already show such a preview (e.g. reference/candidate previews), styled using the editor's existing shared design tokens.
- **FR-007**: The `Preview` component MUST decline to render (return nothing, letting the host fall back to generic rendering) when given a value that does not conform to the `fontFamily` schema.
- **FR-008**: The system MUST round-trip a `fontFamily` token's `$value` losslessly when the user makes no edit to it (parsing and re-serializing an untouched token produces the same value, including preserving the single-string vs. array on-disk shape).

### Key Entities

- **Font Family Token Value**: The `$value` of a token whose `$type` is `fontFamily` — either a single string (one font family name) or an array of strings (a preference-ordered fallback stack, possibly empty).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can open any `fontFamily` token (string- or array-shaped) in the editor and see a dedicated, non-JSON list editing control 100% of the time (no fallback to the generic JSON textarea for this type).
- **SC-002**: A user can add, remove, and reorder entries in a `fontFamily` token's fallback stack and see the change reflected in the token tree/preview without needing to hand-edit JSON.
- **SC-003**: 100% of blank/empty family-name entries submitted through the editor are rejected before being written to the token's `$value`.
- **SC-004**: Existing `fontFamily` tokens in a loaded file that are untouched by the user retain byte-for-value-identical `$value` (including on-disk shape) after a save/round-trip.
- **SC-005**: Long fallback stacks are always shown in previews in a fixed, bounded amount of space (never an unbounded comma-joined string), via the "+N more" truncation.

## Assumptions

- The single-string form is edited by promoting it to a one-item list in the UI (rather than a separate single-input mode), for a single consistent editing experience across both on-disk shapes; the original shape is preserved on serialize only when the list stays at exactly one entry — this is a UI/serialization decision recorded with rationale in `plan.md`.
- "Preview" here follows the same UI contract already used by other token types (e.g. color, dimension, fontWeight) for rendering a resolved literal value in reference/candidate contexts, including the required decline-to-render-on-mismatch behavior.
- No new external dependency is required; a plain list editor (add/remove/reorder via up/down controls or drag, following existing design-system patterns) is sufficient, matching the precedent set by other `token-editor-*` packages.
- This feature only adds editor support for the `fontFamily` type; it does not change how `fontFamily` tokens are referenced, resolved, or validated at the document/parse level beyond adding the type's own schema (which is separately required by `token-core`'s existing per-type schema pattern for every type it supports).
- A "long" fallback stack for preview-truncation purposes is more than 3 entries, matching common comma-joined-list UI conventions elsewhere; entries beyond the third are summarized as "+N more".
