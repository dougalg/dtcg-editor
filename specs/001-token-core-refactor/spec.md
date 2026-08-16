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

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Import type-specific parsing without pulling in editor UI (Priority: P1)

As a maintainer building or maintaining a non-UI consumer of a token's value (a headless validator, a future CLI, another package, or a server-side check), I need to import a token type's value schema and conversion/validation logic from a single, React-free package, without that import transitively loading any specific type's editor UI or React.

**Why this priority**: This is the core motivation for the refactor. Today, `@dtcg-editor/token-type-color`'s public API bundles parsing (`ColorValueSchema`, `checkColorValueIssues`, `colorValueToCssColor`) together with the React `ColorEditor` component in the same package, so anyone needing only the parsing side still depends on a UI package.

**Independent Test**: Can be fully tested by importing a token type's value schema/conversion helpers from `token-core` alone, with no `token-type-*` package present in the dependency tree, and successfully validating/converting a sample value.

**Acceptance Scenarios**:

1. **Given** a raw DTCG token value (e.g. a color or dimension `$value`), **When** a consumer imports that type's validation/conversion logic from `token-core`, **Then** the value is parsed/validated/converted correctly without importing any `token-type-*` package.
2. **Given** `token-core`'s package dependencies, **When** they are inspected, **Then** no dependency on React or any `token-type-*` package is present.

---

### User Story 2 - Each token-editor package is UI-only, and named to match (Priority: P1)

As a maintainer of a token-type package (e.g. `token-type-color`), I want that package's source to contain only the editor UI (the `Editor` component, its styles, and the wiring that connects it to the type's `token-core` schema) — and I want the package itself renamed to `token-editor-*` (e.g. `token-editor-color`) — so both the package's scope and its name unambiguously say "editor," and it can't accidentally grow parsing logic that duplicates or drifts from `token-core`.

**Why this priority**: Directly resolves the package-boundary conflict this refactor exists to fix. An unambiguous boundary and name prevent drift as more token types are added — 11 more DTCG types are still unbuilt per the project backlog — and prevent a future contributor from assuming a `token-type-*`-named package is still the place for a type's parsing logic.

**Independent Test**: Can be fully tested by auditing each renamed `token-editor-*` package's source directory and confirming every file is either an `Editor` component, its styling, its own tests, or `TokenTypeContract` wiring — with no standalone value-schema/conversion/validation module of its own — and confirming no `token-type-*`-named package or reference remains anywhere in the codebase.

**Acceptance Scenarios**:

1. **Given** the renamed `token-editor-color` package's source tree, **When** its files are listed, **Then** only editor-UI and contract-wiring files remain — the value schema, color-space conversions, and CSS-color parsing have moved to `token-core`.
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
- What happens to `token-type-contract`'s existing generic value-validation dispatcher? It works against any `TokenTypeContract` and holds no type-specific parsing logic of its own, so it is unaffected by this refactor and stays where it is.
- What happens to existing code comments/tests in `token-core` that assert it "must not depend on `token-type-color`"? They become obsolete once that type's parsing lives in `token-core` itself, and must be updated to no longer reference a constraint that no longer applies in that form.
- How does a consumer that currently imports a parsing function or type directly from a `token-type-*` package (rather than just the wired contract object) find it after the move? It now imports that schema/type/function directly from `token-core` instead.
- What happens to the exported `TokenTypeContract` TypeScript interface name once the package implementing it is renamed `token-editor-contract`? The interface name itself is unaffected by the package rename — only package names change, not exported type names.
- What happens to references to the old `token-type-*` names outside application source code — e.g. the project's own constitution, which names these packages explicitly? Those governance references must be updated to the new `token-editor-*` names as a separate, matching wording change, tracked outside this spec's own requirements since the constitution is a distinct governance artifact with its own amendment process.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `token-core` MUST be the single source of truth for every DTCG token type's value schema, parsing, conversion, and validation logic, including the logic currently implemented inside `token-type-color` and `token-type-dimension`.
- **FR-002**: `token-core` MUST remain free of any React import and free of any dependency on a `token-type-*` package, for both its existing and its newly-moved code.
- **FR-003**: Each `token-type-*` package (`token-type-color`, `token-type-dimension`, and any future ones — renamed to the `token-editor-*` family per FR-010) MUST contain only its `Editor` UI component and any subcomponents (already organized under `components/`, per 002-simplify-tree-node), editor-specific configuration (already organized in `configuration.ts`, per 002-simplify-tree-node), and the `TokenTypeContract` wiring that connects that Editor to the corresponding `token-core` schema.
- **FR-004**: Each `token-type-*` package's `TokenTypeContract` wiring MUST import that type's value schema and serialization logic directly from `token-core`, not redefine it locally.
- **FR-005**: Every test currently covering moved parsing/conversion/validation logic MUST move alongside its code into `token-core`, continuing to pass with the same coverage.
- **FR-006**: Any consumer outside these packages (e.g. the web app) that currently imports a value schema, type, or parsing/conversion function directly from a `token-type-*` package MUST be updated to import it from `token-core` instead; consumers that only need the wired `TokenTypeContract` object or the `Editor` component continue importing from the `token-type-*` package unchanged.
- **FR-007**: The dependency direction MUST remain one-way and verifiable: `token-type-*` packages depend on `token-core`, and `token-core` MUST NOT depend on any `token-type-*` package — including in each package's declared dependencies, not just its import statements.
- **FR-008**: Any third-party dependency used only by logic that moves into `token-core` (e.g. a color-conversion library) MUST move with it — declared in `token-core`'s dependencies and removed from the `token-type-*` package's.
- **FR-009**: The full monorepo (every existing automated test across `packages/*` and the web app, plus its build and lint checks) MUST continue to pass after the refactor with no functional change to parsing, validation, conversion, or editor behavior.
- **FR-010**: Every `token-type-*` package (npm package name and directory) MUST be renamed to the corresponding `token-editor-*` name (`token-type-color` → `token-editor-color`, `token-type-dimension` → `token-editor-dimension`, `token-type-contract` → `token-editor-contract`), and every reference to the old name — imports, `package.json` dependency entries, and other source-tracked references — MUST be updated to match, so the package family's name matches its editor-only scope.

### Key Entities

- **Token Value Schema**: A schema defining and validating one DTCG token type's `$value` shape (e.g. a color or dimension value); now defined exclusively in `token-core`.
- **TokenTypeContract**: The pluggable interface wiring a `token-core` value schema to a `token-type-*` package's `Editor` component (type name, value schema, serializer, editor component, optional editor-config schema, optional `ValidationErrorHandler` for the doesn't-parse-at-all read-only case added by 002-simplify-tree-node); remains defined in `token-type-contract`, implemented by each `token-type-*` package.
- **Token-Editor Package** (formerly "Token-Type Package"): A package such as `token-editor-color` or `token-editor-dimension` (renamed from `token-type-color`/`token-type-dimension`); after this refactor, holds only the `Editor` component, its styling, editor-specific config schemas, and its `TokenTypeContract` implementation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A developer can import and use any DTCG token type's value schema, parsing, and conversion logic from `token-core` alone, with zero `token-type-*` packages or React present in the dependency tree.
- **SC-002**: Zero parsing, validation, or conversion logic remains defined inside any `token-type-*` package's source tree after the refactor — 100% of it lives in `token-core`.
- **SC-003**: 100% of the pre-refactor automated test suite (unit + accessibility) across all affected packages passes after the refactor, with no reduction in test count or coverage for moved logic.
- **SC-004**: The monorepo's build, lint, and test commands all succeed with zero errors after the refactor, with no changes to CI configuration required.
- **SC-005**: Adding a new DTCG token type in the future requires touching exactly two locations — a new value schema/parsing module in `token-core`, and a new `token-editor-*` package for its editor — with no ambiguity about which location owns which responsibility.
- **SC-006**: Zero references to the pre-refactor `token-type-*` package names remain in the codebase (npm package names, directory names, source imports, `package.json` dependency entries) outside of immutable historical records such as archived spec documents.

## Assumptions

- "Parsing and type definitions" is interpreted to include: value schemas, value-shape types, conversion functions, and value-level validation/issue-checking logic — but NOT editor-specific configuration schemas that validate how the Editor UI itself is configured, which stay with the Editor.
- `token-type-contract`'s generic contract interface and its type-agnostic value-validation dispatcher are unaffected — they were never type-specific parsing/type definitions in the sense this refactor targets.
- Package *contents* changing is not the only naming change in scope: `token-type-*` packages are renamed to `token-editor-*` (see Clarifications), but the exported `TokenTypeContract` TypeScript interface name is unaffected — only package names change, not exported type names.
- This project's packages are all `"private": true` workspace packages with no external npm consumers, so the rename carries no semver/publishing concerns — every reference to the old name lives inside this repository and can be updated as part of the same change.
- This is a pure internal reorganization: no DTCG-spec behavior, validation outcome, or rendered editor UI changes as a result of this refactor.
- Consumers that currently import a moved schema/type/function directly from a `token-type-*` package (rather than the wired contract object) will have their import statements updated to point at `token-core` as part of this work.
- 002-simplify-tree-node has already been implemented and merged: it retrofitted `token-type-color`/`token-type-dimension` to the `components/` + `configuration.ts` structure this spec references (Edge Cases, FR-003, Key Entities) and added an optional `ValidationErrorHandler` member to `TokenTypeContract`. It did not touch any parsing/type-definition code or package names, so this spec's full remaining scope — moving `color.ts`/`conversion.ts`/`css-color.ts`/`dimension.ts`/`token-type.ts`'s parsing logic into `token-core`, and the `token-type-*` → `token-editor-*` rename (FR-001–FR-010) — is entirely unbuilt and unaffected by it.
