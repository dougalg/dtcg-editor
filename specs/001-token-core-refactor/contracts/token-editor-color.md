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
// Value-adjacent utilities (FR-011): stay in this package, grouped under utils/,
// NOT moved to token-core — none is structural DTCG parsing.
export { COMPONENT_RANGES, checkColorValueIssues } from "./utils/range-validation.ts";
export { colorValueToCssColor } from "./utils/css-color.ts";
export {
	colorValueToSrgbHex,
	srgbHexToColorSpaceComponents,
} from "./utils/conversion.ts";
```

Unlike the pre-002 version of this contract (which anticipated moving `ColorEditorOptions`/`ColorEditorOptionsSchema`/`defineColorConfig` into `token-type.ts` and re-exporting `COLOR_SPACES` from there), 002-simplify-tree-node already established `configuration.ts` as their permanent home and `configuration.ts` already imports `COLOR_SPACES`/`ColorSpace` itself (repointed to `@dtcg-editor/token-core` by this refactor, not re-exported through this package) — so this package's index no longer needs to re-export `COLOR_SPACES`/`ColorSpace` at all; any consumer needing them imports directly from `@dtcg-editor/token-core`.

## Removed from this package's public API

- `ColorValueSchema`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema` — moved to `token-core` (structural validation).
- `COLOR_SPACES`, `ColorSpace`, `ColorComponent`, `ColorObjectValue`, `ColorValue` — moved to `token-core` (imported back into `utils/range-validation.ts` where still needed by `checkColorValueIssues`/`COMPONENT_RANGES`).

## NOT removed (stays in this package, moved into `utils/`)

- `COMPONENT_RANGES`, `checkColorValueIssues` — data/range validation of an already-structurally-valid value (e.g. an out-of-range hue); user-recoverable directly in the Editor UI, so it does not move to `token-core` (spec FR-003/FR-011). Moves from `color.ts` into `utils/range-validation.ts` (renamed, not just relocated, since its old name no longer fits its narrowed contents).
- `colorValueToCssColor` (from `css-color.ts`), `colorValueToSrgbHex`/`srgbHexToColorSpaceComponents` (from `conversion.ts`) — Editor-only CSS rendering and native `<input type="color">` widget interop; no headless consumer needs them, so neither moves to `token-core` either (spec FR-001/FR-003/FR-011). Both move unchanged into `utils/`.

## File layout changes (FR-011)

- New `src/utils/` subfolder groups this package's value-adjacent utilities, separate from `components/` (UI), `configuration.ts` (editor config), and `token-type.ts` (contract wiring): `utils/range-validation.ts` (+ test, renamed from `color.ts`), `utils/conversion.ts` (+ test, moved unchanged), `utils/css-color.ts` (+ test, moved unchanged).
- `src/` root no longer holds any value-adjacent utility file directly — only `components/`, `configuration.ts` (+ test), `token-type.ts`, `utils/`, `index.ts`, and `css-modules.d.ts`.

## `package.json` changes

- `name`: `@dtcg-editor/token-type-color` → `@dtcg-editor/token-editor-color`.
- Dependencies: `colorjs.io` stays, unchanged (`utils/conversion.ts`, its only consumer, doesn't move packages); `@dtcg-editor/token-core` added as a `workspace:*` dependency (needed by `configuration.ts`, `components/editor.tsx`, `components/validation-error-handler.tsx`, `utils/range-validation.ts` (for `ColorSpace`/`ColorValue`/`ColorComponent` types), and `token-type.ts`).
- `@dtcg-editor/token-type-contract` dependency renamed to `@dtcg-editor/token-editor-contract`.

## Consumers (re-verified against actual current imports, post-002; repointed to new package name only — no export changed for these)

- `apps/web-app/lib/token-editors/built-in.ts`, `built-in.test.ts`, `built-in.a11y.test.tsx` — import `colorTokenType`.
- `apps/web-app/lib/token-editors/color-editor.test.tsx` — imports `ColorEditor`, `ColorEditorOptions` (the `ColorValue` type import in this same file moves to `token-core`, see `token-core.md`).
- `apps/web-app/lib/token-editors/color-validation-error-handler.test.tsx` — imports `ColorValidationErrorHandler`, `colorTokenType`.

Note: `apps/web-app/components/TokenTree.tsx` and `TreeNode.tsx`, which the pre-002 version of this contract listed as consumers of `colorTokenType`, no longer import this package at all — 002-simplify-tree-node routed all dispatch through `lib/token-editors/built-in.ts`'s registry, so `built-in.ts` is now the sole production-code import site.
