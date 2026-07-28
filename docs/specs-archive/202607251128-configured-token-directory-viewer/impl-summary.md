## Implementation Complete

### Files Created

- `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs` — monorepo bootstrap
- `packages/token-core/{package.json,tsconfig.json}` — new library package
- `packages/token-core/src/{types.ts,schema.ts,parse.ts,resolve-type.ts,index.ts}` — DTCG parsing/domain model
- `packages/token-core/src/{parse,resolve-type}.test.ts` — 11 tests, co-located with the code they test
- `apps/web-app/` — scaffolded via `create-next-app` (TypeScript, ESLint, App Router, no Tailwind/`src/`)
- `apps/web-app/instrumentation.ts` — startup config validation (fail-fast)
- `apps/web-app/lib/config.ts` (+ `lib/config.test.ts`) — `loadConfig`/`getConfig`, `ConfigError`, Zod-validated `dtcg-editor.config.json`
- `apps/web-app/lib/tokens/{scan,path-safety,read,plain-node}.ts` (+ `scan.test.ts`, `path-safety.test.ts`) — directory scan, path-traversal guard, file read+parse, `Map`→JSON-friendly tree conversion
- `apps/web-app/app/api/tokens/route.ts` (+ `route.test.ts`), `apps/web-app/app/api/tokens/[...path]/route.ts` (+ `route.test.ts`) — read-only REST endpoints (GET only)
- `apps/web-app/app/tokens/[...path]/page.tsx` — per-file token tree page
- `apps/web-app/components/{FolderOverview,TokenTree}.tsx` + `.module.css` — folder listing and recursive tree view (client component for expand/collapse)

### Files Modified

- `docs/project.md` — recorded two new conventions: tests co-located with source (not a separate `test/` dir), and internal relative imports use an explicit `.ts`/`.tsx` extension; also filled in the "Testing" tech-stack line (`node:test`, previously "not yet decided")
- `.gitignore` (root) — added `.turbo/`
- `apps/web-app/{package.json,tsconfig.json,next.config.ts,eslint.config.mjs,.gitignore}` — workspace naming, dependencies, merged strict base tsconfig + `allowImportingTsExtensions`, `turbopack.root`, explicit `no-explicit-any`, ignore local config file
- `apps/web-app/app/{page.tsx,layout.tsx,globals.css}` — replaced scaffold placeholder content; removed unused placeholder SVGs and `next/font/google` (avoids a build-time network dependency)
- `apps/web-app/app/api/tokens/route.ts`, `apps/web-app/app/api/tokens/[...path]/route.ts` — use the standard `Response.json()` instead of `NextResponse.json()` (see Notes)
- `plan.md` — all steps checked off, Architecture Decisions updated to match the final approach

### Acceptance Criteria

- [x] AC-01: Passed — `apps/web-app/lib/config.test.ts` (5 cases: missing file, invalid JSON, missing/empty `tokensDir`); manually confirmed `next start` with no config prints a fatal error and exits 1
- [x] AC-02: Passed — `apps/web-app/lib/tokens/scan.test.ts#"discovers *.json files at multiple nesting depths"`; manually confirmed with a real nested folder
- [x] AC-03: Passed — `packages/token-core/src/parse.test.ts` + `apps/web-app/lib/tokens/scan.test.ts#"isolates an invalid file from valid ones"`; manually confirmed a broken file is flagged without affecting other files
- [x] AC-04: Passed (manual, HTTP/SSR-level only) — folder overview and per-file tree verified via `next build`/`next start` + `curl`; no automated UI test (per plan) and no real-browser click-through was performed — no browser tool was available in this session
- [x] AC-05: Passed — `apps/web-app/app/api/tokens/route.test.ts` + `apps/web-app/app/api/tokens/[...path]/route.test.ts` (`"exports only GET"` in each); no write/fs-mutation code exists anywhere in `lib/tokens/`
- [x] AC-06: Passed — manually confirmed `pnpm --filter web-app build && pnpm --filter web-app start` serves correctly with a valid config present

### Notes

- Tests are co-located with the code they test (`parse.ts`/`parse.test.ts`, `scan.ts`/`scan.test.ts`, etc.), per explicit direction — not under a separate `test/` directory. `node --test` (no arguments) recursively discovers all of them. Recorded as a standing convention in `docs/project.md`.
- Internal relative imports across both packages use an explicit `.ts`/`.tsx` extension (e.g. `import { getConfig } from "./lib/config.ts"`), not extensionless or the NodeNext `.js` convention originally planned for `web-app`. This lets `node --test` run every test directly against TypeScript source with zero compile step (confirmed Node 22.6+/23+ runs `.ts` natively, and requires the literal extension of the file it loads). Turbopack (Next.js 16's bundler) also resolves `.ts`-extension specifiers correctly once `allowImportingTsExtensions` is set in `tsconfig.json` — an assumption from an earlier pass of this work (that Turbopack couldn't do this) turned out to be wrong once actually tested, so a more complex workaround (extensionless imports + a second CommonJS-targeted tsconfig + `dist-test/` build output, used only to make `node:test` runnable) was removed in favor of this simpler, uniform approach. `token-core`'s `dist/` build still emits standard `.js`-extension ESM for consumers — `tsc`'s `rewriteRelativeImportExtensions` (paired with `allowImportingTsExtensions`, both TS 5.7+) rewrites `.ts` specifiers to `.js` automatically at build time.
- The two Route Handlers use the standard `Response.json()` instead of `NextResponse.json()`. `next/server` has no `package.json` `exports` map, so `NextResponse` only resolves under Node's legacy CommonJS resolution (implicit `.js`-appending), not strict ESM — this broke `node --test` importing the route modules directly. `Response.json()` is a standard Fetch API method available natively in Node with no import at all, and is a strictly smaller, more standard surface for this feature's needs (JSON body + status code, nothing else) — removing the dependency on `next/server`'s resolution behavior entirely rather than working around it.
- `token-core`'s `serialize()` and round-trip tests were intentionally not built (per `plan.md`'s Architecture Decisions) — this feature is read-only, so there's nothing to round-trip yet; the internal model still preserves an unrecognized-field "extension bag" per node so a future `serialize` can be added without re-touching the parse model.
- All 32 tests pass (`pnpm run test` from the repo root, via Turborepo); `pnpm run build` and `pnpm run lint` also pass across both packages.
