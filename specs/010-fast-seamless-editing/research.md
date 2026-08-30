# Phase 0 Research: Fast, Seamless Editing

All items below were open questions in the Technical Context. None remain marked
NEEDS CLARIFICATION.

## 1. Where the cost actually is today

**Decision**: Treat "every keystroke re-renders the whole file's tree" as the root cause and
fix it at the render-isolation level first; do not start with virtualization.

**Evidence gathered from the code**:

- `TokenTree.tsx` holds `treeState`, `pendingEdits: Map`, `fieldErrors: Map` in `useState`.
  `stageEdit` and `setFieldError` build a **new `Map`** each call and pass it (plus freshly
  created `stageEdit` / `setFieldError` closures) down through `TreeNode` →
  `TreeGroupNode` → every `TreeTokenNode`.
- No `memo`, `useCallback`, `useMemo`, `useDeferredValue`, `useTransition`, or windowing
  exists anywhere under `apps/web-app/components` or `hooks` (single `useCallback` in
  `useTheme.ts`, unrelated).
- Each `TreeTokenNode` render re-executes `parseReference`, `resolveBuiltInContract`,
  `validateTokenValue`, `resolveEditorForType`, and `handleNameChange` re-runs
  `applyEditsToPlainNode(root, …)` over the entire tree **per keystroke**.
- Native `<details>` groups are uncontrolled, so expansion state already survives
  re-render — no work needed there, and controlling them would *regress* stability.

**Rationale**: The dominant cost is O(nodes-in-file) React work + O(nodes) validation work
on each keystroke, triggered by shared-Map identity changes and unstable callbacks. Cutting
the render set to "the one edited row" removes the lag, the caret loss (caused by the input
unmounting/remounting or its `value` prop churning), and most out-of-region layout shift in
one move. Virtualization addresses a *different* cost (initial mount of thousands of DOM
nodes) and adds scroll-anchoring and focus-management complexity that itself risks the
stability guarantees; keep it in reserve (see §7).

**Alternatives considered**:
- *Virtualize first*: rejected as the opening move — heavier, riskier for SC-002/003, and
  possibly unnecessary at 2,000 nodes once renders are isolated.
- *Global state library (Zustand/Redux/Jotai)*: rejected — new dependency (Principle VIII);
  a per-mount instance store read through React's native `useSyncExternalStore` (see §2)
  covers it with zero dependencies.

## 2. Render-isolation technique — a deep staged-edits store

**Decision**: One `StagedEditsStore` per `TokenTree` mount owns the whole editing session —
base tree, unsaved overlay, reference resolution, validation — behind a small key-addressed
interface. Components stay thin: read what they need for one `key`, hold only transient
per-field draft state, call `store.commit(key, draft)`. Subscriptions are React's native
`useSyncExternalStore`; `memo` on the tree components.

**Public store surface** (the path index, the reverse-dependency index, the chain resolver,
and `getEffectiveNode` are all *private*):

| Member | Kind | Purpose |
| --- | --- | --- |
| `subscribe(fn)` | — | listener registration |
| `getTree()` | read | base tree for structure/iteration; stable ref between saves |
| `getFields(key)` | read (cached) | `{name,value,description,type}` = base ⊕ pending; what a row renders |
| `getError(key)` | read | `FieldErrors \| undefined` from the overlay |
| `getResolvedPreview(key)` | read (cached) | what the token at `key` currently evaluates to (walks refs) |
| `getHasPending()` | read | boolean; Save button + unsaved-nav guard |
| `validate(key, draft)` | pure | `FieldErrors` for a candidate draft, no write — optional live/inline errors |
| `commit(key, draft)` | write | validate → on ok stage the diff + invalidate affected preview caches + emit; on fail set `#errors[key]` + emit; returns `boolean` |
| `reportError(key, errors)` | write | component-side validation result (only the fallback editor's JSON-parse failure); sets `#errors[key]` + emits |
| `discard(key)` | write | drop one key's pending |
| `save()` | write + I/O | injected `#save(edits)` → `applyEditsToPlainNode` into base tree → clear overlay → rebuild indexes/caches → emit |

**Why a deep store, not a thin one + component-side logic** (the previous revision of this
section): merge, resolution, validation, and base-tree ownership are one cohesive
responsibility — "the in-progress editing session for this file". Splitting it across five
components plus a bag of helpers is the shallow-module shape the repo's codebase-design
guidance argues against. A deep module with a narrow interface concentrates the tricky parts
(cache invalidation, cycle-safe resolution, rename-collision) in one React-free,
independently unit-tested place: `apps/web-app/lib/tokens/staged-edits-store.ts`.

**`useSyncExternalStore` snapshot stability — the store keeps this correct, not the
component**:
- `getFields(key)` / `getResolvedPreview(key)` return **cached** objects (`#fieldsCache`,
  `#previewCache`), replaced only when that key's inputs change. `commit` / `discard` /
  `save` invalidate precisely — for previews, `key ∪ reverseDeps(key)` and nothing else — so
  a subscriber whose key was untouched gets the same reference back and `useSyncExternalStore`
  skips it.
- `getError(key)` returns the stored `FieldErrors` or `undefined` — both stable.
- `getServerSnapshot` returns the store's current (base-derived) value: the store exists
  during SSR of this `"use client"` subtree, there are no pending edits at first paint, so
  there is no hydration mismatch.
- No `use-sync-external-store/with-selector` shim — the store does its own memoization, so
  the feature stays dependency-free (Principle VIII).

**Memo boundaries.** `memo()` on `TreeGroupNode`, `TreeTokenNode`, `TreeNode`. Their props
are only `node` (structure, from `getTree()`, stable between saves) and `relativePath`. A
sibling edit changes neither, so only the edited row re-renders — from its own local `draft`
state and its own `useTokenSlice` subscription.

**Alternatives considered**:
- *Thin store (edits only) + merge/validate/resolve in components*: rejected — smears one
  responsibility; every component would need the effective tree for rename-collision anyway.
- *Lifted `useState` + selector props*: rejected — threads callbacks through three layers.
- *State library (Zustand/Jotai/Redux)*: rejected — a ~120-line hand-rolled class covers it.
- *`memo` + custom `arePropsEqual` over Maps*: rejected — O(n) per row per keystroke.
- *React Compiler*: not configured in this repo; out of scope.

## 2a. The overlay is never merged into a tree except on save

**Decision**: `#pending` is only ever *overlaid per key* by `getFields` / `getEffectiveNode`;
it is never folded into a new tree while editing. The base tree lives inside the store and
changes in exactly one place — `save()` success, via a single `applyEditsToPlainNode`.
`TokenTree` no longer holds a `treeState` `useState`; there is one owner.

**Rationale**: an edit stays an O(1) map write + O(1) cache invalidation, never an O(tree)
rebuild — the per-keystroke `applyEditsToPlainNode(root, …)` in today's `handleNameChange`
is one of the costs being removed. The single authoritative merge at save keeps the next
round's baseline paths correct (descendant renames), mirroring `token-core`'s server-side
`applyTokenEdits`.

## 3. Keeping typed text within one frame (SC-006)

**Decision**: The row holds the in-progress value in local `useState` (`draft`); a keystroke
is `setDraft` only — no store call, no `useSyncExternalStore` sweep, no validation, no
resolution. The displayed value is `{ ...store.getFields(key), ...draft }`. Everything a
commit triggers (validation, staging, the reference ripple) runs on blur / Enter / a short
trailing debounce, and the dependent-preview read is wrapped in `useDeferredValue` so a fast
commit-then-type never blocks the input's own paint. No artificial throttling of the input.

**Rationale**: Dropped characters and lag come from heavy synchronous work between `keydown`
and paint. A keystroke that only touches one `useState` in an already-`memo`'d row is the
minimal possible path.

**Alternatives considered**: `flushSync` tuning (rejected — treats the symptom);
uncontrolled inputs with `defaultValue` + refs (rejected — the typed editors are controlled
and need the live value to render).

## 3a. Live reference resolution (FR-011 / SC-005)

**Decision**: resolution is internal to the store.
- On `save()` (and at construction) the store builds a **reverse-dependency index** from the
  base tree + the server `referenceView` that `page.tsx` already computes:
  `Map<targetKey, Set<transitively-referring keys in this file>>`.
- `getResolvedPreview(key)` walks the reference chain over the *private* `getEffectiveNode`
  (base ⊕ pending, **no draft**): a hop to `{x}` recurses on `x`; a hop to a key not in this
  file's index resolves from the server `referenceView` value (cross-file / unknown); a
  `visited` set makes it cycle-safe and total — it returns a value or
  `{ kind: "cycle" | "unresolved" }`, never throws, never loops.
- `commit(key, …)` that changed `name` / `value` invalidates `#previewCache` for
  `key ∪ reverseDeps(key)` only, then emits. Reference rows subscribe via
  `useResolvedPreview(key)`; only those in the invalidated set get a changed snapshot and
  re-render.

**Why it stays performant at ≥ 100 referrers (SC-005)**: the reverse index means only the N
real dependents recompute; each recompute is O(chain-depth) map lookups; it is deferred; and
a dependent whose *resolved value* didn't actually move keeps a stable snapshot, so it does
not re-render at all.

**Boundary**: you can only stage edits in the currently-open file, so a chain that exits the
file has no link that can change this session — its preview legitimately stays on the server
value.

**New work regardless**: today previews are 100% server-baked (`node.references[i]`) and
only refresh on save + reload — there is no client resolver to reuse, though the chain-walk
can lean on `token-core`'s I/O-free primitives where they fit.

## 3b. Where validation runs

**Decision**: inside the store. `commit(key, draft)` runs `validateTokenValue` (against the
`contract` for the effective `$type`) and the rename-collision check (against the effective
sibling set the store already holds) *before* staging; on failure it records `#errors[key]`
and stages nothing. A pure `validate(key, draft)` is also exposed for a field that wants an
inline error *while typing* without staging.

**Rationale**: rename-collision needs the effective tree, which the store owns; `commit` as
an atomic validate-or-reject is a narrow, testable seam; `#errors` already lives in the
store.

**Seams that deliberately stay in the component**: adapting a DOM / editor `onChange`
payload into a candidate value — including the fallback editor's `JSON.parse` of textarea
text, whose parse failure the component reports via `store.reportError(key, …)` — and
*rendering* a type-specific invalid-value UI (`contract.ValidationErrorHandler` /
`DefaultValidationErrorHandler`): the store yields error *data*, the component draws it.

**Behavior change**: inline errors now surface on **commit** (blur / Enter / debounce), not
per keystroke — less flicker, fits the reserved-slot model. `validate()` is the escape hatch
where a field wants live errors.

## 4. Layout stability on Tab / focus change (SC-002, SC-003)

**Decision**:
- **Reserve space for validation messages.** `TokenBlock` always renders a field-error
  region with a fixed `min-height` (via `--dtcg-ed-*` spacing token, add one if absent), so
  a message appearing/clearing on keystroke or blur never moves siblings. `role="alert"`
  content goes *inside* the reserved region.
- **Reserve space for focus-revealed helper UI.** Anything that appears on focus
  (hints, `TypeSuggestion`, affordances) either is always present (visually muted) or lives
  in pre-reserved space — never inserted into flow on focus.
- **Guarantee the focus ring is never clipped.** Audit `overflow` on `TokenBlock` /
  tree ancestors; use `outline` + `outline-offset` (not `box-shadow` that a parent clips),
  and ensure scroll containers have room for the ring. The existing e2e helper
  `hasVisibleFocusIndicator` (checks `outlineStyle` / `boxShadow`) stays valid.
- **Do not control `<details>`.** Keep native uncontrolled disclosure; `useTokenArrival`'s
  direct `.open = true` DOM mutation on navigation is fine and stays.

**Rationale**: Every "unexpected reflow on tab" in a form like this traces to content
entering or leaving flow on focus/blur, or a size change from a validation message. Reserve
the space and the reflow can't happen. Clipped focus rings are the other half of SC-003 and
are a pure CSS-ancestor `overflow`/`outline` question.

**Alternatives considered**: animating message height (rejected — motion is itself visible
churn and a11y-hostile); portaling errors (rejected — detaches them from the field for AT).

## 5. Measuring it (SC-001, SC-002, SC-006, SC-008)

**Decision**: Three tiers, all on existing infra:

| What | Where | How |
| --- | --- | --- |
| Edit-echo latency, typing lag, ripple latency | Playwright (`e2e/editing-perf.spec.ts`), against `pnpm run start` prod build | `page.evaluate` around a real keystroke/commit; `performance.now()` deltas; record via `testInfo.annotations` `type: "perf"` (pattern already in `e2e/color-editor-perf.spec.ts`); assert `< 100 ms` / `< ~1 frame` with margin |
| Zero out-of-region layout shift on edit / tab / ripple | Playwright (`e2e/render-stability.spec.ts`) | `PerformanceObserver({ type: "layout-shift" })` collected in-page over the interaction; assert no shift whose `sources` fall outside the edited field + its error slot. Helper in `e2e/support/stability.ts` |
| Row-render isolation (a sibling edit renders 0 other rows) | Vitest browser-mode `*.a11y.test.tsx` (real cascade) or jsdom `*.test.tsx` | Render a small tree with a render counter/spy per row; type in row A; assert only row A re-rendered; assert `axe` clean |

**Baseline (SC-008)**: capture the same Playwright measurements on `main` (or the first
commit of this branch, pre-change) and commit them to
`specs/010-fast-seamless-editing/baseline.md` as "before"; the perf specs then assert
"meets budget AND not worse than baseline on any measured interaction".

**Rationale**: `layout-shift` PerformanceObserver entries carry `sources` with the shifted
`node` and its previous/current rects — enough to prove a shift was confined to the intended
region. Playwright runs against the production build already (per `playwright.config.ts`
`webServer: pnpm run start`), so numbers are representative. No new tooling.

**Alternatives considered**: Chrome DevTools trace parsing (rejected — brittle, CI-hostile);
`web-vitals` package for CLS (rejected — new dep, and page-level CLS is coarser than the
per-region assertion needed here); React Profiler API in prod (rejected — needs the
profiling build; the render-count spy at component-test level covers the same claim).

## 6. Spec User Story 3 vs. the actual UI

**Decision**: Implement US3 as: *an edit or a focus move in one token row must not visibly
re-render, reflow, or reorder any other row, the group headers, the Save button, or the page
header/back-link.* Add one large-fixture Playwright case that screenshots / observes
everything outside the actively edited row and asserts it is unchanged across a full
tab-through and across an edit to a widely-referenced token.

**Rationale**: The spec's "select token B, panel swaps" model doesn't exist here
(`app/tokens/[...path]/page.tsx` renders one `TokenTree` with **all** tokens editable
inline; there is no selection/panel). The intent — "no unexpected re-renders elsewhere" — is
fully preserved by the row-isolation reading. Cross-**file** navigation is a full page load
(`window.location.assign`) and out of scope for "moving around the page".

**Resolved** (`/speckit-analyze` pass): spec.md US3 / FR-009 / FR-010 / SC-004 are now
phrased in inline-tree terms, and FR-016 (cross-view shared chrome) — moot under full-page
navigation — was removed. This section stands as the rationale for those edits.

## 7. Virtualization — decision gate (Principle VIII)

**Decision**: **Not in the initial implementation.** Add a task to re-measure SC-001 /
SC-006 / SC-007 at 2,000 tokens *after* render isolation lands. Only if a measured budget is
still missed:
1. Raise a `speckit-constitution` amendment to add a windowing library to Approved
   Dependencies (or justify a hand-rolled windowing utility), and
2. add it behind the same measurement guards, with explicit tests that scroll-anchoring and
   focus restoration do not violate SC-002 / SC-003.

**Rationale**: Adds a dependency and real complexity (scroll anchoring, focus in/out of
windowed range, `<details>` inside windows, AT tree completeness). The spec's ceiling is
2,000 tokens; isolated renders of ~2,000 mounted-but-not-re-rendering rows is well within
budget for modern browsers. Keep the option costed (Complexity Tracking in `plan.md`) but
unspent.

**Alternatives considered**: CSS `content-visibility: auto` on rows — *low-risk partial
mitigation* worth trying before a JS windowing lib if initial-mount cost (not re-render
cost) turns out to matter; noted for the tasks phase.

## 8. Constraints confirmed (no code change needed to honor)

- **Save / PATCH wire contract untouched**: `app/api/tokens/[...path]/route.ts` and the PATCH
  body shape are out of scope; `applyEditsToPlainNode` still runs once on successful save,
  now inside `store.save()`. The store takes the save call as an **injected** dependency
  (Principle VI) — same pattern as `TokenTree`'s existing injected `navigate` — so
  `useSaveTokenEdits` (or an equivalent fetcher) is passed in, not imported by the store.
- **No serialization / round-trip change** (Principle I, IX): this feature never touches
  `token-core` or `plain-node.ts` output.
- **Injected `navigate`** in `TokenTree` stays; any measurement clock used inside a
  component is injected the same way (Principle VI).
