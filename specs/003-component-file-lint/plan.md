# Implementation Plan: React Component File & Folder Linting

**Branch**: `003-component-file-lint` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-component-file-lint/spec.md`

## Summary

Add a repo-wide, automated check enforcing that every React component file has a PascalCase filename matching its component, and lives in its own dedicated folder alongside its co-located tests/styles. Migrate all existing non-conforming files (`apps/web-app/components/*` flat PascalCase files; `packages/design-system/src/components/ui/*` lowercase files) to comply, updating every internal import. The check is implemented with `@ls-lint/ls-lint`, a purpose-built filename/directory linter (MIT-licensed, npm-distributed prebuilt binary, no Go toolchain required), configured via a root `.ls-lint.yml` and wired into Turborepo's `lint` task as a task that runs in parallel with the existing `//#lint:root` Biome check, under the single `pnpm lint` command. No custom script is written — the earlier plan to hand-roll a Node/TypeScript-compiler-API script was superseded once `ls-lint`'s `regex:${0}` (parent-directory-name substitution) and `exists:N` (per-directory file-count) rules were confirmed to cover every FR without custom code. The one-component-per-file rule considered earlier (compound-component families like `card.tsx`) is explicitly out of scope for this feature — enforcing it would require content-parsing (reading which components a file exports), which `ls-lint` cannot do and which the project chose not to build a second custom tool for; this leaves Principle X's matching clause as a known, pre-existing gap, unchanged by this feature. `/speckit-analyze` surfaced one CRITICAL coverage gap (FR-004: co-located test files sharing the `.tsx` terminal extension — e.g. `TokenTree.a11y.test.tsx` — were not distinguished from the component file itself in the originally planned `.tsx:` rule, which would have broken `exists:1` on every multi-test-file component); the fix is explicit sub-extension rule keys for those `.tsx`-suffixed test variants, folded into this plan below. (`.module.css` was not actually affected — it's already a distinct extension from `.tsx`, never at risk of being caught by that rule.) Scope was also extended, per explicit request, to add naming-convention enforcement (FR-013–FR-016) for `apps/web-app/hooks/` (camelCase) and `apps/web-app/lib/` (kebab-case) — two directories confirmed, by direct repository inspection, to already consistently follow those conventions today, so this addition needs no migration, only the rule itself.

## Technical Context

**Language/Version**: N/A for the lint check itself (`ls-lint` is a prebuilt Go binary invoked via its npm wrapper, configured entirely in YAML — no source code to compile). Migration work touches existing TypeScript 5.x source under this repo's strict `tsconfig.base.json`.

**Primary Dependencies**: `@ls-lint/ls-lint` (new devDependency, added via `pnpm add -D -w @ls-lint/ls-lint` per this repo's pnpm-only dependency-management rule) — see Constitution Check (Principle VIII) for the required justification.

**Storage**: N/A — stateless static analysis over the repository's file tree; produces console diagnostics and a process exit code, nothing persisted.

**Testing**: N/A for the lint tool itself (it is configuration, not code, so there is nothing to unit-test beyond running it against the repo). Migration correctness is verified by the repo's existing `pnpm build`/`pnpm test` suites passing after every import is updated (see quickstart.md).

**Target Platform**: Node.js CLI, invoked locally via `pnpm lint` and in CI via the existing Turborepo/GitHub Actions `lint` job — no new pipeline stage.

**Project Type**: Tooling addition to an existing pnpm/Turborepo monorepo (a new dependency + config file + a one-time repo-wide file migration), not a new app, service, or package.

**Performance Goals**: `ls-lint` is a compiled Go binary designed to lint thousands of files in milliseconds; a full-repo scan (~28 component files today, growing over time) is not expected to be a measurable contributor to `pnpm lint`'s wall-clock time.

**Constraints**: Must run under the single `pnpm lint` command, not a second command contributors/CI must separately invoke (FR-006). Since `ls-lint` is a separate program (not a Biome rule — Biome's Grit plugins see only one file's AST, never filenames or directory structure), it MUST be wired into Turborepo's task graph as a task that runs *in parallel* with the repo's other lint work, not serially appended after it: add `"//#lint:filenames"` as a second entry in `turbo.json`'s `"lint"` task `dependsOn`, alongside the existing `"//#lint:root"` entry. Turborepo schedules sibling `dependsOn` entries that don't depend on each other concurrently, so `//#lint:root` (Biome) and `//#lint:filenames` (`ls-lint`) run at the same time, both still under one `pnpm lint` invocation.

**Scale/Scope**: ~13 component files in `apps/web-app/components/` (to be moved into per-component folders) + ~19 component files across `packages/design-system/src/components/ui/*` (to be renamed lowercase → PascalCase) migrated once, plus ~2 files in `apps/web-app/hooks/` and ~24 files in `apps/web-app/lib/**` (naming rule only, already compliant, no migration); `ls-lint` then runs on every future `pnpm lint` invocation with no ongoing maintenance beyond `.ls-lint.yml` updates as new component/hook/lib locations are added.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle II (Feature-Based Code Organization)** — PASS (N/A). No new code package; `.ls-lint.yml` is a single root-level config file, consistent with this repo's existing root-level tooling configs (`biome.json`, `commitlint.config.cjs`).
- **Principle III (TypeScript Strictness)** — PASS (N/A). No TypeScript source is added by this feature's tooling (only migration touches existing typed source, which continues to compile under the same strict settings it already does).
- **Principle IV (Validation at the Edges)** — PASS (N/A). No data enters the application's typed domain model; this is build-time tooling only.
- **Principle VI (DI for I/O/Platform Externalities)** — PASS (N/A). No custom script reads the filesystem directly — `ls-lint`'s own I/O is internal to the pre-built tool, not code this repo owns or tests.
- **Principle VIII (Minimal Dependencies)** — justification required and provided here, per "a new dependency is added only when it is named and justified in the feature's `plan.md`": **Dependency**: `@ls-lint/ls-lint`. **Built-in/first-party alternative considered**: a hand-rolled Node script using `node:fs`/`node:path` (the original plan for this feature, see git history of this file). **Why it falls short**: the folder-name-matches-file-name rule (FR-003) and the "exactly one component file per folder" rule (FR-002) both require directory-aware glob/regex logic that is easy to get subtly wrong by hand (path traversal edge cases, cross-platform path separators, symlinks) and is exactly the problem `ls-lint` is purpose-built and battle-tested for, via its confirmed `regex:${0}` (parent-directory-name substitution) and `exists:N` (per-directory count) rules. Bundle size/maintenance cost is low: it is a devDependency only (never shipped in any package's runtime bundle), distributed as a single prebuilt binary via its npm wrapper (no Go toolchain, no additional transitive JS dependencies to audit), and replaces what would otherwise be ~150+ lines of custom filesystem-walking code this project would need to write, test, and maintain itself.
- **Principle X (Component Granularity & Testing)** — PARTIAL, explicitly scoped. This feature enforces the *new* PascalCase/folder-per-component convention, but does **not** enforce Principle X's pre-existing "a file MUST NOT export more than one component" clause — `ls-lint` cannot read file contents, and the project chose not to add a second, custom content-parsing tool solely for that one rule (see spec.md Assumptions). `packages/design-system/src/components/ui/card/card.tsx` (8 components in one file) remains a known, accepted gap between the ratified constitution and the codebase, left for separate future work rather than blocking this feature.
- No Complexity Tracking entry beyond the Principle VIII justification above (which lives here per that principle's own requirement, not because it flags a "violation" — Principle VIII does not prohibit dependencies, only requires them to be named and justified before adding).

## Project Structure

### Documentation (this feature)

```text
specs/003-component-file-lint/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── lint-diagnostics.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
.ls-lint.yml                         # new — declares PascalCase filename, folder-placement, and
                                      # folder-name-match rules for both component locations, with
                                      # explicit sub-extension keys (.test.tsx, .a11y.test.tsx,
                                      # .generic-editor.test.tsx, .override.test.tsx) so co-located
                                      # test files sharing the .tsx terminal extension are never
                                      # caught by the .tsx rule or counted against its exists:1
                                      # (fixes the analyze-surfaced FR-004 gap — .module.css needs no
                                      # such fix, since it's already a distinct extension from .tsx);
                                      # excludes apps/web-app/app/ (Next.js reserved files) via its
                                      # "ignore" list; also declares a camelCase rule for
                                      # apps/web-app/hooks/* and a kebab-case rule for
                                      # apps/web-app/lib/** (FR-013–FR-016)

turbo.json                           # add "//#lint:filenames" to the "lint" task's dependsOn,
                                      # alongside the existing "//#lint:root"
package.json                         # add root "lint:filenames" script ("ls-lint"); add
                                      # "@ls-lint/ls-lint" devDependency via `pnpm add -D -w`

.specify/memory/constitution.md      # documents the file/folder convention (FR-008) — extends
                                      # Principle X's existing text with the naming/folder rule,
                                      # explicitly noting the one-component-per-file clause remains
                                      # unenforced by tooling (matches spec.md Assumptions)

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
├── card/Card.tsx (was card.tsx — still 8 components in one file; out of scope per Principle X note above), Card.css
└── ...same rename pattern for the remaining accordion/alert/avatar/badge/checkbox/combobox/
    command/dialog/dropdown-menu/input/label/popover/radio-group/select/switch/tabs/textarea
    folders already present under ui/

# Hooks/lib naming scope — no file moves, naming already compliant, rule-only addition:
apps/web-app/hooks/       # camelCase rule (FR-013); useSaveTokenEdits.ts/.test.tsx already pass
apps/web-app/lib/**       # kebab-case rule, applied recursively (FR-014); all ~24 existing files already pass
```

**Structure Decision**: No new app, service, or package. This is (1) a new devDependency (`@ls-lint/ls-lint`) plus one root config file (`.ls-lint.yml`) wired into the existing Turborepo `lint` task exactly as `lint:root` already is, and (2) an in-place file migration within the two existing component directories (`apps/web-app/components/`, `packages/design-system/src/components/ui/`) — folder moves and renames, no directory relocation to a new top-level path, plus (3) a naming-only rule addition for `apps/web-app/hooks/` and `apps/web-app/lib/**` that requires no file changes (both already compliant). `apps/web-app/app/` (Next.js App Router) is untouched, per FR-010's exclusion of framework-reserved filenames.

## Complexity Tracking

_No Constitution Check violations — Principle VIII's required dependency justification is documented inline above, not a violation needing a table entry._
