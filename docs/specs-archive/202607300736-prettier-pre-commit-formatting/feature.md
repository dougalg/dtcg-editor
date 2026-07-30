# Feature: Prettier Pre-Commit Formatting

## Summary

Adds a `pre-commit` git hook (via the `husky` install already present in this repo) that automatically formats every staged file with Prettier before a commit is created, then re-stages the formatted result — so a commit can never introduce unformatted code, without the developer having to remember to run `pnpm format` first. Only files staged in that commit are touched; unrelated unformatted files elsewhere in the tree are left alone. This is a local, fast-feedback convenience layer — CI's existing `pnpm format:check` step remains the authoritative enforcement backstop, unaffected by this change.

## User Stories

- As a contributor, I want my staged changes auto-formatted with Prettier when I commit, so that I never have to remember to run `pnpm format` manually and never get a red CI check for formatting alone.
- As a maintainer, I want formatting fixes to apply only to files already staged in the commit, so that a contributor's commit never picks up unrelated formatting changes to files they didn't touch.
- As a contributor working in a package with intentionally unformatted/generated files (e.g. `pnpm-lock.yaml`, `.next`), I want the pre-commit hook to respect `.prettierignore`, so generated/excluded files are never rewritten by the hook.

## Functional Requirements

### FR-01: New `pre-commit` husky hook

Add a `.husky/pre-commit` script, following the existing pattern of `.husky/prepare-commit-msg` and `.husky/commit-msg` (plain shell script, no husky-specific DSL, installed automatically via the existing `prepare: "husky"` `package.json` script — no change needed to that install mechanism).

### FR-02: Format only staged files, in place, then re-stage

The hook determines the set of staged files (`git diff --cached --name-only --diff-filter=ACM`, or equivalent), filters to files Prettier would actually process (respecting `.prettierignore` and Prettier's own supported-extension list), runs `prettier --write` on exactly that set, then re-adds (`git add`) any files it modified — so the formatted content becomes part of the commit being created, not a separate uncommitted change left behind afterward.

### FR-03: Only whole files are staged before formatting is attempted

If a file is **partially** staged (some hunks staged, some working-tree changes left unstaged — `git diff --cached` and `git diff` both show changes for the same path), the hook does not attempt to reformat just the staged hunks; formatting is applied to the file's current working-tree content, which conflates the unstaged hunks into the commit's staged version too. This is called out explicitly as a known, accepted limitation (see Non-Functional Requirements / Out of Scope) rather than a bug to fix — properly isolating staged-only hunks (the classic `git stash --keep-index` approach, or what `lint-staged` implements) is real complexity that FR's tool-choice Open Question below may resolve, but is not a hard requirement of this feature.

### FR-04: Hook failure blocks the commit

If Prettier itself fails on a staged file (e.g. a syntax error Prettier can't parse), the hook exits non-zero and the commit is aborted, surfacing Prettier's own error output to the developer — consistent with how `.husky/commit-msg` already aborts the commit on a `commitlint` failure.

## Acceptance Criteria

- [x] AC-01: Staging an unformatted file (e.g. inconsistent indentation) and running `git commit` results in a commit whose content is fully Prettier-formatted, with no manual `pnpm format` step required.
- [x] AC-02: An unformatted file that exists in the working tree but is **not** staged is untouched by the commit — the hook does not reformat or stage files outside the commit's staged set.
- [x] AC-03: A file matched by `.prettierignore` (e.g. `pnpm-lock.yaml`) is never modified by the hook, even if staged.
- [x] AC-04: A staged file with a Prettier-unparseable syntax error aborts the commit with Prettier's error surfaced, and no partial/garbled commit is created.
- [x] AC-05: The existing `prepare-commit-msg` and `commit-msg` hooks continue to run and function unchanged (commitizen prompt, commitlint validation) — this feature adds a hook, it doesn't touch the existing two.
- [x] AC-06: `pnpm format` / `pnpm format:check` and CI's `Check formatting` step are unchanged and continue to pass/fail independently of the new hook.
- [x] AC-07: `CONTRIBUTING.md` documents the new pre-commit formatting behavior (mirrors how the existing commit-message hooks are already documented there per the Enforce Conventional Commits feature).

## Technical Scope

### Affected Modules

- `.husky/` (new `pre-commit` file, alongside existing `prepare-commit-msg` and `commit-msg`)
- Root `package.json` (possible new script the hook shells out to, and/or a new dependency per the Open Question below)
- `CONTRIBUTING.md` (documentation update)

### New Components Required

- One new husky hook script (`.husky/pre-commit`).
- Whatever staged-file-formatting mechanism `/sdd-plan` selects to satisfy FR-02/FR-03 (either a new `lint-staged` config, or a small hand-rolled shell/Node script under this repo's existing scripts convention) — tool choice deferred, see Open Questions.

### Integration Points

- Existing husky install mechanism (`prepare: "husky"` in `package.json`) — no change to how husky itself is installed, only a new hook file added to `.husky/`.
- Existing `.prettierrc.json` / `.prettierignore` — reused as-is, not modified.
- Existing `pnpm format` / `pnpm format:check` scripts — reused if the chosen mechanism shells out to `prettier` the same way; not replaced.

## Non-Functional Requirements

- **Performance**: the hook must scale with the size of the commit (staged files only), not the size of the repo — a small commit should format near-instantly regardless of total repo size, unlike `pnpm format:check` which walks everything.
- **Security**: none beyond what already applies to running `prettier` locally (a dev-only, already-trusted dependency); no new external calls or network access introduced.
- **Reliability**: a hook failure (Prettier crash, non-zero exit) must always abort the commit rather than silently letting an unformatted or partially-formatted commit through — see FR-04/AC-04.
- **Known limitation (git worktrees)**: `core.hooksPath` resolves relative to the repository's primary checkout, not the current linked worktree. A commit made in a linked worktree whose primary checkout has a different branch checked out (without this hook) will silently skip the hook — no error, just an unformatted commit. The hook is fully active repo-wide once the primary checkout's checked-out branch includes `.husky/pre-commit` (i.e. after this feature merges to `main` and the primary checkout is updated). Documented in `CONTRIBUTING.md`.

## Out of Scope

- Running ESLint (or any other lint step) in the pre-commit hook — this feature is Prettier formatting only, per the backlog item's scope. Lint-staged expansion to cover linting is a separate future backlog item if wanted.
- Precisely isolating only the _staged hunks_ of a partially-staged file (see FR-03) — accepted as a known limitation, not solved by this feature.
- Adding a `pre-push` or CI-side change — CI's `pnpm format:check` step (already present) is unaffected and remains the enforcement backstop.
- A way to bypass/skip the hook for a specific commit — `git commit --no-verify` already provides this as a standard git escape hatch; no bespoke bypass mechanism is being added.

## Open Questions

- **Tool choice**: `lint-staged` (new dependency — needs justification against a hand-rolled alternative per this repo's Minimal Dependencies constraint) vs. a small hand-rolled script (e.g. `git diff --cached --name-only --diff-filter=ACM` piped through `xargs prettier --write` + `git add`, run directly from `.husky/pre-commit`). Deferred to `/sdd-plan`, which must state the built-in/hand-rolled alternative considered and why it falls short if `lint-staged` is chosen, per the Minimal Dependencies constraint.
