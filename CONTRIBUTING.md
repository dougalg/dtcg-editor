# Contributing

## Formatting

Every commit's staged files are automatically formatted and safe-fixed with [Biome](https://biomejs.dev/) (`biome check --write`) by a local `pre-commit` git hook, and re-staged so the formatted/fixed content is what actually gets committed — you don't need to run `pnpm format` yourself before committing. Only files staged in that commit are touched; anything else in the working tree (or excluded via `biome.json`'s ignore config, like `pnpm-lock.yaml`) is left alone. CI's `pnpm format:check`/`pnpm lint` steps re-check formatting and linting on every `pull_request`/`push` run, the same way commit messages are double-checked (see below) — the local hook is a convenience, not the only enforcement.

If a staged file has a syntax error Biome can't parse, or a lint error Biome can't safely autofix (e.g. a Dependency Injection for I/O/Platform Externalities violation — see `.specify/memory/constitution.md`), the commit is aborted and Biome's diagnostic is printed so you can fix it before retrying. `git commit --no-verify` bypasses this hook the same way it bypasses the commit-message hooks below.

**Git worktree caveat:** `core.hooksPath` resolves relative to the repository's primary checkout, not whichever linked worktree you're committing in. If you're working in a linked worktree (`git worktree add`/this repo's SDD worktree workflow) whose branch has this hook but whose primary checkout's currently-checked-out branch does not, the hook silently won't fire there — no error, the commit just goes through unformatted. It becomes fully active in every worktree once the primary checkout has this file on its checked-out branch (i.e. after merging to `main` and updating the primary checkout).

## Commit Messages

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/) on every commit via a local git hook, _and_ CI re-checks every commit's message on `pull_request` and `push` runs against the same config, so a bypassed or missing local hook can't slip a non-conforming commit onto `main`.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

- **type** — required, one of the list below.
- **scope** — optional, but if present must be one of the list below.
- **subject** — required, a short summary in the imperative mood (e.g. "add", not "added"/"adds").

### Guided commits

Just run `git commit` (no `-m`) and you'll be prompted step by step for type, scope, subject, body, and breaking-change info — a `prepare-commit-msg` hook launches the same wizard `pnpm commit` uses, so there's no need to remember a separate command. `git commit -m "..."` still works and skips straight to the commitlint check, same as before.

### Types

| Type       | Use for                                                                       |
| ---------- | ----------------------------------------------------------------------------- |
| `feat`     | A new feature                                                                 |
| `fix`      | A bug fix                                                                     |
| `docs`     | Documentation only changes                                                    |
| `style`    | Formatting changes with no code meaning change (whitespace, semicolons, etc.) |
| `refactor` | A code change that neither fixes a bug nor adds a feature                     |
| `perf`     | A code change that improves performance                                       |
| `test`     | Adding or correcting tests                                                    |
| `build`    | Changes to the build system or external dependencies                          |
| `ci`       | Changes to CI configuration and scripts                                       |
| `chore`    | Other changes that don't modify src or test files                             |
| `revert`   | Reverts a previous commit                                                     |

### Scopes

| Scope        | Covers                                                |
| ------------ | ----------------------------------------------------- |
| `token-core` | `packages/token-core`                                 |
| `web-app`    | `apps/web-app`                                        |
| `root`       | Repo-root tooling/config not tied to a single package |

This list grows as new packages are added — see `commit-conventions.json`, the single source of truth `commitlint.config.mjs` reads from; `pnpm commit`'s prompt reads the same list indirectly, via `commitlint.config.mjs`.

### Breaking Changes

Signal a breaking change either with `!` right before the colon, or a `BREAKING CHANGE:` footer (or both):

```
feat(token-core)!: change parseTokenFile's return type
```

```
feat(token-core): change parseTokenFile's return type

BREAKING CHANGE: parseTokenFile now returns a Result instead of throwing.
```

### Merge Commits & Rebasing

Merge commits are **forbidden in feature branches**. This repo rebase-merges PRs into `main`, so every individual commit in your branch lands permanently on `main`'s history — a `Merge branch 'main' into feature/x` commit would land there too, and it isn't a Conventional Commit message. If your branch falls behind `main`, rebase onto it instead of merging it in:

```
git fetch origin
git rebase origin/main
```

CI's commit-message check (see above) tolerates/skips merge-commit-shaped messages defensively, so an accidental merge commit won't spuriously fail the build — but that tolerance is a backstop, not an invitation to merge freely. Rebase is the required workflow.

This is enforced at two points, not just documented:

- **`pre-push` (local, `.husky/pre-push`)**: before any push, checks every
  commit about to be pushed for a merge commit and refuses the push if it
  finds one, pointing you at `git rebase` instead.
- **CI (`linear-history` job in `.github/workflows/ci.yml`)**: on every PR
  and push to `main`, checks the commit range for merge commits and fails
  the build if any are found — a backstop for a push that bypassed the
  local hook (`--no-verify`, a different clone, a direct API push).

Neither of these can reject a merge commit that's *already on* `main` — the
only fully authoritative enforcement is a repository **branch protection**
rule on `main` ("Require linear history" in GitHub's branch protection
settings), which rejects a non-fast-forward merge server-side regardless of
what CI or local hooks do. That setting lives in the repo's GitHub settings,
not in this repo's files, and should be enabled by a repo admin alongside
the checks above.

### Examples

```
fix(token-core): correct $type inheritance for nested groups without a declared type
```

```
docs(root): document the Error Handling constraint in project.md
```

```
chore(root): add commitlint and commitizen for conventional commit enforcement
```
