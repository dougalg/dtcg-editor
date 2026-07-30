## Implementation Complete

### Files Created

- `apps/web-app/dtcg-editor.config.mts` — committed (not gitignored), default `tokensDir: "../../sample_data"`, `extensions: []`
- `apps/web-app/lib/token-editors/types.ts` — `TokenFilterMetadata`, `TokenEditorExtension`, `DtcgEditorUserConfig`, `ResolvedDtcgEditorConfig`
- `apps/web-app/lib/token-editors/built-in.ts` — `BUILT_IN_TOKEN_TYPES`, `TokenType`, `builtInExtensions`
- `apps/web-app/lib/token-editors/define-config.ts` — `defineConfig`, `DtcgEditorConfigError`, `TokensDirSchema`
- `apps/web-app/lib/token-editors/resolve-editor.ts` — `resolveEditorForType` (first-match-wins)
- `apps/web-app/lib/token-editors/user-config.ts` — single static-import boundary for the real config file
- `apps/web-app/lib/token-editors/define-config.test.ts`
- `apps/web-app/lib/token-editors/resolve-editor.test.ts`
- `apps/web-app/components/TokenTree.override.test.tsx` — separate file so `vi.mock` doesn't affect `TokenTree.test.tsx`

### Files Modified

- `apps/web-app/lib/config.ts` — JSON+fs+Zod loading replaced with a static top-level import of the `.mts` config; `getConfig()`'s fallback kept (not removed — see Notes)
- `apps/web-app/instrumentation.ts` — `register()`'s dynamic `import("./lib/config.ts")` now wrapped in `try`/`catch` to route a `defineConfig` throw through `onFatalError`; otherwise unchanged (stayed synchronous)
- `apps/web-app/scripts/init-config.ts` — scaffolds `dtcg-editor.config.mts` (`defineConfig({...})`) instead of JSON; shares `TokensDirSchema` with `define-config.ts`
- `apps/web-app/components/TokenTree.tsx` — editor selection goes through `resolveEditorForType`; no more direct `DimensionEditor` import or `"dimension"` string literal
- `apps/web-app/.gitignore` — removed the config-file entry (file is committed now)
- `apps/web-app/lib/config.test.ts`, `apps/web-app/scripts/init-config.test.ts` — rewritten for the new design
- `apps/web-app/app/api/tokens/route.test.ts`, `apps/web-app/app/api/tokens/[...path]/route.test.ts` — `beforeAll` now calls `setConfigCache({ tokensDir })` directly instead of writing a config file + `process.chdir` (see Notes)

### Acceptance Criteria

- [x] AC-01: Passed — `TokenTree.test.tsx` (existing case, unchanged)
- [x] AC-02: Passed — `TokenTree.override.test.tsx`
- [x] AC-03: Passed — verified by inspection (`grep` for `DimensionEditor`/`"dimension"` in `TokenTree.tsx`: zero matches for either)
- [x] AC-04: Passed — verified by inspection (`git diff main -- edit-state.ts route.ts` is empty)
- [x] AC-05: Passed — `config.test.ts`, `init-config.test.ts`, plus a real `pnpm build` and manual `next dev`/`next start` requests (narrowed to `.mts` only, see Notes)
- [x] AC-06: Passed — `define-config.test.ts`
- [x] AC-07: Passed — `define-config.test.ts`, plus a manual `register()` invocation with an invalid config (graceful `console.error` + `exit(1)`, not an unhandled rejection)
- [x] AC-08: Passed — `init-config.test.ts`

### Notes

Two significant deviations from `plan.md`, both found by testing the real running app (not just unit tests) and already reflected in `plan.md`/`feature.md`:

- **`.mjs` support dropped, `.mts` only.** Discovered during `/sdd-plan`'s Step 1 spike: Turbopack's bundler resolves an extensionless import, but this repo's `tsc`-based type-check gate does not, for either extension. A literal-extension import only ever targets one extension, and genuine dual-format support would need a pre-build codegen step. Presented to the user; they chose the simpler single-extension path.
- **Config file is committed, not gitignored; `loadConfig`/`getConfig`/`RegisterDeps.loadConfig` stayed synchronous instead of becoming async.** The original plan made `loadConfig` async (a dynamic `import()` inside it) so a `defineConfig` throw could be caught gracefully, and kept the config file gitignored like the old JSON one. Building it revealed two real bugs, both invisible to unit tests and only caught by starting the actual `next dev`/`next start` servers and hitting them with real requests:
  1. Next.js/Turbopack bundles `instrumentation.ts`'s dynamic import of `config.ts` and a page's static import of it into separate chunks, each with independent module state — `register()`'s `setConfigCache()` in one chunk was invisible to `getConfig()` in another, so every real request 500'd. The _pre-existing_ `getConfig()` fallback (calling `loadConfig()` again on a cache miss) had been silently working around this exact issue all along, undocumented as such — it was never actually dead code. Fix: `config.ts` imports the user config statically at its own top level instead of dynamically inside `loadConfig`, restoring synchronous `loadConfig`/`getConfig` and the (now-understood-as-required) fallback. `instrumentation.ts`'s `try`/`catch` around its own dynamic import still catches a `defineConfig` throw during that static import's evaluation, so graceful startup failure is preserved.
  2. A gitignored config file breaks `next build`/`vitest`/`tsc` entirely on a fresh clone or in CI, since `TokenTree.tsx`'s import chain needs the file to exist just to resolve at build time — an unavoidable consequence of making `extensions`' component references build-time-resolvable. Fixed by committing `dtcg-editor.config.mts` with a default pointing at the repo's own `sample_data/`.
- `app/api/tokens/route.test.ts` and `app/api/tokens/[...path]/route.test.ts` (not mentioned in `plan.md`) needed fixing: their `beforeAll` relied on the old JSON-file+fallback mechanism to populate config; switched to calling `setConfigCache()` directly.
- Three pre-existing, unrelated `tsc --noEmit` errors (in `lib/tokens/read.test.ts`, `lib/tokens/scan.test.ts`, `scripts/init-config.test.ts`'s stream typing) were confirmed present on `main` before this feature (verified via `git stash`) and are outside this feature's scope — not touched.
- No new dependencies added.
