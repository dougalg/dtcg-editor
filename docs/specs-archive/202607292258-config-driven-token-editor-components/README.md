# Config-Driven Token Editor Components

Implemented on: 2026-07-29

Users who clone and run `apps/web-app` can now choose a different interactive editor component for a subset of tokens via a committed, code-authored `dtcg-editor.config.mts` module, instead of forking `TokenTree.tsx`'s hard-coded `DimensionEditor` import.

## What was built

- `apps/web-app/dtcg-editor.config.mts` (committed, not gitignored) calls a new `defineConfig({ tokensDir, extensions })` helper, which validates the input and merges `extensions` with this repo's built-in editor defaults (currently just `DimensionEditor` for `"dimension"` tokens).
- `extensions` is an array of `{ filter, editor }` pairs — `filter` receives `{ type: TokenType }` and `editor` is the React component to render for matching tokens. User-supplied entries are ordered ahead of built-in defaults, so a matching entry overrides the default; `resolveEditorForType` does the first-match-wins lookup.
- New `apps/web-app/lib/token-editors/` module: `types.ts`, `built-in.ts` (`BUILT_IN_TOKEN_TYPES` — the single source of truth for future token-type packages, kept honest by a TypeScript mapped-type record), `define-config.ts` (`defineConfig`, `DtcgEditorConfigError`), `resolve-editor.ts`, `user-config.ts`.
- `TokenTree.tsx` resolves the editor per token via the registry instead of a direct `DimensionEditor` import or a `"dimension"` string-literal check. `edit-state.ts`/`route.ts` (save-time validation/serialization) are untouched — this feature is UI-selection-only.
- `apps/web-app/scripts/init-config.ts` scaffolds the new `.mts` format instead of JSON.

## Notable decisions (see `docs/project.md`'s Architecture Decisions for full detail)

- **`.mjs` support was dropped** — Turbopack's bundler resolves extensionless imports but this repo's `tsc`-based type-check gate does not; dual-format support would need a pre-build codegen step, declined for simplicity.
- **The config file is committed, not gitignored** — `extensions`' component references must be statically resolvable at build time to reach the client bundle, so the file can't be optional/machine-specific the way the old JSON file was. A gitignored copy breaks `next build`/`vitest`/`tsc` on a fresh clone or in CI.
- **`lib/config.ts` resolves the config via a static top-level import, and `getConfig()`'s cache-miss fallback is required, not dead code** — Next.js/Turbopack bundles `instrumentation.ts`'s dynamic import of `config.ts` and a page's static import of it into separate chunks with independent module state. Both of the above were real, application-breaking bugs caught only by running the actual `next dev`/`next start` servers, not by unit tests alone.

## Review

One critical (AC-07: `defineConfig` crashed with a raw `TypeError` instead of a clean error on malformed `extensions` input) and two major findings from `/sdd-review` were fixed and re-verified before merge — see `review.md`. All 8 acceptance criteria pass.
