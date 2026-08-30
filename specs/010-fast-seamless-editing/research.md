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
- *Global state library (Zustand/Redux/Jotai)*: rejected — new dependency (Principle VIII),
  and a local hook with `useSyncExternalStore`-style per-path selection covers it.

## 2. Render-isolation technique

**Decision**:
1. **Local input state per row.** `TreeTokenNode` keeps the in-progress name / value /
   description in its own `useState`, seeded from the staged edit or the node. Keystrokes
   update local state only. Commit to the shared store on `blur`, on `Enter`, and on a
   short trailing debounce (~150–250 ms) so previews still feel live without a store write
   per character.
2. **Stable store API.** Extract `pendingEdits` / `fieldErrors` / `treeState` and their
   mutators into `useStagedEdits`, exposing referentially stable callbacks (`useCallback`
   with empty/stable deps over a `useRef`ed map or a reducer) and **per-path selectors**
   (`getPendingEdit(path)`, `getFieldError(path)`) rather than handing the whole `Map` down.
3. **Memo boundaries.** `memo()` on `TreeGroupNode` and `TreeTokenNode` (and the `TreeNode`
   dispatch). Props reduced to: the node, stable callbacks, and this row's own
   `pendingEdit` / `fieldError` slices — so a sibling edit doesn't change this row's props.
4. **Memoize derived work.** `useMemo` the `parseReference` / contract / validation /
   editor-resolution chain keyed on `node.value` + `effectiveType`. Move the
   `applyEditsToPlainNode`-based rename-collision check off the keystroke path (compute
   sibling-name set once per render via selector, or debounce the check).

**Rationale**: This is the standard React 19 toolkit, no new dependency, and it maps cleanly
onto the existing prop shape (`TreeNodeProps`). Per-path selection is what actually breaks
the "sibling edit re-renders me" chain; `memo` alone wouldn't help while a whole `Map` is a
prop.

**Alternatives considered**:
- *`memo` with a custom `arePropsEqual`* comparing Map contents: rejected — still O(n)
  per row per keystroke and fragile.
- *Context per row*: rejected — provider re-render still fans out without selection.
- *React Compiler*: not configured in this repo (no babel plugin / `next.config` flag);
  out of scope to introduce here, though it would later subsume the manual memo.

## 3. Keeping typed text within one frame (SC-006)

**Decision**: Local input state (§2.1) makes the keystroke → DOM path synchronous and
row-local. Derived/expensive consequences of a keystroke (resolved-value previews of *other*
tokens, reference-count recalcs) are wrapped in `useDeferredValue` / `startTransition` so
they never block the input's own paint. No artificial throttling of the input itself.

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
