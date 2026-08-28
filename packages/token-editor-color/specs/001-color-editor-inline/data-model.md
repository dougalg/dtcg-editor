# Data Model: Inline CSS-Function Color Editor

No persistence and no schema changes. This feature adds **in-memory shapes** used
between `token-editor-color`'s `src/utils/` conversion module and its React
components. The authoritative `ColorValue` shape is unchanged and still owned by
`@dtcg-editor/token-core` (`color.ts`) — imported, not modified.

---

## Existing (unchanged) — from `token-core/color.ts`

### `ColorValue`

`ColorObjectValue | LegacyHexColorValue`.

### `ColorObjectValue`

| Field | Type | Notes |
|-------|------|-------|
| `colorSpace` | one of the 14 `COLOR_SPACES` | determines channel count/meaning/ranges |
| `components` | `[ColorComponent, ColorComponent, ColorComponent]` | `ColorComponent = number \| "none"` |
| `alpha` | `number \| undefined` | absent ⇒ fully opaque; range 0–1 |
| `hex` | `string \| undefined` (`#rrggbb`) | optional sRGB fallback for non-CSS-Color-4 consumers |

### `LegacyHexColorValue`

Bare `"#rrggbb"` string. A flagged deviation from DTCG 2025.10, retained.

### `COMPONENT_RANGES` — from `token-editor-color/utils/range-validation.ts`

`Record<ColorSpace, [ComponentRange, ComponentRange, ComponentRange]>` where
`ComponentRange = { label, min, max, exclusiveMax? }`. Source of channel labels
(`R/G/B`, `H/S/L`, `L/C/H`, …) and the FR-021 in-range check. **Kept in the
editor package** — it is UI labelling + messaging, not colour maths.

---

## New — `token-editor-color` conversion module (`src/utils/conversion.ts`, extended)

### `ColorConversion` (return of `convertColorValue`)

The described outcome of converting one colour into another space. Not an error
type — an inexact conversion is a normal, reportable result.

| Field | Type | Notes |
|-------|------|-------|
| `targetSpace` | `ColorSpace` | echoes the requested space |
| `components` | `[number, number, number]` | the value to write on Accept — always concrete numbers (never `"none"`, never `NaN`); gamut-mapped when `classification === "gamut-mapped"` |
| `alpha` | `number \| undefined` | unchanged from the input (FR-014) |
| `hex` | `string \| undefined` | recomputed sRGB fallback iff the input had one (R10) |
| `classification` | `"exact" \| "gamut-mapped" \| "channel-undefined"` | drives whether the editor shows the confirmation dialog |
| `channelChanges` | `ChannelChange[]` (length 3) | per-channel before→after at display precision, for the dialog table |
| `notes` | `ConversionNote[]` | human-readable, e.g. `{ kind: "gamut-clamped" }`, `{ kind: "hue-undefined", channelIndex: 2 }` |

### `ChannelChange`

| Field | Type | Notes |
|-------|------|-------|
| `label` | `string` | from `COMPONENT_RANGES` of the **target** space (e.g. `"L"`, `"C"`, `"H"`) |
| `from` | `number \| "none" \| null` | source value in the **source** space at display precision; `null` when source channel count/meaning has no counterpart |
| `to` | `number` | target value at display precision |
| `changed` | `boolean` | `true` when `from`/`to` differ at display precision |

### `ConversionNote`

Discriminated union:
- `{ kind: "gamut-clamped" }` — one or more channels were pulled into the target
  gamut (CSS `toGamut`).
- `{ kind: "hue-undefined", channelIndex: 0 | 1 | 2 }` — an achromatic colour
  produced an undefined hue; `0` substituted (R5).

### `convertColorValue(value, targetSpace)` — signature

```
convertColorValue(
  value: ColorObjectValue | LegacyHexColorValue,
  targetSpace: ColorSpace,
): Result<ColorConversion, UnknownError>
```

- Lives in `token-editor-color`'s `src/utils/conversion.ts` (framework-free,
  `node:test`-covered), re-exported from the package's `src/index.ts`.
- Returns `Result` per repo Principle V: the `err` branch is only for an
  unexpected `colorjs.io` throw (wrapped once with `fromThrowable`, logged via
  an injected `Logger` per Principle VI). A representable-vs-not distinction is
  **not** an error — it rides in `classification`.
- `"none"` inputs are coerced to `0` before maths (R4).
- A `LegacyHexColorValue` input is treated as `srgb` (R9).

### `colorValueToCssColor(value)` — unchanged, stays in `token-editor-color`

Remains in `src/utils/css-color.ts`. Builds a CSS Color 4/5 function string for
preview; needs no colour-maths library (the browser does the maths). No change.

### `colorValueToSrgbHex(value)` — unchanged, stays in `src/utils/conversion.ts`

Already here. Used by R10 to keep the optional `hex` fallback in sync.
`srgbHexToColorSpaceComponents` in the same file is **deleted** — FR-017 removes
the native `<input type="color">` that was its only caller.

---

## New — editor-local view/interaction state (component-scoped, not exported)

### `ColorEditor` state

| State | Type | Purpose |
|-------|------|---------|
| `pendingSpace` | `ColorSpace \| null` | a space the user picked that needs confirmation; overlays the `Select`'s displayed value until Accept/Deny (R7) |
| `pendingConversion` | `ColorConversion \| null` | the computed outcome shown in `SpaceConversionDialog` |

`ColorEditor` derives everything else from its `value` prop; there is no local
copy of the colour. On Deny both fields clear and the `Select`, being controlled
off `value.colorSpace`, snaps back — no imperative reset.

### `ChannelInput` state

| State | Type | Purpose |
|-------|------|---------|
| `draft` | `string` | the in-progress text while focused; seeded from the committed number on focus, discarded on Escape, parsed+committed on Enter/blur (FR-005, FR-006) |

### `SpaceConversionDialog` props

`{ open, conversion: ColorConversion, sourceSpace: ColorSpace, onAccept, onDeny }`
— pure presentation of `ColorConversion.channelChanges` + `notes`, with two
actions. Holds no state.

---

## Validation rules (all pre-existing; nothing new)

- Structural: `ColorValueSchema` (in `token-core`), applied by the host via the
  contract **before** `Editor` is rendered. The editor never re-runs it (Pkg
  Principle II).
- In-range (FR-021): `checkColorValueIssues` / `COMPONENT_RANGES` — advisory
  messages only; out-of-range numeric values are still valid data and are
  written.
- Channel input hygiene (FR-006): non-numeric / empty draft ⇒ not committed,
  revert to last valid. This is control-level, not a schema.
