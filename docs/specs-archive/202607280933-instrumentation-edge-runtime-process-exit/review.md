# Code Review: Fix Edge Runtime Warning for `process.exit` in `instrumentation.ts` (commit `8ad2051`)

## Summary

This feature isolates `apps/web-app/instrumentation.ts`'s Node-only fatal-startup-exit path (`console.error` + `process.exit(1)`) behind a dynamic `import()` of a new sibling module, `apps/web-app/lib/fatal-startup-error.ts`, mirroring the existing `./lib/config.ts` dynamic-import pattern already used for `node:fs`/`node:path`. Because Turbopack's Edge Runtime static-analysis pass does not descend into dynamically-imported modules, `process.exit` no longer appears in `instrumentation.ts`'s own source, and the Edge Runtime compatibility warning is eliminated structurally rather than suppressed. `register()`'s control flow, log message format, and exit code are unchanged; no new dependency; no other package touched. All 6 acceptance criteria independently re-verified against the actual diff and a fresh, non-cached build, not just re-read from `impl-summary.md`'s claims. No critical or major issues found. **Ready to merge.**

## Findings

### Critical

None.

### Major

None.

### Minor / Open Questions Raised During Review

| Location                                  | Category      | Problem                                                                                                                                                                                                                                                                  | Resolution                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web-app/lib/fatal-startup-error.ts` | Test Coverage | `fatal-startup-error.test.ts` covers `exitOnFatalStartupError` directly, but there is no test exercising `register()`'s own error-forwarding branch (i.e. that a `loadConfig()` `Err` result actually reaches the dynamically-imported function with the right message). | **Not required for this feature.** `instrumentation.ts` had no test file before this change either (confirmed by `plan.md`'s Step 4 note), so this is a pre-existing gap in coverage of `register()` itself, not a regression introduced here — AC-03 is instead covered by the manual runtime spot-check plus the unit test on the relocated function. Left as-is; not blocking. |
| `apps/web-app/lib/fatal-startup-error.ts` | Style         | The new module's exported `exitOnFatalStartupError` has no JSDoc comment explaining its `never`-return/process-terminating contract for future readers.                                                                                                                  | Minor/info only — the function name and one-line body are self-explanatory, and no other module-level function in `apps/web-app/lib` carries JSDoc as a house style. No action required.                                                                                                                                                                                          |
| `apps/web-app/instrumentation.ts`         | Style         | The `return;` immediately following `exitOnFatalStartupError(...)` is unreachable dead code, since the function's `never` return type means execution can't continue past it.                                                                                            | **Not a finding** — this was a conscious, documented decision in `plan.md` (Step 2, Risks & Mitigations), kept for control-flow-narrowing/readability parity with the pre-change shape; `pnpm lint` does not flag it. No action required.                                                                                                                                         |

### Info / Suggestions (no action required)

None beyond the items above.

## Acceptance Criteria Coverage

| AC                                                                                                           | Status  | How Verified                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01: Zero Edge Runtime warnings referencing `process.exit` (or any API) in `instrumentation.ts`/new module | Covered | Forced non-cached `pnpm build` (Turborepo cache bypassed) re-run during review; grepped full build output for "Edge Runtime"/`process.exit` — zero matches                                                                                                                |
| AC-02: `pnpm build` still succeeds overall                                                                   | Covered | Same non-cached build: `✓ Compiled successfully`, all routes generated, exit code 0                                                                                                                                                                                       |
| AC-03: Invalid/missing config still logs `[dtcg-editor] Fatal startup error: <message>` and exits 1          | Covered | Manual runtime spot-check (config file removed) — process logged the exact message to stderr and exited with code 1; also covered by `fatal-startup-error.test.ts`'s exact-string/exit-code assertions                                                                    |
| AC-04: Valid config still calls `setConfigCache()` and serves normally                                       | Covered | Manual runtime spot-check (valid config restored) — server started, `GET /` returned 200, no fatal error logged                                                                                                                                                           |
| AC-05: No new third-party dependency                                                                         | Covered | `package.json` diff — none; only built-in dynamic `import()` used                                                                                                                                                                                                         |
| AC-06: `fatal-startup-error.test.ts` exists and passes                                                       | Covered | File present; asserts exact `[dtcg-editor] Fatal startup error: <message>` string via `console.error` and `process.exit(1)`, both stubbed via `vi.spyOn`/`mockRestore()`; full `pnpm --filter web-app test` run confirmed green (13 files / 75 tests), including this one |

### Architectural Constraints (docs/project.md) — checked

- **TypeScript Strictness**: `exitOnFatalStartupError`'s `never` return type compiles clean under strict settings with no relaxation; `pnpm build`'s `tsc`/`next build` gate passed.
- **Minimal Dependencies**: no new dependency; only built-in dynamic `import()`, consistent with the existing `config.ts` precedent.
- **Error Handling (Result Pattern)**: unaffected — `register()`'s branch on `loadConfig()`'s `Result` is unchanged; this feature only relocates the terminal side-effect of the `Err` branch.
- Other constraints (Validation at the Edges, Token-Type Package Contract, Round-Trip Fidelity) — not applicable, no touching code.

## Verdict

- [x] Ready to merge
- [ ] Merge after minor fixes (no re-review needed)
- [ ] Requires fixes and re-review
- [ ] Do not merge — significant issues found

No Critical or Major findings. All 6 acceptance criteria independently re-verified, including a forced non-cached `pnpm build` confirming zero Edge Runtime warnings and manual runtime spot-checks of both the fatal-exit and success paths. The three Minor/style notes above (no dedicated test of `register()`'s own error-forwarding branch — a pre-existing gap, not a regression; no JSDoc on the new module; a documented dead `return;` already a conscious `plan.md` decision) do not require action before merge.
