# Contract: `fontWeightTokenType` (`TokenTypeContract<FontWeightValue>`)

Implements the existing `TokenTypeContract<TValue>` interface from
`packages/token-editor-contract/src/contract.ts` (unmodified by this feature). Field-by-field:

| Field                 | Value                                                             |
| --------------------- | ------------------------------------------------------------------ |
| `type`                | `"fontWeight"`                                                    |
| `valueSchema`         | `FontWeightValueSchema` (imported from `@dtcg-editor/token-core`) |
| `serializeValue`      | `(value) => value` — identity; on-disk and in-memory shapes match |
| `Editor`              | `FontWeightEditor` — controlled number input, `min=1 max=1000 step=1` |
| `Preview`             | `FontWeightPreview` — re-validates `value: unknown` via `FontWeightValueSchema.safeParse`, returns `null` on mismatch, otherwise renders the value as text |
| `ValidationErrorHandler` | omitted — same as `dimensionTokenType`; the host's generic plain-text fallback is sufficient (no richer validation-error UI needed for this type) |
| `editorOptionsSchema`  | omitted — no configurable editor options for this type (matches `dimensionTokenType`) |

## Consumer registration contract

`apps/web-app/lib/token-editors/built-in.ts`:

- `BUILT_IN_TOKEN_TYPES` gains `"fontWeight"`.
- `builtInContractsByType.fontWeight = fontWeightTokenType as unknown as TokenTypeContract<unknown>`,
  with the same erasure-safety comment rationale already given for `dimension`/`color` (this
  registry never inspects `value` itself, only threads it opaquely).

No other public interface is added or changed by this feature.
