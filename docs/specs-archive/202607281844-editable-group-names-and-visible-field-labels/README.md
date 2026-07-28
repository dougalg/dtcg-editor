# Editable Group Names and Visible Field Labels

Implemented on: 2026-07-28

Non-root groups in the token tree (`apps/web-app/components/TokenTree.tsx`) are now renameable through the exact same batched `pendingEdits`/`useSaveTokenEdits`/`PATCH` pipeline tokens already use. `packages/token-core/src/edit.ts`'s `applyOneEdit` gained a group-rename branch that cascades the renamed segment through every descendant's denormalized `path` field, and `applyTokenEdits` now stably sorts a batch by descending `path.length` before applying it sequentially — otherwise a group rename listed before an edit to one of its own descendants would invalidate that edit's path mid-batch. The client's `edit-state.ts` mirrors both the cascade and the sort so its optimistic tree can't diverge from what the server actually did. `route.ts` accepts a name-only edit targeting a group and rejects `value`/`description` on one.

Every field in the tree — editable and read-only, including `packages/token-type-dimension/src/editor.tsx`'s value/unit inputs — now has a real, visible `<label>` instead of relying solely on `aria-label`. Label text stayed per-node-specific (e.g. `"small name"`, not a generic `"Name"` caption) specifically to avoid regressing today's per-row accessible-name uniqueness, which a generic caption would have broken.

Key decisions: edits are stably sorted by descending path depth before batch application (both server and client) to make ordering safe regardless of client-supplied array order; labels use the HTML implicit-association pattern (`<label>text<input/></label>`) rather than generated `id`/`htmlFor` pairs, needing no new props on the token-type editor contract.

One known, narrow edge case was found during `/sdd-review` and left open (tracked, not blocking): staging a group rename and then editing one of that same group's own descendant fields in the same unsaved session silently bypasses the client-side collision pre-check (server-side validation at save time is unaffected — no data-loss risk). A toggle-button accessible-name regression (introduced when splitting the group name out of the expand/collapse button) was found and fixed during the same review pass.
