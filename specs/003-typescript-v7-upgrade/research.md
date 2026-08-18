# Phase 0 Research: TypeScript v7 Upgrade

## Decision: Target TypeScript version

**Decision**: `^7.0.2` (npm `latest` dist-tag as of 2026-08-18; there is no `7.0.3`+ and `7.1.0` is only available as nightly `-dev` prereleases).

**Rationale**: `docs/research/typescript-v7-upgrade-path.md` (prior backlog research) already established that the repo's real blocker was `typescript-eslint`'s `<6.1.0` peer range — resolved by the already-landed Biome migration (`docs/backlog-completed.md`) — and that Next.js 16.2.12+ (the repo is on 16.3.1) ships a working, if experimental, TS7 build path via `experimental.useTypeScriptCli`. No reason remains to wait for TS7.1.

**Alternatives considered**: Staying on TS6 with a `@typescript/typescript6` compatibility alias (Microsoft's own documented interim pattern for tools needing the removed Compiler API) — rejected per spec FR-007/Assumptions: the repo has no first-party code that touches the TypeScript programmatic API (confirmed below), so there is nothing that needs the alias, and introducing one would be an unnecessary permanent shim for a problem the repo doesn't have.

## Decision: TypeScript 7.0 breaking changes relevant to this repo

**Decision**: Adopt the full TS7.0 breaking-change list from Microsoft's official "Announcing TypeScript 7.0" devblog and cross-check it against every tsconfig in the repo. None of the removed/changed options are currently in use, so no compiler-option migration is required beyond the version bump itself.

**Rationale** (per-item audit against `tsconfig.base.json`, `apps/web-app/tsconfig.json`, and all five `packages/*/tsconfig.json`):

| TS7 breaking change | Repo usage found | Action needed |
| --- | --- | --- |
| `target: es5` removed | `target: "ES2022"` (base), `target: "ES2017"` (web-app) | None |
| `downlevelIteration` removed | Not set anywhere | None |
| `moduleResolution: node/node10/classic` removed | `NodeNext` (base), `bundler` (web-app) | None |
| `module: amd/umd/systemjs/none` removed | `NodeNext` (base), `esnext` (web-app) | None |
| `baseUrl` removed | Not set anywhere (web-app uses `paths: {"@/*": ["./*"]}`, which is root-relative already and does not depend on `baseUrl`) | None |
| `esModuleInterop`/`allowSyntheticDefaultImports` must be `true` | Both already `true` in base | None |
| `alwaysStrict` can no longer be `false` | `strict: true` everywhere (implies `alwaysStrict: true`) | None |
| `rootDir` now defaults to `./` (was implicit) | Every `packages/*/tsconfig.json` already sets `"rootDir": "."` explicitly | None |
| `types` now defaults to `[]` (was implicit `["*"]`) | Every `packages/*/tsconfig.json` already sets `"types": ["node"]` explicitly; web-app doesn't set `types` but relies on Next's plugin + ambient `next-env.d.ts`, not global `@types/*` resolution — re-verify after bump that no ambient type (e.g. `@types/node` in web-app) silently stops resolving | Re-verify during implementation; low risk, may need explicit `"types": ["node"]` added to `apps/web-app/tsconfig.json` if any error surfaces |
| `stableTypeOrdering` forced `true` | N/A — not user-configurable either way | None |
| `module` keyword banned inside `namespace` declarations | No `namespace`/`module` declarations found in first-party `.ts`/`.tsx` source | None |
| `asserts` keyword banned on imports (must use `with`) | No import-assertion usage found | None |
| `/// <reference no-default-lib />` no longer respected under `skipDefaultLibCheck` | Not used anywhere | None |
| CLI file-path args require `--ignoreConfig` when a `tsconfig.json` is present | Only affects ad hoc `tsc <file>` invocations, not `tsc -p tsconfig.json` (used by every package's `build` script) or `next build` | None |
| JS/JSDoc special-case removals (`@enum`, postfix `!`, `@class`, standalone `?`, Closure-style functions) | No plain `.js` source files exist in `apps/web-app` or `packages/*` (confirmed by repo-wide search) | None |
| No programmatic Compiler API in 7.0 (`lib/typescript.js` removed) | No first-party code imports from `"typescript"` (confirmed by repo-wide search) | None directly; addressed at the tooling level by `experimental.useTypeScriptCli` (see below) |

**Alternatives considered**: Doing a blind version bump and fixing whatever breaks — rejected in favor of this upfront audit because Constitution Principle III requires strictness to never be silently loosened to paper over an upgrade; knowing in advance that no option needs to change means any type error that does surface during implementation is a genuine type-correctness issue (per spec FR-006), not a compiler-option casualty.

## Decision: Next.js TS7 build path

**Decision**: Set `experimental.useTypeScriptCli: true` in `apps/web-app/next.config.ts`.

**Rationale**: Next.js 16.2.12+ (repo is on 16.3.1, confirmed via `apps/web-app/package.json`) ships this flag, which makes `next build`/`next dev` shell out to the project-local `tsc` CLI instead of loading the removed JS Compiler API — this is Next's own documented, accepted (if experimental) fix for TS7, per `docs/research/typescript-v7-upgrade-path.md` and Next's own `useTypeScriptCli` config reference and "Using TypeScript 7" doc section. The flag is opt-in and not auto-enabled; omitting it reproduces exactly the "TypeScript 7.0.2 does not provide the compiler API required by Next.js" error the backlog item was originally blocked on.

**Alternatives considered**: Waiting for TS7.1's new API (no committed ship date; independent estimates suggest Oct–Nov 2026, purely speculative) — rejected, matches the already-accepted decision recorded in the backlog item and spec Assumptions. Aliasing `typescript6` for the build (Next's own documented interim workaround before the CLI flag existed) — rejected as unnecessary now that the CLI flag is stable-shipped and the repo has no code relying on the old API path.

## Decision: Biome (lint/format) compatibility

**Decision**: No Biome-specific changes needed; verify by running `pnpm lint`/`biome check` post-bump as part of implementation (User Story 2 acceptance test), not by any config change made in this plan.

**Rationale**: Biome's own docs and architecture describe an independent, native (Rust) type-inference engine that never loads `tsc`'s JS Compiler API — this is precisely why the Biome migration (`docs/backlog-completed.md`) is recorded as removing the `typescript-eslint` blocker "since Biome's own type-inference engine never touches `tsc`'s Compiler API." The same property that unblocked TS7 for linting in the first place means the linter itself has no TS7-version dependency to break.

**Alternatives considered**: None — this is a verification step, not a design decision with real alternatives.

## Decision: `packages/design-system` (`sugarcube generate`)

**Decision**: Treat as in-scope for verification (must still run successfully post-bump) but not for direct code changes — it's a third-party CLI (`@sugarcube-sh/cli`), not a `tsc`-driven build.

**Rationale**: `packages/design-system`'s `build` script is `sugarcube generate`, not `tsc`; it has no direct `typescript` build step of its own to migrate. Whether it transitively resolves `typescript` from the workspace (and whether that matters to its own operation) is a third-party-tool question to confirm empirically during implementation rather than a design decision to make now.

**Alternatives considered**: Excluding it from the upgrade's verification scope entirely — rejected, since spec FR-003 requires the repo-wide typecheck/build to be verified, and a broken `sugarcube generate` step would still break `turbo run build` for the workspace as a whole (Turborepo's `build` task depends on `^build`, i.e. all workspace packages' build scripts, including this one).

## Resolved NEEDS CLARIFICATION markers

None — the spec was authored with no `[NEEDS CLARIFICATION]` markers (see `checklists/requirements.md`); all Technical Context fields above are resolved from direct repo inspection and the two research sources cited (Microsoft's TS7.0 announcement, prior repo research doc), not left open.
