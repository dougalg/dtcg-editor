# Implementation Plan: Support for Colour (Color) Tokens

## Overview

Add a new `packages/token-type-color` package implementing the Token-Type Package Contract for DTCG's `color` `$type`, mirroring `packages/token-type-dimension`'s structure exactly (schema module, editor component, contract-wiring module, barrel `index.ts`). Register it in `apps/web-app`'s built-in editor registry the same way `dimensionTokenType` is registered — but deliberately leave `TokenTree.tsx`'s `canEdit` gate and `route.ts`'s server-side edit-authorization gate untouched, so color tokens stay non-editable in the running app until the separate `fallback-token-editor` feature generalizes those two gates. Add read-only-path rendering in `TokenTree.tsx` for a visual swatch (built from native CSS Color 4/5 function strings — no new dependency) and a non-blocking, always-visible list of per-colorSpace validation issues. Add a new sample token file exercising the coverage `feature.md`'s FR-07 calls for.

## Architecture Decisions

- **New package boundary**: color-specific validation (`ColorValueSchema`, the per-colorSpace range checker, the CSS-color-string builder) and the `ColorEditor` UI live entirely inside `packages/token-type-color`, never in `apps/web-app` or `packages/token-core` — matches the existing Token-Type Package Contract precedent (dimension) and the "core engine never hard-codes a specific type" principle in `docs/project.md`.
- **App-layer wrapper for display, mirroring `validateDimensionValue`**: `apps/web-app/lib/tokens/edit-state.ts` already wraps `dimensionTokenType.valueSchema.safeParse` in an app-local `validateDimensionValue` function used only by `TokenTree.tsx`. This plan adds an analogous app-local `describeColorForDisplay` (new file `apps/web-app/lib/tokens/color-display.ts`, not `edit-state.ts` itself — `edit-state.ts` is edit-focused, this is read-only-display-focused, and `describeColorForDisplay` never produces a `ClientEdit`) that composes the package's `ColorValueSchema` + `checkColorValueIssues` + `colorValueToCssColor` into one call `TokenTree.tsx` uses for its read-only rendering. This keeps the package itself free of any "how to display an issue" concern (that's app UI policy) while keeping `TokenTree.tsx` itself thin.
- **Swatch preview via native CSS, not a conversion library**: `colorValueToCssColor` builds a CSS Color 4/5 function-string (`hsl()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color(<predefined-space> ...)`) directly from `colorSpace`/`components`/`alpha` and lets the browser's own CSS engine do all color-space math — zero new dependency, per the Minimal Dependencies constraint. This same function is reused by `ColorEditor`'s own live swatch, so there is exactly one color→CSS-string implementation in the codebase.
- **Registering `color` in `built-in.ts` is intentionally inert today**: `BUILT_IN_TOKEN_TYPES`/`builtInContractsByType` gain a `color` entry exactly like `dimension`'s, but `TokenTree.tsx`'s `canEdit` (currently `node.effectiveType === dimensionTokenType.type`) and `route.ts`'s `patchTokenFile` (currently gated on `dimensionTokenType.type`) are **not modified** by this plan — confirmed by the existing `route.test.ts` test `"PATCH returns 400 when attempting to edit a non-dimension token"` (which already uses a `color`-typed fixture) continuing to pass unmodified. This is the explicit sequencing decision from `feature.md`'s Summary/Out of Scope.
- **Structural-parse failures and range-check failures are both "issues," reported together**: `describeColorForDisplay` returns `{ cssColor: string | undefined; issues: readonly string[] }`. If `ColorValueSchema.safeParse` itself fails (wrong shape entirely — missing `colorSpace`, wrong `components` length, etc.), there is no valid `ColorValue` to build a swatch from, so `cssColor` is `undefined` and `issues` holds the Zod error messages. If the schema parse succeeds, `cssColor` is always computable (CSS tolerates out-of-gamut/out-of-range numbers by clamping) and `issues` holds `checkColorValueIssues`'s per-colorSpace range violations (empty when fully valid). A legacy bare-hex string (FR-03) always parses successfully with zero issues and a directly-usable `cssColor` (the hex itself).
- **No changes to `packages/token-core`**: `$value` remains opaque `unknown` at that layer for every token type, unchanged by this feature (per `feature.md`'s AC-07 and Out of Scope).

## Implementation Steps

### Step 1: `@dtcg-editor/token-type-color` Package Scaffold

- [x] `packages/token-type-color/package.json` — copy `packages/token-type-dimension/package.json`, renaming `name` to `@dtcg-editor/token-type-color`; same `dependencies` (`@dtcg-editor/token-type-contract`, `react`, `zod`) and `devDependencies`.
- [x] `packages/token-type-color/tsconfig.json` — identical to `packages/token-type-dimension/tsconfig.json`.
- Files: `packages/token-type-color/package.json`, `packages/token-type-color/tsconfig.json`.

### Step 2: Color Value Schema + Per-ColorSpace Issue Checker

- [x] `packages/token-type-color/src/color.ts`:
  - `ColorSpace` union type + `COLOR_SPACES` const array of all 14 values (`srgb`, `srgb-linear`, `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`, `xyz-d65`, `xyz-d50`).
  - `ColorComponent = number | "none"` (Zod: `z.union([z.number(), z.literal("none")])`).
  - `ColorObjectValueSchema`: `{ colorSpace: z.enum(COLOR_SPACES), components: z.tuple([ColorComponentSchema, ColorComponentSchema, ColorComponentSchema]), alpha: z.number().optional(), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }`.
  - `LegacyHexColorValueSchema`: `z.string().regex(/^#[0-9a-fA-F]{6}$/)` (FR-03).
  - `ColorValueSchema = z.union([ColorObjectValueSchema, LegacyHexColorValueSchema])`; `ColorValue = z.infer<typeof ColorValueSchema>`.
  - `COMPONENT_RANGES: Record<ColorSpace, readonly [ComponentRange, ComponentRange, ComponentRange]>` — a data table encoding the FR-02 table (`{ min, max, exclusiveMax? }` per slot; hue channels use `exclusiveMax: 360`; unbounded channels use `min: -Infinity, max: Infinity`).
  - `checkColorValueIssues(value: ColorValue): string[]` — returns `[]` immediately for a legacy hex string (`typeof value === "string"`); otherwise looks up `COMPONENT_RANGES[value.colorSpace]` and checks each of the 3 `components` entries (skipping any `"none"` entry) against its range, pushing a human-readable message (e.g. `"srgb component 0 (R) must be between 0 and 1, got 1.4"`) per violation.
- [x] `packages/token-type-color/src/color.test.ts` (mirrors `dimension.test.ts`'s style, `node --test`):
  - `ColorObjectValueSchema`/`ColorValueSchema` accepts one valid value per all 14 color spaces.
  - Accepts a `"none"` component.
  - Accepts a legacy bare-hex string.
  - Rejects a wrong-length `components` array, a non-enum `colorSpace`, and a malformed `hex` (7 chars, missing `#`).
  - `checkColorValueIssues` returns `[]` for an in-range value in at least 3 different color spaces (one 0–1 RGB-like, one 0–360/percent like `hsl`, one unbounded like `lab`).
  - `checkColorValueIssues` returns a non-empty array for an out-of-range value in at least 2 color spaces (e.g. `hsl` hue `400`, `srgb` component `1.5`).
  - `checkColorValueIssues` returns `[]` for a value containing a `"none"` component that would otherwise be out of range if it were a number.
  - `checkColorValueIssues` returns `[]` for a legacy hex string.
- Files: `packages/token-type-color/src/color.ts`, `packages/token-type-color/src/color.test.ts`.

### Step 3: CSS Swatch Color Builder

- [x] `packages/token-type-color/src/css-color.ts`:
  - `colorValueToCssColor(value: ColorValue): string` — for a legacy hex string, returns it directly. For the object shape, dispatches on `colorSpace`:
    - RGB-like spaces (`srgb`, `srgb-linear`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`) → `` `color(${colorSpace} ${c0} ${c1} ${c2}${alpha !== undefined ? ` / ${alpha}` : ""})` ``.
    - `xyz-d65`/`xyz-d50` → same `color(...)` form (both are valid CSS `color()` predefined spaces).
    - `hsl` → `` `hsl(${h} ${s}% ${l}%${alpha !== undefined ? ` / ${alpha}` : ""})` ``.
    - `hwb` → `` `hwb(${h} ${w}% ${b}%...)` ``.
    - `lab`/`lch`/`oklab`/`oklch` → their respective CSS function names, passing components positionally (`lab(L a b)`, `lch(L C H)`, `oklab(L a b)`, `oklch(L C H)`), each with the optional `/ alpha` suffix.
    - A `"none"` component is passed through literally as the CSS keyword `none` (valid in every one of these CSS color functions per CSS Color 4/5), not converted to a number.
- [x] `packages/token-type-color/src/css-color.test.ts` — one test per colorSpace-family asserting the exact expected CSS string for a known input (including one case with `alpha` and one with a `"none"` component), plus a legacy-hex-string passthrough test.
- Files: `packages/token-type-color/src/css-color.ts`, `packages/token-type-color/src/css-color.test.ts`.

### Step 4: `ColorEditor` Component

- [x] `packages/token-type-color/src/editor.tsx` (mirrors `editor.tsx`'s `"use client"`, visible-`<label>` pattern from `DimensionEditor`):
  - Swatch: a `<span>` with inline `style={{ backgroundColor: colorValueToCssColor(value) }}`, sized/bordered via a co-located `editor.module.css` (new file) rather than more inline style, matching this repo's existing preference for CSS Modules over inline styles where more than a single dynamic property is involved (the dynamic `backgroundColor` itself stays inline, since it's the one genuinely per-instance value).
  - `colorSpace` `<select>` (options = `COLOR_SPACES`), each wrapped in a visible `<label>` per this repo's field-label convention.
  - Three component inputs (numeric `<input type="number">`, with a checkbox or a dedicated "none" option alongside each to represent the `"none"` keyword — simplest correct approach: a `<input type="number">` plus a sibling `<input type="checkbox">` labeled e.g. `"{component} is none"` that, when checked, disables the number input and stages `"none"` for that slot).
  - `alpha` numeric input (optional — an unchecked "has alpha" checkbox omits the field entirely from `onChange`'s emitted value, matching the schema's `optional()`).
  - `hex` text input (optional, free-form, validated against the 6-digit pattern only on change — an invalid entry doesn't call `onChange`, mirroring `DimensionEditor`'s no-op-on-invalid pattern... actually simpler: hex is advisory metadata alongside the object shape, so validate on blur/change and only include it in the emitted value when it matches the pattern).
  - Fully controlled: `(value: ColorValue, onChange: (next: ColorValue) => void)`, per `TokenTypeEditorProps<ColorValue>`.
- [x] `packages/token-type-color/src/editor.module.css` — swatch sizing (`width`/`height`/`border-radius`/`border: 1px solid var(--border)`), reusing existing CSS custom properties, no new colors invented.
- Files: `packages/token-type-color/src/editor.tsx`, `packages/token-type-color/src/editor.module.css`.

### Step 5: Contract Wiring + Package Barrel

- [x] `packages/token-type-color/src/token-type.ts` — `colorTokenType: TokenTypeContract<ColorValue> = { type: "color", valueSchema: ColorValueSchema, serializeValue: (value) => value, Editor: ColorEditor }`, split from `color.ts` for the same reason `dimensionTokenType` is split from `dimension.ts` (keeps `color.test.ts`/`css-color.test.ts` from transitively pulling in `editor.tsx`'s JSX, which `node --test` cannot load).
- [x] `packages/token-type-color/src/index.ts` — exports `ColorValueSchema`, `ColorValue`, `ColorSpace`, `COLOR_SPACES`, `checkColorValueIssues`, `colorValueToCssColor`, `ColorEditor`, `colorTokenType`.
- Files: `packages/token-type-color/src/token-type.ts`, `packages/token-type-color/src/index.ts`.

### Step 6: Register in `apps/web-app`'s Built-In Editor Registry

- [x] `apps/web-app/package.json` — add `"@dtcg-editor/token-type-color": "workspace:*"` to `dependencies` (alongside the existing `token-type-dimension` entry).
- [x] `apps/web-app/lib/token-editors/built-in.ts` — `BUILT_IN_TOKEN_TYPES` becomes `["dimension", "color"] as const`; `builtInContractsByType` gains a `color: colorTokenType as unknown as TokenTypeContract<unknown>` entry with the same "safe because this registry never inspects `value`" comment already there for `dimension`.
- [x] Confirm `apps/web-app/lib/token-editors/resolve-editor.test.ts` and `define-config.test.ts` still pass — **deviation from plan**: `resolve-editor.test.ts` passed unmodified as predicted, but `define-config.test.ts` did hardcode the built-in extension _count_ (`resolved.extensions.length` asserted as `1` and `2`), contradicting the plan's assumption; updated those two counts to `2`/`3` to reflect the now-two built-in defaults (dimension + color) — a direct, expected consequence of FR-06's registration, not a workaround.
- Files: `apps/web-app/package.json`, `apps/web-app/lib/token-editors/built-in.ts`.

### Step 7: Read-Only Rendering — Swatch + Non-Blocking Issues

- [x] `apps/web-app/lib/tokens/color-display.ts` (new file, mirrors `edit-state.ts`'s `validateDimensionValue` pattern but display-, not edit-, focused):
  - `describeColorForDisplay(raw: unknown): { cssColor: string | undefined; issues: readonly string[] }`.
  - Calls `ColorValueSchema.safeParse(raw)`; on failure returns `{ cssColor: undefined, issues: result.error.issues.map(i => i.message) }`; on success returns `{ cssColor: colorValueToCssColor(result.data), issues: checkColorValueIssues(result.data) }`.
- [x] `apps/web-app/lib/tokens/color-display.test.ts` — unit tests for both branches (valid in-range, valid-but-out-of-range, structurally invalid, legacy hex).
- [x] `apps/web-app/components/TokenTree.tsx` — in the existing `!canEdit` read-only branch (around `TokenTree.tsx:102-120`):
  - Import `colorTokenType` from `@dtcg-editor/token-type-color` and `describeColorForDisplay` from `../lib/tokens/color-display.ts`.
  - When `node.effectiveType === colorTokenType.type`, call `describeColorForDisplay(node.value)`.
  - If `cssColor` is defined, render an additional `<span className={styles.swatch} style={{ backgroundColor: cssColor }} aria-hidden="true" />` next to the existing name/type/value fields (the existing `{node.name} value` text field per `formatValue(node.value)` stays exactly as-is, unconditionally — this is additive, per `feature.md`'s FR-05 and to keep `TokenTree.test.tsx`'s existing `expect(screen.getByText("#ff0000")).toBeTruthy()` assertion passing unmodified).
  - If `issues.length > 0`, render `<ul role="alert" className={styles.colorIssues}>{issues.map(...)}</ul>` beneath that token's fields, always visible (not gated on interaction, since there's no interaction possible yet for a read-only token).
  - Added a new `TokenTree.test.tsx` case (AC-05) rendering an out-of-range `hsl` color token and asserting it still renders with a `role="alert"` issue.
- [x] `apps/web-app/components/TokenTree.module.css` — added `.swatch` and `.colorIssues` rules; also added `flex-wrap: wrap` to `.token` and `width: 100%` on `.colorIssues` so the issue list drops to its own line instead of squeezing into the existing flex row.
- Files: `apps/web-app/lib/tokens/color-display.ts`, `apps/web-app/lib/tokens/color-display.test.ts`, `apps/web-app/components/TokenTree.tsx`, `apps/web-app/components/TokenTree.module.css`.

### Step 8: Sample Color Token File

- [x] `sample_data/color_scale.tokens.json` — new file, structured like `sample_data/spacing_scale.tokens.json` (`$extensions.com.figma.scopes` convention), containing (per `feature.md`'s FR-07):
  - Several tokens across at least `srgb`, `hsl`, `oklch`, and `display-p3` color spaces, each in-range and valid.
  - One token with a `"none"` component (e.g. an achromatic `hsl` gray with hue `"none"`).
  - One token using a legacy bare-hex `$value` string.
  - One token with a deliberately out-of-range value (e.g. `hsl` hue `400` or an `srgb` component `1.5`) to exercise the issue display end-to-end.
- [x] `packages/token-core/src/color-sample.test.ts` (new, added per AC-06's acceptance-criteria mapping) — reads the real file from disk and round-trips it through `parseTokenFile`, asserting success and the FR-07 coverage (colorSpaces present, `"none"` component present, legacy hex present).
- Files: `sample_data/color_scale.tokens.json`, `packages/token-core/src/color-sample.test.ts`.

### Step 9: Accessibility Test for `ColorEditor`

- [x] `apps/web-app/lib/token-editors/built-in.a11y.test.tsx` — add a second test block (alongside the existing `dimensionTokenType.Editor` one) rendering `colorTokenType.Editor` with a representative valid `ColorValue` and asserting zero WCAG 2.2 AA `axe-core` violations, per this repo's non-warn-only accessibility-testing convention (`docs/project.md`'s Accessibility Testing feature).
- Files: `apps/web-app/lib/token-editors/built-in.a11y.test.tsx`.

### Step 10: Full Test Suite + Existing-Behavior Regression Check

- [x] Run `pnpm build`, `pnpm lint`, `pnpm test` (via Turborepo) repo-wide — all green (build: 6/6, lint: 12/12, test: 13/13, including 127 vitest + all `packages/*` `node:test` suites + 4 Playwright e2e specs).
- [x] Explicitly confirm `apps/web-app/app/api/tokens/[...path]/route.test.ts`'s `"PATCH returns 400 when attempting to edit a non-dimension token"` test (already using a `color` fixture) and `apps/web-app/components/TokenTree.test.tsx`'s `"shows editable controls for a dimension token but not for other types (AC-01)"` test (already asserting `#ff0000` renders as plain text and no `red name` input exists) both continue to pass **unmodified** — confirmed, both pass as-is (AC-07/AC-08).
- [x] `pnpm format:check` (Prettier, tabs) passes on all new/edited files (also reformatted `feature.md`/`plan.md`, which predated this pass and weren't previously Prettier-clean).
- **Deviation found during this step**: adding `sample_data/color_scale.tokens.json` (Step 8) shifted the folder overview's alphabetical file listing, breaking `e2e/keyboard-navigation.spec.ts`'s assumption that `spacing_scale.tokens.json`'s link is the very first Tab stop (`color_scale...` now sorts first). Fixed by changing that one assertion from a single `tabTo` to the existing `tabUntilFocused` helper — the test's actual intent (that the link is keyboard-reachable with visible focus) is preserved; only the "must be the first tab stop" assumption, which was never a stated requirement, was relaxed.
- Files: `apps/web-app/e2e/keyboard-navigation.spec.ts` (regression fix, see above); otherwise verification only.

## Acceptance Criteria Mapping

| AC                                                                                          | Verified By                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01: `colorTokenType` exports `type === "color"` with correct contract shape              | `packages/token-type-color/src/color.test.ts` (imports `colorTokenType` via `token-type.ts`, asserts `.type`)                                                                                                     |
| AC-02: `ColorValueSchema` accepts all 14 spaces + legacy bare-hex                           | `packages/token-type-color/src/color.test.ts`                                                                                                                                                                     |
| AC-03: `checkColorValueIssues` correct for in-range, out-of-range, `"none"`, and legacy-hex | `packages/token-type-color/src/color.test.ts`                                                                                                                                                                     |
| AC-04: Web app renders an accurate swatch across representative spaces + legacy hex         | `apps/web-app/lib/tokens/color-display.test.ts` (unit-level `cssColor` string correctness) + manual/dev-server spot check during implementation                                                                   |
| AC-05: Malformed color value still renders, with issues visible, no crash                   | `apps/web-app/lib/tokens/color-display.test.ts` + a new `TokenTree.test.tsx` case rendering a tree with an out-of-range color token and asserting the issue text appears alongside the (still-rendered) token row |
| AC-06: `sample_data/color_scale.tokens.json` parses and has required coverage               | New test (e.g. in `packages/token-core` or a small web-app-level test) round-tripping the file through `parseTokenFile` and asserting it succeeds; manual review of file contents against the FR-07 checklist     |
| AC-07: No `token-core`/`canEdit`/`route.ts` changes; color stays non-editable               | Existing `route.test.ts` "non-dimension token" test + existing `TokenTree.test.tsx` AC-01 test, both passing **unmodified** (Step 10)                                                                             |
| AC-08: Existing dimension-editing tests/behavior unaffected                                 | Full `pnpm test` run (Step 10) — zero modifications to any dimension-path test file                                                                                                                               |

## Risks & Mitigations

- **Risk**: CSS Color 4/5 function syntax (`oklch()`, `color(display-p3 ...)`, etc.) may not render identically (or at all) in every browser/test environment. → **Mitigation**: the `a11y` Vitest project already runs in a real Chromium instance (`@vitest/browser-playwright`), which supports all of CSS Color 4/5; the swatch's _visual_ correctness beyond "renders without erroring" is a manual dev-server spot check (per `feature.md`'s AC-04 acceptance note), not an automated pixel assertion — automated tests only assert the generated CSS _string_ is correct (Step 3), not its rendered pixels.
- **Risk**: `checkColorValueIssues`'s per-colorSpace range table is fiddly to get exactly right (14 spaces, several with unbounded/hue-wrapping channels) and a mistake here would either wrongly flag valid design tokens or silently accept invalid ones. → **Mitigation**: Step 2's test coverage requires at least one valid + one invalid case per space family (RGB-like, HSL/HWB, Lab/LCH, OKLab/OKLCH), derived from the FR-02 table that was itself verified against the live spec page during `/sdd-feature`, not written from memory.
- **Risk**: Adding `"color"` to `BUILT_IN_TOKEN_TYPES` broadens the `TokenType` union consumed by `TokenFilterMetadata`/`TokenEditorExtension`'s `filter` signature — a latent assumption elsewhere in the codebase that `TokenType` has exactly one member could break. → **Mitigation**: Step 6 explicitly greps/runs `resolve-editor.test.ts`/`define-config.test.ts` to confirm neither hardcodes a single-member assumption; `tsc`'s strict build (Step 10) would catch a genuine type-level break.
- **Risk**: Merge conflict with the sibling `fallback-token-editor` worktree once it lands, since both touch `TokenTree.tsx` and `built-in.ts`. → **Mitigation**: accepted and expected per `feature.md`'s Out of Scope — this plan makes surgically additive changes only (new branch condition in `TokenTree.tsx`, new array entry in `built-in.ts`), not restructuring either file, to keep that future conflict small and mechanical.

## Estimated Complexity

**Medium** — no architectural risk (the Token-Type Package Contract pattern is already established and this plan follows it exactly), but the per-colorSpace validation table (Step 2) and the CSS-color-string builder (Step 3) have real surface area (14 color spaces × correctness), and the `ColorEditor` UI (Step 4) is more involved than `DimensionEditor`'s two fields (dynamic per-space component count/labels, `"none"` toggling, optional `alpha`/`hex`).
