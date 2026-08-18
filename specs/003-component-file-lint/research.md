# Research: React Component File & Folder Linting

All Technical Context fields were resolvable directly from the existing codebase and constitution; no `NEEDS CLARIFICATION` markers remain. This document records the decisions made and the alternatives rejected.

## 1. How to detect naming/folder/one-component-per-file violations

**Decision**: A custom root-level Node script using the TypeScript compiler API (`ts.createSourceFile` + AST traversal) to find each file's top-level exported declarations, combined with plain `node:path`/`node:fs` filesystem checks for filename casing and folder placement.

**Rationale**: The rules this feature enforces (filename casing, folder-vs-file-name match, cross-file folder co-location) are about the *filesystem*, not about syntax patterns within a single file — Biome's plugin system (`biome/*.grit` files already in this repo) is Grit-based and operates on a single file's AST; it has no visibility into filenames, sibling files, or directory structure. The one-component-per-file / compound-component rule (FR-013–FR-016) *does* need to look inside file contents (which identifiers are exported, do they share a name prefix), which the TypeScript compiler API — already an approved dependency — handles more reliably than regex against arbitrary formatting (multi-line exports, `export { A, B }` lists, re-exports).

**Alternatives considered**:
- **Biome Grit plugin** — rejected: no access to filename/folder context, only rejects/accepts syntax found inside one file's AST.
- **Regex-based export scanning** — rejected: fragile against legitimate formatting variation (the codebase already has multi-line `export { ... }` blocks, e.g. `card.tsx`); the TS compiler API is already a dependency and gives a real AST for free.
- **ESLint plugin** (e.g. `eslint-plugin-filenames`) — rejected: this repo has no ESLint (Biome is the linter of record per the constitution's Technology Stack; `typescript-eslint` is only mentioned as a blocker being removed, not something to reintroduce).

## 2. Where the script lives and how it's wired into `pnpm lint`

**Decision**: A root-level `check-component-structure.cjs` (+ `check-component-structure.test.cjs`), following the existing `commit-conventions.cjs`/`format-staged.cjs` precedent. Add a `"lint:component-structure"` script to root `package.json`, and add a `"//#lint:component-structure"` entry to `turbo.json`'s `lint` task `dependsOn`, alongside the existing `"//#lint:root"`.

**Rationale**: This repo already has a working pattern for "a repo-wide root script that isn't a per-package build target," used for both commit-message linting and pre-commit formatting. The `lint` task in `turbo.json` already fans out to a root-only check (`//#lint:root`) in addition to each package's own `lint`; adding a second root-only check is the smallest change that gets this enforced under the same `pnpm lint`/CI umbrella with zero new pipeline stages.

**Alternatives considered**:
- **New `packages/lint-rules` package** — rejected: over-engineered for a single script; none of this repo's other root tooling (commitlint config, format-staged) lives in a package, and Principle II favors matching existing organizational precedent over introducing a new one for a single script.
- **Pre-commit-only (husky) enforcement, no CI gate** — rejected: FR-006 requires it run "the same way other lint checks are" (i.e., `pnpm lint`), which is both local and CI-enforced already; husky already exists for commit-msg linting but `pnpm lint` itself is not currently husky-gated, so mirroring the existing `lint:root`/CI path (not adding a new local-only hook) is the option that matches current enforcement points.

## 3. Compound-component detection heuristic

**Decision**: Within one file, if two or more components are exported, treat the shortest-named exported component as the "primary" one; the file passes only if every other exported component's name starts with that primary name as a literal string prefix (e.g. `Card` primary; `CardHeader`, `CardFooter`, etc. all pass). If no such single primary exists (no component name is a prefix of all the others), it's a violation.

**Rationale**: Matches the one real example already in the codebase (`card.tsx`: `Card` + 7 `Card*`-prefixed siblings) without requiring semantic analysis of how components actually relate to each other (out of reach for a lint tool; would require rendering/type analysis). It's simple to explain to contributors and to implement with string comparison over the AST-derived export names.

**Alternatives considered**:
- **Semantic/structural analysis (e.g., "sub-component renders inside primary")** — rejected: far beyond what a lint tool can determine statically without full type/render analysis; not proportionate to the problem.
- **Explicit allowlist/config file naming which files are exempt compound families** — rejected: adds a second source of truth (the allowlist can drift from the code); the prefix heuristic is self-describing from the export names alone, so nothing needs to be separately maintained as components are added or removed.

## 4. Migration mechanics

**Decision**: A one-time, scripted bulk migration (not manual file-by-file editing) — a Node script that, for each existing component file: computes its target PascalCase path, `git mv`s the component file and every co-located test/style file into the new per-component folder, then rewrites every relative import referencing the old path across the repo (via a repo-wide grep-and-replace over `.ts`/`.tsx` files).

**Rationale**: ~28 component files move in this migration; a scripted rename-and-import-fix is far less error-prone than hand-editing that many import paths, and having the script also double as (temporary) tooling means the same TS-AST-derived export list used for detection can double-check that the migration didn't drop an export. Confirmed via repository search that no code outside `apps/web-app/components/*` and `packages/design-system/src/components/ui/*` currently imports design-system components by path (the package isn't wired up to any consumer yet beyond its `package.json`/`next.config.ts` dependency declaration), and no cross-imports exist between `packages/design-system/src/components/ui/*` files themselves — which keeps this migration's blast radius to import statements within `apps/web-app/components/*` (which do reference each other, e.g. `TokenTree.tsx` → `TreeGroupNode.tsx`) plus each file's own test/story imports.

**Alternatives considered**:
- **Manual migration** — rejected: higher risk of a missed import at this file count, no reason to prefer it over a scripted move given the script is a one-time throwaway tool, not part of the shipped lint check itself.
- **Gradual/opt-in migration (leave both conventions live, migrate incrementally)** — rejected by the user's explicit choice earlier in scoping: migration is delivered as part of this feature, not deferred (see spec.md Assumptions).
