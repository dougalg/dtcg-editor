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
// From ./color.ts (value-schema/validation subset split out of
// token-type-color's color.ts — see research.md and data-model.md)
export {
	COLOR_SPACES,
	ColorValueSchema,
	ColorObjectValueSchema,
	LegacyHexColorValueSchema,
	checkColorValueIssues,
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

- `ColorEditorOptions`, `ColorEditorOptionsSchema`, `defineColorConfig` — editor-only config, stays in `token-editor-color`.
- `ColorEditor`, `DimensionEditor` — React components, never enter `token-core` (Principle VII: no React import).
- `colorTokenType`, `dimensionTokenType` — the wired `TokenTypeContract` objects stay in their respective `token-editor-*` packages, since they hold a live `Editor` reference.

## Consumers (verified against actual current imports)

- `apps/web-app/lib/tokens/color-display.ts` — imports `checkColorValueIssues`, `colorValueToCssColor`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema` (currently from `@dtcg-editor/token-type-color`; repointed to `@dtcg-editor/token-core`).
- `apps/web-app/lib/token-editors/color-editor.test.tsx` — imports the `ColorValue` type (currently from `@dtcg-editor/token-type-color`; repointed to `@dtcg-editor/token-core`; `ColorEditor`/`ColorEditorOptions` stay imported from `@dtcg-editor/token-editor-color`).
- `token-editor-color/src/token-type.ts` and `token-editor-dimension/src/token-type.ts` — import their type's value schema for `TokenTypeContract.valueSchema`.

## Package dependency changes

- `package.json` gains `colorjs.io` (moved from `token-type-color`, same `colorjs.io/fn` entry point).
- `package.json` continues to declare zero dependency on `react` or any `token-editor-*` package (verified as a plan gate, not just asserted — see `quickstart.md`).
