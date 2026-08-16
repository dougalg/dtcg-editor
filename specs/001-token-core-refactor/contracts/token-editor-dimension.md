# Contract: `@dtcg-editor/token-editor-dimension` public API (post-refactor)

Renamed from `@dtcg-editor/token-type-dimension`. Directory: `packages/token-editor-dimension`.

## Current exports (`token-type-dimension/src/index.ts`, post-002-simplify-tree-node, for reference)

```ts
export { DimensionValueSchema } from "./dimension.ts";
export type { DimensionValue } from "./dimension.ts";
export { DimensionEditor } from "./components/editor.tsx";
export { dimensionTokenType } from "./token-type.ts";
```

## New exports (post-refactor)

```ts
export { DimensionEditor } from "./components/editor.tsx";
export { dimensionTokenType } from "./token-type.ts";
```

`dimension.ts` has no editor-specific config (its `configuration.ts`, added by 002-simplify-tree-node, is still an intentionally empty module), so unlike `token-editor-color` there is no leftover editor-config export here — `DimensionValueSchema`/`DimensionValue` move to `token-core` in full, with nothing staying behind beyond `components/editor.tsx` and the contract wiring.

## Removed from this package's public API

- `DimensionValueSchema`, `DimensionValue` type — moved to `token-core`.

## `package.json` changes

- `name`: `@dtcg-editor/token-type-dimension` → `@dtcg-editor/token-editor-dimension`.
- Dependencies: `@dtcg-editor/token-core` added as a `workspace:*` dependency (needed by `token-type.ts` and `components/editor.tsx` for `DimensionValueSchema`/`DimensionValue`).
- `@dtcg-editor/token-type-contract` dependency renamed to `@dtcg-editor/token-editor-contract`.

## Consumers (re-verified against actual current imports, post-002; repointed to new package name only — no export changed for these)

- `apps/web-app/lib/token-editors/built-in.ts`, `built-in.test.ts`, `built-in.a11y.test.tsx` — import `dimensionTokenType` only.

Note: unlike the pre-002 version of this contract, `apps/web-app/components/TokenTree.tsx` and `lib/tokens/edit-state.ts` no longer import `dimensionTokenType`/`DimensionValue` at all — 002-simplify-tree-node deleted `edit-state.ts`'s `validateDimensionValue`/`DimensionValidationResult` and routed `TokenTree.tsx`'s dispatch entirely through `lib/token-editors/built-in.ts`'s registry. `built-in.ts` is now the sole production-code import site for this package.
