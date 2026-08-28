<!--
Sync Impact Report
==================
Version change: (unset/template) → 1.0.0
Rationale: Initial ratification. The prior file on disk contained only unfilled
[PLACEHOLDER] tokens from the core scaffold (never a real constitution), so this
is first adoption — MAJOR version 1.0.0, not a bump from an existing baseline.
This is a PACKAGE-SCOPED constitution for `@dtcg-editor/token-editor-color`; the
repo-root constitution (`.specify/memory/constitution.md`, currently v2.7.1)
remains the authoritative baseline and this document only adds color-editor
specifics on top of it (see "Scope & Precedence").

Added sections:
  - Core Principles I–V: Conversion & Parsing Live in token-core; Presentational
    Editor, Not a Validation Boundary; Design System Is the Only Source of UI
    Values; Component Granularity & Test Coverage; DTCG Color Module Conformance
  - Scope & Precedence (relationship to the repo-root constitution)
  - Development Workflow (package-local Spec Kit pipeline, tests, spec location)
  - Governance

Removed sections: none

Deferred / TODO items: none

Source of truth: derived from the repo-root constitution v2.7.1 (Principles I,
IV, VII, X, XII in particular) and the existing shape of
`packages/token-editor-color` as of drafting, confirmed with the maintainer via
`/speckit-constitution`.
-->

# dtcg-editor Color Editor Constitution

## Core Principles

### I. Conversion and Parsing Live in token-core

`@dtcg-editor/token-editor-color` MUST NOT implement color-space math,
perceptual cross-space conversion, gamut mapping, hex/CSS-color parsing, or
`ColorValue` validation itself. Every such operation MUST be imported from
`@dtcg-editor/token-core`, which is the single source of truth for color value
shape, parsing, and conversion. This package MUST NOT take a direct dependency
on any third-party color library (`colorjs.io`, `culori`, or similar); if a
capability it needs is missing from `token-core`, the fix is to add it to
`token-core`, not to reach around it.

Rationale: the repo-root constitution's Principle VII already centralizes all
token-type parsing/validation/conversion in `token-core` so every consumer gets
one dependency-light, spec-conformant implementation. A second color
implementation in the editor package would be a second thing to keep
spec-correct and a second place for the two to disagree.

### II. The Editor Is Presentational, Not a Validation Boundary

The editor reads and writes a `ColorValue` through the `TokenTypeContract` it
implements. It MUST treat values received from `token-core` as already-typed,
already-trusted data and MUST NOT re-validate them. It MUST NOT introduce a new
Zod schema or parsing edge of its own. Guarding against a user typing a
non-numeric channel is input hygiene at a control, not a system trust boundary,
and MUST NOT grow into re-parsing whole values.

Rationale: repo-root Principle IV — validation happens once, at the true edges.
The editor is downstream of the edge `token-core` already owns.

### III. The Design System Is the Only Source of UI Values

Every design value the editor renders — color, spacing, sizing, radius, border,
shadow, typography, motion/timing, elevation/z-index — MUST come from
`@dtcg-editor/design-system`'s generated `--dtcg-ed-*` custom properties. No
literal design values (hex/rgb colors, raw `px`/`rem`, ad hoc `border-radius`,
one-off `box-shadow`, hand-picked transition timings) may appear in this
package's TSX or CSS. Where `design-system` exports a component for a UI element
the editor needs (input, select/dropdown, dialog, etc.), that component MUST be
used rather than hand-rolled. The single permitted exception is an inherently
dynamic value that is token *data* being rendered — e.g. the resolved swatch
preview color — threaded through as a CSS custom property, not written as a
static style.

Rationale: repo-root Principle XII and `DESIGN.md`, applied without exception to
this package. A color editor is exactly the place hardcoded color literals creep
in "just for the preview"; they do not.

### IV. Component Granularity and Test Coverage

Every React component in this package MUST live in its own PascalCase-named
folder with co-located tests and styles, MUST export exactly one component, and
MUST have a single nameable purpose. Every component MUST have unit test
coverage (Vitest + `@testing-library/react`) of its rendered behavior and MUST
be covered by the project's accessibility test tiers (Vitest Browser Mode +
`axe-core` for the component; `@playwright/test` at the app level for
keyboard/whole-page flows). A component with no accessibility semantics of its
own still needs an explicit test asserting that.

Rationale: repo-root Principle X, restated as a package-local gate so it is
checked here rather than only assumed.

### V. DTCG Color Module Conformance

Anything the editor exposes about a color value — the color spaces it offers,
the channels it shows per space, their ranges and units, the object/legacy
`$value` shapes it reads and writes — MUST conform to the DTCG Color module the
project targets (designtokens.org/tr/2025.10/color/). A deliberate deviation
(such as continuing to accept the legacy bare-hex string form) MUST be flagged
explicitly in the relevant `spec.md`/`plan.md` and in code comments, never
introduced silently.

Rationale: repo-root Principle I — interoperability with other DTCG tooling is
the project's whole value proposition, and the editor is where a
spec-nonconformant color shape would first be authored.

## Scope & Precedence

This is a package-scoped constitution. The **repo-root constitution**
(`.specify/memory/constitution.md`) is the authoritative baseline and governs
this package in full — its Principles I–XII, Technology Stack & Approved
Dependencies, and Development Workflow all apply here unchanged.

This document exists only to restate, as package-local gates, the repo-root
principles that bear most directly on a token-type editor, and to add
color-editor specifics. Where this document and the repo-root constitution
appear to conflict, the **repo-root constitution wins** and this file MUST be
corrected. This document MUST NOT grant an exception to, or a relaxation of, any
repo-root principle; it may only be equal or stricter.

Adding a third-party dependency (including a color library) still requires the
repo-root Principle VIII paper trail — named and justified in the feature's
`plan.md` before it is added — and Principle I above additionally forbids a
direct color-library dependency in this package regardless of that trail.

## Development Workflow

- Feature work in this package follows the package-local Spec Kit pipeline
  installed under `packages/token-editor-color/.specify/`
  (`speckit-constitution` → `speckit-specify` → `speckit-clarify` (optional) →
  `speckit-checklist` (optional) → `speckit-plan` → `speckit-tasks` →
  `speckit-analyze` (optional) → `speckit-implement` → `speckit-converge`
  (optional)). Spec artifacts live under `packages/token-editor-color/specs/`,
  not the repo-root `specs/` tree.
- `speckit-analyze` (pre-implementation cross-artifact check) and
  `speckit-converge` (post-implementation gap check) are this package's
  compliance gates against both this constitution and the repo-root one.
- Tests run under the repo's single root Vitest project set; this package's
  `Editor` renders JSX and therefore uses Vitest + `@testing-library/react`,
  not `node:test`. Storybook stories for this package's components live beside
  the components and are discovered by the repo-root Storybook.
- Internal relative imports use an explicit `.ts`/`.tsx` source extension, per
  the repo-root Development Workflow.
- Commits follow Conventional Commits with a `token-editor-color` (or
  `token-editor-*`) scope where the repo's `commitlint` config allows it.

## Governance

This constitution supplements, and is subordinate to, the repo-root
constitution. It supersedes only undocumented ad hoc practice within
`packages/token-editor-color`, and only where it does not conflict with the
repo-root constitution or a feature's own `spec.md`/`plan.md`/`tasks.md`.

**Amendment procedure**: a change to this file is proposed via a PR that edits
`packages/token-editor-color/.specify/memory/constitution.md` directly, states
the version bump and rationale in a Sync Impact Report comment at the top (same
format as this ratification), and is reviewed like any other governance change.
If an amendment here would require relaxing a repo-root principle, the repo-root
constitution MUST be amended first (or instead).

**Versioning policy** (semantic versioning applied to governance, not code):

- **MAJOR** — backward-incompatible principle removal or redefinition.
- **MINOR** — a new principle or materially expanded section added.
- **PATCH** — wording clarifications, typo fixes, non-semantic refinements.

**Compliance review**: `speckit-analyze` MUST be run after `speckit-tasks` and
before `speckit-implement`; `speckit-converge` MUST be run after
`speckit-implement`. A violation of this constitution or the repo-root
constitution found at either stage is a blocking finding unless explicitly
waived with recorded rationale in the feature's `plan.md`.

**Version**: 1.0.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-28
