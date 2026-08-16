# Contract: `@dtcg-editor/token-editor-contract` public API (post-refactor)

Renamed from `@dtcg-editor/token-type-contract`. Directory: `packages/token-editor-contract`.

## Exports — unchanged content, only the package name changes

```ts
export type { TokenTypeContract, TokenTypeEditorProps } from "./contract.ts";
export { TokenTypeValidationError, validateTokenValue } from "./contract.ts";
```

Per spec Edge Cases and Assumptions: this package's content (the generic `TokenTypeContract` interface and its type-agnostic `validateTokenValue` dispatcher) is unaffected by the parsing-consolidation part of this refactor — it holds no type-specific parsing logic today. The exported **type name** `TokenTypeContract` is also unaffected by the package rename (only the package's own name changes, not the interface it exports — see spec Assumptions).

## `package.json` changes

- `name`: `@dtcg-editor/token-type-contract` → `@dtcg-editor/token-editor-contract`.
- Dependencies unchanged (`neverthrow`, `react`, `zod`).

## Consumers (verified against actual current imports, repointed to new package name only — no export changed)

- `apps/web-app/app/api/tokens/[...path]/route.ts` — imports `validateTokenValue`.
- `apps/web-app/components/FallbackValueEditor.tsx`, `apps/web-app/lib/token-editors/types.ts` — import the `TokenTypeEditorProps` type.
- `apps/web-app/components/TokenTree.tsx` — imports from this package (exact named imports unchanged, verify against current source at implementation time).
- `token-editor-color/src/token-type.ts`, `token-editor-dimension/src/token-type.ts` — import `TokenTypeContract` type to type their wired contract objects.
