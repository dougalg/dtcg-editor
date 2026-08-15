<!--
Sync Impact Report
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
is retained (sdd-pick-up-task has no speckit equivalent); sdd-init is retired
outright rather than mapped to a speckit command, since speckit-constitution
now plays that "establish project context" role and docs/project.md is no
longer generated or maintained by any step in the pipeline.
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

Code is organised by feature/domain, not by technical layer. A token-type
package owns its own components, validation, and logic together rather than
being split across shared `components/`, `services/`, `validators/`
directories. Tests live alongside the code they test (`parse.ts` +
`parse.test.ts` in the same directory), not in a separate `test/` tree.

Rationale: this mirrors the plugin/microkernel shape of the Token-Type Package
Contract (Principle VII) — the code-organization boundary matches the plugin
boundary, so adding or removing a token type stays a single-directory
operation. A test is part of the feature bundle it verifies; a separate
`test/` tree would reintroduce the layer split this principle exists to avoid.

### III. TypeScript Strictness

All packages MUST compile under maximally strict TypeScript settings, with no
per-package relaxation — whether the package is publishable (core engine,
token-type packages) or internal (web app). Root `tsconfig.base.json` enables
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

Rationale: a token-type package receiving a `TokenValue` from the core engine
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

### VII. Token-Type Package Contract

The core engine MUST NEVER hard-code knowledge of specific token types
(color, dimension, etc.). Every token-type package implements a shared
interface (`validate`, `serialize`, `render`, etc.) that the core engine
hosts generically, so adding a new token type never requires changing the
core engine. Parsing and typing raw DTCG JSON into the validated token model
lives in its own package (`token-core`), completely agnostic of UI/app
tooling (no React import), separate from the pluggable contract definition
and from the token-type packages that implement it.

Rationale: the contract itself must conform to the DTCG format spec; when
the spec introduces breaking changes, the contract evolves backwards-
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

## Technology Stack & Approved Dependencies

- **Language**: TypeScript. **Framework**: React (UI/token-type packages,
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
  (`packages/token-type-color` only, imported via the tree-shakable
  `colorjs.io/fn` entry point).

## Development Workflow

- Feature work follows the pipeline defined in `CLAUDE.md`:
  `speckit-constitution` (this file) → `sdd-pick-up-task` (optional — claims
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

**Version**: 1.1.0 | **Ratified**: 2026-08-15 | **Last Amended**: 2026-08-15
