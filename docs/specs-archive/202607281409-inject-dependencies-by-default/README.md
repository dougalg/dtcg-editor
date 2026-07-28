# Inject Dependencies by Default

Implemented on: 2026-07-28

Establishes and enforces this repo's Dependency Injection convention for I/O/platform externalities: a function that touches `fs`, `fetch`, `process.exit`, `console`, `process.env`, or similar accepts it as an explicit parameter with a real implementation as its default value, rather than importing/calling the externality directly — generalizing the existing `Logger`-injection convention (Error Handling constraint) to every externality category, enforced by new ESLint rules rather than left to reviewer memory.

Implemented across 5 sequential phases (each independently verifiable, phase order load-bearing) plus one post-review fix commit:

- **Phase 1** (`bb56ece`): added the `apps/web-app/lib/platform/node-fs.ts` real-fs adapter module and wrote `docs/project.md`'s convention subsection.
- **Phase 2** (`e8bdf97`): injected fs into `read.ts`/`scan.ts`/`write.ts`/`config.ts`; added the previously-missing `write.test.ts`; rewrote `read.test.ts`/`scan.test.ts`/`config.test.ts` from real-temp-dir (`mkdtemp`) fixtures to hand-rolled mocked-fs fakes.
- **Phase 3** (`b2c09ea`): closed `init-config.ts`'s fs gap; split `instrumentation.ts` into an injectable `runRegister(deps)` core plus a thin `register()` wrapper; added `instrumentation.test.ts`. Two Edge-Runtime-safety deviations from plan.md's literal code shape were required here (see Notable Decisions).
- **Phase 4** (`2248308`): injected `fetch` into `useSaveTokenEdits`; rewrote its test off `vi.stubGlobal`; finalized `docs/project.md`'s convention subsection for accuracy against the now-complete codebase.
- **Phase 5** (`9c2f612`): added ESLint `no-restricted-syntax`/`no-restricted-imports`/`no-restricted-globals` rules to both `eslint.config.mjs` files, turning a new direct call site outside its designated file into a lint error.
- **Review fix** (`1fcc8ae`): deduped the two per-file ESLint override blocks' identical filtered selector array into one shared constant, per `sdd-review`'s single Minor finding.

Reviewed via `sdd-review`: verdict PASS, ready to merge. All 12 acceptance criteria independently re-verified during review (not accepted solely on phase self-reports) — see `review.md`.

## Key files

- `apps/web-app/lib/platform/node-fs.ts` — real-fs adapter, sole non-adapter-external import point for `node:fs`/`node:fs/promises`
- `apps/web-app/lib/tokens/read.ts`, `scan.ts`, `write.ts`, `apps/web-app/lib/config.ts` — inject fs, real-defaulted from `node-fs.ts`
- `apps/web-app/scripts/init-config.ts` — `runInitConfig` injects `existsSync`/`writeFileSync`-shaped functions; `main()` remains the composition root
- `apps/web-app/instrumentation.ts` + `apps/web-app/lib/fatal-startup-error.ts` — injectable core/thin-wrapper split; the fatal-exit path's real `process.exit`/`console.error` implementation lives behind a dynamic `import()`
- `apps/web-app/hooks/useSaveTokenEdits.ts` — injects `fetch`
- `apps/web-app/eslint.config.mjs` (app-local) + root `eslint.config.mjs` — DI-convention lint enforcement
- `docs/project.md` — "Dependency Injection for I/O/Platform Externalities" Architectural Constraints subsection (full taxonomy, adapter shape, testing-convention change)

## Notable decisions

- **`fatal-startup-error.ts`, not `instrumentation.ts`, is the real ESLint exemption target** for direct `process.exit`/`console.*` calls — a gap in `feature.md`'s own file audit, corrected during Phase 3. Flagged for optional sign-off in `plan.md`; reviewed and accepted.
- **`runRegister(deps)`'s `onFatalError(message)` dependency is real-defaulted only inside a dynamic `import()` callback**, never referenced as a bare value at `instrumentation.ts`'s top level — required to avoid re-tripping Turbopack's Edge Runtime static-analysis warning that a prior, separately-merged feature already fixed.
- **The DI-convention ESLint rules live in `apps/web-app/eslint.config.mjs`** (its own local flat-config file, discovered during planning), not only the root file — `apps/web-app`'s `lint` script resolves its nearest config, which is the local one; adding the rules only at the root would have been vacuous against every real call site.
- **One Info-level review finding, reviewed and accepted by the human as-is**: Phase 5 added a `no-restricted-imports: "off"` exemption for two Route Handler integration test files that `feature.md`/`plan.md` never named — they still use real `mkdtemp` fixtures, out of FR-07's mock-rewrite scope. Not a defect; a documented, reviewed judgment call.
- Implemented via commits `bb56ece`, `e8bdf97`, `b2c09ea`, `2248308`, `9c2f612`, `1fcc8ae`. No new runtime or dev dependency was added anywhere in this feature.
