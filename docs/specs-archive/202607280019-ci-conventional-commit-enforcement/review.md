# Code Review: CI-Level Conventional Commit Enforcement (commit `f319d56`, concurrency fix `bc297a3`)

## Summary
This is a tightly-scoped CI infrastructure addition that does exactly what `feature.md`/`plan.md` describe: a new `commitlint` job (sibling to the existing `ci` job) in `.github/workflows/ci.yml` hand-rolls a `pnpm exec commitlint --from/--to` invocation against the existing `commitlint.config.cjs`, for both `pull_request` and `push` events, with a `git rev-list --max-parents=0` fallback for the push zero-SHA edge case. `CONTRIBUTING.md` gained a "Merge Commits & Rebasing" section forbidding merge commits in feature branches and mandating rebase. No new npm dependency, no third-party GitHub Action, no changes to `commitlint.config.cjs`/`commit-conventions.cjs`. All 10 acceptance criteria independently re-verified via scratch-repo `commitlint` tests, not just re-read from `impl-summary.md`'s claims. No critical or major issues found. **Ready to merge.**

## Findings

### Critical
None.

### Major
None.

### Minor

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [x] | `.github/workflows/ci.yml` (workflow root) | Reliability | No workflow-level `concurrency` group existed, so superseded pushes/PR updates would leave stale runs racing to completion instead of being cancelled. | Add a `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` block at the workflow root. **Fixed** — committed separately as `bc297a3` ("ci(root): add concurrency group to prevent overlapping workflow runs"), per human decision to address this now. |
| [ ] | `.github/workflows/ci.yml` (`ci` and `commitlint` jobs) | Reliability | Neither job sets `timeout-minutes`, so a hung step (e.g. a stuck `pnpm install`) could run to the GitHub Actions default cap instead of failing fast. | Add an explicit `timeout-minutes` to both jobs. **Left as-is per human decision** — not addressed in this feature; not carried forward as a new backlog item. |
| [ ] | `.github/workflows/ci.yml` (`commitlint` job) | Duplication | The new `commitlint` job repeats the existing `ci` job's checkout/`corepack enable`/`setup-node`/`pnpm install` sequence verbatim rather than factoring it into a reusable composite action or reusable workflow. | Could be extracted into a composite action if a third job is ever added, but `plan.md`'s own Risks & Mitigations section explicitly accepts this duplication already (justified by `feature.md`'s Non-Functional Requirements: "no caching or optimization concerns beyond what `ci.yml` already does for `pnpm install`"), and by the benefit of an isolated `fetch-depth: 0` checkout that doesn't affect the existing `ci` job. Not treated as a defect — no action needed. |

### Info / Suggestions

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [x] | `feature.md` (all AC checkboxes) | Process | Review was run read-only, so `feature.md`'s `- [ ]` AC checkboxes were not flipped to `- [x]` during the review step itself. | Flip AC-01 through AC-10 before archiving. **Done** as part of `/sdd-archive`. |
| [ ] | `plan.md` Architecture Decisions | Process | The choice of a new `commitlint` job (vs. a new step in the existing `ci` job) was flagged in `plan.md` as "optional sign-off" for the human, not a blocking decision. | No objection raised; the reasoning (per-check attributability in the PR UI, isolating the `fetch-depth: 0` checkout) is sound and consistent with Bootstrap CI's existing precedent of separate, individually-attributable steps. |
| [ ] | `.github/workflows/ci.yml` | Process | Live GitHub-side verification (a throwaway PR with a deliberately bad commit, and one with a merge commit) was not performed — no push/PR access available to the unattended implementation sub-agent. | Recommended but not required per `plan.md`; all behavior was instead verified empirically against the real installed `commitlint` binary in scratch git histories, which is a reasonable substitute for an unattended agent. |

## Acceptance Criteria Coverage

| AC | Test / Verification | Status | How Verified |
|----|--------|--------|--------------|
| AC-01: non-conforming commit in a PR fails CI, log shows commit + rule | Scratch git-history test via real `commitlint` binary | Covered | **Independently verified** — built a scratch repo with a base commit, two conventional commits, a real `--no-ff` merge commit, and one `--no-verify`-bypassed bad commit; ran `commitlint --from <base> --to <tip>`: only the bad commit was flagged, with `subject-empty`/`type-empty` rule output, exit code 1 |
| AC-02: PR where every commit conforms passes (no false positives) | Same scratch test | Covered | **Independently verified** — the two conventional commits in the same range produced no output and did not fail the run |
| AC-03: a normal `git merge` commit in the PR range doesn't spuriously fail | Same scratch test + isolated check | Covered | **Independently verified** — `echo "Merge branch 'main' into feature/x" | commitlint` exits 0 silently; the scratch test's real `--no-ff` merge commit was also passed over silently, confirming commitlint's default-ignore behavior is not merely assumed |
| AC-04: reuses `commitlint.config.cjs` directly, no duplicated rules | `.github/workflows/ci.yml` diff | Covered | **Independently verified** — both new steps invoke bare `pnpm exec commitlint --from/--to`, no `--config` flag, no inline rule definitions; `commitlint.config.cjs` untouched in the diff |
| AC-05: existing local hook / `pnpm commit` / `test:commits` continue to work unchanged | `pnpm test` | Covered | **Independently verified** — ran `pnpm test`: root `//#test:commits` 8/8 pass unchanged; `commitlint.config.cjs`, `commit-conventions.cjs`, `package.json` absent from the diff entirely |
| AC-06: `docs/project.md` updated | This archive step | Covered | Deferred to `/sdd-archive` per established repo pattern (same deferral used by Bootstrap CI's own plan.md) — completed as part of this archive |
| AC-07: no `docs`-scope drift reintroduced | `CONTRIBUTING.md` / `commit-conventions.cjs` | Covered | **Independently verified** — both currently list exactly `token-core`/`web-app`/`root`; no `docs` entry in either, consistent with `9005d5a`'s prior fix not being reverted |
| AC-08: direct `push` to `main` with a bad commit fails CI the same way; all-conforming push passes | Scratch test of push-range step, including zero-SHA fallback | Covered | **Independently verified** — dedicated scratch test of `git rev-list --max-parents=0` resolved a valid root commit SHA without crashing; an all-conforming push range exited 0, a range containing one bad commit exited 1 |
| AC-09: `CONTRIBUTING.md` states merge commits forbidden, rebase required | `CONTRIBUTING.md` diff | Covered | **Independently verified** — new "Merge Commits & Rebasing" section explicitly forbids merge commits in feature branches and requires rebasing onto `main` instead |
| AC-10: hand-rolled against `@commitlint/cli`, no third-party Action | `.github/workflows/ci.yml` diff | Covered | **Independently verified** — only `actions/checkout@v4` and `actions/setup-node@v4` (both already used by the existing `ci` job) plus `pnpm exec commitlint`; no `wagoid/commitlint-github-action` or equivalent introduced |

### Architectural Constraints (docs/project.md) — independently checked
- **Minimal Dependencies**: no new `package.json` entries; `@commitlint/cli` was already a direct devDependency and already the binary the local hook uses. The hand-rolled-vs-third-party-Action decision (AC-10) directly satisfies this constraint applied to CI tooling, consistent with Bootstrap CI's existing precedent (`corepack enable` + `actions/setup-node`'s built-in `cache: pnpm`, no third-party action there either).
- **Error Handling / Validation / Round-Trip Fidelity / TypeScript Strictness / Token-Type Package Contract**: not applicable — this feature touches only CI workflow YAML and `CONTRIBUTING.md`, no application source.

## Verdict
- [x] Ready to merge
- [ ] Merge after minor fixes (no re-review needed)
- [ ] Requires fixes and re-review
- [ ] Do not merge — significant issues found

One Minor finding (missing workflow-level `concurrency` group) was addressed and committed separately (`bc297a3`) per human decision. The remaining Minor finding (missing `timeout-minutes`) was explicitly left as-is per human decision — not a gap, a deliberate choice. The Minor finding about job duplication is pre-accepted in `plan.md`'s own Risks & Mitigations section, not a regression. None of the three block merge.
