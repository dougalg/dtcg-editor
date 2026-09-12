# Phase 0 Research: cubicBezier Token Support

No `NEEDS CLARIFICATION` markers remain in the Technical Context — this feature is a small,
structurally precedented addition (a new DTCG value type mirroring `dimension`'s existing
package shape), so research is limited to confirming the precedent and one deliberate design
choice called out in `spec.md`'s Assumptions.

## Decision: Reuse `token-editor-dimension`'s package structure verbatim

**Rationale**: The constitution (Principle II/VII) mandates that every token type's editor
live in its own `token-editor-*` package with an identical shape (`package.json`, `tsconfig.json`,
`src/token-type.ts`, `src/components/<Name>/`). `token-editor-dimension` is the simplest
existing instance of this shape (a value with no nested reference/union complexity, similar to
cubicBezier's flat tuple). Copying its `package.json` dependency list, `tsconfig.json`, and
Vitest fixture files (`vitest.setup.ts`, `vitest-a11y-tags.ts`, `css-modules.d.ts`,
`vitest-env.d.ts`) verbatim (renaming only the package name) keeps the new package
indistinguishable in convention from the existing one, which is what Principle II asks for.

**Alternatives considered**: Modeling on `token-editor-color` instead — rejected because color's
package carries extra machinery (colour-space conversion utilities, `colorjs.io` dependency,
multiple sub-components) that has no analog for a flat 4-number tuple; copying it would pull in
unused structure and risk violating Principle VIII (Minimal Dependencies) by implying a
dependency need that doesn't exist here.

## Decision: No live SVG curve preview in v1

**Rationale**: `spec.md`'s task brief explicitly flags an SVG curve preview as "a nice touch
but not mandatory for v1" and defers the choice to this plan. Given Principle VIII (Minimal
Dependencies) and Principle X's 300-line/single-purpose guidance, adding an inline SVG curve
renderer would introduce non-trivial path-math logic and a third component
(`CubicBezierCurvePreview` or similar) with its own test/a11y burden, for a purely cosmetic
enhancement with no functional requirement backing it in `spec.md` (no FR/SC mentions a visual
curve). The four labeled number inputs plus the text `Preview` (FR-005, FR-009) fully satisfy
every functional requirement and success criterion. Deferring the SVG keeps the feature's scope
tight and matches `DimensionEditor`'s own precedent of a minimal, purely-functional control.

**Alternatives considered**: Building the SVG preview now — rejected for v1 per the above; left
as a clearly-scoped future enhancement (could be added as a `speckit-converge` follow-up task
without touching the schema or contract wiring, since it would only ever read the already-valid
`CubicBezierValue`).

## Decision: Enforce the `[0,1]` x-coordinate bound in the UI via native `<input>` `min`/`max` + clamp-on-change

**Rationale**: `DimensionEditor`'s existing numeric-field pattern uses a plain
`<input type="number">` with `Number(event.target.value)` and an `onChange` guard
(`Number.isNaN` check) before calling `onChange`. The same pattern, extended with `min="0"
max="1"` attributes (browser-level affordance/spinner clamping) plus an explicit
`Math.min(1, Math.max(0, next))` clamp in the change handler (so keyboard-typed or
programmatically-dispatched out-of-range values are also clamped, not just spinner-driven ones),
satisfies FR-006 without any new dependency. The y-coordinate fields reuse the same input type
with no `min`/`max`, satisfying FR-007.

**Alternatives considered**: Relying on the Zod schema alone (rejecting out-of-range values only
at commit time, e.g. showing a validation error) — rejected because FR-006 requires the editor
itself to prevent committing an out-of-range value, and `DimensionEditor`'s established
convention is silent clamping/rejection at the input level (see its "non-numeric value ...
reporting an empty value" test), not error surfacing.
