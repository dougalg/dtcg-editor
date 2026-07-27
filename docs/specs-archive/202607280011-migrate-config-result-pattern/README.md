# Migrate Config Loading to Result-Pattern Error Handling

Implemented on: 2026-07-27

Migrates `apps/web-app/lib/config.ts`'s `loadConfig` from a throwing function to one returning `neverthrow`'s `Result<Config, ConfigError>`, per `docs/project.md`'s Error Handling constraint. This is the same mechanism change as the earlier "Migrate to Result-Pattern Error Handling" feature (`docs/specs-archive/202607251455-migrate-to-result-pattern-error-handling/`), applied here to a separate, previously out-of-scope call path: startup config loading via `instrumentation.ts`'s `register()` hook, not the token read chain. Following the prior migration's evidence-based known/unknown methodology, this path introduces no new `UnknownError` case — every throw site in `loadConfig` (`readFileSync`, `JSON.parse`) already funneled to `ConfigError`, and Zod's `safeParse` never throws — so `ConfigError` stays a single-shape `Error` subclass, unchanged.

`instrumentation.ts`'s `register()` now calls `loadConfig()` directly and branches on the `Result` instead of `try`/`catch` + `instanceof`, preserving the exact same startup log message and `process.exit(1)` fail-fast behavior. `getConfig()` keeps its plain `(): Config` signature so all four request-time call sites (`app/page.tsx`, both `route.ts` files, `app/tokens/[...path]/page.tsx`) needed zero changes; it now unwraps `loadConfig()`'s `Result` internally and throws a new named `ConfigNotInitializedError` on its should-be-unreachable cache-miss/`Err` fallback. A new exported `setConfigCache()` lets `register()` pre-warm `getConfig()`'s memoization cache after a successful startup `loadConfig()`, since `register()` no longer calls `getConfig()` itself.

Key files: `apps/web-app/lib/config.ts`, `apps/web-app/instrumentation.ts`, `apps/web-app/lib/config.test.ts`.

Notable decisions (recorded in `docs/project.md`'s Architecture Decisions table): the `setConfigCache()` pre-warming pattern for a startup-populated, request-time-memoized cache, and keeping a dedicated named `Error` subclass (`ConfigNotInitializedError`) for a defensive, should-be-unreachable branch even though it sits outside the `Result` chain.

`/sdd-review` found 0 Critical, 0 Major, 2 Minor (both pre-accepted test-coverage gaps already named as risks in `plan.md`, not regressions), and 1 Info finding (a reminder to flip `feature.md`'s AC checkboxes before archiving, done as part of this archive step). Verdict: Ready to merge. All 7 acceptance criteria independently re-verified by the reviewer, including a forced/uncached `pnpm build`/`lint`/`test` run.
