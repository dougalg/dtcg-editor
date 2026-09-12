# Feature Specification: Font Weight Token Editor Support

**Feature Branch**: `worktree-font-weight-token-support`

**Created**: 2026-09-12

**Status**: Implemented (2026-09-12)

**Input**: User description: "Add support for \"fontWeight\" tokens: implement full editor support for the DTCG fontWeight token type in the dtcg-editor. Currently fontWeight tokens parse and display via the generic unsupported-type JSON textarea fallback (read-only) — there is no dedicated editor. Per the DTCG 2025.10 Format spec (Font Weight type), $value is either an integer 1-1000, or one of a fixed set of keyword aliases. Follow the token-core + token-editor-dimension precedent."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Edit a fontWeight token's value (Priority: P1)

A designer or developer opens a design token file containing a `fontWeight` token (e.g. `{"$type": "fontWeight", "$value": 700}`) in the editor and wants to change its value using a purpose-built control, instead of hand-editing raw JSON.

**Why this priority**: This is the core value of the feature — without it, `fontWeight` tokens remain read-only/JSON-only, which is the exact gap being closed.

**Independent Test**: Open a token tree containing a `fontWeight` token; confirm a dedicated numeric editor (not the generic JSON textarea) renders for it, and that changing the value updates the token's `$value` and is reflected in the resolved preview.

**Acceptance Scenarios**:

1. **Given** a token with `$type: "fontWeight"` and `$value: 400`, **When** the token is selected in the editor, **Then** a dedicated fontWeight editor control (not the generic read-only JSON fallback) is displayed showing `400`.
2. **Given** the fontWeight editor showing `400`, **When** the user changes the value to `700`, **Then** the token's `$value` is updated to `700` and the change is persisted the same way other token type edits are.
3. **Given** the fontWeight editor, **When** the user enters a value outside the valid range (e.g. `0` or `1001`) or a non-numeric value, **Then** the editor prevents or flags the invalid value and does not write an invalid `$value`.

---

### User Story 2 - See a readable preview of a fontWeight token's resolved value (Priority: P2)

A user browsing a token tree wants to see, at a glance, what a `fontWeight` token (or a token that references one) resolves to, without opening its editor.

**Why this priority**: Consistent with how other token types (e.g. color, dimension) already show an inline/reference preview; without it, `fontWeight` tokens are inconsistent with the rest of the editor's UI when referenced from other tokens or shown as a candidate/hypothetical value.

**Independent Test**: Reference a `fontWeight` token from another token, or view it in a context that shows a resolved-value preview; confirm a short, readable rendering of the weight (e.g. "700" or "Bold") appears, styled consistently with the rest of the editor.

**Acceptance Scenarios**:

1. **Given** a `fontWeight` token with a numeric `$value`, **When** its value is shown in a reference/candidate preview, **Then** the preview renders the numeric weight as readable text using the editor's shared design tokens (no hardcoded styles).
2. **Given** a `fontWeight` token with a keyword-alias `$value` (e.g. `"bold"`), **When** its value is shown in a preview, **Then** the preview renders the alias text.

---

### User Story 3 - Author a fontWeight token using a keyword alias (Priority: P3)

A user who thinks in terms of named weights ("bold", "light") rather than numbers wants to pick a keyword alias instead of typing a raw number.

**Why this priority**: Nice-to-have per the DTCG spec (which permits keyword aliases as an alternative to the integer form), but a numeric-only editor already satisfies the spec and the core editing need; this can ship after the P1/P2 slice if time allows.

**Independent Test**: With a `fontWeight` token open in the editor, confirm there is a way to choose one of the DTCG-defined keyword aliases (e.g. via a dropdown) as an alternative to typing a number, and that doing so writes the alias string (not a number) as `$value`.

**Acceptance Scenarios**:

1. **Given** the fontWeight editor, **When** the user selects a keyword alias (e.g. "bold") from an alias picker, **Then** the token's `$value` is written as that exact string.
2. **Given** a token whose `$value` is already a keyword alias, **When** the editor loads, **Then** the alias picker (if present) reflects the current alias rather than showing a raw number.

---

### Edge Cases

- What happens when a `fontWeight` token's `$value` in the file is outside the valid range (e.g. `0`, `1001`, or a negative number) or is a string that isn't one of the defined aliases? The token is treated as invalid per the existing invalid-value handling used by other token types (surfaced as a validation error, not silently coerced or accepted).
- What happens when the value is a non-integer number (e.g. `400.5`)? Rejected — the DTCG spec requires an integer.
- What happens when a `fontWeight` token is referenced by another token (an alias/reference value) rather than holding a literal? The existing reference-resolution and preview mechanics apply unchanged; only the literal-value editing and preview rendering are new.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST recognize `fontWeight` as a supported token `$type` and stop routing it to the generic unsupported-type/JSON-textarea fallback.
- **FR-002**: The system MUST validate a `fontWeight` token's `$value` as either an integer in the inclusive range 1–1000, or one of the DTCG-defined keyword aliases (`thin`, `hairline`, `extra-light`, `ultra-light`, `light`, `normal`, `regular`, `book`, `medium`, `semi-bold`, `demi-bold`, `bold`, `extra-bold`, `ultra-bold`, `black`, `heavy`, `extra-black`, `ultra-black`), rejecting any other value.
- **FR-003**: The system MUST provide a dedicated editing control for a `fontWeight` token's literal value that lets a user set an integer weight in range.
- **FR-004**: The system MUST reject/prevent committing an out-of-range, non-integer, or otherwise invalid value from the editing control.
- **FR-005**: The system MUST provide a read-only preview rendering of a `fontWeight` token's resolved literal value (numeric or alias), used wherever other token types already show such a preview (e.g. reference/candidate previews), styled using the editor's existing shared design tokens.
- **FR-006**: The system MUST round-trip a `fontWeight` token's `$value` losslessly when the user makes no edit to it (parsing and re-serializing an untouched token produces the same value).
- **FR-007**: The system SHOULD let a user choose one of the defined keyword aliases as an alternative to typing a numeric value (nice-to-have; not required for the feature to be considered functionally complete).

### Key Entities

- **Font Weight Token Value**: The `$value` of a token whose `$type` is `fontWeight` — either an integer in 1–1000, or one of the fixed set of DTCG keyword aliases.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can open any `fontWeight` token in the editor and see a dedicated, non-JSON editing control 100% of the time (no fallback to the generic JSON textarea for this type).
- **SC-002**: A user can change a `fontWeight` token's value and see the change reflected in the token tree/preview without needing to hand-edit JSON.
- **SC-003**: 100% of out-of-range or malformed `fontWeight` values entered through the editor are rejected before being written to the token's `$value`.
- **SC-004**: Existing `fontWeight` tokens in a loaded file that are untouched by the user retain byte-for-value-identical `$value` after a save/round-trip.

## Assumptions

- The number-input-only editor (User Story 1/2) is sufficient to consider this feature complete; the keyword-alias picker (User Story 3) is a nice-to-have and may ship in the same pass or be deferred, per implementer judgment, consistent with the task's stated scope.
- "Preview" here follows the same UI contract already used by other token types (e.g. color, dimension) for rendering a resolved literal value in reference/candidate contexts.
- No new external dependency is required; a number input is sufficient for the primary editing control, matching `token-editor-dimension`'s precedent.
- This feature only adds editor support for the `fontWeight` type; it does not change how `fontWeight` tokens are referenced, resolved, or validated at the document/parse level beyond adding the type's own schema (which is separately required by `token-core`'s existing per-type schema pattern for every type it supports).
