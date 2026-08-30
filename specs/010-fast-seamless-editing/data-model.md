# Phase 1 Data Model: Fast, Seamless Editing

This feature adds no persisted data and no wire types. The "entities" are the in-memory
state shapes the render-isolation work introduces, plus the recorded measurement artifacts.
Existing types (`ClientEdit`, `PlainDtcgNode`, `FieldErrors`, `EditablePatch`) are unchanged
in shape. `PathKey = path.join(".")`.

```ts
interface EditableFields { name: string; value: unknown; description: string; type?: string }
type ResolvedValue =
  | { kind: "value"; value: unknown; via: readonly PathKey[] }
  | { kind: "unresolved"; ref: string }
  | { kind: "cycle"; ref: string };
```

## 1. `StagedEditsStore` — the editing-session engine

One instance per `TokenTree` mount, created and owned by `useStagedEdits` (§7). A React-free
class in `apps/web-app/lib/tokens/staged-edits-store.ts`. It owns the base tree, the unsaved
overlay, reference resolution, and validation, behind a narrow key-addressed interface.

**Owned state**

| Field | Type | Changes |
| --- | --- | --- |
| `#tree` | `PlainDtcgNode` | only on `save()` success |
| `#index` | `Map<PathKey, PlainDtcgNode>` | rebuilt from `#tree` on `save()` |
| `#reverseDeps` | `Map<PathKey, Set<PathKey>>` — transitive in-file referrers | rebuilt from `#tree` + `#serverPreview` on `save()` |
| `#serverPreview` | `Map<PathKey, ResolvedValue>` — from `page.tsx`'s `referenceView` | set at construction / on `save()` |
| `#pending` | `Map<PathKey, ClientEdit>` | `commit`, `discard`, `save` |
| `#errors` | `Map<PathKey, FieldErrors>` | `commit`, `reportError`, `save` |
| `#fieldsCache` | `Map<PathKey, EditableFields>` | invalidated for the touched key on `commit` / `discard`; cleared on `save` |
| `#previewCache` | `Map<PathKey, ResolvedValue>` | invalidated for `key ∪ reverseDeps(key)` on `commit`; cleared on `save` |
| `#save` | injected `(edits) => Promise<SaveResult>` | never — constructor arg (Principle VI) |
| `#listeners` | `Set<() => void>` | `subscribe` |

**Public API**

| Member | Type | Notes |
| --- | --- | --- |
| `subscribe(fn)` | `(() => void) => () => void` | returns an unsubscribe |
| `getTree()` | `() => PlainDtcgNode` | structure/iteration source; identity stable between saves |
| `getFields(key)` | `(PathKey) => EditableFields` | base ⊕ pending, **cached** — a valid `useSyncExternalStore` snapshot |
| `getError(key)` | `(PathKey) => FieldErrors \| undefined` | stored ref or `undefined` |
| `getResolvedPreview(key)` | `(PathKey) => ResolvedValue` | walks the chain over the private `getEffectiveNode`; **cached** |
| `getHasPending()` | `() => boolean` | primitive snapshot; Save button + FR-018 nav guard |
| `getEdits()` | `() => readonly ClientEdit[]` | **imperative only** (fresh array) — for `save()`; never a subscribed snapshot |
| `validate(key, draft)` | `(PathKey, Partial<EditableFields>) => FieldErrors` | pure; no write; for optional live/inline errors |
| `commit(key, draft)` | `(PathKey, Partial<EditableFields>) => boolean` | validate → on ok: stage the diff vs. current effective value, invalidate `#previewCache` for `key ∪ reverseDeps(key)`, clear that field's error, emit; on fail: set `#errors[key]`, emit, return `false` |
| `reportError(key, errors)` | `(PathKey, FieldErrors) => void` | component-supplied validation result — used **only** for the fallback editor's JSON-parse failure; sets `#errors[key]`, emits |
| `discard(key)` | `(PathKey) => void` | drop one key's pending + error; invalidate its caches; emit |
| `save()` | `() => Promise<boolean>` | `#save(getEdits())` → on ok: `applyEditsToPlainNode(#tree, edits)`, clear `#pending`/`#errors`, rebuild `#index`/`#reverseDeps`, clear caches, emit; return the ok flag |
| private `getEffectiveNode(key)` | `(PathKey) => PlainDtcgNode \| undefined` | `#index.get(k)` ⊕ `#pending` (no draft) — used by the resolver and `validate` |

**Invariants**

- **INV-1**: `commit(P, …)` / `discard(P)` / `save()` MUST NOT change the reference returned
  by `getFields(Q)` / `getError(Q)` / `getResolvedPreview(Q)` for any `Q` that was not
  affected (for previews: `Q ∉ {P} ∪ reverseDeps(P)`).
- **INV-2**: `subscribe` and every read method have stable identity for the store instance's
  lifetime, so `useSyncExternalStore(store.subscribe, …)` never resubscribes spuriously.
- **INV-3** (snapshot stability): `getFields` / `getResolvedPreview` return **cached**
  objects, replaced only when that key's inputs actually change; `getError` returns the
  stored `FieldErrors` or `undefined`; `getServerSnapshot` for each returns the store's
  current (base-derived) value, a stable reference at first paint.
- **INV-4**: `getHasPending() === (#pending.size > 0)` at all times (FR-018 nav guard).
- **INV-5**: the instance is created once per `TokenTree` mount, never module-level; `#save`
  is injected via the constructor, never imported by the store (Principle VI). A new file
  page and each test get a fresh store.
- **INV-6**: `commit(key, draft)` validates *before* staging. On failure it writes
  `#errors[key]` and does not touch `#pending`. On success it stages only the fields whose
  draft value differs from the current effective value. The net `#pending` state for any
  sequence of `commit` calls equals today's net `pendingEdits` for the same field values.
- **INV-7**: `save()` is the only path that mutates `#tree`, via a single
  `applyEditsToPlainNode` (batch order + descendant-rename rewriting unchanged). The PATCH
  body and `token-core` serialization are untouched (Principle I, IX).
- **INV-8**: `getEffectiveNode` and everything downstream of it (the resolver, the reverse
  index) never observe a row's local `draft` — those react to committed intent only.

## 2. Row-local draft (`TreeTokenNode`, `TreeGroupNode`)

Transient per-field state so keystrokes never reach the store.

```ts
const [draft, setDraft] = useState<Partial<EditableFields>>({});
const shown = { ...store.getFields(key), ...draft };   // draft wins while typing
```

| Field | Seed | Written on | Cleared on |
| --- | --- | --- | --- |
| `draft.name` / `draft.value` / `draft.description` | absent (`{}`) | each keystroke (`setDraft`) | a **successful** `commit(key, draft)` |

**Invariants**

- **INV-9**: a keystroke updates only `draft` (`useState` in an already-`memo`'d component).
  No store call, no `useSyncExternalStore` re-subscribe, no validation, no resolution.
- **INV-10**: `shown = { ...getFields(key), ...draft }`; `draft` starts `{}` and is cleared
  after a successful `commit`. An external change to `#pending[key]` (from `save` / `discard`)
  reaches the row through `getFields(key)` with no re-seed logic and no focus check.
- **INV-11**: the focused input's `value` derives from `shown` / `draft`, which no store
  update changes underneath the user — so the caret / selection offset is preserved across a
  sibling edit and across a deferred ripple recompute (FR-002).
- **INV-12**: on a **failed** `commit`, `draft` is retained (so the user can fix the value);
  the error surfaces via `getError(key)`.

## 3. Derived-render memo (`TreeTokenNode`)

The dispatch chain (`parseReference` → contract resolution → editor resolution) is
`useMemo`'d.

- **Key**: `shown.value` + `node.effectiveType` + `node.inferredType`.
- **INV-13**: pure for equal keys — the resolved
  `{ reference, contract, ResolvedEditor, editorOptions, dispatchPath }` is behaviorally
  identical to recomputing.

## 4. Reserved field-error slot (`TokenBlock` / `FieldErrorSlot`)

| State | Rendered |
| --- | --- |
| no error | empty slot at reserved `min-height` (via `--dtcg-ed-*` spacing token) |
| `errors.name` and/or `errors.value` set | `role="alert"` message(s) inside the same slot |

- **INV-14**: the slot's outer box size does not depend on whether a message is present
  (SC-002). One line is reserved; multi-line overflow grows *downward only* (edge-case test).

## 5. Measurement + baseline artifacts (test-time only)

| Artifact | Location | Shape |
| --- | --- | --- |
| Perf annotations | Playwright report | `{ type: "perf", description: "<interaction> <n>ms" }` per interaction |
| Layout-shift capture | in-test only | `{ value, hadRecentInput, sources: [{ node, previousRect, currentRect }] }[]` from `PerformanceObserver` |
| Baseline record | `specs/010-fast-seamless-editing/baseline.md` | table: interaction → before ms / after ms / budget / pass |
| Large fixture | `apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json` | ~2,000 DTCG tokens, nested groups, deterministic (seeded generator), ≥ 1 token referenced by ≥ 100 others for SC-005 |

- **INV-15**: the large fixture is produced by a committed script
  (`apps/web-app/scripts/generate-large-fixture.ts`), not hand-maintained, and is valid DTCG
  the existing route loads without error.

## 6. Reference-resolution internals (private to the store)

- **`#reverseDeps`**: built once per `save()` by walking every in-file reference chain from
  `#tree` + `#serverPreview`; `Map<targetKey, Set<transitively-referring keys>>`.
- **`resolvePreview(key, getEffectiveNode, serverPreview)`** (pure, in
  `apps/web-app/lib/tokens/preview-resolver.ts`): parse the effective value; if `{x}`,
  recurse on `x` via `getEffectiveNode`; if `x ∉ #index`, return `serverPreview.get(x)`;
  carry a `visited: Set<PathKey>`.
- **INV-16**: `resolvePreview` is total and cycle-safe — returns a `ResolvedValue`
  (`"value" | "unresolved" | "cycle"`), never throws, never infinite-loops.
- **INV-17**: after `commit(P, …)` that changed `name`/`value`, only
  `getResolvedPreview(Q)` for `Q ∈ {P} ∪ reverseDeps(P)` may change; every other key's
  preview snapshot identity is unchanged (drives C-RI-4 / C-LR-2).
- **INV-18**: a chain hop to a key not in `#index` resolves from `#serverPreview` and is
  unaffected by any in-session edit (cross-file / unknown target).

## 7. Hooks

| Hook | Location | Signature / return |
| --- | --- | --- |
| `useStagedEdits` | `apps/web-app/hooks/useStagedEdits.ts` | `({ initialTree, referenceView, save }) => StagedEditsStore` — lazily instantiates the store once per mount, wires the injected `save`, and (via the file's `StagedEditsContext`) is provided to the subtree by `TokenTree` |
| `useTokenSlice` | `apps/web-app/hooks/useTokenSlice.ts` | `(key) => { fields, error, commit: (draft) => boolean, discard: () => void }` — two `useSyncExternalStore` reads (`getFields`, `getError`) + `commit`/`discard` bound to `key` |
| `useResolvedPreview` | `apps/web-app/hooks/useResolvedPreview.ts` | `(key) => ResolvedValue` — one `useSyncExternalStore` read of `getResolvedPreview(key)`, wrapped in `useDeferredValue`; called only by reference rows |

- **INV-19**: `useTokenSlice` / `useResolvedPreview` pass **stable** getsnapshot closures
  (bound store methods), per INV-2 / INV-3, so they never thrash the subscription.
