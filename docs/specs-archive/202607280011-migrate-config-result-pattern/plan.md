# Implementation Plan: Migrate Config Loading to Result-Pattern Error Handling

## Overview
Migrate `apps/web-app/lib/config.ts`'s `loadConfig` from a throwing function to one returning `neverthrow`'s `Result<Config, ConfigError>`, per `docs/project.md`'s Error Handling constraint — the same mechanism change already applied to the token read chain (`docs/specs-archive/202607251455-migrate-to-result-pattern-error-handling/`), applied here to the separate startup config-loading path. `ConfigError` stays a single-shape `Error` subclass (no discriminated union, no `UnknownError` — every current throw site in `loadConfig` is already deliberately mapped to `ConfigError` today, confirmed by the same evidence-based audit methodology as the prior migration). `getConfig()` keeps its plain `(): Config` synchronous signature unchanged so its four request-time call sites need zero edits, and gains a new named `ConfigNotInitializedError` for its should-be-unreachable memoization-cache-empty fallback. `instrumentation.ts`'s `register()` switches from `try`/`catch` + `instanceof` to branching on `loadConfig()`'s `Result`, preserving the exact same log message and `process.exit(1)` behavior. No new dependencies — `neverthrow` is already used identically in `packages/token-core/src/parse.ts`.

## Architecture Decisions
- **`fromThrowable` wrappers for `readFileSync`/`JSON.parse` are defined *inside* `loadConfig`, not at module level.** Unlike `token-core/parse.ts`'s module-level `parseJson` (whose error messages need no per-call context), `config.ts`'s error messages embed `configPath` (`Could not read config file at "<path>": ...`). Defining the two `fromThrowable`-wrapped functions inside `loadConfig` lets both the throwing function and its error mapper close over `configPath` directly, keeping the exact current message format with no signature change to the mapper itself. Composed via `.andThen` exactly like `parse.ts`'s `parseJson(raw).andThen(parseNode).andThen(...)` chain.
- **A new exported `setConfigCache(config: Config): void` in `config.ts` is required, even though `feature.md` doesn't name it explicitly.** FR-03 requires `register()` to call `loadConfig()` directly (not `getConfig()`) and, on `Ok`, "cache the value" so subsequent request-time `getConfig()` calls are cache hits. Today this caching happens as a side effect of `register()` calling `getConfig()` itself; once `register()` calls `loadConfig()` directly instead, there is no existing way for `instrumentation.ts` to populate `config.ts`'s private module-level `cachedConfig` variable. `setConfigCache` is the minimal addition that closes this gap — it does not change `getConfig()`'s public signature (AC-03) and is not part of the `Result` chain. **Confirmed final** — reviewed and approved as the intended approach; `register()` calls `setConfigCache` explicitly after a successful startup `loadConfig()` to pre-warm `getConfig()`'s cache before any request-time call.
- **`getConfig()`'s should-be-unreachable branch throws `ConfigNotInitializedError` with a message that also includes the underlying `ConfigError`'s message** (`getConfig() called before startup config validation succeeded: <ConfigError.message>`), so a maintainer who somehow hits this in practice sees both "this shouldn't happen" and the concrete config problem, not just the former. Message is otherwise a defensive-assertion string, not part of any handled error taxonomy per FR-02.
- **`instrumentation.ts` no longer imports `ConfigError` at all.** FR-03 explicitly removes the non-`ConfigError` fallback branch as dead code (every `Err` is now a `ConfigError`), so no `instanceof` check remains — `result.error.message` is used directly.
- **No new dependencies.** `neverthrow` is already an Approved Dependency and already a direct dependency of `apps/web-app` (added in the prior Result-pattern migration for `path-safety.ts`/`read.ts`/`scan.ts`), so no `package.json` change is needed at all.

## Implementation Steps

### Step 1: `config.ts` — `loadConfig` Returns `Result<Config, ConfigError>`
- [x] Import `err`, `fromThrowable`, `ok`, `type Result` from `neverthrow`.
- [x] Add `ConfigNotInitializedError` class alongside `ConfigError` (extends `Error`, `name = "ConfigNotInitializedError"`), documented in a code comment as "getConfig() called before startup config validation succeeded — indicates register() in instrumentation.ts did not run or did not fail fast as designed."
- [x] Change `loadConfig(cwd: string = process.cwd()): Config` to `loadConfig(cwd: string = process.cwd()): Result<Config, ConfigError>`:
  - Inside the function, after computing `configPath`, define `const readConfigFile = fromThrowable(() => readFileSync(configPath, "utf-8"), (cause) => new ConfigError(\`Could not read config file at "${configPath}": ${describeCause(cause)}\`));`
  - Define `const parseConfigJson = fromThrowable((raw: string) => JSON.parse(raw) as unknown, (cause) => new ConfigError(\`Invalid JSON in config file at "${configPath}": ${describeCause(cause)}\`));`
  - Return `readConfigFile().andThen(parseConfigJson).andThen((parsed) => { ...existing safeParse + reasons-join logic..., either err(new ConfigError(...)) or ok({ tokensDir: resolve(cwd, result.data.tokensDir) }) })` — same message formats and issue-joining logic as today, just returned instead of thrown.
- [x] `describeCause` helper is unchanged.
- [x] Add `export function setConfigCache(config: Config): void { cachedConfig = config; }` next to the `cachedConfig` module-level variable, documented as being called by `instrumentation.ts`'s `register()` after a successful startup `loadConfig()`.
- [x] Rewrite `getConfig()`:
  ```ts
  export function getConfig(): Config {
    if (cachedConfig !== undefined) {
      return cachedConfig;
    }
    const result = loadConfig();
    if (result.isErr()) {
      throw new ConfigNotInitializedError(
        `getConfig() called before startup config validation succeeded: ${result.error.message}`,
      );
    }
    cachedConfig = result.value;
    return cachedConfig;
  }
  ```
- Files: `apps/web-app/lib/config.ts`

### Step 2: `instrumentation.ts` — `register()` Branches on `Result`
- [x] Replace the dynamic import destructure `{ getConfig, ConfigError }` with `{ loadConfig, setConfigCache }`.
- [x] Replace the `try`/`catch` block with:
  ```ts
  const result = loadConfig();
  if (result.isErr()) {
    console.error(`[dtcg-editor] Fatal startup error: ${result.error.message}`);
    process.exit(1);
    return;
  }
  setConfigCache(result.value);
  ```
- [x] Confirm the `NEXT_RUNTIME !== "nodejs"` early-return guard above this block is untouched (out of scope per `feature.md`, backlog item "Fix Edge Runtime warning" is separate).
- Files: `apps/web-app/instrumentation.ts`

### Step 3: `config.test.ts` — Rewrite Assertions for `Result`
- [x] Keep `withTempDir` helper unchanged.
- [x] Rewrite the four failure-case tests (missing file, invalid JSON, missing `tokensDir`, empty-string `tokensDir`) from `assert.throws(() => loadConfig(dir), ConfigError)` to:
  ```ts
  const result = loadConfig(dir);
  assert.equal(result.isErr(), true);
  if (result.isErr()) {
    assert.ok(result.error instanceof ConfigError);
  }
  ```
  (matches the existing `packages/token-core/src/parse.test.ts` idiom exactly, e.g. its `"returns TokenParseError on invalid JSON"` test.)
- [x] Rewrite the success-case test (`resolves a relative tokensDir to an absolute path`) from a bare `loadConfig(dir)` call to:
  ```ts
  const result = loadConfig(dir);
  assert.equal(result.isOk(), true);
  if (result.isOk()) {
    assert.equal(result.value.tokensDir, join(dir, "tokens"));
  }
  ```
- [x] No new test cases — this migration introduces no new error paths (per `feature.md` FR-04 and AC-06).
- Files: `apps/web-app/lib/config.test.ts`

### Step 4: Verification
- [x] `pnpm build` (Turborepo) — confirms `tsc`/`next build` type-check cleanly, no `any` introduced, `instrumentation.ts` and the four unchanged `getConfig()` call sites (`app/page.tsx`, `app/api/tokens/route.ts`, `app/api/tokens/[...path]/route.ts`, `app/tokens/[...path]/page.tsx`) still compile with zero edits.
- [x] `pnpm lint` — no new lint violations.
- [x] `pnpm test` — all `config.test.ts` cases pass; full suite (including the token read chain's existing tests) still passes, confirming no regression from the shared `neverthrow` import.
- [x] Manual sanity check: temporarily point `dtcg-editor.config.json` at a missing/invalid state and confirm `pnpm build && pnpm start` still logs `[dtcg-editor] Fatal startup error: ...` and exits non-zero, matching current behavior exactly (no automated test covers `instrumentation.ts` itself, consistent with this repo's standing precedent of manual verification for process-level startup behavior).
- Files: none (verification only)

## Acceptance Criteria Mapping
| AC | Verified By |
|----|-------------|
| AC-01: `loadConfig` returns `Result<Config, ConfigError>`, no throw for any previously-throwing input | `apps/web-app/lib/config.test.ts` (four rewritten failure-case tests) |
| AC-02: `register()` has no `try`/`catch`, branches on `Result`, same log message + `process.exit(1)` | `apps/web-app/instrumentation.ts` code review (no automated test exists for `instrumentation.ts` today; manual verification per Step 4) |
| AC-03: `getConfig()` keeps `(): Config`; four request-time call sites need zero changes | `pnpm build` (Step 4) — compiles with no edits to `app/page.tsx`, `app/api/tokens/route.ts`, `app/api/tokens/[...path]/route.ts`, `app/tokens/[...path]/page.tsx` |
| AC-04: all five `config.test.ts` tests pass on `Result`-based assertions | `apps/web-app/lib/config.test.ts` |
| AC-05: `pnpm build`/`lint`/`test` pass, no new `any`/type gaps | Step 4 |
| AC-06: no `UnknownError` added, `packages/errors` unchanged | Code review — `config.ts`'s diff touches only `ConfigError`/`ConfigNotInitializedError`; `packages/errors` untouched |
| AC-07: `getConfig()`'s unreachable fallback throws `ConfigNotInitializedError`, not a bare `Error` | `apps/web-app/lib/config.ts` code review (the branch is provably unreachable in normal operation — per `feature.md`, not separately unit-tested, consistent with FR-02's framing as a defensive assertion rather than a normal fallible path) |

## Risks & Mitigations
- **Risk:** `getConfig()`'s new `ConfigNotInitializedError` branch is provably unreachable under normal operation (per FR-02), so it has no automated test coverage — a typo in that branch (e.g. wrong error class) could go unnoticed. → **Mitigation:** kept as a one-line, easily-reviewable `if (result.isErr())` block; AC-07 is verified by code review rather than a contrived test, consistent with `feature.md`'s own framing of this as a defensive assertion, not a fallible-operation outcome the Result pattern models.
- **Risk:** `setConfigCache` is a new exported function not explicitly named in `feature.md` — a reviewer expecting a strictly 3-file, zero-new-exports diff per the Technical Scope section might flag it. → **Mitigation:** confirmed and finalized above in Architecture Decisions as a necessary, human-approved consequence of FR-03's "cache the value" requirement once `register()` stops calling `getConfig()` directly; still lands inside the same 3 confirmed files (`config.ts` only gains an export, no new file).
- **Risk:** Forgetting the `return;` after `process.exit(1)` in `instrumentation.ts` could let TypeScript's control-flow analysis complain about `setConfigCache(result.value)` being reached without narrowing, since `process.exit(1)`'s return type is `never` but only if `@types/node` types it that way. → **Mitigation:** explicit `if (result.isErr()) { ...; return; }` early-return, matching the existing codebase's guard-clause style (e.g. the `NEXT_RUNTIME` check just above it), sidesteps relying on `process.exit`'s `never` typing at all.

## Estimated Complexity
**Low.** Exactly 3 files, no new dependencies, no new external integrations, and the transformation pattern (throw → `fromThrowable`/`Result`, `try`/`catch` → `isErr()` branch) is already established and proven by the prior Result-pattern migration and by `token-core/parse.ts`. The only genuinely new logic is the small `setConfigCache` addition and the `ConfigNotInitializedError` fallback, both a few lines each.
