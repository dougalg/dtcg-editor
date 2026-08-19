# Implementation Plan: CommonJS to ES Module Migration & Modern-Defaults Constitution Principle

**Branch**: `004-cjs-to-esm-migration` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-cjs-to-esm-migration/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Migrate the repo's six root-level CommonJS tooling scripts to ES modules where the
consuming tool actually supports it, and add a new "Modern Defaults" constitution
principle (code/tools/formats default to the modern choice, with ESM-over-CommonJS
as the named example) so future contributions don't drift back. Research
(`research.md`) found that `cz-customizable` loads its config via a synchronous,
ESM-incapable `require()`, so `.cz-config.cjs` and the `commit-conventions.cjs`
module it requires stay CommonJS as a named exception (FR-005); the other four
files (`commitlint.config.cjs`, `format-staged.cjs`, `format-staged.test.cjs`,
`commit-conventions.test.cjs`) migrate fully to `.mjs`, with every consuming
script/hook reference updated to match (FR-007).

## Technical Context

**Language/Version**: JavaScript (Node.js, `engines.node` = `>=26.5.0` per root `package.json`)

**Primary Dependencies**: `husky` (git hooks), `@commitlint/cli` + `@commitlint/config-conventional` (commit-message linting), `commitizen` + `cz-customizable` (interactive commit CLI), `@biomejs/biome` (lint/format)

**Storage**: N/A

**Testing**: Node's built-in test runner (`node --test`), invoked via `pnpm test:commits` / `pnpm test:format-staged`

**Target Platform**: Local developer machines + CI, wherever `pnpm` git hooks and commit tooling run

**Project Type**: Monorepo root-level tooling/config (not an application feature) — single-project structure, no frontend/backend split

**Performance Goals**: N/A (one-time migration of dev-tooling scripts; no runtime performance surface)

**Constraints**: Zero observable behavior change in any migrated script (FR-002, FR-006); `.cz-config.cjs`/`commit-conventions.cjs` must remain synchronously `require()`-able by `cz-customizable` (research.md)

**Scale/Scope**: 6 root-level files + 1 constitution amendment; no application code (`apps/`, `packages/`) is known to contain CommonJS today (see spec Assumptions)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Checked against the 10 existing Core Principles in `.specify/memory/constitution.md`
(v2.3.0). None govern module syntax today — this feature adds the 11th principle
that will. No existing principle is in tension with this feature:

- **III. TypeScript Strictness / VIII. Minimal Dependencies**: Unaffected — no new
  dependencies added, no `.ts` files touched (all six files are plain `.js`/`.cjs`).
- **V. Result-Pattern Error Handling / VI. Dependency Injection**: Unaffected — these
  govern application code (`apps/`, `packages/`); the migrated files are dev-tooling
  scripts outside that scope, and `format-staged.cjs` already uses injected `exec`
  per its own file header, which the migration preserves as-is (FR-006).
- **X. Component Granularity & Testing**: N/A — no React components involved.

No gate failures. No entries needed in Complexity Tracking.

**Post-Phase-1 re-check**: `research.md` and `data-model.md` confirm the plan stays
within a single, self-consistent mechanism (`.mjs` renames, no root `"type"` field
change) and names the one unavoidable exception explicitly (FR-005). Still no
conflicts with existing principles; proceeding to `/speckit-tasks` is clear.

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
/                                    # repo root — all six files already live here
├── .cz-config.cjs                   # stays CommonJS (named exception, research.md)
├── commit-conventions.cjs           # stays CommonJS (required by .cz-config.cjs)
├── commitlint.config.cjs            # → commitlint.config.mjs
├── commit-conventions.test.cjs      # → commit-conventions.test.mjs
├── format-staged.cjs                # → format-staged.mjs
├── format-staged.test.cjs           # → format-staged.test.mjs
├── package.json                     # scripts (test:commits, test:format-staged, lint:root) updated to new filenames
├── .husky/
│   └── prepare-commit-msg           # `node format-staged.cjs` → `node format-staged.mjs`
└── .specify/memory/constitution.md  # new Core Principle: Modern Defaults (versioned amendment)
```

**Structure Decision**: Single-project, root-level-only change — no `src/`,
`backend/`/`frontend/`, or mobile structure applies. All six files already live
flat at the repo root (not inside `apps/` or `packages/`), and stay there;
this feature only changes their extension/syntax and the handful of
`package.json`/`.husky` references that name them by filename, plus one new
section in the constitution.

## Complexity Tracking

No Constitution Check violations — this section is not applicable.
