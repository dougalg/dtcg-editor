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
| `classification` | `"within-tolerance" \| "gamut-mapped" \| "channel-undefined"` | `"within-tolerance"` ⇒ editor applies silently; the other two ⇒ confirmation dialog |
| `channelChanges` | `ChannelChange[]` (length 3) | per-channel before→after, unrounded, for the dialog table |
| `notes` | `ConversionNote[]` | human-readable, e.g. `{ kind: "gamut-clamped" }`, `{ kind: "hue-undefined", channelIndex: 2 }` |
| `deltaEOK` | `number` | the round-trip perceptual difference actually computed — lets a caller/test see how close the switch was to the tolerance line |

### `ChannelChange`

| Field | Type | Notes |
|-------|------|-------|
| `label` | `string` | from `COMPONENT_RANGES` of the **target** space (e.g. `"L"`, `"C"`, `"H"`) |
| `from` | `number \| "none" \| null` | source value in the **source** space, unrounded. `"none"` when the source channel was `"none"` (the maths uses `0`, but the dialog shows what the author had). `null` when source channel count/meaning has no counterpart. Numbers rendered via `formatChannel`. |
| `to` | `number` | target value, unrounded; dialog renders via `formatChannel` |
| `changed` | `boolean` | `true` when `from`/`to` differ at all (unrounded) |

### `ConversionNote`

Discriminated union:
- `{ kind: "gamut-clamped" }` — one or more channels were pulled into the target
  gamut (CSS `toGamut`).
- `{ kind: "hue-undefined", channelIndex: 0 | 1 | 2 }` — an achromatic colour
  produced an undefined hue; `0` substituted (R5).

### `convertColorValue(value, targetSpace, tolerance, logger?)` — signature

```
convertColorValue(
  value: ColorObjectValue | LegacyHexColorValue,
  targetSpace: ColorSpace,
  tolerance: number,               // ΔEOK threshold; caller passes options.spaceSwitchTolerance ?? 0.02
  logger: Logger = consoleLogger,  // Principle VI — injected, real default
): Result<ColorConversion, UnknownError>
```

- Lives in `token-editor-color`'s `src/utils/conversion.ts` (framework-free,
  `node:test`-covered), re-exported from the package's `src/index.ts`.
- `Result`/`err`/`ok`/`fromThrowable` from `neverthrow`; `UnknownError` /
  `toLoggedUnknownError` / `Logger` / `consoleLogger` from `@dtcg-editor/errors`
  — both **added to `packages/token-editor-color`'s dependencies** (tasks T001).
- `tolerance` MUST be `>= 0`. The classifier reports `"within-tolerance"` only
  when in gamut, no undefined channel, and the round-trip `deltaEOK` is
  **strictly `< tolerance`**. `tolerance === 0` therefore treats any non-zero
  `deltaEOK` as needing confirmation.
- Returns `Result` per repo Principle V: the `err` branch is only for an
  unexpected `colorjs.io` throw — wrapped once with `fromThrowable`, then
  `toLoggedUnknownError(caught, logger)` (logs immediately via the injected
  `logger`, Principle VI). A representable-vs-not distinction is **not** an
  error — it rides in `classification`.
- `"none"` inputs are coerced to `0` before maths (R4).
- A `LegacyHexColorValue` input is treated as `srgb` (R9).
- No rounding of any kind — inputs, outputs, and the `deltaEOK` comparison all
  use full-precision numbers (R3).

### `formatChannel(n)` — new display helper (`src/utils/conversion.ts`)

```
formatChannel(n: number): string
```

Plain-decimal string of `n` with trailing fractional zeros and any bare trailing
`.` trimmed, and `-0` rendered as `"0"`. No rounding, no exponent notation. Used
by `ColorFunctionValue`, `ChannelInput` (initial focused text), and
`SpaceConversionDialog`. `node:test`-covered (`0.5000→"0.5"`, `145.0→"145"`,
`-0→"0"`, `0.123456→"0.123456"`, small magnitudes stay decimal not `1e-7`).

### `colorValueToCssColor(value)` — unchanged, stays in `token-editor-color`

Remains in `src/utils/css-color.ts`. Builds a CSS Color 4/5 function string for
preview; needs no colour-maths library (the browser does the maths). No change.

### `colorValueToSrgbHex(value)` — unchanged, stays in `src/utils/conversion.ts`

Already here. Used by R10 to keep the optional `hex` fallback in sync.
`srgbHexToColorSpaceComponents` in the same file is **deleted** — FR-017 removes
the native `<input type="color">` that was its only caller.

---

## Changed — `ColorEditorOptions` (`src/configuration.ts`)

The colour type's `editorOptions` shape gains one field. Validated at
config-load time by `ColorEditorOptionsSchema` (Zod), exactly like the existing
`colorSpaces` field — this is the **host's** config edge, not a new validation
boundary inside the editor (Pkg Principle II).

| Field | Type | Notes |
|-------|------|-------|
| `colorSpaces` | `readonly ColorSpace[]` (optional, `.min(1)`) | existing — space allow-list (FR-008) |
| `spaceSwitchTolerance` | `number` (optional) | **new** — ΔEOK threshold for a silent space switch (FR-010a). Schema: `z.number().nonnegative().optional()`. Absent ⇒ the editor uses `0.02`. |

`defineColorConfig` (the typed identity helper) picks up the new field for free.

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

## Validation rules

- Structural: `ColorValueSchema` (in `token-core`), applied by the host via the
  contract **before** `Editor` is rendered. The editor never re-runs it (Pkg
  Principle II).
- Config: `ColorEditorOptionsSchema` gains `spaceSwitchTolerance:
  z.number().nonnegative().optional()` (FR-010a). Enforced at config-load in the
  host's `defineConfig`, same as `colorSpaces` — not a runtime edge in the
  editor.
- In-range (FR-021): `checkColorValueIssues` / `COMPONENT_RANGES` — advisory
  messages only; out-of-range numeric values are still valid data and are
  written.
- Channel input hygiene (FR-006): non-numeric / empty draft ⇒ not committed,
  revert to last valid. This is control-level, not a schema.
