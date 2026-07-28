# Contributing

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

This list grows as new packages are added — see `commit-conventions.cjs`, the single source of truth both the git hook and `pnpm commit` read from.

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
