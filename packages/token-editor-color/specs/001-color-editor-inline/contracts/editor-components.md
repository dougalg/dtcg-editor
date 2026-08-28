# Contract: `token-editor-color` components

Component boundaries and prop contracts for the reworked editor. Every component
is PascalCase in its own folder with co-located `*.test.tsx` + `*.a11y.test.tsx`
(package Principle IV, repo Principle X). No component contains a literal design
value; all use `@dtcg-editor/design-system` components + `--dtcg-ed-*` tokens.

Import design-system components by concrete path, e.g.
`@dtcg-editor/design-system/components/Input/Input.tsx` (the package exports
`./components/*`). Design-system components used: `Input` (`ChannelInput`),
`Select` + parts (`ColorSpaceSelect`), `Dialog` + parts
(`SpaceConversionDialog`), `Button` (the `+ α` add-alpha control).

---

## `ColorEditor` (the contract `Editor`)

**Props**: `TokenTypeEditorProps<ColorValue>` — `{ value, onChange, options }`
(shape unchanged from today; `options` is the validated `ColorEditorOptions` —
the `colorSpaces` allow-list plus the **new** `spaceSwitchTolerance?: number`,
FR-010a).

**Responsibilities**
- Branch legacy-hex vs object form (R9).
- **Object form**: render `ColorSpaceSelect` + `ColorFunctionValue` inline.
- **Legacy bare-hex** (`"#rrggbb"` string): render `ColorSpaceSelect`
  (`value="hex"`) plus one `ChannelInput` in `mode="text"` bound to the hex
  string — a valid `#rrggbb` edit writes the string back in the same form; no
  per-channel editing while legacy (FR-020). The legacy→object transition on a
  real-space pick is in the space-switch flow below.
- **FR-021 wiring**: compute `issues = checkColorValueIssues(value)`; render them
  in a `role="alert"` region with a stable `id`; derive a
  `[boolean, boolean, boolean]` `invalid` map by matching each issue string's
  `component N` token to its index; pass `issueDescribedById` (the region id) and
  `invalid` down to `ColorFunctionValue`.
- Own the space-switch flow: call
  `convertColorValue(value, next, options?.spaceSwitchTolerance ?? 0.02)`; if
  `classification === "within-tolerance"` apply directly, else stage
  `pendingSpace` + `pendingConversion` and render `SpaceConversionDialog`.
- On every channel/alpha change, rebuild the `ColorObjectValue` and, if the
  incoming value had `hex`, refresh it via `colorValueToSrgbHex` (R10) before
  `onChange`.
- Surface FR-021 messages from `checkColorValueIssues(value)` in a
  `role="alert"` region.

**MUST NOT**: re-validate `value` against any schema; import `colorjs.io`
directly (colour maths goes through `../../utils/conversion.ts`); hold a local
copy of the colour (only `pendingSpace` / `pendingConversion`).

**Key acceptance mapping**: US1 all, US2 all, US3 AC3/AC4, FR-013, FR-014,
FR-016, FR-021.

---

## `ColorFunctionValue`

**Props**
```ts
{
  value: ColorObjectValue;
  onComponentChange: (index: 0 | 1 | 2, next: number) => void;
  onAlphaChange: (next: number | undefined) => void;
  spaceSelect: ReactNode;                       // the ColorSpaceSelect element, injected so layout owns order
  issueDescribedById?: string;                  // FR-021: id of ColorEditor's role="alert" region
  invalid?: readonly [boolean, boolean, boolean]; // FR-021: per-channel out-of-range flags
}
```

**Responsibilities**: render the monospace inline layout
`{spaceSelect}( c0 c1 c2 [ / alpha ] )`. The `spaceSelect` and the bracketing
`(` `)` sit in one wrapper element that carries `:hover` / `:focus-within` so
they promote together (FR-002, FR-004, R7). Render one `ChannelInput` per
component with `invalid={invalid?.[i]}` and `describedById={issueDescribedById}`;
render the alpha `ChannelInput` when `value.alpha !== undefined`, else an
**add-alpha control built from the design-system `Button`** (visually reduced to
`+ α`, not a raw `<button>` — Principle XII) that sets `alpha: 1` and focuses the
new input (R8); render the `/` separator and inner padding as inert (FR-002b).
All displayed numbers go through `formatChannel` — no rounding, trailing zeros
trimmed (FR-002d).

**MUST**: monospace via `--dtcg-ed-*` typography token (FR-002a); wrap without
horizontal page overflow at min width (FR-023); no layout shift when a channel
is focused (FR-002c).

**Key acceptance mapping**: US1 AC1, US3 AC1/AC5, FR-002/002a/002b/002c, FR-023.

---

## `ChannelInput`

**Props**
```ts
{
  label: string;              // accessible name, e.g. "oklch L" (visually hidden)
  mode?: "number" | "text";   // default "number"; "text" for the legacy hex string (ColorEditor legacy branch)
  value: number | "none" | string;   // string only when mode === "text"
  onCommit: (next: number | string) => void;   // string only when mode === "text"
  onClear?: () => void;       // alpha only: empty+commit ⇒ remove alpha (R8)
  step?: number;              // default 1; alpha passes 0.01 (number mode only)
  invalid?: boolean;          // drives aria-invalid + aria-describedby wiring (FR-021)
  describedById?: string;     // id of ColorEditor's role="alert" region; used when invalid
}
```

**Behaviour**
- `mode="number"` (default): design-system `Input` (`type="number"`,
  `inputMode="decimal"`). `mode="text"`: design-system `Input` (`type="text"`,
  `pattern="#[0-9a-fA-F]{6}"`) for the legacy hex string — commit only on a
  valid `#rrggbb`.
- Styled via the R6 `.editable-text` utility so it reads as plain text: no
  border/box/spinner at rest, dotted underline, solid on `:hover`/`:focus-visible`.
- Present and focusable from first render — never a click-to-activate label
  (FR-002c).
- `value === "none"` (number mode) ⇒ display the literal text `none`; first
  keystroke starts a numeric draft from empty (R4).
- When `invalid`, sets `aria-invalid` and `aria-describedby={describedById}`.
- Resting display and the initial focused `draft` are `formatChannel(value)` —
  full precision, trailing zeros trimmed, no rounding (FR-002d).
- Local `draft` string while focused. **Enter** or **blur**: if `draft` parses to
  a finite number ⇒ `onCommit`; if `draft` is empty and `onClear` given ⇒
  `onClear`; otherwise revert to `value`, no callback (FR-005, FR-006).
- **Escape**: discard `draft`, revert, keep focus (US1 AC5).
- Resting and focused states occupy the same box — no reflow.

**Key acceptance mapping**: US1 AC2/AC3/AC4/AC5/AC6, FR-002c, FR-003, FR-004a,
FR-004b, FR-005, FR-006.

---

## `ColorSpaceSelect`

**Props**
```ts
{
  value: ColorSpace | "hex";          // "hex" only in legacy-hex mode (R9)
  offered: readonly ColorSpace[];     // from offeredColorSpaces(options.colorSpaces, current)
  onChange: (next: ColorSpace) => void;
}
```

**Behaviour**
- Design-system `Select` (`SelectTrigger`/`SelectValue`/`SelectContent`/
  `SelectItem`). Trigger styled via R6/R7 to read as plain monospace text with
  the `.editable-text` underline and **no chevron**; the popover keeps normal
  design-system styling.
- Lists `offered` in `COLOR_SPACES` canonical order (FR-008); current space
  indicated. In legacy mode, prepends a disabled/among-list `hex` entry as the
  current value (R9).
- Accessible name "Colour space".
- Controlled: displays `value`; selecting emits `onChange`. It does **not**
  itself decide about the dialog — `ColorEditor` does.

**Key acceptance mapping**: US2 AC1/AC2/AC7, FR-002 (as one segment with the
parens), FR-004, FR-007, FR-008.

---

## `SpaceConversionDialog`

**Props**
```ts
{
  open: boolean;
  sourceSpace: ColorSpace;
  conversion: ColorConversion;   // from ../../utils/conversion.ts
  onAccept: () => void;
  onDeny: () => void;            // also fired on Escape / backdrop / close
}
```

**Behaviour**: design-system `Dialog` (`DialogContent`/`DialogTitle`/
`DialogDescription`). Title e.g. "Convert to {targetSpace}?". Body: a table with
a row per `conversion.channelChanges` — label, `formatChannel(from)`,
`formatChannel(to)` (no rounding, FR-002d), and a plain-language consequence from
`conversion.notes` (gamut clamp / undefined hue). Two actions: **Accept**
(writes) and **Deny** (no-op). Initial focus on **Deny**. Escape = Deny. Purely
presentational — no maths, no state.

**Key acceptance mapping**: US2 AC4/AC5/AC6, FR-011, FR-012, FR-013.

---

## Removed / unchanged

- **Removed** from `ColorEditor.tsx`: `<input type="color">` picker (FR-017), the
  three `none` checkboxes (FR-015), the standalone hex `<input>` (FR-016), the
  "has alpha" checkbox (R8), the stacked `.labelText` captions.
- **Changed**: `configuration.ts` — `ColorEditorOptions` /
  `ColorEditorOptionsSchema` gain `spaceSwitchTolerance?: number`
  (`z.number().nonnegative().optional()`), FR-010a.
- **Unchanged**: `ColorPreview`, `ColorValidationErrorHandler`, `token-type.ts`
  wiring, `utils/range-validation.ts`.
- **Story**: `ColorEditor.stories.tsx` gains `OutOfGamut`, `WithAlpha`,
  `LegacyHex`, `NoneChannel` stories and a play/interaction that opens
  `SpaceConversionDialog` (FR-022).
