# Code Review: Bootstrap CI (GitHub Actions)

## Summary
The workflow correctly implements the agreed scope — build/lint/test on PR and push to `main`, via Corepack + `actions/setup-node`'s pnpm cache, no commit-message linting — and all three underlying pipelines pass locally with the exact commands the workflow runs. The blocker to merging isn't the workflow logic itself but that it has never actually executed on GitHub Actions: live verification (AC-05/AC-06) was explicitly deferred by the user during implementation, so the one thing a CI workflow most needs — proof it runs and fails correctly — is still unconfirmed. Two real, low-effort security/reliability gaps (no `permissions:` block, no `timeout-minutes`) should be fixed before that first live run.

## Findings

### 🔴 Critical

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [ ] | `.github/workflows/ci.yml` (whole file) | AC Coverage / Test Quality | AC-06 ("each of build/lint/test independently fails on a deliberate break") has no coverage at all — live verification was explicitly skipped per `impl-summary.md`, so it's unknown whether a broken build, a lint violation, or a failing test actually red-X the correct step on GitHub Actions rather than e.g. silently succeeding due to a Turborepo cache hit masking the failure. | Before merging, open one real PR against `main` (even this feature's own PR) and confirm the workflow goes green, then push one throwaway broken commit to confirm a red X, per the original `plan.md` Step 4. |

### 🟠 Major

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [x] | `.github/workflows/ci.yml:9-11` | Security | No `permissions:` block is declared, so the job's `GITHUB_TOKEN` gets the repository's default permissions (which can include write access) even though this workflow only needs to read the checked-out code — unnecessarily broad token scope for a build/lint/test-only job. | Fixed: added `permissions: contents: read` at the workflow level. |

### 🟡 Minor

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [ ] | `.github/workflows/ci.yml:10-11` | Reliability | No `timeout-minutes` is set on the `ci` job, so a hang (e.g. a stalled network call in `pnpm install`, an infinite loop introduced in a future test) defaults to GitHub's 360-minute job timeout instead of failing fast. | Add `timeout-minutes: 15` (or similar) to the `ci` job. |
| [ ] | `.github/workflows/ci.yml:1-8` | Efficiency | No `concurrency` group is set, so pushing several commits to the same PR in quick succession queues redundant, superseded runs instead of cancelling stale ones. | Add a `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` block. |

### 🔵 Info / Suggestions

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [ ] | `.github/workflows/ci.yml:14,20` | Security (Supply Chain) | `actions/checkout@v4` and `actions/setup-node@v4` are pinned to mutable major-version tags rather than a commit SHA; a compromised or re-tagged release would silently affect this workflow (the pattern behind several real-world Actions supply-chain incidents). | Optional hardening: pin to a full commit SHA with a version comment (e.g. `actions/checkout@<sha> # v4.x.x`) if you want SHA-pinning as a standing policy — not required given these are first-party GitHub actions, but worth a conscious decision either way. |

## Acceptance Criteria Coverage
| AC | Test | Status |
|----|------|--------|
| AC-01: workflow file exists at `.github/workflows/ci.yml` | File present | ✅ Covered |
| AC-02: triggers on PR→`main` and push→`main` | `.github/workflows/ci.yml:3-7` (inspection) | ✅ Covered |
| AC-03: Node/pnpm setup via Corepack with pnpm cache | `.github/workflows/ci.yml:16-23` (inspection) | ✅ Covered |
| AC-04: frozen-lockfile install, then build/lint/test as distinct steps | `.github/workflows/ci.yml:25-35`; confirmed locally (`pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm test` all green) | ✅ Covered |
| AC-05: a failure in any step fails the run, attributable to that step | Structurally true (no `continue-on-error`) but never run on GitHub Actions | ⚠️ Structurally satisfied, live-unverified |
| AC-06: each of build/lint/test independently fails on a deliberate break | None — deferred by explicit user decision | ❌ No test coverage |
| AC-07: no commit-message linting added | `.github/workflows/ci.yml` (inspection — no commitlint invocation present) | ✅ Covered |
| AC-08: `docs/project.md` updated to note CI's existence | Deferred to `/sdd-archive` by design (per `feature.md`'s own AC-08 note and this repo's established pattern) | ➖ Expected, not yet due |

Per Dimension 1, AC-01 through AC-04 and AC-07 are marked complete in `feature.md`. AC-05 and AC-06 are left unchecked (live verification still outstanding); AC-08 is left unchecked as it isn't due until `/sdd-archive`.

## Verdict
- [ ] ✅ Ready to merge
- [ ] 🟡 Merge after minor fixes (no re-review needed)
- [x] 🟠 Requires fixes and re-review
- [ ] 🔴 Do not merge — significant issues found
