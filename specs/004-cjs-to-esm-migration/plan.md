# Implementation Plan: CommonJS to ES Module Migration & Modern-Defaults Constitution Principle

**Branch**: `004-cjs-to-esm-migration` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-cjs-to-esm-migration/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Migrate the repo's root-level CommonJS tooling scripts to ES modules (or plain
JSON, where a file is pure data) where the consuming tool actually supports it, and
add a new "Modern Defaults" constitution principle (code/tools/formats default to
the modern choice, with ESM-over-CommonJS as the named example) so future
contributions don't drift back. Research (`research.md`) initially found that
`cz-customizable` loads its config via a synchronous, ESM-incapable `require()`,
forcing `.cz-config.cjs`/`commit-conventions.cjs` into a named CommonJS exception —
but tracing *why* `cz-customizable` was chosen in the first place (it exists only to
share a type/scope list with commitlint via a `require()`-able config) led to a
better fix: replacing it with `@commitlint/cz-commitlint` (FR-008), which reads
commitizen prompts directly from commitlint's own config, eliminating
`.cz-config.cjs` entirely rather than accepting an exception for it. With that
adapter gone, `commit-conventions.cjs` becomes plain `commit-conventions.json`
(pure data, imported directly by `commitlint.config.mjs`), and every other file
(`commitlint.config.cjs`, `format-staged.cjs`, `format-staged.test.cjs`,
`commit-conventions.test.cjs`) migrates fully to `.mjs` — no CommonJS exception
remains anywhere in this feature. Every consuming script/hook/package.json
reference is updated to match (FR-007).

## Technical Context

**Language/Version**: JavaScript (Node.js, `engines.node` = `>=26.5.0` per root `package.json`)

**Primary Dependencies**: `husky` (git hooks), `@commitlint/cli` + `@commitlint/config-conventional` (commit-message linting), `commitizen` + `@commitlint/cz-commitlint` (interactive commit CLI, replacing `cz-customizable` — FR-008/research.md) + `inquirer` (its peer dependency), `@biomejs/biome` (lint/format)

**Storage**: N/A

**Testing**: Node's built-in test runner (`node --test`), invoked via `pnpm test:commits` / `pnpm test:format-staged`

**Target Platform**: Local developer machines + CI, wherever `pnpm` git hooks and commit tooling run

**Project Type**: Monorepo root-level tooling/config (not an application feature) — single-project structure, no frontend/backend split

**Performance Goals**: N/A (one-time migration of dev-tooling scripts; no runtime performance surface)

**Constraints**: Zero observable behavior change in any migrated script or the interactive commit prompt's allowed types/scopes (FR-002, FR-006), despite the underlying commitizen adapter changing (FR-008)

**Scale/Scope**: 5 remaining root-level files (`.cz-config.cjs` deleted) + 1 constitution amendment + 1 devDependency swap (`cz-customizable` → `@commitlint/cz-commitlint` + `inquirer`); no application code (`apps/`, `packages/`) is known to contain CommonJS today (see spec Assumptions)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Checked against the 10 existing Core Principles in `.specify/memory/constitution.md`
(v2.3.0). None govern module syntax today — this feature adds the 11th principle
that will. No existing principle is in tension with this feature:

- **III. TypeScript Strictness**: Unaffected — no `.ts` files touched (all files
  involved are plain `.js`/`.cjs`/`.mjs`/`.json`).
- **VIII. Minimal Dependencies**: One net-neutral swap — `cz-customizable` is
  removed, `@commitlint/cz-commitlint` + its `inquirer` peer dependency are added
  (FR-008/research.md), replacing rather than growing the dependency surface. The
  swap directly serves this principle's spirit: it removes a config file whose only
  purpose was avoiding drift between two hand-maintained lists, rather than adding
  tooling for a new concern.
- **V. Result-Pattern Error Handling / VI. Dependency Injection**: Unaffected — these
  govern application code (`apps/`, `packages/`); the migrated files are dev-tooling
  scripts outside that scope, and `format-staged.cjs` already uses injected `exec`
  per its own file header, which the migration preserves as-is (FR-006).
- **X. Component Granularity & Testing**: N/A — no React components involved.

No gate failures. No entries needed in Complexity Tracking.

**Post-Phase-1 re-check**: `research.md` and `data-model.md` confirm the plan stays
within a single, self-consistent mechanism (`.mjs`/`.json` renames, no root
`"type"` field change) and, after the `@commitlint/cz-commitlint` swap, needs no
CommonJS exception at all (FR-005's clause is defined but currently unused — fine,
it's a standing rule for future cases, not a requirement that one exist now). Still
no conflicts with existing principles; proceeding to `/speckit-tasks` is clear.

## Project Structure

### Documentation (this feature)

```text
specs/004-cjs-to-esm-migration/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature exposes no API, CLI surface, or UI
contract of its own — it rewrites internal dev-tooling scripts and amends a
governance document. Nothing external consumes these files as a contract; the
"contract" that matters (each tool's config-loading behavior) is captured in
`research.md`'s consuming-tool inventory instead.

### Source Code (repository root)

```text
/                                    # repo root — all files already live here
├── .cz-config.cjs                   # DELETED — cz-customizable replaced by @commitlint/cz-commitlint
├── commit-conventions.cjs           # → commit-conventions.json (plain data)
├── commitlint.config.cjs            # → commitlint.config.mjs (imports commit-conventions.json)
├── commit-conventions.test.cjs      # → commit-conventions.test.mjs
├── format-staged.cjs                # → format-staged.mjs
├── format-staged.test.cjs           # → format-staged.test.mjs
├── package.json                     # scripts (test:commits, test:format-staged, lint:root),
│                                     # config.commitizen.path, and devDependencies updated
├── .husky/
│   └── prepare-commit-msg           # `node format-staged.cjs` → `node format-staged.mjs`
└── .specify/memory/constitution.md  # new Core Principle: Modern Defaults (versioned amendment)
```

**Structure Decision**: Single-project, root-level-only change — no `src/`,
`backend/`/`frontend/`, or mobile structure applies. All files already live flat
at the repo root (not inside `apps/` or `packages/`), and stay there (or are
deleted, for `.cz-config.cjs`); this feature only changes their extension/syntax,
the handful of `package.json`/`.husky` references that name them by filename, the
`commitizen` adapter dependency, and one new section in the constitution.

## Complexity Tracking

No Constitution Check violations — this section is not applicable.
