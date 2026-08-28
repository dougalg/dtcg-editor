# Research: Inline CSS-Function Color Editor

Phase 0 decisions. Each resolves an open question from the spec's Assumptions or
the plan's Technical Context.

---

## R1 — Colour library: `colorjs.io` stays in `token-editor-color`; no new lib

**Decision**: `colorjs.io` (`^0.7.1`) **remains a dependency of
`packages/token-editor-color`**. `convertColorValue` is added to that package's
existing `src/utils/conversion.ts`. `token-core` is not modified and takes no
colour-library dependency. Continue importing only `colorjs.io/fn` and
registering exactly the 14 DTCG spaces at module load (the `/fn` entry does not
auto-register). Do **not** adopt `culori` or any other colour library.

**Rationale**:
- The constitutions were amended for this feature (repo-root Principle VII →
  v3.0.0; package Principle I → v2.0.0) precisely so that UI-driven perceptual
  colour-space conversion and gamut mapping live in the `token-editor-*`
  package, with a direct `colorjs.io` dependency, rather than in `token-core`.
  The Approved Dependencies list now scopes `colorjs.io` to
  `packages/token-editor-color`. This matches where the code already is.
- Nothing moves: `src/utils/conversion.ts` and `src/utils/css-color.ts` already
  exist here, are already `colorjs.io`-backed / framework-free, and are already
  `node:test`-covered (excluded from the Vitest project by name). Adding
  `convertColorValue` beside `colorValueToSrgbHex` is a local extension.
- `colorjs.io` already provides everything needed: `to()` (cross-space
  conversion), `toGamut()` (CSS Color 4 gamut mapping), `deltaEOK()`
  (perceptual-difference check), `serialize()` (sRGB-hex fallback). `culori`
  would be a *new* dependency for no capability gain — fails Principle VIII.

**Alternatives considered**:
- *Put conversion in `token-core`* — the plan's first draft; reversed by the
  maintainer. Conversion is an authoring transform, not a fact about the
  on-disk value, so `token-core` should not carry a colour-library dependency
  for it. Constitutions amended to reflect this.
- *A dedicated `@dtcg-editor/color-convert` package* — over-structuring for one
  function used by one consumer; rejected. If a second consumer ever appears,
  the framework-free `src/utils` module lifts out cleanly.
- *`culori`* — rejected per Principle VIII (see above).

---

## R2 — Perceptual conversion + when a switch is "within tolerance"

*(Updated by the 2026-08-29 clarification: the threshold is a config value, not
a hardcoded constant; there is no display rounding.)*

**Decision**: `convertColorValue(value, targetSpace, tolerance)` computes the
target-space coordinates with `colorjs.io`'s `to()`, then:
1. Determines in-gamut-ness of the target space (`inGamut()`).
2. If out of gamut, produces a gamut-mapped variant with
   `toGamut(color, { space: targetSpaceId, method: "css" })` (the CSS Color 4
   OKLCH-chroma-reduction algorithm).
3. Classifies the outcome as one of `"within-tolerance"`, `"gamut-mapped"`, or
   `"channel-undefined"` (see R5), and reports per-channel `{ from, to }` pairs
   using the **unrounded stored values** (formatting/trimming is the view's job,
   R3).

`"within-tolerance"` (apply silently, no dialog — FR-010) requires **all** of:
- the target-space value is in gamut, **and**
- no channel is undefined in the target space, **and**
- round-tripping the **unrounded** target value back to the source space and
  comparing to the original with `deltaEOK` yields a value **strictly below
  `tolerance`**.

`tolerance` is the caller-supplied ΔEOK threshold — the colour editor passes
`options.spaceSwitchTolerance ?? 0.02` (FR-010a). `tolerance === 0` ⇒ only a
`deltaEOK` of exactly `0` is "within tolerance"; in practice every real
cross-space conversion carries floating-point dust so the dialog fires on
essentially every switch — a deliberate "always confirm" mode.

Anything not "within-tolerance" ⇒ `"gamut-mapped"` or `"channel-undefined"` ⇒
the confirmation dialog (FR-011).

**Rationale**: `deltaEOK` is the perceptually-uniform metric colorjs.io
recommends for "do these look the same". 0.02 (the default) is the widely-cited
OKLab JND — below it no human sees a difference. Making it configurable lets a
host tighten or loosen how eagerly the confirmation dialog appears without a
code change. Comparing unrounded values (rather than rounding first) is simpler
and, with a non-zero tolerance band, has the same practical effect — the band
absorbs the sub-perceptual dust.

**Alternatives considered**:
- *Hardcode 0.02* — the plan's first draft; the clarification made it
  configurable. Rejected.
- *Round to display precision before comparing* — the plan's first draft;
  dropped with the "no display rounding" clarification. The tolerance band
  already absorbs float dust, so rounding added nothing.
- *ΔE2000 in Lab* — heavier, less aligned with the OKLCH pipeline. Rejected.

---

## R3 — Number display: no rounding, trim trailing zeros

*(Set by the 2026-08-29 clarification.)*

**Decision**: No display rounding or precision cap anywhere. A channel/alpha
value is shown exactly as stored — whatever precision the user typed or the
conversion produced — passed through a single formatting helper
`formatChannel(n: number): string` that only:
- renders the number in plain decimal notation (no exponent),
- trims trailing zeros in the fractional part and a bare trailing `.`
  (`0.5000` → `0.5`, `145.0` → `145`),
- normalises `-0` to `0`.

`formatChannel` is used by `ColorFunctionValue` for the resting string, by
`ChannelInput` to seed a focused input's initial text, and by
`SpaceConversionDialog` for the before/after cells. It never changes the stored
`components` — those keep full precision. `convertColorValue`'s ΔEOK comparison
(R2) also uses unrounded values.

**Rationale**: The maintainer chose exactness over tidiness — an authored
`0.123456` should read back as `0.123456`, not silently truncated. Trailing-zero
trimming is pure cosmetics (`0.5` vs `0.5000`) with no information loss. A single
helper keeps the three render sites consistent and is trivially unit-tested.

**Alternatives considered**: per-channel-type decimal places (the plan's first
draft — rejected by the clarification as lossy); fixed N decimals or N sig-figs
(same objection); `Number.prototype.toString()` alone (rejected — can emit
exponent notation for very small/large magnitudes, which would look wrong in the
inline string).

**Open sub-point for implementation**: extremely long fractions (e.g. an
irrational-looking conversion result like `0.30000000000000004`) will render in
full. FR-023 (wrap, no page overflow) still applies. If this proves unreadable
in practice, capping *only* the visually-displayed string (not the stored value
or the input's editable text) at a generous length is a follow-up, not part of
this feature.

---

## R4 — `"none"` components

**Decision**: `convertColorValue` coerces any `"none"` channel in its input to
`0` before the maths, and always outputs concrete numbers (never `"none"`). The
editor never *writes* a new `"none"`. A `ColorValue` loaded from a file that
already contains `"none"` renders that channel literally as the text `none`
(non-editable-looking, but focusing/typing replaces it with a number) until the
user edits it — matching the spec edge case. `ChannelInput` handles this: given
`"none"` it shows `none`, and the first keystroke starts a numeric edit from
empty.

**Rationale**: `"none"` is a CSS Color 4 "missing component" concept with no
single correct numeric interpretation across spaces; `0` is what the existing
`colorValueToSrgbHex` already substitutes for display. Keeping the write-path
free of `"none"` means the "remove the none checkboxes" requirement (FR-015) is
total — the UI has no way to author it — while still round-tripping an existing
file value until it's touched.

---

## R5 — Undefined channels after conversion (achromatic hue)

**Decision**: When converting an achromatic colour into a polar space
(`hsl`/`hwb`/`lch`/`oklch`), `colorjs.io` yields `NaN` for hue. `convertColorValue`
detects this, substitutes `0` for the stored value, and classifies the outcome
as `"channel-undefined"` so the confirmation dialog explains: "Hue is undefined
for a grey colour; it will be set to 0." Accepting writes `0`; denying keeps the
original space.

**Rationale**: A `NaN` must never reach the token (`ColorObjectValueSchema`
requires `number | "none"`). `0` is the conventional canonical hue for
achromatic colours. Surfacing it in the dialog (rather than silently) satisfies
FR-011/FR-012 — the user sees that a value was invented.

---

## R6 — The dotted/solid underline treatment (design-system dependency)

**Decision**: The resting **dotted** underline and the hover/focus **solid**
underline + stronger-foreground promotion are expressed entirely through
`--dtcg-ed-*` custom properties and a small design-system utility class (working
names: `--dtcg-ed-color-editable-underline`,
`--dtcg-ed-color-editable-underline-active`,
`--dtcg-ed-color-editable-fg`, `--dtcg-ed-color-editable-fg-active`, plus a
`.editable-text` utility that wires `text-decoration: underline dotted` → solid
on `:hover, :focus-visible, :focus-within`). Adding these to
`@dtcg-editor/design-system` is a **separate, maintainer-owned change** (the spec
records the maintainer will do this). This feature's editor **references those
names**; if they are not yet defined the CSS `var()` falls back to `currentColor`
/ no decoration — the control still works, it just lacks the underline until the
design-system change lands. The editor ships **no literal** underline colour,
style, or timing, and **no** `--_`-prefixed local copy of the treatment.

**Rationale**: Package Principle III / repo Principle XII forbid literal design
values even in local component CSS. FR-019a forbids a permanent local hardcode.
A `var()` with a semantic fallback keyword (not a literal value) is the pattern
`DESIGN.md` already sanctions. Sequencing: the editor work and the design-system
work can land independently and in either order; `tasks.md` will carry a task to
confirm the tokens exist (or file the design-system change) before the feature
is called done.

**Alternatives considered**:
- *Interim `--_` local values* — Principle XII only exempts `--_` **layout
  math**, not colour/decoration; rejected.
- *Block this feature on the design-system change* — unnecessary coupling; the
  `var()` fallback degrades gracefully. Rejected.

---

## R7 — Making the design-system `Select` read as plain text; deny-revert

**Decision**: Use `Select` + `SelectTrigger`/`SelectValue`/`SelectContent`/
`SelectItem` from `@dtcg-editor/design-system/components/Select/Select.tsx`. Pass
a `className` to `SelectTrigger` that (via design-system tokens / the R6 utility)
removes the trigger's border/background/padding, sets the monospace face, applies
the `.editable-text` underline treatment, and **hides the chevron icon**
(`[&>svg]:hidden` style utility or a dedicated `--dtcg-ed-*` opt-out) so the
trigger renders as just the space name. The listbox popover keeps its normal
design-system styling.

The space `Select` is a **controlled** component whose `value` is
`pendingSpace ?? value.colorSpace`. On `onValueChange(next)`:
- compute `convertColorValue(value, next, tolerance)` where
  `tolerance = options.spaceSwitchTolerance ?? 0.02`;
- if `classification === "within-tolerance"` → call `onChange` with the
  converted value (the controlled `value` prop updates, select shows `next`);
- else → set local `pendingSpace = next` and open `SpaceConversionDialog`.
  **Accept** → `onChange(convertedValue)` then clear `pendingSpace`. **Deny /
  dismiss** → clear `pendingSpace`; because the select is controlled off
  `value.colorSpace`, it snaps back to the original with no imperative reset
  (satisfies FR-013's "shown value must never drift").

**Rationale**: Radix Select is already the design-system primitive (Principle
XII: reuse it). It is a controlled listbox, not a native `<select>`, so the
"displayed value flips before confirmation" problem is avoided by driving it off
the token's real `colorSpace` plus a local pending overlay. Keyboard and ARIA
come from Radix.

**Alternatives considered**:
- *Native `<select>`* — cannot be styled down to borderless plain text
  cross-platform, and its value updates on `change` before the dialog. Rejected.
- *Hand-rolled menu button + `Popover`* — duplicates behaviour `Select` already
  owns; rejected per Principle XII (earlier spec discussion settled on `Select`).

---

## R8 — Alpha add/remove affordance (replacing the "has alpha" checkbox)

**Decision**:
- **Alpha present**: the inline string shows ` / <alpha>` where `<alpha>` is a
  `ChannelInput` (0–1, step 0.01). Clearing that input to empty and committing
  **removes** alpha (`onChange` with `alpha` omitted).
- **Alpha absent**: a single small trailing affordance rendered just before the
  closing `)` — the design-system **`Button`** (`@dtcg-editor/design-system/
  components/Button/Button.tsx`), visually reduced to `+ α` plain text via the
  R6 `.editable-text` utility, keyboard-focusable — that on activate sets
  `alpha: 1` and moves focus into the new alpha input.

**Rationale**: Keeps the "everything is inline text" model — no checkbox, no
separate row (FR-015 spirit). "Clear to remove" is discoverable once alpha is
shown; the explicit `+ α` control is needed because there's otherwise no way to
introduce the segment. It is a real activatable button (adds a segment), so
repo Principle XII / `DESIGN.md` require the design-system `Button` rather than a
raw `<button>` — even styled down to bare text. Exact glyph/label is a visual
detail; behaviour and the backing component are fixed here.

**Alternatives considered**: a persistent greyed `/ 1` that becomes real on
focus (rejected — ambiguous whether alpha is "on"); a right-click/context menu
(rejected — undiscoverable, poor a11y).

---

## R9 — Legacy bare-hex `$value`

**Decision**: A `ColorValue` that is a bare `"#rrggbb"` string renders as a
single `ChannelInput` in `mode="text"` (design-system `Input` `type="text"`,
`pattern="#[0-9a-fA-F]{6}"`, `.editable-text`-styled) showing the hex, plus the
`ColorSpaceSelect` showing a synthetic current entry `hex`. Editing the hex text
(valid `#rrggbb`) writes the string back unchanged in form. Choosing a real
colour space from the select converts **from the hex** via `convertColorValue`
(treating the hex as `srgb`) and writes an **object-form** `ColorObjectValue`
from then on — this is the one sanctioned transition from legacy to object form
(FR-020). There is no channel-by-channel editing while in legacy hex form.

**Rationale**: Minimal, honours "don't silently rewrite to object form" while
still giving a path forward. The synthetic `hex` select entry is the natural
place for the "change the colour space" action the spec anticipates.

**Alternatives considered**: auto-upgrading legacy hex to `srgb( … )` object
form on first render (rejected — silently changes the on-disk `$value` shape,
violates FR-020 and Principle V's deviation-must-be-explicit rule).

---

## R10 — sRGB `hex` fallback field

**Decision**: Remove the standalone editable hex field (FR-016). When an object
`ColorValue` carries an optional `hex`, `ColorEditor` recomputes it from the
current components on every `onChange` (via `token-core`'s
`colorValueToSrgbHex`) so it stays consistent. If the incoming value has **no**
`hex`, none is added — the editor doesn't start populating a field the author
didn't ask for.

**Rationale**: The `hex` fallback exists for non-CSS-Color-4 consumers; it is
derived data, not an independent authoring surface. Keeping it in sync
automatically removes a whole class of "hex disagrees with components" bugs and
one more control from the UI.

**Alternatives considered**: leave `hex` untouched when present (rejected — it
would drift and mislead); always add `hex` (rejected — changes `$value` for
tokens that never had it, a needless diff).

---

## R11 — Keyboard model & accessibility for hover-revealed affordances

**Decision**:
- Every interactive part is in the natural tab order left-to-right: space
  `Select` → channel 1 → channel 2 → channel 3 → (`+ α` **or** alpha input).
- `:focus-visible` triggers the exact same solid-underline / stronger-foreground
  promotion as `:hover` (FR-004b) — the affordance is never hover-only.
- Each `ChannelInput` has an accessible name from its space+channel label
  (`COMPONENT_RANGES[space][i].label`, e.g. "oklch L", "oklch C", "oklch H"),
  via `aria-label` (kept visually hidden — the visible text is just the number).
- The `Select` has an accessible name "Colour space".
- `SpaceConversionDialog` uses design-system `Dialog` (`DialogTitle` /
  `DialogDescription`), focus-trapped, Escape = Deny, initial focus on Deny (the
  non-destructive choice).
- FR-021 range warnings render in a `role="alert"` region owned by `ColorEditor`
  with a stable `id`. `ColorEditor` derives a `[boolean,boolean,boolean]`
  `invalid` map by matching each `checkColorValueIssues` string's `component N`
  token to its index, then passes `issueDescribedById` (the region id) and
  `invalid` down through `ColorFunctionValue` to each `ChannelInput`, which sets
  `aria-invalid` + `aria-describedby` on the offending input(s).
- Every component gets a `.a11y.test.tsx` asserting zero `axe-core` WCAG 2.2 AA
  violations, including a "component with no interactive semantics of its own"
  assertion for `ColorFunctionValue` where applicable.

**Rationale**: Repo Principle X's two-tier a11y testing and the package
constitution's Principle IV both require this; the spec's accessibility
assumption calls for keyboard + screen-reader parity with the pointer
experience.

**Alternatives considered**: a single roving-tabindex composite widget (rejected
— the parts are independent form controls, not a menu/grid; native tab order is
simpler and more predictable).
