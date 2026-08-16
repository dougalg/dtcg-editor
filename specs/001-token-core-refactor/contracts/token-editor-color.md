# Contract: `@dtcg-editor/token-editor-color` public API (post-refactor)

Renamed from `@dtcg-editor/token-type-color`. Directory: `packages/token-editor-color`.

## Current exports (`token-type-color/src/index.ts`, post-002-simplify-tree-node, for reference)

```ts
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
export {
	ColorEditorOptionsSchema,
	defineColorConfig,
} from "./configuration.ts";
export type { ColorEditorOptions } from "./configuration.ts";
export { colorValueToCssColor } from "./css-color.ts";
export {
	colorValueToSrgbHex,
	srgbHexToColorSpaceComponents,
} from "./conversion.ts";
export { ColorEditor } from "./components/editor.tsx";
export { ColorValidationErrorHandler } from "./components/validation-error-handler.tsx";
export { colorTokenType } from "./token-type.ts";
```

## New exports (post-refactor)

```ts
export { ColorEditor } from "./components/editor.tsx";
export { ColorValidationErrorHandler } from "./components/validation-error-handler.tsx";
export { colorTokenType } from "./token-type.ts";
export {
	ColorEditorOptionsSchema,
	defineColorConfig,
} from "./configuration.ts";
export type { ColorEditorOptions } from "./configuration.ts";
// Data/range validation (per /speckit-clarify's validation-scope session): stays in this
// package, NOT moved to token-core, since it's user-recoverable in the Editor UI.
export { COMPONENT_RANGES, checkColorValueIssues } from "./color.ts";
```

Unlike the pre-002 version of this contract (which anticipated moving `ColorEditorOptions`/`ColorEditorOptionsSchema`/`defineColorConfig` into `token-type.ts` and re-exporting `COLOR_SPACES` from there), 002-simplify-tree-node already established `configuration.ts` as their permanent home and `configuration.ts` already imports `COLOR_SPACES`/`ColorSpace` itself (repointed to `@dtcg-editor/token-core` by this refactor, not re-exported through this package) — so this package's index no longer needs to re-export `COLOR_SPACES`/`ColorSpace` at all; any consumer needing them imports directly from `@dtcg-editor/token-core`.

## Removed from this package's public API

- `ColorValueSchema`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema` — moved to `token-core` (structural validation).
- `colorValueToCssColor`, `colorValueToSrgbHex`, `srgbHexToColorSpaceComponents` — moved to `token-core`.
- `COLOR_SPACES`, `ColorSpace`, `ColorComponent`, `ColorObjectValue`, `ColorValue` — moved to `token-core` (imported back into `color.ts` where still needed by `checkColorValueIssues`/`COMPONENT_RANGES`).

## NOT removed (stays in this package)

- `COMPONENT_RANGES`, `checkColorValueIssues` — data/range validation of an already-structurally-valid value (e.g. an out-of-range hue); user-recoverable directly in the Editor UI, so it does not move to `token-core` (`/speckit-clarify` validation-scope session, spec FR-003). `color.ts` is updated in place, not deleted, to keep just this.

## `package.json` changes

- `name`: `@dtcg-editor/token-type-color` → `@dtcg-editor/token-editor-color`.
- Dependencies: `colorjs.io` removed (moves to `token-core`); `@dtcg-editor/token-core` added as a `workspace:*` dependency (needed by `configuration.ts`, `components/editor.tsx`, `components/validation-error-handler.tsx`, `color.ts` (for `ColorSpace`/`ColorValue`/`ColorComponent` types), and `token-type.ts`).
- `@dtcg-editor/token-type-contract` dependency renamed to `@dtcg-editor/token-editor-contract`.

## Consumers (re-verified against actual current imports, post-002; repointed to new package name only — no export changed for these)

- `apps/web-app/lib/token-editors/built-in.ts`, `built-in.test.ts`, `built-in.a11y.test.tsx` — import `colorTokenType`.
- `apps/web-app/lib/token-editors/color-editor.test.tsx` — imports `ColorEditor`, `ColorEditorOptions` (the `ColorValue` type import in this same file moves to `token-core`, see `token-core.md`).
- `apps/web-app/lib/token-editors/color-validation-error-handler.test.tsx` — imports `ColorValidationErrorHandler`, `colorTokenType`.

Note: `apps/web-app/components/TokenTree.tsx` and `TreeNode.tsx`, which the pre-002 version of this contract listed as consumers of `colorTokenType`, no longer import this package at all — 002-simplify-tree-node routed all dispatch through `lib/token-editors/built-in.ts`'s registry, so `built-in.ts` is now the sole production-code import site.
