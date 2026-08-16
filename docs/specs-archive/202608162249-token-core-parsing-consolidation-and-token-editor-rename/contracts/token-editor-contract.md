# Contract: `@dtcg-editor/token-editor-contract` public API (post-refactor)

Renamed from `@dtcg-editor/token-type-contract`. Directory: `packages/token-editor-contract`.

## Exports — unchanged content, only the package name changes

```ts
export type { TokenTypeContract, TokenTypeEditorProps } from "./contract.ts";
export { TokenTypeValidationError, validateTokenValue } from "./contract.ts";
```

(`contract.ts` itself additionally exports the `TokenTypeValidationIssue` interface added by 002-simplify-tree-node, but `index.ts` does not currently re-export it — a pre-existing gap noted here for completeness, out of scope for this refactor to fix unless a task-level decision chooses to.)

Per spec Edge Cases and Assumptions: this package's content (the generic `TokenTypeContract` interface — including the optional `ValidationErrorHandler` member and `TokenTypeValidationError.issues` field added by 002-simplify-tree-node — and its type-agnostic `validateTokenValue` dispatcher) is unaffected by the parsing-consolidation part of this refactor: it holds no type-specific parsing logic today, and 002's additions to it are themselves generic, not type-specific. The exported **type name** `TokenTypeContract` is also unaffected by the package rename (only the package's own name changes, not the interface it exports — see spec Assumptions).

## `package.json` changes

- `name`: `@dtcg-editor/token-type-contract` → `@dtcg-editor/token-editor-contract`.
- Dependencies unchanged (`neverthrow`, `react`, `zod`).

## Consumers (re-verified against actual current imports, post-002; repointed to new package name only — no export changed)

- `apps/web-app/app/api/tokens/[...path]/route.ts` — imports `validateTokenValue`.
- `apps/web-app/components/FallbackValueEditor.tsx`, `apps/web-app/lib/token-editors/types.ts` — import the `TokenTypeEditorProps` type (`types.ts` separately imports `DtcgTokenType` from `@dtcg-editor/token-core`, unaffected by this refactor).
- `apps/web-app/components/TreeTokenNode.tsx` — imports `validateTokenValue` and the `TokenTypeEditorProps` type (the 5-path dispatch logic 002-simplify-tree-node introduced; this file, not `TokenTree.tsx`, is the actual current consumer — verified against source).
- `apps/web-app/components/DefaultValidationErrorHandler.tsx` — imports the `TokenTypeValidationError` type (added by 002-simplify-tree-node).
- `apps/web-app/lib/token-editors/built-in.ts` — imports the `TokenTypeContract` type (alongside `colorTokenType`/`dimensionTokenType` from the renamed `token-editor-*` packages, see `token-editor-color.md`/`token-editor-dimension.md`).
- `apps/web-app/lib/token-editors/color-validation-error-handler.test.tsx` — imports `validateTokenValue` (alongside `ColorValidationErrorHandler`/`colorTokenType` from `token-editor-color`, see `token-editor-color.md`).
- `token-editor-color/src/token-type.ts`, `token-editor-dimension/src/token-type.ts` — import `TokenTypeContract` type to type their wired contract objects.
