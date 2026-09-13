# Implementation Plan: Border Token Support

**Branch**: `worktree-border-token-support` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-border-token-support/spec.md`

## Summary

Add editor support for the DTCG composite `border` token type. `token-core`
gains `BorderValueSchema` (`{ color, width, style }`), composed directly from
the existing `ColorValueSchema`/`DimensionValueSchema`/`StrokeStyleValueSchema`
— no new validation logic. A new package, `packages/token-editor-border`,
provides `BorderEditor` and `BorderPreview`, wired into a `TokenTypeContract`.
Per the explicit architectural direction for this feature, both components
**embed the real sibling `Editor`/`Preview` components** from
`token-editor-color`, `token-editor-dimension`, and `token-editor-stroke-style`
via prop drilling, rather than re-implementing lightweight bespoke sub-controls
for color/width/style. The new type is registered in
`apps/web-app/lib/token-editors/built-in.ts` alongside the other built-ins.

## Technical Context

**Language/Version**: TypeScript (strict, per root `tsconfig.base.json`)

**Primary Dependencies**: React, Zod, `@dtcg-editor/token-core`,
`@dtcg-editor/token-editor-contract`, and — the architecturally-significant
choice for this feature — `@dtcg-editor/token-editor-color`,
`@dtcg-editor/token-editor-dimension`, `@dtcg-editor/token-editor-stroke-style`
as direct `workspace:*` dependencies of the new package.

**Storage**: N/A (in-memory token document editing, same as every other
`token-editor-*` package)

**Testing**: Vitest + `@testing-library/react` (jsdom) for `BorderEditor`/
`BorderPreview` unit tests, Vitest Browser Mode + `axe-core` for a11y tests
(both aggregated into the root `vitest.config.mts` `test.projects`, per this
package needing an `Editor` component); `node:test` for the React-free
`BorderValueSchema` schema test in `token-core`.

**Target Platform**: Web (Next.js app, `apps/web-app`)

**Project Type**: Monorepo package addition (library/editor-plugin) + one
registration edit in the web app

**Performance Goals**: N/A — no new performance-sensitive path; the editor
renders three already-existing controls, none of which are on a critical
timing path per the existing perf budgets in `tdd-profile.md`.

**Constraints**: Must not modify `packages/token-editor-contract` or the
three sibling `token-editor-*` packages themselves — only consume their
existing public exports. Must not duplicate `token-core`'s existing
sub-schemas.

**Scale/Scope**: One new `token-core` module + test, one new package
(`token-editor-border`) with 2 components (`BorderEditor`, `BorderPreview`)
each with unit + a11y tests, one `token-type.ts` contract wiring module, one
edit to `apps/web-app/lib/token-editors/built-in.ts`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (DTCG Spec Compliance)** — PASS. `BorderValueSchema` matches
  the DTCG 2025.10 Format spec's Border type exactly (`color`, `width`,
  `style`, all required, no deviation). No spec deviation is introduced.
- **Principle II (Feature-Based Code Organization)** — PASS. `token-core`
  keeps owning parsing/validation (`border.ts` alongside `border.test.ts`);
  `token-editor-border` owns its own Editor/Preview/contract as one cohesive
  unit, matching every sibling `token-editor-*` package's layout.
- **Principle III (TypeScript Strictness)** — PASS. New package extends the
  same `tsconfig.base.json` with no relaxation, matching sibling packages.
- **Principle IV (Validation at the Edges)** — PASS. `BorderEditor` receives
  an already-validated `BorderValue` (per `TokenTypeEditorProps<TValue>`) and
  does not re-validate it; `BorderPreview` re-validates its `unknown` input
  exactly once, matching every sibling `Preview`'s documented pattern (its
  input isn't guaranteed to conform, since it comes from resolving an
  arbitrary other token, not from this contract's own schema).
- **Principle VII (Token-Editor Package Contract)** — PASS, with an
  intentional new pattern flagged below (see Complexity Tracking):
  `token-editor-border` depends on `token-core` (one-way, as required) *and*
  on three sibling `token-editor-*` packages. This is new — no prior
  `token-editor-*` package has depended on another — so it is called out
  explicitly per Principle I's "flag any deviation" spirit and Principle
  VIII's dependency-justification requirement, even though it is an internal
  workspace dependency, not a new third-party one.
- **Principle VIII (Minimal Dependencies)** — PASS, justification recorded:
  the three new `workspace:*` dependencies avoid re-implementing three
  already-built, already-accessibility-tested editors; the alternative
  (bespoke lightweight sub-controls duplicating `ColorEditor`/
  `DimensionEditor`/`StrokeStyleEditor`'s behavior) was rejected as exactly
  the kind of duplicated logic Principle VII/VIII exist to prevent. This is
  the deliberate experiment named in the task: reuse sibling editors directly
  for composite types instead of duplicating lightweight versions of their
  controls.
- **Principle IX (Round-Trip Fidelity)** — PASS. `serializeValue` for border
  is the identity function on the validated object (same as every other
  built-in type's `serializeValue`); no new serialization logic that could
  lose data.
- **Principle X (Component Granularity & Testing)** — PASS. `BorderEditor`
  and `BorderPreview` are each in their own file/folder
  (`src/components/BorderEditor/`, `src/components/BorderPreview/`), each
  co-located with unit + a11y tests, following the PascalCase/folder-per-
  component convention `@ls-lint/ls-lint` enforces.
- **Principle XII (Design System Usage)** — PASS. `BorderEditor` introduces
  no new raw design values or hand-rolled controls of its own — it only lays
  out (a `<span>`/flex wrapper) the three embedded sub-editors, which already
  independently comply with Principle XII. Any new layout-only CSS in
  `BorderEditor.module.css` uses `--dtcg-ed-*` tokens for spacing, matching
  sibling composite layout precedent (e.g. `StrokeStyleEditor.module.css`'s
  `styles.container`/`styles.field`).
- **Principle XIII (TDD, NON-NEGOTIABLE)** — GATE: `speckit-tdd-plan` MUST be
  run before `speckit-implement`; every behavior test must be observed
  failing first and logged in `tdd/cycle-log.md`. Addressed procedurally,
  not a design concern for this plan.

No unjustified violations. See Complexity Tracking for the one deliberate,
explicitly-approved deviation from prior `token-editor-*` precedent
(inter-package dependency).

## Project Structure

### Documentation (this feature)

```text
specs/013-border-token-support/
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
existing sibling-package precedent — and no new external interface beyond
the existing `TokenTypeContract` shape every sibling package already
implements identically. Skipping those Phase 0/1 artifacts here matches
`specs/012-stroke-style-token-support`'s precedent, which likewise proceeded
straight from `plan.md` to `tasks.md` for a similarly fully-specified,
no-new-external-interface feature.)

### Source Code (repository root)

```text
packages/token-core/src/
├── border.ts             # NEW: BorderValueSchema / BorderValue
└── border.test.ts        # NEW: schema unit tests (node:test)
# packages/token-core/src/index.ts — NEW: export BorderValueSchema/BorderValue

packages/token-editor-border/                    # NEW package
├── package.json
├── tsconfig.json
├── vitest.setup.ts
├── vitest-a11y-tags.ts
├── src/
│   ├── index.ts
│   ├── token-type.ts                            # borderTokenType: TokenTypeContract<BorderValue>
│   ├── css-modules.d.ts
│   ├── vitest-env.d.ts
│   └── components/
│       ├── BorderEditor/
│       │   ├── BorderEditor.tsx
│       │   ├── BorderEditor.module.css
│       │   ├── BorderEditor.test.tsx
│       │   ├── BorderEditor.a11y.test.tsx
│       │   └── BorderEditor.stories.tsx
│       └── BorderPreview/
│           ├── BorderPreview.tsx
│           ├── BorderPreview.module.css
│           ├── BorderPreview.test.tsx
│           └── BorderPreview.a11y.test.tsx

apps/web-app/lib/token-editors/built-in.ts        # EDIT: register "border"
vitest.config.mts                                 # EDIT: add packages/token-editor-border to `packages` array
```

**Structure Decision**: Follows the existing `token-editor-*` package
template exactly (as used by `token-editor-dimension`, `token-editor-color`,
`token-editor-stroke-style`), with the one deliberate addition of
`workspace:*` dependencies on three sibling `token-editor-*` packages instead
of zero, per the embedding architecture described above.

## Complexity Tracking

> Recording the one deliberate, explicitly-approved deviation from prior
> `token-editor-*` package precedent — not a constitution violation, since
> Principle VII/VIII permit and this plan justifies it, but flagged per
> Principle I's "any deviation... MUST be flagged explicitly" spirit and the
> task's explicit instruction to record this rationale here.

| Violation                                                                             | Why Needed                                                                                                                                                                                     | Simpler Alternative Rejected Because                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `token-editor-border` takes `workspace:*` dependencies on three sibling `token-editor-*` packages (`token-editor-color`, `token-editor-dimension`, `token-editor-stroke-style`) — no prior `token-editor-*` package has depended on another. | Border's three sub-fields already have dedicated, accessibility-tested, design-system-compliant editors and previews one hop away; embedding them gives border tokens the exact same color/width/style editing experience authors already know, and any future fix/improvement to those editors (e.g. a color gamut fix) is inherited by every composite that embeds them for free. | A bespoke, lightweight color/width/style sub-control built directly inside `token-editor-border` would duplicate behavior (ARIA wiring, keyboard interaction, dash-pattern mode toggle, colour-space handling) those packages already own — exactly the kind of duplicated logic Principle VII/VIII exist to prevent, and it would drift out of sync with the real editors over time. This is a deliberate, repo-wide experiment (also applied to the sibling `transition`/`shadow`/`gradient`/`typography` composite features) in reusing sibling editors directly for composite DTCG types, rather than each composite reinventing its own thin versions of the same controls. |
