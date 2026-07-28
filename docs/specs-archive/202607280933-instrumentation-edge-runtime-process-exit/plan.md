# Implementation Plan: Fix Edge Runtime Warning for `process.exit` in `instrumentation.ts`

## Overview

`apps/web-app/instrumentation.ts`'s `register()` calls `process.exit(1)` directly, inline, in its own top-level source. Turbopack's Edge Runtime static-analysis pass scans `instrumentation.ts`'s own source (it bundles the file for both the Node and Edge runtimes), finds that reference, and emits a compatibility warning — even though the call is unreachable in the Edge Runtime at runtime, guarded by the `NEXT_RUNTIME !== "nodejs"` early return.

The fix mirrors the technique `register()` already uses for `node:fs`/`node:path` (via `./lib/config.ts`, reached only through `await import("./lib/config.ts")`): move the `console.error` + `process.exit(1)` pair into a new module, `apps/web-app/lib/fatal-startup-error.ts`, and reach it only via a second dynamic `import()` inside the existing `nodejs`-only branch. Turbopack's Edge static-analysis pass does not descend into dynamically-imported modules, so once `process.exit` no longer appears in `instrumentation.ts`'s own source, the warning disappears structurally — not via suppression.

This is a pure code-organization change: no control-flow change, no new dependency, no behavior change. `docs/project.md`'s architecture-decision precedent for `instrumentation.ts` (2026-07-25: startup config validation fails fast via `process.exit(1)` in `register()`) is preserved as-is; only the line's physical location moves.

## Architecture Decisions

- **New dedicated module, not folded into `config.ts`** (feature.md RD-01): `fatal-startup-error.ts` is a sibling module to `config.ts`, reached by its own `await import(...)` call, matching the file's existing per-concern dynamic-import pattern (one import per Node-only concern) rather than overloading `config.ts` with unrelated process-lifecycle responsibility.
- **`exitOnFatalStartupError(message: string): never`** — takes the plain `result.error.message` string (not the `ConfigError` object itself), keeping the new module free of any dependency on `config.ts`'s error types. Per FR-01/FR-02, the `` `[dtcg-editor] Fatal startup error: ${message}` `` log-message formatting itself is the relocated function's own responsibility, not `register()`'s — `register()` only passes the raw `message` in; see Step 1 for the exact split.
- **No regression guard** (RD-02, explicitly out of scope): no ESLint rule, no CI build-output grep. Deferred to a separate backlog item already noted in `docs/backlog.md` (per `de22c98`, already on `main`).
- **Test style follows `apps/web-app/lib/config.test.ts` precedent**: Vitest's `test()` (not `describe`/`it`), assertions via `node:assert/strict`, not `expect`. `vi.spyOn` is used only for stubbing `process.exit`/`console.error` (Vitest's own API, not `node:assert`), consistent with FR-05's explicit mention of `vi.spyOn`.
- **No new dependency**: only built-in dynamic `import()` syntax, already established in this file. Confirms feature.md AC-05 / Minimal Dependencies — nothing to flag for human sign-off.

## Implementation Steps

### Step 1: Create `apps/web-app/lib/fatal-startup-error.ts`

- [x] Export `exitOnFatalStartupError(message: string): never` containing exactly the relocated pair:
  ```ts
  export function exitOnFatalStartupError(message: string): never {
  	console.error(`[dtcg-editor] Fatal startup error: ${message}`);
  	process.exit(1);
  }
  ```
- [x] TypeScript's control-flow analysis accepts `process.exit`'s `@types/node` signature as returning `never`, so no explicit `throw`/unreachable-return workaround is needed after it — matches the function's own `never` return type with no relaxation of the TypeScript Strictness constraint.
- [x] File header/style: no imports needed (`console`/`process` are ambient Node globals already used unqualified elsewhere in this file's predecessor); no need to import from `config.ts`.
- Files to create: `apps/web-app/lib/fatal-startup-error.ts`

### Step 2: Update `apps/web-app/instrumentation.ts`

- [x] Replace the inline `console.error(...); process.exit(1); return;` block with a dynamic import of the new module, called with the same message the current code constructs (`result.error.message`), so the new module remains solely responsible for the `[dtcg-editor] Fatal startup error: ` prefix (single source of truth for that string, matching FR-02's "byte-for-byte" requirement — this is a refactor precision detail, not a behavior change: the final logged string is identical either way).
- [x] Resulting shape:
  ```ts
  export async function register(): Promise<void> {
  	if (process.env.NEXT_RUNTIME !== "nodejs") {
  		return;
  	}

  	const { loadConfig, setConfigCache } = await import("./lib/config.ts");

  	const result = loadConfig();
  	if (result.isErr()) {
  		const { exitOnFatalStartupError } =
  			await import("./lib/fatal-startup-error.ts");
  		exitOnFatalStartupError(result.error.message);
  		return;
  	}
  	setConfigCache(result.value);
  }
  ```
- [x] The trailing `return;` after `exitOnFatalStartupError(...)` is dead code (the function's `never` return type means execution never reaches it) but is kept for TypeScript control-flow narrowing/readability parity with the current code's shape — verify `tsc`/`next build` doesn't warn on this under strict settings (if it does, drop the `return;`; either form satisfies FR-04's "control flow visible in `register()` unchanged").
- [x] `register()` keeps its exact current signature and remains `instrumentation.ts`'s sole export (FR-04).
- Files to modify: `apps/web-app/instrumentation.ts`

### Step 3: Add `apps/web-app/lib/fatal-startup-error.test.ts`

- [x] Follow `apps/web-app/lib/config.test.ts`'s exact style: `import { test } from "vitest"; import assert from "node:assert/strict";`.
- [x] Stub both `process.exit` and `console.error` with `vi.spyOn` before calling `exitOnFatalStartupError`, and restore them afterward (`mockRestore()` in a `finally` or via `vi.spyOn(...).mockImplementation(() => undefined as never)` scoped per-test) — this is the repo's first test stubbing `process.exit`, so isolate the stub/restore tightly around the single call under test to avoid leaking a mocked `process.exit` into other tests in the same file or run.
- [x] Assertions (mapping directly to FR-05/AC-06):
  - `console.error` was called exactly once with the exact string `` `[dtcg-editor] Fatal startup error: ${message}` `` for a representative test `message` (e.g. `"boom"`).
  - `process.exit` was called exactly once with `1`.
- [x] Example shape:
  ```ts
  import { test, vi } from "vitest";
  import assert from "node:assert/strict";
  import { exitOnFatalStartupError } from "./fatal-startup-error.ts";

  test("logs the fatal message and exits with code 1", () => {
  	const exitSpy = vi
  		.spyOn(process, "exit")
  		.mockImplementation(() => undefined as never);
  	const errorSpy = vi
  		.spyOn(console, "error")
  		.mockImplementation(() => undefined);

  	try {
  		exitOnFatalStartupError("boom");

  		assert.equal(errorSpy.mock.calls.length, 1);
  		assert.equal(
  			errorSpy.mock.calls[0]?.[0],
  			"[dtcg-editor] Fatal startup error: boom",
  		);
  		assert.equal(exitSpy.mock.calls.length, 1);
  		assert.equal(exitSpy.mock.calls[0]?.[0], 1);
  	} finally {
  		exitSpy.mockRestore();
  		errorSpy.mockRestore();
  	}
  });
  ```
- Files to create: `apps/web-app/lib/fatal-startup-error.test.ts`

### Step 4: Verify

- [x] `pnpm --filter web-app test` (Vitest) — new test passes; no existing test broken by the `instrumentation.ts` edit (note: `instrumentation.ts` itself has no existing test file — confirmed by repo search — so this is purely additive).
- [x] `pnpm build` (Turborepo → `next build` with Turbopack) — confirm `✓ Compiled successfully` with **zero** Edge Runtime warnings mentioning `process.exit`, `instrumentation.ts`, or `fatal-startup-error.ts` in the output (AC-01, AC-02).
- [x] `pnpm lint` — confirm no new ESLint findings (e.g. unused import, `never`-return warnings) in either changed/new file.
- [x] Manual runtime spot-check for AC-03/AC-04 (no automated end-to-end test exists for `instrumentation.ts`'s `register()` itself, consistent with the file having no pre-existing test): rename/remove `dtcg-editor.config.json`, run `pnpm --filter web-app start` (or `dev`) against a Node runtime, and confirm the process logs `[dtcg-editor] Fatal startup error: ...` to stderr and exits 1; then restore a valid config and confirm normal startup/serving resumes. This reproduces the same manual check implied by feature.md's Summary's "scratch build" validation, now against the final code.

## Acceptance Criteria Mapping

| AC                                                                   | Verified By                                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| AC-01: Zero Edge Runtime warnings referencing `process.exit`         | Manual `pnpm build` output inspection (Step 4)                                                                 |
| AC-02: `pnpm build` still succeeds overall                           | Manual `pnpm build` output inspection (Step 4)                                                                 |
| AC-03: Invalid/missing config still logs + exits 1 at runtime        | `fatal-startup-error.test.ts`'s assertions (exact message + exit code) + manual runtime spot-check (Step 4)    |
| AC-04: Valid config still calls `setConfigCache()` / serves normally | Unchanged code path in `register()`'s success branch (Step 2) — no test regression; manual spot-check (Step 4) |
| AC-05: No new third-party dependency                                 | `package.json` diff — none (Step 1–3 use only built-in `import()`/`process`/`console`)                         |
| AC-06: `fatal-startup-error.test.ts` exists and passes               | Step 3                                                                                                         |

## Risks & Mitigations

- **Risk**: Keeping the dead `return;` after `exitOnFatalStartupError(...)` in `register()` could trip a `no-unreachable`-style lint rule now that the call's `never` return type makes it truly unreachable code (previously `process.exit(1)` itself already had this property, so this risk is not new, but worth re-confirming after the move). → **Mitigation**: run `pnpm lint` in Step 4; if it flags the line, delete the trailing `return;` — either form satisfies FR-04, this is a style-only fork with no behavior difference.
- **Risk**: A stubbed `process.exit` that isn't properly restored could leak into other Vitest tests in the same run (this is explicitly the repo's first test doing this, per FR-05, so there's no existing precedent to lean on for pitfalls). → **Mitigation**: scope `vi.spyOn`/`mockRestore()` tightly around the single assertion in Step 3 (try/finally as shown), and run the full `pnpm --filter web-app test` suite (not just the new file) in Step 4 to confirm no cross-test interference.
- **Risk**: Turbopack's Edge static-analysis behavior (not directly configurable/documented in detail) could in theory still flag something unexpected even after the move. → **Mitigation**: feature.md's Summary already reports this exact approach was empirically validated during scoping (scratch build, reverted) with zero warnings — low residual risk; Step 4's `pnpm build` re-confirms against the final rebased code rather than relying solely on that earlier scratch result.

## Estimated Complexity

**Low.** Two small files change/are added (a ~5-line new module, a ~5-line diff to `instrumentation.ts`) plus one new small test file, following two well-established precedents already in this exact file (`config.ts`'s dynamic-import pattern) and this exact package (`config.test.ts`'s Vitest/`node:assert` style). No new dependency, no architecture change, no cross-package impact.
