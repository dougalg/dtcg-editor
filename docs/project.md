# Project: dtcg-editor

## Mission
dtcg-editor is an open source editor for DTCG (Design Tokens Community Group) design token files, built as a monorepo with two audiences: tool builders and integrators, who embed the core engine and token-type packages into their own design tooling; and design system teams, who use the bundled web app as a ready-made editor for their DTCG token files with minimal configuration.

## Tech Stack
- Language: TypeScript
- Framework: React (used in the UI/token-type packages and the web app; the core engine itself is intended to be an installable module rather than a full web app)
- Package management: pnpm workspaces
- Build orchestration: Turborepo
- Database: none
- ORM: none
- Migrations: none
- Messaging: none
- Testing: Node's built-in test runner (`node:test` + `node:assert/strict`) — no third-party test framework (Vitest/Jest) unless a concrete gap justifies one in a future `plan.md`, per the Minimal Dependencies constraint
- Other: not yet decided

## Architecture
Feature-based modules, organised as a monorepo with three kinds of packages:

1. **Core engine** — reads and renders a UI for editing DTCG token files. This is not a full web app; it is an installable module intended to be wrapped and delivered in different ways for different host applications.
2. **Token-type packages** — subpackages implementing the UI/validation/etc. layer for specific DTCG token types (e.g. `color`, `dimension`). Each token type is its own module/package rather than being handled by shared generic code.
3. **Web app** — composes the core engine and token-type packages into a UI for editing a set of DTCG files, requiring minimal configuration from the user.

Within each package, organise code by feature/domain rather than by technical layer (e.g. a `color` token package owns its own components, validation, and logic together, rather than being split across shared `components/`, `services/`, `validators/` directories).

## Conventions
- **DTCG spec compliance is mandatory.** Token schemas, formats, and validation logic must strictly conform to the Design Tokens Community Group specification. Any deviation from the spec must be flagged explicitly rather than silently implemented.
- **Tests live alongside the code they test.** A `*.test.ts` file sits in the same directory as the module it covers (e.g. `parse.ts` + `parse.test.ts`, `scan.ts` + `scan.test.ts`), not in a separate `test/` directory. `node --test` (no args) discovers all of them recursively from each package's root.
- **Internal relative imports use an explicit source extension (`.ts`/`.tsx`), not extensionless or `.js`.** This lets `node --test` run test files directly against TypeScript source with zero build step (Node strips types natively), while `tsc`'s `rewriteRelativeImportExtensions` (paired with `allowImportingTsExtensions`) still rewrites these to `.js` automatically in any package's compiled `dist/` output for consumers. Applies uniformly to plain library packages (`token-core`) and the Next.js app (`web-app`) alike, since Turbopack also resolves `.ts`-extension specifiers correctly.
- Package naming, REST base path, and authentication conventions: not yet established — no code exists yet. Update this section once the first packages are scaffolded.

## Architectural Constraints

### TypeScript Strictness
All packages in the monorepo must compile under maximally strict TypeScript settings, with no per-package relaxation. This applies uniformly whether a package is publishable (core engine, token-type packages) or internal (web app), since the whole point of the strict-at-the-edges validation model only holds if the type system itself can't be silently defeated.

- Root `tsconfig.base.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`; every package `extends` it and may not loosen any flag.
- `any` is banned (lint-enforced); use `unknown` and narrow. Non-null assertions (`!`) require an inline comment justifying safety.

### Validation at the Edges
Validation happens once, at the true edges of the system — where data enters from outside the monorepo's control: file reads, pasted/uploaded JSON, host-app configuration, or a third-party consumer calling a package's public API directly without going through the standard app contract. Every such edge is a Zod schema producing a typed, trusted internal representation. Once data has entered through one of these edges, it flows through the rest of the system — including across package boundaries within the app — as trusted, typed data; a token-type package receiving a `TokenValue` from the core engine does not re-validate it, because the core engine already validated it at the point that value first entered the system. Re-validating internal, already-typed data is treated as a bug (redundant work, and a sign the trust boundary isn't understood), not a safety net.

- `parseTokenFile(raw: unknown): TokenDocument` (backed by a Zod schema) is the only sanctioned entry point for token JSON; nothing else calls `JSON.parse` on token content.
- A token-type package validates with Zod only at its *own* external edges — e.g. if it exposes a standalone public API a third party could call directly, bypassing the core engine. Values passed to it through the core engine's standard internal contract (already-typed `TokenValue`s) are trusted as-is.

### Error Handling (Result Pattern)
All fallible operations return a `Result<T, E>` (or `ResultAsync<T, E>` for async) from `neverthrow`, composed via `.andThen`/`.map`, rather than throwing. Errors fall into two categories:

- **Named errors** (e.g. `TokenParseError`) — specific to an operation, defined as a discriminated union local to the module that produces them. The caller is expected to branch on and handle these.
- **`UnknownError`** — a single shared type (in a new `@dtcg-editor/errors` package) wrapping anything unexpected surfacing from code outside our control. Not meant to be handled/branched on — only logged and surfaced.

Throwing calls (`JSON.parse`, `fetch`, third-party libraries, etc.) are wrapped into a `Result` exactly once, at the point they're called, using `fromThrowable`/`ResultAsync.fromPromise` — never left to propagate as an exception. Internal functions compose `Result`s end-to-end rather than mixing thrown and returned errors.

An `UnknownError` is logged immediately at creation — inside the same wrap helper that catches the throw — via an injected `Logger` (pino-shaped call signature; currently just `error(obj, msg?)`, with more levels expected later). The logger is passed explicitly as a parameter/context, never a module-level singleton, so it can be swapped in tests and by host apps embedding the core engine; call sites that don't supply one fall back to a `console`-backed default. Named errors are not auto-logged — that's up to whichever code handles them.

Scope: this governs engine/library code only. UI-layer consumption of `Result`s (React hooks, error boundaries) is undefined for now — revisit once component code exists.

### Token-Type Package Contract
The core engine never hard-codes knowledge of specific token types (color, dimension, etc.); every token-type package implements a shared interface that the core engine hosts generically, so adding a new token type never requires changing the core engine. The contract itself must conform to the DTCG token format spec ([designtokens.org/tr/2025.10/format](https://www.designtokens.org/tr/2025.10/format/)); when the spec introduces breaking changes in a future version, the contract evolves in a backwards-compatible way rather than dropping support for tokens written against an earlier spec version.

Parsing and typing — turning raw DTCG JSON into the typed, validated token model — lives in its own package, separate from both the core engine and the token-type packages, and is completely agnostic of any UI or app tooling (no React, no rendering concerns). Its only real dependency is a validation library such as Zod. This is the package that owns `parseTokenFile` and the `TokenDocument`/`TokenValue` types referenced in the validation-at-the-edges constraint; the core engine and token-type packages all depend on it rather than parsing DTCG JSON themselves.

- e.g. `@dtcg-editor/token-core` (or similar) exports `parseTokenFile`, `TokenDocument`, `TokenValue`, and per-spec-type Zod schemas — no React import anywhere in this package.
- `@dtcg-editor/token-type-contract` defines the pluggable interface (`validate`, `serialize`, `render`, etc.) that token-type packages implement and the core engine hosts; this is a separate concern from the spec-parsing package above.

### Minimal Dependencies
Built-ins are the default, not a preference: reach for `Intl`, `structuredClone`, native `fetch`, and similar platform APIs before considering a library, in every package including the web app. A third-party dependency is added only when it is clearly a better alternative to hand-rolling or using a built-in — and "better" must be demonstrated, not asserted: the dependency is named and justified in the feature's plan doc (`plan.md` from the `/sdd-plan` step) before it's added, not introduced ad hoc mid-implementation. No new dependency lands without that paper trail.

- A PR/implementation that adds a new entry to any `package.json` without that dependency having been called out and justified in the corresponding `plan.md` is non-compliant, regardless of how small or popular the library is.
- Justification means stating what built-in or first-party approach was considered and why it falls short (bundle size, correctness, maintenance burden) — not just "it's popular" or "it's convenient."

### Round-Trip Fidelity
Because the DTCG spec permits extensions and tool-specific fields, the `token-core` parse/serialize cycle must be semantically lossless for anything the editor doesn't explicitly modify: parsing a token file into the internal model and re-serializing it, with no edits, must produce output with the same data as the input — including unrecognized fields and extensions — even if formatting, key ordering, or whitespace is normalized in the process. When the user edits a token, only the touched value changes semantically; everything else round-trips as the same data, even fields the internal model doesn't have a typed representation for.

- The internal token model preserves an "unknown/extension bag" per node rather than discarding anything it doesn't recognize during parsing.
- Round-trip tests are mandatory for `token-core`: parse → serialize (no edits) → re-parse and deep-equal against the original parse is a required test case for every DTCG-spec fixture file used in the test suite (comparing parsed data, not raw text, since formatting is allowed to normalize).

## Approved Dependencies
- TypeScript
- React
- Next.js (`apps/web-app`) — chosen over hand-rolling a Node server so Route Handlers + Server Components give typed, colocated server-side `fs` access without a bespoke HTTP layer.
- ESLint + `typescript-eslint` — `tsc` has no flag that bans explicit `any`; a lint tool is required to actually enforce the "no `any`" rule in TypeScript Strictness, not just convenient. `eslint-config-next` is pulled in automatically by Next's scaffolding and kept as the standard pairing for a Next.js app.
- Zod (schema validation/parsing at all package edges)
- neverthrow (`Result`/`ResultAsync` error handling — core, cross-cutting infrastructure per the Error Handling constraint above; justified here rather than per-feature)
- pnpm (package manager / workspaces)
- Turborepo (build orchestration)

Anything outside this list requires a flag before adding.

## Features
- **Configured Token Directory Viewer**: scans a configured directory for DTCG token files, parses each with `token-core`, and lets the user browse valid files as a navigable token tree via the Next.js web app; invalid files are flagged individually without blocking the rest. (`docs/specs-archive/202607251128-configured-token-directory-viewer/`)

## Architecture Decisions

| Date | Decision | Rationale | Feature |
|------|----------|-----------|---------|
| 2026-07-25 | `packages/*` (installable libraries, e.g. `token-core`) vs `apps/*` (deployable apps, e.g. `web-app`) directory split | Matches the "installable module" framing already used for engine/parsing packages vs. the one deployable web app surface | [Configured Token Directory Viewer](docs/specs-archive/202607251128-configured-token-directory-viewer/) |
| 2026-07-25 | Startup config validation runs in Next.js's `instrumentation.ts` `register()` hook, failing fast with `process.exit(1)` on a missing/invalid config | App Router has no traditional server "main" function; `instrumentation.ts` is the idiomatic one-time startup hook (Node runtime only) | [Configured Token Directory Viewer](docs/specs-archive/202607251128-configured-token-directory-viewer/) |
| 2026-07-25 | Route Handlers use standard `Response.json()`, not `NextResponse.json()` | `next/server` has no ESM `exports` map, so `NextResponse` only resolves under Node's legacy CJS resolution — this broke `node --test` importing route modules directly; `Response.json()` is a standard Fetch API method needing no import | [Configured Token Directory Viewer](docs/specs-archive/202607251128-configured-token-directory-viewer/) |
| 2026-07-25 | `token-core`'s Round-Trip Fidelity constraint is only partially applied so far: `serialize()` and round-trip tests are not yet built | This feature is read-only, so there's nothing to round-trip yet; the internal model already preserves an unrecognized-field "extension bag" per node so `serialize()` can be added later without re-touching the parse model — flagged here as a deliberate, temporary gap, not an oversight | [Configured Token Directory Viewer](docs/specs-archive/202607251128-configured-token-directory-viewer/) |

## API
| Method | Path | Description | Auth Required |
|--------|------|-------------|----------------|
| GET | /api/tokens | Lists discovered token files under the configured directory, each marked valid/invalid | No |
| GET | /api/tokens/[...path] | Returns a single parsed token document; 400 (path traversal), 404 (not found), or 422 (parse failure) on error | No |

## Environment & Configuration
| Key | Description | Required | Default |
|-----|-------------|----------|---------|
| `dtcg-editor.config.json` (`tokensDir` field) | Config file (not an env var) read from the process working directory at startup; `tokensDir` is the absolute/relative path to the directory of DTCG token files to serve | Yes | — |
