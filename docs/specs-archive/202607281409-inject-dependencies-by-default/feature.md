# Feature: Inject Dependencies by Default — Convention, Refactor, and Lint Enforcement

## Summary
The backlog item "Inject dependencies by default" asks for a convention governing how I/O and platform calls (its own example: `fs.readFile`) are passed into functions rather than imported and called directly, for testability and consistency, interacting with the Result-pattern refactor's `Logger`-injection approach. A full codebase audit found this convention had been organically established three times (`Logger` injection, the Route-Handler injectable-core split, the CLI `io`-bundle pattern) but never applied to filesystem access itself — every direct `fs` call in the repo (`readFile`, `writeFile`, `readdir`, `readFileSync`, `existsSync`, `writeFileSync`) is called directly, and every existing test exercises it against a real temporary directory rather than an injected fake.

An initial draft of this spec scoped the feature as documentation-only, given that evidence, and raised four scope forks as Open Questions. **All four have since been resolved by explicit human decision** (recorded in Resolved Decisions below), expanding scope substantially: this is now a full-codebase refactor that (1) retrofits explicit-parameter injection onto every direct I/O/platform call site found by the audit, (2) extends the convention to every externality category, not just `fs`, (3) adds ESLint-level enforcement so direct calls outside designated composition-root/adapter files are a lint error, and (4) documents the convention as a comprehensive taxonomy covering both currently-used and currently-unused externality categories. It also reverses this repo's current filesystem-testing convention: functions with an injected `fs` dependency must now be tested via a mocked implementation of that dependency, not a real temp directory, and four existing test files must be rewritten accordingly.

## Resolved Decisions

The four Open Questions from the initial draft are resolved as follows (verbatim scope, from the coordinator's relayed human decision):

1. **Refactor-inclusive, not docs-only.** Retrofit dependency injection into every I/O/platform call site currently calling directly: `read.ts`, `scan.ts`, `write.ts`, `config.ts`, `init-config.ts`, and any others the audit found (this spec's audit additionally found `instrumentation.ts` and `useSaveTokenEdits.ts` — see Decision 2). **Additionally**, `docs/project.md`'s testing guidance changes: any function with an injected `fs` read/write dependency must be tested using a mocked implementation of that dependency, not a real temp directory. This reverses current practice — `read.test.ts`, `scan.test.ts`, `config.test.ts`, and `init-config.test.ts` (all real-temp-dir-based today) must be rewritten to inject a mock `fs` instead, and `write.ts`'s missing test must be added using the same mocked approach.
2. **All externalities, not just `fs`.** The convention (and the refactor) extends to `fetch`, `process.env`, `console`, `process.exit`, `Date.now()`, `Math.random()`, and any other currently-direct-imported/called externality — not filesystem access alone. Applied to this repo's actual call sites, this pulls in `useSaveTokenEdits.ts`'s direct `fetch` call and `instrumentation.ts`'s direct `process.exit`/`console.error`/`process.env` calls, both previously carved out as exceptions in the docs-only draft.
3. **Add ESLint-level enforcement.** A lint rule (or rule set) flags direct calls to these externalities outside of designated injection points/composition roots — not documentation-only, not review-only (unlike how the three pre-existing precedents were adopted).
4. **Comprehensive taxonomy.** `docs/project.md`'s convention section enumerates the full set of externality categories (matching Decision 2's "all externalities" scope), not only categories with current call sites — `fs`, `fetch`, `console`, `process.exit`, `process.env`, `Date.now()`/`new Date()`, `Math.random()`, `crypto.randomUUID()`, etc.

**One consistency inference made explicit here rather than left implicit:** Decision 1's testing-convention change ("mock, not real fixture") is stated specifically for `fs`. Decision 2 extends injection itself to all externalities. Combining the two: once any externality is injected as an explicit parameter, this spec treats "pass a fake/mock implementation directly through that parameter" as the corresponding test strategy for *all* of them, superseding the current `vi.stubGlobal("fetch", ...)` pattern in `useSaveTokenEdits.test.tsx` as well — global stubbing bypasses the very parameter the refactor just introduced. This is a direct, non-discretionary consequence of Decisions 1+2 together, not a new open question, but it is called out because it changes a currently-passing, currently-idiomatic test file's approach (`useSaveTokenEdits.test.tsx`) that Decision 1's own wording didn't name.

**No Open Questions remain.** All four forks from the prior draft are resolved above; this feature.md reflects the full resolved scope end to end.

## Evidence (Codebase Audit)

### Already follows an injection-like convention (pre-existing precedents, kept and generalized)
1. **`Logger` injection** — `read.ts`, `scan.ts`, `write.ts`, `route.ts`'s `patchTokenFile` accept `logger: Logger = consoleLogger` (real default in `packages/errors/src/logger.ts`).
2. **Route Handler injectable-core split** — `route.ts`'s Next.js-signature-constrained `PATCH` wraps `patchTokenFile(request, relativePath, logger)`. Documented as an Architecture Decision; this feature reuses the same split shape for `instrumentation.ts`'s `register()` (see FR-05).
3. **CLI injectable-core/thin-wrapper `io` bundle** — `init-config.ts`'s `runInitConfig(io: InitConfigIO)` bundles `argv`/`cwd`/`input`/`output`/`isTTY`; `main()` is the sole composition root touching real `process.*`.

### Direct calls with zero injection today (now in scope for refactor, per Decisions 1–2)
- **`fs`**: `read.ts` (`readFile`), `scan.ts` (`readdir`), `write.ts` (`writeFile`), `config.ts` (`readFileSync` — note `loadConfig` already injects `cwd` but not the read itself), `init-config.ts` (`existsSync`, `writeFileSync`, inside `runInitConfig` itself — notable because this file is the *reference* injectable-core example and still doesn't inject fs).
- **`process.exit` / `console.*` / `process.env`**: `instrumentation.ts`'s `register()` — no injectable split at all today.
- **`fetch`**: `useSaveTokenEdits.ts` — calls global `fetch` directly; tested via `vi.stubGlobal`.
- **Categories with zero current call sites anywhere in the repo** (confirmed by a fresh grep across `apps/*` and `packages/*`): `Date.now()`/`new Date()`, `Math.random()`, `crypto.*`, `setTimeout`/`setInterval` (one unrelated hit inside a test file's own `await new Promise(...)` polling helper — not a source-code call site), `structuredClone`, `Intl.*`, `localStorage`/`sessionStorage`. Nothing to refactor for these; see FR-08.

### Testability evidence (motivated the original docs-only default; superseded by Decision 1)
Every existing test touching `fs`-based code (`read.test.ts`, `scan.test.ts`, `config.test.ts`, `init-config.test.ts`) uses a real temp directory via `mkdtemp`/`rm`. `write.ts` has no test file at all. `useSaveTokenEdits.test.tsx` uses `vi.stubGlobal("fetch", ...)`. None of this is broken today, but per Decision 1 it is being deliberately changed as a matter of policy (consistency/future-proofing), not because real-fixture testing was failing.

## Functional Requirements

### FR-01: Real-implementation adapters for shared-use externalities
Introduce a small set of "real adapter" modules — the same role `consoleLogger` already plays for `Logger` — that are the *only* place a given externality's real implementation is imported and referenced as a default parameter value:
- **New file `apps/web-app/lib/platform/node-fs.ts`**: exports real Node fs bindings used as default parameter values by `read.ts`, `scan.ts`, `write.ts`, `config.ts`, and `init-config.ts` (e.g. a `readFile`-shaped default, a `readdir`-shaped default, a `writeFile`-shaped default, an `existsSync`/`writeFileSync`-shaped pair). This is the only file (besides itself being the adapter) permitted to `import` from `node:fs`/`node:fs/promises` for use outside a default-parameter position.
- **Single-call-site externalities do not get a dedicated adapter file.** `fetch` (one call site: `useSaveTokenEdits.ts`) and `instrumentation.ts`'s `process.exit`/`console.error`/`process.env` (one call site each, inside the file being split per FR-05) keep their real default value declared inline, in the same file, as the composition-root boundary — consistent with how `init-config.ts`'s `main()` already does this for `process.argv`/`process.stdin`/`process.stdout`. A dedicated adapter module is only introduced when a real implementation is shared across more than one call site (mirrors why `consoleLogger` exists as its own file: 4 call sites share it).
- No new package is created for these adapters; per the audit, every current I/O/platform call site is inside `apps/web-app` (`packages/*` has zero direct-call sites), so `apps/web-app/lib/platform/` is sufficient. Promoting to a shared package is deferred until a `packages/*` consumer actually needs one (mirrors how `@dtcg-editor/errors` itself was only extracted once cross-cutting need was proven).

### FR-02: Inject `fs` read access — `read.ts`, `scan.ts`, `config.ts`
- `readAndParseTokenFile` (`read.ts`) accepts an injected read function (real default from `node-fs.ts`) alongside its existing `logger` parameter.
- `scanTokenDirectory`/`collectJsonFiles` (`scan.ts`) accept an injected `readdir`-shaped function the same way.
- `loadConfig` (`config.ts`) accepts an injected read function alongside its existing `cwd` parameter, closing the inconsistency where `cwd` was already injected but the read itself wasn't.

### FR-03: Inject `fs` write access — `write.ts`, `init-config.ts`
- `writeAndSerializeTokenFile` (`write.ts`) accepts an injected write function (real default from `node-fs.ts`) alongside its existing `logger` parameter.
- `runInitConfig` (`init-config.ts`) accepts injected `existsSync`/`writeFileSync`-shaped functions (either added to `InitConfigIO` or as sibling parameters) — closing the gap where this reference injectable-core example still called fs directly. `main()` remains the composition root supplying the real implementations, unchanged in role.

### FR-04: Add the missing `write.ts` test
Add `apps/web-app/lib/tokens/write.test.ts` (does not exist today) using the mocked-fs approach established by FR-06/FR-02/FR-03, not a real temp directory — this closes a pre-existing coverage gap the audit surfaced, now folded into scope because the refactor makes it directly relevant (write.ts's only path to real disk is now an injected, mockable parameter).

### FR-05: Split `instrumentation.ts` into an injectable core and a thin `register()` wrapper
Following the same shape as the existing Route Handler precedent (`patchTokenFile`/`PATCH`): extract the real logic into an injectable core function (e.g. `runRegister(deps)` accepting `loadConfig`, `setConfigCache`, an `exit` function, a `log`/`Logger`-shaped function, and the runtime env lookup), with the exported `register()` — which Next.js constrains to `(): Promise<void>` — as the sole composition-root wrapper supplying real `process.exit`, real logging, and real `process.env`. Add `apps/web-app/instrumentation.test.ts` (does not exist today) exercising the injectable core directly.

### FR-06: Inject `fetch` in `useSaveTokenEdits.ts`
`useSaveTokenEdits` accepts an injected fetch implementation (default: global `fetch`, declared inline per FR-01's single-call-site rule) instead of calling `fetch` directly.

### FR-07: Rewrite existing tests to inject mocks instead of real fixtures
Per Decision 1 (and the fetch consistency inference above), rewrite:
- `read.test.ts`, `scan.test.ts`, `config.test.ts`, `init-config.test.ts` — replace `mkdtemp`/real-temp-dir setup for `fs`-touching assertions with a hand-rolled mock implementation of the injected read/write/dir-list functions (no new mocking library — plain functions/objects, consistent with Minimal Dependencies and this repo's existing hand-rolled `fakeLogger()` test-helper pattern). `init-config.test.ts`'s existing stream-injection harness (`createIO`/`PassThrough`) is unaffected — only its `existsSync`/`writeFileSync` assertions change.
- `useSaveTokenEdits.test.tsx` — replace `vi.stubGlobal("fetch", ...)` with passing a mock fetch function directly through the new injected parameter.
- New `write.test.ts` and `instrumentation.test.ts` are written mock-first from the start (FR-04, FR-05).

### FR-08: Comprehensive convention write-up in `docs/project.md`
New Architectural Constraints subsection (peer to Error Handling / Validation at the Edges) documenting:
- The general principle and decision checklist (host-app swappability, or a testability need), generalized from the original docs-only draft.
- The full taxonomy per Decision 4: currently-used categories (`fs` read/write/dir-list/exists, `process.exit`, `process.env`, `console.*`, `fetch`) with their concrete adapter/injection points from FR-01–FR-06, **and** currently-unused categories (`Date.now()`/`new Date()`, `Math.random()`, `crypto.randomUUID()`/`crypto.getRandomValues()`, `setTimeout`/`setInterval`) named explicitly with "no current call site; the same injection requirement applies the moment one is introduced, enforced by the lint rule in FR-09 rather than left to reviewer memory."
- The testing-convention change: a function with an injected I/O/platform dependency is tested by passing a mock/fake implementation through that parameter; a real fixture (temp directory, real network call, real clock) is no longer the default testing approach for these — superseding the prior real-temp-dir convention this repo used until now.
- Update the existing Testing line in the Tech Stack section (currently describes `node:test`/Vitest split) with a cross-reference to this new mocking convention where it discusses `apps/web-app`'s fs/fetch-touching tests.
- Update the Architecture Decisions table's existing Route-Handler-split row to reference this feature (closing the loop it already flagged) instead of the now-resolved backlog item.

### FR-09: ESLint enforcement
Add rule(s) to `eslint.config.mjs` that flag, repo-wide:
- Direct `import`/`require` of `node:fs`/`node:fs/promises` outside `apps/web-app/lib/platform/node-fs.ts`.
- Direct `console.*` member-expression calls outside `packages/errors/src/logger.ts`, `instrumentation.ts` (composition-root boundary only, post-FR-05 split), and `init-config.ts`'s `main()`.
- Direct `process.exit(...)` calls outside `instrumentation.ts` and `init-config.ts`'s `main()`.
- Direct `process.env` member access outside `instrumentation.ts` and `config.ts`'s existing `process.cwd()`-style default-parameter precedent.
- Direct global `fetch(...)` calls outside `useSaveTokenEdits.ts`'s own default-parameter declaration.
- Direct `Date.now()`/`new Date()`, `Math.random()`, `crypto.randomUUID()`/`crypto.getRandomValues()` calls anywhere (no exemptions needed today — zero legitimate call sites exist yet; this proactively blocks the pattern from being reintroduced organically the way `fs` injection was skipped every time until now).

Mechanism: per-file rule overrides, mirroring the existing `**/*.cjs` → `no-require-imports: off` precedent already in `eslint.config.mjs` (apply the restrictive rule broadly, then a subsequent config block matching only the exempt file globs turns it back off for that file). Exact rule choice (`no-restricted-imports`, `no-restricted-syntax`, `no-restricted-globals`, or a combination) and the precise exemption globs are an `/sdd-plan` implementation detail; this FR fixes the *files* that must remain exempt (enumerated above and in Technical Scope) and the *behavior* (a lint error, not just documentation, on a new direct call site anywhere else).

## Acceptance Criteria
- [x] AC-01: `apps/web-app/lib/platform/node-fs.ts` exists and is the sole non-adapter-external import point for `node:fs`/`node:fs/promises` used as an injectable default.
- [x] AC-02: `read.ts`, `scan.ts`, `write.ts`, `config.ts` each accept an injected fs capability with a real default from `node-fs.ts`; no direct `node:fs`/`node:fs/promises` call remains in any of these four files outside that default-parameter wiring.
- [x] AC-03: `init-config.ts`'s `runInitConfig` accepts injected `existsSync`/`writeFileSync`-shaped functions; no direct fs call remains inside `runInitConfig` itself (`main()` may still supply the real defaults as the composition root).
- [x] AC-04: `write.test.ts` exists, uses a mocked fs implementation (no real temp directory), and covers `writeAndSerializeTokenFile`'s success and failure paths.
- [x] AC-05: `instrumentation.ts` is split into an injectable core plus a thin `register()` wrapper; `instrumentation.test.ts` exists and exercises the core directly without touching real `process.exit`/`process.env`.
- [x] AC-06: `useSaveTokenEdits` accepts an injected fetch implementation; no direct global `fetch` call remains outside its own default-parameter declaration.
- [x] AC-07: `read.test.ts`, `scan.test.ts`, `config.test.ts`, `init-config.test.ts` no longer use `mkdtemp`/a real temporary directory to exercise fs-touching behavior — all use injected mocks instead. `init-config.test.ts`'s stream-injection harness for interactive prompts is otherwise unchanged.
- [x] AC-08: `useSaveTokenEdits.test.tsx` no longer uses `vi.stubGlobal("fetch", ...)` — it passes a mock fetch function through the injected parameter instead.
- [x] AC-09: `eslint.config.mjs` contains rule(s) per FR-09; a deliberately-introduced direct call to a restricted externality outside its designated file is confirmed (during implementation/review) to produce a lint failure, and existing legitimate call sites in the designated files do not.
- [x] AC-10: `docs/project.md` has the new Architectural Constraints convention subsection (full taxonomy per Decision 4), the Tech Stack testing-convention update, and the Architecture Decisions table update, per FR-08.
- [x] AC-11: `pnpm build`, `pnpm lint`, and `pnpm test` all pass repo-wide after the refactor.
- [x] AC-12: No new npm dependency is added anywhere in this feature (mocks/fakes are hand-rolled per Minimal Dependencies; no `mock-fs`, `msw`, `sinon`, or similar library).

## Technical Scope

### Affected Modules / Files
**Refactored (existing files):**
- `apps/web-app/lib/tokens/read.ts`, `apps/web-app/lib/tokens/read.test.ts`
- `apps/web-app/lib/tokens/scan.ts`, `apps/web-app/lib/tokens/scan.test.ts`
- `apps/web-app/lib/tokens/write.ts`
- `apps/web-app/lib/config.ts`, `apps/web-app/lib/config.test.ts`
- `apps/web-app/scripts/init-config.ts`, `apps/web-app/scripts/init-config.test.ts`
- `apps/web-app/instrumentation.ts`
- `apps/web-app/hooks/useSaveTokenEdits.ts`, `apps/web-app/hooks/useSaveTokenEdits.test.tsx`
- `eslint.config.mjs`
- `docs/project.md`

**New files:**
- `apps/web-app/lib/platform/node-fs.ts` (fs real-adapter module, FR-01)
- `apps/web-app/lib/tokens/write.test.ts` (FR-04)
- `apps/web-app/instrumentation.test.ts` (FR-05)

**Audited, confirmed no changes needed (no direct I/O/platform call sites found):** `packages/token-core/*`, `packages/token-type-contract/*`, `packages/token-type-dimension/*`, `packages/errors/src/unknown-error.ts`, `apps/web-app/app/**` (Server Components / other Route Handlers — `route.ts`'s `GET`/`PATCH` already delegate all fs access to `read.ts`/`write.ts`, so no additional direct-call sites exist there), `apps/web-app/components/*`, `apps/web-app/lib/tokens/{edit-request,edit-state,path-safety,plain-node,save-error}.ts`. `packages/errors/src/logger.ts` is unchanged in behavior — it remains the real adapter for `Logger`/`console.error`, now also named explicitly as an ESLint exemption (FR-09) rather than an unstated exception.

### New Components Required
- `apps/web-app/lib/platform/node-fs.ts` — shared real-fs adapter (FR-01).
- ESLint rule configuration in `eslint.config.mjs` for restricted-externality enforcement (FR-09).

### Integration Points
- Error Handling (Result Pattern) constraint — `Logger` injection this feature generalizes from; unchanged itself, but now cross-referenced from the new convention section.
- Architecture Decisions table — Route-Handler-split and CLI-`io`-bundle rows, both reused as the structural template for `instrumentation.ts`'s new split (FR-05) and `init-config.ts`'s extended `io` (FR-03).
- UI-Layer Result Consumption convention — `useSaveTokenEdits.ts` is its reference implementation; FR-06/FR-07 change its fetch-testing approach but not its `Result`/state-shape conventions, which are unaffected.
- The still-open "Fix Edge Runtime warning for `process.exit` in `instrumentation.ts`" backlog item — same file this feature restructures via FR-05. The split in FR-05 isolates `process.exit` into the thin `register()` wrapper, which may incidentally help or conflict with that item's own isolation goal; flagged here as a sequencing consideration for whoever picks up either item, not resolved by this feature.

## Non-Functional Requirements
- **Consistency**: `docs/project.md`'s new convention section must accurately describe the post-refactor codebase (verified via this feature's audit and the refactor itself) — no aspirational gap between doc and code.
- **No new dependencies**: per Minimal Dependencies, all mocks/fakes are hand-rolled; the ESLint rules use built-in `typescript-eslint`/ESLint core rule types already in use (`no-restricted-imports`, `no-restricted-syntax`, `no-restricted-globals`), not a new lint plugin.
- **Test suite integrity**: rewriting four existing test files (FR-07) to use mocks instead of real fixtures must preserve their existing assertions/coverage — this is a testing-*strategy* change, not a coverage reduction; each rewritten test should still cover the same success/failure branches (e.g. `read.test.ts`'s `ENOENT` → `FileNotFoundError` case must still be exercised, now via a mock that simulates `ENOENT` instead of a real missing file).

### Scope-size observation for the coordinator
This is no longer a single-PR-sized change — it touches 9 existing files, adds 3 new files, and changes both a cross-cutting doc convention and CI-enforced lint config. Worth considering splitting `/sdd-plan`/`/sdd-implement` into phases rather than one pass, e.g.: **(1)** foundational adapter module + doc convention write-up + Architecture Decisions update (no behavior change yet); **(2)** `fs`-injection refactor for `read.ts`/`scan.ts`/`write.ts`/`config.ts` + their test rewrites + new `write.test.ts`; **(3)** `init-config.ts`'s fs-injection gap + `instrumentation.ts`'s injectable-core split + its new test; **(4)** `useSaveTokenEdits.ts` fetch injection + test rewrite; **(5)** ESLint enforcement, added last so it's checked against an already-fully-compliant codebase rather than needing temporary suppressions mid-refactor. This is an observation, not a decision made here — this feature.md's scope stands as one complete spec regardless of how `/sdd-plan` chooses to sequence it.

## Out of Scope
- Promoting the new `apps/web-app/lib/platform/` adapters into a shared `packages/*` package — deferred until a package outside `apps/web-app` actually needs one (none do today).
- Introducing any new mocking/testing library (`mock-fs`, `msw`, `sinon`, etc.) — mocks are hand-rolled per Minimal Dependencies.
- Resolving the separate "Fix Edge Runtime warning for `process.exit`" backlog item — noted as an interaction (same file, `instrumentation.ts`) but not addressed here.
- Inventing speculative call sites for `Date.now()`/`Math.random()`/`crypto.*`/`setTimeout` — none exist; this feature documents and lint-bans the pattern prospectively (FR-08, FR-09) without adding any actual usage.

## Open Questions
None remaining. All four forks raised in the initial draft are resolved in Resolved Decisions above.
