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
- Testing: not yet decided
- Other: not yet decided

## Architecture
Feature-based modules, organised as a monorepo with three kinds of packages:

1. **Core engine** — reads and renders a UI for editing DTCG token files. This is not a full web app; it is an installable module intended to be wrapped and delivered in different ways for different host applications.
2. **Token-type packages** — subpackages implementing the UI/validation/etc. layer for specific DTCG token types (e.g. `color`, `dimension`). Each token type is its own module/package rather than being handled by shared generic code.
3. **Web app** — composes the core engine and token-type packages into a UI for editing a set of DTCG files, requiring minimal configuration from the user.

Within each package, organise code by feature/domain rather than by technical layer (e.g. a `color` token package owns its own components, validation, and logic together, rather than being split across shared `components/`, `services/`, `validators/` directories).

## Conventions
- **DTCG spec compliance is mandatory.** Token schemas, formats, and validation logic must strictly conform to the Design Tokens Community Group specification. Any deviation from the spec must be flagged explicitly rather than silently implemented.
- Package naming, REST base path, error handling, and authentication conventions: not yet established — no code exists yet. Update this section once the first packages are scaffolded.

## Architectural Constraints

### TypeScript Strictness
All packages in the monorepo must compile under maximally strict TypeScript settings, with no per-package relaxation. This applies uniformly whether a package is publishable (core engine, token-type packages) or internal (web app), since the whole point of the strict-at-the-edges validation model only holds if the type system itself can't be silently defeated.

- Root `tsconfig.base.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`; every package `extends` it and may not loosen any flag.
- `any` is banned (lint-enforced); use `unknown` and narrow. Non-null assertions (`!`) require an inline comment justifying safety.

### Validation at the Edges
Validation happens once, at the true edges of the system — where data enters from outside the monorepo's control: file reads, pasted/uploaded JSON, host-app configuration, or a third-party consumer calling a package's public API directly without going through the standard app contract. Every such edge is a Zod schema producing a typed, trusted internal representation. Once data has entered through one of these edges, it flows through the rest of the system — including across package boundaries within the app — as trusted, typed data; a token-type package receiving a `TokenValue` from the core engine does not re-validate it, because the core engine already validated it at the point that value first entered the system. Re-validating internal, already-typed data is treated as a bug (redundant work, and a sign the trust boundary isn't understood), not a safety net.

- `parseTokenFile(raw: unknown): TokenDocument` (backed by a Zod schema) is the only sanctioned entry point for token JSON; nothing else calls `JSON.parse` on token content.
- A token-type package validates with Zod only at its *own* external edges — e.g. if it exposes a standalone public API a third party could call directly, bypassing the core engine. Values passed to it through the core engine's standard internal contract (already-typed `TokenValue`s) are trusted as-is.

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
No dependencies have been added yet. Proposed baseline (to be confirmed as packages are scaffolded):
- TypeScript
- React
- Zod (schema validation/parsing at all package edges)
- pnpm (package manager / workspaces)
- Turborepo (build orchestration)

Anything outside this list requires a flag before adding.
