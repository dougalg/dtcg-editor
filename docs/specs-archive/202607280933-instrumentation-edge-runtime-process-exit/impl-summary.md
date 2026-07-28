## Implementation Complete

### Files Created

- `apps/web-app/lib/fatal-startup-error.ts` — `exitOnFatalStartupError(message: string): never`
- `apps/web-app/lib/fatal-startup-error.test.ts` — Vitest test for the new module

### Files Modified

- `apps/web-app/instrumentation.ts` — fatal-error branch now dynamically imports `exitOnFatalStartupError` instead of calling `console.error`/`process.exit` inline

### Acceptance Criteria

- [x] AC-01: Passed — `pnpm build` output has zero "Edge Runtime"/`process.exit` mentions (verified via grep on full build log, both fresh and cached runs)
- [x] AC-02: Passed — `pnpm build` succeeded, `✓ Compiled successfully`, all 5 Turborepo tasks successful, all routes generated
- [x] AC-03: Passed — manual run of built server with no config file present logged `[dtcg-editor] Fatal startup error: Could not read config file at "...": ENOENT...` to stderr and exited with code 1; also covered by `fatal-startup-error.test.ts`
- [x] AC-04: Passed — manual run with a valid `dtcg-editor.config.json` served `GET /` with HTTP 200, no fatal error logged
- [x] AC-05: Passed — no `package.json` changes; only built-in dynamic `import()` used
- [x] AC-06: Passed — `apps/web-app/lib/fatal-startup-error.test.ts` exists, asserts exact message string and `process.exit(1)` call, both stubbed via `vi.spyOn`/`mockRestore()` in a `finally` block; `pnpm --filter web-app test` shows 13 test files / 75 tests passing

### Notes

- No deviations from plan.md. The dead `return;` after `exitOnFatalStartupError(...)` in `instrumentation.ts` was kept, per plan.md's own resolution — `pnpm lint` did not flag it as unreachable, so no change was needed.
- Rebased branch onto `main` before implementing (main had moved: eslint upgraded to 10.8.0 workspace-wide, `apps/web-app/eslint.config.mjs`'s `settings.react.version` fix included); rebase was clean, no conflicts.
- `pnpm lint` passed clean across all 10 Turborepo lint tasks (5 packages x build+lint where applicable) under the upgraded eslint 10 config — no new findings in either changed/new file.
- Manual runtime spot-checks (AC-03/AC-04) were run against a `next start` server on a non-default port (3987) since port 3000 was occupied by a concurrent worktree's dev server; the temporary `dtcg-editor.config.json` created for the AC-04 check was removed afterward (git status confirmed clean of stray files before commit).
