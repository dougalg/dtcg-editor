# Phase 1 Data Model: TypeScript v7 Upgrade

This feature has no runtime data model — it's a build-tooling version upgrade with no new entities, persistence, or data flow. The "entities" from the spec's Key Entities section are configuration artifacts, not data:

## TypeScript catalog entry

- **Location**: `pnpm-workspace.yaml`, key `catalog.typescript`
- **Current value**: `^5.9.3`
- **Target value**: `^7.0.2`
- **Consumers**: every workspace package's `package.json` `devDependencies.typescript` (or `dependencies`), all declared as `"typescript": "catalog:"` — the version resolves identically across the whole monorepo from this single entry, so there is exactly one place to change it (per repo convention documented in `CLAUDE.md`: always use `pnpm` commands to manage dependency versions, never hand-edit).

## `experimental.useTypeScriptCli` flag

- **Location**: `apps/web-app/next.config.ts`, `NextConfig.experimental.useTypeScriptCli`
- **Current value**: unset (flag absent, defaults to `false`)
- **Target value**: `true`
- **Effect**: `next build`/`next dev` type-check by spawning the project-local `tsc` CLI instead of loading Next's JS Compiler API integration (which TypeScript 7.0 no longer ships). No other fields on `NextConfig` are affected.

## Workspace package (unchanged shape)

- **Represents**: any of `apps/web-app` or `packages/{errors,token-core,token-editor-color,token-editor-contract,token-editor-dimension,design-system}` — a directory with its own `package.json`, participating in the Turborepo `build`/`lint`/`test` task graph.
- **Relevant attribute for this feature**: its `build` script (either `tsc -p tsconfig.json` [+ a CSS-copy step for `token-editor-color`], `next build`, or `sugarcube generate`) — whether that command exits 0 is the pass/fail signal for this upgrade, per spec FR-003/FR-004.
- No new packages are added or removed; no package's public API/exports change as a result of this feature (per SC-003).
