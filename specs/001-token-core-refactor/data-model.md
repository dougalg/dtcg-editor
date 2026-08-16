# Phase 1 Data Model: Token-Core Parsing Consolidation & Token-Editor Rename

This feature reorganizes existing code rather than introducing new runtime data. The "entities" below are architectural — packages and interfaces — not persisted records. Each one documents its post-refactor shape, sourced from the spec's Key Entities section and verified against the actual current source.

## Token Value Schema

A Zod schema defining and validating one DTCG token type's `$value` shape.

| Attribute | Description |
| --- | --- |
| Location (post-refactor) | `token-core/src/{color,dimension}.ts` (one module per type, same filename it had before the move). `dimension.ts` moves wholesale; `color.ts` is a new file in `token-core` containing only the value-schema/validation subset split out of the old `token-type-color/src/color.ts` — see `research.md`. |
| Instances today | `ColorValueSchema` (+ `ColorObjectValueSchema`, `LegacyHexColorValueSchema`), `DimensionValueSchema` |
| Owns | The `z.ZodType<TValue>` schema itself, its derived TypeScript type (`ColorValue`, `DimensionValue`), and pure value-level helpers that operate on it (`checkColorValueIssues`, `colorValueToCssColor`, `colorValueToSrgbHex`, `srgbHexToColorSpaceComponents`) |
| Does NOT own | Editor-specific configuration schemas (`ColorEditorOptions`, `ColorEditorOptionsSchema`, `defineColorConfig`) — those validate how the *Editor* is configured, not the token `$value`, and move into `token-editor-color/src/token-type.ts` instead |
| Depends on | `zod`, and for color: `colorjs.io` (moves with `conversion.ts`) |
| Consumed by | `TokenTypeContract.valueSchema`/`serializeValue` (wired in the corresponding `token-editor-*` package's `token-type.ts`), and any direct non-UI consumer (e.g. `apps/web-app/lib/tokens/color-display.ts`) |

## TokenTypeContract

The pluggable interface wiring a `token-core` value schema to a `token-editor-*` package's `Editor` component.

| Attribute | Description |
| --- | --- |
| Location | `token-editor-contract/src/contract.ts` (unchanged — this package's own content is not affected by the parsing move, only its name) |
| Fields | `type: string`, `valueSchema: z.ZodType<TValue>`, `serializeValue(value): unknown`, `Editor(props): ReactElement`, optional `editorOptionsSchema?: z.ZodType<unknown>` |
| Implementations | `colorTokenType` (in `token-editor-color/src/token-type.ts`), `dimensionTokenType` (in `token-editor-dimension/src/token-type.ts`) |
| Relationship (post-refactor) | `valueSchema`/`serializeValue` now source from `token-core`'s moved schema/module instead of a sibling file in the same package; `Editor` still sources from the same package's own `editor.tsx` |

## Token-Editor Package (formerly "Token-Type Package")

A package such as `token-editor-color` or `token-editor-dimension`.

| Attribute | Description |
| --- | --- |
| Renamed from | `token-type-color` → `token-editor-color`; `token-type-dimension` → `token-editor-dimension`; `token-type-contract` → `token-editor-contract` |
| Contains (post-refactor) | `Editor` component, its styling, editor-specific config schema (if any), and its `TokenTypeContract` implementation only |
| No longer contains | Value schema, value type, conversion functions, or value-level validation logic — all moved to `token-core` |
| Depends on | `token-core` (for the type's value schema/serializer), `token-editor-contract` (for the `TokenTypeContract` interface), `react` |
| Never depended on by | `token-core` (one-way dependency direction, Principle VII) |

## Relationships (dependency graph, post-refactor)

```text
token-editor-contract  (TokenTypeContract interface; react dep, no token-core dep)
        ^
        | implements
        |
token-editor-color, token-editor-dimension  (Editor + wiring; react dep)
        |
        | imports valueSchema/serializeValue from
        v
token-core  (all parsing/type definitions; zod + colorjs.io deps; NO react, NO token-editor-* dep)
        ^
        | imports directly (schema/type/conversion only, not Editor)
        |
apps/web-app  (imports token-core for parsing, token-editor-* for Editor + wired contract)
```
