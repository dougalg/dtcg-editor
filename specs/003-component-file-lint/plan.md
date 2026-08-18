# Implementation Plan: React Component File & Folder Linting

**Branch**: `003-component-file-lint` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-component-file-lint/spec.md`

## Summary

Add a repo-wide, automated check enforcing that every React component file (a) has a PascalCase filename matching its exported component, (b) lives in its own dedicated folder alongside its co-located tests/styles, and (c) exports only one component per file — except for documented compound-component families (a primary component plus name-prefixed sub-components, e.g. `Card`/`CardHeader`/`CardFooter`), which stay together in one file. This closes an existing gap between the ratified constitution (Principle X) and the current codebase. Migrate all existing non-conforming files (`apps/web-app/components/*` flat PascalCase files; `packages/design-system/src/components/ui/*` lowercase files) to comply, updating every internal import. The check is a new root-level Node script (mirroring the existing `commit-conventions.cjs`/`format-staged.cjs` pattern), wired into the Turborepo `lint` task the same way `lint:root` already is, using the TypeScript compiler API (already an approved dependency) to parse each file's exports — no new third-party dependency required.

## Technical Context

**Language/Version**: TypeScript 5.x under this repo's strict `tsconfig.base.json`; script runs on Node.js >=26.5.0 (per root `package.json` `engines`).

**Primary Dependencies**: `typescript` compiler API (`ts.createSourceFile`) for AST-based export/component detection — already an approved dependency (Technology Stack list), reused rather than added. No new third-party dependency.

**Storage**: N/A — stateless static analysis over the repository's file tree; produces console diagnostics and a process exit code, nothing persisted.

**Testing**: Node's built-in test runner (`node:test` + `node:assert/strict`), matching the existing root-script convention (`format-staged.cjs` + `format-staged.test.cjs`, `commit-conventions.cjs` + `commit-conventions.test.cjs`) rather than Vitest, since this script is root-level tooling, not part of `apps/web-app` or a `packages/*` package.

**Target Platform**: Node.js CLI, invoked locally via `pnpm lint` and in CI via the existing Turborepo/GitHub Actions `lint` job — no new pipeline stage.

**Project Type**: Tooling addition to an existing pnpm/Turborepo monorepo (a new root-level lint script + a one-time repo-wide file migration), not a new app, service, or package.

**Performance Goals**: Full-repo scan (~20 component files today, growing over time) completes in well under 1s locally — in the same order of magnitude as the existing `lint:root` Biome invocation it runs alongside; must not become the slow step in `pnpm lint`.

**Constraints**: Must run under the single `pnpm lint` command, not a second command contributors/CI must separately invoke. Since the filename/folder/cross-file rules (FR-001–FR-003, FR-013–FR-015) are outside what a single-file Biome Grit plugin can see (confirmed in Research §1), the check is a separate program — so per FR-006 it MUST be wired into Turborepo's task graph as a task that runs *in parallel* with the repo's other lint work, not serially appended after it. Concretely: add `"//#lint:component-structure"` as a second entry in `turbo.json`'s `"lint"` task `dependsOn`, alongside the existing `"//#lint:root"` entry — Turborepo schedules sibling `dependsOn` entries that don't depend on each other concurrently, so `//#lint:root` (Biome) and `//#lint:component-structure` (this script) run at the same time, both still under one `pnpm lint` invocation. Must not add a new approved dependency (Principle VIII — Minimal Dependencies); must follow this repo's Dependency Injection convention for I/O (inject the filesystem-reading function so the script's own tests use fakes, not a real filesystem, matching `format-staged.test.cjs`'s documented convention) even though root scripts sit outside the `apps/web-app`-scoped Biome enforcement of that rule.

**Scale/Scope**: ~13 component files in `apps/web-app/components/` (to be moved into per-component folders) + ~15 component files across `packages/design-system/src/components/ui/*` (to be renamed lowercase → PascalCase) migrated once; the script itself then runs on every future `pnpm lint` invocation.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle II (Feature-Based Code Organization)** — PASS. The new script and its test live side by side at the repo root (`check-component-structure.cjs` + `check-component-structure.test.cjs`), matching the existing `commit-conventions.cjs`/`format-staged.cjs` pairing already established for root-level tooling.
- **Principle III (TypeScript Strictness)** — PASS (N/A caveat). Existing root scripts (`commit-conventions.cjs`, `format-staged.cjs`) are plain `.cjs`, outside the `packages/*`/`apps/web-app` `tsconfig.base.json` strict-compile boundary; the new script follows that same established precedent rather than introducing a new, inconsistent typed root script.
- **Principle IV (Validation at the Edges)** — PASS. The script's only "edge" is reading filenames/file contents off disk; it does not need Zod validation of that data (it's not entering the app's typed domain model), consistent with this being a build-time lint tool, not runtime application logic.
- **Principle VI (DI for I/O/Platform Externalities)** — PASS (by design). The script injects its filesystem-walk/read functions as parameters with real `node:fs`/`node:path` implementations as defaults, matching the pattern `format-staged.cjs` already documents ("per this repo's Dependency Injection for I/O/Platform Externalities testing convention") even though Biome's `noRestrictedGlobals` enforcement of this rule is scoped to `apps/web-app/**` only.
- **Principle VIII (Minimal Dependencies)** — PASS. Reuses the already-approved `typescript` package's compiler API for export/AST parsing; no new dependency is added.
- **Principle X (Component Granularity & Testing)** — PASS, and this feature is the enforcement mechanism for Principle X's "one component per file" clause (previously ratified but unenforced), plus the new PascalCase/folder-per-component convention this feature adds on top of it. The compound-component exception (FR-013–FR-016) is a documented, narrow carve-out, not a redefinition of the principle.
- No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/003-component-file-lint/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── lint-diagnostics.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# New root-level lint tooling (mirrors commit-conventions.cjs / format-staged.cjs)
check-component-structure.cjs        # the lint script (walks the repo, applies FR-001–FR-016)
check-component-structure.test.cjs   # node:test unit tests, filesystem calls faked per DI convention

turbo.json                           # add "//#lint:component-structure" to the "lint" task's dependsOn,
                                      # alongside the existing "//#lint:root"
package.json                         # add root "lint:component-structure" script invoking the new .cjs file

.specify/memory/constitution.md      # documents the file/folder convention (FR-008), amending/extending
                                      # Principle X's existing text rather than adding a new principle

# Migrated component locations (apps/web-app) — flat files move into per-component folders:
apps/web-app/components/
├── SaveButton/
│   ├── SaveButton.tsx
│   ├── SaveButton.test.tsx
│   ├── SaveButton.a11y.test.tsx
│   └── SaveButton.module.css
├── FallbackValueEditor/
│   ├── FallbackValueEditor.tsx
│   ├── FallbackValueEditor.test.tsx
│   └── FallbackValueEditor.module.css
├── FolderOverview/
│   ├── FolderOverview.tsx
│   ├── FolderOverview.test.tsx
│   ├── FolderOverview.a11y.test.tsx
│   └── FolderOverview.module.css
├── TokenTree/
│   ├── TokenTree.tsx
│   ├── TokenTree.module.css
│   └── TokenTree.*.test.tsx           # all existing TokenTree test variants move alongside it
├── TreeGroupNode/TreeGroupNode.tsx
├── TreeNode/TreeNode.tsx
├── TreeTokenNode/TreeTokenNode.tsx
└── DefaultValidationErrorHandler/
    ├── DefaultValidationErrorHandler.tsx
    └── DefaultValidationErrorHandler.test.tsx

# Migrated component locations (design system) — lowercase files renamed to PascalCase in place:
packages/design-system/src/components/ui/
├── button/Button.tsx (was button.tsx), Button.css (was button.css)
├── card/Card.tsx (was card.tsx, compound family: Card/CardHeader/CardTitle/CardDescription/
│                   CardAction/CardContent/CardMedia/CardFooter — stays one file per FR-014), Card.css
└── ...same rename pattern for the remaining accordion/alert/avatar/badge/checkbox/combobox/
    command/dialog/dropdown-menu/input/label/popover/radio-group/select/switch/tabs/textarea
    folders already present under ui/
```

**Structure Decision**: No new app, service, or package. This is (1) a new pair of root-level tooling files (`check-component-structure.cjs` + its test) wired into the existing Turborepo `lint` task exactly as `lint:root` already is, and (2) an in-place file migration within the two existing component directories (`apps/web-app/components/`, `packages/design-system/src/components/ui/`) — folder moves and renames, no directory relocation to a new top-level path. `apps/web-app/app/` (Next.js App Router) is untouched, per FR-010's exclusion of framework-reserved filenames.

## Complexity Tracking

_No Constitution Check violations — table not needed._
