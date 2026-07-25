## Implementation Complete

### Files Created
- `packages/errors/{package.json,tsconfig.json}` — new zero-runtime-dependency package
- `packages/errors/src/{logger.ts,unknown-error.ts,index.ts}` — `Logger`, `consoleLogger`, `UnknownError`, `toLoggedUnknownError`
- `packages/errors/src/unknown-error.test.ts` — 3 tests
- `apps/web-app/lib/tokens/read.test.ts` — new file, 5 tests (no direct unit test existed for `readAndParseTokenFile` before this feature)

### Files Modified
- `packages/token-core/src/parse.ts` (+ `package.json`) — `parseNode`/`parseTokenFile` return `Result<T, TokenParseError>`; `JSON.parse` wrapped via `fromThrowable`, still mapped to `TokenParseError` (not `UnknownError` — already anticipated)
- `packages/token-core/src/parse.test.ts` — `assert.throws` → `Result` assertions
- `apps/web-app/lib/tokens/path-safety.ts` (+ test) — `resolveSafeTokenPath` returns `Result<string, PathTraversalError>`
- `apps/web-app/lib/tokens/read.ts` — `readAndParseTokenFile` returns `ResultAsync`; new `FileNotFoundError` (replaces the old inline `isFileNotFoundError` ENOENT check); other read failures → logged `UnknownError`
- `apps/web-app/lib/tokens/scan.ts` (+ test) — `collectJsonFiles`/`scanTokenDirectory` return `Result`/`ResultAsync`; `readdir` failures (previously **completely unhandled**, would crash uncaught) now become a logged `UnknownError`; per-file loop now reuses `readAndParseTokenFile` instead of duplicating read+parse logic
- `apps/web-app/app/api/tokens/[...path]/route.ts`, `apps/web-app/app/tokens/[...path]/page.tsx` — `try`/`catch`+`instanceof` chains replaced with `Result` branching; same status codes/messages
- `apps/web-app/app/api/tokens/route.ts`, `apps/web-app/app/page.tsx` — **new** error handling added (none existed before, since `scanTokenDirectory` never threw); `Err` → 500 / inline error message
- `apps/web-app/app/api/tokens/route.test.ts` — new 500 test case
- `apps/web-app/package.json` — added `neverthrow`, `@dtcg-editor/errors` (workspace)

### Acceptance Criteria
- [x] AC-01: Passed — `packages/token-core/src/parse.test.ts` (7 converted cases)
- [x] AC-02: Passed — `apps/web-app/lib/tokens/path-safety.test.ts` (5 converted cases)
- [x] AC-03: Passed — `apps/web-app/lib/tokens/read.test.ts` (5 cases, incl. ENOENT→`FileNotFoundError` and non-ENOENT→logged `UnknownError`)
- [x] AC-04: Passed — `apps/web-app/lib/tokens/scan.test.ts` (5 cases, incl. new nested-`readdir`-failure→`UnknownError` case)
- [x] AC-05: Passed — `apps/web-app/app/api/tokens/[...path]/route.test.ts` (5 cases, unchanged) + `apps/web-app/app/api/tokens/route.test.ts` (new 500 case)
- [x] AC-06: Passed (manual) — `pnpm build && pnpm start` + `curl` against a temp fixture: folder overview, valid tree, invalid-JSON message, missing-file fallback, and both API routes' bodies/status codes all match pre-migration behavior
- [x] AC-07: Passed — `packages/errors/src/unknown-error.test.ts` (3 cases); also empirically confirmed via console output during `scan`/`read` UnknownError test runs
- [x] AC-08: Passed — `pnpm build` (3/3), `pnpm lint` (6/6), `pnpm test` (6/6 tasks, 42 tests total: 3 errors + 11 token-core + 28 web-app), including new coverage for the two previously-untested `UnknownError` paths (`readdir` failure, non-ENOENT read failure)

### Notes
- **Deviation from plan:** the new list-route 500 test couldn't point a second config at a nonexistent directory as `plan.md` originally suggested — `getConfig()` memoizes the config module-level (`cachedConfig ??=`), so a later test in the same file can't swap it. Used `chmod 000` on the already-cached fixture's `tokens` directory instead (restored in `finally`), triggering the same real `EACCES` `readdir` failure.
- **Bug found and fixed during test-writing (not implementation code):** the `read.test.ts` fake-logger helper originally destructured a getter (`const { calls } = fakeLogger()`), which captures a frozen snapshot at destructure time rather than a live reference — silently made the "logged exactly once" assertion always see `0`. Fixed by exposing a mutable `state` object instead of a getter; caught immediately by the test itself failing.
- `scanTokenDirectory` now reuses `readAndParseTokenFile` per file instead of duplicating `readFile`+`parseTokenFile` inline (as the original code did) — a small dedup enabled by `read.ts` already existing, called out in `plan.md`'s Architecture Decisions.
- Every source file was `tsc`-verified in isolation immediately after being written, before moving to the next step — confirmed the "throws → Result" conversions were mechanical (each file compiled clean on its own, with only not-yet-migrated downstream consumers erroring) except for the two call sites flagged in `plan.md` as genuinely new logic (`app/api/tokens/route.ts`, `app/page.tsx`), which got dedicated new tests.
