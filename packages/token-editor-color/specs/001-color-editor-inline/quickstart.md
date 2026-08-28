# Quickstart / Validation: Inline CSS-Function Color Editor

How to prove the feature works end-to-end. Run from the repo root
(`/Users/dougalgraham/Projects/dtcg-editor` or the active worktree).

## Prerequisites

```bash
pnpm install            # picks up @dtcg-editor/design-system as a new dep of token-editor-color (colorjs.io already present)
pnpm --filter @dtcg-editor/design-system build   # regenerates dist/styles/tokens.css consumed by Storybook + the app
```

## 1. `token-editor-color` conversion util (unit)

```bash
pnpm --filter @dtcg-editor/token-editor-color test    # the package's own node:test script
```

Expect: all new `src/utils/conversion.test.ts` cases (T1–T13 in
`contracts/convert-color-value.md`) pass, alongside the pre-existing
`conversion.test.ts` / `css-color.test.ts` cases (`colorValueToCssColor` /
`colorValueToSrgbHex` are unchanged), plus the new `configuration.test.ts` case
for `spaceSwitchTolerance`. `token-core` is not modified. Key checks:

- Every space↔space pair round-trips with result `deltaEOK < 0.02` at
  `tolerance = 0.02` (T1).
- `srgb`→`oklch` on an in-gamut colour, `tolerance = 0.02` ⇒
  `classification: "within-tolerance"` (T2).
- `oklch(0.7 0.3 30)`→`srgb` ⇒ `classification: "gamut-mapped"`, components in
  `[0,1]` (T3).
- Achromatic ⇒ `classification: "channel-undefined"`, hue `0`, note present (T4).
- `tolerance = 0` on an in-gamut switch with `deltaEOK > 0` ⇒ **not**
  `"within-tolerance"` (T12).
- `formatChannel`: `0.5000→"0.5"`, `145.0→"145"`, `-0→"0"`, `0.123456` kept in
  full, tiny magnitudes stay decimal (no `1e-7`) (T13).
- `alpha` and `hex` handled per T5/T7/T8; no `"none"`/`NaN` ever in output.

## 2. `token-editor-color` components (unit + a11y)

```bash
pnpm exec vitest run --project 'packages/token-editor-color:unit'
pnpm exec vitest run --project 'packages/token-editor-color:a11y'
```

Expect: each of `ColorEditor`, `ColorFunctionValue`, `ChannelInput`,
`ColorSpaceSelect`, `SpaceConversionDialog` has a passing `*.test.tsx` and a
`*.a11y.test.tsx` with **zero** `axe-core` WCAG 2.2 AA violations. The updated
`ColorEditor.a11y.test.tsx` covers the object editor (with alpha + an
out-of-range channel) and the legacy-hex editor.

## 3. Storybook preview (manual — FR-022, SC-008)

```bash
pnpm storybook        # repo-root Storybook
```

Open **Editors / ColorEditor** and check each story:

| Story | What to verify |
|-------|----------------|
| `Default` (`srgb`) | Reads `srgb( 0.2 0.4 0.9 )` in monospace; each number has a faint dotted underline; hovering/focusing one turns its underline solid + brighter; the other parts don't change. No borders/boxes/spinners. |
| `RestrictedColorSpaces` | Opening the space select lists only `srgb`, `hsl` (+ current). |
| `WithAlpha` | Shows ` / 0.5`; clearing the alpha input and blurring removes the ` / …` segment; the trailing `+ α` control re-adds it. |
| `OutOfGamut` (`oklch` outside sRGB) | Picking `srgb` opens the conversion dialog **before** anything changes; the table lists per-channel before→after and "clamped to the sRGB gamut". **Deny** ⇒ nothing changes, select snaps back to `oklch`. **Accept** ⇒ value re-renders as `srgb( … )` with in-gamut numbers. |
| `NoneChannel` | A `none` channel renders as the text `none`; focusing it and typing starts a numeric edit. |
| `LegacyHex` (`"#1f75cb"`) | Renders the hex as editable monospace text; the space select shows `hex`; choosing `oklch` converts from the hex and the value becomes object form. |

## 4. In the running app (manual — end-to-end)

```bash
pnpm --filter web-app run init-config   # if not already configured
pnpm --filter web-app dev
```

Edit a `color` token in the tree:

1. Change a channel number inline → the token `$value` updates on Enter/blur;
   Escape mid-edit reverts.
2. Change the colour space via the select:
   - in-gamut target ⇒ applies immediately, numbers are the *same colour*
     (paste both function strings into any CSS colour tool to confirm), **not**
     the old raw numbers reinterpreted;
   - out-of-gamut / achromatic target ⇒ dialog first; Deny is a true no-op.
3. Confirm no `none` checkbox, no native colour picker, no separate hex field
   are present.
4. Tab through the control: order is space → c0 → c1 → c2 → alpha/`+ α`; focus
   shows the same solid-underline treatment as hover.
5. Long/precise values display in full (no rounding), just with trailing zeros
   trimmed.
6. **Configurable tolerance**: in `dtcg-editor.config`, set the `color` entry's
   `editorOptions.spaceSwitchTolerance` to `0` → every cross-space switch now
   shows the confirmation dialog. Set it to a large value (e.g. `1`) → even
   out-of-tolerance switches apply silently (gamut/undefined still show the
   dialog). Remove the field → behaviour returns to the `0.02` default. An
   invalid value (`-1`, `"x"`) fails `init-config` / config load.

## 5. Constitution / lint gates

```bash
pnpm lint            # ls-lint folder/name rules + biome
pnpm build           # sole type-checking gate (strict TS, all packages)
```

Manual design-system audit (Principle XII / FR-019): grep the editor for literal
design values — there should be none.

```bash
rg -n "#[0-9a-fA-F]{3,8}\b|[0-9]+px|[0-9]*\.?[0-9]+rem|box-shadow:|transition:" \
   packages/token-editor-color/src --glob '!*.test.*'
```

Expect: no matches outside `var(--dtcg-ed-*)` usage. The one allowed dynamic
value is a preview colour threaded as a CSS custom property (there is none in the
inline editor itself; `ColorPreview` is a separate, unchanged component).

## Done when

- Sections 1–2 pass in CI (`pnpm test`, `pnpm build`, `pnpm lint`).
- Section 3 stories all render and the dialog interaction works.
- `colorjs.io` stays in `packages/token-editor-color/package.json` and is **not**
  added to `packages/token-core/package.json`; `token-core` has no diff.
- `@dtcg-editor/design-system` is added to
  `packages/token-editor-color/package.json`.
- The design-system underline tokens/utility from research R6 exist (or the
  design-system change is filed and the editor references the agreed names with
  graceful `var()` fallback).
