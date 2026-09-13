# Feature Specification: Typography Token Editor Support

**Feature Branch**: `worktree-typography-token-support`

**Created**: 2026-09-13

**Status**: Implemented (2026-09-13)

**Input**: User description: "Add support for \"typography\" tokens: implement full editor support for the DTCG typography composite token type. Per the DTCG 2025.10 Format spec (Typography type), $value is { fontFamily: FontFamilyValue, fontSize: DimensionValue, fontWeight: FontWeightValue, letterSpacing: DimensionValue, lineHeight: number }. Reuse the existing fontFamily, dimension, and fontWeight schemas and editors rather than rebuilding sub-controls: the typography editor embeds the existing FontFamilyEditor, DimensionEditor (twice, for fontSize and letterSpacing), FontWeightEditor, and a number control for lineHeight directly."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Edit a typography token's five sub-fields (Priority: P1)

A designer or developer opens a design token file containing a `typography` token (e.g. `{"$type": "typography", "$value": {"fontFamily": "Arial", "fontSize": {"value": 16, "unit": "px"}, "fontWeight": 700, "letterSpacing": {"value": 0, "unit": "px"}, "lineHeight": 1.4}}`) and wants to edit its font family, font size, font weight, letter spacing, and line height using purpose-built controls, instead of hand-editing raw JSON.

**Why this priority**: This is the core value of the feature — without it, `typography` tokens remain read-only/JSON-only, which is the exact gap being closed.

**Independent Test**: Open a token tree containing a `typography` token; confirm a dedicated composite editor (not the generic JSON textarea) renders five clearly labeled sub-controls — font family, font size, font weight, letter spacing, line height — and that editing any one of them updates only that sub-field of the token's `$value`, leaving the other four untouched.

**Acceptance Scenarios**:

1. **Given** a token with `$type: "typography"` and a valid five-field `$value`, **When** the token is selected in the editor, **Then** a dedicated typography editor (not the generic read-only JSON fallback) is displayed showing five labeled sub-controls.
2. **Given** the typography editor, **When** the user changes the font family sub-control, **Then** only `$value.fontFamily` is updated; the other four fields are unchanged.
3. **Given** the typography editor, **When** the user changes the font size sub-control's numeric value or unit, **Then** only `$value.fontSize` is updated; the other four fields are unchanged.
4. **Given** the typography editor, **When** the user changes the font weight sub-control, **Then** only `$value.fontWeight` is updated; the other four fields are unchanged.
5. **Given** the typography editor, **When** the user changes the letter spacing sub-control's numeric value or unit, **Then** only `$value.letterSpacing` is updated; the other four fields are unchanged.
6. **Given** the typography editor, **When** the user changes the line height sub-control, **Then** only `$value.lineHeight` is updated; the other four fields are unchanged.
7. **Given** the typography editor's font size and letter spacing sub-controls both being instances of the same underlying dimension control, **When** the user interacts with one of them, **Then** the other's displayed value never changes as a side effect, and each is unambiguously labeled ("Font Size" vs "Letter Spacing") so a user cannot confuse which sub-control edits which field.

---

### User Story 2 - See a readable preview of a typography token's resolved value (Priority: P2)

A user browsing a token tree wants to see, at a glance, what a `typography` token (or a token that references one) resolves to, without opening its editor.

**Why this priority**: Consistent with how other token types (color, dimension, duration, cubicBezier, fontWeight, fontFamily, transition, border) already show an inline/reference preview; without it, `typography` tokens are inconsistent with the rest of the editor's UI when referenced from other tokens or shown as a candidate/hypothetical value.

**Independent Test**: Reference a `typography` token from another token, or view it in a context that shows a resolved-value preview; confirm a short, single-line, human-readable rendering appears combining all five sub-fields, styled consistently with the rest of the editor.

**Acceptance Scenarios**:

1. **Given** a `typography` token with `fontSize: 16px`, `lineHeight: 1.4`, `fontFamily: "Arial"`, `fontWeight: 700`, `letterSpacing: 0px`, **When** its value is shown in a reference/candidate preview, **Then** the preview renders a single short line combining font size, line height, font family, and font weight (e.g. `16px/1.4 Arial 700`).
2. **Given** a `typography` token with a non-zero letter spacing, **When** its value is shown in a preview, **Then** the preview's single line also reflects the letter spacing.
3. **Given** a value that does not conform to the `typography` schema (e.g. missing `lineHeight`, or a `fontSize` that is itself invalid), **When** the preview is asked to render it, **Then** it declines to render (returns nothing) rather than throwing or showing incorrect text, letting the host fall back to its own generic rendering.

---

### Edge Cases

- What happens when `$value.letterSpacing` is `0` (e.g. `{"value": 0, "unit": "px"}`)? Treated as a valid, normal value — editable like any other dimension; the editor always shows all five sub-controls regardless of value.
- What happens when a sub-field (e.g. `fontWeight`) is itself invalid per its own schema (e.g. an integer outside `1-1000` and not a recognized keyword alias)? The whole `typography` value fails `TypographyValueSchema` validation, per the existing per-type validation contract — same as any other composite/nested schema failure in this codebase.
- What happens when a `typography` token is referenced by another token (an alias/reference value) rather than holding a literal? The existing reference-resolution and preview mechanics apply unchanged; only the literal-value editing and preview rendering are new.
- What happens if the two dimension-shaped sub-controls (fontSize, letterSpacing) are rendered from the exact same underlying component? They MUST be independently wired (separate `value`/`onChange` closures) so editing one never mutates the other's displayed value or the other field in `$value`.
- What happens with `lineHeight`, which per spec is a bare unitless number rather than a `DimensionValue`? It MUST be edited and validated as a plain number, not coerced into a dimension with a unit.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST recognize `typography` as a supported token `$type` and stop routing it to the generic unsupported-type/JSON-textarea fallback.
- **FR-002**: The system MUST validate a `typography` token's `$value` as an object with exactly five required fields — `fontFamily` (a valid Font Family value), `fontSize` (a valid Dimension value), `fontWeight` (a valid Font Weight value), `letterSpacing` (a valid Dimension value), `lineHeight` (a plain number) — reusing the existing Font Family, Dimension, and Font Weight value schemas rather than redefining equivalent validation logic.
- **FR-003**: The system MUST provide a dedicated composite editing control for a `typography` token's literal value with five clearly labeled sub-controls: font family, font size, font weight, letter spacing, line height.
- **FR-004**: The font size and letter spacing sub-controls MUST reuse the same underlying dimension-editing control already used for standalone `dimension` tokens, each independently wired so that editing one never changes the other's value or label.
- **FR-005**: The font family sub-control MUST reuse the same underlying font-family-editing control already used for standalone `fontFamily` tokens; the font weight sub-control MUST reuse the same underlying font-weight-editing control already used for standalone `fontWeight` tokens.
- **FR-006**: Editing any one sub-control MUST update only that field of the token's `$value`, leaving the other four fields byte-for-value unchanged.
- **FR-007**: The system MUST provide a read-only preview rendering of a `typography` token's resolved literal value as a single short line combining all five sub-fields, styled using the editor's existing shared design tokens.
- **FR-008**: The `Preview` component MUST decline to render (return nothing, letting the host fall back to generic rendering) when given a value that does not conform to the `typography` schema.
- **FR-009**: The system MUST round-trip a `typography` token's `$value` losslessly when the user makes no edit to it (parsing and re-serializing an untouched token produces the same value).

### Key Entities

- **Typography Token Value**: The `$value` of a token whose `$type` is `typography` — an object of exactly five required fields: `fontFamily` (a Font Family value), `fontSize` (a Dimension value), `fontWeight` (a Font Weight value), `letterSpacing` (a Dimension value), and `lineHeight` (a plain, unitless number).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can open any valid `typography` token in the editor and see a dedicated, non-JSON composite editing control 100% of the time (no fallback to the generic JSON textarea for this type).
- **SC-002**: A user can independently edit a `typography` token's font family, font size, font weight, letter spacing, and line height and see each change reflected in the token tree/preview without needing to hand-edit JSON, and without ever seeing one sub-control's edit bleed into another field.
- **SC-003**: Existing `typography` tokens in a loaded file that are untouched by the user retain byte-for-value-identical `$value` after a save/round-trip.
- **SC-004**: A `typography` token's preview always renders as one short line, never a multi-line block, regardless of which sub-field values are present.

## Assumptions

- "Preview" here follows the same UI contract already used by other token types (color, dimension, duration, cubicBezier, fontWeight, fontFamily, transition, border) for rendering a resolved literal value in reference/candidate contexts, including the required decline-to-render-on-mismatch behavior.
- No new third-party dependency is required. This feature does introduce new internal (workspace) dependencies between `token-editor-*` packages — the typography editor package depends on the existing font-family, dimension, font-weight, and number editor packages to embed their `Editor`/`Preview` components directly, rather than reimplementing lightweight bespoke sub-controls. This is a deliberate architectural choice for this feature (and other DTCG composite types built the same way — border, transition), recorded with rationale in `plan.md`.
- `lineHeight` is edited via the existing plain-number editing control already used for standalone `number` tokens, since its DTCG-spec shape (a bare unitless multiplier) is exactly a plain number, not a Dimension value — this choice, and any friction encountered, is recorded with rationale in `plan.md`.
- This feature only adds editor support for the `typography` type; it does not change how `typography` tokens are referenced, resolved, or validated at the document/parse level beyond adding the type's own schema (which is separately required by `token-core`'s existing per-type schema pattern for every type it supports).
