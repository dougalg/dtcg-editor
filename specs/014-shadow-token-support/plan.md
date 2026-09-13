# Implementation Plan: Shadow Token Support

**Branch**: `worktree-shadow-token-support` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-shadow-token-support/spec.md`

## Summary

Add editor support for the DTCG composite `shadow` token type. `token-core`
gains `ShadowValueSchema` — a `ShadowLayerSchema` object (`{ color, offsetX,
offsetY, blur, spread }`) composed directly from the existing
`ColorValueSchema`/`DimensionValueSchema`, unioned with an array of that same
layer schema for the multi-layer case — no new validation logic. A new
package, `packages/token-editor-shadow`, provides `ShadowEditor` and
`ShadowPreview`, wired into a `TokenTypeContract`. Per the explicit
architectural direction for this feature (continuing `border`/`transition`'s
precedent), `ShadowEditor` **embeds the real sibling `ColorEditor` and four
`DimensionEditor` instances** from `token-editor-color`/`token-editor-
dimension` for a single layer, rather than reimplementing bespoke sub-
controls. For the array-of-layers case — the first composite-of-composites
this repo has built — `ShadowEditor` adds a repeater UI (add/remove/reorder)
adapted from `token-editor-font-family`'s `FontFamilyEditor` list pattern,
applied to a list of composite layer objects instead of plain strings (see
Design Decisions below). The new type is registered in `apps/web-app/lib/
token-editors/built-in.ts` alongside the other built-ins.

## Technical Context

**Language/Version**: TypeScript (strict, per root `tsconfig.base.json`)

**Primary Dependencies**: React, Zod, `@dtcg-editor/token-core`,
`@dtcg-editor/token-editor-contract`, and — continuing the `border`/
`transition` precedent of an inter-`token-editor-*` dependency —
`@dtcg-editor/token-editor-color`, `@dtcg-editor/token-editor-dimension` as
direct `workspace:*` dependencies of the new package.

**Storage**: N/A (in-memory token document editing, same as every other
`token-editor-*` package)

**Testing**: Vitest + `@testing-library/react` (jsdom) for `ShadowEditor`/
`ShadowPreview` unit tests, Vitest Browser Mode + `axe-core` for a11y tests
(both aggregated into the root `vitest.config.mts` `test.projects`, per this
package needing an `Editor` component); `node:test` for the React-free
`ShadowValueSchema` schema test in `token-core`.

**Target Platform**: Web (Next.js app, `apps/web-app`)

**Project Type**: Monorepo package addition (library/editor-plugin) + one
registration edit in the web app

**Performance Goals**: N/A — no new performance-sensitive path; a single
shadow layer renders five already-existing controls, and the repeater renders
one layer-block per array entry, none of which is on a critical timing path
per the existing perf budgets in `tdd-profile.md`.

**Constraints**: Must not modify `packages/token-editor-contract` or the two
sibling `token-editor-*` packages (`token-editor-color`, `token-editor-
dimension`) themselves, nor `token-editor-font-family` (only its list pattern
is consulted, not its code) — only consume their existing public exports/
patterns. Must not duplicate `token-core`'s existing sub-schemas.

**Scale/Scope**: One new `token-core` module + test, one new package
(`token-editor-shadow`) with 2 top-level components (`ShadowEditor`,
`ShadowPreview`) — `ShadowEditor` internally composed of a per-layer sub-
component to keep each file under Principle X's soft line ceiling — each with
unit + a11y tests, one `token-type.ts` contract wiring module, one edit to
`apps/web-app/lib/token-editors/built-in.ts`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (DTCG Spec Compliance)** — PASS. `ShadowValueSchema` matches
  the DTCG 2025.10 Format spec's Shadow type exactly: a single layer object
  `{ color, offsetX, offsetY, blur, spread }` (all required) or an array of
  one or more such objects. No spec deviation is introduced.
- **Principle II (Feature-Based Code Organization)** — PASS. `token-core`
  keeps owning parsing/validation (`shadow.ts` alongside `shadow.test.ts`);
  `token-editor-shadow` owns its own Editor/Preview/contract as one cohesive
  unit, matching every sibling `token-editor-*` package's layout.
- **Principle III (TypeScript Strictness)** — PASS. New package extends the
  same `tsconfig.base.json` with no relaxation, matching sibling packages.
- **Principle IV (Validation at the Edges)** — PASS. `ShadowEditor` receives
  an already-validated `ShadowValue` (per `TokenTypeEditorProps<TValue>`) and
  does not re-validate it; `ShadowPreview` re-validates its `unknown` input
  exactly once, matching every sibling `Preview`'s documented pattern.
- **Principle VII (Token-Editor Package Contract)** — PASS, continuing the
  pattern `border`/`transition` already established: `token-editor-shadow`
  depends on `token-core` (one-way, as required) *and* on two sibling
  `token-editor-*` packages. Not a new deviation — flagged in `border`'s plan
  as a deliberate, repo-wide experiment this feature is explicitly continuing.
- **Principle VIII (Minimal Dependencies)** — PASS, justification recorded:
  the two new `workspace:*` dependencies avoid re-implementing two already-
  built, already-accessibility-tested editors; the alternative (bespoke
  lightweight color/dimension sub-controls) was rejected as exactly the kind
  of duplicated logic Principle VII/VIII exist to prevent.
- **Principle IX (Round-Trip Fidelity)** — PASS. `serializeValue` for shadow
  is the identity function on the validated value (object or array, same
  shape in and out), same as every other built-in type's `serializeValue`; no
  new serialization logic that could lose data or silently convert between
  the single-object and one-item-array forms (see spec Edge Cases).
- **Principle X (Component Granularity & Testing)** — PASS. `ShadowEditor`
  and `ShadowPreview` are each in their own file/folder, each co-located with
  unit + a11y tests. Because a single shadow layer's five embedded controls
  plus the repeater's add/remove/reorder chrome would push a single
  `ShadowEditor.tsx` toward/past the 300-line soft ceiling, the per-layer
  five-control block is extracted into its own component,
  `ShadowLayerFields` (`src/components/ShadowLayerFields/`), with its own
  co-located unit + a11y tests — `ShadowEditor` composes `ShadowLayerFields`
  once (bare-object value) or N times inside the repeater (array value),
  never duplicating the five-field JSX inline. This mirrors Principle X's
  extraction guidance rather than accepting a large single file.
- **Principle XII (Design System Usage)** — PASS. `ShadowLayerFields`/
  `ShadowEditor` introduce no new raw design values or hand-rolled input
  controls — they lay out embedded sub-editors and reuse `@dtcg-editor/
  design-system`'s `Button`/`Input` for the repeater chrome (add/remove/move
  controls), matching `FontFamilyEditor`'s precedent exactly. Any new layout-
  only CSS uses `--dtcg-ed-*` tokens for spacing.
- **Principle XIII (TDD, NON-NEGOTIABLE)** — GATE: `speckit-tdd-plan` MUST be
  run before `speckit-implement`; every behavior test must be observed
  failing first and logged in `tdd/cycle-log.md`. Addressed procedurally, not
  a design concern for this plan.

No unjustified violations. See Complexity Tracking for the one deliberate
continuation of prior precedent (inter-package dependency) and Design
Decisions for the new multi-layer repeater pattern this feature introduces.

## Project Structure

### Documentation (this feature)

```text
specs/014-shadow-token-support/
├── plan.md              # This file
├── tasks.md             # Phase 2 output (/speckit-tasks)
├── checklists/
│   └── requirements.md
└── tdd/
    ├── test-list.md     # /speckit-tdd-plan output
    └── cycle-log.md     # /speckit-tdd-run red/green log
```

(No `research.md`/`data-model.md`/`contracts/`/`quickstart.md`: this feature
has no unresolved technical unknowns — the value shape, reused schemas, and
embedding architecture are all already fully specified by the task and by
existing sibling-package precedent — and no new external interface beyond the
existing `TokenTypeContract` shape every sibling package already implements
identically. This matches `specs/013-border-token-support`'s precedent for
the same reason.)

### Source Code (repository root)

```text
packages/token-core/src/
├── shadow.ts             # NEW: ShadowLayerSchema / ShadowValueSchema / ShadowValue / ShadowLayer
└── shadow.test.ts        # NEW: schema unit tests (node:test)
# packages/token-core/src/index.ts — EDIT: export ShadowValueSchema/ShadowValue/ShadowLayer

packages/token-editor-shadow/                    # NEW package
├── package.json
├── tsconfig.json
├── vitest.setup.ts
├── vitest-a11y-tags.ts
├── src/
│   ├── index.ts
│   ├── token-type.ts                            # shadowTokenType: TokenTypeContract<ShadowValue>
│   ├── css-modules.d.ts
│   ├── vitest-env.d.ts
│   └── components/
│       ├── ShadowLayerFields/                   # single layer's 5 embedded sub-editors
│       │   ├── ShadowLayerFields.tsx
│       │   ├── ShadowLayerFields.module.css
│       │   ├── ShadowLayerFields.test.tsx
│       │   └── ShadowLayerFields.a11y.test.tsx
│       ├── ShadowEditor/                        # bare layer OR repeater over ShadowLayerFields
│       │   ├── ShadowEditor.tsx
│       │   ├── ShadowEditor.module.css
│       │   ├── ShadowEditor.test.tsx
│       │   ├── ShadowEditor.a11y.test.tsx
│       │   └── ShadowEditor.stories.tsx
│       └── ShadowPreview/
│           ├── ShadowPreview.tsx
│           ├── ShadowPreview.module.css
│           ├── ShadowPreview.test.tsx
│           └── ShadowPreview.a11y.test.tsx

apps/web-app/lib/token-editors/built-in.ts        # EDIT: register "shadow"
vitest.config.mts                                 # EDIT: add packages/token-editor-shadow to `packages` array
```

**Structure Decision**: Follows the existing `token-editor-*` package
template exactly (as used by `token-editor-border`, `token-editor-
transition`), with `workspace:*` dependencies on two sibling
`token-editor-*` packages, and one extra internal component
(`ShadowLayerFields`) to keep single-responsibility file sizes per Principle
X while still letting `ShadowEditor` reuse the exact same per-layer fields in
both the single-layer and repeater cases.

## Design Decisions

### Multi-layer repeater: adapting `FontFamilyEditor`'s list pattern to composite objects

This is the first composite-of-composites this repo has built: `border` and
`transition` are single flat objects with sub-editors; `shadow`'s array form
is a *list* of composite objects, each itself needing five embedded
sub-editors. `FontFamilyEditor` is this repo's only existing add/remove/
reorder list precedent, but operates on a list of plain strings. The
adaptation:

- **State shape**: `ShadowEditor` normalizes `value` to `readonly
  ShadowLayer[]` internally on render (a bare single-layer object becomes a
  one-item array for the *initial* internal-state derivation only), exactly
  mirroring `FontFamilyEditor`'s `toList`/`fromList` string-vs-array boundary
  functions — but for `ShadowLayer` objects instead of strings. `fromValue`/
  `toValue` boundary functions decide the on-disk shape only at the
  `onChange` call: a value that started as a bare object (not an array) and
  still has exactly one layer serializes back out as a bare object; a value
  that started as an array (including a one-item array, per spec Edge Cases)
  always serializes as an array, even if reduced to one layer. This is a
  deliberate difference from `FontFamilyEditor`'s rule (which always
  collapses a one-item list to a bare string regardless of the original
  shape) — spec Edge Cases require the array-vs-bare-object choice the
  *author* made on disk to be preserved, not silently normalized, so
  `ShadowEditor` tracks the original shape as a `wasArray` flag captured once
  at mount/prop-change rather than re-deriving it from the current list
  length the way `FontFamilyEditor` does. `FontFamilyEditor`'s rule is safe
  for it because bare-string vs. one-item-array-of-strings are treated as
  fully interchangeable by that spec; `shadow`'s spec explicitly calls out
  that they are not (a one-item array is deliberately kept an array).
- **When the repeater UI shows at all**: per spec Edge Cases, a bare
  single-layer object (not an array) never shows repeater chrome — only
  `ShadowLayerFields` for that one implicit layer, with no add/remove/
  reorder controls, matching `BorderEditor`'s flat single-object shape
  exactly. The repeater (add/remove/move-up/move-down, one `ShadowLayerFields`
  block per row) renders only when `value` is already an array — including a
  one-item array, which shows the repeater with a single row rather than
  collapsing to the bare-object UI, so an author who has already chosen the
  array form isn't silently pushed back to the single-layer view. This is a
  deliberate difference from `FontFamilyEditor`, which shows list-row chrome
  uniformly regardless of the on-disk shape (that type's `toList` promotion
  makes bare-string and one-item-array visually identical by design);
  `shadow`'s spec explicitly requires the two forms to stay visually and
  serialization-distinguishable.
- **Per-row content**: `FontFamilyEditor` renders one `Input` per row;
  `ShadowEditor`'s row renders one `ShadowLayerFields` (the five embedded
  sub-editors) per row, wired so that row's `onChange` replaces only that
  index in the layers array — identical array-splice logic to
  `FontFamilyEditor`'s `handleEntryChange`/`handleMove`/`handleRemove`, just
  operating on `ShadowLayer` objects instead of `string`s.
- **Add-layer default**: a new layer is a fixed, schema-valid default (opaque
  black `srgb` color at `0,0,0,0` alpha, all four dimension sub-fields `0px`)
  per spec Assumptions — no attempt to guess a "sensible" shadow default,
  consistent with `FontFamilyEditor.handleAdd`'s empty-string default (a
  minimal valid starting point the author is expected to edit).
- **Remove-last-layer guard**: per spec Edge Cases, the remove control for the
  last remaining row is disabled (mirroring `FontFamilyEditor`'s existing
  `disabled={index === 0}` / `disabled={index === rows.length - 1}` pattern
  for move-up/move-down at the boundaries) — `ShadowEditor` additionally
  disables the sole row's remove button when `layers.length === 1`, since
  (unlike font-family, where an empty list is valid) a zero-layer shadow
  value is not schema-valid.

Rationale for choosing "adapt `FontFamilyEditor`'s pattern" over inventing a
new list UI from scratch: Principle X's reuse-flagging rule already pushes
toward consolidating repeated list-management logic, and re-deriving
add/remove/reorder semantics independently for `shadow` risked producing
subtly different keyboard/labeling behavior from the one list pattern authors
already encounter in `FontFamilyEditor`. Reusing the same interaction
vocabulary (same button labels' *shape* — "Add X" / "Remove" / "Move up" /
"Move down" — same disablement rules at the boundaries) keeps the editor
experience consistent across every list-shaped token type in this editor,
which is the same interoperability-of-experience argument Principle VII/VIII
already make for embedding sibling *field* editors rather than reinventing
them.

## Complexity Tracking

> Recording the one deliberate continuation of prior `token-editor-*` package
> precedent (not a new violation — `border`/`transition` already established
> and justified this pattern; shadow continues it) — flagged again here per
> Principle I's "any deviation... MUST be flagged explicitly" spirit.

| Violation                                                                                                    | Why Needed                                                                                                                                                                       | Simpler Alternative Rejected Because                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token-editor-shadow` takes `workspace:*` dependencies on two sibling `token-editor-*` packages (`token-editor-color`, `token-editor-dimension`). | Shadow's color and four dimension sub-fields already have dedicated, accessibility-tested, design-system-compliant editors one hop away; embedding them gives shadow tokens the exact same editing experience authors already know from standalone color/dimension tokens. | A bespoke, lightweight color/dimension sub-control built directly inside `token-editor-shadow` would duplicate behavior (ARIA wiring, keyboard interaction, colour-space handling) those packages already own — exactly the kind of duplicated logic Principle VII/VIII exist to prevent, and it would drift out of sync with the real editors over time. Continues the same deliberate, repo-wide experiment named in `border`'s plan.md, now also applied to `shadow`. |
