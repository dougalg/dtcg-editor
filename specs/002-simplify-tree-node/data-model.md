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

| Field                    | Type                                                                                                                | Change    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------- |
| `type`                   | `string`                                                                                                            | unchanged |
| `valueSchema`            | `z.ZodType<TValue>`                                                                                                 | unchanged |
| `serializeValue`         | `(value: TValue) => unknown`                                                                                        | unchanged |
| `Editor`                 | `(props: TokenTypeEditorProps<TValue>) => ReactElement`                                                             | unchanged |
| `editorOptionsSchema`    | `z.ZodType<unknown>` (optional)                                                                                     | unchanged |
| `ValidationErrorHandler` | `(props: { readonly value: unknown; readonly error: TokenTypeValidationError }) => ReactElement \| null` (optional) | **new**   |

`ValidationErrorHandler` receives the _raw, invalid_ value (not `TValue`) — unlike
`Editor`, which only ever receives an already-validated value — plus `error`,
the concrete `TokenTypeValidationError` `TreeNode.tsx` already produced via
`validateTokenValue` for that value. `TreeNode.tsx` only ever calls
`ValidationErrorHandler` after confirming `validateTokenValue`'s result is an
`err`, so `error` is never wrapped in a `Result` an implementer would need to
unwrap — this component exists purely for the "doesn't parse at all" case.
`TokenTypeValidationError` gains a parallel `issues: readonly
TokenTypeValidationIssue[]` field (each a structured `{ path: readonly
PropertyKey[]; message: string; code: string }`, additive alongside the
existing `message`) for implementers that want a field-level breakdown — an
array of objects rather than pre-formatted strings, so a future consumer can
extend how it uses `code`/`path` without another contract change. A
`z.union`-typed `valueSchema` (e.g. color's) still needs its own
branch-schema validation for good messages, since Zod's union errors report
one top-level `"invalid_union"` issue rather than one per failing field. A
value that parses successfully but that a type wants to flag for some other
reason (e.g. color's in-range check on an otherwise-valid value) is not
`ValidationErrorHandler`'s concern — that display is the `Editor`'s own
responsibility, computed from the already-validated `TValue` it already
receives (see `packages/token-type-color/src/components/editor.tsx`). A
contract with no `ValidationErrorHandler` — or a token with no usable type at
all (see `DefaultValidationErrorHandler` below) — falls back to
`DefaultValidationErrorHandler`, `TreeNode.tsx`'s own component with the same
call shape (`{ value: unknown; error?: TokenTypeValidationError }`, `error`
optional there since it also covers the no-usable-type case, where nothing
was validated).

## `DefaultValidationErrorHandler` (new)

Location: `apps/web-app/components/DefaultValidationErrorHandler.tsx`

Not part of `TokenTypeContract` — a plain `apps/web-app` component, sibling
of the existing `FallbackValueEditor`, that `TreeNode.tsx`'s read-only branch
falls back to whenever a token-type contract has no `ValidationErrorHandler`
of its own, or the token has no usable type to look a contract up for at
all. Fills the same slot a package's own `ValidationErrorHandler` already
fills — extra content rendered _below_ the name/type/value fields, which
`TreeNode.tsx` itself renders unconditionally for every read-only token
regardless of path, exactly as it does today. Renders that error's `message`
as a `role="alert"` line only when `error` is passed; renders `null` when
absent. Resolved once per token, alongside a package's own
`ValidationErrorHandler`, as `contract?.ValidationErrorHandler ??
DefaultValidationErrorHandler` — see plan.md's "TreeNode.tsx dispatch
design" for the full decision table.

| Prop    | Type                                    | Notes                                                                                                     |
| ------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `value` | `unknown`                               | The token's raw value, exactly as `ValidationErrorHandler` receives it                                    |
| `error` | `TokenTypeValidationError \| undefined` | Present only when a recognized type's value failed to validate; absent when there's no usable type at all |

## `TreeNodeProps` (unchanged shape, changed internals)

Location: `apps/web-app/components/TreeNode.tsx`

No props are added, removed, or retyped. What changes is internal: the
component's logic for resolving an editor, validating a value, and rendering
a read-only/invalid state no longer branches on `effectiveType === "dimension"`
or `effectiveType === "color"` anywhere, and (per the 2026-08-16 follow-up)
collapses into an explicit 5-path dispatch instead of a single derived
`canEdit` boolean assembled from several intermediate flags:

1. Valid value, registered editor → render the editor.
2. Valid value, no registered editor → render `FallbackValueEditor`.
3. Recognized type, invalid value, package supplies `ValidationErrorHandler` → render it.
4. Recognized type, invalid value, no package `ValidationErrorHandler` → render `DefaultValidationErrorHandler` (with `error`).
5. No usable type (`effectiveType` absent, or present but not a recognized DTCG type) → render `DefaultValidationErrorHandler` (without `error`).

See plan.md's "TreeNode.tsx dispatch design" for the exact `isUsableType`/
`contract`/`isValid`/`Handler` derivation, and `DefaultValidationErrorHandler`
above for the shared fallback component paths 4–5 both resolve to.

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

## `ColorDisplayInfo` / `describeColorForDisplay` (relocated and split)

Old location: `apps/web-app/lib/tokens/color-display.ts` (deleted)

`describeColorForDisplay` today serves two distinct cases from one function —
(1) the value fails to parse at all (returns no swatch, issues from the parse
failure) and (2) the value parses successfully but has out-of-range
components (returns a swatch plus `checkColorValueIssues`' range-issue
strings). Post-refactor these two cases have two different homes, since
`ValidationErrorHandler` (per its updated contract shape above) is only ever
invoked for case (1):

- Case (1) (doesn't parse) → `packages/token-type-color/src/components/validation-error-handler.tsx`,
  as the implementation backing the package's `ValidationErrorHandler`
  contract member. No swatch is ever rendered here, since `TreeNode.tsx` only
  calls `ValidationErrorHandler` once a value has already failed
  `ColorValueSchema` — `LegacyHexColorValueSchema`/`ColorObjectValueSchema`
  would fail too, consistent with today's behavior in this case.
- Case (2) (parses, but flagged) → `packages/token-type-color/src/components/editor.tsx`,
  where `ColorEditor`'s existing `ObjectColorEditor` already renders its own
  swatch and now also renders `checkColorValueIssues(value)`'s issue list
  directly against its already-validated `ColorValue` prop — no raw/unknown
  value or contract addition needed, since `Editor` already receives `TValue`.

Neither half is a standalone type the host app imports anymore — both become
private implementation details of `packages/token-type-color`'s own
components, consistent with Principle II (a token-type package owns its own
components).

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
