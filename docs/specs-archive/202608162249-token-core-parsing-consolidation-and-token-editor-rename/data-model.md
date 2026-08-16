# Phase 1 Data Model: Token-Core Parsing Consolidation & Token-Editor Rename

This feature reorganizes existing code rather than introducing new runtime data. The "entities" below are architectural — packages and interfaces — not persisted records. Each one documents its post-refactor shape, sourced from the spec's Key Entities section and verified against the actual current (post-002-simplify-tree-node) source.

## Token Value Schema

A Zod schema defining and validating one DTCG token type's `$value` shape.

| Attribute | Description |
| --- | --- |
| Location (post-refactor) | `token-core/src/{color,dimension}.ts` (one module per type, same filename it had before the move). `dimension.ts` moves wholesale. `color.ts` splits: only its structural exports move to `token-core/src/color.ts`; everything else it used to hold (data/range validation, conversion, CSS rendering) moves instead into `token-editor-color/src/utils/` — see `research.md`'s scoping decisions. |
| Instances today | `ColorValueSchema` (+ `ColorObjectValueSchema`, `LegacyHexColorValueSchema`), `DimensionValueSchema` |
| Owns | The `z.ZodType<TValue>` schema itself and its derived TypeScript type (`ColorValue`, `DimensionValue`) — structural parsing only |
| Does NOT own | Editor-specific configuration schemas (`ColorEditorOptions`, `ColorEditorOptionsSchema`, `defineColorConfig`) — those validate how the *Editor* is configured, not the token `$value`, and already live in `token-editor-color/src/configuration.ts` (moved there by 002-simplify-tree-node, unaffected by this refactor). Also does NOT own: data/range validation (`checkColorValueIssues`, `COMPONENT_RANGES`) — user-recoverable in the Editor UI; or conversion/CSS-rendering (`colorValueToCssColor`, `colorValueToSrgbHex`, `srgbHexToColorSpaceComponents`) — Editor-only presentation/native-widget interop. All three stay in `token-editor-color/src/utils/`, not `token-core` (per two rounds of scoping discussion). |
| Depends on | `zod` only — `colorjs.io` never enters `token-core`; it stays with `conversion.ts` in `token-editor-color/src/utils/`, its only consumer |
| Consumed by | `TokenTypeContract.valueSchema`/`serializeValue` (wired in the corresponding `token-editor-*` package's `token-type.ts`), `token-editor-color`'s `components/editor.tsx`/`components/validation-error-handler.tsx` (for the structural type/schema only; rendering, range-checking, and conversion all source from `token-editor-color`'s own `utils/`, not `token-core`), and `configuration.ts` (for `COLOR_SPACES`/`ColorSpace`) |

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
| Contains (post-refactor) | `components/` (`Editor` + styling +, for color, `ValidationErrorHandler`), `configuration.ts` (editor-specific config schema, if any — both already exist per 002-simplify-tree-node), `token-type.ts` (`TokenTypeContract` implementation), and — for `token-editor-color` only — a `utils/` subfolder holding `range-validation.ts` (`checkColorValueIssues`/`COMPONENT_RANGES`), `conversion.ts`, and `css-color.ts` |
| No longer contains | Structural value schema or value type — moved to `token-core`. Everything else that operates on a value (data/range validation, conversion, CSS rendering) stays, grouped under `utils/` rather than left flat. |
| Depends on | `token-core` (for the type's value schema/serializer), `token-editor-contract` (for the `TokenTypeContract` interface), `react` |
| Never depended on by | `token-core` (one-way dependency direction, Principle VII) |

## Relationships (dependency graph, post-refactor)

```text
token-editor-contract  (TokenTypeContract interface; react dep, no token-core dep)
        ^
        | implements
        |
token-editor-color, token-editor-dimension  (components/ + configuration.ts + token-type.ts + utils/ [color only]; react + colorjs.io [color only] deps)
        |
        | imports valueSchema/serializeValue from
        v
token-core  (structural value schema/type definitions only; zod dep; NO react, NO colorjs.io, NO token-editor-* dep)
        ^
        | imports directly (schema/type only, not Editor, not conversion/CSS/range-validation)
        |
apps/web-app  (already depends on token-core today, for generic tree-document concerns unrelated to this feature — isDtcgTokenType, DtcgTokenType, resolveEffectiveType, etc., used by TreeTokenNode.tsx/lib/token-editors/types.ts; imports token-editor-* for Editor + wired contract via lib/token-editors/built-in.ts, and token-editor-contract for the generic contract types)
```

Note: unlike the pre-002 version of this data model, `apps/web-app` today has **no** direct import of a token type's *value schema* (`ColorValueSchema`/`DimensionValue`/etc.) from a `token-type-*` package — 002-simplify-tree-node's generic dispatch removed the last of these (`TreeNode.tsx`'s direct color/dimension imports). It does already depend on `@dtcg-editor/token-core` itself, just not for anything this refactor moves. This refactor adds exactly one new `token-core` import to `apps/web-app`: `lib/token-editors/color-editor.test.tsx`'s `ColorValue` type (currently imported from `token-type-color`).
