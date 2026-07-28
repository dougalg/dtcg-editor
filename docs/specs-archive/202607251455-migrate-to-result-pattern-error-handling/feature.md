# Feature: Migrate to Result-Pattern Error Handling

## Summary

Migrate the entire DTCG token read path — `token-core`'s `parseTokenFile`/`parseNode` and every web-app consumer downstream of it (`path-safety.ts`, `read.ts`, `scan.ts`, both API routes, and both page components) — from thrown exceptions to `neverthrow` `Result`/`ResultAsync`, per `docs/project.md`'s Error Handling constraint. Stands up a new `@dtcg-editor/errors` package providing the shared `UnknownError` type and injected `Logger`. Which errors become named ("known") types versus fall through to `UnknownError` is decided by auditing what this codebase _currently_ explicitly handles: anything already discriminated today (`TokenParseError`, `PathTraversalError`, and ENOENT/file-not-found) stays a named error; anything not currently discriminated (other fs failures, `readdir` failures) becomes `UnknownError`, logged at the point it's caught. This is a refactor of error-handling mechanism, not a behavior change — existing HTTP status codes and user-facing messages are preserved.

## User Stories

- As a maintainer, I want every fallible operation in the token read path to return a `Result` instead of throwing, so error handling is explicit and consistent, per this repo's Error Handling constraint.
- As a maintainer, I want genuinely unexpected failures (not just the ones we already anticipated) to be caught, logged, and surfaced instead of crashing a request or a scan.
- As a developer extending this codebase, I want a clear, evidence-based rule for what counts as a "known" vs "unknown" error, rather than a speculative taxonomy.

## Functional Requirements

### FR-01: `@dtcg-editor/errors` Package

New package (`packages/errors`) exporting: the shared `UnknownError` type (`{ kind: "unknown"; cause: unknown; context?: string }`, per `docs/project.md`), the injected `Logger` interface (`{ error(obj: Record<string, unknown>, msg?: string): void }`, pino-shaped), and a helper for converting a caught throw into a logged `UnknownError` at the point it's caught (exact API finalized in `plan.md`).

### FR-02: `token-core` — `parseTokenFile`/`parseNode` Return `Result`

`parseTokenFile` changes from `(raw: unknown) => TokenDocument` (throws `TokenParseError`) to `(raw: unknown) => Result<TokenDocument, TokenParseError>`. Every failure path in `parse.ts` is already deliberately mapped to `TokenParseError` today (invalid JSON, invalid node shape, invalid metadata, `$value`-and-children conflict, non-string input, non-group root) — none of these need `UnknownError`, since none are currently unhandled. `TokenParseError` keeps its current single shape (message + path), not a discriminated union, per the existing Error Handling constraint.

### FR-03: `path-safety.ts` — `resolveSafeTokenPath` Returns `Result`

Changes from throwing `PathTraversalError` to returning `Result<string, PathTraversalError>`. No `UnknownError` case — this function does its own path resolution/comparison, it doesn't call anything that can throw unexpectedly.

### FR-04: `read.ts` — `readAndParseTokenFile` Returns `ResultAsync`, Introduces `FileNotFoundError`

Changes from throwing to `ResultAsync<TokenDocument, PathTraversalError | FileNotFoundError | TokenParseError | UnknownError>`. A new named `FileNotFoundError` (local to `read.ts`) replaces today's ad-hoc `isFileNotFoundError`/`error.code === "ENOENT"` check in `route.ts` — ENOENT is already explicitly handled today, so it graduates to a proper named error instead of an inline type-guard. Any other `fs.readFile` failure (permissions, I/O errors, etc.) is wrapped as `UnknownError` and logged, since nothing in the current code discriminates those cases.

### FR-05: `scan.ts` — `scanTokenDirectory` Returns `ResultAsync`, `readdir` Failures Become `UnknownError`

`collectJsonFiles`'s recursive `readdir` call currently has no error handling at all — an error there propagates uncaught and crashes the scan. It's wrapped into a `Result`, mapped to `UnknownError`, and logged; a `readdir` failure now aborts the scan with a proper `Err` instead of an unhandled exception (same "whole scan fails" behavior as today, just no longer a crash). Per-file failures continue to be caught individually and folded into that file's `TokenFileSummary` entry (`valid: false, error: <message>`) exactly as today, regardless of which error variant (`TokenParseError`, `FileNotFoundError`, `UnknownError`) produced it — one bad file still never affects any other file's result.

### FR-06: Route/Page Consumers Branch on `Result` Instead of `try`/`catch`

`app/api/tokens/route.ts`, `app/api/tokens/[...path]/route.ts`, `app/page.tsx`, and `app/tokens/[...path]/page.tsx` (all current callers of `scanTokenDirectory`/`readAndParseTokenFile`) replace `try`/`catch` + `instanceof` chains with branching on the `Result`. Existing behavior is preserved exactly: `app/api/tokens/[...path]/route.ts` keeps its 400 (`PathTraversalError`) / 404 (`FileNotFoundError`) / 422 (`TokenParseError`) mapping, with `UnknownError` mapped to 500; `app/tokens/[...path]/page.tsx` keeps its current message logic (`PathTraversalError`/`TokenParseError` show their own message; anything else — now including `FileNotFoundError` and `UnknownError` — shows the existing generic "Could not load" fallback, unchanged from today).

## Acceptance Criteria

- [x] AC-01: `parseTokenFile` returns `Result<TokenDocument, TokenParseError>` and no longer throws for any input that previously threw `TokenParseError`.
- [x] AC-02: `resolveSafeTokenPath` returns `Result<string, PathTraversalError>` and no longer throws.
- [x] AC-03: `readAndParseTokenFile` returns `ResultAsync` whose error union includes `PathTraversalError`, `FileNotFoundError`, `TokenParseError`, and `UnknownError`; an `ENOENT` read failure produces `FileNotFoundError`, and any other read failure produces a logged `UnknownError`.
- [x] AC-04: `scanTokenDirectory` returns `ResultAsync`; a `readdir` failure produces a logged `UnknownError` and aborts the scan (no unhandled exception); a per-file failure of any kind still isolates to that file's summary entry without affecting others.
- [x] AC-05: `app/api/tokens/[...path]/route.ts` returns the same status codes as today (400/404/422/200) for the same inputs, now sourced from branching on a `Result` instead of `catch`.
- [ ] AC-06: `app/tokens/[...path]/page.tsx` and `app/page.tsx` render the same output/messages as today for the same inputs, now sourced from branching on a `Result` instead of `catch`. — flagged in `review.md`: no automated coverage, only manual `curl` verification.
- [x] AC-07: An `UnknownError` is logged (via the injected `Logger`) at the moment it's created, not left for whoever eventually unwraps the `Result`.
- [x] AC-08: All existing tests pass with updated assertions (Result-based instead of `assert.throws`), and new tests cover the `UnknownError` paths (`readdir` failure, non-ENOENT read failure) that have no current test coverage at all today.

## Technical Scope

### Affected Modules

- `packages/token-core/src/parse.ts` (+ `index.ts` export update)
- New package: `packages/errors` (`@dtcg-editor/errors`)
- `apps/web-app/lib/tokens/path-safety.ts`
- `apps/web-app/lib/tokens/read.ts`
- `apps/web-app/lib/tokens/scan.ts`
- `apps/web-app/app/api/tokens/route.ts`
- `apps/web-app/app/api/tokens/[...path]/route.ts`
- `apps/web-app/app/page.tsx`
- `apps/web-app/app/tokens/[...path]/page.tsx`
- Not touched: `apps/web-app/lib/config.ts` (`ConfigError`, startup config loading) — out of scope, see below.

### New Components Required

- `@dtcg-editor/errors` package: `UnknownError` type, `Logger` interface, throw-to-`Result` wrap helper.
- `FileNotFoundError` (new named error, local to `read.ts`).

### Integration Points

- `neverthrow` (`Result`/`ResultAsync`, already an Approved Dependency).
- No new external integrations.

## Non-Functional Requirements

- **Performance**: no expected change — this is a mechanism change (thrown exceptions → returned values), not a change to what work is done.
- **Security**: no change — `resolveSafeTokenPath`'s traversal check logic is unchanged, only its error-signaling mechanism.
- **Scalability**: N/A.
- **Behavioral compatibility**: this is a refactor, not a feature change — every existing test's _observable_ assertion (HTTP status, rendered message, which files a scan reports as valid/invalid) must still hold; only the _mechanism_ producing that outcome changes.

## Out of Scope

- `apps/web-app/lib/config.ts`'s `ConfigError` / `loadConfig` — a separate call path (startup, via `instrumentation.ts`), not part of the token read chain this feature scopes.
- Any change to `resolveEffectiveType` (`token-core/resolve-type.ts`) — it never throws today (pure function, no fallible operation), nothing to migrate.
- UI-layer `Result` consumption patterns (React hooks, error boundaries) — per `docs/project.md`'s Error Handling constraint, that's explicitly deferred until real client-side component code exists. The two Server Components in scope here (`page.tsx` files) are treated as call sites branching on a `Result` before rendering, not as an instance of that deferred UI pattern.
- Adding new user-facing error detail (e.g. showing `FileNotFoundError` a distinct message in `page.tsx`) — preserving current behavior takes priority over improving it in this pass.
- Backlog item "inject dependencies by default (e.g. `fs.readFile`)" — related but separate; not assumed or required here. `fs.readFile`/`fs.readdir` are still called directly, just wrapped into a `Result` at the call site.

## Open Questions

- Exact shape of `@dtcg-editor/errors`' throw-to-`Result` wrap helper (a single generic function vs. separate sync/async helpers mirroring `fromThrowable`/`ResultAsync.fromPromise`) — finalize in `plan.md`.
- Whether a resolved path that turns out to be a directory, not a file (`EISDIR` from `fs.readFile`), should also count as `FileNotFoundError` — audit shows this isn't currently discriminated (falls to the generic `throw error` path in `route.ts` today), so per this feature's known/unknown rule it should default to `UnknownError`; confirm in `plan.md` once the exact `fs` error codes in play are enumerated.
