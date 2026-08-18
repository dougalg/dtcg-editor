# Research: React Component File & Folder Linting

All Technical Context fields were resolvable directly from the existing codebase, the constitution, and web research into available tooling; no `NEEDS CLARIFICATION` markers remain. This document records the decisions made and the alternatives rejected.

## 1. How to detect naming/folder-placement violations

**Decision**: `@ls-lint/ls-lint` — a purpose-built, MIT-licensed filename/directory-structure linter, distributed as a prebuilt Go binary via a thin npm wrapper (no Go toolchain, no additional transitive JS dependencies). Configured entirely via a root `.ls-lint.yml`; no custom script required.

**Rationale**: The rules this feature enforces (filename casing, folder-name-matches-file-name, one-component-file-per-folder) are about the *filesystem*, not syntax inside a single file — ruled out Biome's own plugin system for that reason (see rejected alternative below). Verified `ls-lint`'s actual capabilities (not assumed) via its docs and GitHub README before committing to it:
- **PascalCase filenames** (FR-001): built-in `PascalCase` rule.
- **Folder name matches the component file's base name** (FR-003): `regex:${0}`, where `${0}` substitutes the immediate parent directory's own name into the regex pattern — confirmed via `ls-lint.org`'s rules documentation, example: `components/*: .ts: regex:${0}`.
- **Exactly one component file per folder** (FR-002, in combination with folder-per-component structure): `exists:1`/`exists:N-M` rule, restricting a matched extension to an exact or ranged count within a directory.
- **Excluding Next.js reserved files** (FR-010): the top-level `ignore:` list (confirmed example: `ignore: - node_modules`) excludes `apps/web-app/app/` outright, and/or rules are simply never declared for that path — `ls-lint` only checks paths a rule glob matches.

This is a case where Principle VIII's "better than hand-rolling" bar is clearly met: the directory-aware regex/count logic these rules need is exactly `ls-lint`'s reason for existing, and is meaningfully easy to get wrong by hand (path traversal, cross-platform separators, symlink handling) — see the Principle VIII justification in `plan.md`'s Constitution Check for the full comparison against the custom-script alternative that was the original plan for this feature.

**Alternatives considered**:
- **Custom Node script using the TypeScript compiler API** — this was the original plan for this feature (see earlier commits to this file). Rejected once `ls-lint` was found and its exact rule capabilities confirmed to cover every filename/folder requirement (FR-001–FR-003) declaratively — writing and maintaining ~150+ lines of custom filesystem-walking/regex code for a problem a tested, purpose-built tool already solves does not clear Principle VIII's bar once a suitable off-the-shelf tool is known to exist.
- **Biome Grit plugin** — rejected: confirmed Biome's Grit plugins (see `biome/*.grit` files already in this repo) operate on one file's AST at a time; they have no access to filenames or sibling/directory structure at all, so this category of rule is categorically out of their reach regardless of implementation effort.
- **`eslint-plugin-check-file`** (an ESLint plugin with similar filename/folder rules) — rejected: using it would require introducing ESLint as a second linter alongside Biome, which conflicts with this repo's constitution (Biome is the linter of record; `typescript-eslint`/ESLint are explicitly being phased out per the backlog's TypeScript v7 upgrade item, not reintroduced).
- **Content-based one-component-per-file rule** — considered and then explicitly dropped from this feature's scope entirely (not just its detection mechanism): see spec.md Assumptions. No tool — off-the-shelf or custom — was evaluated further for it once the decision was made not to build it this feature.

## 2. Where the config lives and how it's wired into `pnpm lint`

**Decision**: A single root `.ls-lint.yml`. Add a `"lint:filenames"` script to root `package.json` (`"ls-lint"`, `ls-lint`'s own CLI invocation, no flags needed since config is auto-discovered from `.ls-lint.yml` at the invocation root). Add a `"//#lint:filenames"` entry to `turbo.json`'s `"lint"` task `dependsOn`, alongside the existing `"//#lint:root"`.

**Rationale**: This repo already has a working pattern for "a repo-wide root check that isn't a per-package build target" (`//#lint:root`, running Biome against root-level `.cjs` config files). Adding a second root-only check is the smallest change that gets this enforced under the same `pnpm lint`/CI umbrella with zero new pipeline stages. Critically, `//#lint:root` and the new `//#lint:filenames` become two independent entries in the same `dependsOn` array — neither depends on the other — so Turborepo's scheduler runs them concurrently rather than one after the other; `pnpm lint` stays a single command and its wall-clock time is governed by the slowest task in the graph, not the sum of all of them.

**Alternatives considered**:
- **A per-package `lint` script addition** (e.g. running `ls-lint` separately inside `apps/web-app`'s and `packages/design-system`'s own `lint` scripts) — rejected: the folder-name-match rule (FR-003) and future scope growth benefit from one config file with visibility across the whole repo tree, matching how `.ls-lint.yml`'s path-glob keys (e.g. `apps/web-app/components/*`, `packages/design-system/src/components/ui/*`) are naturally expressed as one file, not fragments duplicated per package.
- **Pre-commit-only (husky) enforcement, no CI gate** — rejected: FR-006 requires it run under the single `pnpm lint` command (both local and CI-enforced already); `pnpm lint` itself is not currently husky-gated, so mirroring the existing `lint:root`/CI path (not adding a new local-only hook) matches current enforcement points.

## 3. One-component-per-file rule: dropped from scope

**Decision**: Not implemented in this feature, by explicit product decision after the `ls-lint`-vs-custom-script tradeoff was discussed. Constitution Principle X's "a file MUST NOT export more than one component" clause remains unenforced by any tooling; `card.tsx`'s 8-components-in-one-file pattern remains as-is.

**Rationale**: `ls-lint` (or any filename/directory linter) fundamentally cannot express this rule — it requires reading file contents to know which components a file exports, which is outside what any filename-based tool can ever do. Building a second, separate custom tool (the TypeScript-compiler-API script from the superseded plan) solely for this one rule, after already deciding not to hand-roll the filename/folder rules `ls-lint` now covers, was judged not worth the added maintenance surface for a single rule — a smaller, more consistent tooling footprint (one dependency, one config file) was preferred over a hybrid of one config-driven tool plus one custom script.

**Alternatives considered**:
- **Prefix-based compound-component heuristic in a custom script** (the approach designed in an earlier iteration of this plan, before this decision) — superseded; the design remains available in this file's git history if this rule is picked up as separate future work.
- **Keep the rule but scope the custom script to only this one check** — rejected: still requires writing, testing, and maintaining a bespoke AST-parsing script for a single rule, which is the exact overhead this feature is otherwise avoiding by using `ls-lint`.

## 4. Migration mechanics

**Decision**: A one-time, scripted bulk migration (not manual file-by-file editing) — a throwaway Node script that, for each existing component file: computes its target PascalCase path, `git mv`s the component file and every co-located test/style file into the new per-component folder, then rewrites every relative import referencing the old path across the repo (via a repo-wide grep-and-replace over `.ts`/`.tsx` files). This script is not part of the shipped feature (it is not `ls-lint`-related tooling); it is a one-time migration aid, run once and discarded.

**Rationale**: ~28 component files move in this migration; a scripted rename-and-import-fix is far less error-prone than hand-editing that many import paths. Confirmed via repository search that no code outside `apps/web-app/components/*` and `packages/design-system/src/components/ui/*` currently imports design-system components by path (the package isn't wired up to any consumer yet beyond its `package.json`/`next.config.ts` dependency declaration), and no cross-imports exist between `packages/design-system/src/components/ui/*` files themselves — which keeps this migration's blast radius to import statements within `apps/web-app/components/*` (which do reference each other, e.g. `TokenTree.tsx` → `TreeGroupNode.tsx`) plus each file's own test/story imports. Running `ls-lint` after migration (exit code `0`) is the acceptance check that the migration is complete, per FR-012.

**Alternatives considered**:
- **Manual migration** — rejected: higher risk of a missed import at this file count, no reason to prefer it over a scripted move given the script is a one-time throwaway tool, not part of the shipped lint check itself.
- **Gradual/opt-in migration (leave both conventions live, migrate incrementally)** — rejected by the user's explicit choice earlier in scoping: migration is delivered as part of this feature, not deferred (see spec.md Assumptions).
