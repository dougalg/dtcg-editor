# Enforce Conventional Commits

Implemented on: 2026-07-25

Local-only enforcement of [Conventional Commits](https://www.conventionalcommits.org/) across the repo: a `commit-msg` git hook (commitlint) rejects non-conforming messages, and an interactive `pnpm commit` CLI (commitizen + `cz-customizable`) walks contributors through composing a valid one. Both read from a single shared config (`commit-conventions.cjs`) so the enforced rules and the CLI's prompts can never drift apart. Commit types use the standard Conventional Commits set; scopes are a fixed enum (`token-core`, `web-app`, `root`, `docs`). `CONTRIBUTING.md` documents the standard for anyone committing without the CLI. CI-level enforcement and changelog/release-notes generation are explicitly out of scope, tracked in `docs/backlog.md`.

Key files: `commit-conventions.cjs`, `commitlint.config.cjs`, `.cz-config.cjs`, `.husky/commit-msg`, `CONTRIBUTING.md`, `commit-conventions.test.cjs`.

Notable decisions (recorded in `docs/project.md`'s Architecture Decisions table): the Turborepo `//#<task>` root-task pattern (`//#test:commits`, `//#lint:root`) for wiring root-only scripts into the pipeline, and an `eslint.config.mjs` exemption for `**/*.cjs` files from the `no-require-imports` rule.

`/sdd-review` found 2 Critical, 1 Major, 1 Minor, and 2 Info findings. The Major/Minor/Info findings were fixed and re-verified. The 2 Critical findings — AC-06 (`pnpm commit`'s full interactive flow) and AC-07 (hook auto-install on a genuinely fresh clone) both lack automated test coverage, verified only by partial manual/simulated checks — were knowingly accepted rather than fixed, per the user's explicit decision. AC-06 and AC-07 remain unchecked in the archived `feature.md`.
