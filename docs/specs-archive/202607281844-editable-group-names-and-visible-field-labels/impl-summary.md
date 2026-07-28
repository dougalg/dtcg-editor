## Implementation Complete

### Files Created

- None — this extends existing files only, no new modules.

### Files Modified

- `packages/token-core/src/edit.ts` — group-rename support (`renameSubtreePath`, `checkSiblingCollision`), `applyOneEdit` branches on node kind, `applyTokenEdits` stably sorts by descending `path.length`.
- `packages/token-core/src/edit.test.ts` — 8 new tests (rename, collisions, ordering both directions, value/description rejection, round-trip).
- `apps/web-app/lib/tokens/edit-state.ts` — client-side mirror: `renameSubtreePlainNode`, `applyEditToNode` group branch, `applyEditsToPlainNode` depth-sort.
- `apps/web-app/lib/tokens/edit-state.test.ts` — 4 new tests (cascade, ordering, cross-kind sibling collision).
- `apps/web-app/app/api/tokens/[...path]/route.ts` — `patchTokenFile` accepts name-only group edits, rejects `value`/`description` on a group.
- `apps/web-app/app/api/tokens/[...path]/route.test.ts` — 4 new tests (rename persists, value/description rejected, rename+descendant edit together).
- `apps/web-app/components/TokenTree.tsx` — non-root groups get an editable name input (empty-name + collision validation); every field (editable and read-only) gets a visible label instead of `aria-label`-only.
- `apps/web-app/components/TokenTree.module.css` — new `.field`/`.fieldLabel`/`.groupName` classes.
- `apps/web-app/components/TokenTree.test.tsx` — 7 new tests (editable/root guard, collision, empty-name, same-name no-op, save + descendant-edit-together, visible-label-text).
- `packages/token-type-dimension/src/editor.tsx` — value/unit inputs get visible labels (kept the exact old `aria-label` text, now visible + inline-styled small/muted).

### Acceptance Criteria

- [x] AC-01: Passed — `TokenTree.test.tsx` "a non-root group's name is an editable input..."
- [x] AC-02: Passed — same test, staged edit only applied to `treeState` after successful `save()`.
- [x] AC-03: Passed — `TokenTree.test.tsx` "rejects a group rename to an empty/whitespace-only name..."
- [x] AC-04: Passed — `TokenTree.test.tsx`/`edit-state.test.ts`/`edit.test.ts` sibling-group collision tests.
- [x] AC-05: Passed — `edit-state.test.ts`/`edit.test.ts` sibling-token collision tests.
- [x] AC-06: Passed — `TokenTree.test.tsx` "accepts a group rename to its own current name..."
- [x] AC-07: Passed — `route.test.ts` "PATCH renames a group, moving descendants..." + `edit.test.ts` round-trip test.
- [x] AC-08: Passed — `edit.test.ts` ordering tests (both array orders) + `route.test.ts`/`TokenTree.test.tsx` "...together" tests.
- [x] AC-09: Passed — root group guarded by `node.path.length === 0` in `TokenTree.tsx`; `TokenTree.test.tsx` confirms exactly 4 text inputs render (root excluded).
- [x] AC-10: Passed — `DimensionEditor` value/unit `getByLabelText`/`getByText` continue to pass unchanged.
- [x] AC-11: Passed — `TokenTree.tsx` name/description/group-name fields verified via `getByLabelText`/`getByText`.
- [x] AC-12: Passed — exhaustive audit of `TokenTree.tsx` + `DimensionEditor`; no field left on `aria-label`/`placeholder` alone.
- [x] AC-13: Passed — `pnpm build`/`lint`/`test`/`format:check` all green; 96 web-app tests (11 in `TokenTree.test.tsx`, up from 4), 27 token-core tests (up from 5).

### Notes

- **Deviation from plan.md's original label-text approach**: used per-node label text (e.g. `"small name"`) matching the old `aria-label` wording, rather than generic captions ("Name"/"Description") — a generic caption would have made every row's accessible name identical, regressing today's per-token uniqueness and breaking every existing `getByLabelText("small name")` query. Documented in `plan.md`'s Step 8.
- `feature.md` was refined mid-implementation to a more detailed structure (13 ACs with explicit empty-name/same-name/root-group requirements) after Steps 1–2 were already implemented against an earlier draft; `plan.md` was reconciled to the refined spec before continuing (empty-name validation, same-name no-op test, and the root-rendering open question were resolved and added).
- No new dependency added.
- Manually verified against the real `sample_data/spacing_scale.tokens.json` fixture beyond unit tests (see `plan.md` Step 10).
