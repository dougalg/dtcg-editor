<!--
Sync Impact Report
==================
Version change: 2.1.0 → 2.2.0
Rationale: MINOR — materially expands Principle X (Component Granularity &
Testing) with a component-reuse-detection rule: 3+ structurally/
stylistically/functionally similar components MUST be flagged as a
candidate for extraction into `packages/design-system`. No existing rule
within the principle is redefined or removed, so this is not MAJOR; a new
enforceable rule is materially more than a wording clarification, so this
is not PATCH.

Added sections: none (extends the existing Principle X body + rationale)

Modified principles:
  - X. Component Granularity & Testing — rule paragraph gains the 3+
    similar-components reuse-flagging requirement; rationale expanded to
    explain the count-based threshold and why `design-system` is the
    consolidation target.

Removed sections: none

Deferred / TODO items: none

Source of truth for this amendment: requested directly via
`speckit-constitution` immediately following the v2.1.0 amendment, as a
follow-up extension to the same principle — when 3+ repeated component
instances are identified (by structure, style, and function), they should
be flagged as a candidate for a shared component contributed to
`packages/design-system`.
-->

<!--
Sync Impact Report (v2.1.0, superseded above)
==================
Version change: 2.0.1 → 2.1.0
Rationale: MINOR — adds a new Core Principle (X. Component Granularity &
Testing) governing React component structure and test coverage: one
component per file, a single nameable purpose per component, a 300-line
soft ceiling, and mandatory unit + accessibility test coverage for every
component. No existing principle is redefined or removed, so this is not
MAJOR; a new principle is materially more than a wording clarification, so
this is not PATCH.

Added sections:
  - X. Component Granularity & Testing

Modified principles: none

Removed sections: none

Deferred / TODO items: none

Source of truth for this amendment: requested directly via
`speckit-constitution` — components should be small (ideally < 300 lines),
aim for a single purpose, always live in their own file, and be fully unit
tested and accessibility tested.
-->

<!--
Sync Impact Report (v2.0.1, superseded above)
==================
Version change: 2.0.0 → 2.0.1
Rationale: PATCH — pure terminology sync, no principle redefinition. The
"token-core-refactor" feature spec (specs/001-token-core-refactor/spec.md)
was clarified to also rename the `token-type-*` package family to
`token-editor-*` (`token-type-color` → `token-editor-color`,
`token-type-dimension` → `token-editor-dimension`, `token-type-contract` →
`token-editor-contract`), since post-refactor these packages hold only
editor UI — the old name no longer describes their scope. This amendment
updates every live body reference to that package family's name so the
constitution stays consistent with the name the codebase is about to use;
no rule established by the v2.0.0 amendment changes.

Modified principles:
  - II. Feature-Based Code Organization — wording only: `token-type-*` /
    "token-type package" references renamed to `token-editor-*` / "token-editor
    package".
  - III. TypeScript Strictness — wording only: "token-type packages"
    reference renamed to "token-editor packages".
  - VII. Token-Editor Package Contract (renamed from "Token-Type Package
    Contract") — wording only: `token-type-*` / "token-type package"
    references renamed to `token-editor-*` / "token-editor package"
    throughout, matching the heading rename.

Added sections: none

Removed sections: none

Other changes:
  - Technology Stack & Approved Dependencies — "React (UI/token-type
    packages, web app)" reworded to "React (UI/token-editor packages, web
    app)".

Deferred / TODO items: none

Source of truth for this amendment: requested via `speckit-constitution`
immediately after the matching `/speckit-clarify` session on
specs/001-token-core-refactor/spec.md recorded the rename decision, so the
constitution doesn't go stale relative to the spec it governs before
`/speckit-plan` runs.
-->

<!--
Sync Impact Report (v2.0.0, superseded above)
==================
Version change: 1.1.0 → 2.0.0
Rationale: MAJOR — Principle VII (Token-Type Package Contract) is redefined:
`token-core` is no longer merely the generic, type-agnostic node/group engine;
it becomes the single source of truth for parsing, type definitions, and
value validation for every specific `$type` (color, dimension, etc.), not
just the generic DTCG document shape. The prior rule "the core engine MUST
NEVER hard-code knowledge of specific token types" is narrowed to apply only
to rendering/registration (which UI renders which type), not to parsing —
this is a backward-incompatible redefinition of what Principle VII permits,
so per this constitution's own versioning policy (MAJOR = "backward-
incompatible principle removal or redefinition") this is MAJOR, not MINOR,
regardless of how the amendment was requested. Principle II (Feature-Based
Code Organization) is correspondingly redefined: a `token-type-*` package no
longer owns "components, validation, and logic together" — it owns editor UI
only, with validation/parsing logic centralized in `token-core`.

Modified principles:
  - II. Feature-Based Code Organization — redefined: `token-type-*` packages
    are now editor-UI-only (component, styling, `TokenTypeContract` wiring);
    parsing/type-definition/validation logic for every token type lives in
    `token-core` as one cohesive package, not distributed per-type.
  - VII. Token-Type Package Contract — redefined: `token-core` now owns
    parsing, type definitions, and value validation (Zod schemas,
    conversion/serialization helpers) for every specific `$type`, remaining
    React-free; only the pluggable `Editor` component and contract-wiring
    stay in `token-type-*` packages. Explicit one-way dependency rule added
    (`token-type-*` → `token-core`, never the reverse).

Added sections: none

Removed sections: none

Other changes:
  - Technology Stack & Approved Dependencies — `colorjs.io`'s approved scope
    updated from `packages/token-type-color` to `packages/token-core`,
    matching where color conversion logic now lives.

Deferred / TODO items: none

Source of truth for this amendment: requested via `speckit-constitution` to
unblock the "refactor token-type subpackages" backlog item (all parsing/type
definitions into `token-core`; `token-type-*` subpackages become editor-only)
before its `speckit-specify` spec is written, so the spec doesn't contradict
ratified principles.
-->

<!--
Sync Impact Report (v1.1.0, superseded above)
==================
Version change: 1.0.0 → 1.1.0
Rationale: MINOR — Development Workflow and Governance materially rewritten to
reference the speckit skill pipeline (speckit-specify/clarify/checklist/plan/
tasks/analyze/implement/converge/taskstoissues) in place of the retired sdd-*
skill set, and every reference to docs/project.md as the project's living
reference document is replaced with this constitution file
(.specify/memory/constitution.md). No principle was removed or redefined, so
this is not a MAJOR change; the workflow/governance sections are materially
expanded/changed, so PATCH would understate it.

Modified principles:
  - I. DTCG Spec Compliance — `feature.md` reference replaced with `spec.md`
    (speckit's spec artifact), no rule change.

Added sections: none

Removed sections: none

Deferred / TODO items: none

Source of truth for this amendment: docs/backlog.md-driven pick-up-task flow
is retained (the standalone `pick-up-task` skill has no speckit equivalent);
sdd-init is retired outright rather than mapped to a speckit command, since
speckit-constitution now plays that "establish project context" role and
docs/project.md is no longer generated or maintained by any step in the
pipeline.
-->

<!--
Sync Impact Report (v1.0.0, superseded above)
==================
Version change: (unset/template) → 1.0.0
Rationale: Initial ratification. The prior file on disk contained only unfilled
[PLACEHOLDER] tokens (never a real constitution), so this is treated as first
adoption rather than an amendment — hence MAJOR version 1.0.0, not a bump from
an existing baseline.

Added sections:
  - Core Principles (I–IX): DTCG Spec Compliance, Feature-Based Organization,
    TypeScript Strictness, Validation at the Edges, Result-Pattern Error
    Handling, Dependency Injection for I/O Externalities, Token-Type Package
    Contract, Minimal Dependencies, Round-Trip Fidelity
  - Technology Stack & Approved Dependencies
  - Development Workflow (SDD pipeline, testing, CI/commit discipline)
  - Governance

Source of truth: derived from docs/project.md (Tech Stack, Architecture,
Conventions, Architectural Constraints, Approved Dependencies sections) as
of drafting.
-->

# dtcg-editor Constitution

## Core Principles

### I. DTCG Spec Compliance (NON-NEGOTIABLE)

Token schemas, formats, and validation logic MUST strictly conform to the Design
Tokens Community Group specification currently targeted by the project
(designtokens.org/tr/2025.10/format). Any deviation from the spec MUST be flagged
explicitly in the relevant `plan.md`/`spec.md` and in code comments — it MUST
NOT be implemented silently.

Rationale: interoperability with other DTCG tooling (Figma plugins, Style
Dictionary, other editors) is this project's entire value proposition. A silent
spec deviation is silent data corruption in files the user owns, not a cosmetic
bug.

### II. Feature-Based Code Organization

Code is organised by feature/domain, not by technical layer, at the
package-family level: `token-core` owns parsing, type definitions, and
validation for every token type as one cohesive package — not split into
per-layer `parsers/`, `validators/`, `schemas/` directories within it, and
not distributed one copy per `token-editor-*` package. Each `token-editor-*`
package owns that type's editor UI as its own cohesive unit — the `Editor`
component, its styling, and the `TokenTypeContract` wiring that connects it
to `token-core`'s schema for that type — rather than being split across
shared `components/`, `services/` directories. Tests live alongside the code
they test (`parse.ts` + `parse.test.ts`, `color.ts` + `color.test.ts`,
wherever that code now lives), not in a separate `test/` tree.

Rationale: centralizing parsing/type-definitions in `token-core` keeps the
DTCG-spec-conformant validated model in one place (Principle I) instead of
scattered one copy per token-editor package, while keeping each type's editor
UI independently addable/removable as a plugin (Principle VII) — the
code-organization boundary matches the plugin boundary for UI, so adding or
removing a token type's _editor_ stays a single-directory operation even
though its parsing lives centrally. A test is part of the feature bundle it
verifies; a separate `test/` tree would reintroduce the layer split this
principle exists to avoid.

### III. TypeScript Strictness

All packages MUST compile under maximally strict TypeScript settings, with no
per-package relaxation — whether the package is publishable (core engine,
token-editor packages) or internal (web app). Root `tsconfig.base.json` enables
`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitOverride`, `noImplicitReturns`; every package `extends` it and MUST
NOT loosen any flag. `any` is banned (lint-enforced); use `unknown` and narrow.
A non-null assertion (`!`) requires an inline comment justifying safety.

Rationale: the strict-at-the-edges validation model (Principle IV) only holds
if the type system itself can't be silently defeated by one package opting
out.

### IV. Validation at the Edges

Validation happens once, at the true edges of the system — file reads,
pasted/uploaded JSON, host-app configuration, or a third-party consumer
calling a package's public API directly. Every such edge MUST be a Zod schema
producing a typed, trusted internal representation. Once data has entered
through an edge, it flows through the rest of the system — including across
package boundaries — as trusted, typed data. Re-validating already-typed
internal data is a bug, not a safety net.

Rationale: a token-editor package receiving a `TokenValue` from the core engine
does not need to re-validate it, because the core engine already validated it
at the point that value first entered the system. Duplicate validation is
redundant work and a sign the trust boundary isn't understood.

### V. Result-Pattern Error Handling

All fallible operations MUST return a `Result<T, E>` (or `ResultAsync<T, E>`
for async) from `neverthrow`, composed via `.andThen`/`.map`, rather than
throwing. Throwing calls (`JSON.parse`, `fetch`, third-party libraries) are
wrapped into a `Result` exactly once, at the point they're called, using
`fromThrowable`/`ResultAsync.fromPromise` — never left to propagate as an
exception.

Errors fall into two categories: **named errors** (a discriminated union
local to the module producing them, which the caller is expected to branch
on and handle) and **`UnknownError`** (a single shared type wrapping anything
unexpected, logged immediately at creation via an injected `Logger`, not
meant to be branched on). At the UI layer, Server Components exhaustively
branch every named error before falling back to a generic message; Client
Component hooks track fetch outcomes as status-enum-plus-discriminated-union
state rather than thrown exceptions; error boundaries (`error.tsx`) are
reserved for genuinely unexpected render-time exceptions only.

Rationale: a thrown exception is invisible to the type checker — a function's
signature gives no indication it can fail — which defeats the same
"can't be silently bypassed" guarantee TypeScript Strictness establishes for
types. The Result pattern forces a caller to explicitly unwrap the failure
case.

### VI. Dependency Injection for I/O and Platform Externalities

A function touching an I/O/platform externality — filesystem, `fetch`, the
process clock, `console`, environment variables, `process.exit`, randomness,
timers — MUST accept it as an explicit parameter with a real implementation
as its default value, rather than importing/calling the externality directly.
Inject when either holds: (a) a host app embedding the engine might need to
swap the real implementation, or (b) a real call is awkward, slow, or
impossible to exercise directly in a test. A dedicated adapter module is only
warranted when a real implementation is shared across more than one call
site; a single-call-site externality declares its real default inline.

Rationale: generalizes the `Logger`-injection convention to every externality
category, keeping host-app embeddability and testability uniform rather than
ad hoc per feature.

### VII. Token-Editor Package Contract

`token-core` is the single source of truth for every token type's parsing,
type definitions, and value validation — Zod value schemas, conversion/
serialization helpers, and any other DTCG-value-shape logic — for both the
generic node/group document model and each specific `$type` (`color`,
`dimension`, etc.). It remains completely agnostic of UI/app tooling: no
React import, no `Editor` component, no knowledge of which UI framework (if
any) a host app renders with. Rendering and registration are what stay
pluggable: each `token-editor-*` package implements a shared `TokenTypeContract`
interface — its `Editor` component plus a `valueSchema`/`serializeValue`
imported directly from `token-core` — that a host app's registry hosts
generically, so adding a new token type's _editor_ never requires changing
the core engine or any other `token-editor-*` package. The "core engine MUST
NEVER hard-code knowledge of specific token types" rule now applies to
rendering/registration only, not to parsing: `token-core` deliberately does
know each type's value shape, but never which component renders it.
Dependency direction is one-way and enforced: `token-editor-*` packages depend
on `token-core`, never the reverse — `token-core` MUST NOT import from any
`token-editor-*` package.

Rationale: centralizing parsing/type-definitions in `token-core` gives every
consumer — the editor UI, a future CLI, a server-side validator — one
dependency-light, React-free package to import for spec-conformant parsing,
without forcing them to depend on (or bundle) any specific type's editor UI.
The contract itself must still conform to the DTCG format spec; when the
spec introduces breaking changes, `token-core`'s schemas evolve backwards-
compatibly rather than dropping support for tokens written against an
earlier spec version.

### VIII. Minimal Dependencies

Built-ins are the default, not a preference: reach for `Intl`,
`structuredClone`, native `fetch`, and similar platform APIs before
considering a library, in every package including the web app. A new
third-party dependency is added only when it is named and justified in the
feature's `plan.md` (what built-in/first-party approach was considered and
why it falls short — bundle size, correctness, maintenance burden) before
being added, not introduced ad hoc mid-implementation. A `package.json`
change without that paper trail is non-compliant regardless of how small or
popular the library is.

Rationale: "better than hand-rolling" must be demonstrated per-dependency,
not asserted; this keeps the dependency surface auditable and intentional.

### IX. Round-Trip Fidelity

`token-core`'s parse/serialize cycle MUST be semantically lossless for
anything the editor doesn't explicitly modify: parsing a token file and
re-serializing it with no edits MUST produce output with the same data as
the input — including unrecognized fields and extensions — even if
formatting, key ordering, or whitespace is normalized. The internal token
model preserves an unknown/extension bag per node rather than discarding
anything unrecognized. A round-trip test (parse → serialize → re-parse →
deep-equal against the original parse) is mandatory for every DTCG-spec
fixture file in the test suite.

Rationale: the DTCG spec permits extensions and tool-specific fields; when
the user edits one token, only that value should change semantically —
everything else, even fields with no typed internal representation, must
survive unchanged.

### X. Component Granularity & Testing

Every React component MUST be defined in its own file — a file MUST NOT
export more than one component. A component MUST have a single, nameable
purpose; if its responsibility can't be stated in one sentence, it MUST be
split into narrower components. A component SHOULD stay under 300 lines —
approaching or exceeding that is a signal to extract a subcomponent, not a
target to defend. Every component MUST have unit test coverage (Vitest +
`@testing-library/react`) verifying its rendered behavior, and MUST be
covered by this project's existing accessibility test tiers (Vitest Browser
Mode + `axe-core` at the component level; `@playwright/test` for
whole-page/keyboard flows — see Technology Stack below) — a component with
no accessibility semantics of its own still needs an explicit test asserting
that, not a silent exemption. When 3 or more components across the codebase
are structurally, stylistically, and functionally similar enough to be the
same component with different data — not merely coincidentally similar-
looking — that MUST be flagged (in the PR/task introducing the 3rd instance,
or in a dedicated cleanup task if found later) as a candidate for extraction
into a shared, reusable component contributed to `packages/design-system`,
rather than left as three independently-maintained near-duplicates.

Rationale: small, single-purpose, individually-tested components are the
concrete, component-level form of Principle II's "own cohesive unit" — a
large component doing several unrelated jobs is the same hidden layering
Principle II already prohibits between packages, just relocated inside one
file. Testing every component individually, not only at the page/
integration level, catches regressions at the smallest unit that can
meaningfully break, and keeps the two-tier accessibility testing this
project already runs applied uniformly rather than only where someone
remembered to add it. The reuse threshold is deliberately a count (3), not a
subjective judgment call, so it's flaggable in review without relying on
someone happening to remember every component that already exists;
consolidating into `design-system` — rather than a fourth copy, or a
one-off shared file wherever the third instance happens to live — keeps
reusable UI addressable from one place instead of accreting duplicate
near-identical components across `apps/web-app` and the `token-editor-*`
packages.

## Technology Stack & Approved Dependencies

- **Language**: TypeScript. **Framework**: React (UI/token-editor packages,
  web app); the core engine itself is an installable module, not a full web
  app. **Package management**: pnpm workspaces. **Build orchestration**:
  Turborepo. No database, ORM, migrations, or messaging layer.
- **Testing**: Node's built-in test runner (`node:test` + `node:assert/strict`)
  for `packages/*` (none of which render JSX). `apps/web-app` uses Vitest +
  `@testing-library/react` (`jsdom`) since `node:test` cannot execute
  `.tsx`/JSX. Accessibility testing is two-tier: a Vitest Browser Mode
  project (`@vitest/browser` + `@vitest/browser-playwright`, real Chromium)
  asserting zero `axe-core` WCAG 2.2 AA violations on components, plus a
  `@playwright/test` suite checking whole-page results and keyboard-only
  navigation on the real running app. Both are enforced (non-warn-only)
  under `pnpm test`/`turbo run test`.
- **Approved dependencies** (anything outside this list requires a flag
  before adding, per Principle VIII): TypeScript, React, Next.js
  (`apps/web-app`), ESLint + `typescript-eslint` (+ `eslint-config-next`),
  Zod, neverthrow, pnpm, Turborepo, `@commitlint/cli` +
  `@commitlint/config-conventional`, `commitizen` + `cz-customizable`,
  `husky`, `prettier` (`useTabs: true`), `vitest` (`apps/web-app` only),
  `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `colorjs.io`
  (`packages/token-core` only, imported via the tree-shakable
  `colorjs.io/fn` entry point).

## Development Workflow

- Feature work follows the pipeline defined in `CLAUDE.md`:
  `speckit-constitution` (this file) → `pick-up-task` (optional — claims
  a `docs/backlog.md` item and opens its dedicated worktree) →
  `speckit-specify` → `speckit-clarify` (optional, repeatable) →
  `speckit-checklist` (optional, repeatable) → `speckit-plan` →
  `speckit-tasks` → `speckit-analyze` (optional) → `speckit-implement` →
  `speckit-converge` (optional, repeatable) → `speckit-taskstoissues`
  (optional). `speckit-analyze` (pre-implementation cross-artifact check) and
  `speckit-converge` (post-implementation gap check against `spec.md`/
  `plan.md`/`tasks.md`) together serve as this constitution's compliance
  gates.
- This constitution (`.specify/memory/constitution.md`) is the project's
  living governance record — tech stack, approved dependencies, and
  architectural principles. Per-feature implementation detail (requirements,
  technical plan, task breakdown, decisions made along the way) lives in
  that feature's own `spec.md`/`plan.md`/`tasks.md` artifacts, not in this
  file; this constitution is authoritative for principle-level rules those
  artifacts must not contradict.
- Internal relative imports use an explicit source extension (`.ts`/`.tsx`),
  never extensionless or `.js`, so `node --test` can run test files directly
  against TypeScript source.
- Commit messages MUST follow Conventional Commits, enforced locally via a
  `commit-msg` husky hook (commitlint) and in CI via a parallel `commitlint`
  job reading the same config — both enforcement points share one config so
  they cannot drift. Feature branches are rebased onto `main`, not merged,
  per `CONTRIBUTING.md`.
- CI (GitHub Actions) runs `pnpm build`/`lint`/`test`/`format:check` via
  Turborepo on PRs into `main` and pushes to `main`. `pnpm build` is the sole
  type-checking gate; no separate `tsc --noEmit` step exists because every
  package's `build` script already fails on type errors.

## Governance

This constitution supersedes ad hoc practice for any conflict between it and
undocumented convention. Per-feature `spec.md`/`plan.md`/`tasks.md` artifacts
supply the implementation-level detail (which package does what, which
decision was made when and why) that this document deliberately does not
duplicate; where the two conflict on a principle-level rule, this
constitution governs and the feature's artifacts MUST be corrected to match.

**Amendment procedure**: a change to this file is proposed via a PR that
edits `.specify/memory/constitution.md` directly, states the version bump
and rationale in a Sync Impact Report comment at the top of the file (same
format as this ratification), and is reviewed like any other change to
project-wide governance before merging to `main`.

**Versioning policy** (semantic versioning applied to governance, not code):

- **MAJOR** — backward-incompatible principle removal or redefinition.
- **MINOR** — a new principle or materially expanded section added.
- **PATCH** — wording clarifications, typo fixes, non-semantic refinements.

**Compliance review**: `speckit-analyze` MUST be run after `speckit-tasks`
and before `speckit-implement` to catch cross-artifact drift from any Core
Principle above; `speckit-converge` MUST be run after `speckit-implement` to
verify the resulting code actually matches what `spec.md`/`plan.md`/
`tasks.md` committed to, appending corrective tasks (looped back into
`speckit-implement`) for anything unmet. A principle violation found at
either stage is a blocking finding, not an optional suggestion, unless
explicitly waived with recorded rationale in the feature's `plan.md`.

**Version**: 2.2.0 | **Ratified**: 2026-08-15 | **Last Amended**: 2026-08-16
