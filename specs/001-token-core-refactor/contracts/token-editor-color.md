# Contract: `@dtcg-editor/token-editor-color` public API (post-refactor)

Renamed from `@dtcg-editor/token-type-color`. Directory: `packages/token-editor-color`.

## Current exports (`token-type-color/src/index.ts`, for reference)

```ts
export {
	COLOR_SPACES,
	ColorEditorOptionsSchema,
	ColorValueSchema,
	ColorObjectValueSchema,
	LegacyHexColorValueSchema,
	checkColorValueIssues,
	defineColorConfig,
} from "./color.ts";
export type {
	ColorSpace,
	ColorComponent,
	ColorEditorOptions,
	ColorObjectValue,
	ColorValue,
} from "./color.ts";
export { colorValueToCssColor } from "./css-color.ts";
export {
	colorValueToSrgbHex,
	srgbHexToColorSpaceComponents,
} from "./conversion.ts";
export { ColorEditor } from "./editor.tsx";
export { colorTokenType } from "./token-type.ts";
```

## New exports (post-refactor)

```ts
export { ColorEditor } from "./editor.tsx";
export { colorTokenType } from "./token-type.ts";
export {
	COLOR_SPACES,           // re-exported: ColorEditorOptionsSchema still needs it (colorSpaces enum)
	ColorEditorOptionsSchema,
	defineColorConfig,
} from "./token-type.ts";
export type { ColorSpace, ColorEditorOptions } from "./token-type.ts";
```

`COLOR_SPACES`/`ColorSpace` are needed by `ColorEditorOptionsSchema`'s own definition (it validates a `colorSpaces` array against this enum) and by `editor.tsx` (dropdown of selectable spaces), so they are re-exported here from wherever `token-type.ts` sources them (either its own copy or, preferably, imported from `token-core` and re-exported — a task-level decision, since both `token-core`'s `color.ts` and this package need the same 14-value list; avoid two independently-maintained copies).

## Removed from this package's public API

- `ColorValueSchema`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`, `checkColorValueIssues` — moved to `token-core`.
- `colorValueToCssColor`, `colorValueToSrgbHex`, `srgbHexToColorSpaceComponents` — moved to `token-core`.
- `ColorObjectValue`, `ColorValue` types — moved to `token-core`.

## `package.json` changes

- `name`: `@dtcg-editor/token-type-color` → `@dtcg-editor/token-editor-color`.
- Dependencies: `colorjs.io` removed (moves to `token-core`); `@dtcg-editor/token-core` added as a `workspace:*` dependency (needed by `token-type.ts` for `ColorValueSchema`).
- `@dtcg-editor/token-type-contract` dependency renamed to `@dtcg-editor/token-editor-contract`.

## Consumers (verified against actual current imports, repointed to new package name only — no export changed for these)

- `apps/web-app/components/TokenTree.tsx`, `apps/web-app/lib/token-editors/built-in.ts`, `built-in.test.ts`, `built-in.a11y.test.tsx` — import `colorTokenType`.
- `apps/web-app/lib/token-editors/color-editor.test.tsx` — imports `ColorEditor`, `ColorEditorOptions` (the `ColorValue` type import in this same file moves to `token-core`, see `token-core.md`).
