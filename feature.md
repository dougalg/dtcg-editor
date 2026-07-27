# Feature: Edit Dimension Tokens in Browser

## Summary
Allow the web app's user to edit Dimension-type DTCG tokens — their name, `$value`, and `$description` — directly in the browser, and save all pending edits for the currently viewed file back to that file's JSON on disk in one batch write. Every other token type remains read-only, unchanged from the existing viewer. This is the first feature to exercise `token-core`'s previously-deferred `serialize()`/round-trip path, and the first concrete implementation of the Token-Type Package Contract described in `docs/project.md` (a new pluggable-interface package plus a `dimension` token-type package that implements it).

## User Stories
- As a design system maintainer, I want to edit a dimension token's value directly in the browser so I don't have to hand-edit JSON files.
- As a design system maintainer, I want to rename a dimension token or update its description in the same place I edit its value, so cleanup doesn't require separate tooling.
- As a design system maintainer, I want to stage several dimension-token edits in one file and save them all at once, so I'm not triggering a disk write per keystroke.
- As a design system maintainer, if a save fails, I want my edits to stay visible and editable rather than silently lost, so I can retry without redoing my work.

## Functional Requirements

### FR-01: Dimension tokens are editable; all other types remain read-only
The web app's token tree/detail view lets the user edit a Dimension token's `name` (its key within its parent group), `$value`, and `$description` in place. Tokens of any other `$type` render exactly as they do today — no edit controls.

### FR-02: Dimension `$value` validation
An edited `$value` must conform to the DTCG Dimension type's value shape, per the spec at designtokens.org/tr/2025.10/format. An invalid value is rejected before it can be staged as a pending edit — the user sees why it's invalid, and the token's last valid value is retained until corrected.

### FR-03: Rename validation
Renaming a Dimension token to a name that collides with an existing sibling key (token or group) under the same parent is rejected with a clear error; the rename is not staged as a pending edit until it resolves to a unique sibling name.

### FR-04: Pending-edit staging
Edits (rename, value, description) accumulate as pending/unsaved state in the browser as the user works — nothing is written to disk until Save is triggered. Multiple Dimension tokens within the same file may each have pending edits simultaneously.

### FR-05: Batch save per file
A single "Save" action writes all pending edits for the currently viewed file to that file's JSON on disk in one operation. Saving edits across multiple files in a single action is out of scope for this pass (see Out of Scope) — each file is saved independently.

### FR-06: Round-trip-safe writes
Saving re-serializes the file's full token document — not just the edited tokens — so everything the user didn't touch round-trips unchanged (formatting/ordering aside), including unrecognized/extension fields, per the Round-Trip Fidelity constraint. This is the first feature to implement `token-core`'s `serialize()`.

### FR-07: Save failure keeps edits pending
If the save request fails for any reason (write error on the server, network failure, etc.), the pending edits remain in the browser exactly as staged — nothing is discarded — and the user sees a clear indication that the save failed, so they can retry.

## Acceptance Criteria
- [ ] AC-01: Viewing a file containing a Dimension token shows editable controls for that token's name, value, and description; a token of any other type shows no edit controls.
- [ ] AC-02: Entering a `$value` that doesn't conform to the Dimension type's spec shape is rejected with a visible error and is not staged as a pending edit.
- [ ] AC-03: Renaming a Dimension token to a name already used by a sibling is rejected with a visible error and is not staged as a pending edit.
- [ ] AC-04: Staging edits to multiple Dimension tokens in the same file, then clicking Save, writes all of them to that file in a single write.
- [ ] AC-05: After a successful save, re-reading the file from disk shows the edited name/value/description, and all other tokens/fields in the file (including any unrecognized/extension fields) are byte-for-data unchanged from before the edit.
- [ ] AC-06: Simulating a save failure (e.g. a write error) leaves the pending edits visible and still editable in the browser, with a visible failure indication.
- [ ] AC-07: `token-core` gains a `serialize()` (or equivalently named) function with round-trip tests: parse → serialize (no edits) → re-parse is deep-equal to the original parse, for every existing DTCG fixture file in the test suite.

## Technical Scope
### Affected Modules
- `packages/token-core` — new `serialize()` path; extends validation to cover the Dimension type's `$value` shape.
- `apps/web-app` — new edit UI in the token tree/detail view; new save API route; client-side pending-edit state.
- New package(s): a token-type-contract package (the pluggable `validate`/`serialize`/`render` interface described in `docs/project.md`'s Token-Type Package Contract) and a `dimension` token-type package implementing it — the first concrete token-type package in the repo.

### New Components Required
- `@dtcg-editor/token-type-contract` — the pluggable interface package (first real consumer of the previously-defined-but-unimplemented contract).
- `@dtcg-editor/token-type-dimension` (or similar name) — implements the contract for the Dimension type: a Zod schema for its `$value` shape, a render/edit component, and serialization back to DTCG JSON.
- `token-core`: `serializeTokenFile` (or similar) turning a `TokenDocument` back into DTCG JSON text.
- `apps/web-app`: a Route Handler (method/path to be pinned in `plan.md`) accepting a batch of pending edits for one file and writing the result.
- `apps/web-app`: client-side pending-edit state (staged renames/values/descriptions) and a Save control, scoped to the currently viewed file.

### Integration Points
- `token-core`'s existing `parseTokenFile`/`TokenDocument`/`TokenValue` — the edit flow loads through the existing parse path before any edits are applied.
- The existing `GET /api/tokens/[...path]` read path and `TokenTree`/`FolderOverview` components — edit controls are added to the existing tree/detail rendering rather than a separate page.
- The Error Handling (Result Pattern) constraint — the new save path's fallible operations (write failures, validation failures) return `Result`s per the established convention. UI-layer `Result` consumption conventions are still undefined repo-wide (a separate open backlog item), so this feature makes a local, feature-scoped judgment call on how the save UI surfaces a failed `Result` — flagged as an Open Question below.

## Non-Functional Requirements
- Performance: no specific target; a single-file batch write is small and user-triggered, not on a hot path.
- Security: the save endpoint applies the same path-traversal protection as the existing read endpoint (rejecting an unsafe path); edited values go through the same validation-at-the-edges treatment as any other externally-supplied data before being trusted as a `TokenValue`.
- Data integrity: Round-Trip Fidelity (FR-06/AC-05/AC-07) is the core non-functional guarantee of this feature — a save must never silently corrupt or drop data the user didn't touch.

## Out of Scope
- Editing any token type other than Dimension — all other types stay read-only.
- Structural edits beyond rename: adding new tokens, deleting tokens, moving tokens between groups, or creating/deleting groups.
- Saving edits across multiple files in a single action — deferred; the user noted this "may expand to multiple files later."
- Conflict detection when the underlying file has changed on disk since it was loaded (e.g. edited externally while the browser tab was open) — not handled in this pass.
- Establishing UI-layer `Result` consumption conventions as a repo-wide standard (separate open backlog item) — this feature makes a local, feature-scoped choice only, not a precedent-setting one.

## Open Questions
- Exact DTCG Dimension `$value` shape needs to be pinned against the spec (designtokens.org/tr/2025.10/format) during `/sdd-plan`.
- Exact HTTP method/route/request-shape for the save endpoint — to be decided in `/sdd-plan`.
- How the save UI surfaces a failed `Result` (toast, inline banner, etc.), given the repo has no established UI-layer `Result` convention yet — a feature-local decision to be made in `/sdd-plan`.
