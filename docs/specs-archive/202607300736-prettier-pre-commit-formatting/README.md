# Prettier Pre-Commit Formatting

Implemented on: 2026-07-30

A new `.husky/pre-commit` hook runs `format-staged.cjs`, a hand-rolled root script (not `lint-staged` — see Architecture Decisions in `docs/project.md`) that gets the commit's staged files from git, runs `prettier --write --ignore-unknown` on exactly that set, and re-stages whatever changed. This means a commit can never introduce unformatted code without a manual `pnpm format` step, while files outside the staged set (or matched by `.prettierignore`) are never touched. A Prettier failure (e.g. a syntax error) aborts the commit and surfaces Prettier's own error output, the same way an existing `commitlint` failure already aborts a commit via `.husky/commit-msg`.

`format-staged.cjs`'s git/prettier calls are injected via an `exec` parameter (default: `child_process.execFileSync`), per this repo's Dependency Injection for I/O/Platform Externalities constraint, so its logic is unit-tested (`format-staged.test.cjs`, 9 tests) without a real git repo or Prettier process.

**Notable finding from `/sdd-review`:** `core.hooksPath` resolves relative to the repository's primary checkout, not whichever linked git worktree a commit is made in. A hook that only exists on a feature branch is silently inert for commits made in any worktree until the primary checkout's checked-out branch itself has that hook file on disk — proven by a real `git commit` in this feature's own worktree completing successfully with an unformatted file, no error. This is now documented as a standing caveat in `CONTRIBUTING.md` and as an Architecture Decision in `docs/project.md`, since it applies to any future husky hook added from a worktree-based feature branch, not just this one.

Known accepted gaps (not fixed, out of scope per `feature.md`): a renamed-and-modified staged file isn't reformatted (`--diff-filter=ACM` excludes bare renames); a Prettier failure partway through a multi-file staged set can leave some valid files reformatted-but-unstaged after the aborted commit; partially-staged files get their whole working-tree content formatted, not just the staged hunks (the capability `lint-staged` would add).
