# CLI to Bootstrap `dtcg-editor.config.json`

Implemented on: 2026-07-28

A new `apps/web-app/scripts/init-config.ts` CLI (`pnpm --filter web-app run init-config`) scaffolds `dtcg-editor.config.json` for a new user, replacing hand-written JSON. Supports interactive mode (prompts via `node:readline/promises`, confirms before overwriting an existing file) and flag-driven mode (`--tokens-dir <path>`, `--force`, `--help`, parsed with `node:util`'s built-in `parseArgs`) for scripted/CI use. Both modes validate against the exact `ConfigFileSchema` exported from `apps/web-app/lib/config.ts` — the same schema `instrumentation.ts` enforces at startup — so a config the CLI accepts always passes the app's own startup validation.

## Key files

- `apps/web-app/scripts/init-config.ts` — CLI core (`runInitConfig(io: InitConfigIO)`) + thin `main()` wrapper
- `apps/web-app/scripts/init-config.test.ts` — 10 Vitest cases exercising `runInitConfig` via injected IO
- `apps/web-app/lib/config.ts` — `ConfigFileSchema`, `CONFIG_FILE_NAME`, `describeCause` all exported for reuse by the CLI (no schema changes)
- `package.json` (root) — `engines.node` bumped `>=20` → `>=26.5.0`
- `.github/workflows/ci.yml` — both `actions/setup-node` steps bumped `"22"` → `"26"`

## Notable decisions

- **Injectable-core/thin-wrapper split**: `runInitConfig` holds all behavior; `main()` is the only code touching real `process.argv`/`process.stdin`/`process.stdout`/`process.exit`, making every interactive/re-prompt/existing-file branch testable via Vitest without spawning a child process.
- **No new dependency**: flag parsing uses `node:util`'s `parseArgs`, prompting uses `node:readline/promises` — both Node built-ins, consistent with the Minimal Dependencies constraint's built-ins-first bias.
- **`engines.node` bump to `>=26.5.0`** lets the script's native `.ts` execution run unflagged; since `engines` is advisory in this repo (no `engine-strict`), CI's Node-26 bump is the real enforcement gate.
- Reviewed (`sdd-review`): PASS, no Critical/Major findings. 2 Minor findings — one (duplicated `CONFIG_FILE_NAME`/`describeCause` between `config.ts` and `init-config.ts`) fixed in a follow-up commit (`53566f3`); one (timing-dependent `setTimeout` in a test) left as-is per human decision. 1 Info finding (broader-than-necessary Zod issue-path type) also left as-is. All 10 acceptance criteria independently re-verified.
