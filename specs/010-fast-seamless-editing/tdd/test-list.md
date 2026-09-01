---
feature: 010-fast-seamless-editing
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 8 # Success Criteria SC-001..SC-008 in spec.md; see "Mapping" note
planned_at: b55f969
updated_at: 4049050
suite_baseline: green
---

# Test List: Fast, Seamless Editing

Derived from `spec.md` (US1–US3, FR-001..FR-015, NFR-001/002, SC-001..SC-008),
`plan.md`, `data-model.md` (INV-1..INV-19), `research.md`, and
`contracts/{render-isolation,keyboard-and-layout-stability,live-reference-resolution,measurement-and-baseline}.md`
(C-RI-*, C-KL-*, C-LR-*, C-MB-*).

**Mapping note.** `spec.md`'s measurable acceptance bar is **Success Criteria
SC-001..SC-008**, and NFR-001/NFR-002 make them the automated guards — so the
outer loop is one `A` behavior per SC (`A1`..`A8`). Four more `A` behaviors
(`A9`..`A12`) cover functional requirements with a distinct end-to-end observable
result that no SC number measures: FR-002 (focus/caret), FR-003 (scroll), FR-008
(reserved helper space), FR-014 (mode/theme mid-edit). Every per-user-story
Acceptance Scenario in `spec.md` maps onto one of `A1`..`A12` or an inner `U`
behavior; the trace column records which.

**Baseline (SC-008 / C-MB-6).** `A8` cannot be fully green until
`specs/010-fast-seamless-editing/baseline.md` has both columns. The "before"
column is captured on the pre-change code (task T007, at `merge-base HEAD main`)
before any cycle touches `apps/web-app/components` or `lib/tokens`.

**Brownfield note.** Every component the feature rewrites (`TokenTree`,
`TreeNode`, `TreeGroupNode`, `TreeTokenNode`, `TokenBlock`) already has unit +
a11y tests, and the save-flow e2e specs lock the PATCH body. Those existing tests
are the characterization baseline for C-RI-6 (staged-edit / on-disk parity) —
they must keep passing unmodified except where they assert on render internals
that this feature deliberately changes. `U40` makes that parity an explicit
assertion rather than an implicit one. No component in scope is untested, so no
new `kind: characterization` task is required.

## Outer loop: acceptance behaviors

One per Success Criterion (`A1`–`A8`), plus `A9`–`A12` for the SC-less FRs. Each
stays `PENDING`/`RED` until the feature works end to end through the real entry
point — a `/tokens/<file>` page driven by Playwright against the production build
(`pnpm run start`, per `playwright.config.ts`).

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| A1  | On the large fixture, committing a value edit does not block the main thread past the 100 ms budget, and no spinner / skeleton / disabled-greyed state appears in the edited row. **Observed as** (cycle 85): with the local-draft architecture the typed value is on screen continuously, so SC-001's literal "visible within 100 ms" has no latency to time — the guarded quantity is instead a `PerformanceObserver('longtask')` count across a run of real commits, which must be 0 over budget. One un-observed warm-up commit precedes the measured run (the first commit of a session costs a one-time ~160 ms — JIT + `buildReverseDeps` / preview-cache over ~2,000 tokens — amortised, outside "≥95% of commits"). | SC-001, FR-001, US1-S1, C-RI-3, C-MB-1 | example | DONE | `apps/web-app/e2e/editing-perf.spec.ts::committing a value edit never blocks the main thread past the 100ms budget, with no spinner (A1)` (cycle 85; deliberate 150 ms `commitDraft` block → 12 long tasks → fails) |
| A2  | During and after a committed edit, every observed `layout-shift` entry's `sources` lie inside the edited field and its own error slot — none attributed to another row, a group header, the Save button, or page chrome | SC-002, FR-004, FR-012, US1-S4, C-MB-3, C-KL-4 | example | DONE | `apps/web-app/e2e/render-stability.spec.ts::a validation error message appearing does not move the rows below it (A2)` (cycle 88; direct row-height measure — layout-shift API filters commit-adjacent shifts; deliberate min-height:0 -> +21px -> fails) |
| A3  | A full Tab then Shift+Tab pass over the large fixture (visiting one row of every editable dispatch path) lands `document.activeElement` on a real control at 100% of stops, shows a fully-visible (unclipped, unobscured) focus indicator at 100% of stops, keeps focus order matching visual order, and moves no element other than the focus indicator | SC-003, FR-002, FR-005, FR-006, FR-007, US2-S1, US2-S2, US2-S4, C-KL-2, C-KL-3, C-MB-5 | example | DONE | `apps/web-app/e2e/keyboard-navigation.spec.ts::a Tab / Shift+Tab pass lands on a control with a visible indicator at every stop, in visual order (A3)` (cycle 89; 40+40 stops; deliberate outline:none -> 0/40 indicator -> fails). **Unclipped-by-overflow-ancestor split to A3a.** |
| A3a | On the large fixture, the focus ring of every tabbed-to control is **fully visible — not cropped by an `overflow: hidden/auto/scroll` ancestor** and not obscured by an overlapping element. Split from A3 (cycle 89): A3 verifies the ring is *rendered*; A3a verifies it is not *clipped*. This is what the `overflow` audit (T030) makes green. | C-KL-1, C-KL-2, C-KL-7, FR-007, SC-003 | example | DONE | `apps/web-app/e2e/keyboard-navigation.spec.ts::no tabbed-to control's focus ring is clipped by an overflow ancestor or obscured (A3a)` (cycle 90; 40 stops; deliberate overflow:hidden on .token -> 20 clipped -> fails) |
| A4  | Committing an edit in a ≥1,000-token document produces a rendered-page change confined to the edited row and the referencing tokens' resolved-value previews; all other tree rows, the group headers, and the page header are unchanged, and expanded groups stay expanded | SC-004, FR-009, FR-011, US3-S1, US3-S2, C-MB-3, C-RI-1 | example | DONE | `apps/web-app/e2e/render-stability.spec.ts::committing an edit in a ≥1,000-token doc changes only the edited row and its referrers (A4)` (cycle 91; DOM-diff of non-referrer rows / group headers / details-open / back-link — layout-shift API filters commit-adjacent shifts; deliberate TreeNode remount -> fails) |
| A5  | Editing a token referenced by ≥100 other in-file tokens: every referrer row's shown resolved value reflects the edit within 100 ms of commit (measured via `measureCommitToVisible` cross-observe mode — a deferred downstream update, not synchronous work), and the tree does not visibly rebuild or reorder. **Closed cycle 86 (T045)**: the skeleton's `getByText(/px$/)` couldn't match — a `dimension` has no `Preview`, so the referrer renders its resolved value as JSON text (`{"value":…}`); the test now targets the referrer's resolved-value link and asserts it flips to `{"value":321,…}` within budget, plus a distant row keeps its DOM node (no rebuild). Referrer updated in ~32 ms. | SC-005, FR-001a, FR-011, US3-S3, C-RI-4, C-LR-1, C-LR-8, C-MB-1 | example | DONE | `apps/web-app/e2e/editing-perf.spec.ts::editing a token referenced by >=100 others updates every referrer within budget, no tree rebuild (A5)` (cycle 86; deliberate `sameFile` inversion -> referrer never updates -> fails) |
| A6  | During 5 s of sustained typing at ~10 cps in a **value** field, zero characters are dropped and the displayed text never trails the input by more than one animation frame. **Closed cycle 87**: skeleton typed into the *name* field with a caret that never seated; rewritten to `pressSequentially` a ~56-char burst into `_showcase.exotic`'s fallback raw-text value `<textarea>` from an empty field, asserting 0 dropped chars **and** 0 `longtask` blocks > 100 ms during the burst. No app change (U43a covers the caret; the fallback editor buffers keystrokes in local state). | SC-006, FR-013, US1-S3, C-RI-2, C-MB-2 | example | DONE | `apps/web-app/e2e/editing-perf.spec.ts::sustained typing in a value field drops no characters and never lags (A6)` (cycle 87; targets the fallback value textarea; deliberate 120 ms onChange block -> 56 long tasks -> fails) |
| A7  | A1–A6 all hold on the 2,000-token fixture, not only at 1,000 | SC-007, FR-015 | example | PENDING | `apps/web-app/e2e/editing-perf.spec.ts` + `apps/web-app/e2e/render-stability.spec.ts` |
| A8  | `baseline.md` holds before/after numbers for every measured interaction, and `editing-perf` / `render-stability` fail if a measured value exceeds its budget **or** exceeds the recorded baseline. **Note (cycle 85)**: A1 no longer produces a `commit → value visible` millisecond figure — its guard is a long-task count (0 in steady state). `baseline.md`'s A1 "before ~354 ms" was captured with the protocol-laden wall-clock helper (U71, superseded) and is not comparable; T007 should re-cast the A1 row as "steady-state long tasks: before N / after 0" plus a note on the one-time ~160 ms cold start. A5's ms figure (referrer ripple) remains a real before/after once T045 lands. | SC-008, FR-015, NFR-001, C-MB-6 | example | PENDING | `apps/web-app/e2e/editing-perf.spec.ts` + `apps/web-app/e2e/render-stability.spec.ts` |
| A9  | Across a committed edit, keyboard focus stays on the same control (never `<body>`) and the text caret / selection offset within it is preserved; committing with Enter leaves focus on a visible control | FR-002, US1-S1, Edge "Focus after commit via Enter", C-RI-7, C-KL-2 | example | PENDING | `apps/web-app/e2e/keyboard-navigation.spec.ts` |
| A10 | Committing an edit changes neither the token tree's nor the window's scroll position; the same set of rows stays visible | FR-003, US1-S2, C-RI-5 | example | PENDING | `apps/web-app/e2e/render-stability.spec.ts` |
| A11 | When a control that reveals supplementary UI on focus (e.g. `TypeSuggestion`, a hint/affordance) receives focus, that UI occupies pre-reserved space and no surrounding control moves | FR-008, US2-S3, C-KL-5 | example | PENDING | `apps/web-app/e2e/render-stability.spec.ts` |
| A12 | Toggling colour theme or switching resolver mode while a field holds an uncommitted draft keeps the draft and keeps focus on that field (never `<body>`) | FR-014, Edge "Mode / theme change mid-edit", C-KL-8 | example | PENDING | `apps/web-app/e2e/keyboard-navigation.spec.ts` |

## Inner loop: unit behaviors

Grouped by the component from `plan.md` that owns them. React-free modules
(`staged-edits-store.ts`, `preview-resolver.ts`) are tested without rendering.

### `apps/web-app/lib/tokens/staged-edits-store.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U1  | `subscribe` / `getTree` / the read methods stay callable when destructured off the instance (bound fields, not prototype methods) so `useSyncExternalStore` can hold a bare reference | INV-2, INV-19 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::StagedEditsStore read methods are bound and callable when destructured off the instance` |
| U2  | `getFields(P)` returns base ⊕ pending for `P` and returns the **same object reference** on repeated calls while `P`'s inputs are unchanged | INV-3 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::getFields returns a token's base fields, and the same object on repeated reads` |
| U3  | After `commit(P, …)`, `getFields(Q)` returns the identical reference as before for an untouched `Q` (`getError`/`getResolvedPreview` identity folds in with U16 / US3) | INV-1, C-LR-2, C-RI-1 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit to one token leaves getFields identity unchanged for an untouched token` |
| U4  | After `commit(P, draft)` with a valid value, `getFields(P)` reflects the drafted value (base ⊕ pending overlay) and `commit` returns `true` | INV-6, C-RI-6 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit with a valid value overlays the drafted value on getFields` |
| U5  | `commit` on an **invalid** draft writes `#errors[key]`, leaves `#pending` untouched, emits, and returns `false` | INV-6, FR-012 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit with an invalid value is rejected: returns false, stages nothing, records an error` |
| U6  | `commit` with a draft value equal to the current effective value stages nothing and records no error (boundary: changed vs. unchanged) — also delivers U4's "stages only the changed fields" | INV-6 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit with the token's current value stages nothing` |
| U7  | Successive `commit` calls to one key accumulate into a single merged staged edit (net `#pending` matches today's `pendingEdits` for the same field values) | INV-6, C-RI-6 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::successive commits to one key accumulate into a single staged edit` |
| U8  | A `commit` renaming a token/group onto a sibling name is rejected via `#errors.name` and stages nothing (reuses `checkRenameAvailable` / `findSiblings`) | INV-6, C-KL-4, FR-012 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit renaming a token onto a sibling's name is rejected with a name error` |
| U9  | `getHasPending()` is `true` exactly when `#pending.size > 0`, across `commit` / `discard` / `save` (both sides of the boundary) | INV-4, FR (nav guard) | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::getHasPending reflects whether any edit is staged` |
| U10 | `getEdits()` returns a fresh array each call and is never handed out as a `useSyncExternalStore` snapshot | INV-3 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::getEdits returns a fresh array of the staged edits on each call` |
| U11 | `save()` resolves `#save(getEdits())`, then on success applies `applyEditsToPlainNode(#tree, edits)` **exactly once**, clears `#pending`/`#errors`, rebuilds `#index`, clears caches | INV-7, C-RI-6 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::save applies the staged edits into the base tree once, then clears the overlay` |
| U12 | `save()` is the only method that changes the reference returned by `getTree()`; `commit` never does (`discard` / `reportError` fold in with U15 / U16) | INV-7 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit leaves getTree identity unchanged; only save rebuilds the tree` |
| U13 | `save()` failure (`ok:false` `#save`) leaves `#pending`, `#errors`, and `#tree` unchanged and returns `false` | INV-7 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::a failed save leaves the overlay and tree untouched and returns false` |
| U14 | The store performs no I/O itself: `save()` calls only the injected `save` (a throwing injected save propagates — no swallow, no module-level fetcher fallback); the module imports no route/fetch helper | INV-5, Principle VI | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::save() has no I/O fallback: it propagates whatever the injected save does` |
| U15 | `discard(P)` drops only `P`'s pending + error, invalidates only `P`'s caches; other keys' snapshots keep reference identity | INV-1 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::discard drops one key's pending and error, leaving other keys untouched` |
| U16 | `reportError(P, errors)` sets `#errors[P]` without touching `#pending` (used only for the fallback editor's JSON-parse failure) | data-model §1, research §3b | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::reportError records a component-supplied error without staging anything` |
| U17 | `validate(P, draft)` returns `FieldErrors` for the candidate draft and performs no write (no `#pending`, no `#errors`, no emit) | data-model §1 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::validate reports errors for a candidate draft without writing anything` |
| U18 | `getResolvedPreview` resolves a reference over the **committed** overlay via a private `#getEffectiveNode` — a row's uncommitted `draft` is a component concern the store never receives (INV-8, C-LR-9) | INV-8, C-LR-9 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::getResolvedPreview resolves a reference over the committed overlay, not the base` |
| U19 | After `commit(P, …)`, `#previewCache` is invalidated for exactly `{P} ∪ reverseDeps(P)` and no other key | INV-17, C-LR-2 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit invalidates the preview cache for only the edited key and its dependents` |
| U20 | `getResolvedPreview` results are cached: repeated calls with unchanged inputs return the same reference; `save()` clears the whole cache | INV-3 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::getResolvedPreview is cached across reads; save clears the whole preview cache` |
| U21 | `getServerSnapshot`-equivalent reads (base-derived, no pending) return a stable reference at first construction | INV-3 | example | DONE | covered by U2 — `apps/web-app/lib/tokens/staged-edits-store.test.ts::getFields returns a token's base fields, and the same object on repeated reads` (asserts identity at construction, before any commit) |

### `apps/web-app/lib/tokens/preview-resolver.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U22 | `resolvePreview` on a literal value returns `{ kind: "value", value, via: [] }` | data-model §6 | example | DONE | `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview returns a literal value with an empty via chain` |
| U23 | `resolvePreview` on `C → {B}`, `B → {A}` (all in-file) returns `A`'s resolved value for both `B` and `C`, with `via` listing the chain | C-LR-3 | example | DONE | `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview follows a multi-hop in-file chain to the final value` |
| U24 | `resolvePreview` on a reference whose in-file target does not exist returns `{ kind: "unresolved", ref }` | C-LR-5 | example | DONE | `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview returns unresolved when a reference target is missing` |
| U25 | `resolvePreview` on a hop to a key **not in the file index** returns `serverPreview.get(x)` unchanged | INV-18, C-LR-7 | example | DONE | `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview splices in the server value for a target outside the file` |
| U26 | `resolvePreview` on a cycle (`A → {B}`, `B → {A}`) returns `{ kind: "cycle", ref }` in bounded time and never throws | INV-16, C-LR-6 | example | DONE | `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview returns a cycle marker for a reference loop, without looping` |
| U27 | `resolvePreview` when a value that was a literal becomes `{X}` (or vice-versa) returns `X`'s resolved value (or the new literal) — no stale carry-over | C-LR-4 | example | DONE | `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview reflects the current effective value each call, with no stale carry-over` |
| U28 | `buildReverseDeps` maps each target key to the set of **transitive** in-file referrers (direct + through a chain), and omits cross-file referrers | data-model §6, INV-18 | example | DONE | `apps/web-app/lib/tokens/preview-resolver.test.ts::buildReverseDeps maps each target to its transitive in-file referrers` |
| U29 | `buildReverseDeps` on a cyclic graph terminates and produces a finite map (a token in a cycle is not listed as its own referrer) | INV-16 | example | DONE | `apps/web-app/lib/tokens/preview-resolver.test.ts::buildReverseDeps terminates on a cyclic reference graph` |
| U30 | `resolvePreview` is total over arbitrary node inputs: for any effective node it returns one of the three `ResolvedValue` kinds and never throws or infinite-loops (sampled at the boundaries — no property library, per profile) | INV-16 | example | DONE | `apps/web-app/lib/tokens/preview-resolver.test.ts::resolvePreview is total: every effective-node value yields a ResolvedValue kind, never throws` |

### `apps/web-app/hooks/useStagedEdits.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U31 | Mounting `TokenTree` twice (or remounting) yields a **distinct** `StagedEditsStore` instance each time; never a module-level singleton; the instance is stable across re-renders | INV-5 | example | DONE | `apps/web-app/hooks/useStagedEdits.test.tsx::useStagedEdits makes one store per mount and keeps it across re-renders` |
| U32 | The hook threads the injected `save` into the store's constructor (Principle VI); the store module imports no fetcher (U14). `TokenTree` supplies `useSaveTokenEdits`'s call explicitly — no hidden default | INV-5, Principle VI | example | DONE | `apps/web-app/hooks/useStagedEdits.test.tsx::useStagedEdits threads the injected save through to the store` |
| U33 | A component using `useStagedEdits` + a store read renders server-side (`renderToString`) without throwing, with no pending edits (SSR smoke test — real `getServerSnapshot` coverage is in `useTokenSlice`, U36) | research §2 | example | DONE | `apps/web-app/hooks/useStagedEdits.test.tsx::useStagedEdits renders server-side (getServerSnapshot path) without throwing` |

### `apps/web-app/hooks/useTokenSlice.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U34 | `useTokenSlice(key)` returns `{ fields, error, commit, discard }`; `commit`/`discard` are bound to `key` | data-model §7 | example | DONE | `apps/web-app/hooks/useTokenSlice.test.tsx::useTokenSlice returns the token's fields and error, with commit/discard bound to the key` |
| U35 | A `commit` to an unrelated key does not change this key's `fields` / `error` reference identity and does not re-render the consumer | INV-1, C-RI-1 | example | DONE | `apps/web-app/hooks/useTokenSlice.test.tsx::a commit to an unrelated key leaves this slice's identity intact and does not re-render the consumer` |
| U36 | The getsnapshot closures passed to `useSyncExternalStore` are stable across renders, so the subscription never thrashes | INV-19 | example | DONE | `apps/web-app/hooks/useTokenSlice.test.tsx::subscribes to the store once and never re-subscribes as the consumer re-renders` |
| U36a | A `useTokenSlice` consumer renders under `renderToString` (the `getServerSnapshot` arg is exercised) without throwing, returning the base fields | research §2 | example | DONE | `apps/web-app/hooks/useTokenSlice.test.tsx::a useTokenSlice consumer renders under renderToString (getServerSnapshot path)` |

### `apps/web-app/hooks/useResolvedPreview.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U37 | `useResolvedPreview(key)` returns the store's current `ResolvedValue` for `key` and updates when (only when) that key's preview snapshot changes | INV-17, C-LR-1 | example | DONE | `apps/web-app/hooks/useResolvedPreview.test.tsx::useResolvedPreview mirrors the store's preview for the key, and follows a dependency edit` |
| U38 | The read is wrapped in `useDeferredValue` so a commit-then-type burst does not block the input's own paint | research §3, C-LR-8 | example | DONE | `apps/web-app/hooks/useResolvedPreview.test.tsx::defers the preview update: the consumer first re-renders with the stale value, then the fresh one` |

### `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` (CHANGED)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U39 | Typing a character into any editable field of row A re-renders **only** row A — a per-component render spy shows zero re-renders of sibling rows, group headers, the Save button, and page chrome | C-RI-1, SC-004, US3-S1 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.render-isolation.test.tsx::a keystroke in one row re-renders only that row — siblings do not re-render` |
| U40 | For a given keystroke-then-commit sequence, the staged payload handed to Save is byte-identical to the pre-change behaviour for the same input (explicit parity assertion over the existing characterization) | C-RI-6, INV-6 | example | DONE | `apps/web-app/components/TokenTree/TokenTree.test.tsx::the staged payload handed to Save keeps the pre-change ClientEdit shape (U40)` |
| U41 | A keystroke updates only local `draft` state — no `store.commit`, no `store.validate`, no `useSyncExternalStore` resubscribe (name field; blur commits) | INV-9, C-RI-2 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a keystroke in the name field updates only local draft — no store.commit until blur` |
| U41b | The **description** field uses the same draft/commit-on-blur pattern — a keystroke touches only `draft` — **superseded by U41e** (the description field becomes uncontrolled; U41e's cycle re-writes this test, which is why U41b stays recorded rather than deleted) | INV-9 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a keystroke in the description field updates only local draft — no store.commit until blur` |
| U41c | The fallback (no-registered-editor) editor buffers its text in `draft` and only `JSON.parse` + `commit` / `reportError` on blur | INV-9, research §3b | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a keystroke in the fallback JSON editor buffers text — no store call until blur` |
| U41d | The typed value editor's `onChange` updates only `draft`; `commit` on blur | INV-9 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a keystroke in the typed value editor updates only local draft — no store.commit until blur` |
| U41e | A keystroke in the **description** `<textarea>` causes **zero** re-renders of the row — the field is uncontrolled (`defaultValue` + a `ref`), so typing is native and the row's `useState`/`useMemo`/`useResolvedPreview` subtree is not reconciled per character (per-component render spy: 0 renders of the row on a burst of keystrokes). On blur, the field's current DOM value is read once and passed to `store.commit({ description })`; an unchanged value stages nothing (rides U6). Boundary vs. U39/U41b: U39 permits row A to re-render on a keystroke, U41e forbids it for this field. | C-RI-2, SC-006, US1-S3, INV-9 (intent — see note) | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a keystroke in the uncontrolled description textarea does no React re-render; blur commits once (U41e)` |
| U41f | After a successful `save()` — and after `discard(key)` — the description field shows the store's value (`getFields(key).description`), not the last-typed uncommitted text: the uncontrolled field is re-synced (remounted via a `key` derived from the committed/base description) when that value changes underneath it. Boundary: an in-flight uncommitted edit is preserved across an unrelated re-render (rides U49), but a `save`/`discard` that changes this field's committed value replaces it. | INV-10, INV-7, C-RI-6 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::the uncontrolled description field re-syncs when its committed value changes underneath it (U41f)` |
| U42 | Committing (blur / Enter / debounce) calls `store.commit(key, draft)` once and clears `draft` **only on success**; on failure `draft` is retained and the error surfaces via `getError` | INV-10, INV-12, C-RI-3 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a rejected commit keeps the draft on screen and surfaces the error (U42)` |
| U43 | The caret / selection offset in row A's focused field is unchanged after an unrelated row is edited and after a deferred ripple recompute completes | INV-11, C-RI-7, FR-002 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::editing another row does not move the caret in the focused field (U43)` (ripple-recompute half rides A2/A3) |
| U43a | During a burst of characters typed into one **controlled** field (the name `<input>`, or a registered editor's text/number input), the caret / selection offset stays at the typing position — each keystroke's own `setDraft` re-render preserves the selection, so the characters land in order at the caret and are not reversed / prepended (a mid-string insert lands mid-string). Boundary vs. U43: U43 is the caret under *another row's* commit; U43a is the caret under the field's *own* rapid input. | INV-11, C-RI-2, SC-006, FR-013, US1-S3 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::a burst of keystrokes in one controlled field keeps the caret at the typing position (U43a)` (pass-first-run; deliberate `key={name}` mutant verified, cycle 84) |
| U44 | On commit, no spinner / skeleton / disabled-greyed state is rendered for the edit (the Save button merely enabling does not count) | C-RI-3, SC-001, FR-001 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::committing an edit shows no spinner / skeleton / disabled state in the row (U44)` |
| U45 | The `parseReference → contract → editor-resolution` dispatch chain is memoised on `shown.value` + `effectiveType` + `inferredType`: for an unchanged key it is not recomputed, and its result is behaviourally identical to recomputing | INV-13 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.dispatch-memo.test.tsx::the editor-resolution dispatch is memoised — a name keystroke does not re-resolve it (U45)` |
| U46 | The fallback (no-registered-editor) editor's `JSON.parse` failure calls `store.reportError(key, …)`; a valid parse does not | research §3b | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::the fallback editor calls store.reportError on a parse failure, not on a valid parse (U46)` |
| U47 | Committing an edit to token A updates the resolved preview of A's transitive in-file dependents and of no other row; non-dependent rows do not re-render | C-RI-4, C-LR-1, C-LR-2, SC-005 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::committing an edit to a referenced token updates the referencing row's live preview (U47)` (no-re-render half rides U19/U37) |
| U48 | Renaming in-file token `a` to `a2` and committing makes `B → {a}`'s preview show `{ kind: "unresolved" }` live (before any save), not the stale value | C-LR-5 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::a pending rename of a referenced token makes the referrer's preview unresolved (U48)` + `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::renaming a same-file referenced token shows the referrer's preview as unresolved, not the stale value (U48)` |
| U49 | Toggling colour theme / switching resolver mode while row A holds an uncommitted `draft` keeps the `draft` and keeps focus on the field (not `<body>`) | FR-014, C-KL-8, Edge "Mode / theme change mid-edit" | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.draft.test.tsx::an external context re-render (theme / resolver mode) keeps the draft and focus (U49)` |
| U50 | `axe` reports zero violations during and immediately after an edit interaction | C-KL-9, Principle X | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.a11y.test.tsx::has no WCAG 2.2 AA violations during and after an edit that surfaces an error (U50)` |

**U41e / U41f note (added by `refresh` at `d56ce1d`).** A hands-on check found
typing in the **description** `<textarea>` visibly lags on the large fixture: it
is a controlled field, so every keystroke fires `setDraft`, which re-renders the
whole `TreeTokenNode` subtree (value editor, `ReferenceValueDisplay` /
`useResolvedPreview`, `FieldErrorSlot`) — cheap per row, but not free for a field
you type sentences into. C-RI-2 ("displayed text never trails input by more than
one animation frame", SC-006) is the criterion this misses. The fix makes just
that one field **uncontrolled** (`defaultValue` + `ref`, commit on blur), so a
keystroke does no React work at all.

`data-model.md` **INV-9** currently reads "a keystroke updates only `draft`
(`useState` …)" and **INV-11** "the focused input's `value` derives from
`shown` / `draft`". The uncontrolled description field honours INV-9's normative
content — its prohibition list (no store call, no `useSyncExternalStore`
re-subscribe, no validation, no resolution) is fully kept, and it stays inside the
already-`memo`'d component — while doing strictly less than the parenthetical
"`useState`" describes; INV-11's caret guarantee is strengthened (React never
touches the field's value). `plan.md` already sanctions "uncontrolled" as a
technique (the native `<details>` note) and "debounce" as a commit trigger. This
`refresh` records U41e/U41f against **C-RI-2 / SC-006** (a contract + a criterion,
per Hard Rule 2) and treats the INV-9/INV-11 wording as descriptive; a one-line
`data-model.md` clarification (local field state = a `useState` draft **or** an
uncontrolled free-text input's own DOM value) is recommended as a follow-up
outside this skill. Scope: description only — name / value / group-name fields
stay controlled (short inputs, no measured lag).

### `apps/web-app/components/TreeGroupNode/TreeGroupNode.tsx` (CHANGED)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U51 | The group-name field uses the same local-`draft` + commit-on-blur pattern: a keystroke touches only `draft`; commit calls `store.commit` | INV-9, INV-10 | example | DONE | `apps/web-app/components/TreeGroupNode/TreeGroupNode.draft.test.tsx::a keystroke in the group-name field updates only local draft — no store.commit until blur (U51)` |
| U52 | A colliding group rename surfaces through `getError` and stages nothing; a non-colliding rename stages | C-KL-4, INV-6 | example | DONE | `apps/web-app/components/TreeGroupNode/TreeGroupNode.draft.test.tsx::a colliding group rename surfaces via getError and stages nothing; a non-colliding one stages (U52)` |
| U53 | `axe` clean with the draft/commit name field | Principle X | example | DONE | `apps/web-app/components/TreeGroupNode/TreeGroupNode.a11y.test.tsx::has no WCAG 2.2 AA violations with the draft/commit name field, including its error (U53)` |

### `apps/web-app/components/TreeNode/TreeNode.tsx` (CHANGED)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U54 | `TreeNode` is `memo`'d and its props reduce to `node` + `relativePath`; given the same `node` reference it does not re-render when the store emits for an unrelated key | research §2, C-RI-1 | example | DONE | `apps/web-app/components/TreeNode/TreeNode.memo.test.tsx::TreeNode is memoised: a parent re-render with the same node does not re-render the row` |
| U55 | `TreeNode` still renders the group/token structure it is handed (no behavioural regression from the prop-surface reduction) | II (no regression) | example | DONE | `apps/web-app/components/TreeNode/TreeNode.test.tsx::dispatches a token node to TreeTokenNode` (+ `dispatches a group node to TreeGroupNode`, `the reference path reaches TokenReferenceValue's resolved rendering`) |

### `apps/web-app/components/TokenTree/TokenTree.tsx` (CHANGED)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U56 | `TokenTree` creates the store via `useStagedEdits({ initialTree, referenceView, save })` and renders `<TreeNode node={store.getTree()} …>`; it holds no `treeState` / `pendingEdits` / `fieldErrors` `useState` | plan.md, INV-5 | example | DONE | `apps/web-app/components/TokenTree/TokenTree.test.tsx::renders the tree structure from the store, holding no local treeState (U56)` |
| U57 | A successful `save()` rebuilds the tree once and clears the pending/error overlay; the rendered values reflect the saved state | INV-7, C-RI-6 | example | DONE | `apps/web-app/components/TokenTree/TokenTree.test.tsx::a successful save clears the pending overlay and the render reflects the saved state (U57)` |
| U58 | The unsaved-changes nav guard (`useEffect` + `Dialog`) fires off `getHasPending()` read via `useSyncExternalStore`, and the capture-phase cross-file link interception still works | FR (nav guard), INV-4 | example | DONE | `apps/web-app/components/TokenTree/TokenTree.test.tsx::a cross-file reference click with pending edits opens the unsaved-changes dialog` |
| U59 | `axe` clean with the store-wired markup | Principle X | example | DONE | `apps/web-app/components/TokenTree/TokenTree.a11y.test.tsx::has no WCAG 2.2 AA violations after an edit + save round-trip (U59)` |

### `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.tsx` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U60 | The slot's outer box has the same measured height whether or not a message is present (reserved `min-height`) | INV-14, C-KL-4, FR-012, SC-002 | example | DONE | `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.test.tsx::always renders its reserving box, whether or not a message is present (U60)` (structural; measured pixel-height equality rides A2) |
| U61 | When `errors.name` and/or `errors.value` are set, each renders as a `role="alert"` message **inside** the reserved box | INV-14, FR-012 | example | DONE | `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.test.tsx::renders each set error as a role=alert message inside the reserved box (U61)` |
| U62 | A message longer than one line grows the box **downward only** (never shifts content above it) | INV-14 | example | DONE | `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.test.tsx::a long multi-line message is added inside the box without changing the box itself (U62)` (structural; pixel no-upward-shift rides A2) |
| U63 | `axe` clean both with and without a message shown | Principle X, C-KL-9 | example | DONE | `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.a11y.test.tsx::has no WCAG 2.2 AA violations with name and value messages shown (U63)` |

### `apps/web-app/components/TokenBlock/TokenBlock.tsx` (CHANGED)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U64 | `TokenBlock` always renders `FieldErrorSlot` (not the old `{errors?.name && <span role="alert">}` conditional spans) and threads `error` from `useTokenSlice` through | data-model §4, FR-012 | example | DONE | `apps/web-app/components/TokenBlock/TokenBlock.test.tsx::always renders a FieldErrorSlot and shows the threaded error inside it (U64)` |
| U65 | `TokenBlock`'s layout does not depend on whether an error message is present | SC-002, FR-012 | example | DONE | `apps/web-app/components/TokenBlock/TokenBlock.test.tsx::layout is independent of whether an error is present (U65)` |
| U66 | `axe` clean with the `FieldErrorSlot` integration | Principle X | example | DONE | `apps/web-app/components/TokenBlock/TokenBlock.a11y.test.tsx::has no WCAG 2.2 AA violations with the FieldErrorSlot showing name + value errors (U66)` |

### `apps/web-app/scripts/generate-large-fixture.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U67 | For a fixed seed the generator emits byte-identical output on repeated runs | INV-15, C-MB-7 | example | DONE | `apps/web-app/scripts/generate-large-fixture.test.ts::generateLargeFixture emits byte-identical output for a fixed seed` |
| U68 | The output has ~2,000 tokens (within 1,900–2,200) arranged in nested groups at least 3 levels deep | C-MB-7, SC-007 | example | DONE | `apps/web-app/scripts/generate-large-fixture.test.ts::generateLargeFixture emits ~2,000 tokens nested at least 3 levels deep` |
| U69 | The emitted file parses as valid DTCG — `parseTokenFile` loads it with no error, and `buildReferenceIndex` yields ~2,000 definitions | INV-15, C-MB-7 | example | DONE | `apps/web-app/scripts/generate-large-fixture.test.ts::generateLargeFixture output loads through the token pipeline with no parse error` |
| U72 | The output contains at least one token referenced (via `{…}`) by ≥100 other in-file tokens | C-MB-7, SC-005, C-LR-8 | example | DONE | `apps/web-app/scripts/generate-large-fixture.test.ts::generateLargeFixture output has a token referenced by at least 100 other tokens` |
| U73 | Within the first 20 tokens of the file (document order) there is ≥1 token of every editable dispatch path: a valid `color`, a valid `dimension`, a `{reference}` value, a token whose `$type` has no registered editor, and a token whose value is invalid for its `$type` | C-MB-7, SC-003 | example | DONE | `apps/web-app/scripts/generate-large-fixture.test.ts::generateLargeFixture puts one token of every editable dispatch path in the first 20` |
| U74 | The generator writes the fixture to a caller-supplied path only through an injected file-writer (Principle VI); calling the pure `generateLargeFixture` performs no I/O | Principle VI, INV-15 | example | DONE | `apps/web-app/scripts/generate-large-fixture.test.ts::writeLargeFixture serializes the pure output through an injected writer` |
| U75 | Every non-showcase generated token holds a value that is valid for its declared `$type` (so the bulk fixture rows drive the real editors, not the error path) — the `_showcase` group's deliberate `exotic`/`broken` tokens are exempt | C-MB-7, SC-001, SC-003 | example | DONE | `apps/web-app/scripts/generate-large-fixture.test.ts::every non-showcase generated token holds a value valid for its declared $type` |
| U76 | The store calls every registered subscriber after a `commit` and after a successful `save()` (so `useSyncExternalStore` re-reads); `subscribe` returns a working unsubscribe | INV-2 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::the store notifies subscribers after a state-changing commit and after save` |
| U77 | `discard(P)` and `reportError(P, …)` also notify subscribers | INV-2 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::discard and reportError also notify subscribers` |
| U78 | The store converts the constructor's `TokenReferenceView` into `#serverPreview: Map<PathKey, ResolvedValue>` so a cross-file chain hop resolves to the server-computed value | INV-18, C-LR-7 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::resolves a cross-file reference hop through the server-computed preview (U78)` |

### `apps/web-app/e2e/support/stability.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U70 | The `layout-shift` collector records each entry's `sources` (node + previous/current rect) and can answer "were all sources within subtree X" | C-MB-3 | example | DONE | `apps/web-app/e2e/support/stability.ts` — exercised green via `render-stability.spec.ts` (A2/A4/A10/A11) |
| U71 | The `commit → value visible` timing helper measures the delta with `performance.now()` around `page.evaluate` DOM reads — **superseded in role by U71a** (the start/stop `performance.now()` sit in `page.evaluate` but the `fill`/`blur` and each poll read run over the Playwright↔browser protocol in between, so the returned number folds in round-trip time; kept recorded, not deleted) | C-MB-1 | example | DONE | `apps/web-app/e2e/support/stability.ts` — exercised via `editing-perf.spec.ts` (A1 returns a real measurement) |
| U71a | `measureCommitToVisible` runs its **entire** timed section — the opening `performance.now()`, the commit dispatch (a real `input` + `change`/`blur` on the target element), and the poll of the displayed value — inside **one** `page.evaluate`, so the returned delta is in-page time only and excludes Playwright↔browser protocol round-trips. Checkable on an unchanged production build: the reported delta drops from the wall-clock helper's hundreds of ms to a small in-page figure; a deliberate ≥200 ms synchronous block injected into the in-page commit path pushes the number back over the 100 ms budget (deliberate-mutant equivalent, since the profile has no vitest runner for an e2e helper). **Post-cycle-85 note**: A1 no longer uses this helper — with the draft echo, "value visible" has no latency to time (a `perf.now()` self-echo was vacuous / mutant-insensitive), so A1 switched to a `PerformanceObserver('longtask')` guard. `measureCommitToVisible` now serves **A5** (cross-observe mode: commit, then poll a *deferred* downstream referrer update). | C-MB-1, SC-001, NFR-001 | example | DONE | `apps/web-app/e2e/support/stability.ts::measureCommitToVisible` — one in-page `page.evaluate`; before/after + deliberate-mutant evidence via `editing-perf.spec.ts` (cycle 83) |

## Invariants and edge cases still to place

- **Empty / single-token document**: all stability guarantees still hold (no code
  path that only works once the tree is populated). — belongs on an `A`-level e2e
  once a tiny fixture exists; currently only implied by A2/A3 on the large fixture.
- **Rapid consecutive commits**: fast successive commits must not queue visible
  lag or compound re-renders. Partially covered by A6 (typing burst) + U38
  (deferred preview); a dedicated "commit×N in <1 s" assertion is not yet on a
  component.
- **Per-keystroke row re-render cost** (controlled `draft` fields): now pinned for
  the description field by U41e (uncontrolled → 0 renders). Name / value /
  group-name fields still re-render their row per keystroke (permitted by U39/
  C-RI-1); if a later measurement shows lag there too, the same uncontrolled
  pattern applies — not on the list until measured.
- **Same-field caret stability during a typing burst** (INV-11 / C-RI-2):
  automatic for the description field since U41e (uncontrolled); now **placed as
  U43a** for the controlled fields (name / registered-editor inputs). The A6
  acceptance skeleton still types into the *name* field and sees the caret land at
  offset 0 — correcting the A6 target to a *value* field and seating the caret is
  `/speckit-tdd-run outer`'s job when it closes A6, on top of U43a.
- **Edit-echo measurement fidelity** (C-MB-1 / SC-001): **resolved** (cycles
  83–85). U71a made the helper in-page-only; A1's old "~324–930 ms" was ~700 ms of
  Playwright protocol overhead. Honest measurement shows steady-state commit cost
  on 2,000 tokens is **0 long tasks** (< 50 ms). **Virtualization (T047 / research
  §7) is not needed** — the missed-budget premise never materialised. T047 remains
  only as a re-check point if A7 (2,000-token) or a future fixture shows regression.
- **First-commit cold start** (~160 ms, one-time per session): JIT + `buildReverseDeps`
  / preview-cache construction over ~2,000 tokens. A1 warms up past it before
  measuring. Amortised, outside SC-001's "≥95% of commits"; no dedicated behavior.
  If a future spec wants to guard it (e.g. keep it under ~300 ms), it belongs on
  A7's series as a 2,000-token cold-start check.
- **Validation state churn** (message appears on commit, clears on next
  successful commit / keystroke) must not bounce layout — covered by U60/U65 for
  the box, A2 end to end; no separate churn-loop test yet.
- **`content-visibility: auto` trial** (research §7, task T048): only if
  initial-mount cost is shown to matter. No behavior on the list until measured.

## Out of scope

- **List virtualization / windowing**: was deferred behind a post-implementation
  measurement gate (research §7, plan Complexity Tracking). Cycle 85's honest A1
  measurement shows steady-state commit cost at 2,000 tokens is 0 long tasks, so
  the gate's "missed budget" premise did not materialise — virtualization stays
  out of scope, no `speckit-constitution` amendment needed. T047 survives only as
  a re-check if A7 finds a 2,000-token regression.
- **Documents larger than 2,000 tokens**: SC-007 ceiling; behavior explicitly
  undefined beyond it.
- **Page-level Cumulative Layout Shift as a single number**: the per-region
  `sources` assertion (A2/A4) is stricter and is what the spec requires.
- **Cross-file navigation chrome stability** (former FR-016): navigation between
  `/` and a token page is a full browser load; removed from the spec in the
  `/speckit-analyze` pass.
- **Absolute frame-rate / jank profiling** beyond the per-interaction budgets.
- **Any change to `token-core`, `plain-node.ts` output, or the PATCH route /
  wire contract** (INV-7; Principles I, IX): the feature must not touch them, and
  their existing tests continuing to pass is the guard.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` (stack `web-app`) at
planning time:

- Single test (unit): `pnpm exec vitest run {file} -t "{name}"`
  — ⚠ a non-matching name exits 0 with "N skipped"; in the red phase confirm the
  intended test shows as run/failed in the output, or use the file form below.
- One file: `pnpm exec vitest run {file}`
- Inner-loop suite (vitest projects only): `pnpm exec vitest run`
  — **requires `pnpm build` to have run first** (design-system / token-core
  resolve to `dist/`); otherwise every affected file fails with a Vite
  import-resolution error, not a test failure.
- Full suite (CI gate): `pnpm test`
- Acceptance (one spec): `pnpm --filter @dtcg-editor/web-app exec playwright test {file}`
  — runs against the production build via `globalSetup`; `-g "{name}"` for one test
  (loud `No tests found` on a miss).
- Coverage: **not available** — `@vitest/coverage-v8` not installed; audit falls
  back to trace-checking this list.
- Mutation: **not available** — no StrykerJS; audit uses deliberate-mutant spot
  checks on the highest-risk changed files.
- Property-based: **not available** — no `fast-check`; invariants (U30) sampled at
  boundaries.
