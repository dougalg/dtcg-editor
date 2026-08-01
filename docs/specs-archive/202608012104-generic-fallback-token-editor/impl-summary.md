## Implementation Complete

### Files Created

- `packages/token-core/src/token-types.ts` — `DTCG_TOKEN_TYPES`, `DtcgTokenType`, `isDtcgTokenType` (FR-01)
- `packages/token-core/src/token-types.test.ts`
- `apps/web-app/lib/tokens/standard-type.ts` — `isTokenDocumentStandard` (FR-03)
- `apps/web-app/lib/tokens/standard-type.test.ts`
- `apps/web-app/components/FolderOverview.test.tsx`
- `apps/web-app/components/FallbackValueEditor.tsx` (FR-04)
- `apps/web-app/components/FallbackValueEditor.module.css`
- `apps/web-app/components/FallbackValueEditor.test.tsx`
- `apps/web-app/components/TokenTree.generic-editor.test.tsx` — proves the generalized "registered non-dimension editor" branch (FR-05)

### Files Modified

- `packages/token-core/src/index.ts` — export the new type registry
- `apps/web-app/lib/token-editors/types.ts` — `TokenEditorExtension` `filter` → `type` (FR-02)
- `apps/web-app/lib/token-editors/built-in.ts` — built-in entries to `{ type, editor }`
- `apps/web-app/lib/token-editors/resolve-editor.ts` — type-equality lookup, no cast
- `apps/web-app/lib/token-editors/define-config.ts` — validates `type` against `isDtcgTokenType`
- `apps/web-app/lib/tokens/scan.ts` — `TokenFileSummary.standard` field (FR-03)
- `apps/web-app/components/FolderOverview.tsx` / `.module.css` — non-standard badge
- `apps/web-app/components/TokenTree.tsx` / `.module.css` — three-branch `canEdit`/editor resolution (FR-05)
- `apps/web-app/app/api/tokens/[...path]/route.ts` — generalized accept/reject gate (FR-06)
- `apps/web-app/lib/token-editors/resolve-editor.test.ts`, `define-config.test.ts` — new shape + dynamic AC-08 fixtures
- `apps/web-app/components/TokenTree.override.test.tsx` — mock updated to `{ type, editor }`
- `apps/web-app/components/TokenTree.test.tsx` — retargeted non-standard fixture, new fallback-editor tests
- `apps/web-app/app/api/tokens/[...path]/route.test.ts` — retargeted reject test, new accept test

### Acceptance Criteria

- [x] AC-01: Passed — `token-core/src/token-types.test.ts` ("contains exactly the 13 types...")
- [x] AC-02: Passed — `FolderOverview.test.tsx`, `scan.test.ts` ("flags a valid file that declares an unrecognized $type as non-standard")
- [x] AC-03: Passed — `TokenTree.test.tsx` ("a standard type with no built-in editor renders name/description/JSON value editor and round-trips on save"), `route.test.ts` (AC-07 accept test)
- [x] AC-04: Passed — `TokenTree.test.tsx` ("invalid JSON in the fallback editor shows a field error and does not stage an edit")
- [x] AC-05: Passed — `TokenTree.test.tsx` ("shows editable controls for a dimension token but not for a non-standard type")
- [x] AC-06: Passed — `define-config.test.ts` (missing/non-string `type`, invalid DTCG `type`)
- [x] AC-07: Passed — `route.test.ts` (non-standard rejected 400; standard non-dimension accepted 200, round-trips to disk)
- [x] AC-08: Passed — `resolve-editor.test.ts`, `define-config.test.ts` (both fixtures derived from `DTCG_TOKEN_TYPES`/`BUILT_IN_TOKEN_TYPES` at test-run time)
- [x] AC-09: Passed — all pre-existing dimension-editing tests in `TokenTree.test.tsx`, `route.test.ts`, `edit-state.test.ts` pass unmodified

### Notes

- One deviation from the literal plan text: `TokenTree.tsx`'s "registered editor" branch needed an extra type-cast on the `GenericEditor` binding (`resolvedEditor as (props: TokenTypeEditorProps<unknown>) => ReactElement | undefined`) to satisfy `eslint-plugin-react-hooks`'s `static-components` rule — without it, ESLint flagged the JSX tag as "component created during render" even though `resolveEditorForType` returns a referentially stable function. Verified the underlying pattern is safe (identical in shape to the pre-existing, lint-clean `DimensionEditorComponent` cast) and confirmed via `git stash` that this rule doesn't fire on the base branch's code.
- Three pre-existing `tsc --noEmit` errors (`read.test.ts`, `scan.test.ts`'s `mockReadFile` typing, `init-config.test.ts`) are unrelated to this feature — confirmed present on the base commit before any changes — and are not part of `next build`'s actual type-check gate (which passes cleanly), so left untouched.
- No new dependencies added, per the Minimal Dependencies constraint.
- Full verification: `pnpm build`, `pnpm lint`, `pnpm format:check`, and `pnpm test` all pass — 134 web-app tests + 31 token-core tests, 0 failures.
