<!--
Sync Impact Report
==================
Version change: 1.0.0 → 2.0.0
Rationale: MAJOR — Principle I is redefined. v1.0.0 forbade this package
from implementing any colour-space math or perceptual conversion and
barred a direct colour-library dependency, deferring all of it to
`token-core`. The repo-root constitution's Principle VII has since been
amended (v3.0.0) to place UI-driven perceptual colour-space conversion and
gamut mapping in the `token-editor-*` package rather than `token-core`.
This amendment brings the package constitution in line: parsing, type
definitions, value validation, and serialization still come from
`token-core` and MUST NOT be re-implemented here, but perceptual
colour-space conversion, gamut mapping, and CSS-colour-string building
are owned by this package and MAY depend directly on `colorjs.io`. Because
this reverses a v1.0.0 prohibition (a backward-incompatible principle
redefinition), it is MAJOR per the versioning policy below.

Modified principles:
  - I. "Conversion and Parsing Live in token-core" → "Parsing and
    Validation Live in token-core; Colour Conversion Lives Here" —
    redefined as above.

Modified sections:
  - Scope & Precedence — the blanket "Principle I forbids a direct
    colour-library dependency" clause is replaced: `colorjs.io` for
    conversion is now sanctioned by repo-root Principle VII (v3.0.0) and
    named in its Approved Dependencies; any *other* new third-party
    dependency still needs the Principle VIII paper trail.

Added / removed sections: none

Deferred / TODO items: none

Source of truth for this amendment: requested via `speckit-constitution`
alongside the repo-root v3.0.0 amendment, while planning
`specs/001-color-editor-inline` — the maintainer's decision that
`convertColorValue` and `colorjs.io` belong in this package.
-->

<!--
Sync Impact Report (v1.0.0, superseded above)
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

### I. Parsing and Validation Live in token-core; Colour Conversion Lives Here

`@dtcg-editor/token-editor-color` MUST NOT re-implement `ColorValue` parsing,
type definitions, structural/value validation, or the parse/serialize cycle —
those come from `@dtcg-editor/token-core`, which stays the single source of
truth for the shape of the on-disk DTCG colour `$value`. The editor imports
`token-core`'s schemas and serialization; it does not fork them.

This package **does** own the UI-driven authoring transforms: perceptual
colour-space conversion (converting an authored colour to the
visually-equivalent value in another `colorSpace` when the user switches
spaces), gamut mapping, and building CSS-colour strings for preview. It MAY
depend directly on `colorjs.io` (via the tree-shakable `colorjs.io/fn` entry
point) for these — this is sanctioned by repo-root Principle VII (v3.0.0) and
named in its Approved Dependencies. Any other conversion/colour library still
needs the repo-root Principle VIII justification. This conversion code MUST
stay React-free and be independently unit-tested (a plain module under
`src/`), so it stays portable if the repo-root contract shifts again.

Rationale: parsing/validation/serialization must be centralized because
interoperability with other DTCG tooling depends on one spec-conformant
implementation. Perceptual conversion is different in kind — it is not a fact
about the stored value, it is an editor affordance producing a new authored
value — so `token-core` should not carry a colour-library dependency purely to
serve a UI feature. Keeping the transform beside the editor that triggers it,
but framework-free and tested on its own, keeps both concerns clean.

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
repo-root principle; it may only be equal or stricter. (Principle I owning
colour conversion is not an exception — repo-root Principle VII, as amended in
v3.0.0, explicitly places that here.)

Adding a third-party dependency still requires the repo-root Principle VIII
paper trail — named and justified in the feature's `plan.md` before it is added.
The one colour library this package may depend on directly is `colorjs.io` (for
Principle I's conversion/gamut-mapping), which repo-root Principle VII and its
Approved Dependencies list already sanction for `packages/token-editor-color`;
any additional library is still gated by Principle VIII.

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

**Version**: 2.0.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-28
