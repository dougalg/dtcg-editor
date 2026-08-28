# Contract: `token-editor-color` colour conversion

New surface added to `@dtcg-editor/token-editor-color`'s
`src/utils/conversion.ts` (framework-free, `colorjs.io/fn`-backed, `node:test`-
covered) and re-exported from the package's `src/index.ts`. Consumed by the
package's own React components. `token-core` is **not** involved — it supplies
only the `ColorObjectValue` / `LegacyHexColorValue` / `ColorSpace` types, which
are imported.

Per repo-root Principle VII (v3.0.0) and package Principle I (v2.0.0), this
conversion capability belongs in `token-editor-color`, and `colorjs.io` stays
this package's dependency.

## Exports (from `token-editor-color`'s `src/index.ts`)

| Symbol | Kind | Status |
|--------|------|--------|
| `convertColorValue` | function | **new** (in `src/utils/conversion.ts`) |
| `ColorConversion` | type | **new** |
| `ChannelChange` | type | **new** |
| `ConversionNote` | type | **new** |
| `colorValueToCssColor` | function | unchanged, stays in `src/utils/css-color.ts` |
| `colorValueToSrgbHex` | function | unchanged, stays in `src/utils/conversion.ts` |

`srgbHexToColorSpaceComponents` is **removed** from `conversion.ts` and its
re-export dropped — it existed only to feed the native `<input type="color">`,
which FR-017 removes.

## `convertColorValue(value, targetSpace)`

### Signature

```ts
function convertColorValue(
  value: ColorObjectValue | LegacyHexColorValue,
  targetSpace: ColorSpace,
): Result<ColorConversion, UnknownError>;
```

### Behaviour

1. **Input normalisation**
   - `LegacyHexColorValue` (`"#rrggbb"`) → parsed as `srgb`.
   - Any `"none"` component → `0` before maths.
2. **Convert** source coords → `targetSpace` via `colorjs.io` `to()`.
3. **Undefined channels** — any `NaN` coord (e.g. hue of an achromatic colour in
   a polar space) → substitute `0`; push `{ kind: "hue-undefined", channelIndex }`.
4. **Gamut** — if the converted colour is out of `targetSpace` gamut
   (`inGamut()` false), replace `components` with
   `toGamut(color, { space: <targetSpaceId>, method: "css" })` coords; push
   `{ kind: "gamut-clamped" }`.
5. **Classify**
   - `"channel-undefined"` if step 3 fired;
   - else `"gamut-mapped"` if step 4 fired;
   - else `"exact"` **iff** `deltaEOK(original, roundTrip(displayRounded(target)))
     < 0.02`; otherwise `"gamut-mapped"` (precision loss beyond a JND without an
     explicit gamut clamp still warrants confirmation).
6. **Per-channel changes** — build `ChannelChange[3]` using the **target**
   space's `COMPONENT_RANGES` labels, `from`/`to` at display precision (see
   research R3), `changed` = values differ at that precision. `from` is `null`
   when there is no meaningful source counterpart (channel count/kind mismatch).
7. **Alpha** — copied through unchanged (`undefined` stays `undefined`).
8. **Hex** — if `value` is object-form and had `hex`, recompute via
   `colorValueToSrgbHex` of the *result*; else `undefined`.
9. Wrap any `colorjs.io` throw once with `fromThrowable`; log via injected
   `Logger`; return `err(UnknownError)`. Never throw.

### Guarantees

- `ok(...)` result's `components` are always three finite `number`s.
- `components` never contains `"none"` or `NaN`.
- `classification === "exact"` ⟺ the editor applies the change with no dialog.
- Idempotent on space: `convertColorValue(v, v.colorSpace)` returns
  `classification: "exact"`, `channelChanges` all `changed: false`.
- Pure: no I/O, no globals beyond the module-load space registration.

### Test obligations (`src/utils/conversion.test.ts`, `node:test`)

| # | Case | Assert |
|---|------|--------|
| T1 | every `COLOR_SPACES` × `COLOR_SPACES` pair, mid-gamut sRGB seed | `ok`; round-trip `deltaEOK` < 0.02 |
| T2 | in-sRGB-gamut colour `srgb` → `oklch` | `classification: "exact"`, no `notes` |
| T3 | wide-gamut `oklch(0.7 0.3 30)` → `srgb` | `classification: "gamut-mapped"`, `notes` has `gamut-clamped`, all `components` in `[0,1]` |
| T4 | achromatic `srgb(0.5 0.5 0.5)` → `oklch` | `classification: "channel-undefined"`, `notes` has `hue-undefined` with `channelIndex: 2`, hue component `0` |
| T5 | value with `alpha: 0.4` switched space | result `alpha === 0.4` |
| T6 | value with a `"none"` component switched space | no `"none"` in output; treated as `0` |
| T7 | object value with `hex` switched space | result `hex` recomputed, matches `colorValueToSrgbHex(result)` |
| T8 | object value without `hex` switched space | result `hex === undefined` |
| T9 | `convertColorValue(v, v.colorSpace)` | `"exact"`, every `channelChanges[i].changed === false` |
| T10 | legacy `"#3366cc"` → `oklch` | `ok`; `components` finite; treats input as sRGB |
| T11 | forced `colorjs.io` throw (monkeypatch / impossible space id via a wrapper) | `err` is `UnknownError`, `Logger` called once, nothing thrown |

### Adjacent obligations

- `css-color.test.ts` and the existing `conversion.test.ts` cases stay in
  `token-editor-color` and must still pass unchanged (`colorValueToCssColor` and
  `colorValueToSrgbHex` do not move).
- The `conversion.test.ts` cases that exercised `srgbHexToColorSpaceComponents`
  are deleted along with that function.
- `token-editor-color`'s `src/index.ts` **adds** `convertColorValue` +
  `ColorConversion` / `ChannelChange` / `ConversionNote` exports and **drops**
  the `srgbHexToColorSpaceComponents` re-export. `colorValueToCssColor` /
  `colorValueToSrgbHex` re-exports are unchanged.
- `token-core` gets **no** test or export changes.
