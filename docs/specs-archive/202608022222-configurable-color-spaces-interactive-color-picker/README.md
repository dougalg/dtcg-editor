# Configurable Color Spaces + Interactive Color Picker

Lets a host app restrict which of the 14 DTCG `colorSpace` values `ColorEditor` offers, via a new generic `editorOptions`/`editorOptionsSchema` config channel (`TokenEditorExtension.editorOptions` validated against `TokenTypeContract.editorOptionsSchema` by `defineConfig`) and `token-type-color`'s `ColorEditorOptions`/`defineColorConfig` helper.

Also adds a native `<input type="color">` picker to both the object and legacy-hex color editors, backed by `colorjs.io` (`colorjs.io/fn` entry point, with explicit per-space `ColorSpace.register()` calls) for sRGB-hex ⇄ any-colorSpace conversion. The picker's displayed swatch is derived fresh from the current value on every render, so it can never drift from the numeric/hex fields, and picking a color never touches alpha. `TokenEditorExtension.type` reverts from plain `string` back to the `DtcgTokenType` union along the way, for config-authoring DX.

See `feature.md` for the full spec (AC-01–AC-13), `plan.md` for the implementation plan and architecture decisions, `review.md` for the final code review (Ready to merge), and `impl-summary.md` for the implementation summary.
