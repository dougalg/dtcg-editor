# Quickstart: Validating the Token-Core Parsing Consolidation & Token-Editor Rename

This is a pure internal refactor (spec User Story 3): the fastest and most reliable validation is that everything that passed before still passes, plus a handful of structural checks specific to this refactor's own success criteria. No manual UI exploration is required beyond a smoke check, since the existing automated a11y/browser suite already exercises the color and dimension editors.

## Prerequisites

- On the feature branch/worktree with the refactor implemented (all of `tasks.md` complete), based on current `main` — which already includes 002-simplify-tree-node.
- `pnpm install` run at the repo root after any `package.json` changes (renames, dependency moves).

## 1. Structural checks (package boundary correctness)

Confirm the rename and dependency-direction requirements (FR-007, FR-010, SC-002, SC-006) directly, not just via test pass/fail:

```sh
# No leftover token-type-* package names or directories (SC-006)
grep -rn "token-type-" --include="*.ts" --include="*.tsx" --include="*.json" packages apps | grep -v node_modules
ls packages | grep "^token-type-"   # expect no output

# token-core has no React and no token-editor-* dependency (Principle VII, FR-002/FR-007)
grep -E "\"(react|@dtcg-editor/token-editor)" packages/token-core/package.json   # expect no output

# Zero parsing/validation modules remain in the renamed editor packages (SC-002)
ls packages/token-editor-color/src packages/token-editor-dimension/src
# expect: components/, configuration.ts (+ its test), token-type.ts, index.ts, css-modules.d.ts (color only)
# — no color.ts/dimension.ts/conversion.ts/css-color.ts or their tests
```

## 2. Full test/build/lint pass (User Story 3, SC-003, SC-004)

```sh
pnpm build
pnpm lint
pnpm test
```

Expected: all three succeed with zero errors, via Turborepo across every workspace package — `token-core` (now including the moved color/dimension/conversion/css-color tests), `token-editor-color`, `token-editor-dimension`, `token-editor-contract`, and `apps/web-app` (unit, Vitest Browser Mode a11y, Playwright a11y — including the `TreeTokenNode.tsx`/`DefaultValidationErrorHandler.tsx` coverage added by 002-simplify-tree-node, unaffected by this refactor).

## 3. Import-boundary smoke test (User Story 1)

Confirm a value schema is usable from `token-core` alone, with no `token-editor-*`/React in the resolved dependency tree:

```sh
node -e "
const { ColorValueSchema, checkColorValueIssues } = require('./packages/token-core/dist/src/index.js');
const result = ColorValueSchema.safeParse({ colorSpace: 'srgb', components: [1, 0, 0] });
console.log('parsed ok:', result.success);
console.log('issues:', checkColorValueIssues(result.data));
"
```

Expected: `parsed ok: true`, `issues: []` — and no error requiring `react` or any `@dtcg-editor/token-editor-*` package to be installed.

## 4. Manual editor smoke check (User Story 3, optional — automated a11y suite already covers this)

```sh
pnpm --filter web-app dev
```

Open the app, edit a `color` token (confirm the color-space picker, value entry, range-issue list, and CSS preview behave as before — these already flow through `token-editor-color/src/components/editor.tsx` per 002-simplify-tree-node, unaffected in behavior by this refactor's import-path changes) and a `dimension` token (confirm unit/value entry behaves as before). Expected: identical behavior to pre-refactor — this step exists only as a human sanity check on top of the automated suite in step 2, not as the primary verification method.

## Success

The refactor is validated when steps 1–3 all pass with the expected output above, and step 2's full `pnpm test` run shows no reduction in test count relative to the pre-refactor (post-002) baseline (i.e., every moved test — `color.test.ts`, `conversion.test.ts`, `css-color.test.ts`, `dimension.test.ts` — is present and passing in its new `token-core` location, and `token-editor-color`/`token-editor-dimension`'s remaining tests — `configuration.test.ts`, any `components/` tests — are unaffected).
