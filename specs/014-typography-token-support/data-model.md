# Phase 1 Data Model: Typography Token Editor Support

## `TypographyValue` (`packages/token-core/src/typography.ts`)

The DTCG `typography` type's `$value` shape (designtokens.org/tr/2025.10/format, Typography type):

| Field           | Type             | Required | Notes                                                        |
| --------------- | ---------------- | -------- | ------------------------------------------------------------- |
| `fontFamily`    | `FontFamilyValue`| yes      | Reused from `token-core`'s `FontFamilyValueSchema`.            |
| `fontSize`      | `DimensionValue` | yes      | Reused from `token-core`'s `DimensionValueSchema`.             |
| `fontWeight`    | `FontWeightValue`| yes      | Reused from `token-core`'s `FontWeightValueSchema`.            |
| `letterSpacing` | `DimensionValue` | yes      | Same schema as `fontSize`, semantically distinct.              |
| `lineHeight`    | `number`         | yes      | Bare unitless multiplier per spec — NOT a `DimensionValue`.    |

```ts
export const TypographyValueSchema = z.object({
	fontFamily: FontFamilyValueSchema,
	fontSize: DimensionValueSchema,
	fontWeight: FontWeightValueSchema,
	letterSpacing: DimensionValueSchema,
	lineHeight: z.number(),
});

export type TypographyValue = z.infer<typeof TypographyValueSchema>;
```

No new leaf types are introduced — `FontFamilyValue` (`string | string[]`), `DimensionValue`
(`{ value: number, unit: "px" | "rem" }`), and `FontWeightValue` (`number | keyword alias`) are
all pre-existing `token-core` types, unchanged by this feature. `lineHeight`'s type is simply
TypeScript's `number`.

### Validation rules

- All five fields are required; a `typography` value missing any of `fontFamily`, `fontSize`,
  `fontWeight`, `letterSpacing`, or `lineHeight` fails validation.
- Each field's own validation rules apply unchanged: `fontSize`/`letterSpacing` reject a missing
  or invalid `unit`; `fontWeight` rejects an out-of-range integer or unrecognized keyword;
  `fontFamily` accepts a string or string array (possibly empty).
- `lineHeight` accepts any finite or non-finite JS number by Zod's own `z.number()` semantics (no
  additional min/max/integer constraint — the spec places none), matching `NumberValueSchema`'s
  own lack of extra constraints for the standalone `number` type.
- No cross-field validation rule exists (e.g. no rule relating `fontSize` to `lineHeight`) — the
  DTCG spec defines none, and none is invented here.

### State transitions

Not applicable — a `TypographyValue` is edited in place (five independent field replacements),
not a stateful object with transitions of its own. Each field replacement is atomic from the
host's perspective: `TypographyEditor`'s `onChange` always receives one complete, valid
`TypographyValue` object (`{ ...value, [changedField]: next }`).

## Relationship to embedded editor packages

`TypographyEditor`/`TypographyPreview` do not introduce any new data model of their own beyond
`TypographyValue` above — they operate on slices of it (`value.fontFamily`, `value.fontSize`,
`value.fontWeight`, `value.letterSpacing`, `value.lineHeight`) using the exact
`FontFamilyValue`/`DimensionValue`/`FontWeightValue`/`number` types the embedded
`FontFamilyEditor`/`DimensionEditor`/`FontWeightEditor`/`NumberEditor` components already expect,
per their existing `TokenTypeEditorProps<TValue>` contracts.
