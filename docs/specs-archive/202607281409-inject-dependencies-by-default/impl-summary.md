## Implementation Complete

Implemented across 5 sequential phases (each independently verifiable, phase order load-bearing) plus one post-review fix commit.

### Files Created
- `apps/web-app/lib/platform/node-fs.ts` — the real-fs adapter module; sole non-adapter-external import point for `node:fs`/`node:fs/promises` used as an injectable default (Phase 1)
- `apps/web-app/lib/tokens/write.test.ts` — new test file (previously missing), mocked fs, covers `writeAndSerializeTokenFile`'s success and failure paths (Phase 2)
- `apps/web-app/instrumentation.test.ts` — exercises the new `runRegister(deps)` core directly with fake deps, without touching real `process.exit`/`process.env` (Phase 3)

### Files Modified
- `apps/web-app/lib/tokens/read.ts`, `scan.ts`, `write.ts`, `apps/web-app/lib/config.ts` — each now accepts an injected fs capability with a real default sourced from `node-fs.ts`; no direct `node:fs`/`node:fs/promises` call remains outside that default-parameter wiring (Phase 2)
- `apps/web-app/lib/tokens/read.test.ts`, `scan.test.ts`, `apps/web-app/lib/config.test.ts` — rewritten from real-temp-dir (`mkdtemp`) fixtures to hand-rolled mocked-fs fakes (Phase 2)
- `apps/web-app/scripts/init-config.ts` — `runInitConfig` now accepts injected `existsSync`/`writeFileSync`-shaped functions; no direct fs call remains inside `runInitConfig` itself; `main()` remains the composition root supplying real defaults (Phase 3)
- `apps/web-app/scripts/init-config.test.ts` — rewritten off real temp directories to injected mocks; its stream-injection harness for interactive prompts left unchanged (Phase 3)
- `apps/web-app/instrumentation.ts` — split into an injectable `runRegister(deps)` core plus a thin `register()` wrapper; the `onFatalError(message)` dependency combines feature.md's illustrative separate exit/log deps into one, real-defaulted via the same dynamic-`import()`-of-`fatal-startup-error.ts` pattern the earlier Edge Runtime fix established, to avoid reintroducing that warning (Phase 3, Flagged Decision 2)
- `apps/web-app/hooks/useSaveTokenEdits.ts` — accepts an injected fetch implementation; no direct global `fetch` call remains outside its own default-parameter declaration (Phase 4)
- `apps/web-app/hooks/useSaveTokenEdits.test.tsx` — rewritten off `vi.stubGlobal("fetch", ...)`; mock fetch now passed as the hook's second argument (Phase 4)
- `apps/web-app/eslint.config.mjs` — new `no-restricted-syntax`/`no-restricted-imports`/`no-restricted-globals` rules enforcing the DI convention, with per-file override exemptions for the real adapter/composition-root files; the two override blocks were later deduped into a shared constant (Phase 5 + review-fix commit)
- `eslint.config.mjs` (repo root) — zero-exemption `Date.now`/`Math.random`/`crypto.*` bans added, applying repo-wide per FR-09 (Phase 5)
- `docs/project.md` — new "Dependency Injection for I/O/Platform Externalities" Architectural Constraints subsection (written in Phase 1, finalized/cross-checked for accuracy in Phase 4 after all injection points existed), Tech Stack testing-convention update (mocked-fs replacing real-temp-dirs), Architecture Decisions table update

### Acceptance Criteria
All 12 independently re-verified by `sdd-review` (verdict PASS, ready to merge) — not accepted solely on phase self-reports.
- [x] AC-01: `node-fs.ts` is the sole adapter import point (two Route Handler *integration test* files retain real `node:fs/promises` fixture usage, out of FR-07's mock-rewrite scope, explicitly exempted with in-file rationale — flagged in review as an Info-level judgment call, reviewed and accepted by the human as-is)
- [x] AC-02: `read.ts`/`scan.ts`/`write.ts`/`config.ts` inject fs, no direct call outside default wiring
- [x] AC-03: `init-config.ts`'s `runInitConfig` has no direct fs call
- [x] AC-04: `write.test.ts` exists, mocked fs, success + failure paths (3 tests)
- [x] AC-05: `instrumentation.ts` split + `instrumentation.test.ts` exercises the core without touching real process/env
- [x] AC-06: `useSaveTokenEdits` injects fetch, no direct global `fetch` call outside its default
- [x] AC-07: `read/scan/config/init-config.test.ts` no longer use `mkdtemp`/a real temp dir
- [x] AC-08: `useSaveTokenEdits.test.tsx` no longer uses `vi.stubGlobal`
- [x] AC-09: ESLint rules produce a lint failure on a deliberate violation and pass on legitimate code (review directly authored and ran a 9-violation probe file; all 9 selectors fired correctly)
- [x] AC-10: `docs/project.md` has the new convention subsection, Tech Stack update, Architecture Decisions row update
- [x] AC-11: `pnpm build`/`lint`/`test` all pass repo-wide (verified repo-wide from a clean cache during review)
- [x] AC-12: No new npm dependency added anywhere (`git diff` on every `package.json` shows no changes)

### Verification
- `pnpm build && pnpm lint && pnpm test` — run at the end of every phase and again during `sdd-review` from a clean cache (`.next` deleted, `--force`) — all green (10/10 lint tasks, 10/10 test tasks incl. 81 web-app tests, 5/5 build tasks)
- Edge Runtime warning check: `.next` build log grepped for "edge"/"warn" — confirmed no Edge Runtime warning is emitted for `instrumentation.ts` (the earlier, separately-merged Edge Runtime fix does not regress)
- Repo-wide grep for `console.*`, `process.exit`, `process.env`, bare `fetch(`, and `node:fs`/`node:fs/promises` imports — no orphaned direct call sites outside designated/exempted files
- Repo-wide grep for `: any`, `as any`, non-null assertion (`!`) introductions across the full diff — none found

### Notes
Two Edge-Runtime-safety deviations from plan.md's literal code shape, both made during implementation and confirmed sound by `sdd-review`:
1. **`fatal-startup-error.ts`, not `instrumentation.ts`, is the real ESLint exemption target** for `process.exit`/`console.*` — it predates this feature (introduced by the separately-merged "Fix Edge Runtime Warning" feature) and was a gap in `feature.md`'s own file audit, not a new refactor target. Flagged for optional sign-off in plan.md; reviewed and accepted.
2. **`runRegister(deps)`'s `onFatalError(message)` dependency is real-defaulted only inside a dynamic `import()` callback, never referenced as a bare value at `instrumentation.ts`'s top level** — required because Turbopack's Edge Runtime static-analysis scan flags Node-only APIs referenced anywhere in the file's own top-level source, regardless of runtime guards.

One review-fix commit followed `sdd-review`'s single Minor finding: `apps/web-app/eslint.config.mjs`'s two per-file override blocks (`fatal-startup-error.ts`, `init-config.ts`) computed an identical filtered selector array independently; deduped into one shared constant.

No new runtime or dev dependency was added in any phase (confirmed via `git diff` on every `package.json` in the repo).
