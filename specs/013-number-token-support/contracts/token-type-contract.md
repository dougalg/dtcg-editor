# Contract: `numberTokenType` (`TokenTypeContract<NumberValue>`)

Implements the existing `TokenTypeContract<TValue>` interface from
`packages/token-editor-contract/src/contract.ts` (unmodified by this feature). Field-by-field:

| Field                    | Value                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `type`                   | `"number"`                                                                                                   |
| `valueSchema`            | `NumberValueSchema` (imported from `@dtcg-editor/token-core`)                                                |
| `serializeValue`         | `(value) => value` — identity; on-disk and in-memory shapes match                                            |
| `Editor`                 | `NumberEditor` — controlled `<input type="number" step="any">`, no `min`/`max` (spec places none)            |
| `Preview`                | `NumberPreview` — re-validates `value: unknown` via `NumberValueSchema.safeParse`, returns `null` on mismatch, otherwise renders the value as text |
| `ValidationErrorHandler` | omitted — same as `dimensionTokenType`/`fontWeightTokenType`; the host's generic plain-text fallback is sufficient |
| `editorOptionsSchema`    | omitted — no configurable editor options for this type                                                       |

## Consumer registration contract

`apps/web-app/lib/token-editors/built-in.ts`:

- `BUILT_IN_TOKEN_TYPES` gains `"number"`.
- `builtInContractsByType.number = numberTokenType as unknown as TokenTypeContract<unknown>`,
  with the same erasure-safety comment rationale already given for `dimension`/`fontWeight`
  (this registry never inspects `value` itself, only threads it opaquely).

No other public interface is added or changed by this feature.
