# Phase 1 Data Model: Simplify TokenTree / TreeNode Editor Coupling

This feature changes no persisted data shape (DTCG token files are untouched)
and adds no new domain entity — it restructures how existing entities relate.
Documented here are the entities whose _shape or role_ changes, and those
whose role is confirmed unchanged.

## `TokenTypeContract<TValue>` (changed)

Location: `packages/token-type-contract/src/contract.ts`

The pluggable interface a token-type package implements and the host app
consumes generically. Adds one new optional member; every other member is
unchanged.

| Field                    | Type                                                                      | Change    |
| ------------------------ | ------------------------------------------------------------------------- | --------- |
| `type`                   | `string`                                                                  | unchanged |
| `valueSchema`            | `z.ZodType<TValue>`                                                       | unchanged |
| `serializeValue`         | `(value: TValue) => unknown`                                              | unchanged |
| `Editor`                 | `(props: TokenTypeEditorProps<TValue>) => ReactElement`                   | unchanged |
| `editorOptionsSchema`    | `z.ZodType<unknown>` (optional)                                           | unchanged |
| `ValidationErrorHandler` | `(props: { readonly value: unknown }) => ReactElement \| null` (optional) | **new**   |

`ValidationErrorHandler` receives the _raw, possibly-invalid_ value (not `TValue`) — unlike
`Editor`, which only ever receives an already-validated value — because its
purpose is specifically to render something useful (a swatch, an issue list,
or nothing) for a value that may not yet parse. A contract with no `ValidationErrorHandler`
falls back to the plain name/type/value text rendering `TreeNode.tsx` already
uses for every type today.

## `TreeNodeProps` (unchanged shape, changed internals)

Location: `apps/web-app/components/TreeNode.tsx`

No props are added, removed, or retyped. What changes is internal: the
component's logic for resolving an editor, validating a value, and rendering
a read-only/invalid state no longer branches on `effectiveType === "dimension"`
or `effectiveType === "color"` anywhere.

| Field          | Type                               | Change    |
| -------------- | ---------------------------------- | --------- |
| `node`         | `PlainDtcgNode`                    | unchanged |
| `root`         | `PlainDtcgNode`                    | unchanged |
| `pendingEdits` | `ReadonlyMap<string, ClientEdit>`  | unchanged |
| `fieldErrors`  | `ReadonlyMap<string, FieldErrors>` | unchanged |
| `onStageEdit`  | `(path, patch) => void`            | unchanged |
| `onFieldError` | `(path, errors) => void`           | unchanged |

## `PlainDtcgNode` (unchanged)

Location: `apps/web-app/lib/tokens/plain-node.ts`

Already fully generic (discriminated `token`/`group` union with a
precomputed `effectiveType`); no editor concepts leak into it today, and none
are added.

## `TokenEditorExtension` / `ResolvedDtcgEditorConfig` (unchanged)

Location: `apps/web-app/lib/token-editors/types.ts`

The `{ type, editor, editorOptions }` registry entry shape, and the merged
built-in + user-config extension list, are unchanged — dimension and color
already flow through this registry as ordinary entries via
`builtInExtensions`; this feature makes `TreeNode.tsx` actually _rely_ on
that uniformly, rather than bypassing it for two of the entries.

## `ClientEdit` / `DimensionValidationResult` (removed member)

Location: `apps/web-app/lib/tokens/edit-state.ts`

`ClientEdit` is unchanged. `DimensionValidationResult` and the
`validateDimensionValue` function that produces it are **deleted** — superseded
by the existing generic `validateTokenValue(contract, raw): Result<TValue,
TokenTypeValidationError>` from `@dtcg-editor/token-type-contract`, called
with `resolveBuiltInContract("dimension")`'s contract exactly as it already
is for every other built-in type.

## `ColorDisplayInfo` / `describeColorForDisplay` (relocated)

Old location: `apps/web-app/lib/tokens/color-display.ts` (deleted)
New location: `packages/token-type-color/src/components/validation-error-handler.tsx` (as the
implementation backing that package's new `ValidationErrorHandler` contract member)

Shape is preserved internally (still resolves a CSS color string plus a list
of human-readable issue strings from the same `ColorObjectValueSchema` /
`LegacyHexColorValueSchema` / `checkColorValueIssues` / `colorValueToCssColor`
building blocks) but is no longer a standalone type the host app imports —
it becomes a private implementation detail of `packages/token-type-color`'s
`ValidationErrorHandler` component, consistent with Principle II (a token-type package owns
its own components).

## `ColorEditorOptions` / `ColorEditorOptionsSchema` / `defineColorConfig` (relocated)

Old location: `packages/token-type-color/src/color.ts`
New location: `packages/token-type-color/src/configuration.ts`

Per the 2026-08-16 clarification (FR-010/FR-011), these move out of
`color.ts` — which keeps only core value-schema exports
(`ColorValueSchema`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`,
`checkColorValueIssues`, `COLOR_SPACES`/`ColorSpace`) — into a new
`configuration.ts` module. No type or schema shape changes; `configuration.ts`
imports `COLOR_SPACES`/`ColorSpace` from `color.ts` (the one dependency
editor configuration legitimately has on the core value module, since the
color-space allow-list it restricts is a core concept). `token-type.ts`
(the `TokenTypeContract` assembly module) updates its imports accordingly but
is not itself renamed or restructured.

## `packages/token-type-dimension/src/configuration.ts` (new, initially empty)

New location: `packages/token-type-dimension/src/configuration.ts`

Per FR-009/FR-010/FR-011, this module is created even though
`dimensionTokenType` has no editor-specific options today — see research.md's
Decision 6. It has no exports yet; a future dimension-editor option (if one
is ever added) would be declared here rather than in `dimension.ts`.

## Editor package structure (new cross-cutting entity)

Not a data type in the traditional sense — a structural convention this
feature applies to every first-party token-type package
(`packages/token-type-color`, `packages/token-type-dimension`):

| Path                                                     | Contents                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/components/editor.tsx`                              | The package's main `Editor` (`TokenTypeContract.Editor`)                                                              |
| `src/components/validation-error-handler.tsx` (optional) | The package's `ValidationErrorHandler` (`TokenTypeContract.ValidationErrorHandler`), if it has one                    |
| `src/components/*.tsx`                                   | Any further subcomponents either of the above needs — one component per file                                          |
| `src/configuration.ts`                                   | Editor-specific configuration (options type + validation schema), always present, possibly with nothing to export yet |
| `src/<type-name>.ts` (e.g. `color.ts`, `dimension.ts`)   | Core token value type + `valueSchema` + any pure value-level helpers — no editor/config concepts                      |
| `src/token-type.ts`                                      | Assembles the package's `TokenTypeContract` from the above three, unchanged in role                                   |

This convention governs first-party packages only (FR-012); it does not
constrain how a host application organizes an inline custom extension in its
own `dtcg-editor.config.mts`.
