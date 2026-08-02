# Support for Colour (Color) Tokens

Implemented on: 2026-08-02

Adds `@dtcg-editor/token-type-color`, a new Token-Type Package Contract implementation for DTCG's `color` `$type`, mirroring `@dtcg-editor/token-type-dimension`'s shape: a Zod schema covering all 14 DTCG 2025.10 Color module colorSpaces plus a legacy bare-hex `$value` form, a non-blocking per-colorSpace numeric-range issue checker (`checkColorValueIssues`), a CSS-native swatch preview builder (`colorValueToCssColor`, using CSS Color 4/5 function syntax directly — no color-math dependency), and a full `ColorEditor` UI (colorSpace select, per-component numeric inputs with `"none"` support, alpha, optional hex).

Originally shipped with color tokens read-only by deliberate sequencing — editing was deferred to the separately in-flight `fallback-token-editor` feature, which generalized `TokenTree.tsx`'s `canEdit` gate beyond dimension-only. Once that feature merged into `main` and this branch rebased onto it, two live regressions surfaced from the combination: a structurally malformed color value crashed the whole page (no per-token error isolation), and an out-of-range-but-structurally-valid value became silently editable with its warning lost. Both were fixed in this same worktree by generalizing the dimension type's own validate-before-edit pattern — via a new `resolveBuiltInContract` helper — to any built-in standard type, applied both client-side (`TokenTree.tsx`'s `canEdit`) and, after a further audit found the same gap, server-side (`route.ts`'s PATCH handler, which had previously validated only `dimension` edits and silently passed every other type's value straight to disk unvalidated).

Key files:

- `packages/token-type-color/` — the new package (`color.ts`, `css-color.ts`, `editor.tsx`)
- `apps/web-app/lib/token-editors/built-in.ts` — registry entry + `resolveBuiltInContract`
- `apps/web-app/components/TokenTree.tsx` — read-only swatch/issue rendering, and the generalized `canEdit`/inline-warning logic
- `apps/web-app/app/api/tokens/[...path]/route.ts` — generalized server-side edit-value validation
- `sample_data/color_scale.tokens.json` — sample file covering multiple colorSpaces, a `"none"` component, a legacy hex value, and a deliberately out-of-range value

Notable decisions: no new dependency (native CSS handles all 14 colorSpaces); `token-core` stays completely color-agnostic (`$value` remains opaque `unknown` at that layer); the validate-before-edit generalization is now the standing pattern any future built-in token type should follow on both the client and server sides of the edit path.
