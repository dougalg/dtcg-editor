# Contract: `cubicBezierTokenType` (`TokenTypeContract<CubicBezierValue>`)

This feature's only "external interface" is the existing, unmodified
`TokenTypeContract<TValue>` interface from `@dtcg-editor/token-editor-contract`
(`packages/token-editor-contract/src/contract.ts`, NOT edited by this feature). This document
records how `packages/token-editor-cubic-bezier` implements that interface — the contract
`apps/web-app`'s registry consumes generically.

## Shape

```ts
export const cubicBezierTokenType: TokenTypeContract<CubicBezierValue> = {
  type: "cubicBezier",
  valueSchema: CubicBezierValueSchema,       // from @dtcg-editor/token-core
  serializeValue: (value) => value,          // identity — see data-model.md Round-trip Fidelity
  Editor: CubicBezierEditor,
  Preview: CubicBezierPreview,
  // ValidationErrorHandler, editorOptionsSchema: omitted — no configuration-time
  // options, and CubicBezierEditor only ever renders an already-valid value, matching
  // dimensionTokenType's precedent of omitting both.
};
```

## `Editor` contract (`TokenTypeEditorProps<CubicBezierValue>`)

- **Input**: `value: CubicBezierValue` (always a valid 4-tuple — already passed
  `CubicBezierValueSchema`, per Principle IV), `onChange: (next: CubicBezierValue) => void`.
- **Output**: calls `onChange` with a new 4-tuple, one index changed per user edit, on every
  field's `change` event (FR-008).
- **Guarantee**: never calls `onChange` with an x-coordinate (`index 0` or `2`) outside `[0,1]`
  (FR-006); never rejects a y-coordinate (`index 1` or `3`) for being negative or `>1` (FR-007).

## `Preview` contract (`{ value: unknown }`)

- **Input**: `value: unknown` — a resolved reference's literal value, not guaranteed to be a
  `CubicBezierValue` (per `contract.ts`'s own doc comment for `Preview`).
- **Output**: re-validates `value` against `CubicBezierValueSchema` itself; renders a short
  `cubic-bezier(a, b, c, d)`-style text node on success (FR-009), or `null` on failure
  (FR-010), letting the host fall back to its generic rendering — mirroring `ColorPreview`'s
  exact `safeParse` → `null`-or-render pattern.

## Host registration contract

`apps/web-app/lib/token-editors/built-in.ts`:

- `BUILT_IN_TOKEN_TYPES` gains `"cubicBezier"` alongside `"dimension"` and `"color"`.
- `builtInContractsByType` gains a `cubicBezier: cubicBezierTokenType as unknown as
  TokenTypeContract<unknown>` entry, with the same type-erasure justification comment already
  present for `dimension`/`color` (the registry never inspects `value`, only threads it
  opaquely).
- No other file in `apps/web-app` requires an edit: `resolveTokenTypeIconId` already maps
  `cubicBezier` to a sprite icon id (`packages/token-core`'s `DTCG_TOKEN_TYPES` and the icon
  sprite already include it), and the fallback/error-handling paths are generic over any
  registered type.
