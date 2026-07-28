# Feature: Editable Group Names and Visible Field Labels

## Summary

Two related usability gaps in the token tree editor are closed together. First, group/section names in `TokenTree.tsx` render as static text and cannot be renamed at all today — not just missing UI, but a gap enforced at three separate layers (`token-core`'s edit engine, the PATCH route handler, and the client-side optimistic-apply mirror), all of which explicitly reject or no-op on non-token nodes. This feature extends group renaming end-to-end through the same edit/save pipeline already used for token edits, so a user can rename a group inline exactly as they already rename a token. Second, several form fields across the editor UI — the per-type `DimensionEditor`'s value/unit inputs, and `TokenTree.tsx`'s own name/description inputs — currently carry only an `aria-label`, which is invisible to sighted users. This feature adds a real, visible, programmatically-associated `<label>` to every field, and establishes the pattern future token-type editors should follow.

## User Stories

- As a design system maintainer, I want to rename a group/section directly in the token tree, so that I can reorganize my token file's structure without hand-editing JSON.
- As a design system maintainer, I want every input in the editor (group names, token names, descriptions, and type-specific values) to have a visible label, so that I can tell what each field is for without relying on placeholder text or hovering for a tooltip.
- As a user of assistive technology, I want every field's visible label to also be its accessible name, so that a screen reader announces the same thing a sighted user reads.

## Functional Requirements

### FR-01: Inline-editable group name in the tree

Each group node in `TokenTree.tsx` renders its name as an `<input>` (replacing the current static `{node.name || "/"}` text inside the expand/collapse toggle), following the same always-visible inline-edit pattern already used for token names — not a separate modal or a click-to-reveal edit mode. Typing in the field stages a pending edit; nothing is written to disk until Save is pressed, matching today's token-edit flow.

### FR-02: Group rename validation

A staged group-name edit is validated the same way a token rename is validated today: the new name must be non-empty (after trimming whitespace) and must not collide with any existing sibling. Because groups and tokens share the same parent's keyspace (a DTCG group's `children` is a single map keyed by name, holding both token and group entries), the collision check must consider siblings of both kinds, not just sibling groups. A validation failure is shown inline next to the field (same `role="alert"` pattern already used for token name/value errors) and the invalid edit is not staged for save.

### FR-03: Group rename persists via the existing edit/save pipeline

A staged group rename is saved through the same `pendingEdits` -> `useSaveTokenEdits` -> `PATCH /api/tokens/[...path]` flow already used for token edits — no new endpoint, hook, or I/O path. This requires extending, at each layer that currently rejects or ignores group edits:

- `packages/token-core/src/edit.ts`: `applyOneEdit` currently returns a `TokenEditError` when `located.node.kind !== "token"` (line ~104-111). It must instead support renaming a `GroupNode`, including rebuilding every descendant's `path` array under the new segment (a token at `["colors","primary"]` under a group renamed from `"colors"` to `"brand-colors"` must end up at `["brand-colors","primary"]`), not just the group node's own `name`/`path`.
- `apps/web-app/app/api/tokens/[...path]/route.ts`: `patchTokenFile` has its own pre-check (line ~165-171) that rejects any edit whose located node is a group ("is a group, not a token") before `applyTokenEdits` is ever called. This check must allow a group-targeted edit through when it only touches `name` (group nodes have no `$value`/description-via-this-flow expectation beyond name, per Out of Scope below) rather than rejecting on `kind !== "token"` outright.
- `apps/web-app/lib/tokens/edit-state.ts`: the client-side `applyEditToNode` currently no-ops (`if (node.kind !== "token") return node;`) so a staged group rename never appears in the optimistically-updated local tree. It must apply the rename to a `PlainDtcgNode` of `kind: "group"` and cascade the new path prefix to every descendant, mirroring the server-side engine change.
- `apps/web-app/lib/tokens/edit-request.ts`'s `EditRequestSchema`: already generic (`path`/`name`/`value`/`description`, all structurally by-path) — no schema shape change needed, confirmed by inspection.

### FR-04: Visible, associated label for every field

Every `<input>`/`<select>` rendered by the editor UI has a visible `<label>` that is programmatically associated with it (either wrapping the control, or a `<label htmlFor="...">` paired with a matching `id` on the control) — not merely an `aria-label`, and not a placeholder standing in for a label. This applies to:

- `TokenTree.tsx`'s token name input (currently `aria-label="{node.name} name"` only)
- `TokenTree.tsx`'s token description input (currently `aria-label="{node.name} description"` only, with `placeholder="Description"`)
- `TokenTree.tsx`'s new group name input (FR-01) — gets a visible label from the start, not added after
- `packages/token-type-dimension/src/editor.tsx`'s `DimensionEditor` value input (currently `aria-label="Dimension value"` only) and unit select (currently `aria-label="Dimension unit"` only)

Where a visible label text would be redundant/awkward per-row in a dense tree layout (e.g. many rows all needing a label reading "Name"), the label may be visually styled (small, muted) but must remain real rendered text associated with the control — visually hidden via an accessibility-only technique (e.g. a `sr-only`-style clipping class) is acceptable only if the requirement is specifically about accessible-name correctness for that field, but the default expectation for this feature is genuinely visible text per FR-04's opening sentence. See Assumptions for the resolved default.

### FR-05: Labeling pattern for future token-type editors

The `DimensionEditor` fix in FR-04 establishes the concrete pattern (labeled `<input>`/`<select>` via `htmlFor`/`id` or wrapping) that any future `TokenTypeContract.Editor` implementation should follow. No change to the `TokenTypeContract` interface itself (`packages/token-type-contract/src/contract.ts`) is required — this is a UI-implementation convention within each token-type package's `Editor`, not a contract-level change.

## Acceptance Criteria

- [x] AC-01: A group node in the token tree renders its name as an editable `<input>`, not static text.
- [x] AC-02: Editing a group's name stages a pending edit; the group's displayed name updates immediately (optimistic), and nothing is written to disk until Save is pressed.
- [x] AC-03: Renaming a group to an empty/whitespace-only name is rejected with an inline error and is not staged.
- [x] AC-04: Renaming a group to a name that collides with a sibling group is rejected with an inline error, consistent with the existing token-rename collision message pattern.
- [x] AC-05: Renaming a group to a name that collides with a sibling _token_ is also rejected (siblings are checked across both kinds, not just same-kind).
- [x] AC-06: Renaming a group to its own current name is a no-op success (consistent with `checkRenameAvailable`'s existing same-name-is-fine behavior for tokens).
- [x] AC-07: Pressing Save with a staged group rename persists it to the underlying JSON file: the group's key changes and every descendant token's location moves with it, with the file's other content unchanged (round-trip fidelity preserved for everything not touched).
- [x] AC-08: Renaming a group that contains one or more tokens with their own staged-but-unsaved edits (name/value/description) saves all of them together in the same batch, and after save every token in the renamed group is reachable at its new, prefixed path.
- [x] AC-09: A rename attempt on the document root group (if reachable via this UI at all) either is not exposed as editable or is handled without crashing/corrupting the file — see Open Questions.
- [x] AC-10: `DimensionEditor`'s numeric value input and unit `<select>` each have a visible `<label>` correctly associated via `htmlFor`/`id` (or wrapping), verified via Testing Library's `getByLabelText`.
- [x] AC-11: `TokenTree.tsx`'s token name input, token description input, and new group name input each have a visible, associated `<label>`, verified via `getByLabelText`.
- [x] AC-12: No field anywhere in the editor relies solely on `aria-label` or `placeholder` for its label after this feature ships (audit is exhaustive across `TokenTree.tsx` and `packages/token-type-dimension/src/editor.tsx`; any other per-type editor existing at implementation time is included in the audit too).
- [x] AC-13: All existing tests continue to pass, and new tests cover: group rename validation (empty name, sibling-group collision, sibling-token collision, same-name no-op), group rename persistence (round-trip through `applyTokenEdits`/serialize), and label association (`getByLabelText` queries) for every field touched by FR-04.

## Technical Scope

### Affected Modules

- `packages/token-core` (`src/edit.ts` — extend `applyOneEdit`/`applyTokenEdits` to support group renames with cascading descendant path updates)
- `apps/web-app` (`app/api/tokens/[...path]/route.ts`, `lib/tokens/edit-state.ts`, `lib/tokens/plain-node.ts` if path-cascade logic needs a shared helper, `components/TokenTree.tsx`, `components/TokenTree.module.css` for label styling)
- `packages/token-type-dimension` (`src/editor.tsx`)

### New Components Required

None — no new packages, endpoints, or hooks. This is an extension of existing edit/save machinery plus a markup/labeling fix, not new infrastructure.

### Integration Points

- `useSaveTokenEdits.ts` (`apps/web-app/hooks/useSaveTokenEdits.ts`) — already generic over `ClientEdit`; expected to need no changes, confirmed by inspection.
- `EditRequestSchema` (`apps/web-app/lib/tokens/edit-request.ts`) — already generic by-path; expected to need no changes, confirmed by inspection.
- `findSiblings`/`checkRenameAvailable` (`apps/web-app/lib/tokens/edit-state.ts`) — already `kind`-agnostic; reused as-is for group-vs-group and group-vs-token collision checks (FR-02/AC-05).
- The token-type-editor **registration mechanism** (which component the tree renders for a given `$type`) is a separate, parallel backlog item ("Components like DimensionEditor need to be enabled via config, not direct imports"). This feature only fixes the _labeling_ of fields inside `DimensionEditor` and the tree's own name/description inputs — it does not touch how `DimensionEditor` is imported/resolved. If that sibling item's registry/config layer lands first or concurrently, this feature's `DimensionEditor` label fix should still apply cleanly since it's internal to the component's own render output.
- The **Save button's** styling/componentization is a separate, parallel backlog item ("Save button should look like a larger nicer call-to-action button... its own component"). This feature does not restyle or extract the Save button, even though `TokenTree.tsx` (which renders it) is otherwise touched here.

## Non-Functional Requirements

- **Performance**: Renaming a group with a large subtree still performs a single immutable tree rebuild per edit (matching the existing `applyOneEdit`/`applyEditToNode` cost model for tokens) — no new O(n^2) traversal introduced by path-cascading; a single depth-first rebuild pass is sufficient.
- **Security**: No new input surface beyond what the existing `PATCH /api/tokens/[...path]` + `EditRequestSchema` edge already validates; group names are still just `string` values subject to the same non-empty/collision validation as token names, and path traversal protection (`path-safety.ts`) is untouched since this feature doesn't change file-path resolution, only in-document node structure.
- **Accessibility**: FR-04/FR-05 and AC-10 through AC-12 are themselves the non-functional accessibility requirement for this feature — every field gets a real associated label, verified by `getByLabelText` (Testing Library's accessible-name-based query), not just `aria-label` presence.
- **Round-Trip Fidelity**: Per `docs/project.md`'s constraint, a group rename must not alter any sibling/unrelated data in the file; only the renamed key and the `path` bookkeeping of its descendants change semantically. This is exercised by AC-07/AC-08's round-trip test coverage.

## Out of Scope

- Renaming/moving a group to a _different parent_ (drag-and-drop re-nesting, cut/paste). This feature is a same-parent rename only, mirroring how token rename is scoped today (name change, not path relocation to a new parent).
- Editing a group's other DTCG fields (`$description`, `$deprecated`, `$type`) through this UI. Only the group's `name` becomes editable; description/deprecated/type editing for groups is not requested by the backlog item and is left for a future feature if wanted.
- Deleting or creating groups/tokens. Only renaming existing ones.
- The token-type-editor registration/config mechanism (import-vs-config wiring) — belongs to the sibling "enable via config" backlog item; not designed or implemented here (see Integration Points).
- The Save button's visual redesign/componentization — belongs to the sibling "nicer CTA button" backlog item; not designed or implemented here (see Integration Points).
- Any non-Dimension token-type editor beyond auditing whether one currently exists with the same aria-label-only gap; at the time of writing, `token-type-dimension` is the only implemented token-type package, so FR-04/FR-05's audit is scoped to it plus `TokenTree.tsx`'s own fields.
- Updating `docs/project.md`'s API table description of `PATCH /api/tokens/[...path]` (currently reads "Applies a batch of Dimension-token edits") to reflect group-rename support — this is `sdd-archive`'s job at the end of the SDD pipeline, not part of `feature.md`/`plan.md` implementation itself, though the implementer should be aware the description will need updating then.

## Assumptions

Made in place of synchronous clarifying questions, since no one was available to answer them when this spec was written:

1. **Inline edit pattern for group names**: matches the existing always-visible `<input>` pattern used for token names (not a click-to-reveal edit affordance, not a modal/dialog). This is the pattern already established in this codebase (`Edit Dimension Tokens in Browser` feature) and the backlog item gives no signal favoring a different pattern.
2. **Persistence path**: group renames go through the existing `pendingEdits`/`useSaveTokenEdits`/`PATCH` flow, not a new endpoint. This is both the path of least architectural disruption and consistent with `docs/project.md`'s existing API surface (one PATCH endpoint per file, batch edits).
3. **"Label for all fields" means a real visible `<label>`**, not just `aria-label` or `placeholder`. `aria-label` satisfies screen-reader accessible-name requirements but is invisible to sighted users; the backlog wording ("There should be a label for all fields") reads as a visible-UI complaint, not a pure accessibility-audit request, so visible text is the resolved interpretation. Where visible text would be visually noisy in a dense tree row, it may be small/muted-styled but must still be real rendered text, not clipped-offscreen `sr-only` text — this is a stronger bar than WCAG minimum compliance, chosen because the backlog explicitly says "There should be a label," not "there should be an accessible name."
4. **Sibling-collision scope for group renames**: siblings include both groups and tokens under the same parent, because DTCG's `GroupNode.children` is a single `Map` keyed by name shared by both kinds — a group and a token cannot have the same name under the same parent regardless of kind. This generalizes the existing token-vs-token-only collision check.
5. **Root group renaming (AC-09)**: left as an open question below rather than assumed, since the answer affects whether `TokenTree.tsx`'s outermost rendering needs a special case. The default assumption pending plan-time investigation is: the root group is rendered without a wrapping "group row" today (`TokenTree`'s top-level `<ul>` maps `node`'s children directly without an editable label of its own for `node` itself, per current source), so there is likely no UI surface for renaming the root at all, making this moot — but this should be confirmed during `/sdd-plan` against the actual root-rendering code path.
6. **Description field for groups**: not added. The backlog item's "editable section/group names" wording is about _names_ specifically; a group's description is a separate, unrequested field (see Out of Scope).

## Open Questions

- Does the document root group ever reach `TreeNode` as an editable "group" row, or is it only ever the implicit container for the top-level `<ul>`'s children (per `TokenTree`'s current top-level rendering, which passes `node`'s children into the list, not `node` itself, as a `TreeNode`)? This determines whether AC-09 needs any code at all or is automatically satisfied by the existing structure. Should be confirmed at `/sdd-plan` time by tracing `TokenTree`'s render against `toPlainNode`'s root output.
- Should the visible label for the group-name/token-name/description fields be permanently on-screen text (e.g. a small "Name" caption above/beside each input) or is a single shared visual treatment (e.g. consistent left-aligned muted micro-label) preferred across all rows to avoid repetitive-label visual clutter in a deep tree? This is a visual-design decision without a strong technical constraint either way; deferred to `/sdd-plan`/implementation-time judgment, informed by whatever `TokenTree.module.css` conventions already exist.
