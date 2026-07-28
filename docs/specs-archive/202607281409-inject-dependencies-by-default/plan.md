# Implementation Plan: Inject Dependencies by Default

## Overview
This plan retrofits explicit-parameter dependency injection onto every direct I/O/platform call site in `apps/web-app` (`fs`, `fetch`, `process.exit`, `console.*`, `process.env`), rewrites the affected tests to use hand-rolled mocks instead of real fixtures (temp directories / `vi.stubGlobal`), documents the resulting convention in `docs/project.md`, and finally adds ESLint rules that make direct calls to these externalities outside their designated files a lint error.

Per explicit human decision, this is split into **5 sequential phases**, each independently implementable and verifiable by a separate sub-agent dispatch. **Phase order is load-bearing**: phase 2+ imports from phase 1's adapter module; phase 5's lint rules assume phases 1–4 already moved every call site into a designated file, or they will fail against legitimate code the moment they're turned on.

No new runtime or dev dependency is required anywhere in this plan (confirmed during planning — see Phase 5, which uses only ESLint/`typescript-eslint` machinery already present in `eslint.config.mjs`/`apps/web-app/eslint.config.mjs`).

## Flagged Decisions for Optional Human Sign-Off
These are implementation-detail resolutions made during planning where `feature.md`'s wording under-specified or (in two cases) was factually stale relative to the current codebase. None of them change scope or acceptance criteria; all are noted inline in the relevant phase below as well.

1. **`apps/web-app/lib/fatal-startup-error.ts` is a real, already-existing direct call site for `console.error` + `process.exit`** that `feature.md`'s audit did not name. It postdates the audit: it was introduced by the separate, already-merged "Fix Edge Runtime Warning for `process.exit` in `instrumentation.ts`" feature (see `docs/project.md`'s Architecture Decisions table, 2026-07-28 row, and its own archived spec). `instrumentation.ts`'s `register()` no longer calls `console.error`/`process.exit` directly today — it dynamically imports `exitOnFatalStartupError` from this file, which does. `feature.md`'s Technical Scope doesn't list this file in either its "refactored" or "audited, no changes needed" inventories, and FR-09's exemption enumeration names `instrumentation.ts` for `process.exit`/`console.*`, not this file. This is a genuine gap in `feature.md`'s audit (not just an implementation nuance) — my resolution: leave `fatal-startup-error.ts`'s code untouched (it's already exactly the injectable-core-adjacent shape this feature wants — a single isolated function, reached only via dynamic import, that is the sole real caller of `process.exit`/`console.error`), and treat it, not `instrumentation.ts`, as the real ESLint exemption target for those two externalities in Phase 5. I did not add it to `feature.md`'s scope as a new file to refactor, since no refactor is needed — only its exemption status needed correcting. **Flagging this explicitly for optional sign-off since it's a correction to `feature.md`'s own file inventory, not just a judgment call within stated scope.**
2. **Phase 3's `runRegister(deps)` combines FR-05's illustrative separate "exit function" and "log function" deps into one `onFatalError(message)` dependency**, real-defaulted in `register()` via the same dynamic-`import()`-of-`fatal-startup-error.ts` pattern the Edge Runtime fix established. This preserves that Architecture Decision (Turbopack's Edge Runtime static-analysis scan flags Node-only APIs referenced anywhere in `instrumentation.ts`'s own top-level source, regardless of runtime guards — only code reached exclusively through a dynamic `import()` escapes it); referencing `process.exit`/`console.error` as bare values in `register()`'s own source to satisfy two separate deps would risk reintroducing exactly the warning that feature already fixed.
3. **`apps/web-app` has its own `eslint.config.mjs`, separate from the root one** (`apps/web-app/eslint.config.mjs`, extends `eslint-config-next`) — discovered during planning. ESLint flat-config resolution finds the nearest config file walking up from a package's cwd; for `apps/web-app` (whose `lint` script is bare `eslint` run with cwd = `apps/web-app` under Turborepo) that's its own local file, not the root one. `packages/*` (which have no local `eslint.config.mjs` of their own) do resolve to the root file. Every actual call site and exemption FR-09 names lives inside `apps/web-app`. Phase 5 therefore adds the fs/`console`/`process.exit`/`process.env`/`fetch` restriction rules to **`apps/web-app/eslint.config.mjs`**, not (only) the root `eslint.config.mjs` — adding them only to the root file, per FR-09's literal "add rule(s) to `eslint.config.mjs`" phrasing, would silently apply them to `packages/*` (where they're vacuous, zero call sites) and never fire on the code they're meant to constrain, failing AC-09's own stated verification ("a deliberately-introduced direct call... is confirmed to produce a lint failure"). The zero-exemption `Date.now`/`Math.random`/`crypto.*` bans are added to **both** config files, since FR-09 says those apply "anywhere." **Flagging this explicitly for optional sign-off** — it's the most consequential correction in this plan, since silently following FR-09's literal single-file wording would produce a lint rule addition that passes CI while enforcing nothing on the code it targets.
4. **No speculative `process.env` exemption is added for `config.ts`.** FR-09's text lists "`config.ts`'s existing `process.cwd()`-style default-parameter precedent" alongside `instrumentation.ts` as a `process.env` exemption location, but `config.ts` has zero `process.env` call sites today (only `process.cwd()`, which no FR-09 bullet restricts at all). This plan reads that clause as citing `config.ts`'s `cwd`-default as an analogous *pattern*, not a literal grant, consistent with FR-09's own "no exemptions needed today; zero legitimate call sites exist yet" philosophy applied to the prospective categories. Only `instrumentation.ts` is exempted for `process.env`.
5. **`scanTokenDirectory`/`collectJsonFiles` (`scan.ts`) inject both a `readdir`-shaped function AND forward an injected `read`-shaped function through to `readAndParseTokenFile`.** FR-02 only mentions the `readdir` injection; the `read` forwarding is a necessary consequence of `scan.ts` calling into `read.ts` per file — without it, `scan.test.ts`'s AC-07 rewrite could not fully eliminate real fs.
6. **`node-fs.ts`'s `readdir` adapter is typed against a small hand-rolled `DirEntry` structural interface**, not `node:fs`'s `Dirent`, so `scan.ts`/`scan.test.ts` never need any import (even type-only) from `node:fs` — keeping `node-fs.ts` the literal sole importer (AC-01) and avoiding a `no-restricted-imports` vs. `@typescript-eslint/no-restricted-imports`(`allowTypeImports`) design fork in Phase 5.

## Architecture Decisions
- **Adapter shape mirrors `consoleLogger`**: one small module (`lib/platform/node-fs.ts`) exporting real, ready-to-use default implementations; consumers accept an injected parameter with that real value as its default. No DI container, no class wrapping — plain functions, matching this repo's existing `Logger`-injection style.
- **Injected fs functions bake in `"utf-8"` and `withFileTypes: true`**, since every current real call site always passes the same encoding/options. This shrinks the injected function signatures to `(path) => Promise<string>` / `(path, data) => Promise<void>` / `(path) => Promise<DirEntry[]>`, which is simpler to hand-mock than forwarding raw `fs`-shaped signatures.
- **Single-call-site externalities (`fetch`, the fatal-startup exit path) keep their real default declared inline** at the composition-root file, per FR-01 — no new adapter file for them.
- **`instrumentation.ts` follows the Route-Handler-split precedent exactly**: an exported `register()` (Next.js-signature-constrained) wraps an injectable `runRegister(deps)` that holds 100% of the branching logic, mirroring `patchTokenFile`/`PATCH` and `runInitConfig`/`main()`.
- **Test rewrites hand-roll mocks inline per file**, mirroring the existing `fakeLogger()` pattern already in `read.test.ts`/`scan.test.ts` — no shared test-utility module is introduced (matches Minimal Dependencies and FR-07's explicit wording).

---

## Phase 1: Adapter Module + Doc Convention Foundation

**Goal**: Create the real-fs adapter module every later fs-touching phase imports from, and write the full `docs/project.md` convention section describing the target end-state of this refactor.

**Depends on**: nothing (first phase).

**Files**:
- New: `apps/web-app/lib/platform/node-fs.ts`
- Modified: `docs/project.md`

### Steps

1. **Create `apps/web-app/lib/platform/node-fs.ts`**:

   ```ts
   import {
     existsSync as fsExistsSync,
     readFileSync as fsReadFileSync,
     writeFileSync as fsWriteFileSync,
   } from "node:fs";
   import { readdir, readFile, writeFile } from "node:fs/promises";

   /**
    * Structural subset of `fs.Dirent` this repo's directory-scanning code
    * needs. Kept as a local interface (rather than importing `Dirent` from
    * `node:fs`) so no consumer of this adapter ever needs its own import —
    * even a type-only one — from `node:fs`; this file stays the sole
    * `node:fs`/`node:fs/promises` import point in the app (AC-01).
    */
   export interface DirEntry {
     readonly name: string;
     isDirectory(): boolean;
     isFile(): boolean;
     isSymbolicLink(): boolean;
   }

   export type ReadTextFile = (path: string) => Promise<string>;
   export type WriteTextFile = (path: string, data: string) => Promise<void>;
   export type ReadDirEntries = (path: string) => Promise<DirEntry[]>;
   export type ReadTextFileSync = (path: string) => string;
   export type ExistsSync = (path: string) => boolean;
   export type WriteTextFileSync = (path: string, data: string) => void;

   /** Real `fs.readFile`, bound to utf-8 — `read.ts`'s injected default. */
   export const nodeReadFile: ReadTextFile = (path) => readFile(path, "utf-8");

   /** Real `fs.writeFile`, bound to utf-8 — `write.ts`'s injected default. */
   export const nodeWriteFile: WriteTextFile = (path, data) => writeFile(path, data, "utf-8");

   /** Real `fs.readdir` with `withFileTypes: true` — `scan.ts`'s injected default. */
   export const nodeReadDir: ReadDirEntries = (path) => readdir(path, { withFileTypes: true });

   /** Real `fs.readFileSync`, bound to utf-8 — `config.ts`'s injected default. */
   export const nodeReadFileSync: ReadTextFileSync = (path) => fsReadFileSync(path, "utf-8");

   /** Real `fs.existsSync` — `init-config.ts`'s injected default. */
   export const nodeExistsSync: ExistsSync = (path) => fsExistsSync(path);

   /** Real `fs.writeFileSync`, bound to utf-8 — `init-config.ts`'s injected default. */
   export const nodeWriteFileSync: WriteTextFileSync = (path, data) => fsWriteFileSync(path, data, "utf-8");
   ```

   Note: `readdir(path, { withFileTypes: true })`'s resolved type (`Dirent[]`) is structurally assignable to `DirEntry[]` (it has strictly more members), so this compiles under this repo's strict TS settings with no cast.

2. **Write `docs/project.md`'s new Architectural Constraints subsection** (peer to Error Handling / Validation at the Edges). This describes the convention's *target end-state* — it will not be fully accurate until Phases 2–4 land; a cross-check step is added at the end of Phase 4 to patch any drift before the feature is considered done (Flagged Decision context: FR-08 is written once here rather than fragmented across all 4 remaining phases, to avoid 4x doc-touching coordination overhead — the "no aspirational gap" NFR is a property of the final state, not of every intermediate checkpoint).

   New subsection, e.g. titled **"Dependency Injection for I/O/Platform Externalities"**, containing:
   - **Principle**: a function that touches an I/O/platform externality accepts it as an explicit parameter with a real implementation as its default value, rather than importing/calling the externality directly — generalizing the existing `Logger`-injection convention to every externality category. Decision checklist: inject when (a) a host app embedding the engine might need to swap the real implementation, or (b) a real call is awkward/slow/impossible to exercise directly in a test.
   - **Full taxonomy** (per Decision 4), each with its concrete adapter/injection point:
     - `fs` read (`readAndParseTokenFile` in `read.ts`, `scanTokenDirectory`/`collectJsonFiles` in `scan.ts`, `loadConfig` in `config.ts`) and write (`writeAndSerializeTokenFile` in `write.ts`, `runInitConfig` in `scripts/init-config.ts`) — real defaults from `apps/web-app/lib/platform/node-fs.ts`.
     - `fetch` (`useSaveTokenEdits.ts`) — real default (`fetch`) declared inline at its own call site (single call site; no adapter file, per FR-01).
     - `process.exit` / `console.*` (the fatal-startup-exit path) — isolated in `apps/web-app/lib/fatal-startup-error.ts`'s `exitOnFatalStartupError`, reached only via `instrumentation.ts`'s `register()` dynamically importing it (preserves the existing Edge-Runtime-safety Architecture Decision — note explicitly that the real isolation point is this file, not `instrumentation.ts` itself, correcting an assumption an earlier draft of this feature made before that separate fix had landed).
     - `process.env` (`NEXT_RUNTIME` check) — read once in `instrumentation.ts`'s `register()`, the composition root, and passed into the injectable `runRegister(deps)` core as a `getNextRuntime()` dependency.
     - **Currently-unused categories, named explicitly**: `Date.now()`/`new Date()`, `Math.random()`, `crypto.randomUUID()`/`crypto.getRandomValues()`, `setTimeout`/`setInterval` — "no current call site; the same injection requirement applies the moment one is introduced, enforced by the ESLint rules below rather than left to reviewer memory."
   - **Testing-convention change**: a function with an injected I/O/platform dependency is tested by passing a mock/fake implementation through that parameter — a real fixture (temp directory, real network call, real clock) is no longer the default testing approach for these, superseding this repo's prior real-temp-dir convention. Mocks are hand-rolled per-file (no shared test-utility module, no mocking library), mirroring the existing `fakeLogger()` pattern.
   - Cross-reference this section from the Tech Stack section's existing Testing line (the one describing the `node:test`/Vitest split).

3. **Update the Architecture Decisions table's 2026-07-25 Route-Handler-split row** (Rationale currently ends "...Directly relevant to the open 'inject dependencies by default' backlog item"). Change to "...Directly relevant to, and generalized by, the Inject Dependencies by Default feature" (leave the Feature-column link as-is for now; `/sdd-archive` will add this feature's own new rows and can correct any residual wording then — this edit only closes the "open backlog item" reference, which is now stale).

### Verification
- `pnpm --filter web-app exec tsc --noEmit` (or `pnpm build` scoped to `web-app`) — `node-fs.ts` compiles standalone (it has no consumers yet, so nothing else should change behavior).
- `pnpm build && pnpm lint && pnpm test` — full repo-wide run; expect **zero behavior change** anywhere else in the repo (no file besides the two listed above is touched in this phase). This is the baseline all later phases build on.
- Manually re-read the new `docs/project.md` subsection for internal consistency (file paths named actually exist or will per this plan).

### AC coverage
- AC-01 (partial — `node-fs.ts` exists and is positioned as the sole adapter; "no direct call remains outside it" isn't fully true until Phase 3, since `init-config.ts` isn't touched yet).
- AC-10 (doc subsection written; Tech Stack cross-reference and Architecture Decisions row done; full accuracy finalized end of Phase 4).

---

## Phase 2: `fs` Injection — `read.ts`, `scan.ts`, `write.ts`, `config.ts`

**Goal**: Wire the Phase 1 adapter into every `read`/`write`/`scan`/`config` fs call site, add the missing `write.test.ts`, and rewrite `read.test.ts`/`scan.test.ts`/`config.test.ts` from real-temp-dir to mocked-fs.

**Depends on**: Phase 1 (`lib/platform/node-fs.ts` must exist).

**Files**:
- Modified: `apps/web-app/lib/tokens/read.ts`, `apps/web-app/lib/tokens/read.test.ts`
- Modified: `apps/web-app/lib/tokens/scan.ts`, `apps/web-app/lib/tokens/scan.test.ts`
- Modified: `apps/web-app/lib/tokens/write.ts`
- Modified: `apps/web-app/lib/config.ts`, `apps/web-app/lib/config.test.ts`
- New: `apps/web-app/lib/tokens/write.test.ts`

### Steps

1. **`read.ts`**: add a 4th parameter `readFileFn: ReadTextFile = nodeReadFile` (import from `../platform/node-fs.ts`) after `logger`. Replace the direct `readFile(pathResult.value, "utf-8")` call with `readFileFn(pathResult.value)`. Remove the now-unused `import { readFile } from "node:fs/promises"`.

2. **`scan.ts`**: add a `readDirFn: ReadDirEntries = nodeReadDir` parameter to `collectJsonFiles` (threaded through its own recursive call) and to `scanTokenDirectory` (default `nodeReadDir`, positioned after `logger`). Replace `readdir(currentDir, { withFileTypes: true })` with `readDirFn(currentDir)`. **Also** add a `readFileFn: ReadTextFile = nodeReadFile` parameter to `scanTokenDirectory` (positioned after `readDirFn`) and forward it into its `readAndParseTokenFile(rootDir, relativePath, logger, readFileFn)` call — this is necessary so `scan.test.ts` can avoid real fs end-to-end (Flagged Decision 5; not explicit in FR-02's wording but required for AC-07). Remove the now-unused `import { readdir } from "node:fs/promises"`.

   Resulting signature: `scanTokenDirectory(rootDir, logger = consoleLogger, readDirFn = nodeReadDir, readFileFn = nodeReadFile)`.

3. **`write.ts`**: add a 5th parameter `writeFileFn: WriteTextFile = nodeWriteFile` after `logger`. Replace `writeFile(pathResult.value, serialized.value, "utf-8")` with `writeFileFn(pathResult.value, serialized.value)`. Remove the now-unused `import { writeFile } from "node:fs/promises"`.

4. **`config.ts`**: add a 2nd parameter `readFileFn: ReadTextFileSync = nodeReadFileSync` to `loadConfig`, after `cwd`. Replace `readFileSync(configPath, "utf-8")` inside the `fromThrowable` wrapper with `readFileFn(configPath)`. Remove the now-unused `import { readFileSync } from "node:fs"`.

5. **Confirm no other call sites need edits**: `route.ts`'s `GET`/`PATCH`/`patchTokenFile` call `readAndParseTokenFile(...)`/`writeAndSerializeTokenFile(...)` positionally without a 4th/5th argument — since the new parameters are added *after* the existing ones with defaults, these calls keep compiling and behaving identically with zero textual change. Verify this by re-reading `route.ts` after the edits (no edit expected there).

6. **Rewrite `read.test.ts`** (mocked fs, no `mkdtemp`/real temp dir):
   - Drop `chmod`/`mkdtemp`/`rm`/`writeFile`/`tmpdir`/`withTempDir` entirely.
   - Add a small inline helper, e.g.:
     ```ts
     function mockReadFile(files: Record<string, string>): ReadTextFile {
       return async (path) => {
         if (!(path in files)) {
           const error = new Error(`ENOENT: no such file or directory, open '${path}'`) as NodeJS.ErrnoException;
           error.code = "ENOENT";
           throw error;
         }
         return files[path];
       };
     }
     ```
   - Use a fixed virtual root, e.g. `const rootDir = "/virtual/tokens";`, and key the mock's file map by `resolve(rootDir, relativePath)` (import `resolve` from `node:path`) to match exactly what `resolveSafeTokenPath` passes to `readFileFn`.
   - Rebuild each of the 5 existing test cases against the mock:
     - valid file → `mockReadFile({ [resolve(rootDir, "good.json")]: JSON.stringify(...) })`.
     - missing file → key absent from the map (triggers the `ENOENT` branch above) → still asserts `FileNotFoundError`.
     - path traversal → no fs interaction needed at all (fails before `readFileFn` is called); pass any mock, e.g. `mockReadFile({})`.
     - invalid JSON → map contains the bad content string.
     - non-ENOENT failure (`unreadable.json`) → mock throws a plain `Error` with **no** `.code` (or a different code), simulating a permission error without `chmod`; still asserts a logged `UnknownError` via `fakeLogger()` (keep `fakeLogger()` as-is).
   - Every test passes the mock as the 4th positional argument to `readAndParseTokenFile`.

7. **Rewrite `scan.test.ts`** similarly. This one needs a mock `readDirFn` simulating a small in-memory directory tree, since `collectJsonFiles` recurses:
     ```ts
     function mockReadDir(tree: Record<string, DirEntry[]>): ReadDirEntries {
       return async (path) => {
         const entries = tree[path];
         if (entries === undefined) {
           throw new Error(`ENOTDIR or permission denied: ${path}`);
         }
         return entries;
       };
     }
     function dirEntry(name: string, kind: "file" | "dir" | "symlink"): DirEntry {
       return {
         name,
         isDirectory: () => kind === "dir",
         isFile: () => kind === "file",
         isSymbolicLink: () => kind === "symlink",
       };
     }
     ```
   - Build each of the 5 existing scenarios (multi-depth discovery, invalid-file isolation, symlink skip, non-`.json` filter, nested-`readdir`-failure abort) as a `tree` map keyed by absolute directory path (e.g. `"/virtual/tokens"`, `"/virtual/tokens/nested"`), each value a `DirEntry[]`.
   - Pass a `mockReadFile(...)` (same helper shape as `read.test.ts`'s, redefined locally per the no-shared-util convention) as the 4th positional arg to `scanTokenDirectory`, containing the file contents keyed by their resolved absolute paths, so the per-file `readAndParseTokenFile` delegation inside `scanTokenDirectory` also never touches real fs.
   - The "readdir failure" test: instead of `chmod`, have the mock `readDirFn` throw when called with the blocked directory's path.

8. **Rewrite `config.test.ts`** similarly:
   - Drop `mkdtemp`/`rm`/`writeFile`/`tmpdir`/`withTempDir`.
   - `mockReadFileSync(files: Record<string, string>): ReadTextFileSync` returning content or throwing an `ENOENT`-coded error (missing-file case) synchronously.
   - Use a fixed `cwd`, e.g. `"/virtual/project"`, key by `resolve(cwd, CONFIG_FILE_NAME)`.
   - Pass the mock as `loadConfig`'s 2nd positional argument in every test.
   - The "resolves a relative tokensDir to an absolute path" test still asserts against `resolve(cwd, "tokens")` — unaffected by the mock swap, only the read mechanism changes.

9. **Write `apps/web-app/lib/tokens/write.test.ts`** (new file, mocked fs from the start — FR-04/AC-04). Minimum cases:
   - success: mock `writeFileFn` resolves; assert `result.isOk()`.
   - fs write failure: mock `writeFileFn` rejects with an `Error`; assert a logged `UnknownError` via `fakeLogger()` (copy the `fakeLogger()` helper pattern from `read.test.ts`).
   - path traversal: relative path escaping `rootDir`; assert `PathTraversalError` **and** that the mock `writeFileFn` was never called (e.g. a call-counter closure) — proves the short-circuit happens before any write attempt.
   - Use `serializeTokenFile`-compatible minimal `TokenDocument` fixtures consistent with what `token-core`'s existing tests use (check `packages/token-core/*` test fixtures for the minimal valid shape if unsure).

### Verification
- `pnpm --filter web-app test` — all of `read.test.ts`, `scan.test.ts`, `config.test.ts`, `write.test.ts` pass; confirm via `grep -n "mkdtemp\|tmpdir" apps/web-app/lib/tokens/read.test.ts apps/web-app/lib/tokens/scan.test.ts apps/web-app/lib/config.test.ts` that all three return no matches (proves AC-07's real-temp-dir removal for these three files).
- `pnpm build && pnpm lint && pnpm test` full repo-wide run — `route.ts`/`app/**` and anything importing `read.ts`/`scan.ts`/`write.ts`/`config.ts` still compiles with zero edits needed there (confirms step 5).
- Coverage check: each rewritten file still exercises the same success/failure branches as before (Non-Functional Requirement) — diff the list of `test(...)` names before/after per file; every original scenario should have a same-named-or-equivalent mocked counterpart, plus `write.test.ts` is net-new.

### AC coverage
- AC-02 (fully — no direct `node:fs`/`node:fs/promises` call remains in `read.ts`/`scan.ts`/`write.ts`/`config.ts` outside default-parameter wiring).
- AC-04 (fully).
- AC-07 (fully, for `read.test.ts`/`scan.test.ts`/`config.test.ts` — `init-config.test.ts` is Phase 3).

---

## Phase 3: `init-config.ts`'s fs Gap + `instrumentation.ts`'s Injectable-Core Split

**Goal**: Close the last fs gap (`init-config.ts`'s `existsSync`/`writeFileSync`), rewrite `init-config.test.ts` off `mkdtemp`, and split `instrumentation.ts` into an injectable `runRegister(deps)` core plus a thin `register()` wrapper, with a new `instrumentation.test.ts`.

**Depends on**: Phase 1 (adapter module) and Phase 2 (establishes the injection-parameter pattern this phase continues) being complete.

**Files**:
- Modified: `apps/web-app/scripts/init-config.ts`, `apps/web-app/scripts/init-config.test.ts`
- Modified: `apps/web-app/instrumentation.ts`
- New: `apps/web-app/instrumentation.test.ts`

### Steps

1. **`init-config.ts`**: add two fields to `InitConfigIO`:
   ```ts
   export interface InitConfigIO {
     argv: string[];
     cwd: string;
     input: NodeJS.ReadableStream;
     output: NodeJS.WritableStream;
     isTTY: boolean;
     existsSync: ExistsSync;
     writeFileSync: WriteTextFileSync;
   }
   ```
   (import `ExistsSync`/`WriteTextFileSync` from `../lib/platform/node-fs.ts`). Chosen over sibling parameters (`feature.md` left this open) to match the existing io-bundle precedent this file already established. Replace both `existsSync(...)` call sites with `io.existsSync(...)`, and the `writeFileSync(configPath, content, "utf-8")` inside the `fromThrowable` wrapper with `io.writeFileSync(configPath, content)` (drop the now-baked-in `"utf-8"` arg). Remove `import { existsSync, writeFileSync } from "node:fs"`. In `main()`, add `existsSync: nodeExistsSync, writeFileSync: nodeWriteFileSync` to the real `io` object passed to `runInitConfig` (import these two from `../lib/platform/node-fs.ts`).

2. **Rewrite `init-config.test.ts`** off `mkdtemp` (AC-07's remaining file). This is the most involved test rewrite in the plan since `runInitConfig` does both fs reads (`existsSync`, twice) and fs writes (`writeFileSync`), and one test also separately calls `loadConfig()` to prove interop:
   - Drop `mkdtemp`/`rm`/`readFile`/`writeFile`/`tmpdir`/`withTempDir` (the real-fs parts only — the `PassThrough`-based `createIO` stream harness for interactive prompts is unaffected per AC-07's own carve-out).
   - Extend `createIO`'s helper to build an **in-memory store** backing both `existsSync`/`writeFileSync`, e.g.:
     ```ts
     function createIO(overrides: Partial<InitConfigIO> & { cwd: string }): InitConfigIO & {
       input: PassThrough; answer: (line: string) => void; getOutput: () => string;
       files: Map<string, string>;
     } {
       const files = new Map<string, string>();
       const input = new PassThrough();
       const output = new PassThrough();
       let captured = "";
       output.on("data", (chunk: Buffer) => { captured += chunk.toString("utf-8"); });
       return {
         argv: [], input, output, isTTY: true,
         existsSync: (path) => files.has(path),
         writeFileSync: (path, data) => { files.set(path, data); },
         ...overrides,
         answer: (line) => { input.write(`${line}\n`); },
         getOutput: () => captured,
         files,
       };
     }
     ```
   - Pre-seed `io.files.set(join(dir, "dtcg-editor.config.json"), original)` in place of the old `writeFile(configPath, original)` in the "existing config file" tests.
   - Replace every post-write assertion of the shape `JSON.parse(await readFile(join(dir, CONFIG_FILE_NAME), "utf-8"))` with `JSON.parse(io.files.get(join(dir, CONFIG_FILE_NAME)) ?? "")` (synchronous, no `await`/no real fs).
   - The one test that also calls `loadConfig(dir)` to prove read/write interop ("flag-driven mode writes a valid config with zero prompts, and the file loads via `loadConfig()`") is rewritten to pass a `readFileFn` into `loadConfig` backed by the **same** `io.files` map `runInitConfig` just wrote into: `loadConfig(dir, (path) => { const content = io.files.get(path); if (content === undefined) throw enoentError(path); return content; })`. This proves the two functions' schemas interoperate without touching real disk.
   - `dir` in every test can now just be a plain string like `"/virtual/project"` — no `mkdtemp` needed, since nothing touches real fs anymore.

3. **`instrumentation.ts`**: split into an injectable core plus thin wrapper (Flagged Decisions 1–2 — combines FR-05's illustrative "exit function"/"log function" into one `onFatalError` dep, and treats `lib/fatal-startup-error.ts`, not `instrumentation.ts` itself, as where `process.exit`/`console.error` actually live):
   ```ts
   import type { Result } from "neverthrow";
   import type { Config, ConfigError } from "./lib/config.ts";

   export interface RegisterDeps {
     loadConfig: () => Result<Config, ConfigError>;
     setConfigCache: (config: Config) => void;
     getNextRuntime: () => string | undefined;
     onFatalError: (message: string) => Promise<void>;
   }

   export async function runRegister(deps: RegisterDeps): Promise<void> {
     if (deps.getNextRuntime() !== "nodejs") {
       return;
     }

     const result = deps.loadConfig();
     if (result.isErr()) {
       await deps.onFatalError(result.error.message);
       return;
     }
     deps.setConfigCache(result.value);
   }

   export async function register(): Promise<void> {
     const { loadConfig, setConfigCache } = await import("./lib/config.ts");
     return runRegister({
       loadConfig,
       setConfigCache,
       getNextRuntime: () => process.env.NEXT_RUNTIME,
       onFatalError: async (message) => {
         const { exitOnFatalStartupError } = await import("./lib/fatal-startup-error.ts");
         exitOnFatalStartupError(message);
       },
     });
   }
   ```
   Note `process.env.NEXT_RUNTIME` stays a direct reference in `register()`'s own top-level source (unchanged from today) — confirmed safe: the Edge Runtime warning this repo already fixed was specifically about `process.exit`, not `process.env` access, which was never flagged despite being present in this file's source both before and after that fix.

4. **Write `apps/web-app/instrumentation.test.ts`** (new file) exercising `runRegister` directly with fake deps — no real `process.exit`/`process.env`/`console` touched:
   - "returns early without loading config when the runtime is not `nodejs`" — `getNextRuntime: () => "edge"`; assert `loadConfig`/`setConfigCache`/`onFatalError` are all never called (use call-counting fakes).
   - "loads and caches config on success" — `getNextRuntime: () => "nodejs"`, `loadConfig: () => ok(fakeConfig)`; assert `setConfigCache` called once with `fakeConfig`, `onFatalError` never called.
   - "calls `onFatalError` with the error message on failure, does not cache" — `loadConfig: () => err(new ConfigError("boom"))`; assert `onFatalError` called once with `"boom"`, `setConfigCache` never called.
   - `register()` itself is not directly unit-tested, matching the existing precedent that `PATCH`/`main()` thin wrappers aren't directly tested either — only their injectable cores are.

### Verification
- `pnpm --filter web-app test` — `init-config.test.ts` (all 9 existing cases) and new `instrumentation.test.ts` (3 cases) pass.
- `grep -n "mkdtemp\|tmpdir" apps/web-app/scripts/init-config.test.ts` returns no matches.
- `pnpm build` — specifically confirm `next build` still succeeds with no Edge Runtime warning re-emitted for `instrumentation.ts` (the thing the earlier, separate feature fixed) — this is the concrete check that Flagged Decision 2's design choice didn't regress that fix.
- `pnpm build && pnpm lint && pnpm test` full repo-wide run.

### AC coverage
- AC-01 (now fully true — no direct fs call remains anywhere outside `node-fs.ts`'s default-parameter wiring).
- AC-03 (fully).
- AC-05 (fully).
- AC-07 (fully — all four files done).

---

## Phase 4: `useSaveTokenEdits.ts` Fetch Injection

**Goal**: Inject `fetch` into `useSaveTokenEdits`, rewrite its test off `vi.stubGlobal`, and finalize the `docs/project.md` accuracy cross-check deferred from Phase 1.

**Depends on**: Phase 1 (for the doc cross-check; no code dependency on Phases 2–3).

**Files**:
- Modified: `apps/web-app/hooks/useSaveTokenEdits.ts`, `apps/web-app/hooks/useSaveTokenEdits.test.tsx`
- Modified: `docs/project.md` (final accuracy pass only)

### Steps

1. **`useSaveTokenEdits.ts`**: add a `fetchImpl: typeof fetch = fetch` parameter to `useSaveTokenEdits(relativePath, fetchImpl = fetch)`, declared inline (no adapter file, per FR-01's single-call-site rule — this file's own default-parameter declaration is the designated exemption). Replace the internal `await fetch(...)` call with `await fetchImpl(...)`.

2. **Rewrite `useSaveTokenEdits.test.tsx`**: replace every `vi.stubGlobal("fetch", vi.fn()...)` with constructing a `vi.fn()` mock and passing it as `useSaveTokenEdits`'s 2nd argument in `renderHook(() => useSaveTokenEdits("tokens.json", mockFetch))`. Remove the `afterEach(() => vi.unstubAllGlobals())` (no longer needed — nothing is stubbed globally). Each of the 7 existing test cases keeps its exact response-construction logic (`new Response(...)`), only the wiring mechanism changes from global stub to injected parameter. `vi.fn()` remains fine to use here — it's Vitest's own built-in mock function, not a new dependency, same as this file already uses today.

3. **Finalize `docs/project.md`'s Phase-1-written convention subsection**: re-read it now that Phases 2–4 are complete and every named file/injection point in the taxonomy list actually exists as described. Patch any wording drift (e.g. confirm the `fetch` bullet correctly names `useSaveTokenEdits.ts`'s own inline default, confirm the fs bullets correctly name all five now-updated files, confirm the `instrumentation.ts`/`fatal-startup-error.ts` split is described accurately per Phase 3's actual implementation). This closes the Non-Functional Requirement ("no aspirational gap between doc and code") before Phase 5 begins.

### Verification
- `pnpm --filter web-app test` — all 7 `useSaveTokenEdits.test.tsx` cases pass.
- `grep -n "vi.stubGlobal" apps/web-app/hooks/useSaveTokenEdits.test.tsx` returns no matches.
- `pnpm build && pnpm lint && pnpm test` full repo-wide run — this is the last phase before lint enforcement is turned on, so this run is the "already-compliant codebase" baseline Phase 5 assumes.
- Re-read the full new `docs/project.md` subsection end-to-end once more for accuracy per step 3.

### AC coverage
- AC-06 (fully).
- AC-08 (fully).
- AC-10 (fully — doc accuracy finalized).
- AC-11 (repo-wide `build`/`lint`/`test` all green — verified continuously through every phase, formally re-confirmed here as the last pre-enforcement checkpoint).
- AC-12 (no new dependency added in Phases 1–4 — confirm via `git diff` on every `package.json` in the repo showing no changes).

---

## Phase 5: ESLint Enforcement

**Goal**: Add lint rules that turn a direct call to a restricted externality, anywhere outside its designated file, into a lint error — checked against the now-fully-compliant codebase from Phases 1–4, so no suppression comments should be needed anywhere.

**Depends on**: Phases 1–4 complete (every legitimate call site must already be inside its designated file, or this phase's rules will fail on legitimate code).

**Files**:
- Modified: `apps/web-app/eslint.config.mjs` (primary target — see Flagged Decision 3)
- Modified: `eslint.config.mjs` (root — `Date.now`/`Math.random`/`crypto.*` bans only, for `packages/*` coverage)

### Steps

1. **Confirm no new ESLint plugin is needed**: `no-restricted-imports`, `no-restricted-syntax`, and `no-restricted-globals` are all core ESLint rules, already available via the `eslint`/`typescript-eslint` devDependencies both config files already import. No addition to either `package.json`.

2. **In `apps/web-app/eslint.config.mjs`**, add a rules block (inside the existing `rules: { "@typescript-eslint/no-explicit-any": "error" }` object, or a sibling block in the `defineConfig([...])` array) with:
   - **`no-restricted-imports`**: ban `node:fs` and `node:fs/promises`:
     ```js
     "no-restricted-imports": ["error", {
       paths: [
         { name: "node:fs", message: "Import fs bindings only in lib/platform/node-fs.ts; inject them as a parameter elsewhere." },
         { name: "node:fs/promises", message: "Import fs bindings only in lib/platform/node-fs.ts; inject them as a parameter elsewhere." },
       ],
     }],
     ```
   - **`no-restricted-globals`**: ban bare `fetch`:
     ```js
     "no-restricted-globals": ["error", { name: "fetch", message: "Inject fetch as a parameter; see useSaveTokenEdits.ts's own default-parameter declaration." }],
     ```
   - **`no-restricted-syntax`**: ban `process.exit(...)` calls, `console.*` member-call expressions, and `process.env` member access:
     ```js
     "no-restricted-syntax": ["error",
       { selector: "CallExpression[callee.object.name='process'][callee.property.name='exit']", message: "Inject an onFatalError-shaped dependency instead of calling process.exit directly." },
       { selector: "MemberExpression[object.name='console']", message: "Inject a Logger instead of calling console directly." },
       { selector: "MemberExpression[object.name='process'][property.name='env']", message: "Inject an env-lookup dependency instead of reading process.env directly." },
       { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: "Inject a clock dependency instead of calling Date.now() directly." },
       { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "Inject a clock dependency instead of calling new Date() directly." },
       { selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']", message: "Inject a randomness dependency instead of calling Math.random() directly." },
       { selector: "CallExpression[callee.object.name='crypto'][callee.property.name=/^(randomUUID|getRandomValues)$/]", message: "Inject a randomness dependency instead of calling crypto directly." },
     ],
     ```

3. **Add per-file override blocks** (same file, later array entries — mirrors the existing `**/*.cjs` → `no-require-imports: off` precedent) turning specific rules back on/off for designated files:
   - `apps/web-app/lib/platform/node-fs.ts`: `"no-restricted-imports": "off"`.
   - `apps/web-app/hooks/useSaveTokenEdits.ts`: `"no-restricted-globals": "off"` (for its own `fetchImpl: typeof fetch = fetch` default).
   - `apps/web-app/lib/fatal-startup-error.ts`: turn off just the `process.exit` and `console` selectors from `no-restricted-syntax` (Flagged Decision 1 — this, not `instrumentation.ts`, is the real exemption target post-Phase-3-split).
   - `apps/web-app/scripts/init-config.ts`: turn off just the `process.exit` and `console` selectors (its `main()` composition root; `runInitConfig` itself has zero direct calls to either after Phase 3, so a file-level exemption is safe).
   - `apps/web-app/instrumentation.ts`: turn off just the `process.env` selector (its `register()` composition root — see Flagged Decision 4 for why `config.ts` does **not** get this exemption).
   - `packages/errors/src/logger.ts`: turn off just the `console` selector (unchanged pre-existing `consoleLogger` real adapter).

   Overriding "just one selector" from a multi-selector `no-restricted-syntax` array requires repeating the *other* selectors in that file's override block set to the same array minus the exempted one (ESLint doesn't support toggling a single array entry) — i.e. each override's `no-restricted-syntax` value is the full array with only the locally-legitimate selector(s) removed, not a lone `"off"`. Write each override's array explicitly rather than trying to diff against the base array.

4. **In root `eslint.config.mjs`**, add only the four zero-exemption selectors (`Date.now`, `new Date()`, `Math.random`, `crypto.randomUUID`/`getRandomValues`) as a new `no-restricted-syntax` block, applied with no per-file overrides (per FR-09, these have no legitimate call site anywhere in the repo today). Do **not** add the fs/`fetch`/`console`/`process.*` rules here — they would be vacuous for `packages/*` (zero call sites, confirmed by the original audit) and, per Flagged Decision 3, adding them only here would be a no-op for the actual code they need to constrain.

5. **Verify the rules actually bite**, per AC-09's explicit requirement: temporarily introduce a throwaway direct call (e.g. `import { readFile } from "node:fs/promises";` in some arbitrary already-modified file, or a bare `console.log(...)` in a non-exempt file), run `pnpm --filter web-app lint`, confirm it fails with the expected rule ID, then revert the throwaway change before committing. Do this for at least one case from each rule (`no-restricted-imports`, `no-restricted-globals`, each `no-restricted-syntax` selector) to build confidence the selectors are actually matching, not silently no-op'ing on a typo'd AST shape.

### Verification
- `pnpm build && pnpm lint && pnpm test` — full repo-wide run, expect all green with **zero** suppression comments (`eslint-disable`) added anywhere — if one seems necessary, that means Phases 1–4 left a gap; go back and fix the call site's placement rather than suppressing.
- The manual "deliberately break it, confirm lint fails, then revert" check from step 5, performed for every rule.
- `grep -rn "eslint-disable" apps/web-app packages` (excluding pre-existing unrelated disables, if any) to confirm no new suppressions were introduced.

### AC coverage
- AC-09 (fully).

---

## Acceptance Criteria Mapping
| AC | Phase | Verified By |
|----|-------|-------------|
| AC-01 | 1 (created), 3 (fully true) | `node-fs.ts` sole-importer check; repo-wide grep for `node:fs`/`node:fs/promises` outside that file |
| AC-02 | 2 | `read.test.ts`/`scan.test.ts`/`write.test.ts`/`config.test.ts` pass against mocks; no direct fs import remains in those 4 files |
| AC-03 | 3 | `init-config.test.ts` passes; no direct fs call inside `runInitConfig` |
| AC-04 | 2 | New `write.test.ts`, mocked-fs, success + failure + path-traversal cases |
| AC-05 | 3 | New `instrumentation.test.ts`; `runRegister` exercised directly, no real `process.exit`/`process.env` touched |
| AC-06 | 4 | `useSaveTokenEdits.ts`'s `fetchImpl` param; no direct global `fetch` call remains outside its own default |
| AC-07 | 2 (3 files), 3 (`init-config.test.ts`) | `grep -n "mkdtemp\|tmpdir"` returns no matches in any of the 4 files |
| AC-08 | 4 | `grep -n "vi.stubGlobal"` returns no matches in `useSaveTokenEdits.test.tsx` |
| AC-09 | 5 | Manual deliberate-violation-then-revert check per rule; `pnpm lint` clean otherwise |
| AC-10 | 1 (written), 4 (finalized) | Manual re-read of `docs/project.md`'s new subsection against the Phase-4-complete codebase |
| AC-11 | Every phase | `pnpm build && pnpm lint && pnpm test` run at the end of each phase |
| AC-12 | Every phase | `git diff` on every `package.json` shows no new dependency entries |

## Risks & Mitigations
- **Risk**: `scan.ts`'s added `readFileFn` forwarding (Flagged Decision 5) is easy to miss since FR-02 doesn't mention it explicitly. → Mitigation: called out explicitly in Phase 2 step 2 and in the Flagged Decisions section; AC-07's "no mkdtemp in scan.test.ts" check would fail loudly if missed, since `readAndParseTokenFile` would fall back to touching real fs.
- **Risk**: Phase 3's `instrumentation.ts` redesign could silently reintroduce the Edge Runtime warning the earlier feature fixed, if `process.exit`/`console.error` end up referenced as bare values anywhere in `instrumentation.ts`'s own top-level source. → Mitigation: Phase 3's verification explicitly re-checks `pnpm build` output for that warning; the `onFatalError` dependency's real implementation is only ever constructed *inside* a dynamic `import()` callback, never at module top level.
- **Risk**: Phase 5's per-file `no-restricted-syntax` overrides (repeating the full selector array minus one entry) are verbose and easy to get subtly wrong (e.g. forgetting to also exclude a selector, leaving a legitimate call site still flagged). → Mitigation: step 5's "deliberately break it, confirm it fails, then revert" check is required per rule, not optional — this catches both false negatives (rule doesn't fire) and false positives (legitimate site still flagged) before the phase is considered done.
- **Risk**: If Phase 5 runs before Phases 2–4 are fully merged/complete (e.g. parallel dispatch drift), the new lint rules will fail against still-direct call sites that haven't been refactored yet. → Mitigation: this is exactly why Phase 5 is sequenced last and explicitly depends on 1–4; do not dispatch Phase 5 until Phase 4's verification has been confirmed green.

## Estimated Complexity
**Medium-High overall, but each phase individually is Low-Medium.** Phases 1, 2, and 4 are mechanical (add a parameter, swap a call, rewrite a test file against a well-established mock pattern). Phase 3 is the most design-sensitive (the `instrumentation.ts` split has to thread the needle between FR-05's illustrative shape and the pre-existing Edge Runtime constraint — see Flagged Decisions 1–2). Phase 5 is mechanically simple per-rule but has the highest "silent no-op" risk (an ESLint selector that doesn't match anything gives no error either way), which is why its verification step mandates a deliberate-violation check per rule rather than trusting a clean `pnpm lint` run alone.
