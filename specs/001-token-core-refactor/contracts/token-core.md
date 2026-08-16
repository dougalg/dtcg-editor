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

// From ./css-color.ts (moved wholesale from token-type-color)
export { colorValueToCssColor } from "./css-color.ts";

// From ./conversion.ts (moved wholesale from token-type-color)
export {
	colorValueToSrgbHex,
	srgbHexToColorSpaceComponents,
} from "./conversion.ts";

// From ./dimension.ts (moved wholesale from token-type-dimension)
export { DimensionValueSchema } from "./dimension.ts";
export type { DimensionValue } from "./dimension.ts";
```

## Explicitly NOT exported from `token-core`

- `ColorEditorOptions`, `ColorEditorOptionsSchema`, `defineColorConfig` — editor-only config; already lives in `token-editor-color/src/configuration.ts` (moved there by 002-simplify-tree-node, unaffected by this refactor).
- `ColorEditor`, `DimensionEditor`, `ColorValidationErrorHandler` — React components, never enter `token-core` (Principle VII: no React import).
- `colorTokenType`, `dimensionTokenType` — the wired `TokenTypeContract` objects stay in their respective `token-editor-*` packages, since they hold a live `Editor` reference.
- `COMPONENT_RANGES`, `checkColorValueIssues` — data/range validation of an already-structurally-valid value (e.g. an out-of-range hue); user-recoverable directly in the Editor UI, so it stays in `token-editor-color/src/color.ts` per the `/speckit-clarify` validation-scope session (spec FR-003, Assumptions).

## Consumers (re-verified against actual current imports, post-002)

- `token-editor-color/src/configuration.ts` — imports `COLOR_SPACES`/`ColorSpace` (currently from `./color.ts`; repoints to `@dtcg-editor/token-core`).
- `token-editor-color/src/components/editor.tsx` — imports `COLOR_SPACES`, `ColorObjectValue`, `ColorSpace`, `ColorValue` (currently from `../color.ts`), `colorValueToCssColor` (from `../css-color.ts`), and `colorValueToSrgbHex`/`srgbHexToColorSpaceComponents` (from `../conversion.ts`) — all repoint to `@dtcg-editor/token-core`; its `checkColorValueIssues`/`COMPONENT_RANGES` import stays pointed at `../color.ts` (unmoved), and its `ColorEditorOptions` import from `../configuration.ts` is unaffected.
- `token-editor-color/src/components/validation-error-handler.tsx` — imports `ColorObjectValueSchema`, `LegacyHexColorValueSchema` (currently from `../color.ts`; repoints to `@dtcg-editor/token-core`).
- `token-editor-color/src/token-type.ts`, `token-editor-dimension/src/token-type.ts` — import their type's value schema (`ColorValueSchema`/`DimensionValueSchema`) and value type for `TokenTypeContract.valueSchema`/typing.
- `token-editor-dimension/src/components/editor.tsx` — imports the `DimensionValue` type (currently from `../dimension.ts`; repoints to `@dtcg-editor/token-core`).
- `apps/web-app/lib/token-editors/color-editor.test.tsx` — imports the `ColorValue` type (currently from `@dtcg-editor/token-type-color`; repoints to `@dtcg-editor/token-core`; its `ColorEditor`/`ColorEditorOptions` imports stay pointed at `@dtcg-editor/token-editor-color`). This is the **only new** `token-core` import this refactor adds to `apps/web-app` — the app already depends on `token-core` today for unrelated generic-tree concerns (`isDtcgTokenType`, `DtcgTokenType`, etc., in `TreeTokenNode.tsx`/`lib/token-editors/types.ts`), and every former direct-value-schema import from application code (`lib/tokens/color-display.ts`, `TreeNode.tsx`'s old color/dimension imports) was already eliminated by 002-simplify-tree-node.

## Package dependency changes

- `package.json` gains `colorjs.io` (moved from `token-type-color`, same `colorjs.io/fn` entry point).
- `package.json` continues to declare zero dependency on `react` or any `token-editor-*` package (verified as a plan gate, not just asserted — see `quickstart.md`).
