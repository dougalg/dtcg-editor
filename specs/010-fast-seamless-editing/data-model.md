# Phase 1 Data Model: Fast, Seamless Editing

This feature adds no persisted data and no wire types. The "entities" here are the
in-memory state shapes the render-isolation work introduces or reshapes, plus the recorded
measurement artifacts. Existing types (`ClientEdit`, `PlainDtcgNode`, `FieldErrors`,
`EditablePatch`) are unchanged in shape.

## 1. Staged-edit store (`StagedEditsStore` + `useStagedEdits`)

The unsaved overlay moves out of `TokenTree`'s `useState` into a per-mount **instance
store** read through React's native `useSyncExternalStore`, so rows subscribe to just their
own slice and prop-drilling of Maps/callbacks through `TreeNode` → `TreeGroupNode` →
`TreeTokenNode` goes away entirely. `useStagedEdits()` creates the instance (lazy
`useRef`/`useState`, **never module-level**) and exposes it via `StagedEditsContext` (the
instance identity never changes, so context alone re-renders nobody).

`treeState` does **not** move into the store — it stays a plain `useState` in `TokenTree`
and changes only on save success (see §2a of `research.md`).

**Store state (private)**
- `pendingEdits: Map<PathKey, ClientEdit>` — staged, unsaved edits. `PathKey = path.join(".")`.
- `fieldErrors: Map<PathKey, FieldErrors>` — per-field validation messages.
- `listeners: Set<() => void>`.

**Store API**
| Member | Type | Notes |
| --- | --- | --- |
| `subscribe(listener)` | `(() => void) => () => void` | Adds to `listeners`; returns an unsubscribe |
| `getPendingEdit(key)` | `(PathKey) => ClientEdit \| undefined` | Returns the **stored object reference**, not a copy — a valid `useSyncExternalStore` snapshot |
| `getFieldError(key)` | `(PathKey) => FieldErrors \| undefined` | Same; stored reference or `undefined` |
| `getHasPending()` | `() => boolean` | Primitive snapshot; drives Save button + the unsaved-nav guard (FR-018) |
| `getEdits()` | `() => readonly ClientEdit[]` | **Imperative read only** (fresh array each call) — for `handleSave` and the rename-collision derivation; never used as a subscribed snapshot |
| `stageEdit(key, patch)` | `(PathKey, EditablePatch) => void` | Merge semantics identical to today's `stageEdit`; then notifies |
| `setFieldError(key, errors)` | `(PathKey, FieldErrors) => void` | Clears the entry when both fields are `undefined` (unchanged); then notifies |
| `clearAll()` | `() => void` | Empties both maps; then notifies — the "discard" path and part of save success |
| module const `EMPTY_SNAPSHOT` | — | Stable reference returned by every `getServerSnapshot` |

**Invariants**
- INV-1: A call to `stageEdit` / `setFieldError` for path *P* MUST NOT change the identity of
  `getPendingEdit(Q)` / `getFieldError(Q)` for any `Q ≠ P` that was unaffected.
- INV-2: `subscribe`, `getPendingEdit`, `getFieldError`, `getHasPending`, `stageEdit`,
  `setFieldError`, `clearAll` MUST have stable identity for the lifetime of the store
  instance (bound methods / stable closures), so `useSyncExternalStore(store.subscribe, …)`
  never resubscribes spuriously.
- INV-2a: `getPendingEdit` / `getFieldError` MUST return the stored object (or `undefined`),
  never a freshly constructed one — otherwise `useSyncExternalStore` warns and re-renders
  every commit. `getServerSnapshot` MUST return `EMPTY_SNAPSHOT` (constant reference).
- INV-3: `getHasPending() === (pendingEdits.size > 0)` at all times (FR-018 nav guard must
  keep working).
- INV-3a: The store instance is created once per `TokenTree` mount and is never module-level
  or shared across mounts — a new file page and each test get a fresh store.
- INV-4: Save-success path is net-identical to today: `TokenTree` does
  `setTreeState(applyEditsToPlainNode(current, store.getEdits())); store.clearAll();`.

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
  rename frees a name, or `clearAll` runs), the row re-seeds its drafts from the new
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
