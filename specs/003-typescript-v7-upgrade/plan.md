# Implementation Plan: TypeScript v7 Upgrade

**Branch**: `worktree-typescript-v7-upgrade` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-typescript-v7-upgrade/spec.md`

## Summary

Bump the `typescript` pnpm catalog entry from `^5.9.3` to `^7.0.2` (current `latest` on npm) across the whole monorepo, enable `experimental.useTypeScriptCli` in `apps/web-app/next.config.ts` so `next build`/`next dev` type-check via the local `tsc` CLI instead of the now-missing JS Compiler API, and fix any TS7 breaking-change fallout in each workspace package's own `tsc -p tsconfig.json` build. A repo-wide audit (Phase 0) found no direct usage of the TypeScript programmatic API in first-party code, no `baseUrl`, no removed compiler options (`target: es5`, `downlevelIteration`, `moduleResolution: node/node10/classic`, `module: amd/umd/systemjs/none`), and no plain `.js`/JSDoc source files — so the upgrade is expected to be close to a pure version bump plus the one required Next.js config flag, with no TS6 alias/shim introduced anywhere.

## Technical Context

**Language/Version**: TypeScript 7.0.2 (from `^5.9.3`), repo-wide via the pnpm `catalog:` entry

**Primary Dependencies**: Next.js 16.3.1 (`apps/web-app`, already carries the `experimental.useTypeScriptCli` backport since 16.2.12), Biome 2.5.8 (lint/format — unaffected, uses its own type-inference engine, not `tsc`'s Compiler API), pnpm workspaces + Turborepo (build orchestration)

**Storage**: N/A

**Testing**: `node:test` for `packages/*`; Vitest + `@testing-library/react` (`jsdom`) plus Vitest Browser Mode (axe-core) and Playwright for `apps/web-app` — unaffected by this upgrade; `pnpm test`/`turbo run test` must continue to pass unchanged

**Target Platform**: Node.js workspace packages (library builds) + Next.js web app (browser/server)

**Project Type**: pnpm/Turborepo monorepo — one Next.js web app (`apps/web-app`) + five publishable library packages (`packages/errors`, `packages/token-core`, `packages/token-editor-color`, `packages/token-editor-contract`, `packages/token-editor-dimension`) + one non-`tsc` design-token package (`packages/design-system`, built via `sugarcube generate`, not part of this upgrade's `tsc` surface)

**Performance Goals**: N/A (build/type-check correctness, not runtime performance)

**Constraints**: `pnpm build` (via Turborepo) is the repo's sole type-checking gate (per Constitution Principle III / Development Workflow — no separate `tsc --noEmit` CI step exists); every package's `strict`-mode `tsconfig.base.json` settings (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`) must be preserved unchanged, not loosened, to satisfy TS7

**Scale/Scope**: Repo-wide — root `tsconfig.base.json`, 5 `tsc`-built library packages, 1 Next.js app; ~1 config flag change + 1 catalog version bump + any breaking-change fixes surfaced by running the builds

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle III (TypeScript Strictness)** — PASS. This upgrade does not loosen any strict flag; `research.md` confirms TS7 removes several *legacy* compiler options (`target: es5`, `downlevelIteration`, `moduleResolution: node/node10/classic`, `module: amd/umd/systemjs/none`, `baseUrl`) but none of those are in use anywhere in this repo's tsconfigs today, so no strictness regression is required to reach a green build.
- **Principle VI (Dependency Injection for I/O/Platform Externalities)** — N/A to this feature; no I/O-touching code is being added.
- **Principle VIII (Minimal Dependencies)** — PASS. No new dependency is added; `typescript` is already an approved dependency (Technology Stack list), only its version changes. `experimental.useTypeScriptCli` is a Next.js config flag, not a new package.
- **Development Workflow (CI gate)** — PASS by construction: since `pnpm build` is the sole type-checking gate, "the repo-wide typecheck command passes" (FR-003) and "`pnpm build`/`turbo run build` succeeds" are the same verification step; no new CI step is needed.
- **Observation (non-blocking)**: the constitution's "Approved dependencies" list (Technology Stack & Approved Dependencies) still names "ESLint + `typescript-eslint` (+ `eslint-config-next`)", which the already-landed Biome migration (`docs/backlog-completed.md`) replaced with Biome. That drift predates this feature and is not this feature's responsibility to fix, but is worth flagging as a follow-up constitution amendment.

No violations requiring justification — Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-typescript-v7-upgrade/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature changes build tooling/config, not any public API, CLI schema, or UI contract exposed by the project.

### Source Code (repository root)

```text
pnpm-workspace.yaml          # typescript catalog entry: ^5.9.3 -> ^7.0.2
tsconfig.base.json           # shared strict compiler options (no changes expected; re-verified in Phase 0)

apps/web-app/
├── next.config.ts           # add experimental.useTypeScriptCli: true
├── tsconfig.json            # extends tsconfig.base.json; re-verified, no removed options in use
└── package.json             # typescript: catalog: (version follows the workspace bump automatically)

packages/errors/
├── tsconfig.json
└── package.json             # build: "tsc -p tsconfig.json"

packages/token-core/
├── tsconfig.json
└── package.json             # build: "tsc -p tsconfig.json"

packages/token-editor-color/
├── tsconfig.json
└── package.json             # build: "tsc -p tsconfig.json && ..." (CSS module copy step, unaffected)

packages/token-editor-contract/
├── tsconfig.json
└── package.json             # build: "tsc -p tsconfig.json"

packages/token-editor-dimension/
├── tsconfig.json
└── package.json             # build: "tsc -p tsconfig.json"

packages/design-system/
└── package.json             # build: "sugarcube generate" — not a tsc build, out of this feature's direct build-verification scope, but still consumes `typescript` transitively if sugarcube uses it; re-verified in Phase 0
```

**Structure Decision**: No new files or directories beyond what's listed above — this is a version bump plus one Next.js config flag, applied at the existing root/`apps/web-app`/`packages/*` locations. No new packages, modules, or source directories are introduced.

## Complexity Tracking

_Not applicable — no Constitution Check violations to justify._
