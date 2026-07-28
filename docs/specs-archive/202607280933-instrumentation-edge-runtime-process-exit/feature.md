# Feature: Fix Edge Runtime Warning for `process.exit` in `instrumentation.ts`

## Summary
`apps/web-app/instrumentation.ts`'s `register()` hook already guards its entire body with `if (process.env.NEXT_RUNTIME !== "nodejs") return;`, but Next.js/Turbopack still bundles `instrumentation.ts` for the Edge Runtime as well as the Node.js runtime, and its Edge Runtime static-analysis pass scans the file's own source for unsupported Node APIs regardless of that runtime guard. Because `process.exit(1)` is called directly, inline, in `instrumentation.ts` itself, the build emits a warning:

```
./apps/web-app/instrumentation.ts:11:5
A Node.js API is used (process.exit at line: 11) which is not supported in the Edge Runtime.
```

**Confirmed still reproducing against current code** (post "Migrate config.ts to Result Pattern"): running `pnpm build` (via Turborepo, which drives `next build` with Turbopack) on the current `main`-equivalent code reproduces this warning at line 11 (not line 16 as the original backlog text said — the line shifted because `instrumentation.ts` was rewritten by the config migration, but the underlying defect is unchanged).

The fix is to isolate the `process.exit` call itself behind a dynamic `import()` boundary, mirroring the technique `register()` already uses successfully for `node:fs`/`node:path` (via `./lib/config.ts`, imported with `await import("./lib/config.ts")`). Those Node-only APIs currently do **not** trigger Edge Runtime warnings, because they live inside a module reached only through a dynamic import — Turbopack's Edge Runtime static-analysis pass does not need to descend into a dynamically-imported module's source to build the Edge bundle. `process.exit`, by contrast, sits directly in `instrumentation.ts`'s own top-level function body, which the Edge bundle's static scan does inspect.

**Fix validated empirically during spec scoping**: moving the `console.error(...); process.exit(1);` pair into a new function in a separate module, `apps/web-app/lib/fatal-startup-error.ts`, and calling it via a second `await import(...)` inside the existing `nodejs`-only branch of `register()`, produces a build with `✓ Compiled successfully` and **zero** Edge Runtime warnings — confirmed by a scratch build during this scoping pass (reverted before writing this spec; no implementation changes are included in this commit). This module placement was subsequently confirmed as the final decision (see Resolved Decisions, RD-01).

## User Stories
- As a maintainer running `pnpm build`/CI, I want the production build to complete without spurious Edge Runtime compatibility warnings, so that real Edge Runtime incompatibilities introduced later aren't lost in noise from a known-safe false positive.
- As a contributor reading build output, I want `instrumentation.ts`'s fatal-startup-exit behavior to be structurally guaranteed never to reach the Edge Runtime bundle, not just guarded by a runtime `if` that Turbopack's static analysis doesn't trust.

## Functional Requirements

### FR-01: Isolate the Node-only fatal-exit path behind a dynamic import
Extract the "log the fatal startup error and terminate the process" logic (currently the `console.error(...)` + `process.exit(1)` pair inline in `register()`) into its own function, `exitOnFatalStartupError(message: string): never`, in a new dedicated module `apps/web-app/lib/fatal-startup-error.ts` — **confirmed** (not folded into `lib/config.ts`; see Resolved Decisions, RD-01). It is never statically imported by `instrumentation.ts` — only reached via `await import("./lib/fatal-startup-error.ts")` from inside the `if (process.env.NEXT_RUNTIME !== "nodejs") return;`-guarded branch, exactly as `./lib/config.ts` already is.

### FR-05: Test coverage for the new fatal-exit path
Add `apps/web-app/lib/fatal-startup-error.test.ts`, alongside the new module per this repo's "tests live alongside the code they test" convention, verifying `exitOnFatalStartupError`:
- Logs to `console.error` with the exact message format `` `[dtcg-editor] Fatal startup error: ${message}` ``.
- Calls `process.exit` with code `1`.
`process.exit` and `console.error` must be stubbed/spied (e.g. `vi.spyOn(process, "exit").mockImplementation(...)`, `vi.spyOn(console, "error")`) so the test process itself isn't terminated — this is the repo's first test stubbing `process.exit`; confirmed as in-scope (see Resolved Decisions, RD-03).

### FR-02: Preserve existing behavior exactly
The relocated function must preserve, byte-for-byte, the current observable behavior:
- Same log message format: `` `[dtcg-editor] Fatal startup error: ${result.error.message}` ``.
- Same channel: `console.error`.
- Same exit code: `process.exit(1)`.
- Same call site semantics: still only reached when `loadConfig()` returns an `Err`, still only in the `nodejs` runtime branch.

### FR-03: No suppression-only fix
Per the backlog item's explicit requirement, this must satisfy Next.js/Turbopack's static analysis structurally (no `process.exit` reference reachable in code Turbopack scans for the Edge bundle) — not silence the warning via an eslint-disable-style suppression, a `// @ts-expect-error`-equivalent, a Turbopack/webpack config exclusion, or by wrapping the call in something that merely obscures it syntactically (e.g. `globalThis["process"]["exit"]`) without actually changing what gets bundled.

### FR-04: `register()` remains the sole `instrumentation.ts` export
`instrumentation.ts` keeps its existing shape and single `register(): Promise<void>` export exercising the same two-step flow (load config, branch on `Result`) — only the fatal-error-handling implementation detail moves out, not the control flow visible in `register()` itself.

## Acceptance Criteria
- [x] AC-01: `pnpm build` (Turborepo → `next build` with Turbopack, per `docs/project.md`'s "CI relies on `pnpm build` as the sole type-checking gate" convention) completes with **zero** Edge Runtime compatibility warnings referencing `process.exit` (or any other API) in `instrumentation.ts` or the new module.
- [x] AC-02: `pnpm build` still succeeds overall (`✓ Compiled successfully`, all routes generated, exit code 0) — this is a bundling/static-analysis fix, not a behavior change, so nothing else about the build output should regress.
- [x] AC-03: At runtime, an invalid/missing `dtcg-editor.config.json` still causes the Node.js server process to log `[dtcg-editor] Fatal startup error: <message>` to stderr and exit with code 1, exactly as before the change (manually verified or covered by a test, per FR-02).
- [x] AC-04: A valid config file still results in `setConfigCache()` being called and the app serving requests normally — the success path in `register()` is untouched by this fix.
- [x] AC-05: No new third-party dependency is introduced (this is a pure code-organization fix using only built-in dynamic `import()`).
- [x] AC-06: `apps/web-app/lib/fatal-startup-error.test.ts` exists and passes, asserting `exitOnFatalStartupError` logs the exact `[dtcg-editor] Fatal startup error: <message>` string via `console.error` and calls `process.exit(1)`, with both stubbed so the test suite itself doesn't terminate.

## Technical Scope

### Affected Modules
- `apps/web-app/instrumentation.ts` — `register()`'s fatal-error branch changes from an inline `console.error` + `process.exit(1)` to a dynamically-imported call.
- `apps/web-app/lib/` — a new module, `fatal-startup-error.ts` (plus its test file), is added to host the relocated fatal-exit function (RD-01).

### New Components Required
- `exitOnFatalStartupError(message: string): never`, in `apps/web-app/lib/fatal-startup-error.ts`, containing exactly the relocated `console.error(...)` + `process.exit(1)` pair.
- `apps/web-app/lib/fatal-startup-error.test.ts`, the test coverage required by FR-05/AC-06.

### Integration Points
- `apps/web-app/lib/config.ts` — unchanged. `register()` continues to import `loadConfig`/`setConfigCache` from it via the existing `await import("./lib/config.ts")` call; the new fatal-exit function is a sibling dynamic import from a separate module, confirmed not folded into `config.ts` (RD-01).
- No API routes, token-core, or other packages are touched — this is confined to the Next.js instrumentation hook and its immediate startup-error-handling helper.

## Non-Functional Requirements
- **Performance**: negligible. `register()` already pays one dynamic-`import()` await for `config.ts`; adding a second small dynamic import for the (rare, failure-only) fatal-exit path has no measurable cost, and it's only ever reached on the already-slow-path (process about to exit).
- **Minimal Dependencies convention**: satisfied — this fix uses only the built-in dynamic `import()` syntax already established as the pattern for isolating Node-only code in this file. No new `package.json` entries.
- **TypeScript Strictness convention**: the new function's return type should be `never` (it always terminates via `process.exit`), which is expressible under strict settings with no relaxation needed.
- **Regression risk**: this exact class of bug (a Node-only API referenced directly in `instrumentation.ts`'s own top-level source, rather than behind a dynamic import) could recur if a future change adds another Node-only call inline in `register()` instead of routing it through `config.ts` or the new module. No automated guard against this recurrence is included in this feature — confirmed deferred to a separate backlog item (see Out of Scope and RD-02).

## Out of Scope
- Refactoring `instrumentation.ts`'s or the new module's error logging to use the `@dtcg-editor/errors` package's `Logger`/`consoleLogger`/`toLoggedUnknownError` convention (used elsewhere in `apps/web-app`, e.g. `lib/tokens/read.ts`, `scan.ts`, `write.ts`, and the route handlers). `instrumentation.ts`'s current `console.error` call already predates and bypasses that convention, and switching it is an unrelated concern from this backlog item's specific ask (the Edge Runtime static-analysis warning). Flagging this as a pre-existing inconsistency for a separate backlog item, not fixing it here.
- Any change to `lib/config.ts`'s `loadConfig`/`setConfigCache`/`getConfig`/error classes — these are unaffected by this fix.
- Any change to the "startup config validation fails fast via `process.exit(1)` in `instrumentation.ts`" architectural decision itself (documented in `docs/project.md`'s Architecture Decisions table, 2026-07-25 row) — this feature only changes *where in the file* that call's source lives, not whether/when it fires.
- Adding a dedicated CI/build-output or lint-level regression guard that would fail if this specific warning reappears (e.g. an ESLint `no-restricted-syntax` rule scoped to `instrumentation.ts` banning direct `process.exit` calls, or a CI step that greps `next build`'s output for Edge Runtime warnings). **Confirmed out of scope for this feature** (see Resolved Decisions, RD-02) — tracked instead as its own deferred backlog item: "Add a regression guard for the `apps/web-app/instrumentation.ts` Edge Runtime `process.exit` fix" (`docs/backlog.md`).
- Any other Edge Runtime compatibility warnings not currently present in the build output — none were observed besides this one during the confirmation build.

## Resolved Decisions
These were originally scoped as Open Questions (architecture/scope-level judgment calls this spec author could not resolve without a human decision). All three have since been resolved; no open questions remain.

- **RD-01 (was OQ-01) — Module placement**: **Confirmed** — the relocated fatal-exit function lives in a new dedicated module, `apps/web-app/lib/fatal-startup-error.ts`, reached via `await import(...)` inside the existing `nodejs`-only branch of `register()`. Not folded into `lib/config.ts`. This is the exact approach empirically validated during scoping (see Summary). Reflected in FR-01 and Technical Scope above.
- **RD-02 (was OQ-02) — Regression guard**: **Skip for this feature.** No ESLint rule or CI build-output check is implemented as part of this work. A separate, explicitly deferred backlog item now tracks it: "Add a regression guard for the `apps/web-app/instrumentation.ts` Edge Runtime `process.exit` fix" (`docs/backlog.md`), covering either an ESLint `no-restricted-syntax` rule scoped to `instrumentation.ts`, or a CI step that greps `next build`'s output for Edge Runtime warnings. Reflected in Out of Scope and Non-Functional Requirements above.
- **RD-03 (was OQ-03) — Test coverage**: **Confirmed in scope.** `apps/web-app/lib/fatal-startup-error.test.ts` is added, stubbing `process.exit`/`console.error` to assert the exact log message and exit code — this repo's first test that stubs `process.exit`. Reflected in new FR-05, AC-06, and Technical Scope's New Components Required above.
