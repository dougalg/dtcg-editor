# Implementation Plan: Editable Group Names and Visible Field Labels

## Overview

Extend `token-core`'s edit machinery to support renaming a group (not just a token), with a descending-path-depth stable sort in `applyTokenEdits` to make batch ordering safe regardless of client-supplied array order. Mirror the same rename-with-cascading-descendant-paths logic in the client's `PlainDtcgNode` tree. Loosen `route.ts`'s per-edit validation to accept name-only group edits. Wire a group-name input into `TokenTree.tsx` using the exact same `pendingEdits`/save flow tokens already use. Finally, replace every `aria-label`-only field (editable and read-only) with a visible label.

## Architecture Decisions

- **Label association**: uses the HTML _implicit_ label pattern — `<label>Value <input /></label>` (control nested inside the label) — rather than generating unique `id`s and using `htmlFor`. This needs zero new props on `DimensionEditor`/`TokenTypeEditorProps` (`@dtcg-editor/token-type-contract`) and zero id-collision bookkeeping across multiple rendered rows of the same token type. Accessible name becomes the label's visible text; `aria-label` attributes are removed since they're now redundant with (and would override, confusingly) the real label.
- **Cascading descendant paths on group rename**: both `token-core`'s `GroupNode`/`TokenNode` and the client's `PlainDtcgNode` store a denormalized `path` per node. A new shared-shape recursive helper (implemented twice — once server-side operating on `DtcgNode`, once client-side operating on `PlainDtcgNode`, since the two types are structurally similar but not identical and this codebase has no shared tree-walking utility package between `token-core` and `apps/web-app`) rewrites `path` for a renamed group and every descendant by replacing the renamed segment and keeping the rest of each descendant's relative path suffix intact.
- **Batch ordering**: `applyTokenEdits` stably sorts the incoming edits array by descending `path.length` before its existing sequential-apply loop. This is the single, general fix for the ordering hazard described in `feature.md` FR-04, and is a no-op behavior change for any existing all-tokens (all-same-depth-ish) batch since `Array.prototype.toSorted` (stable) preserves relative order for equal keys.
- **`route.ts` group-edit branch**: inserted right after the existing `located.node.kind !== "token"` check is removed/replaced — a group edit is accepted only if `edit.value`/`edit.description` are both `undefined`; all of Dimension's `effectiveType`/`valueSchema` checks are skipped entirely for a group edit (they don't apply — a group has no `$value`).
- **Sibling collision scope unchanged**: `findSiblings`/`checkRenameAvailable` (`edit-state.ts`) already compare by `.name` across whatever's in a parent's `children` array regardless of `kind` — confirmed by reading the current implementation; no code change needed there, only new tests exercising a group-vs-token name collision.
- **Resolves `feature.md`'s root-group Open Question**: `TokenTree`'s top-level render passes the _root node itself_ into a `<TreeNode>` (`<TreeNode node={treeState} root={treeState} .../>` inside the outer `<ul>`) — the root is not skipped, it _does_ reach `TreeNode`'s group branch. So Step 7's `node.path.length > 0` guard is not just a nicety, it's the only thing preventing the root from getting a spurious editable-name row. AC-09 is satisfied by this guard, not by the root never reaching `TreeNode`.
- **Empty/whitespace group name (`feature.md` FR-02/AC-03)**: rejected client-side only (in `TokenTree.tsx`'s new `handleGroupNameChange`, mirroring `handleNameChange`'s existing structure), the same layer today's token rename validation already lives at. This does not extend to token rename (out of scope — token rename's existing empty-name behavior is unchanged, since fixing that isn't part of this backlog item and risks an unrelated behavior change to already-shipped code).

## Implementation Steps

### Step 1: `token-core` — group rename support in `edit.ts` ✅

- [x] Add a recursive helper `renameSubtreePath(node: DtcgNode, oldPrefix: readonly string[], newPrefix: readonly string[]): DtcgNode` in `packages/token-core/src/edit.ts` — computes `newPath = [...newPrefix, ...node.path.slice(oldPrefix.length)]`; for a `GroupNode`, recurses into every child with the same `oldPrefix`/`newPrefix`; for a `TokenNode`, just returns the patched node.
- [x] Rewrite `applyOneEdit` to branch on `located.node.kind`:
  - `"token"`: unchanged existing logic.
  - `"group"`: reject if `edit.value !== undefined || edit.description !== undefined` (`TokenEditError`, "cannot set value/description on a group"); otherwise do the same current-name/new-name/sibling-collision check against `parent.children` (identical logic to the token branch, extracted into a small shared `checkSiblingCollision(parent, currentName, newName)` helper to avoid duplicating that block); build the renamed group via `renameSubtreePath(located.node, located.node.path, [...located.node.path.slice(0, -1), newName])`; rebuild the ancestor chain the same way the token branch already does.
- [x] Update `applyTokenEdits` to stably sort `edits` by descending `path.length` (`[...edits].sort((a, b) => b.path.length - a.path.length)` — `Array.prototype.sort` is stable per the ECMAScript spec since ES2019, no extra library needed) before the existing apply loop.
- Files: `packages/token-core/src/edit.ts`

### Step 2: `token-core` tests ✅

- [x] New test: renaming a group updates its own key and every descendant's `path`, verified via `findNode` at the new path returning the expected descendant.
- [x] New test: renaming a group to a name colliding with an existing sibling (both a token-sibling and a group-sibling case) returns a `TokenEditError`, tree unchanged.
- [x] New test: a batch with a descendant token edit listed _before_ its ancestor's group-rename edit in the array (the natural/expected order) still applies correctly.
- [x] New test: the same batch with the array order _reversed_ (group-rename listed first) still applies correctly identically — proves the depth-sort fix.
- [x] New test: round-trip — parse a fixture, apply a group rename via `applyTokenEdits`, serialize, re-parse, assert the re-parsed data matches applying the same edit conceptually (per the Round-Trip Fidelity constraint's existing test pattern in this package).
- [x] New test: attempting to set `value` or `description` on a group edit returns a `TokenEditError`.
- Files: `packages/token-core/src/edit.test.ts` (extends the existing test file for this module) — 13/13 tests passing, verified via `node --test src/edit.test.ts`.

### Step 3: Client-side mirror in `edit-state.ts` ✅

- [x] Add the client-side equivalent `renameSubtreePlainNode(node: PlainDtcgNode, oldPrefix, newPrefix): PlainDtcgNode` (same shape as Step 1's helper, operating on `PlainDtcgNode`'s array-based `children` instead of a `Map`).
- [x] Extend `applyEditToNode`'s matched-path branch: today it does `if (node.kind !== "token") return node;` — change to handle `kind === "group"` by computing the renamed node via the new helper (name-only; `value`/`description` are never present on a `ClientEdit` targeting a group since the UI never stages them for a group — see Step 5).
- [x] (Added beyond original plan) `applyEditsToPlainNode` also gained the same descending-`path.length` stable sort as server-side `applyTokenEdits`, so the client's optimistic-apply pass doesn't diverge from what the server actually did for the same batch.
- Files: `apps/web-app/lib/tokens/edit-state.ts`

### Step 4: Client-side tests for group rename ✅

- [x] New test: `applyEditToNode`/`applyEditsToPlainNode` renaming a group updates the group's own `path` and every descendant's `path`.
- [x] New test: `findSiblings`/`checkRenameAvailable` correctly flags a collision between a group being renamed and an existing sibling token (and vice versa).
- [x] New test: group rename + descendant edit apply correctly regardless of array order.
- Files: `apps/web-app/lib/tokens/edit-state.test.ts` — 13/13 tests passing, verified via `vitest run`.

### Step 5: `route.ts` — accept name-only group edits ✅

- [x] Replace the `if (located.node.kind !== "token")` 400-rejection block: when `located.node.kind === "group"`, validate `edit.value === undefined && edit.description === undefined` (400 otherwise), then push `{ path: edit.path, name: edit.name }` onto `tokenEdits` (skipping the Dimension `effectiveType`/`valueSchema` block entirely, which only applies to the token branch).
- [x] Skip pushing a `name` key at all if `edit.name === undefined` (a group edit with neither `name` nor other fields is a no-op edit — keep it out of `tokenEdits`).
- Files: `apps/web-app/app/api/tokens/[...path]/route.ts`

### Step 6: `route.ts` tests ✅

- [x] New test: `PATCH` with a name-only edit targeting a group succeeds (200, file written with the renamed key).
- [x] New test: `PATCH` with a group edit that also supplies `value` is rejected (400).
- [x] New test: `PATCH` with a group edit that also supplies `description` is rejected (400).
- [x] New test: `PATCH` with a group-rename edit plus a descendant token edit (both in one request) succeeds and the written file reflects both changes.
- Files: `apps/web-app/app/api/tokens/[...path]/route.test.ts` — 21/21 tests passing, verified via `vitest run`.

### Step 7: `TokenTree.tsx` — editable group name UI ✅

- [x] In the group branch, when `node.path.length > 0` (non-root), render an editable name `<input>` wrapped in a visible `<label>`, reusing `pendingEdits`/`onStageEdit`/`onFieldError` exactly like the token name field: `handleGroupNameChange` mirrors `handleNameChange`'s sibling-collision check (reusing `findSiblings`/`checkRenameAvailable` against the group's own path), rendering any staged error the same way (`role="alert"` span).
- [x] `handleGroupNameChange` additionally rejects an empty/whitespace-only trimmed name (`feature.md` FR-02/AC-03) with an inline error, before the collision check.
- [x] Root group (`node.path.length === 0`) keeps today's plain `{node.name || "/"}` text (now in its own `<span>`, not editable) — this guard is what satisfies AC-09.
- Files: `apps/web-app/components/TokenTree.tsx`

### Step 8: Visible labels everywhere ✅

- [x] **Deviation from original plan**: label text is _not_ generic ("Name"/"Description"/"Value") — it keeps the exact per-node text the old `aria-label`s already used (e.g. `"small name"`, `"small description"`), now rendered as small, muted, visible text instead of only `aria-label`. A generic per-row label would have made the accessible name identical across every row (e.g. every token's name field reading just "Name"), regressing today's per-token uniqueness and breaking every existing `getByLabelText("small name")`-style query — this way, existing tests pass completely unchanged (verified) and accessible-name uniqueness is preserved.
- [x] Token name input, description input: wrapped in `<label>` with a small muted `<span>{node.name} name</span>`/`<span>{node.name} description</span>` caption, `aria-label`/`placeholder` removed.
- [x] Read-only token row (`!canEdit` branch): same per-node caption pattern added before each bare `<span>` (name/type/value), consistent with the editable row's treatment.
- [x] New group name input: same per-node caption pattern (`{node.name} name`).
- [x] `DimensionEditor` (`packages/token-type-dimension/src/editor.tsx`): wrapped the numeric input/unit select in `<label>` with the exact old `aria-label` text ("Dimension value"/"Dimension unit") as small muted visible `<span>` captions (inline `style`, since this package has no CSS module infrastructure today), `aria-label`s removed. Kept non-unique-across-rows text as before (that was already the pre-existing behavior, `DimensionEditor` has no access to the owning token's name).
- [x] New CSS: `.field` (inline-flex wrapper) and `.fieldLabel` (small, muted caption, `opacity: 0.5`) in `TokenTree.module.css`; `.groupName` for the group name's bold styling (mirrors `.name`'s `font-weight: 600`).
- Files: `apps/web-app/components/TokenTree.tsx`, `apps/web-app/components/TokenTree.module.css`, `packages/token-type-dimension/src/editor.tsx`

### Step 9: Update/extend `TokenTree.test.tsx` ✅

- [x] Existing `getByLabelText("small name")`/`getAllByLabelText("Dimension value")`-style queries keep passing unchanged — verified, all 4 pre-existing tests pass with zero test-file edits needed for them.
- [x] New test: a non-root group's name renders as an editable input with a visible label; the root group does not.
- [x] New test: renaming a group to a colliding sibling group name shows the "already exists" error and does not stage the edit.
- [x] New test: renaming a group to an empty/whitespace-only name shows an inline error and does not stage the edit.
- [x] New test: renaming a group to its own current name is accepted (no error).
- [x] New test: saving a staged group rename calls `save()` and updates `treeState` (descendant paths included) on success.
- [x] New test: saving a group rename together with a staged edit on one of its descendant tokens in the same batch succeeds and both changes land.
- [x] New test: visible label text (the per-node `"<name> name"`/`"<name> description"` captions, plus `"Dimension value"`/`"Dimension unit"`) is present via `getByText`, not just `getByLabelText`.
- Files: `apps/web-app/components/TokenTree.test.tsx` — 11/11 tests passing (4 pre-existing + 7 new), verified via `vitest run`.

### Step 10: Full verification ✅

- [x] `pnpm build` (5/5), `pnpm lint` (10/10), `pnpm test` (10/10 tasks — 96 web-app tests, 27 token-core tests, 2 token-type-contract tests), `pnpm format:check` all pass.
- [x] Manually traced a full round trip against the real `sample_data/spacing_scale.tokens.json` fixture: renamed `spacing-scale` -> `gaps` while also editing a descendant token's description in the same batch, serialized, re-parsed — old key gone, `gaps` present, descendant path cascaded to `["gaps","0"]`, description applied, `$extensions` preserved, untouched sibling token `"1"` correctly re-pathed to `["gaps","1"]` with its own data undisturbed.

## Acceptance Criteria Mapping

| AC                                                                                       | Verified By                                                                           |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| AC-01: group renders as editable `<input>`                                               | `TokenTree.test.tsx` new test (Step 9)                                                |
| AC-02: staged group edit optimistic, not written until Save                              | `TokenTree.test.tsx` new test (Step 9)                                                |
| AC-03: empty/whitespace name rejected                                                    | `TokenTree.test.tsx` new test (Step 9)                                                |
| AC-04: sibling-group collision rejected                                                  | `TokenTree.test.tsx` + `edit-state.test.ts` + `edit.test.ts` new tests                |
| AC-05: sibling-token collision rejected too                                              | `TokenTree.test.tsx` + `edit-state.test.ts` + `edit.test.ts` new tests                |
| AC-06: same-name rename is a no-op success                                               | `TokenTree.test.tsx` new test (Step 9)                                                |
| AC-07: Save persists group rename + descendant paths correct on disk                     | `route.test.ts` new test + `edit.test.ts` round-trip test                             |
| AC-08: group rename + descendant edit save together correctly                            | `edit.test.ts` ordering tests (Step 2) + `TokenTree.test.tsx` new test (Step 9)       |
| AC-09: root group not editable (no crash/corruption)                                     | `TokenTree.test.tsx` new test (Step 9); resolved via Step 7's `path.length > 0` guard |
| AC-10: `DimensionEditor` value/unit have visible associated labels                       | `TokenTree.test.tsx`/`DimensionEditor` `getByLabelText` (Step 9)                      |
| AC-11: `TokenTree.tsx` name/description/group-name fields have visible associated labels | `TokenTree.test.tsx` `getByLabelText` (Step 9)                                        |
| AC-12: no field relies solely on `aria-label`/`placeholder` (exhaustive audit)           | Step 8's markup change + Step 9's visible-text test                                   |
| AC-13: all existing + new tests pass                                                     | Step 10 full run                                                                      |

## Risks & Mitigations

- Risk: forgetting to rewrite a descendant's `path` on rename silently produces a tree that _looks_ right (correct nesting/keys) but has stale `.path` values used elsewhere (e.g. `pathKey` in `TokenTree.tsx`/`edit-state.ts` for staged-edit lookups) → Mitigation: Step 2/4's descendant-path assertions specifically check `findNode`/`findByPath` at the _new_ path, not just tree shape.
- Risk: the depth-sort in `applyTokenEdits` accidentally reorders same-depth edits inconsistently → Mitigation: use a stable sort (native `Array.prototype.sort`/`toSorted`, stable since ES2019) and add a regression test asserting the existing "free up a name for another pending edit" same-depth-ordering test still passes unchanged.
- Risk: switching from `aria-label` to implicit `<label>` wrapping changes the accessible name text subtly (e.g. whitespace from the label's own text plus the input) → Mitigation: keep label text short and exclusive of the input (e.g. `<label>Name<input/></label>` with CSS handling visual spacing, not a text node describing the input) so the accessible name RTL/screen readers compute matches intent; verify via the existing `getByLabelText` queries first before adding new ones.

## Estimated Complexity

Medium-High — the group-rename cascading-path logic and batch-ordering fix are genuine algorithmic additions to `token-core`'s edit engine (not mechanical), touching a core invariant (Round-Trip Fidelity) that has dedicated tests to satisfy; the label work itself is straightforward, low-risk UI markup.
