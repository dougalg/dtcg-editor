## Implementation Complete

### Files Created

- `packages/token-core/src/serialize.ts` + `serialize.test.ts` — `serializeTokenFile`, round-trip tests
- `packages/token-core/src/edit.ts` + `edit.test.ts` — `applyTokenEdits`, `TokenEditError`
- `packages/token-type-contract/` (new package) — `TokenTypeContract`, `validateTokenValue`, `contract.test.ts`
- `packages/token-type-dimension/` (new package) — `DimensionValueSchema` (`dimension.ts`), `dimensionTokenType` (`token-type.ts`, split out — see Notes), `DimensionEditor` (`editor.tsx`), `dimension.test.ts`
- `apps/web-app/lib/tokens/write.ts` — `writeAndSerializeTokenFile`
- `apps/web-app/lib/tokens/edit-request.ts` — `EditRequestSchema`
- `apps/web-app/lib/tokens/edit-state.ts` + `edit-state.test.ts` — `applyEditsToPlainNode`, `checkRenameAvailable`, `findSiblings`, `validateDimensionValue`
- `apps/web-app/vitest.config.ts`, `apps/web-app/vitest.setup.ts`
- `apps/web-app/components/TokenTree.test.tsx` — component test (Vitest + Testing Library)

### Files Modified

- `packages/token-core/src/resolve-type.ts` — added `findNode`
- `packages/token-core/src/index.ts` — new exports
- `apps/web-app/package.json` — new workspace deps (`token-type-contract`, `token-type-dimension`), new devDeps (`vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`), `test` script → `vitest run`
- `apps/web-app/app/api/tokens/[...path]/route.ts` — added `PATCH`/`patchTokenFile`
- `apps/web-app/app/api/tokens/[...path]/route.test.ts` — migrated to Vitest, added 8 `PATCH` tests, relaxed the "exports only GET" assertion to allow `PATCH`/`patchTokenFile`
- `apps/web-app/app/api/tokens/route.test.ts`, `lib/config.test.ts`, `lib/tokens/path-safety.test.ts`, `lib/tokens/read.test.ts`, `lib/tokens/scan.test.ts` — migrated to Vitest (import swap only, no assertion changes)
- `apps/web-app/components/TokenTree.tsx` — extended in place with editable dimension controls, pending-edit/save state (chose this over a new `EditableTokenTree.tsx`)
- `apps/web-app/app/tokens/[...path]/page.tsx` — passes `relativePath` to `TokenTree`

### Acceptance Criteria

- [x] AC-01: Passed — `apps/web-app/components/TokenTree.test.tsx`
- [x] AC-02: Passed — `packages/token-type-dimension/src/dimension.test.ts` + `route.test.ts` ("PATCH returns 400 for an invalid dimension value")
- [x] AC-03: Passed — `edit-state.test.ts`, `edit.test.ts`, `route.test.ts`, `TokenTree.test.tsx`
- [x] AC-04: Passed — `route.test.ts` ("PATCH writes multiple pending edits in one write...")
- [x] AC-05: Passed — `route.test.ts` (same test, untouched sibling/extension assertions) + `serialize.test.ts`
- [x] AC-06: Passed — `TokenTree.test.tsx` ("keeps a pending edit visible and editable after a failed save")
- [x] AC-07: Passed — `serialize.test.ts` (3 round-trip cases)

Full monorepo `pnpm build`/`pnpm lint`/`pnpm test` all pass (10/10 Turborepo tasks green; 50 web-app tests, 19 token-core, 5 token-type-dimension, 2 token-type-contract, 3 errors).

### Review Fixes (`/sdd-review`, see `review.md`)

- Fixed (Major): `route.ts`'s inline rename-collision pre-check validated against the pre-batch document and could wrongly reject a same-batch rename that another edit in the batch had just freed up — removed; `applyTokenEdits` already handles this correctly and sequentially. Regression test added.
- Fixed (Major): `TokenTree.tsx`'s `handleNameChange` had the identical bug client-side (checked only against the last-_saved_ tree, ignoring other tokens' pending renames) — now builds an effective tree from `pendingEdits` before checking availability; `findSiblings` tightened to exclude the node itself by path. Regression test added.
- Fixed (Minor): `edit.ts`'s `rebuildAncestorChain` threw plain `Error`s for "impossible" states inside a `Result`-returning API — changed to return `undefined` instead, surfaced as a `TokenEditError` by its caller. (My first-pass fix used a non-null assertion; reverted after discovering `@typescript-eslint/no-non-null-assertion` is fully banned by this repo's ESLint config, not just discouraged.)
- Fixed (Minor): kept the `parent === undefined` guard in `edit.ts` (review had called it dead code to remove) — same lint constraint means an explicit check is the only compliant way to narrow `T | undefined` here; re-scoped to a kept-with-clarifying-comment fix instead.
- Fixed (Minor): added a justifying comment to the `as DimensionValue` cast in `TokenTree.tsx`.

### Notes

- Deviation: `writeAndSerializeTokenFile` takes a `TokenDocument` (not a pre-serialized string) and calls `serializeTokenFile` internally — mirrors `readAndParseTokenFile`'s "read, then parse" combo symmetrically, refining the plan's literal signature.
- Deviation: `token-type-dimension`'s schema (`dimension.ts`) and its assembled `dimensionTokenType` contract object (`token-type.ts`) were split into two files. `dimension.ts` originally also built the contract object, which imports `editor.tsx` (JSX) — meaning `dimension.test.ts` transitively loaded a `.tsx` file, which `node --test` cannot handle at all (confirmed empirically), not just its JSX content. Splitting keeps the schema (and its test) free of any JSX dependency.
- Addition beyond plan text: `contract.test.ts` in `token-type-contract` (so the package's `test` script has something to run, consistent with every other package); `findSiblings` helper and `fieldErrors` component state (needed for rename-collision UI feedback); a safety fallback where a token declared `dimension` but holding a pre-existing malformed value renders read-only instead of crashing.
- Scope reduction: AC-02 has no UI-level component test. `DimensionEditor`'s own controls (a native number input, a closed `px`/`rem` select) can't structurally produce an out-of-shape value through user interaction, so "invalid value rejected" is only meaningfully testable at the schema and server layers — both covered.
- Live end-to-end check performed via the `run` skill: started the real `next dev` server against a scratch token directory (no browser automation available in this environment, so driven via `curl` against the actual HTTP server and real filesystem rather than mocks). Confirmed: (1) the rendered page HTML shows editable name/value inputs for dimension tokens and none for a color token, with its raw value as plain text (AC-01); (2) a real `PATCH` batch — rename + value change on one token, description-only change on a sibling — wrote both to disk in one request, with the untouched color token's `$extensions` fully intact (AC-04/AC-05); (3) invalid value, rename collision, and non-dimension-edit attempts each returned 400 with a clear message. Noted in passing: editing a nested group shifts that group's key to the end of the parent's iteration order (a `Map` delete+re-insert side effect in `applyTokenEdits`'s rebuild) — explicitly permitted by the Round-Trip Fidelity constraint, which only guarantees data, not ordering, so left as-is.
