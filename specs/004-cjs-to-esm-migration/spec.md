# Feature Specification: CommonJS to ES Module Migration & Modern-Defaults Constitution Principle

**Feature Branch**: `004-cjs-to-esm-migration`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Refactor all CommonJS (.cjs, require/module.exports) files in the repo to ES modules, and add a constitution requirement to default to modern module syntax (ESM) over CommonJS where possible." Scope of the constitution change was later broadened: the new principle should express a general "use modern code, tools, and formats by default" rule, with the ESM-over-CommonJS case serving as one concrete example/application of it, not the rule's own subject.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Contributor reads and edits tooling scripts without switching mental models (Priority: P1)

A contributor working anywhere in the repo — application code or root-level tooling scripts (git hooks, commit-message linting, formatting helpers) — encounters only one module syntax (`import`/`export`) throughout, instead of switching between ESM in application code and CommonJS (`require`/`module.exports`) in root tooling scripts.

**Why this priority**: This is the core value of the migration — a single, consistent syntax lowers cognitive load and removes a recurring source of copy-paste errors (e.g. pasting a `require()` into an ESM file or vice versa).

**Independent Test**: Can be fully tested by opening each of the repo's current `.cjs` files (`.cz-config.cjs`, `commitlint.config.cjs`, `commit-conventions.cjs`, `commit-conventions.test.cjs`, `format-staged.cjs`, `format-staged.test.cjs`) and confirming each uses `import`/`export` syntax with no remaining `require()` or `module.exports` calls, and delivers value by letting a contributor rely on one syntax convention repo-wide.

**Acceptance Scenarios**:

1. **Given** a contributor opens any of the repo's current `.cjs` tooling scripts, **When** they read the file, **Then** they see ESM `import`/`export` syntax, not `require()`/`module.exports`.
2. **Given** the pre-commit hook (`format-staged`), the commit-message linter (`commitlint`), and the commitizen prompt (`.cz-config`) are invoked as part of the normal commit workflow, **When** a contributor stages and commits a change, **Then** every one of these tools runs successfully with no behavior change from before the migration.

---

### User Story 2 - Future contributor is steered toward modern choices without needing to be told (Priority: P2)

A contributor (human or AI agent) making a choice of code style, tool, or file format in the future — module syntax being one instance of this, alongside others such as picking a config format, a CLI tool, or a language feature — consults the project constitution (or has it enforced during review) and defaults to the modern, currently-recommended option rather than a legacy one, without needing a teammate to point this out in review.

**Why this priority**: Migrating the existing CommonJS files fixes today's concrete inconsistency; without a durable, general-purpose rule the repo will keep accumulating legacy-by-default choices every time someone reaches for a new tool or format, since precedent and habit — not necessity — currently drive those choices. A rule scoped narrowly to ESM/CommonJS would fix this one recurrence but leave the same drift free to happen with the next legacy-vs-modern choice.

**Independent Test**: Can be fully tested by reading `.specify/memory/constitution.md` and confirming it states a clear, general "use modern code, tools, and formats by default" principle — independent of whether any code has been migrated yet — and that the ESM-over-CommonJS case is present as a concrete example of the principle, not as the principle's own scope.

**Acceptance Scenarios**:

1. **Given** the amended constitution, **When** a contributor or reviewer faces a choice between a modern and a legacy option for code, a tool, or a file format, **Then** they find a general principle stating modern defaults are required unless a named exception applies.
2. **Given** the ESM-vs-CommonJS choice specifically, **When** a contributor reads the constitution, **Then** they find it referenced as a concrete example of the general principle (not a standalone module-syntax rule), so the same reasoning obviously extends to analogous future choices.
3. **Given** a tool or dependency that only supports a legacy format or approach (a legitimate exception, e.g. CommonJS-only tooling), **When** a contributor consults the constitution, **Then** the rule tells them how to handle that case (name the exception explicitly, note why the legacy choice was unavoidable) rather than leaving them to guess.

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
- **FR-003**: The project constitution (`.specify/memory/constitution.md`) MUST be amended with a general principle stating that code, tools, and file formats default to the modern, currently-recommended choice over a legacy one, following the constitution's existing amendment process (versioned, with a Sync Impact Report).
- **FR-004**: The constitution amendment MUST include the ESM-over-CommonJS module syntax rule as a concrete, explicitly-named example illustrating the general principle from FR-003 — the amendment's scope MUST NOT be limited to module syntax alone.
- **FR-005**: The constitution amendment MUST state that legitimate, unavoidable exceptions (a tool or dependency that only accepts a legacy format or approach — e.g., CommonJS-only configuration) must be called out explicitly (e.g., a comment noting why the legacy choice was unavoidable) rather than left ambiguous, and this exception-handling rule MUST apply to the general principle, not only to the module-syntax example.
- **FR-006**: The migration of the six identified `.cjs` files MUST NOT change the observable behavior of any migrated script (its exit codes, output, or side effects), other than the module syntax itself.
- **FR-007**: Where a `.cjs` file is renamed as part of migration (e.g. to `.js` or `.mjs`), all references to its old filename (Husky hook scripts, `package.json` fields such as `commitlint.config` or `config.commitizen.path`, import paths in other files) MUST be updated to match.

### Key Entities

- **Root-level tooling script**: A repo-authored `.cjs` file living outside `apps/`/`packages/` that supports the development workflow (git hooks, commit linting, commit message prompts, code formatting-on-commit) rather than shipping as part of an application or package.
- **Constitution principle**: A versioned rule in `.specify/memory/constitution.md` stating a general preference for modern code, tools, and formats over legacy ones, subject to the constitution's own amendment/versioning process. The ESM-over-CommonJS rule is one named example under this principle, not the principle itself.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero `require()` calls or `module.exports`/`exports.*` assignments remain in project-authored files in the repository (excluding third-party/vendored/generated files).
- **SC-002**: 100% of the identified tooling workflows (pre-commit formatting, commit message linting, commitizen prompt, and each script's own test suite) pass after migration, with the same results as before migration.
- **SC-003**: The constitution contains an explicit, unambiguous "modern by default" principle — with the ESM-over-CommonJS case named as one example — that a contributor can locate and apply without asking a teammate, verified by a reviewer being able to answer both "what module syntax should this new file use, and why" and "how should I decide between a modern and legacy option for an unrelated tool/format choice" using only the constitution text.
- **SC-004**: Any future addition of a CommonJS file to the repo, or any other legacy-over-modern choice the constitution's principle covers (outside a named exception), is identifiable as a constitution violation by inspection, without requiring new tooling to be built as part of this feature.

## Assumptions

- Scope is limited to files the project authors and currently controls — the six `.cjs` files identified at spec time (`.cz-config.cjs`, `commitlint.config.cjs`, `commit-conventions.cjs`, `commit-conventions.test.cjs`, `format-staged.cjs`, `format-staged.test.cjs`) — plus the constitution amendment. No `require()` usage was found elsewhere in the repo's `.js`/`.ts` files at spec time.
- "Where possible" (from the feature description) means: ESM is the default and required for all project-authored code; CommonJS remains acceptable only where a specific, named third-party tool or Node/runtime constraint leaves no ESM-compatible alternative. This is the concrete instance of the broader constitution principle (FR-003): the general rule is "default to modern code, tools, and formats," and ESM-over-CommonJS is the worked example that motivated it, not the rule's boundary. The constitution amendment itself is written at the general level; enumerating every other legacy-vs-modern choice the principle could apply to is out of scope for this feature.
- Root `package.json` currently has no `"type"` field (Node's implicit default: `.js` files are CommonJS, `.mjs` is ESM, `.cjs` is always CommonJS). This spec does not itself decide whether the root `package.json` gains `"type": "module"` or whether migrated files are renamed to `.mjs` while remaining `.js` — that mechanism is a planning-time decision, not a specification-time one, as long as the end state satisfies FR-001–FR-002 and FR-006–FR-007.
- This migration only concerns root-level tooling scripts; application and package source under `apps/` and `packages/` is not known to contain CommonJS today and is out of scope unless a future audit finds otherwise.
