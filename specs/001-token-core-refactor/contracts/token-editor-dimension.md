# Contract: `@dtcg-editor/token-editor-dimension` public API (post-refactor)

Renamed from `@dtcg-editor/token-type-dimension`. Directory: `packages/token-editor-dimension`.

## Current exports (`token-type-dimension/src/index.ts`, for reference)

```ts
export { DimensionValueSchema } from "./dimension.ts";
export type { DimensionValue } from "./dimension.ts";
export { DimensionEditor } from "./editor.tsx";
export { dimensionTokenType } from "./token-type.ts";
```

## New exports (post-refactor)

```ts
export { DimensionEditor } from "./editor.tsx";
export { dimensionTokenType } from "./token-type.ts";
```

`dimension.ts` has no editor-specific config (unlike color), so unlike `token-editor-color` there is no leftover editor-config export here — `DimensionValueSchema`/`DimensionValue` move to `token-core` in full, with nothing staying behind beyond the `Editor` and the contract wiring.

## Removed from this package's public API

- `DimensionValueSchema`, `DimensionValue` type — moved to `token-core`.

## `package.json` changes

- `name`: `@dtcg-editor/token-type-dimension` → `@dtcg-editor/token-editor-dimension`.
- Dependencies: `@dtcg-editor/token-core` added as a `workspace:*` dependency (needed by `token-type.ts` for `DimensionValueSchema`).
- `@dtcg-editor/token-type-contract` dependency renamed to `@dtcg-editor/token-editor-contract`.

## Consumers (verified against actual current imports, repointed to new package name only — no export changed for these)

- `apps/web-app/components/TokenTree.tsx`, `apps/web-app/lib/tokens/edit-state.ts` — import `dimensionTokenType` and the `DimensionValue` type. **Note**: `DimensionValue` moves to `token-core` per this package's export change above, so these two files' `DimensionValue` type import must repoint to `@dtcg-editor/token-core`, while their `dimensionTokenType` import stays pointed at `@dtcg-editor/token-editor-dimension`.
- `apps/web-app/lib/token-editors/built-in.ts`, `built-in.test.ts`, `built-in.a11y.test.tsx` — import `dimensionTokenType` only.
