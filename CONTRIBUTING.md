# Contributing

## Commit Messages

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/) on every commit via a local git hook. A commit that doesn't conform is rejected before it's created.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

- **type** — required, one of the list below.
- **scope** — optional, but if present must be one of the list below.
- **subject** — required, a short summary in the imperative mood (e.g. "add", not "added"/"adds").

### Easiest way: `pnpm commit`

Run `pnpm commit` instead of `git commit` and you'll be prompted step by step for type, scope, subject, body, and breaking-change info — it assembles a valid message for you. This is the recommended way to commit.

### Types

| Type | Use for |
|------|---------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Formatting changes with no code meaning change (whitespace, semicolons, etc.) |
| `refactor` | A code change that neither fixes a bug nor adds a feature |
| `perf` | A code change that improves performance |
| `test` | Adding or correcting tests |
| `build` | Changes to the build system or external dependencies |
| `ci` | Changes to CI configuration and scripts |
| `chore` | Other changes that don't modify src or test files |
| `revert` | Reverts a previous commit |

### Scopes

| Scope | Covers |
|-------|--------|
| `token-core` | `packages/token-core` |
| `web-app` | `apps/web-app` |
| `root` | Repo-root tooling/config not tied to a single package |
| `docs` | Documentation-only changes |

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
