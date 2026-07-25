# Implementation Plan: Bootstrap CI (GitHub Actions)

## Overview
This is a pure infra addition: one new GitHub Actions workflow file at `.github/workflows/ci.yml` that wraps the monorepo's existing `pnpm build` / `pnpm lint` / `pnpm test` scripts. No application code, package, or script changes are required — the workflow only orchestrates commands that already work locally. The template's Database/Domain/Service/API layer steps don't apply here, so the steps below are re-scoped to: workflow scaffold → toolchain setup → pipeline steps → verification → (docs deferred to `/sdd-archive` per the repo's established pattern, not done here).

## Architecture Decisions
- **Corepack over a third-party pnpm action.** Use `corepack enable` (built into Node ≥16.9, already present on GitHub-hosted runners) to install the exact pnpm version pinned in `package.json`'s `packageManager` field, rather than adding `pnpm/action-setup` as a dependency. This keeps the workflow's action surface to only `actions/checkout` and `actions/setup-node` — both maintained by GitHub — consistent with the Minimal Dependencies constraint applied to CI tooling, not just npm packages. Fallback noted in Risks if Corepack proves unreliable.
- **`actions/setup-node`'s built-in pnpm cache, not manual `actions/cache`.** `actions/setup-node@v4` accepts `cache: 'pnpm'`, which shells out to `pnpm store path` to locate and cache the store, keyed on `pnpm-lock.yaml`'s hash. This requires pnpm to already be on `PATH` when `setup-node` runs, so `corepack enable` must run *before* the `setup-node` step, not after.
- **Three separate step entries for build/lint/test**, each just `pnpm <script>`, rather than one combined command. This mirrors FR-04/AC-05: a failure must be attributable to a specific step in the Actions UI, and combining them into e.g. `pnpm build && pnpm lint && pnpm test` would collapse that signal into one step.
- **Single fixed Node version (22), no matrix.** Matches the `@types/node@^22` already used across every package; `engines.node: ">=20"` remains the documented floor for consumers of the published packages, not the CI runtime itself. Confirmed with the user during `/sdd-feature` that a matrix isn't wanted for this feature.
- **No dedicated typecheck step.** Verified during `/sdd-feature` that `packages/token-core` and `packages/errors`'s `tsc -p tsconfig.json` build step, and `apps/web-app`'s `next build` (no `typescript.ignoreBuildErrors` set in `next.config.ts`), each already type-check as a side effect of `pnpm build`. Adding a separate `tsc --noEmit` step would be redundant work against the same source.

## Implementation Steps

### Step 1: Workflow scaffold and triggers
- [x] Create `.github/workflows/ci.yml` with a `name:` and the trigger block from FR-01:
  ```yaml
  on:
    pull_request:
      branches: [main]
    push:
      branches: [main]
  ```
- [x] Define a single job (e.g. `ci`) running on `ubuntu-latest`.
- Files to create: `.github/workflows/ci.yml`

### Step 2: Toolchain setup
- [x] Add `actions/checkout@v4` as the first step.
- [x] Add a `corepack enable` run-step immediately after checkout (FR-02 — activates the exact pnpm version from `packageManager` in `package.json`, no version pinned a second time in the workflow).
- [x] Add `actions/setup-node@v4` with `node-version: '22'` and `cache: 'pnpm'` (FR-02, FR-06 — this step must come after `corepack enable` so pnpm is resolvable on `PATH` for cache-path detection).
- Files to modify: `.github/workflows/ci.yml`

### Step 3: Install and pipeline steps
- [x] Add a step running `pnpm install --frozen-lockfile` (FR-03).
- [x] Add three separate steps, each running one root script in order — `pnpm build`, `pnpm lint`, `pnpm test` (FR-04). No `continue-on-error` on any step, so any failure stops the job and fails the check (AC-05).
- Files to modify: `.github/workflows/ci.yml`

### Step 4: Verification
- [x] Local sanity check (not a substitute for live Actions verification, but confirms the exact commands the workflow runs are green): `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm test` all passed locally against the current codebase.
- [ ] **Deferred by user request** — live GitHub verification (scratch branch + throwaway PR, deliberate build/lint/test breakages each confirmed to independently red-X the correct step, cache-hit check on a second run) was not performed in this session. The user will verify live once this feature's PR/merge to `main` triggers the workflow for real. AC-06 (each check independently fails on a deliberate break) and the cache-hit behavior are therefore unverified as of this implementation pass.
- Files: none (verification-only; no source changes survive this step)

## Acceptance Criteria Mapping
| AC | Verified By |
|----|-------------|
| AC-01: workflow file exists at `.github/workflows/ci.yml` | Step 1 — file present in the PR diff |
| AC-02: triggers on PR→`main` and push→`main` | Step 1 — `on:` block; confirmed live in Step 4's scratch PR/push |
| AC-03: Node + pnpm setup via Corepack, with pnpm cache | Step 2 — `corepack enable` + `actions/setup-node` with `cache: 'pnpm'` |
| AC-04: frozen-lockfile install, then build/lint/test as distinct steps | Step 3 |
| AC-05: a failure in any step fails the run and is attributable to that step | Step 3 (no `continue-on-error`); confirmed in Step 4 |
| AC-06: each of build/lint/test independently fails on a deliberate break | Step 4 — three throwaway-commit checks |
| AC-07: no commit-message linting added | Step 1/3 — absent by construction; confirmed by workflow file containing no commitlint invocation |
| AC-08: `docs/project.md` updated to note CI's existence | Deferred to `/sdd-archive`, per this repo's established pattern (see `docs/project.md`'s Features entries, each written at archive time) — not part of this implementation step |

## Risks & Mitigations
- Risk: `corepack enable` occasionally fails on GitHub-hosted runners due to npm registry signature-verification issues with newer Corepack releases. → Mitigation: if Step 4 verification hits this, fall back to `pnpm/action-setup@v4` (which reads `packageManager` the same way) instead of debugging Corepack further; note the swap as a deviation if it happens.
- Risk: `actions/setup-node`'s `cache: 'pnpm'` silently no-ops (falls back to no caching) if pnpm isn't on `PATH` yet when it runs. → Mitigation: Step 2 explicitly orders `corepack enable` before `setup-node`; verified live in Step 4 by checking the cache-hit log line on a second run.
- Risk: FR-05's "no separate typecheck step" assumption breaks silently if someone later adds `typescript.ignoreBuildErrors: true` to `apps/web-app/next.config.ts`, letting type errors slip through `pnpm build` unnoticed. → Mitigation: none automated in this feature (would be scope creep); flagged here so a future contributor/reviewer knows this is a load-bearing assumption, not an oversight.

## Estimated Complexity
Low — one new YAML file, no application code touched, no new dependencies, and a well-established GitHub Actions + pnpm pattern. The only real risk surface is Corepack's runner behavior, mitigated with a documented fallback.
