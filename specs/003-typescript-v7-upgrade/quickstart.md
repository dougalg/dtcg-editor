# Quickstart: Validating the TypeScript v7 Upgrade

## Prerequisites

- In this worktree (`.claude/worktrees/typescript-v7-upgrade`), on branch `worktree-typescript-v7-upgrade`.
- `pnpm install` has been run after the `typescript` catalog entry (`pnpm-workspace.yaml`) is bumped to `^7.0.2` (see `data-model.md`), so `node_modules/typescript` resolves to a 7.x install everywhere in the workspace.
- No `@typescript/typescript6` (or similar) alias present anywhere in `pnpm-lock.yaml` — grep for `typescript6` in the lockfile and expect zero matches (spec FR-007).

## Setup

```sh
pnpm add -Dw typescript@^7.0.2 --filter '*'   # or: bump the catalog entry directly and run `pnpm install`, per repo convention (CLAUDE.md: always use pnpm commands, never hand-edit dependency versions)
pnpm install
```

Then edit `apps/web-app/next.config.ts` to add `experimental: { useTypeScriptCli: true }` (see `data-model.md` for the exact field).

## Validation scenarios

### 1. Repo-wide typecheck/build (User Story 1, FR-001–FR-004, SC-001–SC-003)

```sh
pnpm build
```

**Expected outcome**: `turbo run build` completes with exit code 0 across every workspace package — `apps/web-app` (`next build`, using the CLI-shim path), `packages/errors`, `packages/token-core`, `packages/token-editor-color`, `packages/token-editor-contract`, `packages/token-editor-dimension` (each `tsc -p tsconfig.json`), and `packages/design-system` (`sugarcube generate`). Zero TypeScript errors. This is the repo's sole type-checking gate (Constitution Development Workflow), so a green `pnpm build` is equivalent to "the repo-wide typecheck command passes."

### 2. Lint/format still works (User Story 2, FR-005)

```sh
pnpm lint
pnpm format:check
```

**Expected outcome**: Both complete successfully with the same set of enforced rules as before the upgrade (Biome's Dependency Injection for I/O/Platform Externalities rules, formatting checks) — no crash, no silently-skipped rule caused by the TypeScript version bump.

### 3. Test suite unaffected (spec Technical Context / Testing)

```sh
pnpm test
```

**Expected outcome**: `node:test` suites (`packages/*`) and Vitest + Playwright suites (`apps/web-app`, including the axe-core accessibility checks) all pass exactly as before — this upgrade touches build/type-checking, not runtime behavior, so no test outcome should change.

### 4. No TS6 shim introduced (FR-007)

```sh
grep -n "typescript6" pnpm-lock.yaml
```

**Expected outcome**: no matches — confirms the upgrade did not fall back to Microsoft's documented TS6-alias workaround anywhere in the dependency tree.

### 5. Breaking-change traceability (User Story 3, FR-006, SC-005)

Review the diff introduced by this feature. Every changed line should be one of:
- The `typescript` catalog version bump itself (`pnpm-workspace.yaml`, and lockfile churn).
- The `experimental.useTypeScriptCli: true` addition in `apps/web-app/next.config.ts`.
- A source-code fix directly traceable to an item in `research.md`'s breaking-change table (expected: none, per that table's audit — but if TS7 surfaces an error not predicted there, the fix and its cause should be noted in the PR description).

**Expected outcome**: no unexplained source changes; the research.md table's "Action needed: None" predictions hold, or any exception is documented.
