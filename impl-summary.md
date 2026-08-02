## Implementation Complete

### Files Created

- `packages/token-type-color/src/conversion.ts` — sRGB-hex ⇄ per-`colorSpace` numeric conversion, backed by `colorjs.io`.
- `packages/token-type-color/src/conversion.test.ts` — 27 `node --test` cases (14-space round-trip, gamut clipping, `"none"`/NaN handling).
- `apps/web-app/lib/token-editors/color-editor.test.tsx` — 9 Vitest component tests for `ColorEditor`'s allow-list dropdown + picker behavior.
- `impl-summary.md` — this file.

### Files Modified

- `packages/token-type-contract/src/contract.ts` (+`.test.ts`) — `editorOptionsSchema?` on `TokenTypeContract`, `options?` on `TokenTypeEditorProps`.
- `apps/web-app/lib/token-editors/types.ts` — `TokenEditorExtension.type` → `DtcgTokenType`; added `editorOptions?`.
- `apps/web-app/lib/token-editors/define-config.ts` (+`.test.ts`) — validates `editorOptions` against a resolved built-in contract's `editorOptionsSchema`.
- `apps/web-app/lib/token-editors/resolve-editor.ts` (+`.test.ts`) — returns `{ editor, editorOptions }` instead of a bare editor.
- `apps/web-app/components/TokenTree.tsx` (+`.test.tsx`) — threads resolved `editorOptions` into `DimensionEditor`/`GenericEditor` as `options`.
- `packages/token-type-color/src/color.ts` (+`.test.ts`) — `ColorEditorOptions`, `ColorEditorOptionsSchema`, `defineColorConfig`.
- `packages/token-type-color/src/token-type.ts` — wires `editorOptionsSchema` into `colorTokenType`.
- `packages/token-type-color/src/editor.tsx` — allow-list dropdown (union-with-active, deduped) + native `<input type="color">` picker in both `ObjectColorEditor` and `LegacyHexColorEditor`; also corrected a stale doc comment claiming `ColorEditor` was unreachable through `TokenTree.tsx` (it already isn't, as of an earlier feature).
- `packages/token-type-color/src/editor.module.css` — `.picker` sizing rule.
- `packages/token-type-color/src/index.ts` — exports the new symbols + `conversion.ts`'s functions.
- `packages/token-type-color/package.json` — added `colorjs.io@^0.7.1` via `pnpm add`.
- `apps/web-app/dtcg-editor.config.mts` — commented-out `defineColorConfig` usage sample.
- `apps/web-app/e2e/keyboard-navigation.spec.ts` — new Playwright test for AC-12 picker keyboard-reachability.
- `docs/project.md` — new Approved Dependencies entry for `colorjs.io` with Minimal Dependencies justification.
- `plan.md` — all 12 steps checked off.

### Acceptance Criteria

- [x] AC-01: Passed — `apps/web-app` `next build` TS pass + `define-config.test.ts`'s existing invalid-type case.
- [x] AC-02: Passed — `define-config.test.ts` "editorOptions present but editor invalid still fails... (AC-02)".
- [x] AC-03: Passed — `define-config.test.ts` + `color.test.ts` (AC-03 cases).
- [x] AC-04: Passed — `define-config.test.ts` + `color.test.ts` (AC-04 cases).
- [x] AC-05: Passed — `color-editor.test.tsx` "offers only the configured colorSpaces (AC-05)".
- [x] AC-06: Passed — `color-editor.test.tsx` "...stays editable, with its colorSpace as the active value (AC-06)".
- [x] AC-07: Passed — no `route.ts` change; all 21 existing `app/api/tokens/[...path]/route.test.ts` cases still pass unmodified.
- [x] AC-08: Passed — no `token-core` change; all existing round-trip tests still pass unmodified.
- [x] AC-09: Passed — `color-editor.test.tsx` (srgb + oklch cases) + `conversion.test.ts`'s 14-space coverage.
- [x] AC-10: Passed — `color-editor.test.tsx` "...updates the picker's own displayed color (AC-10)" + colorSpace-switch resync case.
- [x] AC-11: Passed — `color-editor.test.tsx` "picking a color never changes alpha (AC-11)".
- [x] AC-12: Passed — `built-in.a11y.test.tsx` (re-verified zero violations with picker rendered) + new Playwright keyboard-reachability test.
- [x] AC-13: Passed — `color.test.ts` "defineColorConfig is a type-checked identity helper (AC-13)" + real usage in `dtcg-editor.config.mts`, type-checked by `next build`.

### Notes

- `srgbHexToColorSpaceComponents` returns `null` (not a magic-number fallback) on conversion failure, since its result is written back into a token's real `components` via `onChange`; the picker's `handlePickerChange` skips `onChange` entirely on `null` rather than risk corrupting data. `colorValueToSrgbHex` (display-only, never written back) safely falls back to `"#000000"`.
- `colorjs.io/fn`'s own `spaces` re-export does **not** auto-register color spaces (only the separate `colorjs.io/spaces` entry point does, pulling in colorjs.io's full ~40-space catalog) — confirmed against the installed `0.7.1` source and registered the 14 needed spaces explicitly in `conversion.ts`.
- `serialize(..., { format: "hex" })` needed explicit `collapse: false, alpha: false` — colorjs.io's default hex format collapses to 3/4-digit and can embed an alpha channel, neither of which `<input type="color">` accepts.
- Found, but did not fix (out of this feature's scope), a pre-existing accessibility bug: `TokenTree.tsx`'s `role="alert"` on the `<ul>` wrapping out-of-range color issues breaks axe's `listitem` check by removing the `<ul>`'s implicit list role for its `<li>` children. Surfaced while probing a page-level axe scan of `color_scale.tokens.json` (triggered by the sample data's deliberately out-of-range `invalid-hue` token); not introduced by this feature.
- The `editorOptionsSchema` field's `z.ZodType<ColorEditorOptions>` annotation required `colorSpaces?: readonly ColorSpace[] | undefined` (not just `?:`) on both `ColorEditorOptions` and `ObjectColorEditor`'s local prop type, to satisfy this repo's `exactOptionalPropertyTypes: true` TS setting.
- Manual verification of AC-05/06/09/10/11 was done via the new component tests (simulating real DOM events) plus the Playwright run against a production `next build && next start` server, rather than a separate hand-driven `pnpm --filter web-app dev` session — equivalent fidelity for these ACs.
