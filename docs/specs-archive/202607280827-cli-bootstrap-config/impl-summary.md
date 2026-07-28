## Implementation Complete

### Files Created

- `apps/web-app/scripts/init-config.ts` — CLI core (`runInitConfig(io: InitConfigIO)`) + thin `main()` wrapper
- `apps/web-app/scripts/init-config.test.ts` — 10 Vitest cases exercising `runInitConfig` via injected IO

### Files Modified

- `apps/web-app/lib/config.ts` — `ConfigFileSchema` made `export const` (no schema changes)
- `apps/web-app/package.json` — added `"init-config": "node scripts/init-config.ts"` script
- `package.json` (root) — `engines.node` bumped `">=20"` → `">=26.5.0"`
- `.github/workflows/ci.yml` — both `actions/setup-node` steps' `node-version` bumped `"22"` → `"26"`
- `README.md` — added a short "Getting Started" section pointing at `pnpm --filter web-app run init-config`

### Acceptance Criteria

- [x] AC-01: Passed — manual pty-driven interactive run + `init-config.test.ts` "interactive mode writes a valid config on a single valid answer"
- [x] AC-02: Passed — manual flag-driven run + `init-config.test.ts` "flag-driven mode writes a valid config with zero prompts..."
- [x] AC-03: Passed — `init-config.test.ts` "interactive mode re-prompts on an invalid answer..." + "flag-driven mode rejects an invalid --tokens-dir..."
- [x] AC-04: Passed — manual run + `init-config.test.ts` "declines to overwrite...", "refuses to overwrite without --force...", "--force overwrites..."
- [x] AC-05: Passed — manual run + `init-config.test.ts` "--help returns usage text and does not write a file"
- [x] AC-06: Passed — `init-config.test.ts` flag-driven-write test asserts `loadConfig(dir)` succeeds on the written file
- [x] AC-07: Passed — `package.json`/`apps/web-app/package.json` diff review: no new `dependencies`/`devDependencies` entries
- [x] AC-08: Passed — `pnpm build`, `pnpm lint`, `pnpm test` all green (60/60 tests across the monorepo, 10 new)
- [x] AC-09: Passed — `init-config.test.ts` covers all 10 listed scenarios (interactive write, flag-driven write, re-prompt, flag-driven rejection, both overwrite-decline paths, `--force`, `--help`, non-TTY-without-flag, nonexistent-dir warning)
- [x] AC-10: Passed — root `package.json` `engines.node: ">=26.5.0"`; `.github/workflows/ci.yml`'s two `node-version` fields are `"26"`; script runs via plain `node scripts/init-config.ts`, no `--experimental-strip-types` anywhere

### Notes

- Local Node in the implementation environment is v24.13.0, not v26.5.0 — Node 26.5.0 was not available to test against directly. `pnpm install`/`build`/`lint`/`test` all ran successfully with only an advisory `Unsupported engine` warning (this repo has no `engine-strict`/`.npmrc` setting), consistent with plan.md's documented risk/mitigation: CI itself is bumped to Node 26 as the real enforcement gate, not local `engines`.
- No deviations from plan.md's architecture (injectable-core/thin-wrapper split, `node:util` `parseArgs`, existing-file check ordered before the `tokensDir` prompt) — implemented exactly as specified, including both non-blocking judgment calls plan.md had already resolved.
- Interactive mode verified against both a stream-based test harness (Vitest) and a real pty (manual check), since a plain piped stdin has `isTTY: false` and would exercise the non-interactive-error path instead.
