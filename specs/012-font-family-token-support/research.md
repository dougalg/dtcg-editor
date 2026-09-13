# Phase 0 Research: Font Family Token Editor Support

No `NEEDS CLARIFICATION` markers remained in Technical Context — this feature closely mirrors
`011-font-weight-token-support` and `token-editor-color`'s list-of-channels pattern, so no
external research was required. The following decisions were confirmed against existing code
rather than invented.

## Decision: Zod schema shape

- **Decision**: `z.union([z.string(), z.array(z.string())])`.
- **Rationale**: Matches the DTCG 2025.10 Format spec's Font Family type exactly (a single
  string, or an array of strings). Confirmed against `packages/token-core/src/font-weight.ts`'s
  existing union-schema precedent for shape/style (JSDoc citing the spec URL, `z.infer` export).
- **Alternatives considered**: A schema requiring a non-empty array — rejected; the DTCG spec
  places no minimum-length constraint on the array form, and spec Edge Cases explicitly treats
  an empty array as valid.

## Decision: Editor's internal representation

- **Decision**: `FontFamilyEditor` always renders/operates on an array-of-strings internally
  (converting an incoming single-string value to a one-item array on render), and converts back
  to a bare string vs. array only at the `onChange` boundary, based on the resulting length.
- **Rationale**: A single code path for add/remove/reorder regardless of on-disk shape. Confirmed
  as sound against Principle IX (round-trip fidelity) since the boundary conversion means an
  *untouched* token's serialized shape never changes.
- **Alternatives considered**: Two editor modes (single-input vs. list) with an explicit
  mode switch — rejected as unnecessary UI complexity for a distinction the spec itself treats as
  authoring convenience only (see `plan.md` Design Decisions).

## Decision: Reordering UI

- **Decision**: Per-row "move up" / "move down" buttons using `design-system`'s `Button`.
- **Rationale**: No drag-and-drop library exists in the repo's approved dependencies
  (Principle VIII); buttons are trivially keyboard-accessible and `axe-core`-clean, matching this
  repo's established a11y bar (every `token-editor-*` component ships an `.a11y.test.tsx`).
- **Alternatives considered**: HTML5 native drag-and-drop (`draggable` attribute) — rejected,
  it requires substantial extra ARIA live-region work to be accessible to screen-reader/keyboard
  users and average implementations fail `axe-core`'s WCAG 2.2 AA checks without that work,
  which is out of scope for this feature.

## Decision: Preview truncation

- **Decision**: Render the first 3 entries comma-joined, then `"+N more"` when there are more
  than 3 total.
- **Rationale**: Matches spec Assumption's stated threshold; an entry-count cutoff (not a
  character-count one) gives predictable behavior regardless of individual family-name lengths.
- **Alternatives considered**: A character-length cutoff with CSS `text-overflow: ellipsis` —
  rejected, it doesn't produce the explicit "+N more" indicator the spec's acceptance scenario
  requires, and would truncate mid-name depending on font metrics.

## Decision: Design-system component reuse

- **Decision**: Reuse `@dtcg-editor/design-system`'s `Input` (per-row text field) and `Button`
  (add / remove / move-up / move-down controls).
- **Rationale**: `token-editor-color`'s `ChannelInput.tsx`/`ColorFunctionValue.tsx` already
  establish this exact reuse pattern for a comparable per-item-in-a-composite-value UI. No
  dedicated editable list/chip component exists yet in `design-system` (confirmed by listing
  `packages/design-system/src/components/`), and building a new general-purpose one there is
  out of this feature's scope per the task's explicit boundaries.
- **Alternatives considered**: Building a reusable `TagList`/`Combobox`-based chip editor in
  `design-system` first — rejected as scope creep; `design-system`'s existing `Combobox`
  component is for single-selection from a fixed option set, not an open-ended ordered list of
  freeform text, so it doesn't fit this shape without its own redesign.
