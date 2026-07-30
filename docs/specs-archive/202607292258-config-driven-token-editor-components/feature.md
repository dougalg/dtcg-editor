# Feature: Config-Driven Token Editor Components

## Summary

Users who clone and run `apps/web-app` can choose a different interactive editor component for a subset of tokens, without editing this repo's source. A new trusted, first-party `dtcg-editor.config.mts` module replaces today's `dtcg-editor.config.json` (see FR-01 for why `.mjs` support was dropped during planning). The user's config module calls a strongly-typed `defineConfig(...)` helper, which merges their supplied config with this repo's built-in defaults and validates the result, then default-exports it for the app to import directly at startup. The config's `extensions` (working name — see Open Questions) array holds `{ filter, editor }` pairs: `filter` is a function that receives token metadata (for this iteration, `{ type: TokenType }`, mirroring the existing `TokenTypeContract.type`/`PlainDtcgNode.effectiveType` naming) and returns whether the pair applies to a given token; `editor` is the React component to render for matching tokens. `TokenType` is a string-literal union of every token type the built-in registry currently knows about (just `'dimension'` today), not plain `string` — so an `.mts` author gets autocomplete and a compile-time error on a typo'd or nonexistent type name. The editor components already defined in this repo (currently `DimensionEditor` for `"dimension"` tokens) are `defineConfig`'s built-in defaults, merged in automatically so a user who supplies no custom extensions — or only extensions for other types — still gets full coverage of every built-in type, unchanged. This closes the current gap where `TokenTree.tsx` hard-codes `DimensionEditor` via a direct import plus a literal `node.effectiveType === "dimension"` check, which means changing or adding an editor UI today requires forking this repo's source rather than configuring it.

## User Stories

- As a design-system team running `apps/web-app` against our own token files, I want to supply our own editor component for a subset of tokens (e.g. a custom dimension-value picker) via config, so that we don't have to fork and maintain a patched copy of this repo just to change one editing interface.
- As a maintainer of this repo, I want the built-in `DimensionEditor` to keep working with zero config, so existing users see no behavior change when this feature ships.
- As a user authoring a plain `.mjs` config (no TypeScript), I want `defineConfig` to catch a malformed config (missing field, wrong type) at startup with a clear error, since I get no compile-time type-checking pass the way an `.mts` author does.

## Functional Requirements

### FR-01: Config module format migration to `.mts`

Replace `dtcg-editor.config.json` (read via `fs` + `JSON.parse` + Zod, per the Validation-at-the-Edges convention) with a `dtcg-editor.config.mts` module the app imports directly at startup. This is a trusted, first-party module — part of the user's own clone, authored in code, not externally-supplied untrusted data.

**Deviations from original scope, discovered during `/sdd-implement`:**

`dtcg-editor.config.mts` is **committed to the repo** (with a default `tokensDir` pointing at the repo's own `sample_data/`), not gitignored the way `dtcg-editor.config.json` was. Verified by testing with the file removed: `TokenTree.tsx`'s import chain needs it to exist just to resolve at build time, regardless of whether any config-reading function is ever called — so a gitignored, machine-specific config (the old model) breaks `next build`/`vitest`/`tsc` entirely on a fresh clone or in CI. A user changes `tokensDir` by editing this committed file directly, or via `init-config` (which now overwrites an always-present file).

`.mjs` support was dropped. `extensions` (FR-02) carries live React component references, which can only reach the client bundle via a _static_ (build-time-resolved) import — but Turbopack's bundler and this repo's TypeScript type-check gate (`next build`'s sole type-checking pass, per `docs/project.md`'s Architecture Decisions) disagree on extensionless resolution: Turbopack resolves it, `tsc` under `moduleResolution: "bundler"` does not, even for a `.mts` file already in `tsconfig.json`'s `include`. A static import can only ever contain one literal extension, so genuinely supporting either `.mts` or `.mjs` for the same conceptual file would require a separate pre-build codegen step generating a fixed-extension shim. That tradeoff was presented to the user, who chose the simpler single-extension (`.mts`) path over adding that tooling surface.

### FR-02: `defineConfig` — typed authoring, validation, and default-merging in one

The config module's default export is the return value of a `defineConfig(userConfig)` call, not a plain object literal. `defineConfig` does three things:

1. **Type inference for `.mts` authors** — its parameter is strongly typed (`DtcgEditorConfig` or similar), giving IDE autocomplete/type-checking to any user authoring in TypeScript.
2. **Runtime validation for every author, regardless of file extension** — since an `.mjs` config gets no compile-time TypeScript pass at all, `defineConfig` performs structural runtime checks (e.g. `tokensDir` is a non-empty string; each `extensions` entry has a `filter` that is a function and an `editor` that is a function/component) and fails fast with a clear error at startup on a malformed config. This is the functional replacement for the Zod schema the JSON config used to get from `ConfigFileSchema` — Zod itself isn't reused as-is here since it can't meaningfully express a function/component-shaped value, but the "invalid config fails fast at startup with a clear message" guarantee is preserved.
3. **Merging with built-in defaults** — `defineConfig` merges the user-supplied `extensions` list with this repo's built-in default entries (FR-03), producing the final config the app actually uses. A user config that defines no extensions, or only extensions for types other than `"dimension"`, still ends up with the built-in `DimensionEditor` entry present in the merged result — full built-in coverage is guaranteed by `defineConfig` itself, not something the user has to opt into by re-declaring defaults.

### FR-03: Built-in defaults

Every editor component already defined in this repo (currently just `DimensionEditor`, matched on `type === "dimension"`) is one of `defineConfig`'s built-in default `{ filter, editor }` entries. `defineConfig` merges user-supplied entries ahead of built-in defaults in the resolution order (FR-04), so a user-supplied entry for a given type takes precedence, and any type the user doesn't mention still resolves to its built-in default.

### FR-04: Override resolution

When resolving which editor to render for a token, entries are checked in order — user-supplied entries first, then built-in defaults (per FR-03's merge order) — and the first entry whose `filter` returns `true` for that token's metadata is used. This gives user config a well-defined way to override a built-in default (supply an entry matching the same `type`, ordered first) without needing to know about or exclude the built-in entry directly.

### FR-05: Filter metadata field naming and strong typing

`filter` receives `{ type: TokenType }` for this iteration — not `kind`, which the codebase already uses for the unrelated `"token" | "group"` node-kind discriminant (`TokenNode.kind`, `PlainDtcgNode.kind`, etc.). `type` matches the existing `TokenTypeContract.type` field name and mirrors `PlainDtcgNode.effectiveType`'s semantics (the token's resolved DTCG type, which is what today's `node.effectiveType === "dimension"` check in `TokenTree.tsx` already keys off).

`TokenType` must be a string-literal union (e.g. `'dimension' | 'color' | ...`), not plain `string` — enumerating every token type the built-in registry currently knows about (just `'dimension'` for this iteration, since it's still the only concrete token-type package in the repo). This gives an `.mts` config author real compile-time safety when writing a `filter` (a typo'd type name is a type error, not a silently-never-matching predicate). The exact mechanism for keeping `TokenType` in sync with the built-in registry — a manually maintained alias updated whenever a token-type package is added, versus one mechanically derived from the registry's own entries — is deferred to `/sdd-plan`, but whichever is chosen must have a single source of truth; the union and the registry must not be two independently-maintained lists that can drift apart. No metadata fields beyond `type` are in scope for this iteration.

### FR-06: Single call-site scope (UI only)

Only `TokenTree.tsx`'s editor-rendering path is affected by this feature. It stops importing `DimensionEditor` directly and stops using the literal `node.effectiveType === "dimension"` check; instead it resolves which editor to render (if any) via the mechanism in FR-02–FR-04. `edit-state.ts`'s client-side value validation and `route.ts`'s server-side validation/serialization are explicitly unchanged — both continue to hard-code `dimensionTokenType` exactly as they do today. This is a deliberate scope boundary, not an oversight: any editor supplied via config must still produce values matching the existing per-type contract (`TokenTypeEditorProps<TValue>`'s `onChange`), so swapping the rendered component doesn't change what shape of value is accepted on save.

### FR-07: No type exclusion

This feature does not add any way to disable, hide, or make read-only a token type that is currently editable. A token type with no matching `filter` (built-in or user-supplied) keeps behaving exactly as an unsupported type does today (read-only). There is no config option to turn off `DimensionEditor` for `"dimension"` tokens without providing a replacement.

## Acceptance Criteria

- [x] AC-01: With a config module whose `defineConfig(...)` call supplies no `extensions` (or omits the key entirely), `apps/web-app` behaves identically to today — dimension tokens render via `DimensionEditor`, every other type remains read-only.
- [x] AC-02: A user-supplied extension whose `filter` matches `{ type: "dimension" }` and specifies a different editor component causes dimension tokens in the tree to render that component instead of the built-in `DimensionEditor`.
- [x] AC-03: `TokenTree.tsx` contains no direct `DimensionEditor` import and no `"dimension"` string-literal editability check; editor selection for every rendered token goes through the same resolution mechanism (built-in defaults included).
- [x] AC-04: `edit-state.ts` and `route.ts` are unmodified in their handling of `dimensionTokenType` (still hard-coded, per FR-06) — this feature's diff does not touch validation/serialization logic.
- [x] AC-05: A `dtcg-editor.config.mts` module is loaded successfully by the loader, and `instrumentation.ts`/`config.ts`'s `tokensDir`-driven behavior (directory scanning, etc.) is unchanged in outcome from today's JSON-config behavior. (Originally scoped to cover both `.mjs` and `.mts`; narrowed to `.mts` only — see FR-01's deviation note.)
- [x] AC-06: A config that defines an extension only for a non-`"dimension"` type still results in `"dimension"` tokens rendering the built-in `DimensionEditor` — proving `defineConfig`'s default-merge gives full built-in coverage without the user re-declaring it.
- [x] AC-07: `defineConfig` rejects a structurally invalid config (e.g. `tokensDir` missing/empty, an `extensions` entry missing `filter` or `editor`, or one where `filter`/`editor` isn't a function) with a clear startup-time error. (Originally specified "verified via an `.mjs`-authored case" — moot since `.mjs` was dropped; verified via `defineConfig`'s own unit tests plus a real manual `register()` invocation with an invalid config instead, per FR-01's deviation note.)
- [x] AC-08: `apps/web-app/scripts/init-config.ts` (the CLI scaffolder) generates a config module in the new format (calling `defineConfig`), not the old JSON shape.

## Technical Scope

### Affected Modules

- `apps/web-app/components/TokenTree.tsx` — replace the hard-coded import/check with the new resolution mechanism.
- `apps/web-app/lib/config.ts` — config loading changes from JSON+Zod to importing the new `.mjs`/`.mts` module and calling/consuming `defineConfig`'s output.
- `apps/web-app/scripts/init-config.ts` — the CLI scaffolder must generate the new config module format instead of JSON.
- `apps/web-app/instrumentation.ts` — startup config-loading call site; behavior around `loadConfig()`/`setConfigCache()` may need to adapt to the new module shape.

### New Components Required

- `defineConfig` — the typed, validating, defaults-merging config-authoring function (FR-02), plus its `DtcgEditorConfig` (or similarly named) type.
- `TokenType` — the string-literal union of built-in-registry type names (FR-05), and whatever mechanism keeps it in sync with the registry.
- A registry/resolution module (name and exact location deferred to `/sdd-plan`) that: (a) holds the built-in default `{ filter, editor }` entries (FR-03), (b) is what `defineConfig` merges user-supplied entries against, and (c) exposes a lookup used by `TokenTree.tsx` to pick an editor per token (FR-04).
- The new `.mjs`/`.mts` config module format itself (replacing `dtcg-editor.config.json`), including whatever `init-config.ts` now generates.

### Integration Points

- `@dtcg-editor/token-type-contract` — `editor` values conform to the existing `TokenTypeEditorProps<TValue>` shape; this feature does not change that contract.
- `@dtcg-editor/token-type-dimension` — `DimensionEditor` becomes one of `defineConfig`'s built-in default entries rather than a direct `TokenTree.tsx` import.

## Non-Functional Requirements

- **Security**: `filter` functions and `editor` components originate from a trusted, first-party config module that is part of the user's own repo/build — not externally-supplied untrusted data. Validation is handled by `defineConfig`'s own runtime structural checks (FR-02) rather than a Zod schema, since Zod cannot meaningfully express function/component-shaped values; this is a deliberate, feature-specific validation mechanism, not an absence of validation.
- **Performance**: `filter` is evaluated per rendered token row against a small, merged list of extensions; no specific performance target beyond "no perceptible regression" versus today's single string-equality check.
- **Scalability**: Not applicable for this iteration — filter metadata is limited to `{ type: string }`; broader token metadata (path, group, etc.) is explicitly out of scope (see below).

## Out of Scope

- Enabling/disabling token types, or any way to make a currently-editable type read-only via config (see FR-07).
- Changing `edit-state.ts` or `route.ts`'s validation/serialization logic — this feature only affects which UI component renders (FR-06).
- Extracting a separate "core engine" package to host the registry, per `docs/project.md`'s Architecture section — the registry stays inside `apps/web-app` for this feature; that extraction, if ever done, is a separate, larger architectural change.
- Filtering on token metadata beyond `{ type: string }` (e.g. path, group, name pattern) — deferred to future work.
- A second, non-default test editor exercised through the extension mechanism to more rigorously prove genericity beyond the real `DimensionEditor` default — deliberately deferred to the new backlog item "Generic fallback token editor," which will also introduce the first second-editor scenario this repo has.

## Open Questions

- Final key name for the extension list (`extensions`, `plugins`, or something else) — "extensions"/"plugins" were both floated during scoping; not yet decided.
- Exact name/shape of `defineConfig`'s type (`DtcgEditorConfig` used as a placeholder above) — deferred to `/sdd-plan`.
- Whether `defineConfig`'s runtime validation is fully hand-rolled or reuses Zod for just the plain-data fields (`tokensDir`) while hand-rolling the function/component checks — deferred to `/sdd-plan`.
- Mechanism for keeping the `TokenType` string-literal union in sync with the built-in registry as new token-type packages are added (manually maintained alias vs. derived from the registry's own entries) — deferred to `/sdd-plan`, must have a single source of truth either way (FR-05).
- Test depth for proving the resolution mechanism is generic (not secretly special-cased to `"dimension"`) is intentionally limited to the real `DimensionEditor` default plus `defineConfig`'s own merge/validation behavior for this feature; deeper genericity testing (a second real editor exercised end-to-end) is deferred to the new "Generic fallback token editor" backlog item.
