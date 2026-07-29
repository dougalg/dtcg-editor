# Implementation Plan: Config-Driven Token Editor Components

## Overview

Replace `dtcg-editor.config.json` with a single `apps/web-app/dtcg-editor.config.mts` (or `.mjs`) file whose default export is `defineConfig({ tokensDir, extensions })`. `defineConfig` validates the input, merges `extensions` with this repo's built-in editor entries (currently just `DimensionEditor` for `"dimension"`), and returns a fully-resolved config object. `TokenTree.tsx` uses the resolved `extensions` list to pick which React component renders a given token's editor, replacing today's hard-coded `DimensionEditor` import + `"dimension"` string check. `edit-state.ts` and `route.ts` are untouched — only which component *renders* changes, not what's validated/saved.

The central technical problem this plan solves: `extensions` entries carry **live React component references**, which cannot be produced by a server-side `fs`-read-and-parse the way `tokensDir` was — a value loaded that way can never legally reach a Client Component as a prop. So the config file must be resolved via the **same build-time module graph** Turbopack already bundles for both server and client code, not via runtime file I/O. That single design choice (detailed in Architecture Decisions) is what most of the steps below build on.

## Architecture Decisions

- **Config file lives inside `apps/web-app/`, resolved via the build-time module graph, not `process.cwd()`-relative `fs` reads.** Today's `loadConfig(cwd = process.cwd())` re-reads and re-parses the JSON file fresh on every call, from an arbitrary runtime cwd. That model can't carry live component references to the client bundle. The new `dtcg-editor.config.mts`/`.mjs` is imported as an ordinary ES module — once, by Turbopack, into whichever bundles reference it — so both the server startup path and `TokenTree.tsx`'s client bundle get the *same* resolved object. **Trade-off, called out explicitly for review:** config location is now fixed relative to the source tree at build time, not runtime-`cwd`-flexible the way the JSON file was. Given `extensions` inherently requires this, splitting `tokensDir` back onto the old flexible-cwd model would mean two different loading mechanisms for one config file — more complexity for a benefit (runtime cwd flexibility) that Next.js apps in this repo don't currently exercise (`next start` is always run from `apps/web-app/`).
- **Config file is `.mts` only — `.mjs` support dropped, confirmed via Step 1's spike.** The original plan called for an extensionless import (`import dtcgEditorConfig from "../../dtcg-editor.config";`) so bundler resolution could pick whichever of `.mts`/`.mjs` the user created. Spiking this revealed a real conflict: Turbopack's bundler resolves an extensionless specifier fine, but this repo's TypeScript type-check gate (`next build`'s sole type-checking pass, `moduleResolution: "bundler"`) does **not** — confirmed empirically for both a `.mts` and a `.mjs` target, even with `.mts` already in `tsconfig.json`'s `include`. An *explicit*-extension import resolves correctly for both formats individually, but a literal import statement can only ever target one extension, and this repo has no existing mechanism to conditionally pick between two literal targets at build time without adding a pre-build codegen step. Presented to the user as a real trade-off (codegen step vs. single extension); the user chose the simpler path. `apps/web-app/lib/token-editors/user-config.ts` therefore does an ordinary, explicit-extension import — `import dtcgEditorConfig from "../../dtcg-editor.config.mts";` — no exception to this repo's import-extension convention needed after all.
- **`loadConfig` stays synchronous, via a *static* top-level import — reversed mid-implementation after a real bug was found empirically.** The original plan called for `loadConfig` to become async, using a literal dynamic `import()` so a `defineConfig(...)` throw could be caught into a `Result` instead of crashing the process. Implementing that revealed a serious, unrelated problem: Next.js/Turbopack bundles `instrumentation.ts`'s dynamic `import("./lib/config.ts")` and a page/Route Handler's *static* `import ... from "./lib/config.ts"` into **separate chunks**, each with its own copy of the module's top-level state — confirmed by running the real `next dev` and `next start` servers, not just tests: `register()` calling `setConfigCache()` in one chunk was never visible to `getConfig()` in another, so every real request 500'd with `ConfigNotInitializedError`. The *original* (pre-this-feature) code's `getConfig()` had a fallback that silently re-ran `loadConfig()` synchronously on a cache miss — documented as "should be unreachable in normal operation," but it was actually load-bearing all along, silently papering over this exact chunk-splitting behavior. Removing it (as originally planned, believing it dead code) exposed the bug. Fix: `config.ts` imports `./token-editors/user-config.ts` **statically at its own top level** (not via a dynamic import inside `loadConfig`), keeping `loadConfig`/`getConfig`/`RegisterDeps.loadConfig` synchronous exactly as they were before this feature, and restoring `getConfig()`'s fallback (still needed, now understood as *required* rather than defensive dead code). `instrumentation.ts`'s dynamic `import("./lib/config.ts")` still transitively reaches — and can still catch, via `try`/`catch`, per the Step 1 spike's finding — a `defineConfig` throw during that static import's own evaluation, so the graceful-startup-failure behavior is preserved without needing `loadConfig` to be async at all.
- **No injected `importUserConfig` parameter after all.** Follows directly from the above: since the import is static (evaluated once, unconditionally, at module load), there's nothing left to inject — `loadConfig(cwd)` keeps its original single parameter. A malformed config is covered by `define-config.test.ts` instead of `config.test.ts`.
- **The config file must be committed, not gitignored — a second real bug found empirically.** The original plan (mirroring the old JSON file) kept `dtcg-editor.config.mts` gitignored as a machine-specific local file. Testing with it removed showed this breaks `next build`, `vitest`, and `tsc` entirely on a fresh clone or in CI: `TokenTree.tsx`'s import chain (via `user-config.ts`) needs the file to exist just to be *resolved* at build time, regardless of whether any config-reading function is ever called. This is an unavoidable consequence of making `extensions`' component references build-time-resolvable (the whole reason for the static-import design) — a build-time dependency can't also be optional/gitignored. Fixed by committing a real `dtcg-editor.config.mts` with a sensible default (`tokensDir: "../../sample_data"`, pointing at this repo's own committed sample data) and removing it from `.gitignore`. A user changes their own `tokensDir` by editing this committed file directly (or via `init-config`, which now overwrites an always-present file rather than creating a new one).
- **`BUILT_IN_TOKEN_TYPES` is a manually maintained literal tuple, kept honest by a TypeScript mapped type, not fully auto-derived from the registry.** `TokenTypeContract.type` is typed as plain `string` in the published `token-type-contract` package (not a literal), so a literal `TokenType` union can't be mechanically inferred from `dimensionTokenType` without changing that package's public generic signature (out of scope — feature.md says the `TokenTypeEditorProps`/`TokenTypeContract` shape isn't touched). Instead: `apps/web-app/lib/token-editors/built-in.ts` declares `export const BUILT_IN_TOKEN_TYPES = ["dimension"] as const;` and a `Record<TokenType, TokenTypeContract<unknown>>` lookup keyed by that same tuple — adding a new built-in type requires editing both, but the mapped-type requirement means *forgetting* the record entry is a compile error, not a silent drift. This resolves feature.md's open question with a concrete, low-risk mechanism.
- **Heterogeneous editor component typing is handled with one localized, commented cast, not a generic-programming solution.** `TokenEditorExtension.editor` is typed `(props: TokenTypeEditorProps<unknown>) => ReactElement` so extensions for different (eventually) value types can live in one array. Assigning a concretely-typed component (e.g. `DimensionEditor: (props: TokenTypeEditorProps<DimensionValue>) => ReactElement`) into that shape needs an explicit cast at the point it enters the registry — safe because the registry only ever threads `value`/`onChange` through opaquely between the resolved component and `TokenTree.tsx`'s existing `handleValueChange`, never inspecting the value itself. One cast, one comment, in `built-in.ts`, per this repo's convention that type-safety-bypassing code gets an inline justification.
- **`extensions` key name: settled as `extensions`** (feature.md left `extensions`/`plugins` open). No strong reason to prefer `plugins`; `extensions` reads more accurately given entries only ever *add/override rendering*, never load arbitrary new capability.
- **`defineConfig`'s runtime validation reuses Zod for `tokensDir` (the one plain-data field) and hand-rolled `typeof` checks for `extensions` entries** (function/component values can't be expressed as a Zod schema meaningfully). Both funnel into one thrown `DtcgEditorConfigError`, message format mirroring how `loadConfig` today joins multiple Zod issues into one string.
- **No new dependency.** Everything above uses Zod, neverthrow, and TypeScript/Node/Next.js features already in this repo — nothing new to justify under the Minimal Dependencies constraint.
- **AC-03 vs. FR-06, reconciled:** AC-03 requires no `"dimension"` *string-literal* editability check in `TokenTree.tsx`; FR-06 requires `edit-state.ts`'s dimension-specific `validateDimensionValue` to keep gating what's actually savable, unchanged. These aren't in tension once the literal string is replaced with a *symbolic* reference: `TokenTree.tsx` compares `node.effectiveType === dimensionTokenType.type` (imported from `@dtcg-editor/token-type-dimension`) instead of `=== "dimension"`, for the save-eligibility gate — the same source of truth `built-in.ts`'s registry already derives from, not a second hardcoded string.

## Implementation Steps

### Step 1: Spike — validate the build-time resolution mechanism (do this first; everything else depends on it) — ✅ COMPLETE

This was the one genuinely uncertain piece of the design. Findings:

- [x] Extensionless import (`import x from "../dtcg-editor.config";`) resolves fine under Vitest (Vite's resolver) for both a `.mts` and an `.mjs` fixture.
- [x] Under a real `next build` (Turbopack): the bundler itself resolves the extensionless import and compiles successfully — but the `next build`'s "Running TypeScript" phase (this repo's sole type-check gate) fails with `Cannot find module '../../dtcg-editor.config'`, for **both** a `.mts` and a `.mjs` fixture, despite `.mts` already being in `tsconfig.json`'s `include`.
- [x] An **explicit**-extension import (`"../../dtcg-editor.config.mts"` or `"...mjs"`) builds and type-checks cleanly for either format individually.
- **Conclusion**: genuine dual-format (`.mjs`+`.mts`) support via one shared import statement isn't achievable without a pre-build codegen step generating a fixed-extension shim. Presented to the user as a trade-off; **decided: `.mts` only, `.mjs` dropped** (see Architecture Decisions, and the deviation note added to `feature.md`'s FR-01/AC-05). This also means no exception to the repo's explicit-import-extension convention is needed — the config import is just an ordinary explicit `.mts` import now.
- [x] Confirmed a literal dynamic `import("./token-editors/user-config.ts")` (a fixed, known specifier) can be wrapped in `try`/`catch` to catch a module-evaluation-time throw, rather than crashing the process — verified as part of the same spike pass; this part of the design is unaffected by the `.mts`-only decision and proceeds as planned.
- [x] Spike fixtures/modules deleted; worktree confirmed clean before continuing.

### Step 2: New `apps/web-app/lib/token-editors/` module — types, built-ins, `defineConfig`, resolution — ✅ COMPLETE (as planned)

- [ ] `apps/web-app/lib/token-editors/types.ts` — new file:
  ```ts
  export type TokenType = (typeof BUILT_IN_TOKEN_TYPES)[number]; // re-exported from built-in.ts, see below
  export interface TokenFilterMetadata {
    readonly type: TokenType;
  }
  export interface TokenEditorExtension {
    readonly filter: (metadata: TokenFilterMetadata) => boolean;
    readonly editor: (props: TokenTypeEditorProps<unknown>) => ReactElement;
  }
  export interface DtcgEditorUserConfig {
    readonly tokensDir: string;
    readonly extensions?: readonly TokenEditorExtension[];
  }
  export interface ResolvedDtcgEditorConfig {
    readonly tokensDir: string;
    readonly extensions: readonly TokenEditorExtension[]; // user extensions, then built-ins — see FR-04
  }
  ```
  (Actual `TokenType` re-export wired to avoid a circular import with `built-in.ts` — resolve during implementation; the two files are mutually small enough that this is mechanical.)
- [ ] `apps/web-app/lib/token-editors/built-in.ts` — new file. Imports `dimensionTokenType` from `@dtcg-editor/token-type-dimension`. Declares:
  ```ts
  export const BUILT_IN_TOKEN_TYPES = ["dimension"] as const;
  const builtInContractsByType: { readonly [T in TokenType]: TokenTypeContract<unknown> } = {
    dimension: dimensionTokenType as TokenTypeContract<unknown>, // justified cast — see Architecture Decisions
  };
  export const builtInExtensions: readonly TokenEditorExtension[] = BUILT_IN_TOKEN_TYPES.map((type) => ({
    filter: (metadata) => metadata.type === type,
    editor: builtInContractsByType[type].Editor,
  }));
  ```
- [ ] `apps/web-app/lib/token-editors/define-config.ts` — new file. Exports `DtcgEditorConfigError extends Error` and:
  ```ts
  export function defineConfig(userConfig: DtcgEditorUserConfig): ResolvedDtcgEditorConfig {
    // Zod-validate tokensDir (non-empty string); typeof-check each extensions entry's filter/editor;
    // aggregate all violations into one DtcgEditorConfigError, mirroring loadConfig's existing
    // multi-issue-join pattern for ConfigFileSchema today.
    return {
      tokensDir: userConfig.tokensDir,
      extensions: [...(userConfig.extensions ?? []), ...builtInExtensions],
    };
  }
  ```
- [ ] `apps/web-app/lib/token-editors/resolve-editor.ts` — new file:
  ```ts
  export function resolveEditorForType(
    extensions: readonly TokenEditorExtension[],
    type: string,
  ): TokenEditorExtension["editor"] | undefined {
    return extensions.find((entry) => entry.filter({ type: type as TokenType }))?.editor;
  }
  ```
  (`type` comes in as `PlainDtcgNode.effectiveType`, which is `string | undefined` — the cast to `TokenType` here is the one place external, unvalidated type strings meet the built-in literal union; document why it's safe: `filter` predicates only ever compare for equality, so an unrecognized string simply matches nothing, no unsound access occurs.)

### Step 3: The actual config file + its build-time import boundary — ✅ COMPLETE

- [x] `apps/web-app/dtcg-editor.config.mts` — **committed** (not gitignored — see Architecture Decisions), `tokensDir: "../../sample_data"`, `extensions: []`.
- [x] `apps/web-app/lib/token-editors/user-config.ts` — thin one-place re-export so the literal `../../dtcg-editor.config.mts` path string isn't duplicated across every consumer.
- [x] `.gitignore` — removed the old `dtcg-editor.config.json` entry entirely (not replaced — the file is committed now).

### Step 4: `apps/web-app/lib/config.ts` — ✅ COMPLETE (design reversed from original plan — see Architecture Decisions)

- [x] Removed `CONFIG_FILE_NAME`, `ConfigFileSchema`, the `fs`-read/`JSON.parse` chain, and the `ReadTextFileSync`/`nodeReadFileSync` import — no `fs` touched here at all now, so no new `no-restricted-imports` ESLint override needed.
- [x] `dtcgEditorConfig` imported **statically** at this module's top level from `./token-editors/user-config.ts` (not dynamically inside `loadConfig` as originally planned).
- [x] `loadConfig(cwd = process.cwd()): Result<Config, ConfigError>` — stayed **synchronous** (reversed from the original async plan). Always `ok(...)` in practice (the config was already validated by the time this runs), kept `Result`-returning for API consistency and because `getConfig()`'s fallback needs a `Result` to branch on.
- [x] `Config` interface unchanged (`{ readonly tokensDir: string }`).
- [x] `getConfig()`: fallback **restored**, not removed — calls `loadConfig()` on a cache miss (a real, expected case per-chunk, not dead code; see Architecture Decisions).
- [x] `describeCause` unchanged.

### Step 5: `apps/web-app/instrumentation.ts` — ✅ COMPLETE (stayed synchronous — see Architecture Decisions)

- [x] `RegisterDeps.loadConfig` stayed `() => Result<RegisteredConfig, Error>` — unchanged from before this feature, since `config.ts`'s `loadConfig` stayed sync.
- [x] `runRegister`: unchanged (`const result = deps.loadConfig();`, no `await`).
- [x] `register()`: `const { loadConfig, setConfigCache } = await import("./lib/config.ts");` wrapped in `try`/`catch`, routing a caught error into `onFatalError(message)` — this part of the original plan held up: even with `config.ts` back to a static top-level import of the user's config, that static import's evaluation still happens the moment `instrumentation.ts`'s dynamic `import("./lib/config.ts")` runs, so a `defineConfig` throw still rejects that dynamic import and is still caught here. Verified working against the real (not faked) `register()` via a manual Node invocation with a deliberately invalid config — see `impl-summary.md`.

### Step 6: `apps/web-app/scripts/init-config.ts` — ✅ COMPLETE

- [x] JSON-content-generation replaced with `.mts` content generation (`defineConfig({ tokensDir, extensions: [] })`).
- [x] Local `CONFIG_FILE_NAME = "dtcg-editor.config.mts"` constant added (since `config.ts` no longer exports one).
- [x] `TokensDirSchema` extracted from `define-config.ts` and imported here too, so both validate `tokensDir` identically (replaces the old shared-`ConfigFileSchema` precedent).
- [x] `InitConfigIO`/`runInitConfig`'s DI shape unchanged.
- [x] Round-trip-via-`loadConfig()` dropped from the tests (see Step 9) — no longer meaningful once the config file is committed rather than a fresh write into a fake in-memory fs; the generated `.mts` content itself is asserted directly instead.

### Step 7: `apps/web-app/components/TokenTree.tsx` — ✅ COMPLETE (as planned)

- [ ] Remove `import { DimensionEditor } from "@dtcg-editor/token-type-dimension";` and `import type { DimensionValue } from "@dtcg-editor/token-type-dimension";`. Add `import { dimensionTokenType } from "@dtcg-editor/token-type-dimension";` (needed for the symbolic `dimensionTokenType.type` comparison — see Architecture Decisions) and a type-only import of `DimensionValue` if still needed for `currentValue`'s typing (check usage at lines ~104-141 before removing).
- [ ] Add `import dtcgEditorConfig from "../lib/token-editors/user-config.ts";` and `import { resolveEditorForType } from "../lib/token-editors/resolve-editor.ts";`.
- [ ] Replace line 73's `const isDimension = node.effectiveType === "dimension";` with `const isDimension = node.effectiveType === dimensionTokenType.type;` (satisfies AC-03's "no string-literal check" while preserving FR-06's dimension-specific save-gating exactly).
- [ ] Where line 163 currently renders `<DimensionEditor value={currentValue} onChange={handleValueChange} />`, compute `const EditorComponent = canEdit && node.effectiveType !== undefined ? resolveEditorForType(dtcgEditorConfig.extensions, node.effectiveType) : undefined;` earlier in the branch, and render `{EditorComponent !== undefined && <EditorComponent value={currentValue} onChange={handleValueChange} />}` in its place. `currentValue`/`handleValueChange` and everything downstream of them (staged edit shape, `validateDimensionValue` call in `handleValueChange`) are untouched, per FR-06.
- [ ] Everything else in `TokenTree.tsx` (name/description fields, save button, tree recursion) is unaffected.

### Step 8: Lint — ✅ COMPLETE

- [x] `pnpm lint` (repo-wide, via turbo) passes with zero new violations — confirmed expectation held.

### Step 9: Tests — ✅ COMPLETE

- [x] `apps/web-app/lib/config.test.ts` — rewritten for the sync, statically-imported design (no `importUserConfig` param after all — see Architecture Decisions). Covers `tokensDir` resolution relative to a given/default `cwd` against the real committed config's `"../../sample_data"` value.
- [x] `apps/web-app/instrumentation.test.ts` — stayed sync (`ok`/`err`, not `okAsync`/`errAsync`).
- [x] New `apps/web-app/lib/token-editors/define-config.test.ts` — as planned, plus an aggregated-multi-issue-message case.
- [x] New `apps/web-app/lib/token-editors/resolve-editor.test.ts` — as planned.
- [x] New `apps/web-app/components/TokenTree.override.test.tsx` (separate file, not added into `TokenTree.test.tsx` — `vi.mock` is file-scoped, so mixing it in would've mocked the config for every other test in that suite too). Covers AC-02. The existing `TokenTree.test.tsx` AC-01 case needed **no changes at all** — the committed default config (`extensions: []`) merges to exactly the same built-in-only behavior as before.
- [x] `apps/web-app/scripts/init-config.test.ts` — updated for `.mts` output; round-trip-via-`loadConfig()` dropped (content asserted directly instead, per Step 6's note). No `--format mjs` flag (dropped with `.mjs` support generally).
- [x] **Not in the original plan**: `app/api/tokens/route.test.ts` and `app/api/tokens/[...path]/route.test.ts` both broke — their `beforeAll` wrote a `dtcg-editor.config.json` fixture and `process.chdir`'d into a temp dir, relying on `getConfig()`'s old fallback to read it live. Fixed by calling `setConfigCache({ tokensDir })` directly instead (simpler and more direct than round-tripping through a written config file); `process.chdir`/`originalCwd` removed as no longer needed (nothing else in the request-time paths under test reads `process.cwd()`).
- [x] Full acceptance-criteria pass, including a real `pnpm build` **and starting the actual `next dev`/`next start` servers and hitting them with real requests** — not just unit tests — which is how the two real bugs described in Architecture Decisions were actually caught. Unit tests alone did not catch either one.

## Acceptance Criteria Mapping

| AC | Verified By |
| --- | --- |
| AC-01: default behavior unchanged with no `extensions` | `TokenTree.test.tsx` (existing dimension-editable / other-types-read-only case, adapted) |
| AC-02: user-supplied extension overrides built-in editor for `"dimension"` | `TokenTree.test.tsx` (new override case) |
| AC-03: no direct `DimensionEditor` import / no `"dimension"` literal check | Code review of `TokenTree.tsx` diff (Step 7) — not independently unit-testable, verified structurally |
| AC-04: `edit-state.ts`/`route.ts` unmodified | Code review / diff inspection at `/sdd-review` — no test file changes expected in either |
| AC-05: `.mts` config loads (narrowed from dual-format) | Step 1 spike + `config.test.ts`/`init-config.test.ts` |
| AC-06: default-merge gives full built-in coverage | `define-config.test.ts` |
| AC-07: `defineConfig` rejects malformed config with clear error | `define-config.test.ts` |
| AC-08: `init-config.ts` generates the new format | `init-config.test.ts` |

## Risks & Mitigations

- **Risk (materialized, resolved)**: Turbopack's bundler and this repo's TypeScript type-check gate disagreed on extensionless import resolution — confirmed via Step 1's spike. → **Resolution**: dropped `.mjs` support, config is `.mts`-only via an ordinary explicit-extension import; no further mitigation needed. The separate literal-dynamic-`import()`-catching-a-throw mechanism (for `defineConfig` validation failures) was also spiked and confirmed working, unaffected by the extension decision.
- **Risk**: `loadConfig`'s signature change ripples into already-tested code (`instrumentation.ts`, `instrumentation.test.ts`, `config.test.ts`) — a regression here would break startup entirely, not just this feature. → **Mitigation**: Steps 4/5/9 update the dependent code and its tests together, not as an afterthought; run the full `apps/web-app` test suite (not just new tests) before considering this feature done.
- **Risk**: `next build`'s `output: "standalone"` file-tracing (if ever adopted later — not currently used in this repo) could fail to copy a config file resolved via bundler module resolution rather than explicit `fs` access, since it's technically outside the traced dependency graph's usual assumptions. → **Mitigation**: none needed now (speculative, out of scope), but worth a one-line note in `docs/project.md`'s Architecture Decisions log at archive time so a future `output: "standalone"` adoption doesn't get blindsided.
- **Risk**: `vi.mock`-ing `user-config.ts` in `TokenTree.test.tsx` is the first use of Vitest's module-mocking in this repo (existing convention is hand-rolled DI, no mocking). → **Mitigation**: scope its use narrowly to this one import (a component-selection registry, not business logic), and note the precedent explicitly for `/sdd-review` to weigh in on; if it's rejected, the fallback is restructuring `TokenTree.tsx` to accept `extensions` as an injectable prop with a real-module default, mirroring the DI convention used everywhere else in this codebase.

## Estimated Complexity

**Medium-High.** No new dependencies and a small total surface area (one new small module directory, five modified files), but real technical uncertainty in one foundational mechanism (Step 1) that the rest of the plan depends on, plus a genuine async-signature ripple through already-tested startup code. Isolating Step 1 as a standalone spike is what keeps this from being High.
