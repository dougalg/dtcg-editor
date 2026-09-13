# Feature Specification: Number Token Editor Support

**Feature Branch**: `worktree-number-token-support`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Add support for \"number\" tokens: implement full editor support for the DTCG number token type in the dtcg-editor. Currently number tokens parse and display via the generic unsupported-type JSON textarea fallback (read-only) — there is no dedicated editor. Per the DTCG 2025.10 Format spec (Number type), $value is a bare, unitless number (used for things like opacity, line-height, z-index, or scale factors). Follow the token-core + token-editor-font-weight precedent, but simpler: no keyword aliases, no integer/range constraint."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Edit a number token's value (Priority: P1)

A designer or developer opens a design token file containing a `number` token (e.g. `{"$type": "number", "$value": 1.5}`, used for things like opacity, line-height, z-index, or a scale factor) and wants to change its value using a purpose-built control, instead of hand-editing raw JSON.

**Why this priority**: This is the core value of the feature — without it, `number` tokens remain read-only/JSON-only, which is the exact gap being closed.

**Independent Test**: Open a token tree containing a `number` token; confirm a dedicated numeric editor (not the generic JSON textarea) renders for it, and that changing the value updates the token's `$value` and is reflected in the resolved preview.

**Acceptance Scenarios**:

1. **Given** a token with `$type: "number"` and `$value: 1.5`, **When** the token is selected in the editor, **Then** a dedicated number editor control (not the generic read-only JSON fallback) is displayed showing `1.5`.
2. **Given** the number editor showing `1.5`, **When** the user changes the value to `2`, **Then** the token's `$value` is updated to `2` and the change is persisted the same way other token type edits are.
3. **Given** the number editor, **When** the user enters a non-numeric value (e.g. clears the field or types letters), **Then** the editor prevents or flags the invalid value and does not write an invalid `$value`.
4. **Given** the number editor, **When** the user enters a negative number (e.g. `-1`) or a fractional number (e.g. `0.75`), **Then** the value is accepted and written as-is — the DTCG Number type has no sign or integer constraint.

---

### User Story 2 - See a readable preview of a number token's resolved value (Priority: P2)

A user browsing a token tree wants to see, at a glance, what a `number` token (or a token that references one) resolves to, without opening its editor.

**Why this priority**: Consistent with how other token types (e.g. color, dimension, fontWeight) already show an inline/reference preview; without it, `number` tokens are inconsistent with the rest of the editor's UI when referenced from other tokens or shown as a candidate/hypothetical value.

**Independent Test**: Reference a `number` token from another token, or view it in a context that shows a resolved-value preview; confirm a short, readable rendering of the number appears, styled consistently with the rest of the editor.

**Acceptance Scenarios**:

1. **Given** a `number` token with `$value: 0.5`, **When** its value is shown in a reference/candidate preview, **Then** the preview renders `0.5` as readable text using the editor's shared design tokens (no hardcoded styles).
2. **Given** a value that does not conform to the number schema (e.g. it comes from resolving an arbitrary other token whose value isn't actually a plain number), **When** the preview is asked to render it, **Then** the preview declines to render (falling back to the host's generic rendering) rather than showing something misleading.

---

### Edge Cases

- What happens when a `number` token's `$value` in the file is not a number at all (e.g. a string, boolean, object, or array)? The token is treated as invalid per the existing invalid-value handling used by other token types (surfaced as a validation error, not silently coerced or accepted).
- What happens when the value is `NaN` or `Infinity`/`-Infinity`? These are rejected — the DTCG Number type is a finite, real, unitless number; JSON itself has no literal for `NaN`/`Infinity`, so a conforming token file cannot contain them, and any in-memory value that is one of these is treated as invalid.
- What happens when a `number` token is referenced by another token (an alias/reference value) rather than holding a literal? The existing reference-resolution and preview mechanics apply unchanged; only the literal-value editing and preview rendering are new.
- What happens with `0` or `-0`? Both are valid numbers and are accepted as-is.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST recognize `number` as a supported token `$type` and stop routing it to the generic unsupported-type/JSON-textarea fallback.
- **FR-002**: The system MUST validate a `number` token's `$value` as a finite JavaScript number (any sign, integer or fractional), rejecting any non-number value and rejecting `NaN`/`Infinity`/`-Infinity`.
- **FR-003**: The system MUST provide a dedicated editing control for a `number` token's literal value that lets a user set any finite number, positive, negative, zero, or fractional.
- **FR-004**: The system MUST reject/prevent committing a non-numeric or non-finite value from the editing control.
- **FR-005**: The system MUST provide a read-only preview rendering of a `number` token's resolved literal value, used wherever other token types already show such a preview (e.g. reference/candidate previews), styled using the editor's existing shared design tokens.
- **FR-006**: The system MUST round-trip a `number` token's `$value` losslessly when the user makes no edit to it (parsing and re-serializing an untouched token produces the same value).

### Key Entities

- **Number Token Value**: The `$value` of a token whose `$type` is `number` — a bare, unitless, finite JavaScript number of any sign, used for things like opacity, line-height, z-index, or scale factors.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can open any `number` token in the editor and see a dedicated, non-JSON editing control 100% of the time (no fallback to the generic JSON textarea for this type).
- **SC-002**: A user can change a `number` token's value and see the change reflected in the token tree/preview without needing to hand-edit JSON.
- **SC-003**: 100% of non-numeric or non-finite values entered through the editor are rejected before being written to the token's `$value`.
- **SC-004**: Existing `number` tokens in a loaded file that are untouched by the user retain byte-for-value-identical `$value` after a save/round-trip.

## Assumptions

- Unlike `fontWeight`, the DTCG Number type has no keyword aliases and no integer/range constraint, so the editor is a single plain number input — no secondary alias picker is needed.
- "Preview" here follows the same UI contract already used by other token types (e.g. color, dimension, fontWeight) for rendering a resolved literal value in reference/candidate contexts.
- No new external dependency is required; a native number input is sufficient for the editing control, matching `token-editor-font-weight`'s and `token-editor-dimension`'s precedent.
- This feature only adds editor support for the `number` type; it does not change how `number` tokens are referenced, resolved, or validated at the document/parse level beyond adding the type's own schema (which is separately required by `token-core`'s existing per-type schema pattern for every type it supports).
