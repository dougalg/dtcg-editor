# Quickstart: Validating the TokenTree / TreeNode Simplification

## Prerequisites

- Repo installed (`pnpm install` from repo root)
- Working directory: `apps/web-app`

## 1. Regression: existing behavior is unchanged (Story 2 / SC-002)

```sh
pnpm --filter @dtcg-editor/web-app test
```

Expect the existing suites to pass with no changes to their user-facing
assertions: `components/TokenTree.test.tsx`,
`components/TokenTree.generic-editor.test.tsx`,
`components/TokenTree.override.test.tsx`, `components/TokenTree.a11y.test.tsx`,
`lib/token-editors/color-editor.test.tsx`, `lib/token-editors/built-in.test.ts`,
`lib/token-editors/resolve-editor.test.ts`. Tests may be _edited_ only where
they assert an internal implementation detail that necessarily changed (e.g.
a direct call to the now-deleted `validateDimensionValue`), never where they
assert rendered output or user-facing behavior.

Also run the token-type package suites, since `Preview` moves logic there:

```sh
pnpm --filter @dtcg-editor/token-type-color test
pnpm --filter @dtcg-editor/token-type-contract test
```

## 2. Structural check: no concrete token-type imports in the tree layer (Story 3 / SC-003)

```sh
grep -n "@dtcg-editor/token-type-color\|@dtcg-editor/token-type-dimension" \
  apps/web-app/components/TreeNode.tsx apps/web-app/components/TokenTree.tsx
```

Expect **no output** (grep exit code 1). Also confirm no type-name
conditionals remain (SC-004):

```sh
grep -n '=== "color"\|=== "dimension"\|isDimension\|isColor' \
  apps/web-app/components/TreeNode.tsx
```

Expect **no output**.

## 3. Behavioral: a brand-new type works with zero tree-component changes (Story 1 / SC-001)

1. In a scratch/test config (not committed), register a stub extension for an
   unused type name, e.g.:
   ```ts
   extensions: [
     {
       type: "fontFamily", // any DtcgTokenType not already built-in
       editor: StubEditor, // a trivial component satisfying TokenTypeEditorProps
     },
   ],
   ```
2. Add a token of that type to a sample token file under `sample_data/`.
3. Run the dev server (`pnpm dev`) and open the token tree.
4. Confirm the stub editor renders for that token, with **no source change**
   to `TreeNode.tsx` or `TokenTree.tsx` required to make it appear.
5. Revert the scratch config/sample-data changes.

## Expected outcome

All three checks pass: existing tests green, zero concrete token-type
imports/conditionals in the tree layer, and a new type editor works purely
through registration. This is the full acceptance bar from `spec.md`'s three
user stories.
