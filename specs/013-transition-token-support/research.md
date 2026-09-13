# Phase 0 Research: Transition Token Editor Support

No unresolved `NEEDS CLARIFICATION` markers exist in `spec.md` — the spec's own Assumptions
section resolved the two judgment calls (delay-zero-suppression definition; internal-dependency
architecture) that would otherwise require research tasks. This document records the choices made
and their rationale for completeness.

## Decision: Reuse `token-core`'s existing `DurationValueSchema`/`CubicBezierValueSchema`

- **Decision**: `TransitionValueSchema = z.object({ duration: DurationValueSchema, delay:
  DurationValueSchema, timingFunction: CubicBezierValueSchema })`, importing both sub-schemas
  from their existing modules (`packages/token-core/src/duration.ts`,
  `packages/token-core/src/cubic-bezier.ts`) rather than redefining equivalent shapes inline.
- **Rationale**: the DTCG 2025.10 Format spec defines Transition's `$value` fields as literally
  Duration and CubicBezier values — there is no transition-specific variation on those shapes to
  encode. Reusing the schemas is both the spec-accurate choice (Principle I) and the only way to
  avoid two independently-drifting copies of the same validation rules (Principle II).
- **Alternatives considered**: redefining local `z.object`/`z.tuple` shapes matching duration/
  cubic-bezier's structure — rejected; would need to be kept in sync by hand forever and gains
  nothing over an import.

## Decision: Embed sibling `token-editor-*` `Editor`/`Preview` components directly

- **Decision**: `token-editor-transition` takes real `workspace:*` dependencies on
  `@dtcg-editor/token-editor-duration` and `@dtcg-editor/token-editor-cubic-bezier`, and its
  `TransitionEditor` renders `DurationEditor` (twice) and `CubicBezierEditor` directly, wired via
  prop drilling.
- **Rationale**: see `plan.md`'s Constitution Check (Principle VIII) for the full justification —
  in short, those editors already exist, are already tested, and are already the canonical way a
  user edits a duration or cubic-bezier value anywhere in this app; a second implementation
  scoped to `token-editor-transition` would duplicate maintained behavior for no benefit.
- **Alternatives considered**: (1) bespoke lightweight sub-controls local to
  `token-editor-transition`, matching how a typical *primitive* `token-editor-*` package builds
  its own inputs — rejected, this is precisely the duplication being deliberately avoided for
  composite types per the task brief; (2) a shared "duration input" component lifted into
  `design-system` that both `token-editor-duration` and `token-editor-transition` would consume —
  a viable alternative shape for this problem, but out of scope: it would require modifying
  `token-editor-duration` itself, which the task explicitly rules out ("don't modify the sibling
  token-editor-duration/token-editor-cubic-bezier packages themselves").

## Decision: Disambiguate the two `DurationEditor` instances via wrapping labels, not a new prop

- **Decision**: `TransitionEditor` wraps each `DurationEditor` instance in its own labeled
  container ("Duration" / "Delay") rather than requesting a label prop be added to
  `DurationEditor` itself.
- **Rationale**: the task scope forbids modifying `token-editor-duration`. `DurationEditor`'s
  existing contract (`TokenTypeEditorProps<DurationValue>`) has no `label`/`name` field, and
  adding one would be a change to a package this feature must not touch. Labeling at the call
  site is sufficient to satisfy FR-004/spec User Story 1 scenario 5 (unambiguous distinction)
  without any change to the embedded component's own props or rendering.
- **Alternatives considered**: proposing a `token-editor-duration` API change to accept an
  optional label — flagged as the kind of "genuine open design question" the task said to stop
  and report on if it arose; concluded it does *not* need escalation, since wrapping in a labeled
  container is a complete, ordinary solution that requires no change to the sibling package.

## Decision: `TransitionPreview` composes its own one-line text rather than nesting sibling `Preview` JSX

- **Decision**: `TransitionPreview` re-validates the whole value with `TransitionValueSchema`,
  then builds one text string matching `DurationPreview`'s (`{value}{unit}`) and
  `CubicBezierPreview`'s (`cubic-bezier(p1x, p1y, p2x, p2y)`) exact formatting, joining them (and
  conditionally the delay) into a single `<span>`.
- **Rationale**: see `plan.md` Design Decisions — literally nesting `<DurationPreview>`/
  `<CubicBezierPreview>` JSX is visually awkward to compact into one line around conditional
  text/punctuation; matching their output text keeps the result identical to what a user already
  recognizes from standalone duration/cubicBezier previews while keeping full control of layout.
- **Alternatives considered**: nesting the sibling `Preview` components' JSX directly — considered
  first since it's the most literal reading of "prefer embedding... where reasonable"; rejected
  only for the compact-single-line reason above, not because it doesn't work.
