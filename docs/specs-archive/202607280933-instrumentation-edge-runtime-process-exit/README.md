# Fix Edge Runtime Warning for `process.exit` in `instrumentation.ts`

Implemented on: 2026-07-28

`apps/web-app/instrumentation.ts`'s `register()` already guarded its entire body with `if (process.env.NEXT_RUNTIME !== "nodejs") return;`, but Turbopack still bundles `instrumentation.ts` for the Edge Runtime as well as Node, and its Edge Runtime static-analysis pass scans the file's own source for unsupported Node APIs regardless of that runtime guard — so `process.exit(1)`, called inline in `register()`, triggered a build-time Edge Runtime compatibility warning.

The fix isolates the Node-only "log the fatal startup error and terminate the process" logic behind a dynamic `import()` boundary, mirroring the technique `register()` already uses for `node:fs`/`node:path` via `./lib/config.ts`: the `console.error(...)` + `process.exit(1)` pair moved into a new sibling module, `apps/web-app/lib/fatal-startup-error.ts` (`exitOnFatalStartupError(message: string): never`), reached only via `await import("./lib/fatal-startup-error.ts")` inside the existing `nodejs`-only branch. Turbopack's Edge static-analysis pass does not descend into dynamically-imported modules, so once `process.exit` no longer appears in `instrumentation.ts`'s own source, the warning disappears structurally — not via suppression. This is a pure code-organization change: no control-flow change, no behavior change, no new dependency.

## Key files

- `apps/web-app/lib/fatal-startup-error.ts` — new module, `exitOnFatalStartupError(message: string): never`, the relocated `console.error`/`process.exit(1)` pair
- `apps/web-app/lib/fatal-startup-error.test.ts` — Vitest test stubbing `process.exit`/`console.error` (this repo's first test stubbing `process.exit`), asserting the exact log message and exit code
- `apps/web-app/instrumentation.ts` — `register()`'s fatal-error branch now dynamically imports and calls `exitOnFatalStartupError` instead of calling `console.error`/`process.exit` inline

## Notable decisions

- **New dedicated module, not folded into `config.ts`**: `fatal-startup-error.ts` is a sibling module to `config.ts`, reached by its own `await import(...)` call, matching this file's existing one-dynamic-import-per-Node-only-concern pattern rather than overloading `config.ts` with unrelated process-lifecycle responsibility.
- **No regression guard added** (deliberately deferred): no ESLint rule or CI build-output grep was added to catch a future reintroduction of an un-isolated `process.exit`/Node-only API directly in `instrumentation.ts`. Tracked separately as its own backlog item, "Add a regression guard for the `apps/web-app/instrumentation.ts` Edge Runtime `process.exit` fix" — intentionally untouched by this feature's archive.
- **Dead `return;` kept after `exitOnFatalStartupError(...)`** in `register()` for control-flow-narrowing/readability parity with the pre-change shape, even though the function's `never` return type makes it unreachable; `pnpm lint` does not flag it.
- Implemented via commit `8ad2051`. Reviewed via `sdd-review`: verdict PASS, no Critical/Major findings. All 6 acceptance criteria independently re-verified, including a forced non-cached `pnpm build` confirming zero Edge Runtime warnings and manual runtime spot-checks of both the fatal-exit and success paths. Three Minor/style notes raised (no dedicated test of `register()`'s own error-forwarding branch — a pre-existing gap, not a regression; no JSDoc on the new module; the documented dead `return;` above) did not require action before merge.
