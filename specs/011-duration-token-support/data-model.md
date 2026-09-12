# Data Model: Duration Token Support

## Entity: `DurationValue` (`packages/token-core/src/duration.ts`)

The DTCG Duration type's `$value` shape (designtokens.org/tr/2025.10/format).

| Field   | Type              | Validation                     | Notes                                                          |
| ------- | ----------------- | ------------------------------- | --------------------------------------------------------------- |
| `value` | `number`          | `>= 0` (Zod `.min(0)`)          | A negative duration is meaningless and rejected at the schema.  |
| `unit`  | `"ms"` \| `"s"`   | Zod `z.enum(["ms", "s"])`       | Required even when `value` is `0`, matching `dimension`'s rule. |

```ts
export const DurationValueSchema = z.object({
	value: z.number().min(0),
	unit: z.enum(["ms", "s"]),
});
export type DurationValue = z.infer<typeof DurationValueSchema>;
```

No relationships to other entities beyond the generic `TokenNode`/`$value` slot every DTCG type already fills (`token-core`'s existing `types.ts`); no state transitions (a token value is replaced wholesale on edit, per the existing `TokenTypeEditorProps.onChange` contract).

## Contract: `durationTokenType` (`packages/token-editor-duration/src/token-type.ts`)

Implements `TokenTypeContract<DurationValue>` (`packages/token-editor-contract/src/contract.ts`, unmodified):

- `type: "duration"`
- `valueSchema: DurationValueSchema`
- `serializeValue: (value) => value` (identity — the typed shape is already the on-disk JSON shape, matching `dimension`'s serializer)
- `Editor: DurationEditor`
- `Preview: DurationPreview`

No `ValidationErrorHandler` (same as `dimension` — nothing extra to show beyond the host's generic fallback for a value that fails to parse at all).
