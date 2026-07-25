# Feature: Bootstrap CI (GitHub Actions)

## Summary
Add a GitHub Actions workflow that runs the monorepo's existing `build`, `lint`, and `test` Turborepo pipelines on every pull request into `main` and on every push to `main`, giving the project its first automated CI signal. This closes the "Bootstrap CI" backlog item's build/lint/test scope. The backlog item's other half — CI-level conventional commit enforcement — is explicitly deferred (see Out of Scope); the repo's local `commit-msg` hook remains the only enforcement point for now.

## User Stories
- As a maintainer, I want every PR to automatically run the build, lint, and test suite so that I catch regressions before merging, without having to run them locally every time.
- As a maintainer, I want a push directly to `main` (e.g. a hotfix or an accidental bypass of PR review) to also run the same checks, so `main` never silently accumulates a broken build.
- As a contributor, I want CI failures to clearly show which of build/lint/test failed so I can fix the right thing quickly.

## Functional Requirements

### FR-01: Workflow triggers
A GitHub Actions workflow runs on:
- `pull_request` events targeting the `main` branch.
- `push` events to the `main` branch.

### FR-02: Toolchain setup
The workflow installs Node.js and pnpm matching the versions the repo already declares:
- Node.js version pinned to a single LTS version (Node 22, matching the `@types/node` major already used across packages; the `engines.node: ">=20"` floor in the root `package.json` remains the documented minimum for consumers, but CI itself runs one fixed version rather than a matrix, since no matrix was requested).
- pnpm installed via Corepack so the version always matches the root `package.json`'s `packageManager` field (`pnpm@10.33.0`) instead of being pinned a second time in the workflow file.

### FR-03: Dependency install
The workflow installs dependencies with `pnpm install --frozen-lockfile`, so CI fails fast if `pnpm-lock.yaml` is out of sync with the manifests instead of silently re-resolving.

### FR-04: Build, lint, test
The workflow runs the three existing root scripts, each as its own step so a failure clearly identifies which stage broke:
- `pnpm build`
- `pnpm lint`
- `pnpm test`

All three already fan out correctly across the monorepo via Turborepo (including the root-only `//#lint:root` and `//#test:commits` tasks wired into `turbo.json`), so no new per-package scripts are required.

### FR-05: Type checking
No separate typecheck step is added. `pnpm build` already performs full type checking as a side effect in every package:
- `packages/token-core` and `packages/errors` build via `tsc -p tsconfig.json`, which type-checks the whole package before emitting.
- `apps/web-app` builds via `next build`, which type-checks by default (`next.config.ts` does not set `typescript.ignoreBuildErrors`).

A regression in any package's types therefore already fails `pnpm build` in CI without extra configuration.

### FR-06: Caching
The workflow caches the pnpm store (keyed on the lockfile hash) to keep install times low across runs. Turborepo remote caching is not configured (no remote cache service exists yet, and the Minimal Dependencies constraint means one isn't added speculatively for this feature).

## Acceptance Criteria
- [x] AC-01: A workflow file exists at `.github/workflows/ci.yml`.
- [x] AC-02: The workflow triggers on `pull_request` targeting `main` and on `push` to `main`.
- [x] AC-03: The workflow sets up Node.js and pnpm (via Corepack, reading `packageManager` from `package.json`) with pnpm store caching enabled.
- [x] AC-04: The workflow runs `pnpm install --frozen-lockfile`, then `pnpm build`, `pnpm lint`, and `pnpm test` as distinct steps.
- [ ] AC-05: A failure in any one of build/lint/test fails the overall workflow run and is attributable to the specific step in the GitHub Actions UI. (Structurally satisfied — no `continue-on-error` set — but not yet confirmed on a live GitHub Actions run; see `review.md`.)
- [ ] AC-06: A deliberately broken build (e.g. a type error), a deliberate lint violation, and a deliberately failing test each independently fail the workflow when verified locally via `act` or by inspection of step-level `continue-on-error` behavior (none should be set — every step must be blocking). (Live verification explicitly deferred by user during `/sdd-implement`; see `review.md`.)
- [x] AC-07: The workflow does not lint commit messages or otherwise enforce Conventional Commits — that stays local-only via the existing husky `commit-msg` hook.
- [ ] AC-08: `docs/project.md`'s Tech Stack / Conventions sections are updated to note CI now exists and where the workflow lives (handled at `/sdd-archive` time per the existing pattern, not during implementation — noted here for completeness).

## Technical Scope

### Affected Modules
- Repo root only: new `.github/workflows/` directory. No changes to `packages/*` or `apps/*` source.

### New Components Required
- `.github/workflows/ci.yml`

### Integration Points
- Root `package.json` scripts (`build`, `lint`, `test`) — consumed as-is, not modified.
- `turbo.json` — consumed as-is; already wires root-level tasks (`//#lint:root`, `//#test:commits`) into the top-level `lint`/`test` pipelines.
- `pnpm-lock.yaml` / `packageManager` field — read by the workflow's toolchain-setup step.

## Non-Functional Requirements
- Performance: pnpm store caching keeps typical CI run time low; no other performance target set.
- Security: workflow uses only official `actions/checkout`, `actions/setup-node` (or `pnpm/action-setup`), and pnpm's own caching support — no third-party actions beyond what's needed for Node/pnpm setup, consistent with the Minimal Dependencies constraint applied to tooling as well as package dependencies.
- Scalability: single fixed Node version, no matrix; revisit if the project later needs to support multiple Node majors.

## Out of Scope
- CI-level Conventional Commit enforcement (linting actual commit messages/PR commit range in CI). Explicitly deferred by the user for this feature; remains a candidate for a future backlog item if the local `commit-msg` hook proves insufficient (e.g. someone bypasses it with `--no-verify`).
- Turning on GitHub branch protection / required status checks for the `main` branch. The user will configure this manually in repo settings once the workflow exists.
- Turborepo remote caching.
- A Node.js version matrix (multiple Node majors tested in parallel).
- Any changes to package-level `build`/`lint`/`test` scripts — this feature only wires up CI around the scripts that already exist.

## Open Questions
- None outstanding; all clarified in feature-scoping discussion (trigger scope = both PR and push to `main`; build/lint/test only, with type checking already covered by `build`; commit-message enforcement explicitly skipped; branch protection left as a manual step for the user).
