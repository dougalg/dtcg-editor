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

## 2. Render-isolation technique

**Decision**: A per-mount **instance store** for the unsaved overlay, read through React's
native `useSyncExternalStore`, plus row-local draft state and `memo` boundaries.

1. **Local input state per row.** `TreeTokenNode` keeps the in-progress name / value /
   description in its own `useState`, seeded from the staged edit or the node. Keystrokes
   update local state only. Commit to the store on `blur`, on `Enter`, and on a short
   trailing debounce (~150–250 ms) so previews still feel live without a store write per
   character.
2. **Instance store, not lifted `useState`.** `useStagedEdits` creates one `StagedEditsStore`
   per `TokenTree` mount (`useRef`/lazy `useState` — never module-level, so it resets per
   file page and per test). It holds `pendingEdits` and `fieldErrors` as plain `Map`s, a
   `Set` of listeners, `subscribe`, per-path getters (`getPendingEdit(key)`,
   `getFieldError(key)`), a `getHasPending()`, and the mutators (`stageEdit`,
   `setFieldError`, `clearAll`, `commitSaved`). The store instance is passed via **context**
   — its identity never changes, so context consumers don't re-render from it; they
   re-render only through their own subscription.
3. **Leaves subscribe, don't receive props.** Each `TreeTokenNode` reads its slice with two
   `useSyncExternalStore` calls (`() => store.getPendingEdit(key)` and
   `() => store.getFieldError(key)`), plus a `getServerSnapshot` returning a stable empty
   value. This **removes the `pendingEdits` / `fieldErrors` / `onStageEdit` / `onFieldError`
   prop-drilling** through `TreeNode` → `TreeGroupNode` → `TreeTokenNode` entirely. The Save
   button and the unsaved-nav-guard `useEffect` subscribe to `getHasPending()` alone.
4. **Memo boundaries.** `memo()` on `TreeGroupNode`, `TreeTokenNode`, and the `TreeNode`
   dispatch. Their remaining props are just `node` / `root` / `relativePath` — all stable
   between keystrokes — so a sibling edit re-renders neither.
5. **Memoize derived work.** `useMemo` the `parseReference` / contract / validation /
   editor-resolution chain keyed on `node.value` + `effectiveType` (+ the row's own
   `draftValue` where the live editor needs it). Move the `applyEditsToPlainNode`-based
   rename-collision check off the keystroke path: derive the effective sibling-name set for
   the one parent group from the overlay (memoized/deferred), instead of rebuilding the
   whole tree per keystroke.

**Snapshot-stability caveats** (these are the `useSyncExternalStore` footguns):
- `getSnapshot` MUST return a **cached reference** when nothing changed, or React warns
  ("getSnapshot should be cached to avoid an infinite loop") and re-renders every time. Safe
  here because `stageEdit` replaces only the affected path's `ClientEdit` object, so
  `map.get(key)` is a stable identity between unrelated edits; `undefined` is stable by
  `Object.is`.
- Do **not** return a composite `{ pendingEdit, fieldError }` object from one snapshot — use
  two separate hook calls. This also avoids pulling in the `use-sync-external-store/with-selector`
  shim, keeping the feature dependency-free (Principle VIII).
- `getServerSnapshot` is **required** — `TokenTree` is `"use client"` but Next.js SSRs it.
  Return a module-constant empty value; there are genuinely no pending edits at first paint,
  so there is no hydration mismatch.

**Rationale**: `useSyncExternalStore` is the purpose-built primitive for "one store, many
subscribers, each re-renders only when its own slice changes" — exactly INV-1 — and it is
tearing-safe under the concurrent features §3 relies on. It is native in React 18+/19, so no
dependency. Reducing props to stable values is what lets plain `memo` do its job; per-path
subscription is what actually severs the "sibling edit re-renders me" chain.

**Alternatives considered**:
- *Lifted `useState` in `TokenTree` + per-path selector functions passed as props*: workable
  but still threads callbacks/selectors through three layers and needs careful `useCallback`
  discipline; `useSyncExternalStore` + context is less wiring and concurrent-safe.
- *`memo` with a custom `arePropsEqual`* comparing Map contents: rejected — still O(n) per
  row per keystroke and fragile.
- *Global state library (Zustand/Jotai/Redux)*: rejected — new dependency for what a ~40-line
  instance store covers.
- *React Compiler*: not configured in this repo (no babel plugin / `next.config` flag); out
  of scope here, though it would later subsume the manual `memo`/`useMemo`.

## 2a. Pending edits stay an overlay until save

**Decision**: Keep the current architecture — `pendingEdits` is a separate overlay that is
**never** applied into a merged tree while editing. `treeState` (the optimistic
post-save baseline) stays a plain `useState` in `TokenTree` and changes in exactly one
place: after a successful save (`commitSaved` → `applyEditsToPlainNode` once, then clear the
overlay). Each row derives its displayed value at render as `pending ?? draft ?? node`.

**Rationale**: An edit must stay an O(1) `Map` write, not an O(tree) `applyEditsToPlainNode`
rebuild — that rebuild-per-keystroke is one of the current costs this feature removes. The
single authoritative merge at save success is still needed so the next editing round has
correct baseline paths (descendant renames etc.), which `token-core`'s `applyTokenEdits`
mirrors server-side. `treeState` exists only because save mutates in place rather than
refetching the page; nothing else needs it to move.

**The two things that legitimately need the overlay before save** — both are *targeted
derived reads* off `node + overlay`, not a materialized tree:
- **Live resolved-value previews for referencing tokens** (FR-011 / SC-005): a small
  client resolver recomputes only the rows that reference the just-edited path, from
  `node + overlay`, behind `useDeferredValue`. Today these previews are server-computed in
  `buildReferenceView` and only refresh on save+reload, so live update is new work
  regardless — but it is scoped to affected rows, never the whole tree.
- **Rename-collision checks**: derive the effective child-name set for the affected parent
  group from the overlay entries for that parent, not a whole-tree `applyEditsToPlainNode`.

**Alternatives considered**: proactively folding edits into `treeState` on each commit
(rejected — reintroduces a tree walk on the hot path and gains nothing the per-row
`pending ?? draft ?? node` compose doesn't already give); a full client-side resolver kept
continuously in sync (rejected — more than FR-011 needs; on-demand per-affected-row is
enough).

## 3. Keeping typed text within one frame (SC-006)

**Decision**: Local input state (§2, item 1) makes the keystroke → DOM path synchronous and
row-local. Derived/expensive consequences of a keystroke (resolved-value previews of *other*
tokens computed from `node + overlay` per §2a, reference-count recalcs) are wrapped in
`useDeferredValue` / `startTransition` so they never block the input's own paint. No
artificial throttling of the input itself.

**Rationale**: Dropped characters and lag come from doing heavy synchronous work between
`keydown` and paint. Isolating the input and deferring the ripple removes that work from the
critical path without changing what the user sees for their own field.

**Alternatives considered**: `flushSync` tuning (rejected — treats the symptom);
uncontrolled inputs with `defaultValue` + refs (rejected — loses the controlled-value
validation the editors rely on, and complicates staged-edit seeding).

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

**Follow-up (non-blocking)**: a one-line `/speckit-clarify` edit to spec US3 to phrase it in
inline-tree terms. Implementation does not wait on it.

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

- **Save / PATCH path untouched**: `useSaveTokenEdits` and `app/api/tokens/[...path]/route.ts`
  are out of scope; `applyEditsToPlainNode` still runs once on successful save.
- **No serialization / round-trip change** (Principle I, IX): this feature never touches
  `token-core` or `plain-node.ts` output.
- **Injected `navigate`** in `TokenTree` stays; any measurement clock used inside a
  component is injected the same way (Principle VI).
