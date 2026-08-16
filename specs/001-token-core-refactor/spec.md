# Feature Specification: Token-Core Parsing Consolidation & Token-Editor Rename

**Feature Branch**: `worktree-token-core-refactor`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Refactor token-type subpackages. All parsing and type definitions should go into the token-core package, and the token-type-* subpackages are for editor only. Currently token-type-color and token-type-dimension mix parsing/type logic (color.ts, conversion.ts, css-color.ts, dimension.ts, token-type.ts) with editor UI (editor.tsx). token-core already holds core parse/serialize/schema logic (parse.ts, serialize.ts, schema.ts, resolve-type.ts, token-types.ts, types.ts, edit.ts). Move all parsing and type-definition code (Zod value schemas, conversion functions, DTCG-value-specific validation) from token-type-color, token-type-dimension, token-type-contract, and any other token-type-* subpackages into token-core, so the token-type-* subpackages contain only editor UI (editor.tsx and related styles) plus the TokenTypeContract wiring that connects a token-core schema to that Editor. token-core remains React-free; token-type-* packages depend on token-core, never the reverse. This aligns with constitution v2.0.0 (amended just prior to this spec), which redefines Principle II and Principle VII accordingly."

## Clarifications

### Session 2026-08-16

- Q: Should the `token-type-*` packages also be renamed, now that they hold only editor UI? → A: Yes — rename the package family from `token-type-*` to `token-editor-*` (`token-type-color` → `token-editor-color`, `token-type-dimension` → `token-editor-dimension`, `token-type-contract` → `token-editor-contract`), so the package name matches its editor-only scope.

### Session 2026-08-16 (review — post 002-simplify-tree-node)

- Q: 002-simplify-tree-node has since been implemented and merged — does its retrofit of `token-type-color`/`token-type-dimension` already satisfy any part of this spec's scope? → A: Partially, but only the editor-package-structure half. 002 already moved each package's editor UI under `components/` (`components/editor.tsx`, plus `components/validation-error-handler.tsx` for color) and split editor-specific configuration into a dedicated `configuration.ts` (`ColorEditorOptions`/`ColorEditorOptionsSchema`/`defineColorConfig` for color; an initially-empty module for dimension), and added an optional `ValidationErrorHandler` member to `TokenTypeContract`. None of that touched parsing/type-definition code (`color.ts`, `conversion.ts`, `css-color.ts`, `dimension.ts` still live in the `token-type-*` packages, not `token-core`) or the package names — this spec's full scope (FR-001–FR-010: moving parsing into `token-core` and renaming `token-type-*` to `token-editor-*`) remains entirely unbuilt.

### Session 2026-08-16 (validation scope)

- Q: Should the color editor's range-check logic (`checkColorValueIssues` and `COMPONENT_RANGES` in `color.ts` — the out-of-range component warnings, e.g. hue or RGB bounds) move to `token-core` along with the structural schemas, or stay in the editor package? → A: Stay in the editor package (`token-type-color`, renamed `token-editor-color`). This refactor draws a line between two kinds of validation: **structural validation** (does the raw value even parse into a `ColorValue` shape at all — `ColorValueSchema`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`) moves to `token-core`, since it's needed to determine whether a value is a valid token at all. **Data validation** (a structurally-valid value with an out-of-range component, e.g. a hue of 400 — user-recoverable directly in the editor UI) is editor-specific and remains in the `token-type-*`/`token-editor-*` package, not `token-core`.

### Session 2026-08-16 (conversion/utility scope + editor-package organization)

- Q: Should `token-editor-color`'s `conversion.ts` (native `<input type="color">` interop: `srgbHexToColorSpaceComponents`, `colorValueToSrgbHex`) and `css-color.ts` (`colorValueToCssColor`, CSS rendering) move to `token-core` along with the structural schema, or stay in the editor package? → A: Stay in the editor package, alongside the range-check logic from the prior session. Only structural validation and its resulting type definitions (`ColorValueSchema`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`, and their derived types/constants — `ColorSpace`, `ColorComponent`, `ColorObjectValue`, `ColorValue`, `COLOR_SPACES`) move to `token-core`. `token-core`'s scope for this feature narrows to DTCG-compliance parsing/structural-validation — conversion (native-widget interop) and CSS-rendering are editor-specific presentation/interop concerns that no headless DTCG consumer (validator, CLI, server-side check) needs. `token-core`'s broader internal reorganization beyond this narrowed scope is explicitly out of scope for this feature and will be respecified separately.
- Q: How should `token-editor-color`'s non-component modules (the trimmed range-check module, `conversion.ts`, `css-color.ts`) be organized, now that value-schema code has moved out of the package's `src/` root? → A: Grouped into a dedicated `utils/` subfolder, not left flat in `src/` alongside `components/`, `configuration.ts`, `token-type.ts`, and `index.ts` — so the package's top-level file listing makes its structure (UI, config, contract wiring, value-adjacent utilities) legible at a glance. The range-check module is also renamed from `color.ts` to `range-validation.ts` as part of this move, since after the structural split its name no longer matches its (now much narrower) contents.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Import type-specific parsing without pulling in editor UI (Priority: P1)

As a maintainer building or maintaining a non-UI consumer of a token's value (a headless validator, a future CLI, another package, or a server-side check), I need to import a token type's value schema and structural-validation logic from a single, React-free package, without that import transitively loading any specific type's editor UI, React, or editor-only presentation/interop code (conversion, CSS rendering).

**Why this priority**: This is the core motivation for the refactor. Today, `@dtcg-editor/token-type-color`'s public API bundles parsing (`ColorValueSchema`) together with the React `ColorEditor` component in the same package, so anyone needing only the parsing side still depends on a UI package.

**Independent Test**: Can be fully tested by importing a token type's value schema from `token-core` alone, with no `token-type-*` package present in the dependency tree, and successfully validating a sample value.

**Acceptance Scenarios**:

1. **Given** a raw DTCG token value (e.g. a color or dimension `$value`), **When** a consumer imports that type's value schema from `token-core`, **Then** the value is parsed/validated correctly without importing any `token-type-*` package.
2. **Given** `token-core`'s package dependencies, **When** they are inspected, **Then** no dependency on React or any `token-type-*` package is present.

---

### User Story 2 - Each token-editor package is UI-only, and named to match (Priority: P1)

As a maintainer of a token-type package (e.g. `token-type-color`), I want that package's source to contain only the editor UI (the `Editor` component, its styles, and the wiring that connects it to the type's `token-core` schema) — and I want the package itself renamed to `token-editor-*` (e.g. `token-editor-color`) — so both the package's scope and its name unambiguously say "editor," and it can't accidentally grow parsing logic that duplicates or drifts from `token-core`.

**Why this priority**: Directly resolves the package-boundary conflict this refactor exists to fix. An unambiguous boundary and name prevent drift as more token types are added — 11 more DTCG types are still unbuilt per the project backlog — and prevent a future contributor from assuming a `token-type-*`-named package is still the place for a type's parsing logic.

**Independent Test**: Can be fully tested by auditing each renamed `token-editor-*` package's source directory and confirming every file is either an `Editor` component, its styling, editor-specific configuration, a value-adjacent utility (range/data validation, conversion, CSS rendering — grouped under `utils/`), its own tests, or `TokenTypeContract` wiring — with no standalone structural value-schema module of its own — and confirming no `token-type-*`-named package or reference remains anywhere in the codebase.

**Acceptance Scenarios**:

1. **Given** the renamed `token-editor-color` package's source tree, **When** its files are listed, **Then** only editor-UI, config, `utils/`-grouped value-adjacent utilities (range validation, conversion, CSS rendering), and contract-wiring files remain — only the structural value schema and its derived types have moved to `token-core`.
2. **Given** the renamed `token-editor-dimension` package's source tree, **When** its files are listed, **Then** only editor-UI and contract-wiring files remain — the value schema has moved to `token-core`.
3. **Given** the whole codebase (source, `package.json` files, and configuration), **When** searched for the string `token-type-`, **Then** no matches remain outside historical records (e.g. archived spec documents), confirming the rename is complete.

---

### User Story 3 - Existing app behavior is unchanged (Priority: P1)

As a user of the dtcg-editor web app, I want the token tree, color editor, dimension editor, and value validation/display behavior to work exactly as before, so this internal reorganization is invisible to me.

**Why this priority**: This is a pure refactor with zero intended behavior change; any observable difference (build failure, editor regression, changed validation message) is a defect, not an acceptable trade-off. It is P1 alongside the two stories above — none of the three is optional for this refactor to be considered done.

**Independent Test**: Can be fully tested by running the existing web-app test suite (unit and accessibility) unchanged and confirming it still passes, with only internal import paths having moved.

**Acceptance Scenarios**:

1. **Given** the web app's existing color and dimension editing flows, **When** exercised after the refactor, **Then** they behave identically to before (same validation errors, same rendered values, same CSS output).
2. **Given** the existing automated test suite (unit + accessibility) for `token-core`, `token-type-color`, `token-type-dimension`, `token-type-contract`, and `apps/web-app`, **When** run after the refactor, **Then** every test that existed before still passes, moved to its new location where applicable.

---

### Edge Cases

- What happens to a token type's editor-specific configuration schema (e.g. the schema validating the `editorOptions` a host app supplies for that type's Editor)? It configures UI behavior, not the token's `$value` shape, so it stays with the Editor in the `token-type-*` package rather than moving to `token-core` — as of 002-simplify-tree-node, it already lives in that package's dedicated `configuration.ts` module (e.g. `ColorEditorOptions`), separate from the value-schema module; this refactor leaves that placement unchanged.
- What happens to a token type's data/range validation (e.g. `checkColorValueIssues` and `COMPONENT_RANGES` in `token-type-color`, which flag a structurally-valid value with an out-of-range component such as a hue outside `[0, 360)`)? It stays in the `token-type-*`/`token-editor-*` package, not `token-core`. Unlike structural validation (does the value parse into the type's shape at all), a range issue is user-recoverable directly in the editor UI, and the editor is the only place that renders it — so it is treated as editor behavior, not part of `token-core`'s parse/validate contract.
- What happens to a token type's conversion/rendering utilities (e.g. `conversion.ts`'s `srgbHexToColorSpaceComponents`/`colorValueToSrgbHex`, which interop with a native `<input type="color">` widget, and `css-color.ts`'s `colorValueToCssColor`, which renders a `ColorValue` as a CSS color string for the editor's swatch)? Both stay in `token-editor-color`, not `token-core`. Neither is structural validation or DTCG-compliance parsing — they exist to serve the Editor's own rendering and browser-widget interop, which no headless consumer (validator, CLI, server-side check) needs.
- How are `token-editor-color`'s remaining non-component modules organized, now that the structural value schema has moved out? They are grouped under a dedicated `utils/` subfolder (`utils/range-validation.ts` — renamed from `color.ts`, holding `checkColorValueIssues`/`COMPONENT_RANGES` — plus `utils/conversion.ts` and `utils/css-color.ts`, each with their tests), rather than left flat alongside `components/`, `configuration.ts`, `token-type.ts`, and `index.ts` at the package's `src/` root.
- What happens to `token-type-contract`'s existing generic value-validation dispatcher? It works against any `TokenTypeContract` and holds no type-specific parsing logic of its own, so it is unaffected by this refactor and stays where it is.
- What happens to existing code comments/tests in `token-core` that assert it "must not depend on `token-type-color`"? They become obsolete once that type's parsing lives in `token-core` itself, and must be updated to no longer reference a constraint that no longer applies in that form.
- How does a consumer that currently imports a parsing function or type directly from a `token-type-*` package (rather than just the wired contract object) find it after the move? It now imports that schema/type/function directly from `token-core` instead.
- What happens to the exported `TokenTypeContract` TypeScript interface name once the package implementing it is renamed `token-editor-contract`? The interface name itself is unaffected by the package rename — only package names change, not exported type names.
- What happens to references to the old `token-type-*` names outside application source code — e.g. the project's own constitution, which names these packages explicitly? Those governance references must be updated to the new `token-editor-*` names as a separate, matching wording change, tracked outside this spec's own requirements since the constitution is a distinct governance artifact with its own amendment process.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `token-core` MUST be the single source of truth for every DTCG token type's value schema, its derived type definitions, and structural-validation logic (does a raw value parse into the type's shape at all) — the DTCG-spec-compliance parsing surface. This is the sole scope of what moves into `token-core` for this feature; conversion/native-widget-interop logic, CSS-rendering logic, and data/range validation of an already-structurally-valid value (e.g. `conversion.ts`, `css-color.ts`, `checkColorValueIssues`/`COMPONENT_RANGES`) are explicitly out of scope for this move — see FR-003. `token-core`'s broader internal (re)organization beyond this narrowed scope is deferred to a future respecification, out of scope here.
- **FR-002**: `token-core` MUST remain free of any React import and free of any dependency on a `token-type-*` package, for both its existing and its newly-moved code.
- **FR-003**: Each `token-type-*` package (`token-type-color`, `token-type-dimension`, and any future ones — renamed to the `token-editor-*` family per FR-010) MUST contain only its `Editor` UI component and any subcomponents (already organized under `components/`, per 002-simplify-tree-node), editor-specific configuration (already organized in `configuration.ts`, per 002-simplify-tree-node), its value-adjacent utility logic that is not structural validation — data/range validation, conversion/native-widget interop, and CSS rendering (e.g. `checkColorValueIssues`/`COMPONENT_RANGES`, `conversion.ts`, `css-color.ts`) — grouped under a dedicated `utils/` subfolder per FR-011, and the `TokenTypeContract` wiring that connects that Editor to the corresponding `token-core` schema.
- **FR-004**: Each `token-type-*` package's `TokenTypeContract` wiring MUST import that type's value schema and serialization logic directly from `token-core`, not redefine it locally.
- **FR-005**: Every test currently covering moved value-schema/structural-validation logic MUST move alongside its code into `token-core`, continuing to pass with the same coverage. Tests for logic that stays behind (data/range validation, conversion, CSS rendering) move into the package's new `utils/` subfolder alongside their code, unchanged in coverage.
- **FR-006**: Any consumer outside these packages (e.g. the web app) that currently imports a value schema or type directly from a `token-type-*` package MUST be updated to import it from `token-core` instead; consumers that only need the wired `TokenTypeContract` object, the `Editor` component, or a value-adjacent utility that stays behind (conversion, CSS rendering, range validation) continue importing from the `token-type-*` package unchanged (module path updated per FR-011, package name updated per FR-010).
- **FR-007**: The dependency direction MUST remain one-way and verifiable: `token-type-*` packages depend on `token-core`, and `token-core` MUST NOT depend on any `token-type-*` package — including in each package's declared dependencies, not just its import statements.
- **FR-008**: Any third-party dependency used only by logic that moves into `token-core` MUST move with it — declared in `token-core`'s dependencies and removed from the `token-type-*` package's. For this feature's actual scope, this has no effect on `colorjs.io`: it's used only by `conversion.ts`, which stays in `token-editor-color`, so `colorjs.io` stays there too, undisturbed.
- **FR-009**: The full monorepo (every existing automated test across `packages/*` and the web app, plus its build and lint checks) MUST continue to pass after the refactor with no functional change to parsing, validation, conversion, or editor behavior.
- **FR-010**: Every `token-type-*` package (npm package name and directory) MUST be renamed to the corresponding `token-editor-*` name (`token-type-color` → `token-editor-color`, `token-type-dimension` → `token-editor-dimension`, `token-type-contract` → `token-editor-contract`), and every reference to the old name — imports, `package.json` dependency entries, and other source-tracked references — MUST be updated to match, so the package family's name matches its editor-only scope.
- **FR-011**: Each `token-editor-*` package's non-component, non-configuration, non-contract-wiring source files (value-adjacent utilities — range/data validation, conversion, CSS rendering) MUST be grouped under a dedicated `utils/` subfolder rather than left flat at the package's `src/` root, so the package's top-level file listing makes its structure (UI, config, contract wiring, utilities) legible at a glance. For `token-editor-color`, the trimmed range-check module is also renamed from `color.ts` to `range-validation.ts` as part of this move, since its old name no longer matches its narrowed contents.

### Key Entities

- **Token Value Schema**: A schema defining and validating one DTCG token type's `$value` shape (e.g. a color or dimension value), plus its derived type definitions; now defined exclusively in `token-core`. Does NOT include conversion, CSS-rendering, or data/range-validation logic — those stay with the Editor (see below).
- **TokenTypeContract**: The pluggable interface wiring a `token-core` value schema to a `token-type-*` package's `Editor` component (type name, value schema, serializer, editor component, optional editor-config schema, optional `ValidationErrorHandler` for the doesn't-parse-at-all read-only case added by 002-simplify-tree-node); remains defined in `token-type-contract`, implemented by each `token-type-*` package.
- **Token-Editor Package** (formerly "Token-Type Package"): A package such as `token-editor-color` or `token-editor-dimension` (renamed from `token-type-color`/`token-type-dimension`); after this refactor, holds the `Editor` component, its styling, editor-specific config schemas, its `TokenTypeContract` implementation, and its value-adjacent utilities (range/data validation, conversion, CSS rendering) grouped under `utils/`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A developer can import and use any DTCG token type's value schema and structural-validation logic from `token-core` alone, with zero `token-type-*` packages or React present in the dependency tree.
- **SC-002**: Zero value-schema or structural-validation logic (does a raw value parse into the type's shape at all) remains defined inside any `token-type-*` package's source tree after the refactor — 100% of it lives in `token-core`. Data/range validation, conversion/native-widget interop, and CSS rendering (e.g. `checkColorValueIssues`/`COMPONENT_RANGES`, `conversion.ts`, `css-color.ts`) are exempt and remain in the `token-type-*`/`token-editor-*` package, organized under its `utils/` subfolder.
- **SC-003**: 100% of the pre-refactor automated test suite (unit + accessibility) across all affected packages passes after the refactor, with no reduction in test count or coverage for moved logic.
- **SC-004**: The monorepo's build, lint, and test commands all succeed with zero errors after the refactor, with no changes to CI configuration required.
- **SC-005**: Adding a new DTCG token type in the future requires touching exactly two locations — a new value schema/parsing module in `token-core`, and a new `token-editor-*` package for its editor — with no ambiguity about which location owns which responsibility.
- **SC-006**: Zero references to the pre-refactor `token-type-*` package names remain in the codebase (npm package names, directory names, source imports, `package.json` dependency entries) outside of immutable historical records such as archived spec documents.

## Assumptions

- "Parsing and type definitions" is interpreted to include: value schemas, value-shape types, and structural-validation logic (does a raw value parse into the type's shape at all — e.g. `ColorValueSchema`) — `token-core`'s scope for this feature is DTCG-compliance parsing specifically. It explicitly does NOT include: editor-specific configuration schemas that validate how the Editor UI itself is configured; data/range validation of an already-structurally-valid value that is user-recoverable in the Editor UI (e.g. `checkColorValueIssues`/`COMPONENT_RANGES`); or conversion/CSS-rendering logic that serves the Editor's own presentation and native-widget interop (e.g. `conversion.ts`'s `srgbHexToColorSpaceComponents`/`colorValueToSrgbHex`, `css-color.ts`'s `colorValueToCssColor`) — all three stay in the `token-type-*`/`token-editor-*` package, grouped under its `utils/` subfolder (except editor config, which stays in `configuration.ts`).
- `token-core`'s own broader internal file organization (e.g. how its pre-existing generic document/parse modules and its newly-added per-type modules are laid out relative to each other) is explicitly out of scope for this feature. The user has indicated `token-core` will be respecified separately; this feature only adds the narrowly-scoped structural schema/type-definition modules described above to it, without restructuring what's already there.
- `token-type-contract`'s generic contract interface and its type-agnostic value-validation dispatcher are unaffected — they were never type-specific parsing/type definitions in the sense this refactor targets.
- Package *contents* changing is not the only naming change in scope: `token-type-*` packages are renamed to `token-editor-*` (see Clarifications), but the exported `TokenTypeContract` TypeScript interface name is unaffected — only package names change, not exported type names.
- This project's packages are all `"private": true` workspace packages with no external npm consumers, so the rename carries no semver/publishing concerns — every reference to the old name lives inside this repository and can be updated as part of the same change.
- This is a pure internal reorganization: no DTCG-spec behavior, validation outcome, or rendered editor UI changes as a result of this refactor.
- Consumers that currently import a moved schema/type/function directly from a `token-type-*` package (rather than the wired contract object) will have their import statements updated to point at `token-core` as part of this work.
- 002-simplify-tree-node has already been implemented and merged: it retrofitted `token-type-color`/`token-type-dimension` to the `components/` + `configuration.ts` structure this spec references (Edge Cases, FR-003, Key Entities) and added an optional `ValidationErrorHandler` member to `TokenTypeContract`. It did not touch any parsing/type-definition code or package names, so this spec's full remaining scope — moving `color.ts`'s structural schema (and `dimension.ts` wholesale) into `token-core`, grouping `token-editor-color`'s conversion/CSS-rendering/range-validation utilities under `utils/`, and the `token-type-*` → `token-editor-*` rename (FR-001–FR-011) — is entirely unbuilt and unaffected by it.
