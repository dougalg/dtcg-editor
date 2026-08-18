# Feature Specification: TypeScript v7 Upgrade

**Feature Branch**: `worktree-typescript-v7-upgrade`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Upgrade `typescript` to v7 repo-wide. The Biome migration prerequisite has already landed (removes the typescript-eslint <6.1.0 peer blocker). Next.js is already pinned to 16.2.12 which ships `experimental.useTypeScriptCli`, letting `next build` shell out to `tsc` instead of needing TS7's missing Compiler API — accept this experimental flag in production since it's the only path that unblocks the build today. Scope covers the whole monorepo (root, apps/web-app, all packages/*), not just apps/web-app. Follow all TypeScript 7 migration guidance and breaking-change notes from the official release notes/migration documentation. See docs/research/typescript-v7-upgrade-path.md for prior research on the framework/tooling compatibility landscape."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Type-check and build the whole monorepo on TypeScript 7 (Priority: P1)

As a developer working anywhere in this monorepo (root tooling, `apps/web-app`, or any `packages/*` library), I can run the project's standard type-check and build commands and have them succeed using TypeScript 7, so the codebase is no longer pinned to an aging major version once its blocking dependencies are resolved.

**Why this priority**: This is the core deliverable — without every package type-checking and building cleanly on TS7, the upgrade isn't done. Everything else (CI, editor tooling, docs) depends on this working first.

**Independent Test**: From a clean install, run the workspace-wide typecheck script and each package's build script; all complete with zero TypeScript errors attributable to the version bump, using only TypeScript 7 (no TS6 alias/shim installed anywhere in the dependency tree).

**Acceptance Scenarios**:

1. **Given** the workspace root `typescript` catalog entry is set to a TypeScript 7 release, **When** a developer runs the repo-wide typecheck command, **Then** every workspace package (`apps/web-app`, `packages/errors`, `packages/token-core`, `packages/token-editor-*`) reports zero type errors.
2. **Given** `apps/web-app`'s `next.config` has `experimental.useTypeScriptCli` enabled, **When** a developer runs `next build`, **Then** the build completes successfully by shelling out to the project-local `tsc` CLI instead of failing with the "TypeScript 7.0.2 does not provide the compiler API" error.
3. **Given** each `packages/*` library's own build step (declaration emit / library bundling), **When** a developer runs that package's build script, **Then** it completes successfully against TypeScript 7 with correct `.d.ts` output.

---

### User Story 2 - Lint and format tooling continues to work under TypeScript 7 (Priority: P2)

As a developer, I can still run the repo's Biome-based lint and format checks after the TypeScript bump, so code quality gates aren't silently disabled or broken by the upgrade.

**Why this priority**: Biome (not `typescript-eslint`) is the repo's lint/format tool post-migration, and it uses its own type-inference engine rather than `tsc`'s Compiler API, so it should be unaffected — but this must be verified explicitly, since a partial break here would be easy to miss.

**Independent Test**: Run the repo's Biome check/format commands after the TypeScript bump; they run and report the same class of findings as before the upgrade (no crashes, no newly-silent no-ops caused by the version bump).

**Acceptance Scenarios**:

1. **Given** TypeScript has been upgraded to v7 repo-wide, **When** a developer runs the Biome check used in the pre-commit hook and in CI, **Then** it completes without error and continues enforcing the existing Dependency Injection for I/O/Platform Externalities rules.

---

### User Story 3 - Pre-existing type-checking behavior is preserved (Priority: P3)

As a developer, code that was previously type-correct under TypeScript 6.x remains type-correct after the upgrade (aside from deliberate, documented fixes required by TS7's breaking changes), so the upgrade doesn't silently change runtime behavior or require unrelated refactors.

**Why this priority**: Lower priority than getting the build green, but important for reviewability — any type-error fix forced by TS7 should be traceable to a specific documented breaking change, not an incidental behavior change.

**Independent Test**: Diff the set of files touched by the upgrade against TypeScript 7's published breaking-change list; every non-mechanical (i.e., not a version-string or config-flag) source change maps to a specific documented TS7 breaking change or deprecation.

**Acceptance Scenarios**:

1. **Given** TypeScript 7's official release notes and migration guide list specific breaking changes (e.g., removed/changed compiler options, stricter checks, removed APIs), **When** the upgrade introduces a source-code change beyond version bumps and config flags, **Then** that change is traceable to one of those documented breaking changes.

### Edge Cases

- What happens to the `experimental.useTypeScriptCli` build path if a future Next.js patch removes or renames the flag before TS7.1 ships a stable Compiler API? (Out of scope to solve now; the assumption below records the accepted risk.)
- How does the repo-wide typecheck script behave for a package with no emitted output (types-only) versus a package that emits a library bundle — do both surface TS7 errors the same way?
- Does any script, tool, or CI step outside the standard `pnpm` scripts (e.g. a Playwright config's `ts-node`-style loader, a codegen script invoking the TypeScript API directly) load TypeScript's now-removed JS Compiler API and therefore break even though `next build` and `tsc --noEmit` do not?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The `typescript` package version resolved for every workspace package (via the pnpm catalog entry) MUST be a TypeScript 7.x release.
- **FR-002**: `apps/web-app`'s Next.js configuration MUST enable `experimental.useTypeScriptCli` so `next build` and `next dev` type-check via the local `tsc` CLI rather than the removed JS Compiler API.
- **FR-003**: The repo-wide typecheck command MUST pass with zero errors across all workspace packages (root, `apps/web-app`, and every `packages/*` library) after the upgrade.
- **FR-004**: Each `packages/*` library's build/declaration-emit step MUST succeed and continue producing valid `.d.ts` output under TypeScript 7.
- **FR-005**: The Biome lint/format check (pre-commit hook and CI) MUST continue to run and pass after the TypeScript version bump, with no reduction in enforced rules.
- **FR-006**: Any source or configuration change required beyond the version bump and the `useTypeScriptCli` flag MUST be attributable to a specific breaking change or deprecation documented in TypeScript's official 7.0 release notes/migration guidance, and MUST be noted as such (e.g., in the PR description or a code comment where the reason is non-obvious).
- **FR-007**: The upgrade MUST NOT introduce a `typescript6`/`@typescript/typescript6` alias or any other TS6 shim anywhere in the dependency tree — the repo runs on TypeScript 7 directly, consistent with the Biome migration having already removed the `typescript-eslint` blocker that previously motivated considering such a shim.
- **FR-008**: Any project tooling (build scripts, codegen, test runners) found to depend on TypeScript's removed JS Compiler API MUST either be updated to a TS7-compatible approach or have the specific incompatibility documented if it cannot be resolved within this feature's scope.

### Key Entities

- **TypeScript catalog entry**: The single pnpm-workspace `catalog:` version pin for `typescript`, consumed by `package.json` in the root and every workspace package.
- **`experimental.useTypeScriptCli` flag**: Next.js config option in `apps/web-app`'s Next config that switches `next build`/`next dev` type-checking from the (now-missing) JS Compiler API to shelling out to the local `tsc` CLI.
- **Workspace package**: Any of the root, `apps/web-app`, or `packages/*` directories that independently type-checks and/or builds as part of the monorepo.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every workspace package's type-check completes with zero errors on a clean install, using TypeScript 7 exclusively (no TS6 alias present anywhere in the dependency tree).
- **SC-002**: `apps/web-app`'s production build (`next build`) completes successfully end-to-end using the `useTypeScriptCli` path.
- **SC-003**: Each `packages/*` library's build output (declaration files and bundled artifacts) is unchanged in shape/API surface from before the upgrade — no consumer-visible type or behavior regressions.
- **SC-004**: The existing Biome-based lint/format pre-commit hook and CI check both pass unmodified in scope (same rules enforced) after the upgrade.
- **SC-005**: 100% of non-mechanical source changes made for this upgrade are traceable to a specific, documented TypeScript 7 breaking change.

## Assumptions

- The Biome migration (see `docs/backlog-completed.md`) has already landed and removed the `typescript-eslint` `<6.1.0` peer-range blocker; this feature does not need to re-verify that migration, only rely on its outcome.
- Next.js stays pinned at `16.2.12` or later (already carrying the `experimental.useTypeScriptCli` backport) for the duration of this feature; a Next.js downgrade is out of scope.
- Enabling `experimental.useTypeScriptCli` in production is an accepted, documented risk despite Next.js's own "not recommended for production" caveat for that flag, because it is currently the only available path to a working TS7 build — per prior research in `docs/research/typescript-v7-upgrade-path.md`.
- No TS6 compatibility alias (e.g. `@typescript/typescript6`) is introduced as part of this upgrade; the repo commits to TypeScript 7 directly across the whole monorepo, not a partial/staged migration.
- Editor/IDE TypeScript language-service support (e.g. VS Code's bundled TS server) is expected to lag TS7's own Compiler API availability; this is a known, accepted limitation of TS7.0 in general and not something this feature can fix — it is not treated as a blocking requirement.
- CI pipeline configuration (if any references a specific TypeScript-related build step) is expected to keep working once the repo-wide typecheck and `next build` commands succeed locally; no CI-specific changes beyond what's needed to keep those commands working are in scope.
