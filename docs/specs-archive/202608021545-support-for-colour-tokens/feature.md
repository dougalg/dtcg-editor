# Feature: Support for Colour (Color) Tokens

## Summary

Adds a new `@dtcg-editor/token-type-color` package implementing the Token-Type Package Contract for DTCG's `color` `$type`, following the same shape as the existing `@dtcg-editor/token-type-dimension` package: a Zod schema for the DTCG 2025.10 Color module's `$value` shape, a `TokenTypeContract<ColorValue>` implementation, and a full editor component (colorSpace-aware swatch + picker). Unlike dimension, this feature does **not** make color tokens editable end-to-end — a prior scoping decision (see Out of Scope) defers the client (`TokenTree.tsx`'s `canEdit` gate) and server (`route.ts`'s edit-authorization gate) generalization that would make _any_ non-dimension type editable to the already-in-flight `fallback-token-editor` feature. This feature builds the color type package and registers it (inert for now) so that work is ready to plug in the moment that generalization lands, and in the meantime color tokens render read-only with a visual swatch.

Because a color `$value`'s correctness depends on its declared `colorSpace` (component count and numeric range both vary per space — see FR-02), and a malformed value must never break parsing or crash the tree view, this feature also introduces a color-specific, non-blocking "validation issue" display: an out-of-range or malformed color value still renders, but visibly flagged as needing user attention, distinct from a token that's simply read-only because it's a color.

A new sample token file exercises all of this against real-looking data.

## User Stories

- As a design system maintainer, I want to browse `color` tokens in the web app and see an accurate visual swatch of each color, so I can review a palette at a glance instead of reading raw `$value` JSON.
- As a design system maintainer, I want a color token whose `$value` doesn't match its declared `colorSpace`'s shape (wrong component count, out-of-range number, etc.) to still show up in the tree — flagged as having an issue — rather than crashing the page or silently being treated as a normal valid color.
- As a design system maintainer, I want my existing token files that use a bare hex string for `$value` (a common pre-2025-spec shorthand) to keep working without being flagged as broken.
- As a host app integrator, I want the color type package built to the same `TokenTypeContract` shape as dimension, so that when the fallback-editor generalization lands, color tokens become editable with zero further changes to this package.

## Functional Requirements

### FR-01: `@dtcg-editor/token-type-color` Package

New package mirroring `packages/token-type-dimension`'s structure (`color.ts` schema/types, `editor.tsx` UI, `token-type.ts` contract wiring, `index.ts`), consumed the same way `dimensionTokenType` is consumed today.

- `ColorValueSchema` (Zod) validates the DTCG 2025.10 Color module's object shape:
  - `colorSpace`: one of `"srgb"`, `"srgb-linear"`, `"hsl"`, `"hwb"`, `"lab"`, `"lch"`, `"oklab"`, `"oklch"`, `"display-p3"`, `"a98-rgb"`, `"prophoto-rgb"`, `"rec2020"`, `"xyz-d65"`, `"xyz-d50"` (required).
  - `components`: exactly 3 elements, each either a number or the literal string `"none"` (required).
  - `alpha`: number, optional (absent means fully opaque, per spec — not defaulted/rewritten at parse time, only treated as `1` wherever alpha is consumed).
  - `hex`: 6-digit `#RRGGBB` string, optional.
- `colorTokenType: TokenTypeContract<ColorValue>` exports `type: "color"`, the schema, an identity-ish `serializeValue`, and the FR-04 `Editor`.
- `resolveEffectiveType`/`applyTokenEdits`/`token-core` require **no changes** — `$value` stays opaque `unknown` at that layer per the existing Token-Type Package Contract; all color-specific logic lives in this new package plus the app-layer wiring in FR-05/FR-06.

### FR-02: Full Per-ColorSpace Component Validation (Non-Blocking)

Each `colorSpace` has its own exact component count and per-component numeric range/count, per the DTCG 2025.10 Color module spec (verified against `designtokens.org/tr/2025.10/color/`, not assumed from memory):

| colorSpace                                                                | components (in order) | ranges                                 |
| ------------------------------------------------------------------------- | --------------------- | -------------------------------------- |
| `srgb`, `srgb-linear`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020` | R, G, B               | each `[0, 1]`                          |
| `xyz-d65`, `xyz-d50`                                                      | X, Y, Z               | each `[0, 1]`                          |
| `hsl`                                                                     | H, S, L               | H `[0, 360)`, S/L `[0, 100]`           |
| `hwb`                                                                     | H, W, B               | H `[0, 360)`, W/B `[0, 100]`           |
| `lab`                                                                     | L, a, b               | L `[0, 100]`, a/b unbounded            |
| `lch`                                                                     | L, C, H               | L `[0, 100]`, C `[0, ∞)`, H `[0, 360)` |
| `oklab`                                                                   | L, a, b               | L `[0, 1]`, a/b unbounded              |
| `oklch`                                                                   | L, C, H               | L `[0, 1]`, C `[0, ∞)`, H `[0, 360)`   |

Any component may be `"none"` regardless of colorSpace (spec-wide allowance for a missing/powerless channel), which always passes range validation for that slot.

- A dedicated validation function (e.g. `checkColorValueIssues(value: ColorValue): string[]`) runs the per-space table above and returns a list of human-readable issue strings (empty if fully valid) — this is **separate from** `ColorValueSchema`'s structural parse (which only checks the generic 3-numbers-or-`"none"` shape) so a structurally-valid-but-out-of-range value still parses and displays.
- This check never throws and never prevents the token, its file, or the tree view from rendering — it only feeds FR-05's issue display. This mirrors, but is distinct from, the sibling `fallback-token-editor` feature's file-level "non-standard `$type`" badge (FR-03 of that feature): this check is about a _malformed value for a recognized type_, not an unrecognized `$type` string, and is scoped entirely to color tokens within `TokenTree.tsx` — no changes to `scan.ts`/`FolderOverview.tsx`.

### FR-03: Legacy Bare-Hex `$value` Acceptance

`ColorValueSchema`/`ColorValue` additionally accepts a plain 6-digit hex string (e.g. `"#ff00ff"`) as a valid `$value` for a `color`-typed token, alongside the FR-01 object shape.

- **This is a deliberate, explicitly-flagged deviation from the DTCG 2025.10 spec**, which only defines the object shape for `color` `$value` — per `docs/project.md`'s "DTCG spec compliance is mandatory... any deviation must be flagged explicitly" constraint. It exists for compatibility with real-world token files authored against pre-2025 draft conventions that used a bare hex string.
- A bare-hex value is treated as fully valid (no FR-02 issue) — it is definitionally an sRGB hex value, so there's nothing to range-check.
- How a legacy bare-hex token's `$value` normalizes if a user later _edits_ it (once editing unlocks, out of scope for this feature) is an open question, deferred to whenever the `fallback-token-editor` generalization actually makes color tokens editable.

### FR-04: Color Editor UI (Built Now, Inert Until Editing Unlocks)

`ColorEditor` (this package's `Editor`) provides:

- A visual swatch preview, rendered as a plain element with its background set via a **native CSS color function string** built from the value's `colorSpace`/`components`/`alpha` (e.g. `hsl(210 50% 40%)`, `oklch(0.7 0.15 200 / 0.5)`, `color(display-p3 1 0 0.5)`, `lab(50% 40 59.5)`) — modern browsers render CSS Color 4/5 syntax for all 14 spaces natively, so no color-space-conversion math or new dependency is needed to preview any of them accurately. A legacy bare-hex value previews directly as that hex color.
- Editable controls: a `colorSpace` `<select>`, one input per component (numeric, with a way to set/unset `"none"` for the slots where the spec allows it), an `alpha` numeric input, and an optional `hex` text field — exact control layout/markup is decided at `/sdd-plan` time, following `DimensionEditor`'s existing visible-`<label>` pattern.
- Per the `TokenTypeContract` shape, `Editor` is a fully controlled `(value, onChange)` component like `DimensionEditor` — it does not itself know whether it's reachable/rendered; that gating is entirely `TokenTree.tsx`'s job (unchanged by this feature, see Out of Scope).

### FR-05: Read-Only Rendering With Swatch + Issue Display

`TokenTree.tsx`'s existing read-only branch (`!canEdit`) gains color-specific rendering for a token whose `effectiveType === colorTokenType.type`:

- Renders the FR-04 swatch preview alongside the existing name/type/value fields (value still shown via the existing generic text display too, for tokens where a quick glance at raw `$value` is still useful).
- If FR-02's issue check returns any issues, renders them visibly (e.g. `role="alert"` list, following this file's existing `errors?.value` visual convention) directly on that token's row — always visible for an invalid value, not just after a user interaction, since color tokens don't support interactive editing yet.
- A color token stays on the existing generic read-only branch structurally (no new component tree shape); this is additive rendering within that branch, not a fork of it.

### FR-06: Built-In Registry Entry (Inert)

`colorTokenType` is added to `apps/web-app/lib/token-editors/built-in.ts`'s `BUILT_IN_TOKEN_TYPES`/`builtInContractsByType`, exactly like `dimensionTokenType`.

- Because `TokenTree.tsx`'s `canEdit` (`apps/web-app/components/TokenTree.tsx:89-93`) is currently hard-coded to `node.effectiveType === dimensionTokenType.type`, registering `color` here has **no editing effect today** — `resolveEditorForType` is only ever consulted when `canEdit` is already `true`, so a color token still renders via FR-05's read-only path regardless of this registration. This is the intended "ready to plug in" state from the Summary — no changes to `TokenTree.tsx`'s `canEdit` logic or to `route.ts`'s edit-authorization gate are made by this feature.

### FR-07: Sample Color Token File

A new `sample_data/color_scale.tokens.json`, structured like the existing `sample_data/spacing_scale.tokens.json` (same `$extensions.com.figma.scopes` convention, same nesting style), containing `color`-typed tokens that exercise:

- Several distinct `colorSpace` values (at minimum `srgb`, `hsl`, `oklch`, and `display-p3`), each with a valid, in-range value.
- At least one value using the `"none"` component keyword.
- At least one legacy bare-hex `$value` (FR-03).
- At least one deliberately out-of-range/malformed value (FR-02) to exercise the non-blocking issue display end-to-end.
- Authored fresh for this repo in the same visual style as GitLab's Pajamas Design System color tokens (naming conventions, `$extensions` shape) rather than a byte-for-byte copy of an external file — a canonical machine-readable Pajamas color-tokens JSON export wasn't readily locatable to pull verbatim; flagging this so it can be swapped for a real exported file later if one turns up.

## Acceptance Criteria

- [x] AC-01: `@dtcg-editor/token-type-color` exports `colorTokenType: TokenTypeContract<ColorValue>` with `type === "color"`.
- [x] AC-02: `ColorValueSchema` accepts a structurally valid object `$value` for all 14 listed color spaces, and accepts a bare 6-digit hex string.
- [x] AC-03: `checkColorValueIssues` returns issue strings for an out-of-range or wrong-component-count value per the FR-02 table, and returns no issues for any in-range value or a `"none"` component, and returns no issues for a legacy bare-hex value.
- [x] AC-04: In the web app, a `color` token renders a visual swatch matching its declared value (spot-checked against at least `srgb`, `hsl`, `oklch`, `display-p3`, and a legacy hex value).
- [x] AC-05: A color token with a malformed/out-of-range value still renders (no crash, no file-level failure) with its issue(s) visibly displayed.
- [x] AC-06: `sample_data/color_scale.tokens.json` exists, parses successfully via `parseTokenFile`, and contains the FR-07 coverage (multiple colorSpaces, a `"none"` component, a legacy hex value, one deliberately invalid value).
- [x] AC-07: No changes to `packages/token-core`, `TokenTree.tsx`'s `canEdit` logic, or `route.ts`'s edit-authorization gate — color tokens remain non-editable through this feature, confirmed by an existing or new test attempting a `PATCH` edit to a color token and getting the same rejection a color token gets today (as an untyped/non-dimension token).
- [x] AC-08: All existing dimension-editing tests/behavior continue to pass unmodified.

## Technical Scope

### Affected Modules

- New package: `packages/token-type-color` (mirrors `packages/token-type-dimension`).
- `apps/web-app/lib/token-editors/built-in.ts` — registry entry (FR-06).
- `apps/web-app/components/TokenTree.tsx` (+ `.module.css`) — read-only swatch/issue rendering (FR-05); explicitly _not_ its `canEdit` gate.
- `sample_data/` — new `color_scale.tokens.json` (FR-07).

### New Components Required

- `ColorEditor` (`packages/token-type-color/src/editor.tsx`) — built per FR-04, registered but unreachable via the UI until the `fallback-token-editor` feature generalizes `canEdit`.
- A color-value issue-checking function (FR-02), package location decided at `/sdd-plan` time (likely alongside `ColorValueSchema` in the same package, since it's color-specific domain logic, not generic app logic).

### Integration Points

- `TokenTypeContract` (`@dtcg-editor/token-type-contract`) — implemented as-is, no contract changes needed.
- `resolveEffectiveType` (`token-core`) — reused as-is to determine a node's effective type for both FR-05's rendering branch and the FR-06 registry lookup.
- Depends on (does not implement) the `fallback-token-editor` feature's future generalization of `TokenTree.tsx`'s `canEdit` and `route.ts`'s edit-authorization gate to actually make color tokens editable — tracked there, not here.

## Non-Functional Requirements

- **Performance**: swatch rendering is pure CSS (no client-side color-space-conversion computation), so no measurable rendering cost beyond any other styled element.
- **Security**: no new external data/input surface — `$value` already flows through the existing Validation at the Edges (`parseTokenFile`) and per-type schema layers; FR-02's issue check is read-only analysis, not a new trust boundary.
- **Minimal Dependencies**: no new package. The FR-04 swatch relies entirely on native CSS Color 4/5 function syntax (`hsl()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color(<predefined-space> ...)`), which covers all 14 DTCG color spaces natively in evergreen browsers.
- **DTCG Spec Compliance**: the object `$value` shape and all per-colorSpace ranges (FR-01/FR-02) are taken directly from the 2025.10 Color module spec (`designtokens.org/tr/2025.10/color/`), verified during spec-writing, not approximated. The one deliberate deviation (FR-03, legacy bare-hex) is explicitly flagged per this repo's spec-deviation convention.

## Out of Scope

- **Making color tokens actually editable** (client `canEdit` gate, server `route.ts` edit-authorization gate) — explicitly deferred to the in-flight `fallback-token-editor` feature, per this feature's own scoping decision (see Summary). This feature only builds and inert-registers the color type package.
- **Configurable/host-app-selectable color-space support** — a separate backlog item ("Allow the runner to specify in config which colour spaces are available") now exists for letting a host app restrict/extend supported color spaces via config; this feature hard-codes support for all 14 spec spaces with no config toggle.
- **Non-standard/arbitrary custom token types beyond `color`** — covered by a separate backlog item ("Allow the runner to specify in config additional non-standard token types to support...").
- File-level "non-standard `$type`" badge/detection (unrecognized `$type` strings) — that is the `fallback-token-editor` feature's FR-03, a different mechanism from this feature's FR-02 per-value issue check.
- Exact conversion/normalization behavior when an already-legacy-bare-hex color token is edited (moot until editing unlocks).
- Any changes to `token-core`'s parsing/round-trip logic — `$value` remains fully opaque at that layer for every token type, per the existing Token-Type Package Contract.

## Open Questions

- Whether a real, machine-readable GitLab Pajamas color-tokens export exists and should replace FR-07's fresh-authored sample file once located.
- Exact `ColorEditor` control layout (per-colorSpace dynamic field labels, how `"none"` is toggled per component) — deferred to `/sdd-plan`.
- Whether `checkColorValueIssues`' issue strings should be structured/typed (for potential future reuse, e.g. by a summary badge) or remain plain strings — deferred to `/sdd-plan` given no current second consumer.
