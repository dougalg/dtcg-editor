# Feature Specification: CommonJS to ES Module Migration

**Feature Branch**: `004-cjs-to-esm-migration`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Refactor all CommonJS (.cjs, require/module.exports) files in the repo to ES modules, and add a constitution requirement to default to modern module syntax (ESM) over CommonJS where possible."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Contributor reads and edits tooling scripts without switching mental models (Priority: P1)

A contributor working anywhere in the repo — application code or root-level tooling scripts (git hooks, commit-message linting, formatting helpers) — encounters only one module syntax (`import`/`export`) throughout, instead of switching between ESM in application code and CommonJS (`require`/`module.exports`) in root tooling scripts.

**Why this priority**: This is the core value of the migration — a single, consistent syntax lowers cognitive load and removes a recurring source of copy-paste errors (e.g. pasting a `require()` into an ESM file or vice versa).

**Independent Test**: Can be fully tested by opening each of the repo's current `.cjs` files (`.cz-config.cjs`, `commitlint.config.cjs`, `commit-conventions.cjs`, `commit-conventions.test.cjs`, `format-staged.cjs`, `format-staged.test.cjs`) and confirming each uses `import`/`export` syntax with no remaining `require()` or `module.exports` calls, and delivers value by letting a contributor rely on one syntax convention repo-wide.

**Acceptance Scenarios**:

1. **Given** a contributor opens any of the repo's current `.cjs` tooling scripts, **When** they read the file, **Then** they see ESM `import`/`export` syntax, not `require()`/`module.exports`.
2. **Given** the pre-commit hook (`format-staged`), the commit-message linter (`commitlint`), and the commitizen prompt (`.cz-config`) are invoked as part of the normal commit workflow, **When** a contributor stages and commits a change, **Then** every one of these tools runs successfully with no behavior change from before the migration.

---

### User Story 2 - Future contributor is steered toward ESM without needing to be told (Priority: P2)

A contributor (human or AI agent) adding a new root-level script or config file in the future consults the project constitution (or has it enforced during review) and defaults to ESM syntax rather than CommonJS, without needing a teammate to point this out in review.

**Why this priority**: Migrating existing files fixes the current inconsistency; without a durable, documented rule the repo will drift back toward mixed syntax the next time someone adds a root-level script, since root tooling scripts today default to CommonJS out of habit/precedent, not necessity.

**Independent Test**: Can be fully tested by reading `.specify/memory/constitution.md` and confirming it states a clear, unambiguous preference for ESM over CommonJS, with any legitimate exceptions named explicitly — independent of whether any code has been migrated yet.

**Acceptance Scenarios**:

1. **Given** the amended constitution, **When** a contributor or reviewer checks it while adding a new script or config file, **Then** they find an explicit rule that new files must use ESM syntax unless a named exception applies.
2. **Given** a tool or dependency that only supports CommonJS configuration (a legitimate exception), **When** a contributor consults the constitution, **Then** the rule tells them how to handle that case (e.g., name the exception, note it must stay CommonJS) rather than leaving them to guess.

---

### Edge Cases

- What happens when a third-party tool (e.g. a linter, formatter, or Node module loader) only recognizes its config file in CommonJS format, or under a specific filename/extension it expects? → Migration must confirm before renaming/rewriting that ESM is actually supported for each of the six files, since forcing an unsupported format breaks the tool.
- How does the migration handle Node's dual module resolution (`.cjs` always CommonJS, `.mjs` always ESM, `.js` follows the nearest `package.json` `"type"` field)? Renaming a `.cjs` file to `.js`/`.mjs` — or adding `"type": "module"` to the root `package.json` — changes how every other root-level `.js` file in the repo is interpreted, not just the file being migrated.
- What happens to the existing `.test.cjs` files if the test runner or its config expects a specific extension?
- How should the constitution rule apply to files inside `node_modules`-adjacent generated output, or vendored files the project doesn't author itself? (Out of scope — the rule governs code the project authors, not third-party or generated files.)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All CommonJS files currently in the repository (`.cz-config.cjs`, `commitlint.config.cjs`, `commit-conventions.cjs`, `commit-conventions.test.cjs`, `format-staged.cjs`, `format-staged.test.cjs`) MUST be rewritten to use ES module syntax (`import`/`export`), with no remaining `require()` calls or `module.exports`/`exports.*` assignments in project-authored code.
- **FR-002**: Every tool or process that currently consumes one of these files (the Husky pre-commit hook, `commitlint`, `commitizen`, and each file's own test suite) MUST continue to function correctly after migration, with no observable change in behavior.
- **FR-003**: The project constitution (`.specify/memory/constitution.md`) MUST be amended to state that new code defaults to ES module syntax over CommonJS, following the constitution's existing amendment process (versioned, with a Sync Impact Report).
- **FR-004**: The constitution amendment MUST name any legitimate, unavoidable exceptions (a tool or dependency that only accepts CommonJS configuration) and state that such exceptions must be called out explicitly (e.g., a comment noting why the file cannot be ESM) rather than left ambiguous.
- **FR-005**: The migration MUST NOT change the observable behavior of any migrated script (its exit codes, output, or side effects), other than the module syntax itself.
- **FR-006**: Where a `.cjs` file is renamed as part of migration (e.g. to `.js` or `.mjs`), all references to its old filename (Husky hook scripts, `package.json` fields such as `commitlint.config` or `config.commitizen.path`, import paths in other files) MUST be updated to match.

### Key Entities

- **Root-level tooling script**: A repo-authored `.cjs` file living outside `apps/`/`packages/` that supports the development workflow (git hooks, commit linting, commit message prompts, code formatting-on-commit) rather than shipping as part of an application or package.
- **Constitution principle**: A versioned rule in `.specify/memory/constitution.md` governing module syntax, subject to the constitution's own amendment/versioning process.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero `require()` calls or `module.exports`/`exports.*` assignments remain in project-authored files in the repository (excluding third-party/vendored/generated files).
- **SC-002**: 100% of the identified tooling workflows (pre-commit formatting, commit message linting, commitizen prompt, and each script's own test suite) pass after migration, with the same results as before migration.
- **SC-003**: The constitution contains an explicit, unambiguous ESM-over-CommonJS rule that a contributor can locate and apply without asking a teammate, verified by a reviewer being able to answer "what module syntax should this new file use, and why" using only the constitution text.
- **SC-004**: Any future addition of a CommonJS file to the repo (outside a named exception) is identifiable as a constitution violation by inspection, without requiring new tooling to be built as part of this feature.

## Assumptions

- Scope is limited to files the project authors and currently controls — the six `.cjs` files identified at spec time (`.cz-config.cjs`, `commitlint.config.cjs`, `commit-conventions.cjs`, `commit-conventions.test.cjs`, `format-staged.cjs`, `format-staged.test.cjs`) — plus the constitution amendment. No `require()` usage was found elsewhere in the repo's `.js`/`.ts` files at spec time.
- "Where possible" (from the feature description) means: ESM is the default and required for all project-authored code; CommonJS remains acceptable only where a specific, named third-party tool or Node/runtime constraint leaves no ESM-compatible alternative.
- Root `package.json` currently has no `"type"` field (Node's implicit default: `.js` files are CommonJS, `.mjs` is ESM, `.cjs` is always CommonJS). This spec does not itself decide whether the root `package.json` gains `"type": "module"` or whether migrated files are renamed to `.mjs` while remaining `.js` — that mechanism is a planning-time decision, not a specification-time one, as long as the end state satisfies FR-001–FR-006.
- This migration only concerns root-level tooling scripts; application and package source under `apps/` and `packages/` is not known to contain CommonJS today and is out of scope unless a future audit finds otherwise.
