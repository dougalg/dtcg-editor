# Feature Specification: React Component File & Folder Linting

**Feature Branch**: `worktree-react-component-file-lint`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "linting for react component filenames and folder organization. I want all react components to use PascalCase, and they should always be in a folder together with their tests, css etc."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Catch naming/placement violations automatically (Priority: P1)

A contributor adds or renames a React component file. If the file is not PascalCase, or is not placed inside its own dedicated component folder, the lint check fails with a clear, actionable message before the change can be merged.

**Why this priority**: This is the enforcement mechanism the feature exists to deliver — without it, the convention is just a suggestion that will drift immediately.

**Independent Test**: Can be fully tested by adding a component file named `saveButton.tsx` (wrong case) or by adding a correctly-named component file directly in a shared components directory (wrong placement) and confirming the lint run fails with a message identifying the specific file and rule broken.

**Acceptance Scenarios**:

1. **Given** a new React component file named in camelCase or kebab-case, **When** the lint check runs, **Then** it fails and reports the file as violating the PascalCase naming rule.
2. **Given** a new, correctly PascalCase-named React component file placed directly in a shared directory (not inside its own folder), **When** the lint check runs, **Then** it fails and reports the file as violating the folder-placement rule.
3. **Given** a React component file that is PascalCase-named and lives inside a folder dedicated to that component, **When** the lint check runs, **Then** it passes with no violation reported for that file.

---

### User Story 2 - Find a component's tests and styles without searching (Priority: P2)

A contributor opens a component's folder and finds its test file(s) and style file(s) (e.g., CSS module) sitting alongside the component file, rather than having to search a separate flat directory or parallel test tree.

**Why this priority**: This is the organizational payoff of the convention — it only delivers value once components are actually co-located, not just correctly named.

**Independent Test**: Can be fully tested by opening any in-scope component's folder and confirming its test and style files are present in that same folder, with no component-specific test or style file left outside it.

**Acceptance Scenarios**:

1. **Given** a component folder, **When** a contributor lists its contents, **Then** the component's own test file(s) and style file(s) are present in that folder.
2. **Given** a component folder that also contains non-component support files scoped to that component (e.g., a component-local hook or type file), **When** the lint check runs, **Then** those support files do not trigger a naming or placement violation themselves.

---

### User Story 3 - One documented convention to point contributors to (Priority: P3)

A maintainer reviewing a PR, or a new contributor setting up a component for the first time, can consult a single documented description of the expected file/folder structure instead of inferring it from examples.

**Why this priority**: Reduces review friction and onboarding time, but the convention still has value (via enforcement and co-location) even before it is written down anywhere beyond the lint rule itself.

**Independent Test**: Can be fully tested by having a new contributor read the documented convention and correctly create a new, compliant component folder without additional guidance.

**Acceptance Scenarios**:

1. **Given** the documented convention, **When** a contributor creates a new component from scratch, **Then** the result passes the lint check on the first attempt without needing review feedback on file naming or placement.

---

### User Story 4 - Enforce existing naming conventions for hooks and lib utility files (Priority: P2)

A contributor adds a file under `apps/web-app/hooks/` or `apps/web-app/lib/` that doesn't match the naming convention already consistently followed there (camelCase for hooks, matching the existing `useSaveTokenEdits.ts`; kebab-case for lib files, matching the existing `fatal-startup-error.ts`). The lint check fails with a clear, actionable message.

**Why this priority**: These are pre-existing, already-consistent conventions in the codebase today (every current file in both directories already complies) — this closes the same "unenforced convention will eventually drift" gap the component rules (User Story 1) close, for two more directories, at the same time this feature is already touching filename linting.

**Independent Test**: Can be fully tested by adding a file named `MyHelper.ts` (PascalCase) under `apps/web-app/lib/` and confirming the lint run fails, and a file named `use-thing.ts` (kebab-case) under `apps/web-app/hooks/` and confirming it fails, then confirming correctly-cased files in each location pass.

**Acceptance Scenarios**:

1. **Given** a file under `apps/web-app/hooks/` whose name is not camelCase, **When** the lint check runs, **Then** it fails and reports the file as violating the hooks naming rule.
2. **Given** a file under `apps/web-app/lib/` (at any depth) whose name is not kebab-case, **When** the lint check runs, **Then** it fails and reports the file as violating the lib naming rule.
3. **Given** the existing files in both directories today, **When** the lint check runs, **Then** it passes with no violations — no migration is needed for this rule, since every existing file already conforms.

---

### Edge Cases

- A component file is the sole file in its folder (no test or style file yet, e.g. a brand-new component) — placement rule must still pass; co-location is only required for files that exist, not files that must exist.
- A folder contains a barrel/re-export file (e.g. `index.ts`) alongside the PascalCase component file — the barrel file must not itself be flagged as a second, incorrectly-named component file.
- A `.ts`/`.tsx` file exports something other than a component (a hook, a utility, a type, a constant) — it must not be misidentified as a component subject to the PascalCase/folder rule.
- Test files use varying suffixes already present in the codebase (`.test.tsx`, `.a11y.test.tsx`, `.generic-editor.test.tsx`, `.override.test.tsx` — `TokenTree` alone has four) — all must be recognized as belonging to their component and excluded from both the PascalCase rule and any per-folder "one component file" count, not flagged as unrelated stray files or counted as extra component files.
- A component folder legitimately contains more than one `.tsx`-suffixed file once test files are counted (e.g. `TokenTree.tsx` plus its four test variants) — this must not be misread as "more than one component file per folder."
- A component folder name and its component file's base name diverge (e.g. `Button/button.tsx` or `save-button/SaveButton.tsx`) — this must be flagged as a violation even though the `.tsx` file itself is present and PascalCase.
- A Next.js App Router special file (`page.tsx`, `layout.tsx`, `route.ts`, etc.) sits flat in `apps/web-app/app/` — it must be excluded from both the naming and folder-placement rules rather than flagged or migrated.
- A migrated component is imported elsewhere in the repo, or referenced by a generated artifact (e.g. the sugarcube design-system generator, a package's public entry point/barrel export) — those references must be updated so nothing breaks after the rename/move.
- A file under `apps/web-app/lib/` sits in a nested subdirectory (e.g. `lib/token-editors/resolve-editor.ts`, `lib/tokens/edit-state.ts`) — the kebab-case naming rule (User Story 4) must apply at any depth under `lib/`, not just top-level files.
- A test file under `apps/web-app/hooks/` or `apps/web-app/lib/` (e.g. `useSaveTokenEdits.test.tsx`, `fatal-startup-error.test.ts`) — must be evaluated against the same naming rule as its non-test sibling (camelCase for hooks, kebab-case for lib), not exempted or held to a different standard.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The lint check MUST flag any React component file whose filename is not PascalCase (e.g., `saveButton.tsx`, `save-button.tsx`) as a violation.
- **FR-002**: The lint check MUST flag any React component file that is not located inside a folder dedicated to that component — including component files placed directly in a shared/flat directory — as a violation.
- **FR-003**: The lint check MUST flag a component folder whose name does not match its component file's PascalCase base name.
- **FR-004**: The lint check MUST NOT flag a component's co-located test file(s) or style file(s) (e.g., CSS modules) sitting in the same folder as the component.
- **FR-005**: The lint check MUST NOT flag non-component files (hooks, utilities, types, constants, barrel/re-export files) that live inside a component's folder, as long as they are not themselves component files.
- **FR-006**: The lint check MUST run as part of the project's existing lint pipeline under the single `pnpm lint` command, not as a separate manually-run step or a second command a contributor/CI job must remember to invoke. Since the filename/folder rules (FR-001–FR-003) are outside what the project's existing single-file linter (Biome) can see, the check MUST run as a separate program wired into the project's build orchestrator (Turborepo) as a task that runs in parallel alongside the other `pnpm lint` work, not serially appended after it, so it does not add to the wall-clock time of `pnpm lint` beyond the slowest task already running.
- **FR-007**: The lint check MUST report an actionable error message per violation, identifying the offending file/folder and which specific rule (naming vs. folder placement vs. folder-name mismatch) was broken.
- **FR-008**: The expected file/folder convention MUST be documented in a location contributors and future lint-rule maintainers can find (e.g. the project constitution or a contributing guide).
- **FR-009**: The lint check's scope MUST cover all React component files repo-wide, including `apps/web-app/components/` and every `packages/*/src/components/` directory — confirmed to be `packages/design-system/src/components/`, `packages/token-editor-color/src/components/`, and `packages/token-editor-dimension/src/components/` as of this feature (a future new `packages/*/src/components/` directory is automatically in scope without a lint-config change, since the rule is expressed generically over the `packages/*/src/components` pattern, not enumerated per package).
- **FR-010**: The lint check MUST exclude Next.js's framework-reserved files (e.g. `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `template.tsx`, `default.tsx`, `route.ts`) from the PascalCase and folder-placement rules, since their filenames and flat placement within `apps/web-app/app/` are dictated by the Next.js App Router, not by this convention.
- **FR-011**: All existing React component files within scope MUST be migrated to comply — renamed to PascalCase and moved into a dedicated folder alongside their co-located tests/styles — as part of delivering this feature, with all internal imports, package `exports` maps, build scripts, and any generated/derived references (e.g. the sugarcube token/component generator) updated to match. This covers: `apps/web-app/components/*` (flat → per-component folders), `packages/design-system/src/components/ui/*` (lowercase → PascalCase, and denested — `packages/design-system/src/components/ui/<name>/` becomes `packages/design-system/src/components/<Name>/`, since the two-level `ui/` nesting existed only to group components and duplicating it in every location's rule provided no additional value once every location follows the same convention), and `packages/token-editor-color/src/components/*` / `packages/token-editor-dimension/src/components/*` (generic lowercase filenames like `editor.tsx` → the exported component's PascalCase name, e.g. `ColorEditor.tsx`, `DimensionEditor.tsx`, each in its own folder).
- **FR-012**: After migration, the lint check MUST pass with zero violations across the full repository, with no files grandfathered or exempted other than the Next.js reserved files covered by FR-010.
- **FR-013**: The lint check MUST flag any file under `apps/web-app/hooks/` whose filename is not camelCase, matching the convention already established by the existing `useSaveTokenEdits.ts`.
- **FR-014**: The lint check MUST flag any file under `apps/web-app/lib/` (at any nesting depth) whose filename is not kebab-case, matching the convention already established by existing files (e.g. `fatal-startup-error.ts`, `color-validation-error-handler.test.tsx`).
- **FR-015**: The hooks and lib naming rules (FR-013, FR-014) MUST NOT require folder-per-file placement — unlike the component rules (FR-002/FR-003), files in `apps/web-app/hooks/` and `apps/web-app/lib/` are not restructured into one-folder-per-file; only their naming casing is enforced.
- **FR-016**: The hooks and lib naming rules MUST apply to test files in those directories the same as their non-test siblings (no separate exemption), and MUST NOT apply to any directory other than `apps/web-app/hooks/` and `apps/web-app/lib/`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A misnamed or misplaced component file introduced in a change is caught automatically by the lint pipeline, with zero manual reviewer effort needed to spot the naming or placement issue.
- **SC-002**: 100% of React component files repo-wide (excluding Next.js reserved files) conform to PascalCase naming and folder-per-component placement once migration is complete.
- **SC-003**: A contributor can locate a given component's test and style files with zero additional navigation beyond opening that component's folder, for 100% of components in scope.
- **SC-004**: A new contributor creating a component from scratch and following the documented convention passes the lint check on the first attempt, without needing a reviewer to flag naming or placement issues.
- **SC-005**: 100% of files under `apps/web-app/hooks/` and `apps/web-app/lib/` conform to their existing camelCase/kebab-case convention, with zero violations from the moment the rule is added (no migration required, since every existing file already complies).

## Assumptions

- "React component file" means a `.tsx` (or `.jsx`) file whose primary export is a React component — not a `.ts` file exporting a hook, utility function, type, or constant.
- PascalCase applies to the component file's base name and must match the exported component's name (e.g. `SaveButton.tsx` exporting `SaveButton`).
- The component's containing folder name must match that same PascalCase name (e.g. `SaveButton/SaveButton.tsx`), consistent with the convention already used in `apps/web-app/components`' file naming today.
- Barrel/re-export files (e.g. `index.ts`) are permitted inside a component folder without being treated as a second component file requiring its own subfolder.
- The lint check runs under the project's existing `pnpm lint` command via a dedicated filename/directory-linting tool wired into the Turborepo task graph, rather than as a Biome rule — Biome's plugin system operates on a single file's syntax tree and has no visibility into filenames or directory structure, so it cannot express these rules regardless of implementation effort.
- Enforcement failing a CI run counts as "catching before merge" — this feature does not require blocking commits locally (e.g. via a pre-commit hook) unless that already exists for other lint rules in this repo.
- Migrating `packages/design-system/src/components/ui/*` off its current lowercase, shadcn-style filenames (and off the `ui/` nesting itself) is in scope and accepted as an intentional divergence from that upstream convention for the sake of a single repo-wide standard.
- The lint check's scope was extended beyond the two locations originally identified to every `packages/*/src/components` directory, once repository inspection during implementation found `packages/token-editor-color/src/components/` and `packages/token-editor-dimension/src/components/` following the same flat, non-PascalCase pattern `apps/web-app/components/` did — an explicit request to close that same gap rather than leave it as a partial rollout.
- Migration is a one-time bulk restructuring (renames, folder moves, import updates) delivered alongside the lint rule in this same feature, not a gradual/opt-in rollout.
- This feature does not enforce the project constitution's Principle X clause "a file MUST NOT export more than one component" — that remains a known, pre-existing gap between the ratified constitution and the current codebase (e.g. `packages/design-system/src/components/Card/Card.tsx` defines 8 components in one file), left for separate future work. This was an explicit scoping decision: enforcing it would require content-parsing (which components a file exports) that a filename/directory linter cannot do, and the project chose not to add a second, custom tool solely for that one rule.
- The hooks/lib naming rules (FR-013–FR-016) were scoped to `apps/web-app/hooks/` and `apps/web-app/lib/` only, since a repo-wide search confirmed these are the only two such directories in the repository today (`packages/*` has no `hooks/`/`lib/` directories of this kind); the rule is not written to generically cover "any future hooks/lib directory" — a new one would need an explicit addition to the lint config, same as any other new rule scope.
- Every existing file in `apps/web-app/hooks/` and `apps/web-app/lib/` was confirmed (by direct repository inspection) to already comply with the camelCase/kebab-case convention FR-013/FR-014 enforce, so no migration task is needed for this scope, unlike FR-011's component migration.
