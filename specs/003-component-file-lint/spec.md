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

### Edge Cases

- A component file is the sole file in its folder (no test or style file yet, e.g. a brand-new component) — placement rule must still pass; co-location is only required for files that exist, not files that must exist.
- A folder contains a barrel/re-export file (e.g. `index.ts`) alongside the PascalCase component file — the barrel file must not itself be flagged as a second, incorrectly-named component file.
- A `.ts`/`.tsx` file exports something other than a component (a hook, a utility, a type, a constant) — it must not be misidentified as a component subject to the PascalCase/folder rule.
- Test files use varying suffixes already present in the codebase (`.test.tsx`, `.a11y.test.tsx`) — all must be recognized as belonging to their component, not flagged as unrelated stray files.
- A component folder name and its component file's base name diverge (e.g. `Button/button.tsx` or `save-button/SaveButton.tsx`) — this must be flagged as a violation even though the `.tsx` file itself is present and PascalCase.
- A Next.js App Router special file (`page.tsx`, `layout.tsx`, `route.ts`, etc.) sits flat in `apps/web-app/app/` — it must be excluded from both the naming and folder-placement rules rather than flagged or migrated.
- A migrated component is imported elsewhere in the repo, or referenced by a generated artifact (e.g. the sugarcube design-system generator, a package's public entry point/barrel export) — those references must be updated so nothing breaks after the rename/move.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The lint check MUST flag any React component file whose filename is not PascalCase (e.g., `saveButton.tsx`, `save-button.tsx`) as a violation.
- **FR-002**: The lint check MUST flag any React component file that is not located inside a folder dedicated to that component — including component files placed directly in a shared/flat directory — as a violation.
- **FR-003**: The lint check MUST flag a component folder whose name does not match its component file's PascalCase base name.
- **FR-004**: The lint check MUST NOT flag a component's co-located test file(s) or style file(s) (e.g., CSS modules) sitting in the same folder as the component.
- **FR-005**: The lint check MUST NOT flag non-component files (hooks, utilities, types, constants, barrel/re-export files) that live inside a component's folder, as long as they are not themselves component files.
- **FR-006**: The lint check MUST run as part of the project's existing lint pipeline (invoked the same way other lint checks are, e.g. via `pnpm lint`) so violations are caught before merge, not as a separate manually-run step.
- **FR-007**: The lint check MUST report an actionable error message per violation, identifying the offending file/folder and which specific rule (naming vs. folder placement vs. folder-name mismatch) was broken.
- **FR-008**: The expected file/folder convention MUST be documented in a location contributors and future lint-rule maintainers can find (e.g. the project constitution or a contributing guide).
- **FR-009**: The lint check's scope MUST cover all React component files repo-wide, including both `apps/web-app/components/` and `packages/design-system/src/components/ui/`.
- **FR-010**: The lint check MUST exclude Next.js's framework-reserved files (e.g. `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `template.tsx`, `default.tsx`, `route.ts`) from the PascalCase and folder-placement rules, since their filenames and flat placement within `apps/web-app/app/` are dictated by the Next.js App Router, not by this convention.
- **FR-011**: All existing React component files within scope (including `packages/design-system/src/components/ui/*`, currently lowercase, and `apps/web-app/components/*`, currently flat) MUST be migrated — renamed to PascalCase and moved into a dedicated folder alongside their co-located tests/styles — as part of delivering this feature, with all internal imports and any generated/derived references (e.g. the sugarcube token/component generator, barrel exports) updated to match.
- **FR-012**: After migration, the lint check MUST pass with zero violations across the full repository, with no files grandfathered or exempted other than the Next.js reserved files covered by FR-010.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A misnamed or misplaced component file introduced in a change is caught automatically by the lint pipeline, with zero manual reviewer effort needed to spot the naming or placement issue.
- **SC-002**: 100% of React component files repo-wide (excluding Next.js reserved files) conform to PascalCase naming and folder-per-component placement once migration is complete.
- **SC-003**: A contributor can locate a given component's test and style files with zero additional navigation beyond opening that component's folder, for 100% of components in scope.
- **SC-004**: A new contributor creating a component from scratch and following the documented convention passes the lint check on the first attempt, without needing a reviewer to flag naming or placement issues.

## Assumptions

- "React component file" means a `.tsx` (or `.jsx`) file whose primary export is a React component — not a `.ts` file exporting a hook, utility function, type, or constant.
- PascalCase applies to the component file's base name and must match the exported component's name (e.g. `SaveButton.tsx` exporting `SaveButton`).
- The component's containing folder name must match that same PascalCase name (e.g. `SaveButton/SaveButton.tsx`), consistent with the convention already used in `apps/web-app/components`' file naming today.
- Barrel/re-export files (e.g. `index.ts`) are permitted inside a component folder without being treated as a second component file requiring its own subfolder.
- The lint check integrates into the project's existing Biome-based lint pipeline (`pnpm lint`) rather than introducing a separate linter or tool, since Biome is already the project's linter of record; the exact mechanism (built-in rule, custom plugin, or a companion script wired into the same command) is a planning-phase decision, not a scope decision.
- Enforcement failing a CI run counts as "catching before merge" — this feature does not require blocking commits locally (e.g. via a pre-commit hook) unless that already exists for other lint rules in this repo.
- Migrating `packages/design-system/src/components/ui/*` off its current lowercase, shadcn-style filenames is in scope and accepted as an intentional divergence from that upstream convention for the sake of a single repo-wide standard.
- Migration is a one-time bulk restructuring (renames, folder moves, import updates) delivered alongside the lint rule in this same feature, not a gradual/opt-in rollout.
