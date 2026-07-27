# Implementation Plan: CI-Level Conventional Commit Enforcement

## Overview
This is a pure infra addition on top of Bootstrap CI's `.github/workflows/ci.yml`, plus a documentation-only update to `CONTRIBUTING.md`. A new job (`commitlint`) is added to the existing workflow, running in parallel with the existing `ci` job (build/lint/test), that hand-rolls a `commitlint --from <X> --to <Y>` invocation against the repo's existing `commitlint.config.cjs` — reusing the already-a-devDependency `@commitlint/cli` binary exactly as the local `commit-msg` hook and `test:commits` already do. No new npm dependency, no new commitlint config, no third-party GitHub Action. `CONTRIBUTING.md` gains a short section forbidding merge commits in feature branches and mandating rebase onto `main` instead (FR-07). No application code, `commitlint.config.cjs`, or `commit-conventions.cjs` changes.

Both the commit-range design and the merge-commit exclusion were empirically verified against the real `commitlint` binary during planning (not just inferred from docs) — see Architecture Decisions and Risks below for what was tested and the exact commands used.

## Architecture Decisions

- **New job, not a new step in the existing `ci` job.** `feature.md`'s Technical Scope leaves this open ("a new step (or a new job)"). A separate `commitlint` job is chosen over adding a step to the existing `ci` job for two reasons: (1) it gets its own named check in the GitHub PR UI, which is *more* clearly attributable per-failure than a step buried inside the existing `ci` job (extends the same FR-04/AC-05 "attributable failure" precedent Bootstrap CI's plan.md used to justify separate build/lint/test steps); (2) it isolates the `fetch-depth: 0` checkout this feature needs from the existing `ci` job's checkout, so the existing build/lint/test job's performance/config is untouched — zero regression risk to AC-05's "existing checks continue to work unchanged." **Flagging for optional sign-off**: this is a reasonable, non-blocking implementation choice `feature.md` left implicit, not something it resolved explicitly.

- **`fetch-depth: 0` only on the new job's checkout.** The existing `ci` job's `actions/checkout@v4` step stays untouched (default shallow depth-1 clone is fine for build/lint/test, which don't need history). Only the new `commitlint` job's checkout sets `fetch-depth: 0`, per FR-02's requirement that the range's base/before commit be resolvable. Repo is small (NFR: no perf concerns), so no attempt at a narrower depth.

- **Range source follows `feature.md`'s resolved design exactly, not `git merge-base`.** For `pull_request`, `--from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }}`; for `push`, `--from ${{ github.event.before }} --to ${{ github.event.after }}`. (A `git merge-base`-based alternative is sometimes recommended elsewhere to guard against base-branch drift, but `feature.md`'s Resolved Decisions explicitly specify `base.sha`/`head.sha` and `before`/`after` directly, and this repo's FR-07 rebase-required policy means feature branches are expected to stay rebased onto `main`, so `base.sha` should reliably reflect the true fork point in normal operation. Following the resolved spec as given, not substituting a different design.)

- **Zero-SHA push fallback: `git rev-list --max-parents=0`.** When `github.event.before` is the all-zeros SHA (FR-03's flagged edge case), the job resolves the repo's root commit (`git rev-list --max-parents=0 "$AFTER" | tail -n1`) and uses that as `--from` instead. This is a conservative fallback (worst case it re-lints the entire history in this rare edge case) rather than guessing at a partial commit count, and — critically — it never crashes the job, which is the only hard requirement `feature.md` places on this edge case ("expected to be rare... but should not be left unhandled"). Empirically verified during planning (see Risks).

- **Invocation via `pnpm exec commitlint`, no new dependency.** `@commitlint/cli` is already a `devDependency`; the new job runs `pnpm install --frozen-lockfile` (same as the existing `ci` job) so `pnpm exec commitlint` resolves it. `commitlint.config.cjs` at the repo root is auto-discovered by commitlint's config loader (cosmiconfig) from the job's working directory with no `--config` flag needed — same as local usage. **No new dependency is introduced anywhere in this plan**, satisfying the Minimal Dependencies constraint's requirement that any new dependency be named/justified here before use; none is needed.

- **Merge-commit exclusion relies entirely on commitlint's built-in default-ignore behavior — no custom filtering logic.** `commitlint.config.cjs` does not set `defaultIgnoreRules: false`, so commitlint's default ignore checks (which include merge-commit-shaped messages) apply automatically in range mode, silently skipping them rather than failing them. **Empirically verified during planning** (not assumed): `echo "Merge branch 'main' into feature/x" | node_modules/.bin/commitlint` exits `0` with no output, and a full scratch range test (base commit → two conventional commits → one real `--no-ff` merge commit → one conventional commit → one commit force-created with `--no-verify` in a deliberately non-conventional format) run through `commitlint --from <base> --to <tip>` correctly passed over the merge commit and both good commits silently, and failed with per-commit `type-empty`/`subject-empty` output only for the bad commit, exiting `1` overall. This directly confirms FR-02's assumption and AC-01/AC-02/AC-03 end-to-end, satisfying `feature.md`'s instruction to "verify this behavior explicitly rather than assume it silently."

## Implementation Steps

### Step 1: Add the `commitlint` job scaffold and its own checkout
- [x] In `.github/workflows/ci.yml`, add a new job `commitlint` (sibling to the existing `ci` job), `runs-on: ubuntu-latest`.
- [x] Add `actions/checkout@v4` with `fetch-depth: 0` as its first step (needed to resolve both PR base/head SHAs and the push before/after range — see FR-02/FR-03).
- [x] Add the same `corepack enable` → `actions/setup-node@v4` (`node-version: "22"`, `cache: pnpm`) → `pnpm install --frozen-lockfile` sequence the existing `ci` job uses, so `commitlint` is resolvable via `pnpm exec`.
- Files to modify: `.github/workflows/ci.yml`

### Step 2: PR range lint step
- [x] Add a step guarded by `if: github.event_name == 'pull_request'` running:
  ```yaml
  run: pnpm exec commitlint --from "${{ github.event.pull_request.base.sha }}" --to "${{ github.event.pull_request.head.sha }}"
  ```
  (FR-02, AC-01, AC-02, AC-03, AC-04, AC-10)
- Files to modify: `.github/workflows/ci.yml`

### Step 3: Push range lint step, with zero-SHA fallback
- [x] Add a step guarded by `if: github.event_name == 'push'` running a small shell script:
  ```yaml
  run: |
    BEFORE="${{ github.event.before }}"
    AFTER="${{ github.event.after }}"
    if [ "$BEFORE" = "0000000000000000000000000000000000000000" ]; then
      BEFORE=$(git rev-list --max-parents=0 "$AFTER" | tail -n1)
    fi
    pnpm exec commitlint --from "$BEFORE" --to "$AFTER"
  ```
  (FR-03, AC-08, AC-10)
- Files to modify: `.github/workflows/ci.yml`

### Step 4: Contributor docs — forbid merge commits, mandate rebase
- [x] Add a short section to `CONTRIBUTING.md` (near the existing "Commit Messages" section, or as its own section) stating: merge commits are forbidden in feature branches; contributors must `git rebase origin/main` (or equivalent) instead of merging `main` into their branch; this repo rebase-merges PRs, so every individual commit lands permanently on `main`'s history. Note that CI's commit-message check tolerates/skips merge commits defensively, but that tolerance is a backstop, not an invitation to merge freely.
- Files to modify: `CONTRIBUTING.md`

### Step 5: Regression check — scope-list drift (AC-07)
- [x] Confirm (already done during `/sdd-feature` and re-confirmed during this planning pass) that `CONTRIBUTING.md`'s Scopes table and `commit-conventions.cjs`'s `scopes` array both currently list exactly `token-core` / `web-app` / `root`, with no `docs` entry in either. No code change — this step is a documented no-op regression check per FR-05, to be re-verified once more at `/sdd-implement` time so the drift isn't silently reintroduced by an intervening commit. **Re-verified at implement time**: both still list exactly `token-core`/`web-app`/`root`; no drift.
- Files: none (verification only)

### Step 6: Verification
- [x] Local sanity checks already performed during this planning pass (see Risks below for exact commands/results): (a) a malformed message piped to `commitlint` fails with clear rule names and exit 1; (b) a synthetic merge commit message passes silently; (c) a full scratch git-history range (good commits + a real `--no-ff` merge commit + a `--no-verify`-bypassed bad commit) run through `commitlint --from <base> --to <tip>` correctly flags only the bad commit and exits 1, proving the exact FR-02/FR-03 invocation shape works end-to-end against real git history, not just single messages. **Re-verified at implement time** with a fresh scratch repo — same result (merge commit + conventional commits silent, bad commit flagged with `subject-empty`/`type-empty`, exit 1).
- [x] At `/sdd-implement` time: re-run `pnpm install --frozen-lockfile` (regression check that the existing install/build/lint/test still pass unchanged — AC-05) and do a final read of the new `ci.yml` job and `CONTRIBUTING.md` diff against AC-01–AC-10. **Done**: `pnpm install --frozen-lockfile`, `pnpm build` (5/5), `pnpm lint` (10/10), `pnpm test` (10/10, including `//#test:commits` 8/8) all pass. YAML structure verified valid via Ruby's YAML parser.
- [ ] **Recommended, not required**: a live GitHub-side check (scratch branch + throwaway PR with one deliberately bad commit, confirming the `commitlint` job red-Xs independently of the `ci` job; a second throwaway PR with a merge commit, confirming it stays green) — consistent with Bootstrap CI's precedent of deferring live Actions verification to the human when requested. Not performed as part of this implementation pass either (out of scope for an unattended sub-agent — no push access to trigger real Actions runs).
- Files: none (verification-only)

## Acceptance Criteria Mapping
| AC | Verified By |
|----|-------------|
| AC-01: non-conforming commit in a PR fails CI, log shows commit + rule | Step 2 (`pull_request` range invocation); empirically confirmed in planning's scratch test (per-commit `type-empty`/`subject-empty` output, exit 1) |
| AC-02: PR where every commit conforms passes (no false positives) | Step 2; confirmed in scratch test — two conventional commits in range produced no output/failure |
| AC-03: a normal `git merge` commit in the PR range doesn't spuriously fail | Step 2 + Architecture Decisions' merge-ignore verification; confirmed in scratch test — a real `--no-ff` merge commit produced no output/failure |
| AC-04: reuses `commitlint.config.cjs` directly, no duplicated rules | Step 1/2/3 — invocation is a bare `pnpm exec commitlint --from/--to`, no `--config` override, no inline rules; verified by inspecting the workflow diff |
| AC-05: existing local hook / `pnpm commit` / `test:commits` continue to work unchanged | Step 6 — regression re-run of `pnpm install`/`pnpm test`; this feature only adds to `ci.yml` and `CONTRIBUTING.md` |
| AC-06: `docs/project.md` updated | Deferred to `/sdd-archive`, per established repo pattern (see Bootstrap CI's own plan.md, same deferral) |
| AC-07: no `docs`-scope drift reintroduced | Step 5 — regression-check-only, re-verified at `/sdd-implement` |
| AC-08: direct `push` to `main` with a bad commit fails CI the same way; all-conforming push passes | Step 3 (`push` range invocation + zero-SHA fallback) |
| AC-09: `CONTRIBUTING.md` states merge commits are forbidden, rebase required | Step 4 |
| AC-10: hand-rolled against `@commitlint/cli`, no third-party Action | Steps 1–3 — only `actions/checkout@v4` and `actions/setup-node@v4` (both GitHub-maintained, same as the existing `ci` job) plus `pnpm exec commitlint`; no `wagoid/commitlint-github-action` or similar |

## Risks & Mitigations
- Risk: `github.event.pull_request.base.sha` could drift from the true merge-base if a feature branch isn't kept rebased onto `main` (a known general gotcha with this design elsewhere). → Mitigation: `feature.md`'s Resolved Decisions explicitly choose this design, and FR-07/Step 4 makes rebase-onto-`main` a documented contributor requirement, so this is a policy-backed assumption, not an unaddressed gap. Flagged here for visibility, not treated as blocking.
- Risk: `push` event with `before` = all-zeros SHA (new/recreated branch) would otherwise crash the range resolution. → Mitigation: `git rev-list --max-parents=0` fallback (Step 3), empirically confirmed to resolve a valid root SHA in this repo's history during planning.
- Risk: commitlint's default-ignore behavior for merge commits is a library default, not something asserted anywhere in this repo's own config — could silently change on a future `@commitlint/cli` version bump. → Mitigation: empirically verified against the real installed binary during planning (see Architecture Decisions); Step 6's `/sdd-implement`-time verification re-confirms it against whatever version `pnpm install --frozen-lockfile` actually resolves.
- Risk: duplicating `corepack enable` / `setup-node` / `pnpm install` in a second job doubles install time versus reusing the existing `ci` job. → Mitigation: explicitly accepted per `feature.md`'s Non-Functional Requirements ("no caching or optimization concerns beyond what `ci.yml` already does for `pnpm install`"); not treated as a problem to solve in this feature.
- Risk: a new job (vs. a new step in the existing job) is a judgment call `feature.md` left open. → Mitigation: rationale given in Architecture Decisions; flagged explicitly in this plan and in the implementation report for optional human sign-off before/at `/sdd-implement`.

## Estimated Complexity
Low — one new job in an existing YAML workflow file (reusing the exact toolchain-setup pattern the existing `ci` job already established), a short documentation addition to `CONTRIBUTING.md`, and a no-op regression check. No new dependencies, no application code touched. The core technical risk (does commitlint's range mode actually skip merge commits the way `feature.md` assumes) was empirically de-risked during this planning pass rather than left as an implementation-time surprise.
