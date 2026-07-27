# Feature: CI-Level Conventional Commit Enforcement

## Summary
Add a CI step to the existing GitHub Actions workflow (`.github/workflows/ci.yml`) that lints the *actual* commit messages introduced by a pull request against the repo's existing commitlint config (`commitlint.config.cjs` / `commit-conventions.cjs`), closing the gap left by the Bootstrap CI feature. Today, Conventional Commit compliance is enforced only by the local husky `commit-msg` hook — which can be bypassed with `git commit --no-verify`, skipped entirely if a contributor commits without `pnpm install` having run, or sidestepped via GitHub's web UI — and by `pnpm test`'s `//#test:commits` task, which only re-validates that the commitlint *config itself* behaves correctly against a handful of fixed example strings (`commit-conventions.test.cjs`), never against real commit history. This feature adds a CI-side backstop that inspects the real commits in a PR (or push) and fails the build if any of them don't conform, independent of whether the local hook ran.

All design points that originally depended on repo-owner decisions have now been answered by the human — see **Resolved Decisions** (replacing the former Open Questions section) below. In summary: this repo rebase-merges PRs into `main`, so every individual commit lands on `main`'s permanent history; the check runs on both `pull_request` and `push` events; ordinary merge commits are excluded from linting and forbidden by policy (contributors must rebase instead); the invocation is hand-rolled against the existing `commitlint` CLI rather than a third-party Action; branch protection remains a manual follow-up outside this feature; and the pre-existing scope-list drift this spec flagged turned out to already be fixed on `main` prior to this feature branch.

## User Stories
- As a maintainer, I want CI to reject a PR containing a non-conventional commit message, so that history stays consistent even if a contributor bypassed or never installed the local git hook.
- As a maintainer, I want the CI failure to clearly show *which* commit(s) and *why* they failed (mirroring the existing local hook's commitlint output), so a contributor can fix the message without guesswork.
- As a contributor, I want this check to use the exact same rules as my local `commit-msg` hook (same `commitlint.config.cjs`), so I never see CI reject something my local hook accepted, or vice versa.

## Functional Requirements

### FR-01: New CI step lints real commit messages
The existing `.github/workflows/ci.yml` gains a new step (or a new job) that runs the repo's existing `commitlint` binary (already a `devDependency` via `@commitlint/cli`) against the actual commit messages in scope for the run, using the existing root `commitlint.config.cjs`. No new commitlint config is introduced — this reuses the exact config the local hook and `test:commits` already use, so the three enforcement points (local hook, config unit tests, CI) can never drift apart.

### FR-02: Commit range for `pull_request` events
For a `pull_request` trigger, the step lints every commit in the PR's range (base commit exclusive, head commit inclusive) via `commitlint --from <base-sha> --to <head-sha>`, using `actions/checkout`'s ability to fetch enough history (e.g. `fetch-depth: 0` or a depth sufficient to reach the merge-base) so the range resolves correctly. This requires `github.event.pull_request.base.sha` / `github.event.pull_request.head.sha` (or equivalent) to be available to the step.
- **Resolved (was Open Question 2 / 3):** this repo rebase-merges PRs into `main` (confirmed by the human), so every individual commit in the PR range lands on `main`'s permanent history — this strongly justifies linting every commit in the range as designed here, and makes PR-title linting (relevant only under squash-merge) not applicable. Ordinary `git merge` commits within a PR branch (e.g. "Merge branch 'main' into feature/x") are excluded from linting rather than required to pass conventional-commit rules — see FR-07 for the accompanying policy/docs change forbidding them outright. Mechanically, commitlint applies its own default ignore patterns (via `@commitlint/config-conventional`, not disabled by this repo's `commitlint.config.cjs`) which already skip common auto-generated messages including merge commits, so no extra flag or custom logic is needed to achieve the exclusion in FR-02/FR-03's invocation — `plan.md` should still verify this behavior explicitly rather than assume it silently.

### FR-03: Commit range for `push` events
**Resolved (was Open Question 1):** yes, the check also runs on `push` events to `main`, in addition to `pull_request` — the existing `ci.yml` `push: branches: [main]` trigger exists to catch direct pushes/hotfixes that bypass PR review, and this check should apply there for the same reason. The range linted is the pushed commits: `commitlint --from <github.event.before> --to <github.event.after>`. `plan.md` should account for the edge case where `before` is the all-zeros SHA (e.g. a new branch's first push) since `main` already exists this is expected to be rare in practice, but should not be left unhandled.

### FR-04: Failure behavior
A non-conforming commit message causes the CI step (and therefore the overall workflow run) to fail with a non-zero exit code, surfaced in the GitHub Actions UI the same way `pnpm build`/`lint`/`test` failures are today (FR-05 of the Bootstrap CI feature). The step's output includes commitlint's own per-commit error output (rule name + message), not just a generic pass/fail, so a contributor can see exactly which commit and which rule failed without needing to reproduce the check locally.

### FR-05: No new commit-message-format changes
This feature does not change what counts as a valid commit message — `commitlint.config.cjs` and `commit-conventions.cjs` (types/scopes) are consumed as-is.
- **Resolved (was Open Question 6):** the `docs`-scope discrepancy this spec originally flagged between `CONTRIBUTING.md`'s scope table and `commit-conventions.cjs`'s `scopes` array turns out to already be fixed on `main`, prior to this feature branch — commit `9005d5a` ("fix(root): remove redundant docs scope from conventional commit config") removed it, and that commit is an ancestor of this branch's current `HEAD`. Verified directly: `CONTRIBUTING.md`'s Scopes table and `commit-conventions.cjs`'s `scopes` array both currently list only `token-core`/`web-app`/`root` — no drift exists. The human asked for this to be "fixed as part of this feature," but there is nothing left to fix; this is now a no-op regression check (AC-07) rather than a code change, and is called out explicitly so the discrepancy isn't reintroduced by accident.

### FR-06: No change to local enforcement
The husky `commit-msg` hook and `pnpm commit` (commitizen) CLI are unchanged. This feature is additive — a second, CI-side enforcement point — not a replacement for local enforcement.

### FR-07: Contributor docs forbid merge commits in feature branches
**Resolved (was part of Open Question 2):** since merge commits are excluded from CI linting (FR-02) rather than validated, `CONTRIBUTING.md` (or wherever contributor workflow is documented) is updated to explicitly state that merge commits are forbidden in feature branches and that contributors must rebase onto `main` instead of merging it in. This closes the gap defensively: the CI lint tolerates/excludes merge commits (so they can't cause false-positive failures), but the accompanying policy means contributors shouldn't be relying on that exclusion in normal practice — it's a backstop, not an invitation to merge freely.

## Acceptance Criteria
- [ ] AC-01: A PR containing a commit whose message doesn't conform to `commitlint.config.cjs` (e.g. wrong type, out-of-enum scope, missing subject) fails CI, with the failing step's log showing which commit and which commitlint rule failed.
- [ ] AC-02: A PR where every commit conforms passes this new CI step (no false positives on well-formed commits).
- [ ] AC-03: A PR containing a normal `git merge`-generated merge commit (e.g. from merging `main` into the feature branch) does not spuriously fail CI — merge commits are excluded from linting (FR-02).
- [ ] AC-04: The new CI step reuses `commitlint.config.cjs` directly (no duplicated/parallel rule definitions) — verified by inspecting the workflow step's invocation.
- [ ] AC-05: The existing local `commit-msg` hook, `pnpm commit` CLI, and `test:commits` task continue to work unchanged (regression check — this feature adds to `ci.yml` only).
- [ ] AC-06: `docs/project.md` is updated at `/sdd-archive` time to note CI now also lints real commit messages, per the existing pattern used for prior features.
- [ ] AC-07: `CONTRIBUTING.md`'s Scopes table and `commit-conventions.cjs`'s `scopes` array are verified to still match (no `docs`-scope drift reintroduced) — a regression check only; no code change is expected since `9005d5a` already fixed this prior to this branch (FR-05).
- [ ] AC-08: A direct `push` to `main` containing a non-conforming commit message fails CI the same way a PR would (FR-03); a `push` to `main` where all pushed commits conform passes.
- [ ] AC-09: `CONTRIBUTING.md` (or the relevant contributor-workflow doc) states that merge commits are forbidden in feature branches and that contributors must rebase onto `main` instead (FR-07).
- [ ] AC-10: The commitlint invocation is hand-rolled against the existing `@commitlint/cli` devDependency — no third-party GitHub Action is introduced (FR-02/FR-03, Technical Scope).

## Technical Scope

### Affected Modules
- Repo root: `.github/workflows/ci.yml` (modified) and `CONTRIBUTING.md` (modified, FR-07). No changes to `packages/*` or `apps/*`, and no changes to `commitlint.config.cjs` or `commit-conventions.cjs`.

### New Components Required
- A new step (or job) in `.github/workflows/ci.yml` invoking `commitlint` with an appropriate commit range, for both `pull_request` and `push` events (FR-02/FR-03).
- An adjustment to the existing `actions/checkout` step's `fetch-depth` (currently unset/default, which is a shallow clone of depth 1 — insufficient to resolve a PR's merge-base or a push's prior SHA for a multi-commit range). This is an existing-step modification, not a new component.
- **Resolved (was Open Question 5):** hand-rolled, not a third-party Action. No new npm dependency — `@commitlint/cli` is already a `devDependency` and already the binary the local hook calls (`commit-conventions.test.cjs` already resolves it at `node_modules/.bin/commitlint`). This is confirmed feasible: `github.event.pull_request.base.sha`/`head.sha` and `github.event.before`/`after` give the needed ranges directly from GitHub Actions' event context without extra range-computation logic, and merge-commit exclusion (FR-02) is already handled by commitlint's own default ignore patterns rather than requiring bespoke logic. This stays consistent with Bootstrap CI's GitHub-actions-only precedent — no `wagoid/commitlint-github-action` or similar third-party Action is introduced.
- A `CONTRIBUTING.md` update (FR-07) documenting the no-merge-commits-in-feature-branches / rebase-required policy.

### Integration Points
- `commitlint.config.cjs` / `commit-conventions.cjs` — read as-is, not modified.
- `.github/workflows/ci.yml` — the file being extended.
- `CONTRIBUTING.md` — updated with the merge-commit/rebase policy (FR-07).
- GitHub Actions' `pull_request` event context (`github.event.pull_request.base.sha`/`head.sha`) for computing the PR-range.
- GitHub Actions' `push` event context (`github.event.before`/`github.event.after`) for computing the push-range.
- Branch protection / required status checks: confirmed out of scope for this feature (see Out of Scope) — no integration point here.

## Non-Functional Requirements
- **Performance:** Linting a PR's commit range via the local `commitlint` CLI is fast (sub-second per commit, consistent with the Non-Functional notes in the Enforce Conventional Commits feature); no caching or optimization concerns beyond what `ci.yml` already does for `pnpm install`.
- **Security:** No new attack surface — the hand-rolled CLI approach (Resolved, was Open Question 5) reuses an already-vetted, already-a-devDependency binary rather than introducing a third-party Action.
- **Scalability:** No concerns — commit ranges in this repo's PRs are expected to stay small; no matrix or parallelization needed.

## Out of Scope
- Any change to what constitutes a valid commit message (type/scope enums, subject rules) — reuses `commitlint.config.cjs` unchanged.
- Configuring GitHub branch protection / required status checks to make this new CI check mandatory for merge — **resolved (was Open Question 4):** confirmed out of scope; the human will wire up branch protection manually, consistent with Bootstrap CI's precedent.
- Linting or otherwise validating the PR title itself — **resolved (was tied to Open Question 3):** this repo rebase-merges PRs, so PR-title linting (only relevant under squash-merge) does not apply here; not pursued as part of or alongside this feature.
- Rewriting or retroactively linting existing historical commits — enforcement is prospective only (consistent with the local-hook feature's existing "Out of Scope" precedent).
- Any change to the local husky hook, `pnpm commit` CLI, or their configuration.
- Any code change to `commit-conventions.cjs` or `CONTRIBUTING.md`'s Scopes table for the `docs`-scope drift — **resolved (was Open Question 6):** already fixed on `main` prior to this branch (commit `9005d5a`); see FR-05 and AC-07 for the regression-check-only follow-up.

## Resolved Decisions
*(Replaces the former Open Questions section — all 6 items below were open pending a decision from the repo owner/human; all are now settled.)*

1. **Push-to-main scope — resolved:** Yes, `push` events to `main` also run this check, linting the pushed range (`github.event.before`...`github.event.after`). See FR-03, AC-08.

2. **Merge-commit handling within a PR range — resolved:** Ordinary `git merge` commits are excluded from linting (defensively tolerated, not validated), **and** `CONTRIBUTING.md` is updated to forbid merge commits in feature branches and require rebasing onto `main` instead. Two parts: (a) CI lint logic tolerates/excludes merge commits (FR-02), (b) contributor-facing docs state the rebase-required policy (FR-07, AC-09).

3. **GitHub merge-button strategy — resolved:** This repo rebase-merges PRs into `main`. Every individual commit in a PR lands on `main`'s permanent history, which confirms FR-02's design (lint every commit in the range) and confirms PR-title linting is not the relevant control here (see Out of Scope).

4. **Required-status-check / branch protection — resolved:** Left out of scope for this feature's implementation; the human will configure branch protection manually, consistent with Bootstrap CI's precedent.

5. **Third-party GitHub Action vs. hand-rolled CLI invocation — resolved:** Hand-rolled against the existing `@commitlint/cli` devDependency, not a third-party Action — confirmed feasible given the rebase-merge strategy: `base.sha`/`head.sha` (PR) and `before`/`after` (push) SHAs are directly available from GitHub Actions' event context, and commitlint's built-in default ignore patterns already exclude merge-commit-style messages without extra logic. Stays consistent with Bootstrap CI's GitHub-actions-only precedent (AC-10).

6. **Pre-existing scope-list drift — resolved, but moot:** Investigation before making this edit found the `docs`-scope discrepancy this spec originally flagged no longer exists — it was already fixed on `main` by commit `9005d5a` ("fix(root): remove redundant docs scope from conventional commit config"), which is an ancestor of this feature branch's current `HEAD`. `CONTRIBUTING.md`'s Scopes table and `commit-conventions.cjs`'s `scopes` array both currently list only `token-core`/`web-app`/`root`. The human asked for this to be "fixed as part of this feature," but there was nothing left to fix by the time this branch started; treated as a regression check (AC-07) rather than a code change so the drift isn't silently reintroduced.
