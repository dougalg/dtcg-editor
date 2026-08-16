# Contract: `@dtcg-editor/token-core` public API (post-refactor)

This is an internal library package; its "contract" is its `src/index.ts` export surface, which is what every other package and `apps/web-app` is allowed to depend on.

## Existing exports (unchanged)

```ts
export { parseTokenFile, TokenParseError } from "./parse.ts";
export { findNode, resolveEffectiveType } from "./resolve-type.ts";
export { serializeTokenFile, TokenSerializeError } from "./serialize.ts";
export { applyTokenEdits, TokenEditError } from "./edit.ts";
export type { TokenEdit } from "./edit.ts";
export type { DtcgNode, GroupNode, TokenDocument, TokenNode } from "./types.ts";
export { DTCG_TOKEN_TYPES, isDtcgTokenType } from "./token-types.ts";
export type { DtcgTokenType } from "./token-types.ts";
```

## New exports (added by this refactor)

```ts
// From ./color.ts (structural exports only, split from token-type-color's color.ts
// per the /speckit-clarify validation-scope session — COMPONENT_RANGES/checkColorValueIssues
// are data/range validation and stay behind in token-editor-color, NOT exported here)
export {
	COLOR_SPACES,
	ColorValueSchema,
	ColorObjectValueSchema,
	LegacyHexColorValueSchema,
} from "./color.ts";
export type {
	ColorSpace,
	ColorComponent,
	ColorObjectValue,
	ColorValue,
} from "./color.ts";

// NOTE: css-color.ts and conversion.ts do NOT move here — both are Editor-only
// presentation/native-widget-interop code (colorValueToCssColor's CSS rendering;
// colorValueToSrgbHex/srgbHexToColorSpaceComponents's <input type="color"> interop),
// not DTCG structural parsing. They stay in token-editor-color/src/utils/ — see
// contracts/token-editor-color.md.

// From ./dimension.ts (moved wholesale from token-type-dimension)
export { DimensionValueSchema } from "./dimension.ts";
export type { DimensionValue } from "./dimension.ts";
```

## Explicitly NOT exported from `token-core`

- `ColorEditorOptions`, `ColorEditorOptionsSchema`, `defineColorConfig` — editor-only config; already lives in `token-editor-color/src/configuration.ts` (moved there by 002-simplify-tree-node, unaffected by this refactor).
- `ColorEditor`, `DimensionEditor`, `ColorValidationErrorHandler` — React components, never enter `token-core` (Principle VII: no React import).
- `colorTokenType`, `dimensionTokenType` — the wired `TokenTypeContract` objects stay in their respective `token-editor-*` packages, since they hold a live `Editor` reference.
- `COMPONENT_RANGES`, `checkColorValueIssues` — data/range validation of an already-structurally-valid value (e.g. an out-of-range hue); user-recoverable directly in the Editor UI, so it stays in `token-editor-color/src/utils/range-validation.ts` (spec FR-003/FR-011, Assumptions).
- `colorValueToCssColor`, `colorValueToSrgbHex`, `srgbHexToColorSpaceComponents` — Editor-only CSS rendering and native `<input type="color">` widget interop; no headless consumer needs them, so they stay in `token-editor-color/src/utils/` (spec FR-001/FR-003/FR-011).

## Consumers (re-verified against actual current imports, post-002)

- `token-editor-color/src/configuration.ts` — imports `COLOR_SPACES`/`ColorSpace` (currently from `./color.ts`; repoints to `@dtcg-editor/token-core`).
- `token-editor-color/src/components/editor.tsx` — imports `COLOR_SPACES`, `ColorObjectValue`, `ColorSpace`, `ColorValue` (currently from `../color.ts`; repoints to `@dtcg-editor/token-core`); its `checkColorValueIssues`/`COMPONENT_RANGES`/`colorValueToCssColor`/`colorValueToSrgbHex`/`srgbHexToColorSpaceComponents` imports repoint to `../utils/range-validation.ts`/`../utils/css-color.ts`/`../utils/conversion.ts` (unmoved packages, moved subfolder within the package), and its `ColorEditorOptions` import from `../configuration.ts` is unaffected.
- `token-editor-color/src/components/validation-error-handler.tsx` — imports `ColorObjectValueSchema`, `LegacyHexColorValueSchema` (currently from `../color.ts`; repoints to `@dtcg-editor/token-core`).
- `token-editor-color/src/token-type.ts`, `token-editor-dimension/src/token-type.ts` — import their type's value schema (`ColorValueSchema`/`DimensionValueSchema`) and value type for `TokenTypeContract.valueSchema`/typing.
- `token-editor-dimension/src/components/editor.tsx` — imports the `DimensionValue` type (currently from `../dimension.ts`; repoints to `@dtcg-editor/token-core`).
- `apps/web-app/lib/token-editors/color-editor.test.tsx` — imports the `ColorValue` type (currently from `@dtcg-editor/token-type-color`; repoints to `@dtcg-editor/token-core`; its `ColorEditor`/`ColorEditorOptions` imports stay pointed at `@dtcg-editor/token-editor-color`). This is the **only new** `token-core` import this refactor adds to `apps/web-app` — the app already depends on `token-core` today for unrelated generic-tree concerns (`isDtcgTokenType`, `DtcgTokenType`, etc., in `TreeTokenNode.tsx`/`lib/token-editors/types.ts`), and every former direct-value-schema import from application code (`lib/tokens/color-display.ts`, `TreeNode.tsx`'s old color/dimension imports) was already eliminated by 002-simplify-tree-node.

## Package dependency changes

- None. `package.json` gains no new dependency — `colorjs.io` stays in `token-editor-color` (its only consumer, `conversion.ts`, doesn't move here).
- `package.json` continues to declare zero dependency on `react` or any `token-editor-*` package (verified as a plan gate, not just asserted — see `quickstart.md`).
