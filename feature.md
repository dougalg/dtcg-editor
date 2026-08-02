# Feature: Configurable Color Spaces + Interactive Color Picker

## Summary

Extends the existing color-token support (`@dtcg-editor/token-type-color`, shipped read/write in the "Support for Colour Tokens" feature) in two ways that were explicitly deferred by that feature and by the standing backlog: (1) a host app's `dtcg-editor.config.mts` can restrict which of the DTCG 2025.10 Color module's 14 `colorSpace` values are offered when authoring a color token, and (2) `ColorEditor` gains a genuinely interactive native color picker, usable regardless of which `colorSpace` is currently selected, that updates the existing numeric/hex fields on pick and stays live-synced with them afterward.

Both halves share a common mechanism: `TokenEditorExtension` (a host app's per-type editor registration) gains an optional, type-specific `editorOptions` field, validated once at config-load time against an optional schema a token-type package can declare on its `TokenTypeContract`. `color` is the first (and, for this feature, only) consumer of that mechanism.

## User Stories

- As a host app integrator, I want to restrict which color spaces are offered to authors editing color tokens (e.g. only `srgb`/`hsl`/`oklch`), so my team can't introduce colorSpace variety my downstream tooling doesn't support.
- As a design system maintainer, I want to pick a color visually instead of typing raw numeric components, so authoring a color token doesn't require me to already know its target colorSpace's numeric encoding.
- As a design system maintainer, after picking a color visually I want to fine-tune the resulting numeric components by hand, so the picker is a starting point rather than the only way to set a precise value.
- As a design system maintainer, I want an existing color token whose colorSpace isn't in my team's configured allow-list to keep working (reading, displaying, saving edits to its name/description/other components) rather than breaking or becoming read-only, so tightening the config later can't corrupt files that already exist.

## Functional Requirements

### FR-01: `DtcgTokenType`-Typed Extension Registration

`TokenEditorExtension.type` (`apps/web-app/lib/token-editors/types.ts`) changes from plain `string` to `DtcgTokenType` (from `@dtcg-editor/token-core`), giving a config author real autocomplete/type-checking on which `$type` an extension entry targets. This reverses the 2026-08-01 Architecture Decision that kept it as `string` — that decision's reasoning (a config author can bypass the type checker, so `defineConfig` remains the real enforcement point) still holds and is unchanged; the union is added purely for authoring DX, not as a new enforcement mechanism. `defineConfig`'s existing runtime check (`isDtcgTokenType`) remains the actual gate for a bypassed/`as any` type value.

### FR-02: `editorOptions` on `TokenEditorExtension`

`TokenEditorExtension` (`apps/web-app/lib/token-editors/types.ts`) gains a new optional field:

```ts
readonly editorOptions?: unknown;
```

`editor` remains required — there is no fallback-merge between a user's extension entry and the built-in entry for the same type. A host app wanting the built-in editor with custom options re-supplies it explicitly, e.g.:

```ts
extensions: [
  { type: "color", editor: ColorEditor, editorOptions: defineColorConfig({ colorSpaces: ["srgb", "hsl", "oklch"] }) },
],
```

`resolveEditorForType` (`apps/web-app/lib/token-editors/resolve-editor.ts`) returns `{ editor, editorOptions } | undefined` instead of a bare editor reference, keeping its existing first-match-wins whole-entry lookup unchanged otherwise.

### FR-03: `editorOptionsSchema` on `TokenTypeContract`

`TokenTypeContract<TValue>` (`@dtcg-editor/token-type-contract`) gains an optional field:

```ts
readonly editorOptionsSchema?: z.ZodType<unknown>;
```

`defineConfig` (`apps/web-app/lib/token-editors/define-config.ts`), when validating an `extensions[i]` entry whose `editorOptions` is not `undefined`, resolves that type's built-in contract (via `resolveBuiltInContract`) and — if it declares an `editorOptionsSchema` — validates `editorOptions` against it, folding any Zod issues into the existing `DtcgEditorConfigError` issue list (same fail-fast-at-config-load behavior as every other validation error in this function). A type with no built-in contract, or a built-in contract with no `editorOptionsSchema`, does not validate `editorOptions` at all — it passes through as opaque `unknown`, matching how non-built-in types are already trusted as-is elsewhere in this file. No other built-in type declares `editorOptionsSchema` as part of this feature — the mechanism is generic, `color` is its only consumer.

### FR-04: `ColorEditorOptions` + `defineColorConfig`

`@dtcg-editor/token-type-color` exports:

- `ColorEditorOptions`: `{ readonly colorSpaces?: readonly ColorSpace[] }`.
- `ColorEditorOptionsSchema`: a Zod schema for the above, requiring `colorSpaces` (when present) to be a non-empty array of valid `ColorSpace` enum values — an explicitly empty array is rejected as invalid config (fails fast in `defineConfig`, consistent with how other malformed config already fails there) rather than silently producing a picker with zero selectable spaces.
- `defineColorConfig(options: ColorEditorOptions): ColorEditorOptions`: a typed identity helper giving compile-time type-checking/autocomplete when authoring `editorOptions` for a color extension entry. It performs no runtime validation itself — `defineConfig`'s `editorOptionsSchema` check (FR-03) remains the actual enforcement point, so a config author bypassing this helper (raw object literal, `as any`, etc.) is still caught.
- `colorTokenType`'s `TokenTypeContract` gains `editorOptionsSchema: ColorEditorOptionsSchema`.

When `colorSpaces` is omitted entirely (no extension entry, or an entry with no `editorOptions`), all 14 spaces remain available — zero-config behavior is unchanged.

### FR-05: Authoring-Only colorSpace Restriction

`ColorEditor`'s colorSpace `<select>` (`packages/token-type-color/src/editor.tsx`) offers only the configured `colorSpaces` (or all 14 if unset). This restriction is authoring-only:

- An existing token whose current colorSpace is _not_ in the configured allow-list still parses, displays (swatch + numeric fields), round-trips on save, and remains editable for its other fields (name, description, its own numeric components, alpha, hex) exactly as today.
- That token's current (now-disallowed) colorSpace stays selected in the dropdown as the active value even though it isn't one of the offered options, so the user doesn't lose the ability to edit its other fields — but switching the dropdown away from it means it can no longer be re-selected.
- No new server-side (`route.ts`) validation is introduced by this restriction — it is a client-side authoring affordance only, per the scope decision above.

### FR-06: Native Color Picker (`ObjectColorEditor` and `LegacyHexColorEditor`)

Both editor branches in `packages/token-type-color/src/editor.tsx` gain a native `<input type="color">`, wired regardless of which colorSpace (or the legacy bare-hex path) is currently active:

- Picking a color converts the resulting sRGB hex into the currently-selected colorSpace's numeric components (or directly into the hex value, for the legacy path) and updates those fields immediately. The user can continue tweaking the resulting numeric/hex fields by hand afterward.
- The picker's own displayed color stays live-synced with the current value: any manual edit to the numeric/hex fields (or a colorSpace switch) reconverts the current value to sRGB hex and updates the native input's `value`, so the picker never visually diverges from the fields it's paired with.
- Alpha is untouched by the picker in all cases — native `<input type="color">` has no alpha channel, and the existing separate "Has alpha"/alpha-value fields are unaffected by picking.
- A value outside the sRGB gamut (e.g. a valid `rec2020`/`display-p3` value the sRGB-limited native input can't represent exactly) displays and converts through the picker as a clipped sRGB approximation — an accepted, documented limitation of using the native control, not a defect.
- The picker input has a real visible `<label>` (not `aria-label`-only), matching this repo's existing field-labeling convention, and is included in this repo's enforced WCAG 2.2 AA test suites (the `a11y` Vitest browser project and the Playwright keyboard-only flow) exactly like every other interactive field in the tree.

### FR-07: Color-Space Conversion

A new color-conversion dependency is added to `packages/token-type-color` to support FR-06's two-way conversion between sRGB hex and each of the 14 `ColorSpace` values' numeric components. Candidate library, exact version, and the Minimal Dependencies justification write-up (what a hand-rolled alternative would cost and why it falls short) are decided in `plan.md`, not here — this FR only establishes that a dependency (not hand-rolled math) is the chosen approach, per the earlier scoping discussion.

## Acceptance Criteria

- [ ] AC-01: `TokenEditorExtension.type` is typed as `DtcgTokenType`; a config author gets IDE autocomplete for valid `$type` values, and `defineConfig` still rejects an invalid runtime `type` string exactly as before.
- [ ] AC-02: An `extensions` entry with `editorOptions` but no valid `editor` function still fails `defineConfig` validation (i.e. `editor` remains required) with a clear `DtcgEditorConfigError`.
- [ ] AC-03: `defineConfig({ extensions: [{ type: "color", editor: ColorEditor, editorOptions: { colorSpaces: ["cmyk"] } }] })` (an invalid colorSpace) throws `DtcgEditorConfigError` at config load, not later.
- [ ] AC-04: `defineConfig({ extensions: [{ type: "color", editor: ColorEditor, editorOptions: { colorSpaces: [] } }] })` (empty allow-list) throws `DtcgEditorConfigError` at config load.
- [ ] AC-05: With `colorSpaces: ["srgb", "hsl"]` configured, `ColorEditor`'s colorSpace dropdown offers only `srgb` and `hsl` for a token not already using a different space.
- [ ] AC-06: A token already using a colorSpace outside the configured allow-list (e.g. `lab`) still renders, is still editable (name/description/components/alpha/hex), and its current colorSpace remains the active dropdown value even though not offered as a switch-to option.
- [ ] AC-07: Saving an edit to a token whose colorSpace is outside the configured allow-list succeeds server-side (no new PATCH rejection introduced by this feature).
- [ ] AC-08: Reading/rendering an existing token file with a colorSpace outside the configured allow-list never fails to parse or drops data on round-trip (save-with-no-edits reproduces the same parsed data).
- [ ] AC-09: Using the native color picker on any colorSpace (not just sRGB-family) updates that colorSpace's numeric component fields to a value visibly consistent with the picked color.
- [ ] AC-10: After picking, manually editing a numeric component field updates the native picker's own displayed color to match.
- [ ] AC-11: Picking a color never changes the token's alpha value or alpha-enabled state.
- [ ] AC-12: The native picker input has a real visible `<label>` and introduces zero new axe-core WCAG 2.2 AA violations in the existing `a11y` Vitest project; the existing Playwright keyboard-only flow can still reach and operate every field including the new picker.
- [ ] AC-13: `defineColorConfig({ colorSpaces: [...] })` type-checks against `ColorEditorOptions` and is usable directly as an `editorOptions` value with no cast.

## Technical Scope

### Affected Modules

- `packages/token-type-contract` — `TokenTypeEditorProps` (`options?: unknown`), `TokenTypeContract` (`editorOptionsSchema?`).
- `packages/token-type-color` — `ColorEditorOptions`/`ColorEditorOptionsSchema`/`defineColorConfig` (new), `editor.tsx` (native picker + live sync in both `ObjectColorEditor` and `LegacyHexColorEditor`), new color-conversion module, `token-type.ts` (`editorOptionsSchema` wiring).
- `apps/web-app/lib/token-editors/types.ts` — `TokenEditorExtension.type` → `DtcgTokenType`, `editorOptions?` field.
- `apps/web-app/lib/token-editors/define-config.ts` — `editorOptions` validation against a resolved built-in contract's `editorOptionsSchema`.
- `apps/web-app/lib/token-editors/resolve-editor.ts` — return shape change (`{ editor, editorOptions }`).
- `apps/web-app/components/TokenTree.tsx` — thread `resolvedEditorOptions` into the generic editor render path.
- `apps/web-app/dtcg-editor.config.mts` — optional sample update demonstrating `defineColorConfig`/`colorSpaces` usage.
- `docs/project.md` — new Approved Dependencies entry for the color-conversion library (added at plan/implement time, per Minimal Dependencies process).

### New Components Required

- Native `<input type="color">` control embedded in `ObjectColorEditor` and `LegacyHexColorEditor`.
- sRGB-hex ⇄ per-colorSpace numeric-component conversion functions (backed by the new dependency, FR-07).
- `defineColorConfig` typed helper and `ColorEditorOptionsSchema`.

### Integration Points

- `defineConfig` (existing config-load validation pipeline).
- `resolveBuiltInContract`/`resolveEditorForType` (existing editor-resolution pipeline).
- Existing `a11y` Vitest browser project and Playwright keyboard-only suite (new assertions, no new suite).

## Non-Functional Requirements

- **Performance**: color-space conversion runs client-side on every relevant field change (picker pick, manual tweak) — expected cheap (small fixed-size matrix/formula math per DTCG spec conversions), no debouncing required at this scope.
- **Security**: no new trust boundary — `editorOptions` originates from the host app's own authored config file (already a named Validation-at-the-Edges boundary), validated once at config load like the rest of that file's contents.
- **Accessibility**: new picker input must pass the existing enforced (non-warn-only) WCAG 2.2 AA axe-core checks and remain reachable via the existing keyboard-only Playwright flow — no exemption from either suite.
- **Bundle size**: the new color-conversion dependency's size/tree-shakability is a plan-time selection criterion (Minimal Dependencies justification), not resolved here.

## Out of Scope

- Restricting the legacy bare-hex authoring path via `colorSpaces` — that config only gates the 14 real DTCG `colorSpace` object-shape values; legacy hex remains always authorable.
- Any other built-in token type consuming `editorOptions`/`editorOptionsSchema` — the mechanism is generic (FR-02/FR-03), but `color` is its only consumer added by this feature.
- Server-side (`route.ts`) rejection of edits based on `colorSpaces` — restriction is authoring-only (FR-05); no new PATCH-time validation.
- Selecting the exact color-conversion library, or writing its Minimal Dependencies justification — deferred to `/sdd-plan`.
- True wide-gamut/HDR-faithful picking or display through the native control — inherent sRGB limitation of `<input type="color">`, accepted per FR-06.
- Any change to `token-core`'s parsing/round-trip logic — unaffected by either half of this feature.
- A custom (non-native) picker widget (canvas/gradient-based hue-saturation-lightness picker, eyedropper, etc.) — explicitly decided against in favor of the native control.

## Open Questions

- Exact color-conversion library choice and version — resolved in `/sdd-plan`.
- Exact UI placement/layout of the new picker input relative to the existing colorSpace dropdown and numeric fields within `ObjectColorEditor`/`LegacyHexColorEditor` — deferred to `/sdd-plan`, following this repo's established pattern of leaving exact control layout to the plan step (see the original color-tokens feature's own Open Questions).
- Whether `checkColorValueIssues`-flagged out-of-range values should suppress/disable the picker's conversion (e.g. converting an already-out-of-range component) or simply operate on whatever numeric values are currently staged, issues notwithstanding — deferred to `/sdd-plan`.
