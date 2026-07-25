# Feature: Enforce Conventional Commits

## Summary
Local enforcement of the [Conventional Commits](https://www.conventionalcommits.org/) spec across the monorepo, via a `commit-msg` git hook (`commitlint`) that rejects non-conforming messages, and an interactive commit CLI (`commitizen`) that prompts contributors through type/scope/subject/body selection so it's easy to produce a valid message without memorizing the format. Commit types use the standard Conventional Commits set; scopes are restricted to a fixed enum tied to the repo's current structure. A `CONTRIBUTING.md` documents the standard for contributors who commit without the CLI. This feature is local-tooling only (git hook + CLI); CI-level enforcement and automated release-notes generation are explicitly deferred to future backlog items.

## User Stories
- As a contributor, I want an interactive CLI that prompts me for type/scope/subject when committing, so I can easily "do the right thing" without memorizing the format.
- As a contributor, I want my commit rejected locally with a clear error if it doesn't follow the standard, so mistakes are caught before they enter history.
- As a maintainer, I want a written commit message standard in the repo, so contributors (and future me) have a clear reference even without the CLI.
- As a maintainer, I want commit types and scopes restricted to a known set, so history stays consistent and can support generating release notes later.

## Functional Requirements

### FR-01: Commit Message Validation (commitlint)
A `commit-msg` git hook runs `commitlint` against every commit message, rejecting (non-zero exit, commit aborted) any message that doesn't conform to Conventional Commits: `type(scope): subject`, full spec compliance (blank line before body/footer, etc.). Config lives at the repo root, extending `@commitlint/config-conventional`.

### FR-02: Type Enum
Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert` — the default set from `@commitlint/config-conventional`; no custom types added.

### FR-03: Scope Enum
Allowed scopes: `token-core`, `web-app`, `root`, `docs`, enforced via commitlint's `scope-enum` rule. `root` covers repo-root tooling/config changes not tied to a single package; `docs` covers documentation-only changes. Scope remains optional (bare `type: subject` is valid), but when present must be one of these four. The list is expected to grow as new packages are added (e.g. a future `errors` package) — updating it is a one-line config change.

### FR-04: Breaking Change Support
Both `!` before the colon (e.g. `feat(token-core)!: ...`) and a `BREAKING CHANGE:` footer are accepted as breaking-change indicators, per spec — supports future semver-aware release tooling.

### FR-05: Interactive Commit CLI (commitizen)
A `pnpm commit` command launches commitizen, prompting for type (select list), scope (select list from the same enum as FR-03), a short subject, optional longer body, and optional breaking-change/footer info, then assembles a spec-compliant commit message and commits it. Configured to share the same type/scope lists as commitlint (single source of truth — not two hand-maintained lists that can drift).

### FR-06: Automatic Hook Installation
The `commit-msg` hook installs automatically for every contributor on `pnpm install` (via a root `prepare` script), requiring no manual setup step.

### FR-07: Written Standard (CONTRIBUTING.md)
A `CONTRIBUTING.md` at the repo root documents the commit message format: structure, allowed types (with one-line descriptions), allowed scopes, breaking-change syntax, and 2-3 example commit messages. References `pnpm commit` as the recommended way to compose a commit.

## Acceptance Criteria
- [x] AC-01: A commit with a message that doesn't match `type(scope): subject` (or an empty message) is rejected by the local `commit-msg` hook with a clear error, and the commit does not complete.
- [x] AC-02: A commit using a type outside the allowed list (e.g. `feature: ...`) is rejected.
- [x] AC-03: A commit using a scope outside `token-core`/`web-app`/`root`/`docs` (e.g. `fix(random): ...`) is rejected; a commit with no scope, or with one of the four allowed scopes, is accepted (assuming the rest of the message is valid).
- [x] AC-04: A valid commit (e.g. `fix(token-core): correct $type inheritance edge case`) is accepted and completes normally.
- [x] AC-05: A commit using `!` or a `BREAKING CHANGE:` footer is accepted as a valid breaking-change commit.
- [ ] AC-06: Running `pnpm commit` launches an interactive prompt walking through type → scope → subject → body/breaking-change, and produces a commit that passes the same validation as AC-01–AC-05. — flagged in `review.md`: no automated coverage, only a partial manual smoke check.
- [ ] AC-07: A fresh clone of the repo has the hook installed automatically after `pnpm install`, with no manual step. — flagged in `review.md`: verified via simulated reinstall, not a real fresh clone.
- [x] AC-08: `CONTRIBUTING.md` exists at the repo root and documents the format, types, scopes, and breaking-change syntax, with examples.

## Technical Scope

### Affected Modules
- Repo root only — this is dev tooling, not application code. No package under `packages/*` or `apps/*` is touched.

### New Components Required
- Commitlint config at repo root, extending `@commitlint/config-conventional`, adding a `scope-enum` rule.
- Commitizen adapter config, sharing the type/scope lists with the commitlint config (likely factored into one shared config file both import, to avoid a duplicated, driftable list).
- Git hook installation tooling, wired to the root `prepare` script (exact package finalized in `plan.md`).
- `CONTRIBUTING.md` at repo root.
- New root-level `devDependencies`: `@commitlint/cli`, `@commitlint/config-conventional`, `commitizen`, a commitizen adapter, and a hook-install tool — each needs the standard Minimal Dependencies justification line in `plan.md`.

### Integration Points
- pnpm's `prepare` lifecycle script (root `package.json`) for automatic hook installation on `pnpm install`.
- Git's native `commit-msg` hook mechanism.
- No integration with existing application code or packages.

## Non-Functional Requirements
- **Performance:** commit-msg validation must run in well under a second per commit; commitlint is fast enough by default, no special handling required.
- **Security:** N/A — local dev tooling only, no new attack surface.
- **Scalability:** the scope enum is expected to grow slowly (one new package at a time); no automation needed to keep it in sync for now.

## Out of Scope
- CI-level enforcement (GitHub Actions or similar) — parked in `docs/backlog.md` under "Bootstrap CI", to be revisited once CI exists for this repo.
- Automated release-notes/changelog generation itself (e.g. wiring up `conventional-changelog` or `release-please`) — this feature only makes commit history consistent enough to support that later; generating notes is a separate future feature.
- Rewriting or linting existing historical commit messages — enforcement applies only to new commits going forward.
- Preventing the `--no-verify` bypass — inherent to git hooks; not something this feature attempts to prevent.

## Open Questions
- Exact hook-installation tool (e.g. `husky` vs. a lighter alternative) — finalize in `plan.md`.
- Exact commitizen adapter approach (off-the-shelf `cz-conventional-changelog` configured via `.czrc`, vs. a minimal custom adapter) — finalize in `plan.md`, driven by how cleanly it can share the scope enum with commitlint's config without duplicating it.
- Config file format/extension (`.cjs` vs `.mjs` vs `.ts`) — finalized in `plan.md` based on what resolves cleanly given this repo's `"type": "module"` root package.
