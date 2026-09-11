# Implementation Plan: Color Token Preview CSS-Style Formatting

**Branch**: `002-color-preview-css-format` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `packages/token-editor-color/specs/002-color-preview-css-format/spec.md`

## Summary

`ColorPreview` (the color token type's read-only `Preview`, wired in
`src/token-type.ts` separately from the interactive `ColorEditor`) renders
its text via a local `formatRaw()` that does `JSON.stringify(value)`. This
package already has `colorValueToCssColor` (`src/utils/css-color.ts`) — a
fully-covered, framework-free utility that renders every DTCG-supported
color space (plus legacy hex) as CSS Color 4 syntax, and is already used to
paint the same preview's `Swatch`. The implementation is to replace
`ColorPreview`'s `formatRaw` with `colorValueToCssColor`, add the missing
unit + a11y test coverage `ColorPreview` currently lacks, tighten the one
existing `apps/web-app` acceptance test that already renders it (per root
Principle XIII's real-entry-point requirement), and touch nothing in
`ColorEditor` or its subtree.

## Technical Context

**Language/Version**: TypeScript, Node 26 (repo-wide toolchain)

**Primary Dependencies**: React 19 (`ColorPreview` is a component);
`@dtcg-editor/token-core` (`ColorValueSchema`, already imported by
`Swatch`); no new dependency — `colorValueToCssColor` and its test coverage
already exist in this package

**Storage**: N/A — no persisted state; this is a pure rendering change

**Testing**: Two-stack per `.specify/memory/tdd-profile.md` (root): this
package's plain-`.ts` logic runs under `node --test` (`pnpm --filter
@dtcg-editor/token-editor-color test`); `.tsx` component + `.a11y.test.tsx`
tests run under the root-aggregated Vitest config
(`pnpm exec vitest run` from repo root). `ColorPreview` currently has
**no** test file of either kind — both must be added as part of this
feature, both under TDD (root Principle XIII, NON-NEGOTIABLE): a failing
test before each behavior change. A third tier applies too: the existing
`@playwright/test` acceptance suite (`apps/web-app/e2e/`) already exercises
`ColorPreview` through a real reference-preview flow
(`edit-token-references.spec.ts`) and is tightened, not newly written, to
assert the new CSS-syntax text — satisfying Principle XIII's
real-entry-point acceptance-test requirement for this feature's acceptance
scenarios.

**Target Platform**: Web (Next.js app, `apps/web-app`, consuming this
package as a workspace dependency)

**Project Type**: Library package (React component library) inside a pnpm
monorepo — no new project/service structure

**Performance Goals**: N/A beyond existing render performance — this
change swaps one string-formatting function for another already-computed
value; no new async work, no new render passes

**Constraints**: Must not alter `ColorEditor` in any way (spec FR-003,
User Story 2). Must not introduce a new formatting mapping independent of
`colorValueToCssColor` (spec FR-002 / Assumptions) — reuse only.

**Scale/Scope**: One component (`ColorPreview`), its module CSS
(unaffected — already design-system-token-only), and its new tests, plus
one existing `apps/web-app/e2e/` acceptance test updated to assert the new
CSS-syntax text at the real entry point (Principle XIII). No other file in
either location needs to change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Package constitution (`packages/token-editor-color/.specify/memory/constitution.md`)
governs, with the repo-root constitution as authoritative baseline per its
own Scope & Precedence section.

- **Principle I** (parsing/validation in `token-core`; conversion & CSS-string
  building here) — PASS. This feature *only* exercises the "building
  CSS-colour strings for preview" half of Principle I, which this package
  already owns. No `ColorValue` parsing/validation is touched;
  `colorValueToCssColor` takes an already-validated `ColorValue` (`Swatch`
  validates via `ColorValueSchema.safeParse` before calling it, and
  `ColorPreview` will keep doing the same for the text).
- **Principle II** (editor is not a validation boundary) — PASS / N/A.
  `ColorPreview` is not the `Editor`; its existing re-validation of an
  arbitrary resolved value (documented in its own doc comment: "`value`
  isn't guaranteed to actually be a `ColorValue`... so this re-validates it
  itself") is pre-existing, unchanged behavior, not new parsing logic added
  by this feature.
- **Principle III** (design system is the only source of UI values) — PASS.
  `ColorPreview.module.css` already uses only `var(--dtcg-ed-font-mono)`.
  The CSS-string text itself is rendered token *data*, not a UI value, per
  this principle's own stated exception (the swatch color already does
  exactly this). No new literal values are introduced.
- **Principle IV** (component granularity & test coverage) — GATE, not yet
  satisfied by the current codebase: `ColorPreview` has no `.test.tsx` and
  no `.a11y.test.tsx` today. This plan's tasks close that gap as part of
  implementing the feature (see Phase 1 quickstart and the forthcoming
  `tasks.md`), satisfying the gate rather than working around it.
- **Principle V** (DTCG Color module conformance) — PASS. No color-space,
  channel, or `$value`-shape behavior changes; `colorValueToCssColor`
  already covers all DTCG 2025.10-supported spaces plus the legacy hex
  form, unchanged by this feature.
- **Root Principle XIII** (TDD, NON-NEGOTIABLE) — applies in full (package
  constitution cannot relax it), and in full means three concrete
  obligations `tasks.md` must satisfy, not just "write tests first" in the
  abstract:
  1. Both new component test files (unit + a11y) must be written and
     observed failing, for the expected reason, before `ColorPreview`'s
     implementation changes.
  2. Every acceptance criterion in `spec.md` needs at least one acceptance
     test exercising the *real entry point* (`@playwright/test`), not only
     a component-level Vitest test — `apps/web-app/e2e/edit-token-references.spec.ts`
     already renders `ColorPreview` in a real reference-preview flow and
     must be updated (not just left passing incidentally) to assert the
     new CSS-syntax text.
  3. Each observed-red failure is recorded in
     `specs/002-color-preview-css-format/tdd/cycle-log.md` before the
     implementation task that makes it green begins.
  This package's `.specify/extensions.yml` does not exist, so the
  `speckit-tdd-*` extension's automatic hooks won't fire for this
  package-scoped pipeline — the discipline still applies constitutionally;
  `/speckit-implement` MUST satisfy all three obligations by hand here, or
  `speckit-tdd-setup` run first to install the extension package-locally.

No violations requiring Complexity Tracking.

### Post-Design Re-check (after Phase 1)

`research.md`, `data-model.md`, and `quickstart.md` confirm the design
stays inside the gate evaluated above: no new entity, no new dependency, no
new formatting logic independent of `colorValueToCssColor`, and no file
under `ColorEditor/` touched. The one open gate — Principle IV's missing
`ColorPreview` test coverage — is resolved by Phase 2 tasks adding
`ColorPreview.test.tsx` / `ColorPreview.a11y.test.tsx` test-first, not by
design changes here. No re-evaluation findings beyond the initial check.

## Project Structure

### Documentation (this feature)

```text
packages/token-editor-color/specs/002-color-preview-css-format/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/token-editor-color/src/
├── components/
│   ├── ColorPreview/
│   │   ├── ColorPreview.tsx           # MODIFIED — formatRaw() → colorValueToCssColor()
│   │   ├── ColorPreview.module.css    # unchanged
│   │   ├── ColorPreview.test.tsx      # NEW
│   │   └── ColorPreview.a11y.test.tsx # NEW
│   ├── ColorEditor/                   # untouched (spec FR-003 / User Story 2)
│   ├── ColorFunctionValue/            # untouched
│   ├── ChannelInput/                  # untouched
│   ├── ColorSpaceSelect/              # untouched
│   ├── SpaceConversionDialog/         # untouched
│   └── Swatch/                        # untouched — already calls colorValueToCssColor
├── utils/
│   ├── css-color.ts                   # unchanged — reused, not modified
│   └── css-color.test.ts              # unchanged — already covers every color space
└── token-type.ts                      # unchanged — Preview wiring already points at ColorPreview

apps/web-app/e2e/
└── edit-token-references.spec.ts      # MODIFIED — tighten preview-text
                                        # assertions to the new CSS syntax
                                        # (Principle XIII real-entry-point
                                        # acceptance test requirement)
```

**Structure Decision**: Single package, single component modified
(`ColorPreview`), reusing an existing, already-tested sibling utility
(`css-color.ts`). No new files outside `ColorPreview`'s own folder except
its two missing test files, plus one existing `apps/web-app` acceptance
test tightened (not newly created) to actually pin down the new format at
the real entry point — `ColorPreview` is otherwise consumed only through
the `TokenTypeContract` wiring already in place.

## Complexity Tracking

*No violations — table omitted.*
