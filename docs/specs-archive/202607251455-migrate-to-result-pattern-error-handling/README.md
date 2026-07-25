# Migrate to Result-Pattern Error Handling

Implemented on: 2026-07-25

Migrates the entire DTCG token read chain — `token-core`'s `parseTokenFile`/`parseNode` and every `web-app` consumer downstream of it (`path-safety.ts`, `read.ts`, `scan.ts`, both API routes, both page components) — from thrown exceptions to `neverthrow` `Result`/`ResultAsync`, per `docs/project.md`'s Error Handling constraint. A new, dependency-free `@dtcg-editor/errors` package provides the shared `UnknownError` type and the injected `Logger` interface. Which errors stayed "known" (named) versus became `UnknownError` was decided by auditing what the code *currently* handled, not by inventing a taxonomy — this closed a real, previously-unhandled gap: `scanTokenDirectory`'s `readdir` call had zero error handling before this feature and would crash uncaught on a permission/IO error; it now returns a clean, logged `UnknownError`.

Key files: `packages/errors/src/{logger,unknown-error}.ts`, `packages/token-core/src/parse.ts`, `apps/web-app/lib/tokens/{path-safety,read,scan}.ts`, `apps/web-app/app/api/tokens/**`, `apps/web-app/app/{page.tsx,tokens/[...path]/page.tsx}`.

Notable decisions (recorded in `docs/project.md`'s Architecture Decisions table): the evidence-based known/unknown error classification methodology, and the pattern for injecting testable dependencies into Next.js Route Handlers (split the logic into a separately-exported function, since Next's generated types constrain the exported `GET`/`POST`/etc. signature itself).

`/sdd-review` found 1 Critical, 1 Minor, 2 Info findings. The Minor and both Info findings were fixed and re-verified, including upgrading the fix beyond what was originally suggested — the user asked for the "real logger" test to inject and validate a mock instead of just accepting the noise, which led to the Route Handler DI pattern above. The 1 Critical finding — AC-06 (page rendering parity) has no automated test, only manual `curl`-based HTTP/SSR verification — was knowingly accepted rather than fixed, consistent with this project's existing precedent for React-rendering ACs (no `jsdom`/RTL dependency). AC-06 remains unchecked in the archived `feature.md`.
