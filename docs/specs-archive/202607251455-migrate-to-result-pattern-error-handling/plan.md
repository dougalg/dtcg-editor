# Implementation Plan: Migrate to Result-Pattern Error Handling

## Overview
Migrate the token read chain — `token-core`'s `parseTokenFile`/`parseNode`, `path-safety.ts`, `read.ts`, `scan.ts`, and every consumer of them in `web-app` — from thrown exceptions to `neverthrow` `Result`/`ResultAsync`, per `docs/project.md`'s Error Handling constraint. A new, dependency-free `@dtcg-editor/errors` package provides the shared `UnknownError` type, the injected `Logger` interface, and a single conversion function (`toLoggedUnknownError`) that both constructs and immediately logs an `UnknownError` from a caught throw — every call site still uses `neverthrow`'s own `fromThrowable`/`ResultAsync.fromPromise` directly rather than a bespoke wrapping abstraction. Which errors stay "known" (named) versus fall to `UnknownError` follows `feature.md`'s audit: only `readdir` failures in `scan.ts` and non-`ENOENT` `readFile` failures in `read.ts` are genuinely new error-handling surface — every other change is a mechanical throw-to-`Result` conversion of something already deliberately handled today.

## Architecture Decisions

- **`@dtcg-editor/errors` has zero runtime dependencies, including `neverthrow`.** `toLoggedUnknownError(logger, cause, context): UnknownError` returns a plain `UnknownError` value, not a `Result` — the caller wraps it into an `Err` via `fromThrowable`'s/`ResultAsync.fromPromise`'s own error-mapper argument. This resolves `feature.md`'s Open Question in favor of reusing `neverthrow`'s existing wrapping primitives instead of inventing a parallel one — `@dtcg-editor/errors` only owns the *shape* of an unknown error and the logging side effect, nothing about `Result` construction itself.
- **`token-core` does not depend on `@dtcg-editor/errors`.** Auditing `parse.ts` (per `feature.md`) shows every failure path — including the `JSON.parse` call — is already deliberately mapped to `TokenParseError` today; there is no genuinely-unanticipated throw inside `token-core` to route through `UnknownError`. `parseTokenFile`'s only new dependency is `neverthrow` itself, for `Result`/`ok`/`err`.
- **`FileNotFoundError` is a real `Error` subclass, defined and exported from `read.ts`**, not a discriminated-union variant and not part of the shared `errors` package — mirrors how `TokenParseError` and `PathTraversalError` are already defined locally to the module that produces them, per the existing Error Handling constraint ("named errors... defined as a discriminated union local to the module that produces them" — here a single class, consistent with `TokenParseError` staying a single shape rather than a union). Being a real `Error` subclass means route/page consumers keep using `instanceof` to discriminate it, inside an `if (result.isErr())` branch instead of a `catch` block — the smallest possible diff to the existing discrimination pattern.
- **`app/api/tokens/route.ts` and `app/page.tsx` currently have *no* error handling at all** — `scanTokenDirectory` never threw before (per-file failures were always caught internally; a `readdir` failure would crash uncaught, untested, today). Adding real handling for `scanTokenDirectory`'s new `Err` case in these two files is a deliberate, minimal behavior *addition* required by `feature.md`'s FR-05, not scope creep — it turns a live, currently-untested crash into a handled 500 / error message.
- **`collectJsonFiles` (in `scan.ts`) returns `Promise<Result<string[], UnknownError>>` via plain `async`/`await`**, not a `ResultAsync` chain. It's a recursive function accumulating an array across nested `await`ed calls; forcing that into a point-free `.andThen()` chain would be harder to read than the equivalent `if (result.isErr()) return result;` shape already used elsewhere in this codebase (e.g. `parseNode`'s loop). `scanTokenDirectory`, the public-facing function, still returns a proper `ResultAsync` for its callers.
- **No `Logger` is explicitly passed anywhere yet** — `readAndParseTokenFile`/`scanTokenDirectory`/`collectJsonFiles` each take an optional `logger: Logger = consoleLogger` parameter (per the existing Error Handling constraint's injection requirement), but every current call site relies on the default. There's no alternate logger implementation to inject yet, so threading an explicit one through every route/page would be pure ceremony.
- **New dependencies requiring justification** (per Minimal Dependencies convention):
  - **`neverthrow` in `packages/token-core/package.json` and `apps/web-app/package.json`** — already an Approved Dependency (added when the Error Handling constraint itself was written); this is its first actual use.
  - **No other new dependencies.** `@dtcg-editor/errors` is a new first-party package, not a third-party dependency.

## Implementation Steps

### Step 1: `@dtcg-editor/errors` Package
- [x] `packages/errors/package.json` — name `@dtcg-editor/errors`, `"type": "module"`, no runtime dependencies, `devDependencies`: `@types/node`, `typescript` (mirrors `token-core`'s `package.json` shape)
- [x] `packages/errors/tsconfig.json` — extends root `tsconfig.base.json`, same shape as `token-core/tsconfig.json`
- [x] `packages/errors/src/logger.ts` — `Logger` interface (`{ error(obj: Record<string, unknown>, msg?: string): void }`, pino-shaped, per the Error Handling constraint) and a `consoleLogger: Logger` default implementation
- [x] `packages/errors/src/unknown-error.ts` — `UnknownError` type (`{ kind: "unknown"; cause: unknown; context?: string }`) and `toLoggedUnknownError(logger: Logger, cause: unknown, context?: string): UnknownError` — constructs the value and calls `logger.error(...)` immediately, before returning
- [x] `packages/errors/src/index.ts` — re-exports `Logger`, `consoleLogger`, `UnknownError`, `toLoggedUnknownError`
- Files: `packages/errors/{package.json,tsconfig.json}`, `packages/errors/src/{logger.ts,unknown-error.ts,index.ts}`

### Step 2: `token-core` — `parseTokenFile`/`parseNode` Return `Result`
- [x] `pnpm add neverthrow --filter @dtcg-editor/token-core`
- [x] `parseNode(raw, name, path): Result<DtcgNode, TokenParseError>` — every `throw new TokenParseError(...)` becomes `return err(new TokenParseError(...))`; the `JSON.parse` call in `parseTokenFile` is wrapped with `fromThrowable(() => JSON.parse(raw), (cause) => new TokenParseError(...))` (still mapped to the known `TokenParseError`, not `UnknownError` — the JSON syntax error case is already anticipated today)
- [x] The children-building loop (group case) short-circuits on the first `Err` from a recursive `parseNode` call (`if (result.isErr()) return result;`), same imperative shape as today, just Result-typed instead of throw-typed
- [x] `parseTokenFile(raw: unknown): Result<TokenDocument, TokenParseError>` — same signature otherwise
- [x] `index.ts` — no export list change, just the type signature change flowing through (verified `parse.ts` compiles cleanly on its own; only `parse.test.ts` errors, expected until Step 7)
- Files: `packages/token-core/src/parse.ts`, `packages/token-core/package.json`

### Step 3: `path-safety.ts` — `resolveSafeTokenPath` Returns `Result`
- [x] `pnpm add neverthrow --filter @dtcg-editor/web-app`
- [x] `resolveSafeTokenPath(rootDir, requestedRelativePath): Result<string, PathTraversalError>` — `return err(new PathTraversalError(...))` instead of throwing, `return ok(resolved)` instead of a plain return
- Files: `apps/web-app/lib/tokens/path-safety.ts`

### Step 4: `read.ts` — `readAndParseTokenFile` Returns `ResultAsync`, Introduces `FileNotFoundError`
- [x] `pnpm add @dtcg-editor/errors --filter @dtcg-editor/web-app` (workspace dependency — needed `"@dtcg-editor/errors@workspace:*"` explicitly, since a bare `pnpm add @dtcg-editor/errors` tried the public npm registry first and 404'd)
- [x] `FileNotFoundError` class (mirrors `PathTraversalError`'s shape), exported from `read.ts`
- [x] `readAndParseTokenFile(rootDir, relativePath, logger: Logger = consoleLogger): ResultAsync<TokenDocument, PathTraversalError | FileNotFoundError | TokenParseError | UnknownError>`:
  1. `resolveSafeTokenPath` — if `Err`, short-circuit with `errAsync(result.error)`
  2. `ResultAsync.fromPromise(readFile(absolutePath, "utf-8"), (cause) => classifyReadError(cause, logger, relativePath))` — a local `classifyReadError` helper returns `FileNotFoundError` when `cause.code === "ENOENT"` (the case `route.ts` already special-cases today), otherwise `toLoggedUnknownError(logger, cause, "readAndParseTokenFile")`
  3. `.andThen((contents) => parseTokenFile(contents))` — composes with `token-core`'s sync `Result` (verified `read.ts` compiles cleanly on its own; only the not-yet-migrated route/page consumers error)
- Files: `apps/web-app/lib/tokens/read.ts`, `apps/web-app/package.json`

### Step 5: `scan.ts` — `scanTokenDirectory` Returns `ResultAsync`, `readdir` Failures Become `UnknownError`
- [x] `collectJsonFiles(currentDir, logger): Promise<Result<string[], UnknownError>>` — wraps the `readdir` call with `ResultAsync.fromPromise(readdir(...), (cause) => toLoggedUnknownError(logger, cause, "collectJsonFiles"))`; on `Err`, returns immediately; on `Ok`, continues the existing symlink-skip/recurse/collect loop, short-circuiting (`return subResult` on `Err`) the moment a recursive call into a subdirectory fails
- [x] A small local `describeError(error: PathTraversalError | FileNotFoundError | TokenParseError | UnknownError): string` helper — the first three are `Error` subclasses (`.message` works directly), `UnknownError` isn't (it's a plain tagged object), so this normalizes all four into the human-readable string `TokenFileSummary.error` needs (replaces today's `describeCause`)
- [x] `scanTokenDirectory(rootDir, logger: Logger = consoleLogger): ResultAsync<TokenFileSummary[], UnknownError>` — awaits `collectJsonFiles`; on `Err`, the whole scan fails (same "one bad `readdir` fails everything" behavior as today's uncaught-crash, just as a clean `Err` now); on `Ok`, maps each file path through `readAndParseTokenFile`, folding each into `{ relativePath, valid: true }` or `{ relativePath, valid: false, error: describeError(...) }` — one bad *file* still never affects any other file's result, exactly as today. `scanTokenDirectory` now reuses `readAndParseTokenFile` per-file instead of duplicating `readFile`+`parseTokenFile` inline, a small dedup enabled by `read.ts` already existing. Verified `scan.ts` compiles cleanly on its own.
- Files: `apps/web-app/lib/tokens/scan.ts`

### Step 6: Route/Page Consumers Branch on `Result`
- [x] `app/api/tokens/[...path]/route.ts` — replaces the `try`/`catch`+`instanceof` chain with `if (result.isErr())` branching on the same four types in the same order, same status codes (400/404/422), with `UnknownError` (the new `default`/fallthrough case) mapped to 500 instead of today's bare `throw error`. The old inline `isFileNotFoundError` type guard is gone — `FileNotFoundError` now does that job as a real named error.
- [x] `app/tokens/[...path]/page.tsx` — same restructuring; message logic unchanged (`PathTraversalError`/`TokenParseError` show their own message, everything else — now explicitly including `FileNotFoundError` and `UnknownError` — shows the existing generic `Could not load "..."` fallback)
- [x] `app/api/tokens/route.ts` — **new** error handling: `scanTokenDirectory`'s `Err` case (previously impossible to reach without crashing) now maps to a 500 JSON error response
- [x] `app/page.tsx` — **new** error handling: renders an inline error message instead of `<FolderOverview>` when the scan's `Result` is an `Err`. Verified all four files compile cleanly on their own; only the not-yet-updated `scan.test.ts` errors (Step 7).
- Files: `apps/web-app/app/api/tokens/route.ts`, `apps/web-app/app/api/tokens/[...path]/route.ts`, `apps/web-app/app/page.tsx`, `apps/web-app/app/tokens/[...path]/page.tsx`

### Step 7: Tests
- [x] `packages/errors/src/unknown-error.test.ts` — a fake `Logger` (records calls) asserts `toLoggedUnknownError` calls `logger.error` exactly once, synchronously, before returning, and that the returned value has `kind: "unknown"` plus the given `cause`/`context`
- [x] `packages/token-core/src/parse.test.ts` — every `assert.throws(...)` case becomes `assert.equal(result.isErr(), true)` + an assertion on `result.error`; the passing cases assert `result.isOk()` and check `result.value`
- [x] `apps/web-app/lib/tokens/path-safety.test.ts` — same `assert.throws` → `Result` conversion
- [x] `apps/web-app/lib/tokens/read.test.ts` (**new file** — `readAndParseTokenFile` has no direct unit test today, only indirect coverage via the route test) — covers: valid file → `Ok`; missing file → `Err(FileNotFoundError)`; path traversal → `Err(PathTraversalError)`; invalid JSON → `Err(TokenParseError)`; a non-`ENOENT` read failure (`chmod 000` on the target file, then restore permissions in cleanup before `rm`) → `Err(UnknownError)`, and asserts the fake logger it's given was called exactly once. (Caught and fixed a bug in the fake-logger test helper itself: destructuring a getter — `const { calls } = fakeLogger()` — captures a frozen snapshot, not a live reference; fixed by exposing a mutable `state` object instead.)
- [x] `apps/web-app/lib/tokens/scan.test.ts` — existing tests updated for the `ResultAsync` return (`.isOk()`/`.value` instead of a bare array); **new** test: a nested subdirectory `chmod`'d to `000` (permission denied on `readdir`) produces `Err(UnknownError)` from the whole scan (cleanup restores permissions before `rm`, same pattern as the `read.test.ts` case)
- [x] `apps/web-app/app/api/tokens/[...path]/route.test.ts` — no behavior change; all 5 pre-existing tests re-run and pass unchanged
- [x] `apps/web-app/app/api/tokens/route.test.ts` — **new** test: **deviation from plan** — `getConfig()` memoizes the loaded config module-level (`cachedConfig ??=`), so a second test-local config pointing at a nonexistent directory wouldn't be picked up once the file's `before()` hook has already cached the first one; instead, `chmod 000` on the *existing* cached fixture's `tokens` directory (restored in a `finally`) triggers the same real `EACCES` `readdir` failure → 500, exercising the previously-impossible-to-reach error path
- [x] `app/page.tsx`/`app/tokens/[...path]/page.tsx` — no automated test added (consistent with this repo's standing precedent — no React component rendering tests, per the original feature's Architecture Decisions); manually verified HTTP/SSR-level via `pnpm build && pnpm start` + `curl` against a temp fixture (folder overview, valid tree, invalid-JSON message, missing-file fallback, and both API routes' status codes/bodies) — same "no browser tool available" caveat as the original feature's manual UI verification
- Files: `packages/errors/src/unknown-error.test.ts`, `apps/web-app/lib/tokens/read.test.ts` (new), plus updates to `packages/token-core/src/parse.test.ts`, `apps/web-app/lib/tokens/{path-safety,scan}.test.ts`, `apps/web-app/app/api/tokens/route.test.ts`

## Acceptance Criteria Mapping
| AC | Verified By |
|----|-------------|
| AC-01: `parseTokenFile` returns `Result` | `packages/token-core/src/parse.test.ts` (converted cases) |
| AC-02: `resolveSafeTokenPath` returns `Result` | `apps/web-app/lib/tokens/path-safety.test.ts` (converted cases) |
| AC-03: `readAndParseTokenFile`'s full error union, ENOENT→`FileNotFoundError`, other→logged `UnknownError` | `apps/web-app/lib/tokens/read.test.ts` (new) |
| AC-04: `scanTokenDirectory` `readdir` failure → logged `UnknownError`, aborts scan without crashing; per-file isolation preserved | `apps/web-app/lib/tokens/scan.test.ts` (updated + new `chmod 000` case) |
| AC-05: Route status codes unchanged | `apps/web-app/app/api/tokens/[...path]/route.test.ts` (re-verified), `apps/web-app/app/api/tokens/route.test.ts` (new 500 case) |
| AC-06: Page rendering unchanged for existing cases | Manual verification via `pnpm build && pnpm start` + `curl` (no automated test, per standing precedent) |
| AC-07: `UnknownError` logged at creation | `packages/errors/src/unknown-error.test.ts` |
| AC-08: full suite passes + new `UnknownError`-path coverage | All of the above, run via `pnpm test` |

## Risks & Mitigations
- **Risk:** `app/api/tokens/route.ts` and `app/page.tsx` currently have zero error handling — adding it is new logic, not a pure mechanical conversion, so it's the part of this migration most likely to have an actual bug (as opposed to the rest, which is a faithful throw→`Result` translation of already-tested behavior). → **Mitigation:** dedicated new tests for both (Step 7), specifically targeting the previously-unreachable failure path.
- **Risk:** `collectJsonFiles`'s recursive short-circuit-on-`Err` logic is easy to get subtly wrong (e.g. forgetting to propagate a nested failure, silently swallowing it into an empty result instead). → **Mitigation:** the new `chmod 000` test in `scan.test.ts` specifically exercises a *nested* subdirectory failure, not just a root-level one.
- **Risk:** Simulating a non-`ENOENT` fs failure in tests (`chmod 000`) doesn't work identically across platforms (notably: doesn't reliably deny access when running as root, e.g. in some CI containers) and needs careful cleanup (restoring permissions before `rm`, or `rm` itself fails). → **Mitigation:** restore permissions in a `finally`/`after` block before cleanup, same pattern in both new tests; if this proves flaky in practice, the fallback is asserting the `UnknownError`/logging *mechanism* directly (already covered by `packages/errors`'s own test) rather than depending on triggering a real OS-level permission error.

## Estimated Complexity
**Medium.** No new external integrations and the overall shape (thrown exceptions → `Result`/`ResultAsync`) is well-established by the Error Handling constraint already written, but it touches every file in the token read chain, introduces one genuinely new package, and — in exactly two spots (`app/api/tokens/route.ts`, `app/page.tsx`) — adds real error-handling behavior that didn't exist before rather than just converting existing behavior.
