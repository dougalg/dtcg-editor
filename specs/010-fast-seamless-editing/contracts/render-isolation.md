# Contract: Render Isolation

UI-behavior contract for the token tree while editing. "Row" = one `TreeTokenNode`.
Maps to spec FR-001..FR-004, FR-011, FR-013 and SC-001, SC-005, SC-006, SC-007.

## C-RI-1 — A keystroke re-renders only its own row

**Given** a token file rendered with ≥ 2 token rows
**When** the user types a character into any editable field of row *A*
**Then** row *A* re-renders and **no other row, group header, Save button, or page chrome
re-renders** (asserted via per-component render spy).

## C-RI-2 — Typed text echoes within one frame

**Given** any editable text field
**When** the user types at ~10 characters/second for 5 seconds
**Then** every character appears in the field, in order, with the displayed text never
trailing input by more than one animation frame, and zero characters dropped (SC-006).

## C-RI-3 — Commit reflects within 100 ms with no loading indicator

**Given** a staged edit in row *A*
**When** the user commits it (blur, Enter, or the editor's confirm control)
**Then** the new value is visible in row *A* and in any on-screen resolved-value preview
that depends on it within 100 ms, and **no spinner, skeleton, or disabled/greyed state**
appears for that edit (SC-001). The Save button enabling is not a "loading indicator".

## C-RI-4 — Referenced-token edit stays cheap and local

**Given** a token *T* referenced by ≥ 100 other tokens in the same file
**When** the user commits an edit to *T*'s value
**Then** the resolved previews of the referencing rows update in place within the same
100 ms budget, the tree does not visibly rebuild or reorder, expanded groups stay expanded,
and rows not referencing *T* do not re-render (SC-005, FR-011).

## C-RI-5 — Scroll position is preserved across an edit

**Given** the user has scrolled partway down a large file and is editing a row
**When** they commit the edit
**Then** neither the tree's nor the window's scroll position changes (FR-003).

## C-RI-6 — Staged-edit semantics are unchanged

**Given** any sequence of keystrokes and commits
**Then** the resulting `pendingEdits` map, the values sent to the PATCH route on Save, and
the on-disk file after Save are **byte-identical** to the pre-change behavior for the same
input sequence (INV-5, INV-7; regression-guarded by existing `TokenTree` / `TreeTokenNode` /
save tests continuing to pass unmodified except where they assert on render internals).

## C-RI-7 — Caret preservation under external re-render

**Given** the user's caret is at offset *k* in a focused field of row *A*
**When** an unrelated row is edited, or a deferred ripple recomputation completes
**Then** row *A*'s field keeps focus and the caret stays at offset *k* (INV-8, FR-002).

## Budgets (from spec Success Criteria)

| Interaction | Budget | Source |
| --- | --- | --- |
| Commit → value visible | ≤ 100 ms (p95) | SC-001 |
| Keystroke → char painted | ≤ 1 animation frame (~16 ms) | SC-006 |
| Referenced-token (≥ 100 referrers) commit → previews updated | ≤ 100 ms | SC-005 |
| All of the above | hold at 2,000 tokens | SC-007 |
| Every measured interaction | ≤ recorded baseline | SC-008 |
