# Phase 1 Data Model: Fast, Seamless Editing

This feature adds no persisted data and no wire types. The "entities" here are the
in-memory state shapes the render-isolation work introduces or reshapes, plus the recorded
measurement artifacts. Existing types (`ClientEdit`, `PlainDtcgNode`, `FieldErrors`,
`EditablePatch`) are unchanged in shape.

## 1. Staged-edit store (`useStagedEdits`)

Extracted from `TokenTree`'s three `useState` hooks into one hook so the tree can be handed
stable callbacks and per-path slices instead of whole Maps.

**State**
- `treeState: PlainDtcgNode` — the optimistically-updated tree (unchanged role; still only
  updated on successful save via `applyEditsToPlainNode`).
- `pendingEdits: Map<PathKey, ClientEdit>` — staged, unsaved edits. `PathKey = path.join(".")`.
- `fieldErrors: Map<PathKey, FieldErrors>` — per-field validation messages.

**Exposed API (all referentially stable across renders)**
| Member | Type | Notes |
| --- | --- | --- |
| `getPendingEdit(path)` | `(readonly string[]) => ClientEdit \| undefined` | Per-path selector; the value a memoized row receives as a prop |
| `getFieldError(path)` | `(readonly string[]) => FieldErrors \| undefined` | Per-path selector |
| `stageEdit(path, patch)` | `(path, EditablePatch) => void` | Same merge semantics as today; stable identity |
| `setFieldError(path, errors)` | `(path, FieldErrors) => void` | Clears the entry when both fields are `undefined` (unchanged) |
| `clearAllEdits()` | `() => void` | Replaces the "discard" path (`setPendingEdits(new Map())`) |
| `commitSavedEdits(edits)` | `(readonly ClientEdit[]) => void` | `applyEditsToPlainNode` + clear, on save success |
| `hasPendingEdits` | `boolean` | Derived; drives Save button + the unsaved-nav guard |
| `pendingEditsSnapshot()` | `() => readonly ClientEdit[]` | For `handleSave` and the rename-collision check |

**Invariants**
- INV-1: A call to `stageEdit` / `setFieldError` for path *P* MUST NOT change the identity of
  `getPendingEdit(Q)` / `getFieldError(Q)` results for any `Q ≠ P` that were unaffected.
- INV-2: Callback identities (`stageEdit`, `setFieldError`, `clearAllEdits`,
  `commitSavedEdits`) MUST be stable for the lifetime of the hook instance.
- INV-3: `hasPendingEdits === (pendingEdits.size > 0)` at all times (drives FR-018 nav guard,
  which must keep working).
- INV-4: Save success path is unchanged: `commitSavedEdits(edits)` ≡ today's
  `setTreeState(applyEditsToPlainNode(current, edits)); setPendingEdits(new Map())`.

## 2. Row-local input state (`TreeTokenNode`)

Per-row transient state so keystrokes don't touch the store.

| Field | Type | Seed | Commit trigger |
| --- | --- | --- | --- |
| `draftName` | `string` | `pendingEdit?.name ?? node.name` | blur, Enter, trailing debounce |
| `draftValue` | `unknown` | `pendingEdit?.value ?? node.value` | blur, editor's own commit, trailing debounce |
| `draftDescription` | `string` | `pendingEdit?.description ?? node.description ?? ""` | blur, trailing debounce |

**Invariants**
- INV-5: On commit, the row calls `stageEdit(path, patch)` with exactly the fields that
  changed — identical payloads to today's per-keystroke calls, just batched to commit
  points. Net staged result for a given sequence of keystrokes MUST equal today's.
- INV-6: If the store's `pendingEdit` for this path changes *externally* (e.g. a sibling
  rename frees a name, or `clearAllEdits` runs), the row re-seeds its drafts from the new
  source of truth when it is not the actively focused field.
- INV-7: Validation that currently blocks a stage (`validateTokenValue`, rename-collision,
  JSON parse in the fallback editor) still runs — at the same commit point — and still
  routes through `setFieldError`. No value is staged that would not be staged today.
- INV-8: The text caret / selection offset within a focused field is preserved across any
  re-render caused by another row or by a deferred ripple update (the field's controlled
  `value` comes from row-local state, which does not change under those renders).

## 3. Derived-render memo key (`TreeTokenNode`)

The `parseReference → contract → validation → editor-resolution` chain is memoized.

- **Key**: `(node.value identity, node.effectiveType, node.inferredType)` plus the row-local
  `draftValue` where the live editor needs the in-progress value.
- **Invariant INV-9**: Memoization is pure — for equal keys the resolved
  `{ reference, contract, validation, ResolvedEditor, editorOptions, dispatchPath }` MUST be
  behaviorally identical to recomputing. No memo across different `node` identities.

## 4. Reserved field-error slot (`TokenBlock` / `FieldErrorSlot`)

Not data so much as a layout contract, but it has a state:

| State | Rendered |
| --- | --- |
| no error | empty slot occupying reserved `min-height` (via `--dtcg-ed-*` spacing token) |
| `errors.name` and/or `errors.value` set | `role="alert"` message(s) inside the same slot, no size change to the row's other parts |

- INV-10: The slot's outer box size MUST NOT depend on whether a message is present
  (SC-002). Height is reserved for the common case of one line; multi-line overflow is
  allowed to grow *downward only* and is covered by an edge-case test.

## 5. Measurement + baseline artifacts (test-time only)

| Artifact | Location | Shape |
| --- | --- | --- |
| Perf annotations | Playwright report | `{ type: "perf", description: "<interaction> <n>ms" }` per interaction |
| Layout-shift capture | in-test only | `{ value, hadRecentInput, sources: [{ node, previousRect, currentRect }] }[]` from `PerformanceObserver` |
| Baseline record | `specs/010-fast-seamless-editing/baseline.md` | table: interaction → before ms / after ms / budget / pass |
| Large fixture | `apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json` | ~2,000 DTCG tokens across nested groups, deterministic (seeded generator), includes ≥ 1 token referenced by ≥ 100 others for SC-005 |

**Invariant INV-11**: the large fixture is generated by a committed script
(`scripts/generate-large-fixture.ts`), not hand-maintained, and is valid DTCG that the
existing parser/route loads without error.
