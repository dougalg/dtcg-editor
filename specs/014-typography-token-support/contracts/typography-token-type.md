# Contract: `typographyTokenType` (`TokenTypeContract<TypographyValue>`)

Implements the existing `TokenTypeContract<TValue>` interface from
`@dtcg-editor/token-editor-contract` (unmodified by this feature — see
`packages/token-editor-contract/src/contract.ts`).

```ts
export const typographyTokenType: TokenTypeContract<TypographyValue> = {
	type: "typography",
	valueSchema: TypographyValueSchema,
	serializeValue: (value) => value,
	Editor: TypographyEditor,
	Preview: TypographyPreview,
};
```

## `Editor` contract

`TypographyEditor(props: TokenTypeEditorProps<TypographyValue>): ReactElement`

- **Input**: `props.value: TypographyValue` (already validated by `valueSchema` before this
  component is ever rendered, per the host's existing validate-then-render flow — matches every
  other built-in type's `Editor`).
- **Output**: renders five labeled sub-controls, each in its own `<fieldset>`/`<legend>` group:
  - "Font Family" → `<FontFamilyEditor value={value.fontFamily} onChange={...} />`
  - "Font Size" → `<DimensionEditor value={value.fontSize} onChange={...} />`
  - "Font Weight" → `<FontWeightEditor value={value.fontWeight} onChange={...} />`
  - "Letter Spacing" → `<DimensionEditor value={value.letterSpacing} onChange={...} />`
  - "Line Height" → `<NumberEditor value={value.lineHeight} onChange={...} />`
- **Behavior**: each sub-control's `onChange` calls `props.onChange` with
  `{ ...props.value, [field]: next }` — never mutates or drops the other four fields.

## `Preview` contract

`TypographyPreview(props: { value: unknown }): ReactElement | null`

- **Input**: `props.value: unknown` — not guaranteed to be a `TypographyValue` (may come from
  resolving an arbitrary other token).
- **Behavior**: `TypographyValueSchema.safeParse(props.value)`; returns `null` on failure.
- **Output on success**: one `<span>` with text in the shape
  `{fontSize.value}{fontSize.unit}/{lineHeight} {fontFamily} {fontWeight}`, e.g.:
  - `"16px/1.4 Arial 700"` (letter spacing `0`, omitted)
  - `"16px/1.4 Arial 700 +1px"` (letter spacing non-zero, appended)
  - `fontFamily` renders as a comma-joined string when it's an array (matching
    `FontFamilyPreview`'s own stack-join formatting), and `fontWeight` renders via `String(...)`
    (matching `FontWeightPreview`'s own formatting) so both numeric and keyword-alias weights
    render identically to their standalone previews.

## Registration contract

`apps/web-app/lib/token-editors/built-in.ts`:

- `"typography"` added to `BUILT_IN_TOKEN_TYPES`.
- `typography: typographyTokenType as unknown as TokenTypeContract<unknown>` added to
  `builtInContractsByType`, matching the existing per-type erasure-safety comment pattern.
