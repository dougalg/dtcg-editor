# Feature Specification: Duration Token Support

**Feature Branch**: `worktree-duration-token-support`

**Created**: 2026-09-12

**Status**: Implemented (2026-09-12)

**Input**: User description: "Add support for \"duration\" tokens" — full editor support for the DTCG `duration` token type ($value shape `{ value: number >= 0, unit: "ms" | "s" }`), currently only viewable as an unsupported/readonly JSON fallback.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Edit a duration token's value and unit (Priority: P1)

A designer or engineer working in the token editor opens a token whose `$type` is `duration` and wants to change its numeric value and/or its unit (milliseconds or seconds) using a proper form control, the same way they already can for a `dimension` token, instead of being dropped into a raw JSON textarea.

**Why this priority**: This is the entire point of the feature — without a dedicated editor, `duration` tokens are effectively read-only for non-technical users, which is the exact gap being closed.

**Independent Test**: Open a design token document containing a `duration`-typed token, edit its value and unit through the editor UI, save, and confirm the on-disk `$value` reflects the change and still validates against the DTCG duration shape.

**Acceptance Scenarios**:

1. **Given** a token with `$type: "duration"` and `$value: { value: 200, unit: "ms" }`, **When** the user opens it in the editor, **Then** a numeric input showing `200` and a unit selector showing `ms` are displayed (not a JSON textarea).
2. **Given** the duration editor is open, **When** the user changes the numeric value to `1.5` and the unit to `s`, **Then** the token's `$value` becomes `{ value: 1.5, unit: "s" }`.
3. **Given** the duration editor is open, **When** the user enters a negative number, **Then** the editor rejects it / prevents saving an invalid value (duration MUST be >= 0 per the DTCG spec).

---

### User Story 2 - See a readable preview of a duration token (Priority: P2)

A user browsing a list of tokens, or a token that references another `duration` token, wants to see a short human-readable rendering of the resolved value (e.g. `200ms`) rather than a raw JSON blob, matching the preview experience other supported token types already provide (e.g. colors show a swatch, dimensions would show their formatted value).

**Why this priority**: Improves scannability and matches existing UX conventions for other token types; not required to make the value editable, so it is secondary to User Story 1.

**Independent Test**: View a token reference/candidate preview that resolves to a `duration` value and confirm it renders as a short formatted string (value + unit) rather than raw JSON.

**Acceptance Scenarios**:

1. **Given** a resolved `duration` value of `{ value: 200, unit: "ms" }`, **When** it is shown in a reference/candidate preview, **Then** the rendered text reads `200ms`.
2. **Given** a resolved `duration` value of `{ value: 1, unit: "s" }`, **When** it is shown in a reference/candidate preview, **Then** the rendered text reads `1s`.

---

### User Story 3 - Duration tokens are recognized as a first-class supported type (Priority: P3)

A user creating a brand-new token, or opening an existing file already containing valid `duration` tokens, sees `duration` treated the same as any other built-in supported type throughout the app (type picker, validation, parsing) rather than falling back to the generic "unsupported type" path.

**Why this priority**: Rounds out the feature so `duration` is indistinguishable from other built-in types anywhere the app enumerates or validates token types; depends on User Stories 1 and 2 already being in place.

**Independent Test**: Create a new token and pick `duration` from the type list; confirm it parses/validates correctly and no longer falls through to the JSON-textarea/readonly fallback path.

**Acceptance Scenarios**:

1. **Given** the token type picker, **When** the user opens it, **Then** `duration` appears alongside the other built-in types (e.g. `color`, `dimension`).
2. **Given** a token file containing a syntactically valid `duration` token, **When** the file is parsed, **Then** it validates successfully against the duration schema and round-trips losslessly when re-serialized with no edits.

### Edge Cases

- What happens when a `duration` token's `unit` is neither `"ms"` nor `"s"`? The value MUST fail validation (surfaced the same way other invalid token values are surfaced), not be silently coerced.
- What happens when `value` is negative or non-numeric? MUST fail validation per the DTCG spec's `>= 0` constraint.
- What happens when the numeric input is left empty or non-numeric while editing? The editor MUST prevent committing an invalid value, matching the existing `dimension` editor's behavior for its numeric input.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a dedicated editor UI for tokens with `$type: "duration"`, replacing the current unsupported/JSON-textarea fallback for that type.
- **FR-002**: The duration editor MUST allow editing the numeric `value` field and the `unit` field (`"ms"` or `"s"`) independently.
- **FR-003**: System MUST validate a `duration` token's `$value` against the DTCG 2025.10 shape (`{ value: number >= 0, unit: "ms" | "s" }`), rejecting values that don't conform.
- **FR-004**: System MUST provide a read-only preview rendering of a resolved `duration` value (short text form, e.g. `200ms`) for use anywhere resolved token values are previewed (e.g. token reference previews).
- **FR-005**: System MUST register `duration` as a built-in supported token type so it is recognized by the type picker, parser, and validator the same way `color`/`dimension` already are.
- **FR-006**: System MUST preserve round-trip fidelity for `duration` tokens — parsing and re-serializing an unmodified `duration` token MUST NOT change its on-disk representation semantically.

### Key Entities

- **Duration token value**: A `$value` object with two fields — `value` (non-negative number) and `unit` (`"ms"` or `"s"`) — representing a length of time, per the DTCG Duration type.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can change both the numeric value and unit of an existing `duration` token entirely through UI controls, with zero manual JSON editing required.
- **SC-002**: Every existing valid `duration` token in a loaded file renders with a dedicated editor (0% fall back to the generic JSON/unsupported-type path).
- **SC-003**: Resolved `duration` values shown in previews render as a short formatted string (`<number><unit>`) rather than raw JSON, matching the presentation style already used for other supported types.
- **SC-004**: Invalid `duration` values (negative numbers, unrecognized units) are rejected before being saved, with the same reliability as `dimension` token validation.

## Assumptions

- The DTCG 2025.10 Format spec's Duration type is the authoritative shape: `{ value: number (>= 0), unit: "ms" | "s" }` — identical in structure to `dimension`, differing only in the `unit` enum.
- The `duration` editor's UI and interaction model (a number input plus a unit select) mirrors the existing `dimension` editor precedent exactly, since the underlying data shape is structurally identical.
- The preview rendering for a resolved `duration` value follows the same lightweight, read-only rendering pattern already established for `color` (a short, styled text/visual representation), not a new pattern.
- No new third-party dependency is required — this is a structural analog of already-supported `dimension` tokens.
