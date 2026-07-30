# Implementation Plan: Prettier Pre-Commit Formatting

## Overview

Add a `.husky/pre-commit` hook (matching the existing shebang-less, husky-v9-style `.husky/commit-msg` / `.husky/prepare-commit-msg` files) that runs a new root-level Node script, `format-staged.cjs`. That script gets the commit's staged files from git, runs `prettier --write --ignore-unknown` on exactly that set, and re-stages whatever Prettier changed — implementing FR-01/FR-02 auto-fix-and-restage, staged-files-only, as agreed in `feature.md`. The script's git/prettier calls are injected (a single `exec` parameter, real-defaulted to `child_process.execFileSync`), mirroring this repo's Dependency Injection for I/O/Platform Externalities constraint, so its logic is unit-testable with a fake `exec` and no real git repo or Prettier invocation needed in tests.

## Architecture Decisions

- **No new dependency — hand-rolled script over `lint-staged`, per the Minimal Dependencies constraint.** `lint-staged`'s main capability beyond what's needed here is hunk-level partial-stage isolation (via `git stash --keep-index` internally), so a developer with a partially-staged file only gets the staged hunks formatted. `feature.md`'s FR-03 explicitly accepts the simpler behavior (format the file's current working-tree content, not just staged hunks) as a known limitation, not a requirement — so that capability gap doesn't exist here, and there's nothing left that a built-in (`git` CLI plus the already-installed `prettier` CLI, invoked via Node's built-in `child_process`) can't do just as well. Everything else `lint-staged` would give us (get staged files, run a formatter on them, re-add) is a handful of git plumbing commands.
- **Hook body is a one-line call into a new root script, not inline shell logic**, matching this repo's precedent of extracting root-tooling logic into a testable `.cjs` module (`commit-conventions.cjs`) rather than duplicating logic across shell scripts and JS. `.husky/pre-commit` itself stays a trivial, untested wrapper — same trust level as the existing two husky hook files, neither of which has a test either.
- **`format-staged.cjs` takes an injected `exec` function (default: `child_process.execFileSync`)** for its git/prettier calls. This isn't `apps/web-app` code, so the project's DI constraint doesn't technically scope to it by file path — but the constraint's stated rationale ("a real call is awkward, slow, or impossible to exercise directly in a test") applies identically here: without injection, unit-testing this script would require a real git repo and a real Prettier invocation per test case. Injecting keeps tests fast and dependency-free, consistent with the constraint's spirit.
- **Staged-file detection uses `git diff --cached --name-only --diff-filter=ACM -z`**, NUL-delimited (`-z`) so filenames containing spaces or special characters split correctly — a plain newline split would break on such filenames. `--diff-filter=ACM` (Added/Copied/Modified) intentionally excludes Deleted (nothing to format) and Renamed-without-modification (nothing changed, already-formatted). **Known edge case, not fixed:** a rename _with_ content modification reports as `R`, not `M`, and is excluded — its modified content would silently skip formatting. Documented in Risks below rather than special-cased, since it's a narrow edge case and `--diff-filter=ACMR` would require extra logic to resolve the git-reported new path vs. old path for the `prettier`/`git add` calls. Deferred as a known gap.
- **`prettier --write --ignore-unknown` runs directly on the staged-file list**, relying on Prettier's own automatic `.prettierignore` handling (no `--ignore-path` override needed — that's already the default) for AC-03, and `--ignore-unknown` (Prettier 3+, already satisfied — repo is on `prettier@^3.6.2`) so a staged file Prettier has no parser for (e.g. a binary asset) is silently skipped rather than erroring the whole hook.
- **On a Prettier failure (non-zero exit, e.g. unparseable syntax), `format-staged.cjs` throws before re-staging anything and the process exits non-zero**, which git interprets as a failed hook, aborting the commit (FR-04/AC-04). Side effect, called out in Risks: Prettier may still have successfully rewritten _other_, valid staged files on disk before hitting the failing one (Prettier processes its file list independently per file); since the hook aborts before `git add`, those rewrites land as unstaged working-tree changes rather than being silently lost or included in the aborted commit — an acceptable, visible side effect, not data loss.
- **No new `package.json` script added.** `.husky/pre-commit` invokes `node format-staged.cjs` directly (Node is guaranteed by `engines.node >= 26.5.0`); a `pnpm format:staged` convenience script wasn't requested by any FR/AC and would be unused surface area.

## Implementation Steps

### Step 1: One-time whole-repo formatting pass (separate commit)

`pnpm format:check` currently fails against 15 files repo-wide (mostly Markdown: `.agents/skills/*/SKILL.md`, `.claude/skills/sdd-backlog-runner/SKILL.md`, `docs/project.md`, two `docs/specs-archive/**` files, `docs/research/**`, plus this feature's own `feature.md`/`plan.md`) — confirmed by running it before writing this plan. Since the new hook only ever formats _staged_ files going forward, it would never retroactively fix these pre-existing files; a one-time full pass is needed once so the repo starts from a clean baseline the hook can then maintain.

- [x] Run `pnpm format` (existing script, `prettier --write .`) at the repo root — no new script needed.
- [x] Commit the result on its own, with no code/behavior changes mixed in — pure formatting, so it's trivially reviewable as a no-op diff and doesn't obscure the actual hook-adding commit(s) that follow. This commit lands _before_ Steps 2–5 below (the hook doesn't exist yet at this point, so nothing about this step depends on it).
- [x] Re-run `pnpm format:check` after, to confirm zero remaining issues before proceeding.
- Files: whatever `prettier --write .` touches (Markdown docs only, per the run above — no source files currently fail the check)

### Step 2: Core script — `format-staged.cjs`

- [x] Create root-level `format-staged.cjs` (CommonJS, matching `commit-conventions.cjs`'s existing style) exporting:
  - `getStagedFiles(exec)` — runs `git diff --cached --name-only --diff-filter=ACM -z`, splits on `\0`, filters empty entries, returns `string[]`.
  - `formatStagedFiles(files, exec)` — no-op if `files` is empty; otherwise runs `prettier --ignore-unknown --write -- <...files>`.
  - `restageStagedFiles(files, exec)` — no-op if `files` is empty; otherwise runs `git add -- <...files>`.
  - `main(exec)` — composes the three in order (`getStagedFiles` → `formatStagedFiles` → `restageStagedFiles`), short-circuiting (no format/restage calls) when there are no staged files.
  - A `require.main === module` guard that calls `main()` with the real default `exec` (`child_process.execFileSync`, `{ encoding: "utf8" }` for the git read, `{ stdio: "inherit" }` for the prettier/git-add writes so Prettier's own error output reaches the developer per FR-04), catching any thrown error, printing its message, and `process.exit(1)`.
- [x] Added `format-staged.cjs` (and, once written, `format-staged.test.cjs`) to root `package.json`'s `lint:root` script alongside `commit-conventions.cjs`/`commit-conventions.test.cjs`, so the new file is linted by the same existing command that already covers root-tooling `.cjs` files (small addition beyond the literal step list, for consistency with that established pattern).
- Files: `format-staged.cjs` (new, repo root)

### Step 3: Unit tests — `format-staged.test.cjs`

- [x] `node:test` file, same collocated-at-root pattern as `commit-conventions.test.cjs`, using a hand-rolled fake `exec` (records calls, returns canned output) — no real git repo or Prettier process, per this repo's injected-dependency testing convention.
  - [x] `getStagedFiles` parses NUL-delimited output correctly, including filenames with spaces, and returns `[]` for empty stdout.
  - [x] `formatStagedFiles` calls `exec` with `prettier --ignore-unknown --write -- <files>` when given a non-empty list; does not call `exec` at all when given `[]`.
  - [x] `restageStagedFiles` calls `exec` with `git add -- <files>` when given a non-empty list; does not call `exec` at all when given `[]`.
  - [x] `main` with a fake `exec` returning no staged files calls `exec` exactly once (the `git diff` read) and never calls format/restage.
  - [x] `main` with a fake `exec` returning staged files calls `exec` for the diff, then prettier, then `git add`, in that order, with the same file list threaded through each.
  - [x] `main` propagates a thrown error when the fake `exec` throws on the Prettier step, and never reaches the `git add` step in that case (verifies FR-04/AC-04's "no partial restage on failure" behavior).
- [x] Wired into the `test` pipeline: `package.json` gained `"test:format-staged": "node --test format-staged.test.cjs"`, and `turbo.json`'s `test` task's `dependsOn` gained `"//#test:format-staged"` (mirroring the existing `//#test:commits` entry) plus its own `//#test:format-staged` task definition — otherwise `pnpm test`/CI would never actually run this file (not called out explicitly in this step originally, but required for the tests to have any effect).
- Files: `format-staged.test.cjs` (new, repo root); `package.json`, `turbo.json` (wiring)

### Step 4: Wire up the husky hook

- [x] Create `.husky/pre-commit` containing exactly `node format-staged.cjs\n` — no shebang, no husky sourcing boilerplate, matching the existing `.husky/commit-msg` / `.husky/prepare-commit-msg` file style exactly.
- [x] `chmod +x .husky/pre-commit` (existing hook files are `755`; husky/git requires the hook file to be executable).
- Files: `.husky/pre-commit` (new)

### Step 5: Documentation

- [x] Add a short section to `CONTRIBUTING.md` (near the existing commit-hook documentation from the Enforce Conventional Commits feature) explaining: staged files are auto-formatted with Prettier on `git commit` and re-staged automatically; unstaged/unrelated files are never touched; a file Prettier can't parse aborts the commit with Prettier's error shown; `git commit --no-verify` bypasses the hook same as it does the existing commit-message hooks.
- Files: `CONTRIBUTING.md`

### Step 6: Manual end-to-end verification

This repo has no existing precedent for automated end-to-end testing of a husky hook itself (the two existing hooks aren't tested that way either — see `docs/project.md`'s testing conventions, which cover `packages/*`/`apps/web-app`, not root git tooling). Verification here was done in two layers:

- [x] Direct script invocation (`node format-staged.cjs`, bypassing git's hook dispatch entirely) against deliberately unformatted staged files, an unstaged sibling file, a `.prettierignore`d file, and a file with a Prettier-unparseable syntax error — confirmed correct behavior for AC-01/02/03/04 at the script-logic level.
- [x] **Correction (added during `/sdd-review`):** an earlier version of this step claimed AC-01–04 were confirmed via real `git commit`s in this worktree. That was wrong — those commits never actually exercised `.husky/pre-commit`. `core.hooksPath` is an **absolute path** baked into `.git/config` pointing at the primary checkout's `.husky/_` shim directory (set once by husky's install script, wherever `pnpm install` first ran) — not a relative, worktree-scoped path. Husky's shim (`.husky/_/h`) computes the real hook body's location via `dirname(dirname("$0"))`, and since git invokes the shim using that same absolute `$0`, the computed hook path is always `<primary-checkout>/.husky/pre-commit`, regardless of which worktree `git commit` actually runs in. Since the primary checkout's `main` branch didn't have `.husky/pre-commit` yet at the time, the shim silently no-op'd — proven by staging a deliberately-unformatted file and committing it in this exact worktree, which succeeded unformatted with no error.
- [x] **Post-merge re-verification:** after merging to `main`, re-tested in a throwaway worktree checked out from the fresh `origin/main` tip. First confirmed the root cause precisely: overriding `core.hooksPath` to a _relative_ path pointed at a `.husky/_` directory that didn't yet exist there (no `pnpm install` run) resulted in the shim being silently skipped — same silent no-op, different cause (missing shim, not wrong target). After copying in `.husky/_` so the shim existed, staging a deliberately-unformatted file and committing (with `core.hooksPath` scoped to that same worktree) **did** correctly invoke `.husky/pre-commit`: Prettier reformatted the staged file in place and it was re-staged, exactly as designed — conclusively confirming the hook logic itself is correct, and the worktree gap is purely an artifact of husky's absolute, install-time `core.hooksPath` value, not a defect in `format-staged.cjs` or `.husky/pre-commit`.
- [x] Re-ran `pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm build` after the above — all pass cleanly, confirming existing scripts/CI are unaffected (AC-06). `commit-msg`/`prepare-commit-msg` are unmodified files, so AC-05 holds by inspection (no code changes touch them).

## Acceptance Criteria Mapping

| AC                                                               | Verified By                                                                                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01: staged unformatted file is formatted in the commit        | `format-staged.test.cjs` (`main` composition tests) + Step 6 direct-invocation verification; real git-hook firing verified in the primary checkout post-merge                   |
| AC-02: unstaged files untouched                                  | `format-staged.test.cjs` (`getStagedFiles` only returns staged files) + Step 6 direct-invocation verification; real git-hook firing verified in the primary checkout post-merge |
| AC-03: `.prettierignore`d files never modified                   | Step 6 direct-invocation verification (relies on Prettier's own ignore handling, not custom logic); real git-hook firing verified in the primary checkout post-merge            |
| AC-04: unparseable staged file aborts commit, no partial restage | `format-staged.test.cjs` (`main` error-propagation test) + Step 6 direct-invocation verification; real git-hook firing verified in the primary checkout post-merge              |
| AC-05: existing commit-message hooks unaffected                  | No code changes to those two files (inspection)                                                                                                                                 |
| AC-06: `pnpm format`/`format:check`/CI unaffected                | Step 6 re-run (no changes to those scripts or `ci.yml`)                                                                                                                         |
| AC-07: `CONTRIBUTING.md` documents the new behavior              | Step 5                                                                                                                                                                          |

## Risks & Mitigations

- Risk: a renamed-and-modified staged file (`git diff --cached` reports status `R`, excluded by `--diff-filter=ACM`) skips formatting for its new content. → Mitigation: documented as a known, narrow gap (Architecture Decisions); not fixed this iteration — no AC requires it, and resolving it cleanly needs extra path-remapping logic disproportionate to the edge case's likelihood.
- Risk: Prettier partially rewrites valid files on disk before erroring on a later file in the same staged set, leaving unstaged formatting changes behind after an aborted commit. → Mitigation: documented as an accepted, visible side effect (Architecture Decisions) — no data loss, no silent corruption, and `git status`/`git diff` immediately shows the dev what happened.
- Risk: `execFileSync`'s default `stdio: "inherit"` for the Prettier/`git add` calls means their output goes straight to the terminal, which is what makes FR-04's "surface Prettier's error" requirement work — but if a future edit changes that option, the hook would fail silently instead. → Mitigation: covered structurally by keeping `format-staged.cjs` a single small file with the option inline at the real-`exec` default, not threaded through multiple layers where it could be dropped.

## Estimated Complexity

Low — one one-time repo-wide formatting commit, one new ~30-line script, one husky hook file (one line), unit tests for pure/injectable logic, a `CONTRIBUTING.md` addition, and a manual verification pass. No new dependency, no changes to existing hooks/scripts/CI, no changes to any `packages/*` or `apps/web-app` code.
