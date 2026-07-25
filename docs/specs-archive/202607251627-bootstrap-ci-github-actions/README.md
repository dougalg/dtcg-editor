# Bootstrap CI (GitHub Actions)

Implemented on: 2026-07-25

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs `pnpm build`, `pnpm lint`, and `pnpm test` (via Turborepo) as separate steps on pull requests into `main` and on pushes to `main`. It sets up pnpm via `corepack enable` (reading the `packageManager` field from `package.json`) and `actions/setup-node@v4` with `cache: pnpm`, keeping the action surface limited to GitHub-maintained actions. No separate typecheck step exists — `pnpm build` already type-checks every package (`tsc -p tsconfig.json` for `token-core`/`errors`, `next build` for `web-app`). CI-level Conventional Commit enforcement was explicitly descoped and split into its own backlog item (`docs/backlog.md`); the local husky `commit-msg` hook remains the only enforcement for now. All PR/push failure and deliberate-break scenarios (AC-05/AC-06) were verified live by the user after merge.
