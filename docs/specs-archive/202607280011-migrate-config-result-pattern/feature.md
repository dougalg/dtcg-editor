# Feature: Migrate Config Loading to Result-Pattern Error Handling

## Summary
Migrate `apps/web-app/lib/config.ts`'s `ConfigError`/`loadConfig` — the startup config-loading path invoked from `instrumentation.ts`'s `register()` hook — from thrown exceptions to `neverthrow` `Result`, per `docs/project.md`'s Error Handling constraint. This is the same mechanism change as the prior "Migrate to Result-Pattern Error Handling" feature (`docs/specs-archive/202607251455-migrate-to-result-pattern-error-handling/`), applied to a separate, previously out-of-scope call path: startup config validation, not the token read chain. Per that prior migration's evidence-based known/unknown methodology (audit what the code *currently* handles), this path introduces **no new `UnknownError` cases** — every throwable call in `loadConfig` (`readFileSync`, `JSON.parse`) is already individually caught and mapped to `ConfigError` today, and zod's `safeParse` never throws. `ConfigError` therefore stays `loadConfig`'s sole named error, unchanged in shape (a message-only `Error` subclass), consistent with how `TokenParseError`/`PathTraversalError`/`FileNotFoundError` were kept single-shape rather than turned into discriminated unions. A second, narrowly-scoped named error, `ConfigNotInitializedError`, is introduced separately for `getConfig()`'s should-be-unreachable memoization fallback (see FR-02) — this is a defensive-programming edge case distinct from `loadConfig`'s own error taxonomy, not a reopening of it. This is a refactor of error-handling mechanism only — existing startup log messages and `process.exit(1)` fail-fast behavior are preserved exactly.

## User Stories
- As a maintainer, I want config loading — like the rest of this codebase's fallible operations — to return a `Result` instead of throwing, so `instrumentation.ts` can't accidentally let a config error propagate as an unhandled exception.
- As a maintainer, I want the startup fail-fast behavior (log a clear message, `process.exit(1)`) to be unchanged from today, since this is a mechanism refactor, not a behavior change.
- As a developer extending this codebase, I want the known/unknown error classification for config loading to follow the same evidence-based methodology already established for the token read chain, rather than inventing a new taxonomy.

## Functional Requirements

### FR-01: `loadConfig` Returns `Result<Config, ConfigError>`
`loadConfig(cwd?: string): Config` (throws `ConfigError`) becomes `loadConfig(cwd?: string): Result<Config, ConfigError>`. Every current throw site is wrapped using `neverthrow`'s `fromThrowable` (the established pattern already used in `token-core/parse.ts` and `token-core/serialize.ts`), composed via `.andThen`/`.map` rather than nested `try`/`catch`:
- `readFileSync` failure (missing file, permission error, etc.) → `ConfigError` (unchanged message format: `Could not read config file at "<path>": <cause>`).
- `JSON.parse` failure → `ConfigError` (unchanged message format: `Invalid JSON in config file at "<path>": <cause>`).
- `ConfigFileSchema.safeParse` failure → `ConfigError` (unchanged message format, same issue-joining logic).

No `UnknownError` variant is introduced — see Summary. `ConfigError` itself keeps its current shape (`class ConfigError extends Error`, message-only), matching the precedent set for `TokenParseError`/`PathTraversalError`/`FileNotFoundError`.

### FR-02: `getConfig()` Stays a Plain, Synchronous `Config`-Returning Memoization Wrapper
`getConfig()` — the memoized wrapper called at request time by `app/page.tsx`, `app/api/tokens/route.ts`, `app/api/tokens/[...path]/route.ts`, and `app/tokens/[...path]/page.tsx` — keeps its current signature (`(): Config`, no `Result`). Internally it calls `loadConfig()` and caches the unwrapped `Config` on success. This is a decided scoping choice, not an open one: it keeps all four request-time consumers completely untouched, since by this app's existing fail-fast startup design (`instrumentation.ts` calls `process.exit(1)` before Next.js serves any request if config loading fails), a request-time call to `getConfig()` can only encounter an `Err` if that startup invariant was itself violated — a broken deployment/programming invariant, not a normal fallible-operation outcome the Result pattern is meant to model.

In that (should-be-unreachable) case, `getConfig()` throws a new named error type, `ConfigNotInitializedError` (extends `Error`, `name = "ConfigNotInitializedError"`, defined in `config.ts` alongside `ConfigError`) — not `ConfigError` (this isn't a config-content problem), and not part of the `Result` chain (it's a thrown defensive assertion, since `getConfig()`'s own signature stays a plain `Config` return). It is a *named* error type rather than a plain assertion-style `Error`, per this codebase's convention of using named error types consistently — even for a defensive, provably-unreachable-today branch — rather than an ad hoc bare `Error`/`throw new Error(...)`. Documented in code as "this indicates `register()` in `instrumentation.ts` did not run or did not fail fast as designed."

### FR-03: `instrumentation.ts`'s `register()` Branches on `Result` Instead of `try`/`catch`
`register()` calls `loadConfig()` directly (not `getConfig()`, so the cache gets populated with a known-good value before any request can reach it) and branches on the returned `Result` instead of `try`/`catch` + `instanceof`. Preserves current behavior exactly:
- `Ok`: cache the value (so subsequent `getConfig()` calls at request time are cache hits), proceed normally.
- `Err`: log `` `[dtcg-editor] Fatal startup error: ${error.message}` `` (unchanged message format — every error here is now always a `ConfigError`, so the current generic/`else` fallback branch for non-`ConfigError` errors is removed as dead code), then `process.exit(1)` (unchanged).

### FR-04: `config.test.ts` Updated to Assert on `Result` Instead of `assert.throws`
All five existing tests in `apps/web-app/lib/config.test.ts` are rewritten to call `loadConfig(dir)` and assert `result.isErr()` / `result.error instanceof ConfigError` (or `result.isOk()` / `result.value` for the success case) instead of `assert.throws`. No new test cases are required beyond that mechanical rewrite — this migration introduces no new error paths (no `UnknownError`) to cover, unlike the prior migration's `readdir`/non-ENOENT-read gaps.

## Acceptance Criteria
- [x] AC-01: `loadConfig` returns `Result<Config, ConfigError>` and no longer throws for any input that previously threw `ConfigError` (missing file, invalid JSON, missing/empty `tokensDir`).
- [x] AC-02: `instrumentation.ts`'s `register()` no longer contains a `try`/`catch`; it branches on `loadConfig()`'s `Result`, producing the exact same log message and `process.exit(1)` behavior as today for a failing config.
- [x] AC-03: `getConfig()` retains its current `(): Config` signature; all four existing request-time call sites (`app/page.tsx`, `app/api/tokens/route.ts`, `app/api/tokens/[...path]/route.ts`, `app/tokens/[...path]/page.tsx`) require zero code changes.
- [x] AC-04: All five tests in `config.test.ts` pass using `Result`-based assertions instead of `assert.throws`; no test relies on a thrown `ConfigError` anymore.
- [x] AC-05: `pnpm build`/`lint`/`test` (Turborepo, per the Bootstrap CI feature) pass with no new `any`/type-checking gaps introduced by the `Result` types.
- [x] AC-06: No `UnknownError` case is added for config loading (confirmed by audit: every current throw site already funnels to `ConfigError`) — `packages/errors` is unchanged by this feature.
- [x] AC-07: `getConfig()`'s should-be-unreachable fallback (reached only if the memoization cache is empty and `loadConfig()` returns `Err` — i.e. `register()` didn't run or didn't fail fast as designed) throws `ConfigNotInitializedError`, a new named `Error` subclass defined in `config.ts`, not a bare/untyped `Error`.

## Technical Scope

### Affected Modules
This feature's confirmed footprint is exactly 3 files:
- `apps/web-app/lib/config.ts` (`loadConfig` signature changes to `Result<Config, ConfigError>`; `getConfig` internals updated to unwrap that `Result` and cache on success, `getConfig`'s own public signature unchanged; adds the new `ConfigNotInitializedError` type alongside `ConfigError`)
- `apps/web-app/instrumentation.ts` (`register()` branches on `Result`)
- `apps/web-app/lib/config.test.ts` (assertions rewritten for `Result`)

Confirmed zero-change, out of scope: `app/page.tsx`, `app/api/tokens/route.ts`, `app/api/tokens/[...path]/route.ts`, `app/tokens/[...path]/page.tsx` — all call `getConfig()`, whose public signature is unchanged (FR-02/AC-03). Also not touched: `packages/errors` — no new `UnknownError` path exists for this feature to use it; `ConfigNotInitializedError` is a named error local to `config.ts`, not a `packages/errors` addition.

### New Components Required
- One new named error type: `ConfigNotInitializedError`, defined in `apps/web-app/lib/config.ts` alongside `ConfigError` (not a new package, not part of `packages/errors`) — covers `getConfig()`'s should-be-unreachable fallback per FR-02. `ConfigError` and `Config` themselves stay exactly where they are today, unchanged in shape.

### Integration Points
- `neverthrow` (`Result`, `fromThrowable` — already an Approved Dependency, already used identically in `token-core/parse.ts` and `token-core/serialize.ts`).
- No new external integrations.

## Non-Functional Requirements
- **Performance**: no expected change — mechanism change only (thrown exception → returned value), not a change to what work is done. `getConfig()`'s memoization behavior (cache once, reuse for the process lifetime) is unchanged.
- **Security**: no change.
- **Scalability**: N/A.
- **Behavioral compatibility**: this is a refactor, not a feature change. Every existing observable behavior — the exact startup log message text, `process.exit(1)` on failure, `getConfig()`'s memoization, and every downstream consumer's behavior — must be identical before and after.

## Out of Scope
- The four request-time consumers of `getConfig()` (`app/page.tsx`, both `route.ts` files, `app/tokens/[...path]/page.tsx`) — per FR-02, `getConfig()`'s public signature is unchanged, so these need no changes.
- Backlog item "Inject dependencies by default (e.g. `fs.readFile`)" — related but separate; `readFileSync`/`JSON.parse` are still called directly in `config.ts`, just wrapped into a `Result` at the call site via `fromThrowable`, exactly as `token-core/parse.ts` does today.
- Backlog item "CLI to bootstrap `dtcg-editor.config.json`" — unrelated, separate concern.
- Backlog item "Fix Edge Runtime warning for `process.exit`" — unrelated to the error-handling mechanism; `instrumentation.ts`'s `process.exit(1)` call site and its Edge-Runtime guard (`if (process.env.NEXT_RUNTIME !== "nodejs") return;`) are unchanged by this feature.
- UI-layer `Result` consumption patterns (React hooks, error boundaries) — already explicitly deferred by `docs/project.md`'s Error Handling constraint; not reopened here, and doesn't apply anyway since `getConfig()`'s signature isn't changing.
- Adding a discriminated `kind`/reason field to `ConfigError` (e.g. distinguishing "file missing" from "invalid JSON" from "schema violation") — kept as a single opaque-message shape, consistent with `TokenParseError`/`PathTraversalError`/`FileNotFoundError` precedent; not reopened here.

---

## Revision History

| Date | Change Summary |
|------|----------------|
| 2026-07-27 | Initial spec |
| 2026-07-27 | Resolved both open scoping questions per human confirmation: `getConfig()`'s public signature stays `(): Config` unchanged (3-file footprint: `config.ts`, `instrumentation.ts`, `config.test.ts` — the four request-time consumers need zero changes), and its should-be-unreachable memoization fallback throws a new named error type, `ConfigNotInitializedError`, instead of a plain assertion-style `Error`. Removed the "Assumptions to Confirm (Open Questions)" section; updated FR-02, Technical Scope, New Components Required, Out of Scope, and Summary accordingly; added AC-07 to make the new named error type verifiable. |
