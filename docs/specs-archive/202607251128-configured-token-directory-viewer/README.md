# Configured Token Directory Viewer

Implemented on: 2026-07-25

The first end-to-end feature in the repo: a Next.js web app reads a target directory path from `dtcg-editor.config.json` at startup (validated and fail-fast via `instrumentation.ts`), recursively scans it for `*.json` files, parses each with a new `token-core` library (`parseTokenFile`, Zod-backed), and renders a folder overview plus a per-file token tree (name, `$type`, `$value`). Invalid files are flagged individually without blocking the rest of the scan. Read-only — no write/edit functionality.

This feature also bootstrapped the monorepo itself: pnpm workspaces, Turborepo, root strict `tsconfig.base.json`, and the root ESLint flat config, alongside the two new packages (`packages/token-core`, `apps/web-app`).

Key files: `packages/token-core/src/{parse,resolve-type}.ts`, `apps/web-app/instrumentation.ts`, `apps/web-app/lib/tokens/{scan,path-safety,read}.ts`, `apps/web-app/app/api/tokens/**`, `apps/web-app/app/{page,tokens/[...path]/page}.tsx`.

Notable decisions (recorded in `docs/project.md`'s Architecture Decisions table): the `packages/*` vs `apps/*` split, startup validation via `instrumentation.ts`, `Response.json()` over `NextResponse.json()`, and a deliberate partial application of the Round-Trip Fidelity constraint (`serialize()` not yet built, since this feature is read-only).
