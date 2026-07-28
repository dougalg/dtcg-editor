# Code Review: Editable Group Names and Visible Field Labels

## Summary

The implementation is solid: group rename is threaded correctly through all three layers (`token-core`, `route.ts`, client `edit-state.ts`) with a well-reasoned depth-based stable sort fixing a real batch-ordering hazard, and every field in the tree now has a visible, correctly-associated label without regressing accessible-name uniqueness. All 13 ACs are covered by passing tests (96 web-app tests, 27 token-core tests), and a manual round-trip against the real `sample_data` fixture confirms correctness beyond unit tests. One accessibility regression (toggle button losing its accessible name) was found and fixed during this review. One genuine but narrow edge-case bug remains open (see Minor finding) — it doesn't affect data integrity (server-side validation is unaffected) and isn't covered by any AC, so it doesn't block merge, but should be tracked. Ready to merge with that one caveat.

## Findings

### 🔴 Critical

| Done | Location | Category | Problem | Suggestion |
| ---- | -------- | -------- | ------- | ---------- |

None found — every AC has direct test coverage and the implementation genuinely satisfies each one (verified by reasoning through the code, not just checking a test exists).

### 🟠 Major

| Done | Location | Category | Problem | Suggestion |
| ---- | -------- | -------- | ------- | ---------- |

None found.

### 🟡 Minor

| Done | Location                                                                    | Category                | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Suggestion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---- | --------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ ]  | `apps/web-app/lib/tokens/edit-state.ts:37-58` (`findByPath`/`findSiblings`) | Correctness (edge case) | If a group rename is staged (unsaved) and the user then edits one of that group's own descendant fields in the same session, `findSiblings` looks up the parent by the descendant's stale pre-rename `node.path` against `effectiveRoot` (which already reflects the cascaded new path), so the lookup fails, returns zero siblings, and the collision check silently passes even for a name that would actually collide — reproduced via a standalone script exercising `applyEditsToPlainNode`/`findSiblings` directly. No data-loss risk: `route.ts`/`applyTokenEdits` still correctly reject a genuine collision at save time using the real, freshly-parsed server tree, so the failure mode is a missed inline warning followed by a save-time error, not corrupted data. | Thread the staged edits through path resolution before the sibling lookup (e.g. resolve the descendant's _effective_ path by walking pending group-rename edits whose `path` is a prefix of the stale path, replacing that prefix) rather than looking it up post-hoc in the fully-rebuilt `effectiveRoot`; alternatively, look up siblings against the static, never-mutated `root` and overlay only each sibling's own pending `name` by direct path-key lookup instead of rebuilding the whole tree. |

### 🔵 Info / Suggestions

| Done | Location                                                                                                  | Category      | Problem                                                                                                                                                                                                                                                                                        | Suggestion                                                                                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [x]  | `apps/web-app/components/TokenTree.tsx:213-221` (toggle button)                                           | Accessibility | Splitting the group name out of the toggle `<button>` left the button with no accessible name at all (previously `"▾ spacing"`, now just `"▾"`) — a real regression in a feature that's explicitly about accessibility.                                                                        | Fixed during this review: added `aria-label={\`${expanded ? "Collapse" : "Expand"} ${node.name \|\| "/"}\`}` to the toggle button; existing tests re-run and still pass. |
| [ ]  | `packages/token-core/src/edit.ts:56` / `apps/web-app/lib/tokens/edit-state.ts` (`renameSubtreePlainNode`) | Duplication   | The descendant-path-cascade algorithm is implemented twice (once over `Map`-based `GroupNode.children`, once over array-based `PlainDtcgNode.children`) — a deliberate, documented tradeoff per `plan.md` (no shared tree-utility package exists between `token-core` and `apps/web-app` yet). | No action needed now (Rule of Three); revisit if a third near-identical tree-walk shows up.                                                                              |

## Acceptance Criteria Coverage

| AC                                                          | Test                                                                                            | Status     |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| AC-01: group renders as editable `<input>`                  | `TokenTree.test.tsx` "a non-root group's name is an editable input..."                          | ✅ Covered |
| AC-02: staged edit optimistic, not written until Save       | same test + `handleSave`/`applyEditsToPlainNode` flow                                           | ✅ Covered |
| AC-03: empty/whitespace name rejected                       | `TokenTree.test.tsx` "rejects a group rename to an empty/whitespace-only name..."               | ✅ Covered |
| AC-04: sibling-group collision rejected                     | `TokenTree.test.tsx`/`edit-state.test.ts`/`edit.test.ts`                                        | ✅ Covered |
| AC-05: sibling-token collision rejected too                 | `edit-state.test.ts`/`edit.test.ts`                                                             | ✅ Covered |
| AC-06: same-name rename is a no-op success                  | `TokenTree.test.tsx` "accepts a group rename to its own current name..."                        | ✅ Covered |
| AC-07: Save persists rename + descendant paths              | `route.test.ts` "PATCH renames a group..." + `edit.test.ts` round-trip                          | ✅ Covered |
| AC-08: group rename + descendant edit save together         | `edit.test.ts` ordering tests + `route.test.ts`/`TokenTree.test.tsx` "...together"              | ✅ Covered |
| AC-09: root group not editable, no crash                    | `TokenTree.test.tsx` (4 inputs, root excluded) + `edit.ts`'s parent-undefined guard             | ✅ Covered |
| AC-10: `DimensionEditor` visible associated labels          | `TokenTree.test.tsx`/existing `getByLabelText`/`getByText`                                      | ✅ Covered |
| AC-11: `TokenTree.tsx` fields visible associated labels     | `TokenTree.test.tsx` `getByLabelText`/`getByText`                                               | ✅ Covered |
| AC-12: no field relies solely on `aria-label`/`placeholder` | Manual audit of `TokenTree.tsx` + `editor.tsx` (exhaustive, only these two files render fields) | ✅ Covered |
| AC-13: all existing + new tests pass                        | Full `pnpm build`/`lint`/`test`/`format:check` run                                              | ✅ Covered |

## Verdict

- [x] ✅ Ready to merge
- [ ] 🟡 Merge after minor fixes (no re-review needed)
- [ ] 🟠 Requires fixes and re-review
- [ ] 🔴 Do not merge — significant issues found
