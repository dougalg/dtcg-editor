# Implementation Plan: Enforce Conventional Commits

## Overview
This is pure repo-root tooling — no `packages/*` or `apps/*` code is touched. A single shared config file (`commit-conventions.cjs`) is the source of truth for the allowed commit types and scopes; both `commitlint` (the enforcement hook) and `commitizen`'s `cz-customizable` adapter (the interactive CLI) read from it, so the two lists can never drift apart. `husky` wires the `commit-msg` hook into git and installs it automatically via the root `prepare` script. A `CONTRIBUTING.md` documents the standard for anyone committing without the CLI.

## Architecture Decisions

- **Shared source of truth, not two hand-maintained lists.** `commit-conventions.cjs` exports `{ types: [{ type, description }], scopes: [{ scope, description }] }`. `commitlint.config.cjs` and `.cz-config.cjs` both `require()` it and reshape it into whatever format their tool expects. This directly satisfies FR-05's requirement that the CLI and the hook validate against the same rules.
- **`cz-customizable` over `cz-conventional-changelog`** as the commitizen adapter. `cz-conventional-changelog` is customizable mainly via a `.czrc` `types` override and doesn't cleanly support a fixed *scope* list driven from an external file; `cz-customizable` takes a plain JS config file that can `require()` another module, which is exactly the shared-source-of-truth shape needed here (resolves an Open Question from `feature.md`).
- **`husky`** for hook installation (resolves another Open Question from `feature.md`). It's the tool both `commitlint`'s and `commitizen`'s own docs recommend for this pairing, minimizing custom wiring versus hand-rolling install logic.
- **Explicit `.cjs` extension** on every new root config file (resolves the last Open Question), so they resolve as CommonJS regardless of root `package.json`'s `type` field (currently unset, i.e. CommonJS by default) — avoids ambiguity if that ever changes.
- **Root-level test, wired into Turborepo via the `//#<task>` root-task syntax.** `pnpm-workspace.yaml` only globs `packages/*` and `apps/*`, so `turbo run test` doesn't automatically discover a root-level `*.test.cjs` file the way it discovers each package's own `test` script. Turborepo has an explicit mechanism for this: a `//#test:commits` entry in `turbo.json` registers the root package's `test:commits` script as its own task node, and adding it to the existing `test` task's `dependsOn` (`["^build", "//#test:commits"]`) means a plain `pnpm test` runs it alongside every package's tests, cached like any other task — no separate command to remember.
- **New dependencies requiring justification** (per Minimal Dependencies convention):
  - **`@commitlint/cli` + `@commitlint/config-conventional`** — commit-message format validation against the full Conventional Commits spec (header length, blank-line-before-body, etc., not just type/scope) is exactly what this library exists for; hand-rolling full spec compliance would mean re-implementing rules this library already covers correctly.
  - **`commitizen` + `cz-customizable`** — an interactive multi-step prompt CLI (type → scope → subject → body → breaking change) with validation matching the commit-msg hook is a meaningfully bigger surface than a regex check; both are small, focused packages purpose-built for this exact pairing.
  - **`husky`** — thin wrapper that wires a script into git's native hook mechanism and reinstalls it on every `pnpm install`; the alternative is hand-writing and maintaining that install logic ourselves for marginal benefit.

## Implementation Steps

### Step 1: Shared Commit Conventions Config
- [x] `commit-conventions.cjs` at repo root — `module.exports = { types: [...], scopes: [...] }`, each entry `{ value, description }`. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert` (FR-02). Scopes: `token-core`, `web-app`, `root`, `docs` (FR-03), each with a one-line description of what it covers.
- Files: `commit-conventions.cjs`

### Step 2: Commitlint Setup
- [x] `pnpm add -D @commitlint/cli @commitlint/config-conventional` at root
- [x] `commitlint.config.cjs` — extends `@commitlint/config-conventional`; overrides the `type-enum` and `scope-enum` rules with arrays built from `commit-conventions.cjs` (`['error', 'always', types.map(t => t.value)]`, `scope-enum` left non-required so a bare `type: subject` still passes, per FR-03). No change needed to the base config's breaking-change handling — `@commitlint/config-conventional` already accepts both `!` and a `BREAKING CHANGE:` footer (FR-04).
- Files: `commitlint.config.cjs`, root `package.json` (devDependencies)

### Step 3: Commitizen + cz-customizable Setup
- [x] `pnpm add -D commitizen cz-customizable`
- [x] `.cz-config.cjs` — `require()`s `commit-conventions.cjs`, maps types to cz-customizable's `{ value, name }` shape and scopes to its `scopes: [{ name }]` shape; `allowCustomScopes: false` (enforces the fixed enum in the prompt itself, not just at commit time); `allowBreakingChanges: ['feat', 'fix']`.
- [x] Root `package.json`: add `"config": { "commitizen": { "path": "cz-customizable" } }` and a `"commit": "cz"` script (FR-05).
- Files: `.cz-config.cjs`, root `package.json`

### Step 4: Hook Installation
- [x] `pnpm add -D husky`
- [x] `pnpm exec husky init` (or equivalent manual setup) to create `.husky/` and wire a `"prepare": "husky"` script into root `package.json` (FR-06) — removed husky's default `pre-commit` sample (`pnpm test`), which wasn't part of this feature's scope
- [x] `.husky/commit-msg` — `npx --no -- commitlint --edit "$1"`, executable (`chmod +x`)
- Files: root `package.json` (`prepare` script), `.husky/commit-msg`

### Step 5: Written Standard
- [x] `CONTRIBUTING.md` at repo root — commit message structure, the type list and scope list (pulled from `commit-conventions.cjs` so it can't silently drift out of sync — written by hand here, but sourced from the same data when authoring), breaking-change syntax (`!` and footer), 2–3 full example commit messages, and a pointer to `pnpm commit` as the recommended way to compose one (FR-07).
- Files: `CONTRIBUTING.md`

### Step 6: Tests & Verification
- [x] `commit-conventions.test.cjs` (co-located with `commitlint.config.cjs`, per this repo's test-colocation convention) — **deviation from plan:** `@commitlint/lint`/`@commitlint/load` aren't resolvable under pnpm's strict `node_modules` without adding them as two more explicit dependencies beyond what was justified above; instead the test spawns the real `commitlint` CLI binary (`node_modules/.bin/commitlint`, already an explicit dependency) via stdin, which is also a more faithful test since it's the exact binary the git hook invokes. Asserts: a malformed message fails (AC-01), an out-of-enum type fails (AC-02), an out-of-enum scope fails while no-scope and in-enum-scope pass (AC-03), a well-formed message passes (AC-04), and both `!` and a `BREAKING CHANGE:` footer pass (AC-05). All 8 cases pass.
- [x] Root `package.json`: add `"test:commits": "node --test commit-conventions.test.cjs"` script.
- [x] `turbo.json`: add a `"//#test:commits": { "outputs": [] }` task entry, and add `"//#test:commits"` to the existing `"test"` task's `dependsOn` (alongside `"^build"`) — see Architecture Decisions. Verified with `turbo run test --dry` that it appears exactly once, scoped to root (`//#test:commits`), not duplicated per workspace; `pnpm test` runs it alongside `token-core`/`web-app` tests.
- [x] Manual verification: AC-06 — `pnpm commit`/`cz` correctly loads `.cz-config.cjs` and renders the type-selection prompt with our custom type list (confirmed via a non-interactive run); full interactive click-through to a completed commit needs a real TTY, which this session doesn't have — same limitation noted for UI verification in the prior feature's `impl-summary.md`. AC-07 — confirmed the hook mechanism: git's `core.hooksPath` points at `.husky/_` (auto-regenerated by the `prepare` script, gitignored via `.husky/_/.gitignore`), which dispatches to the committed `.husky/commit-msg` file; simulated by removing `.husky/` and re-running `pnpm install`, which correctly regenerated `_` (our `commit-msg` file must be git-committed to survive a real fresh clone, which it will be). AC-08 — `CONTRIBUTING.md` reviewed against FR-07: format, types, scopes, breaking-change syntax, and examples all present.
- **Bug found and fixed during verification:** `cz-customizable` only auto-discovers a file literally named `.cz-config.js`, not `.cz-config.cjs` — it failed with "Unable to find a configuration file" until an explicit `"config": { "cz-customizable": { "config": "./.cz-config.cjs" } }` override was added to root `package.json`. Keeps the `.cjs` naming consistent (per this plan's Architecture Decisions) instead of renaming the file to work around the default lookup.
- Files: `commit-conventions.test.cjs`, root `package.json`, `turbo.json`

## Acceptance Criteria Mapping
| AC | Verified By |
|----|-------------|
| AC-01: malformed message rejected | `commit-conventions.test.cjs` — malformed-message case |
| AC-02: out-of-enum type rejected | `commit-conventions.test.cjs` — invalid-type case |
| AC-03: out-of-enum scope rejected; no-scope/valid-scope accepted | `commit-conventions.test.cjs` — invalid-scope, no-scope, valid-scope cases |
| AC-04: valid commit accepted | `commit-conventions.test.cjs` — valid-message case |
| AC-05: `!` and `BREAKING CHANGE:` footer accepted | `commit-conventions.test.cjs` — both breaking-change cases |
| AC-06: `pnpm commit` interactive flow works | Manual: run `pnpm commit` end-to-end |
| AC-07: hook auto-installs on fresh `pnpm install` | Manual: fresh clone + `pnpm install`, inspect `.husky/commit-msg`, attempt a bad commit |
| AC-08: `CONTRIBUTING.md` documents the standard | Manual review against FR-07 |

## Risks & Mitigations
- **Risk:** `husky`'s `prepare` script can fail in environments with no `.git` directory (e.g. some CI/Docker build contexts that copy source without git history). → **Mitigation:** this repo is private and always cloned with git in practice; if this becomes a real problem later, `"prepare": "husky || true"` is a one-line fix — not applied preemptively since it isn't a current issue.
- **Risk:** `cz-customizable` and `commitlint`'s config shapes differ (`{value, name}` prompt entries vs. plain enum arrays), so the "shared source of truth" could silently become two subtly different mappings if not careful. → **Mitigation:** both config files import the same `commit-conventions.cjs` array and transform it inline (not separately re-typed), so a new type/scope only ever needs to be added in one place.
- **Risk:** Turborepo's guardrails specifically require the `//#<task>` syntax (not a bare `test:commits` key) to register a root-package script as a task — using the bare form is a documented footgun (Turborepo warns it can cause every workspace to inherit the root script). → **Mitigation:** Step 6 uses `//#test:commits` explicitly; verify with `turbo run test --dry` that it appears once, scoped to the root package, not duplicated per workspace.

## Estimated Complexity
**Low-Medium.** No application code changes and no new architectural concepts, but wiring three tools (commitlint, commitizen, husky) together correctly around one shared config — instead of letting each tool's config drift independently — needs careful attention in Steps 2–3.
