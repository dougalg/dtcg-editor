# Phase 0 Research: Typography Token Editor Support

No unresolved `NEEDS CLARIFICATION` markers exist in `spec.md` — the spec's own Assumptions
section resolved the judgment calls (which sibling editors to embed; `lineHeight`'s editor choice;
internal-dependency architecture) that would otherwise require research tasks. This document
records the choices made and their rationale for completeness.

## Decision: Reuse `token-core`'s existing `FontFamilyValueSchema`/`DimensionValueSchema`/`FontWeightValueSchema`, plus a bare `z.number()` for `lineHeight`

- **Decision**: `TypographyValueSchema = z.object({ fontFamily: FontFamilyValueSchema, fontSize:
  DimensionValueSchema, fontWeight: FontWeightValueSchema, letterSpacing: DimensionValueSchema,
  lineHeight: z.number() })`.
- **Rationale**: the DTCG 2025.10 Format spec defines four of Typography's five `$value` fields
  as literally Font Family, Dimension, and Font Weight values — no typography-specific variation
  on those shapes exists. `lineHeight` is explicitly a unitless multiplier per spec, not a
  Dimension, so it is modeled as a bare `z.number()` rather than reusing `DimensionValueSchema`
  (which would wrongly require a `unit` field that the spec never gives `lineHeight`).
- **Alternatives considered**: modeling `lineHeight` as `DimensionValueSchema` for consistency
  with the other size-shaped fields — rejected as spec-non-compliant (Principle I): the spec is
  explicit that `lineHeight` is `number`, and a real DTCG document would never carry a `unit` key
  under it, so requiring one would reject valid, spec-conformant token files.

## Decision: Embed sibling `token-editor-*` `Editor` components directly, including `NumberEditor` for `lineHeight`

- **Decision**: `token-editor-typography` takes real `workspace:*` dependencies on
  `@dtcg-editor/token-editor-font-family`, `@dtcg-editor/token-editor-dimension`,
  `@dtcg-editor/token-editor-font-weight`, and `@dtcg-editor/token-editor-number`, and its
  `TypographyEditor` renders `FontFamilyEditor`, `DimensionEditor` (twice), `FontWeightEditor`,
  and `NumberEditor` directly, wired via prop drilling.
- **Rationale**: see `plan.md`'s Constitution Check (Principle VIII) and Design Decisions for the
  full justification — those editors already exist, are already tested, and are already the
  canonical way a user edits each of those value shapes anywhere in this app.
- **Alternatives considered for `lineHeight` specifically**: (a) embed `NumberEditor` — chosen;
  (b) a small bespoke inline `<input type="number">` local to `token-editor-typography` — the
  brief's explicit fallback if (a) proved awkward. Evaluated `NumberEditor`'s actual rendering
  (`NumberEditor.tsx`: one labeled "Value" input, `step="any"`, no unit/keyword UI) and found no
  mismatch: nothing in its copy or behavior implies a unit or keyword-alias, so nesting it under
  a "Line Height" `<fieldset>`/`<legend>` reads correctly and behaves correctly (its `step="any"`
  handling is in fact exactly what a fractional multiplier like `1.4` needs). (a) was kept.

## Decision: Disambiguate the two `DimensionEditor` instances via wrapping labels, not a new prop

- **Decision**: `TypographyEditor` wraps each `DimensionEditor` instance in its own labeled
  `<fieldset>`/`<legend>` ("Font Size" / "Letter Spacing"), exactly matching
  `TransitionEditor`'s precedent for its two `DurationEditor` instances.
- **Rationale**: the task scope forbids modifying `token-editor-dimension`. `DimensionEditor`'s
  existing contract (`TokenTypeEditorProps<DimensionValue>`) has no `label`/`name` field.
  Labeling at the call site is sufficient to satisfy FR-004/spec User Story 1 scenario 7
  (unambiguous distinction) without any change to the embedded component's own props.
- **Alternatives considered**: proposing a `token-editor-dimension` API change to accept an
  optional label — flagged as the kind of "genuine open design question" the task said to stop
  and report on if it arose; concluded it does *not* need escalation, since the fieldset/legend
  wrapper is a complete, ordinary solution requiring no change to the sibling package.

## Decision: `TypographyPreview` composes its own one-line text rather than nesting sibling `Preview` JSX

- **Decision**: `TypographyPreview` re-validates the whole value with `TypographyValueSchema`,
  then builds one text string in the shape `{fontSize}/{lineHeight} {fontFamily} {fontWeight}`
  (e.g. `16px/1.4 Arial 700`), appending letter spacing only when non-zero.
- **Rationale**: see `plan.md` Design Decisions — with five fields (more than `transition`'s
  three), nesting four separate sibling `Preview` components' own wrapper `<span>`s inside one
  line is more awkward here than it already was for `transition`; composing a plain string keeps
  full control over one-line layout while matching each sibling's own per-field text formatting
  (`DimensionPreview`'s `{value}{unit}`, `FontFamilyPreview`'s plain/joined text,
  `FontWeightPreview`'s `String(value)`), so the composite reads consistently with what a user
  already sees for the corresponding standalone token types.
- **Alternatives considered**: nesting `FontFamilyPreview`/`DimensionPreview` (x2)/
  `FontWeightPreview`'s JSX directly — considered first as the most literal "embed sibling
  Preview" reading; rejected for the layout-awkwardness reason above, consistent with
  `TransitionPreview`'s own precedent for choosing composed text over nested JSX.
