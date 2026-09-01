# Phase 1 Data Model: Edit Token References

Entities the feature introduces or consumes. Nothing here is persisted — the
only write is the existing reference `$value` PATCH. Types marked *(existing)*
come from `packages/token-core` or feature 007's
`apps/web-app/lib/tokens/reference-index.ts` and are reused unchanged.

---

## ResolutionChain *(existing — `@dtcg-editor/token-core`)*

Already POJO-shaped, so it crosses the API and the RSC boundary as-is.

- `steps: ChainStep[]` — `{ path: string[], file: string, mode: string | undefined }`
- `outcome: ChainOutcome` — discriminated on `kind`:
  - `{ kind: "resolved", value: unknown, type: string | undefined }`
  - `{ kind: "unresolved", missingPath: string[] }`
  - `{ kind: "group-target", groupPath: string[] }`
  - `{ kind: "circular", cyclePath: string[] }`

Used for both a candidate's own preview and the hypothetical edited-token
preview. `ResolutionChainWire` in the API contract is structurally this type
with a Zod schema attached.

---

## ReferenceCandidate

One distinct token path in the loaded directory that a reference could point
at. Produced by `buildReferenceCatalogue`; carried in the API response.

| Field | Type | Notes |
| --- | --- | --- |
| `path` | `string[]` | The token's full path segments. Unique key of the entry. |
| `displayPath` | `string` | `path.join(".")` — precomputed for the substring filter and the row label. |
| `effectiveType` | `string \| undefined` | For empty-query band 1 (FR-020) and choosing the right built-in `Preview`. |
| `definitions` | `CandidateDefinition[]` | One per mode when multiply defined (FR-003), else one with `mode: undefined`. |
| `preview` | `CandidatePreviewOutcome[]` | The candidate's *own* resolved value(s), one per mode. Server-computed. |

**Rules**

- Group paths are **excluded** — a reference target must be a token
  (`resolveReference` returns `group-target` for a group, so a group is only
  ever seen as a diagnostic on a pre-existing broken reference, never offered).
- A path defined in N files/modes appears **once** with N `definitions`
  (FR-003), not N times.
- Ordering in the response is unspecified; the client's `candidate-filter`
  imposes order (FR-004 / FR-020).

---

## CandidateDefinition

One place a candidate path is defined, after per-mode file precedence is
resolved (same logic as `reference-index.ts` `buildDefinitionsForPath`).

| Field | Type | Notes |
| --- | --- | --- |
| `mode` | `string \| undefined` | `undefined` when the set defines no modes or the path has a single definition. |
| `file` | `string` | Relative path of the winning file for this mode. |
| `rawValue` | `unknown` | The token's authored `$value` (may itself be an alias string). Needed for client-side hypothetical resolution (research §4). |

---

## CandidatePreviewOutcome

| Field | Type | Notes |
| --- | --- | --- |
| `mode` | `string \| undefined` | Labels the row when the target is multiply defined (FR-011). |
| `outcome` | `ResolutionChainWire` | Result of resolving *this candidate's own* reference/value for this mode. |

---

## ReferenceCatalogue (API response root)

| Field | Type | Notes |
| --- | --- | --- |
| `modes` | `string[]` | All mode names in the set (`[]` when unmoded). Mirrors `ReferenceIndex.modes`. |
| `candidates` | `ReferenceCandidate[]` | Every token path in the directory (groups excluded). |

Rebuilt per request, never cached server-side. Client caches it per token-set
for the session (research §5).

---

## CandidateRowState (client-only, derived — one per rendered row)

Not transported. Computed as the filtered candidate list is mapped to
`CommandItem`s.

| Field | Type | Notes |
| --- | --- | --- |
| `candidate` | `ReferenceCandidate` | The row's candidate. |
| `circular` | `boolean` | `candidate-selectability.isCircularIfSelected(editedTokenPath, candidate)` — `candidate.path` deep-equals `editedTokenPath` (self, the one-hop cycle), **or** `editedTokenPath` appears in any `candidate.preview[].outcome.steps[].path`. |
| `selectable` | `boolean` | `!circular`. Missing / group candidates are selectable; only `circular` disables (FR-024). |
| `diagnostic` | `"none" \| "missing" \| "group" \| "circular"` | Worst outcome across `candidate.preview` (for the row's icon/label). `circular` here ⇔ `circular` above. |

Rendered as `<CommandItem disabled={!selectable}>` with a distinct icon + short
text label per `diagnostic`; `circular` rows show the "circular-reference"
label and are not reachable by keyboard or pointer (FR-024).

## HypotheticalResolution (client-only, derived — highlighted candidate only)

Not transported. Produced by `hypothetical-resolution.ts` for the currently
highlighted candidate — the rich preview (FR-012) and the cycle-member list
when naming a circular chain (FR-014). Not computed for every row (that is
`CandidateRowState` above).

| Field | Type | Notes |
| --- | --- | --- |
| `editedTokenPath` | `string[]` | The token being repointed. |
| `candidatePath` | `string[]` | The highlighted target. |
| `isSelf` | `boolean` | `candidatePath` deep-equals `editedTokenPath`. Structural. Presented as a circular reference, not a separate "self-reference" category (FR-013). |
| `perMode` | `{ mode: string \| undefined, chain: ResolutionChain }[]` | `resolveReference` run against a synthetic lookup reflecting the proposed edit, once per mode. Surfaces `circular` (with `cyclePath`) when the pick would close a loop (FR-014). |

---

## StagedReferenceEdit

Not a new type — it is the existing `ClientEdit` (`lib/tokens/edit-state.ts`)
with only `{ path, value }` populated, `value` being the alias string
`"{" + candidatePath.join(".") + "}"`.

| Aspect | Behaviour |
| --- | --- |
| Create | `onStageEdit(node.path, { value })` on **selectable** candidate select (FR-006). |
| Blocked | A circular row (`CandidateRowState.selectable === false`) cannot be chosen — no stage, popover stays open (FR-024, SC-008). |
| No-op | If `value` equals the token's current (or pending) reference value, stage nothing (FR-019). |
| Persist | Existing `PATCH /api/tokens/[...path]`; `route.ts` already writes a reference `$value` verbatim (FR-007). |
| Discard | Existing "discard pending edits" clears it; existing navigation guard applies (FR-008). |
| Re-open indication | Picker reads the pending `ClientEdit` for this path and marks that candidate `aria-current` / selected (FR-018). |

---

## State transitions — picker session

```
closed ──activate trigger──▶ opening
opening ──catalogue cached?──▶ open(ready)
        └──no, fetch──▶ open(loading) ──fetch ok──▶ open(ready)
                                       └──fetch err──▶ open(unavailable)
open(ready) ──type──▶ open(ready, filtered)             (FR-004)
open(ready, filtered) ──0 matches──▶ open(empty)         (FR-017, no selection)
open(ready) ──highlight candidate──▶ preview updates     (FR-009..FR-016)
open(ready) ──highlight circular row──▶ preview shows circular; row is disabled (FR-024)
open(ready) ──select SELECTABLE candidate──▶ stage edit + closed (FR-006)
open(ready) ──try to select circular row──▶ no-op, stays open  (FR-024, SC-008)
open(*) ──Escape / select──▶ closed, focus to trigger    (clarified 2026-09-01)
open(unavailable) ──▶ raw alias text remains editable as plain text (FR-021)
```
