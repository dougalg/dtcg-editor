# Phase 1 Data Model: Token-Core Parsing Consolidation & Token-Editor Rename

This feature reorganizes existing code rather than introducing new runtime data. The "entities" below are architectural — packages and interfaces — not persisted records. Each one documents its post-refactor shape, sourced from the spec's Key Entities section and verified against the actual current (post-002-simplify-tree-node) source.

## Token Value Schema

A Zod schema defining and validating one DTCG token type's `$value` shape.

| Attribute | Description |
| --- | --- |
| Location (post-refactor) | `token-core/src/{color,dimension}.ts` (one module per type, same filename it had before the move). Both move wholesale — as of 002-simplify-tree-node, `color.ts` already contains only value-schema/validation code (its editor-config exports were already split into a sibling `configuration.ts` by 002), so no further in-file splitting is needed; see `research.md`. |
| Instances today | `ColorValueSchema` (+ `ColorObjectValueSchema`, `LegacyHexColorValueSchema`), `DimensionValueSchema` |
| Owns | The `z.ZodType<TValue>` schema itself, its derived TypeScript type (`ColorValue`, `DimensionValue`), and pure value-level helpers that operate on it (`checkColorValueIssues`, `colorValueToCssColor`, `colorValueToSrgbHex`, `srgbHexToColorSpaceComponents`) |
| Does NOT own | Editor-specific configuration schemas (`ColorEditorOptions`, `ColorEditorOptionsSchema`, `defineColorConfig`) — those validate how the *Editor* is configured, not the token `$value`, and already live in `token-editor-color/src/configuration.ts` (moved there by 002-simplify-tree-node, unaffected by this refactor) |
| Depends on | `zod`, and for color: `colorjs.io` (moves with `conversion.ts`) |
| Consumed by | `TokenTypeContract.valueSchema`/`serializeValue` (wired in the corresponding `token-editor-*` package's `token-type.ts`), `token-editor-color`'s `components/editor.tsx`/`components/validation-error-handler.tsx` (for rendering/range-checking), and `configuration.ts` (for `COLOR_SPACES`/`ColorSpace`) |

## TokenTypeContract

The pluggable interface wiring a `token-core` value schema to a `token-editor-*` package's `Editor` component.

| Attribute | Description |
| --- | --- |
| Location | `token-editor-contract/src/contract.ts` (unchanged by this refactor's parsing move, aside from the package rename) |
| Fields | `type: string`, `valueSchema: z.ZodType<TValue>`, `serializeValue(value): unknown`, `Editor(props): ReactElement`, optional `editorOptionsSchema?: z.ZodType<unknown>`, optional `ValidationErrorHandler?(props: { value: unknown; error: TokenTypeValidationError }): ReactElement \| null` (added by 002-simplify-tree-node, already present and unaffected by this refactor) |
| Implementations | `colorTokenType` (in `token-editor-color/src/token-type.ts`), `dimensionTokenType` (in `token-editor-dimension/src/token-type.ts`) |
| Relationship (post-refactor) | `valueSchema`/`serializeValue` now source from `token-core`'s moved schema/module instead of a sibling file in the same package; `Editor`/`ValidationErrorHandler` still source from the same package's own `components/` (unaffected by this refactor) |

## Token-Editor Package (formerly "Token-Type Package")

A package such as `token-editor-color` or `token-editor-dimension`.

| Attribute | Description |
| --- | --- |
| Renamed from | `token-type-color` → `token-editor-color`; `token-type-dimension` → `token-editor-dimension`; `token-type-contract` → `token-editor-contract` |
| Contains (post-refactor) | `components/` (`Editor` + styling +, for color, `ValidationErrorHandler`), `configuration.ts` (editor-specific config schema, if any — both already exist per 002-simplify-tree-node), and `token-type.ts` (`TokenTypeContract` implementation) only |
| No longer contains | Value schema, value type, conversion functions, or value-level validation logic — all moved to `token-core` |
| Depends on | `token-core` (for the type's value schema/serializer), `token-editor-contract` (for the `TokenTypeContract` interface), `react` |
| Never depended on by | `token-core` (one-way dependency direction, Principle VII) |

## Relationships (dependency graph, post-refactor)

```text
token-editor-contract  (TokenTypeContract interface; react dep, no token-core dep)
        ^
        | implements
        |
token-editor-color, token-editor-dimension  (components/ + configuration.ts + token-type.ts; react dep)
        |
        | imports valueSchema/serializeValue from
        v
token-core  (all parsing/type definitions; zod + colorjs.io deps; NO react, NO token-editor-* dep)
        ^
        | imports directly (schema/type/conversion only, not Editor)
        |
apps/web-app  (already depends on token-core today, for generic tree-document concerns unrelated to this feature — isDtcgTokenType, DtcgTokenType, resolveEffectiveType, etc., used by TreeTokenNode.tsx/lib/token-editors/types.ts; imports token-editor-* for Editor + wired contract via lib/token-editors/built-in.ts, and token-editor-contract for the generic contract types)
```

Note: unlike the pre-002 version of this data model, `apps/web-app` today has **no** direct import of a token type's *value schema* (`ColorValueSchema`/`DimensionValue`/etc.) from a `token-type-*` package — 002-simplify-tree-node's generic dispatch removed the last of these (`TreeNode.tsx`'s direct color/dimension imports). It does already depend on `@dtcg-editor/token-core` itself, just not for anything this refactor moves. This refactor adds exactly one new `token-core` import to `apps/web-app`: `lib/token-editors/color-editor.test.tsx`'s `ColorValue` type (currently imported from `token-type-color`).
