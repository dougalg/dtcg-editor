# Feature Specification: Transition Token Editor Support

**Feature Branch**: `worktree-transition-token-support`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Add support for \"transition\" tokens: implement full editor support for the DTCG transition composite token type. Per the DTCG 2025.10 Format spec (Transition type), $value is { duration: DurationValue, delay: DurationValue, timingFunction: CubicBezierValue }. Reuse the existing duration and cubicBezier schemas and editors rather than rebuilding sub-controls: the transition editor embeds the existing DurationEditor (twice, for duration and delay) and the existing CubicBezierEditor (for timingFunction) directly."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Edit a transition token's three sub-fields (Priority: P1)

A designer or developer opens a design token file containing a `transition` token (e.g. `{"$type": "transition", "$value": {"duration": {"value": 200, "unit": "ms"}, "delay": {"value": 0, "unit": "ms"}, "timingFunction": [0.4, 0, 0.2, 1]}}`) and wants to edit its duration, delay, and timing function using purpose-built controls, instead of hand-editing raw JSON.

**Why this priority**: This is the core value of the feature — without it, `transition` tokens remain read-only/JSON-only, which is the exact gap being closed.

**Independent Test**: Open a token tree containing a `transition` token; confirm a dedicated composite editor (not the generic JSON textarea) renders three clearly labeled sub-controls — one for duration, one for delay, one for the timing function — and that editing any one of them updates only that sub-field of the token's `$value`, leaving the other two untouched.

**Acceptance Scenarios**:

1. **Given** a token with `$type: "transition"` and a valid three-field `$value`, **When** the token is selected in the editor, **Then** a dedicated transition editor (not the generic read-only JSON fallback) is displayed showing three labeled sub-controls.
2. **Given** the transition editor, **When** the user changes the duration sub-control's numeric value or unit, **Then** only the `$value.duration` field is updated; `delay` and `timingFunction` are unchanged.
3. **Given** the transition editor, **When** the user changes the delay sub-control's numeric value or unit, **Then** only the `$value.delay` field is updated; `duration` and `timingFunction` are unchanged.
4. **Given** the transition editor, **When** the user changes one of the timing function's four control-point coordinates, **Then** only the `$value.timingFunction` field is updated; `duration` and `delay` are unchanged.
5. **Given** the transition editor's duration and delay sub-controls both being instances of the same underlying duration control, **When** the user interacts with one of them, **Then** the other's displayed value never changes as a side effect, and each is unambiguously labeled ("Duration" vs "Delay") so a user cannot confuse which sub-control edits which field.

---

### User Story 2 - See a readable preview of a transition token's resolved value (Priority: P2)

A user browsing a token tree wants to see, at a glance, what a `transition` token (or a token that references one) resolves to, without opening its editor.

**Why this priority**: Consistent with how other token types (color, dimension, duration, cubicBezier, fontWeight, fontFamily) already show an inline/reference preview; without it, `transition` tokens are inconsistent with the rest of the editor's UI when referenced from other tokens or shown as a candidate/hypothetical value.

**Independent Test**: Reference a `transition` token from another token, or view it in a context that shows a resolved-value preview; confirm a short, single-line, human-readable rendering appears (duration and timing function inline; delay included only when it is non-zero), styled consistently with the rest of the editor.

**Acceptance Scenarios**:

1. **Given** a `transition` token with `duration: 200ms`, `delay: 0ms`, `timingFunction: [0.4, 0, 0.2, 1]`, **When** its value is shown in a reference/candidate preview, **Then** the preview renders a single short line combining the duration and timing function, omitting the zero delay.
2. **Given** a `transition` token with a non-zero delay (e.g. `100ms`), **When** its value is shown in a preview, **Then** the preview's single line also includes the delay.
3. **Given** a value that does not conform to the `transition` schema (e.g. missing `timingFunction`, or a `duration` that is itself invalid), **When** the preview is asked to render it, **Then** it declines to render (returns nothing) rather than throwing or showing incorrect text, letting the host fall back to its own generic rendering.

---

### Edge Cases

- What happens when `$value.delay` is present but `0` (e.g. `{"value": 0, "unit": "ms"}`)? Treated as a valid, normal value — editable like any other duration; the preview's "only show delay if non-zero" rule applies only to the read-only preview, never to the editor, which always shows all three sub-controls regardless of value.
- What happens when a sub-field (e.g. `timingFunction`) is itself invalid per its own schema (e.g. a control point out of `[0,1]` range for `P1x`)? The whole `transition` value fails `TransitionValueSchema` validation, per the existing per-type validation contract — same as any other composite/nested schema failure in this codebase.
- What happens when a `transition` token is referenced by another token (an alias/reference value) rather than holding a literal? The existing reference-resolution and preview mechanics apply unchanged; only the literal-value editing and preview rendering are new.
- What happens if the two duration-shaped sub-controls (duration, delay) are rendered from the exact same underlying component? They MUST be independently wired (separate `value`/`onChange` closures) so editing one never mutates the other's displayed value or the other field in `$value`.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST recognize `transition` as a supported token `$type` and stop routing it to the generic unsupported-type/JSON-textarea fallback.
- **FR-002**: The system MUST validate a `transition` token's `$value` as an object with exactly `duration` (a valid Duration value), `delay` (a valid Duration value), and `timingFunction` (a valid CubicBezier value), reusing the existing Duration and CubicBezier value schemas rather than redefining equivalent validation logic.
- **FR-003**: The system MUST provide a dedicated composite editing control for a `transition` token's literal value with three clearly labeled sub-controls: one for `duration`, one for `delay`, one for `timingFunction`.
- **FR-004**: The `duration` and `delay` sub-controls MUST reuse the same underlying duration-editing control already used for standalone `duration` tokens, each independently wired so that editing one never changes the other's value or label.
- **FR-005**: The `timingFunction` sub-control MUST reuse the same underlying cubic-bezier-editing control already used for standalone `cubicBezier` tokens.
- **FR-006**: Editing any one sub-control MUST update only that field of the token's `$value`, leaving the other two fields byte-for-value unchanged.
- **FR-007**: The system MUST provide a read-only preview rendering of a `transition` token's resolved literal value as a single short line combining the duration and timing function, including the delay in that line only when it is non-zero, styled using the editor's existing shared design tokens.
- **FR-008**: The `Preview` component MUST decline to render (return nothing, letting the host fall back to generic rendering) when given a value that does not conform to the `transition` schema.
- **FR-009**: The system MUST round-trip a `transition` token's `$value` losslessly when the user makes no edit to it (parsing and re-serializing an untouched token produces the same value).

### Key Entities

- **Transition Token Value**: The `$value` of a token whose `$type` is `transition` — an object of exactly three required fields: `duration` (a Duration value), `delay` (a Duration value), and `timingFunction` (a CubicBezier value).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can open any valid `transition` token in the editor and see a dedicated, non-JSON composite editing control 100% of the time (no fallback to the generic JSON textarea for this type).
- **SC-002**: A user can independently edit a `transition` token's duration, delay, and timing function and see each change reflected in the token tree/preview without needing to hand-edit JSON, and without ever seeing one sub-control's edit bleed into another field.
- **SC-003**: Existing `transition` tokens in a loaded file that are untouched by the user retain byte-for-value-identical `$value` after a save/round-trip.
- **SC-004**: A `transition` token's preview always renders as one short line, never a multi-line block, regardless of whether delay is zero or non-zero.

## Assumptions

- "Preview" here follows the same UI contract already used by other token types (color, dimension, duration, cubicBezier, fontWeight, fontFamily) for rendering a resolved literal value in reference/candidate contexts, including the required decline-to-render-on-mismatch behavior.
- No new third-party dependency is required. This feature does introduce new internal (workspace) dependencies between `token-editor-*` packages — the transition editor package depends on the existing duration and cubic-bezier editor packages to embed their `Editor`/`Preview` components directly, rather than reimplementing lightweight bespoke sub-controls. This is a deliberate architectural choice for this feature (and other DTCG composite types built the same way), recorded with rationale in `plan.md`.
- This feature only adds editor support for the `transition` type; it does not change how `transition` tokens are referenced, resolved, or validated at the document/parse level beyond adding the type's own schema (which is separately required by `token-core`'s existing per-type schema pattern for every type it supports).
- A delay is considered "non-zero" for preview purposes when its numeric `value` is not `0`, regardless of unit (`0s` and `0ms` are both treated as zero).
