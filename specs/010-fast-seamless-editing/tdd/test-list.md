---
feature: 010-fast-seamless-editing
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 8 # Success Criteria SC-001..SC-008 in spec.md; see "Mapping" note
planned_at: b55f969
updated_at: b55f969
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
| A1  | On the large fixture, in ≥95% of value-edit commits the updated value is visible within 100 ms of commit, and no spinner / skeleton / disabled-greyed state appears for the edit at any point | SC-001, FR-001, US1-S1, C-RI-3, C-MB-1 | example | PENDING | `apps/web-app/e2e/editing-perf.spec.ts` |
| A2  | During and after a committed edit, every observed `layout-shift` entry's `sources` lie inside the edited field and its own error slot — none attributed to another row, a group header, the Save button, or page chrome | SC-002, FR-004, FR-012, US1-S4, C-MB-3, C-KL-4 | example | PENDING | `apps/web-app/e2e/render-stability.spec.ts` |
| A3  | A full Tab then Shift+Tab pass over the large fixture (visiting one row of every editable dispatch path) lands `document.activeElement` on a real control at 100% of stops, shows a fully-visible (unclipped, unobscured) focus indicator at 100% of stops, keeps focus order matching visual order, and moves no element other than the focus indicator | SC-003, FR-002, FR-005, FR-006, FR-007, US2-S1, US2-S2, US2-S4, C-KL-2, C-KL-3, C-MB-5 | example | PENDING | `apps/web-app/e2e/keyboard-navigation.spec.ts` |
| A4  | Committing an edit in a ≥1,000-token document produces a rendered-page change confined to the edited row and the referencing tokens' resolved-value previews; all other tree rows, the group headers, and the page header are unchanged, and expanded groups stay expanded | SC-004, FR-009, FR-011, US3-S1, US3-S2, C-MB-3, C-RI-1 | example | PENDING | `apps/web-app/e2e/render-stability.spec.ts` |
| A5  | Editing a token referenced by ≥100 other in-file tokens reflects on screen within the same 100 ms budget as A1, and the tree does not visibly rebuild or reorder | SC-005, FR-001a, FR-011, US3-S3, C-RI-4, C-LR-1, C-LR-8, C-MB-1 | example | PENDING | `apps/web-app/e2e/editing-perf.spec.ts` |
| A6  | During 5 s of sustained typing at ~10 cps in a value field, zero characters are dropped and the displayed text never trails the input by more than one animation frame | SC-006, FR-013, US1-S3, C-RI-2, C-MB-2 | example | PENDING | `apps/web-app/e2e/editing-perf.spec.ts` |
| A7  | A1–A6 all hold on the 2,000-token fixture, not only at 1,000 | SC-007, FR-015 | example | PENDING | `apps/web-app/e2e/editing-perf.spec.ts` + `apps/web-app/e2e/render-stability.spec.ts` |
| A8  | `baseline.md` holds before/after numbers for every measured interaction, and `editing-perf` / `render-stability` fail if a measured value exceeds its budget **or** exceeds the recorded baseline | SC-008, FR-015, NFR-001, C-MB-6 | example | PENDING | `apps/web-app/e2e/editing-perf.spec.ts` + `apps/web-app/e2e/render-stability.spec.ts` |
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
| U18 | `getEffectiveNode` / the resolver / `#reverseDeps` never observe a row's local `draft` — only committed intent | INV-8, C-LR-9 | example | PENDING | `staged-edits-store.test.ts` |
| U19 | After `commit(P, …)` that changed `name`/`value`, `#previewCache` is invalidated for exactly `{P} ∪ reverseDeps(P)` and no other key | INV-17, C-LR-2 | example | PENDING | `staged-edits-store.test.ts` |
| U20 | `getResolvedPreview` results are cached: repeated calls with unchanged inputs return the same reference; `save()` clears the cache | INV-3 | example | PENDING | `staged-edits-store.test.ts` |
| U21 | `getServerSnapshot`-equivalent reads (base-derived, no pending) return a stable reference at first construction | INV-3 | example | DONE | covered by U2 — `apps/web-app/lib/tokens/staged-edits-store.test.ts::getFields returns a token's base fields, and the same object on repeated reads` (asserts identity at construction, before any commit) |

### `apps/web-app/lib/tokens/preview-resolver.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U22 | `resolvePreview` on a literal value returns `{ kind: "value", value, via: [] }` | data-model §6 | example | PENDING | `preview-resolver.test.ts` |
| U23 | `resolvePreview` on `C → {B}`, `B → {A}` (all in-file) returns `A`'s resolved value for both `B` and `C`, with `via` listing the chain | C-LR-3 | example | PENDING | `preview-resolver.test.ts` |
| U24 | `resolvePreview` on a reference whose in-file target does not exist returns `{ kind: "unresolved", ref }` | C-LR-5 | example | PENDING | `preview-resolver.test.ts` |
| U25 | `resolvePreview` on a hop to a key **not in the file index** returns `serverPreview.get(x)` unchanged | INV-18, C-LR-7 | example | PENDING | `preview-resolver.test.ts` |
| U26 | `resolvePreview` on a cycle (`A → {B}`, `B → {A}`) returns `{ kind: "cycle", ref }` in bounded time and never throws | INV-16, C-LR-6 | example | PENDING | `preview-resolver.test.ts` |
| U27 | `resolvePreview` when a value that was a literal becomes `{X}` (or vice-versa) returns `X`'s resolved value (or the new literal) — no stale carry-over | C-LR-4 | example | PENDING | `preview-resolver.test.ts` |
| U28 | `buildReverseDeps` maps each target key to the set of **transitive** in-file referrers (direct + through a chain), and omits cross-file referrers | data-model §6, INV-18 | example | PENDING | `preview-resolver.test.ts` |
| U29 | `buildReverseDeps` on a cyclic graph terminates and produces a finite map | INV-16 | example | PENDING | `preview-resolver.test.ts` |
| U30 | `resolvePreview` is total over arbitrary node inputs: for any effective node it returns one of the three `ResolvedValue` kinds and never throws or infinite-loops (sampled at the boundaries — no property library, per profile) | INV-16 | example | PENDING | `preview-resolver.test.ts` |

### `apps/web-app/hooks/useStagedEdits.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U31 | Mounting `TokenTree` twice (or remounting) yields a **distinct** `StagedEditsStore` instance each time; never a module-level singleton | INV-5 | example | PENDING | `useStagedEdits.test.tsx` |
| U32 | The hook wires the injected `save` (default: `useSaveTokenEdits`'s call) into the store's constructor; the store module itself imports no fetcher | INV-5, Principle VI | example | PENDING | `useStagedEdits.test.tsx` |
| U33 | The `getServerSnapshot` path renders the subtree without throwing (SSR of the `"use client"` tree, no pending edits) | research §2 | example | PENDING | `useStagedEdits.test.tsx` |

### `apps/web-app/hooks/useTokenSlice.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U34 | `useTokenSlice(key)` returns `{ fields, error, commit, discard }`; `commit`/`discard` are bound to `key` | data-model §7 | example | PENDING | `useTokenSlice.test.tsx` |
| U35 | A `commit` to an unrelated key does not change this key's `fields` / `error` reference identity and does not re-render the consumer | INV-1, C-RI-1 | example | PENDING | `useTokenSlice.test.tsx` |
| U36 | The getsnapshot closures passed to `useSyncExternalStore` are stable across renders, so the subscription never thrashes | INV-19 | example | PENDING | `useTokenSlice.test.tsx` |

### `apps/web-app/hooks/useResolvedPreview.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U37 | `useResolvedPreview(key)` returns the store's current `ResolvedValue` for `key` and updates when (only when) that key's preview snapshot changes | INV-17, C-LR-1 | example | PENDING | `useResolvedPreview.test.tsx` |
| U38 | The read is wrapped in `useDeferredValue` so a commit-then-type burst does not block the input's own paint | research §3, C-LR-8 | example | PENDING | `useResolvedPreview.test.tsx` |

### `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` (CHANGED)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U39 | Typing a character into any editable field of row A re-renders **only** row A — a per-component render spy shows zero re-renders of sibling rows, group headers, the Save button, and page chrome | C-RI-1, SC-004, US3-S1 | example | PENDING | `TreeTokenNode.test.tsx` |
| U40 | For a given keystroke-then-commit sequence, the staged payload handed to Save is byte-identical to the pre-change behaviour for the same input (explicit parity assertion over the existing characterization) | C-RI-6, INV-6 | example | PENDING | `TreeTokenNode.test.tsx` |
| U41 | A keystroke updates only local `draft` state — no `store.commit`, no `store.validate`, no `useSyncExternalStore` resubscribe | INV-9, C-RI-2 | example | PENDING | `TreeTokenNode.test.tsx` |
| U42 | Committing (blur / Enter / debounce) calls `store.commit(key, draft)` once and clears `draft` **only on success**; on failure `draft` is retained and the error surfaces via `getError` | INV-10, INV-12, C-RI-3 | example | PENDING | `TreeTokenNode.test.tsx` |
| U43 | The caret / selection offset in row A's focused field is unchanged after an unrelated row is edited and after a deferred ripple recompute completes | INV-11, C-RI-7, FR-002 | example | PENDING | `TreeTokenNode.test.tsx` |
| U44 | On commit, no spinner / skeleton / disabled-greyed state is rendered for the edit (the Save button merely enabling does not count) | C-RI-3, SC-001, FR-001 | example | PENDING | `TreeTokenNode.test.tsx` |
| U45 | The `parseReference → contract → editor-resolution` dispatch chain is memoised on `shown.value` + `effectiveType` + `inferredType`: for an unchanged key it is not recomputed, and its result is behaviourally identical to recomputing | INV-13 | example | PENDING | `TreeTokenNode.test.tsx` |
| U46 | The fallback (no-registered-editor) editor's `JSON.parse` failure calls `store.reportError(key, …)`; a valid parse does not | research §3b | example | PENDING | `TreeTokenNode.test.tsx` |
| U47 | Committing an edit to token A updates the resolved preview of A's transitive in-file dependents and of no other row; non-dependent rows do not re-render | C-RI-4, C-LR-1, C-LR-2, SC-005 | example | PENDING | `TreeTokenNode.test.tsx` |
| U48 | Renaming in-file token `a` to `a2` and committing makes `B → {a}`'s preview show `{ kind: "unresolved" }` live (before any save), not the stale value | C-LR-5 | example | PENDING | `TreeTokenNode.test.tsx` |
| U49 | Toggling colour theme / switching resolver mode while row A holds an uncommitted `draft` keeps the `draft` and keeps focus on the field (not `<body>`) | FR-014, C-KL-8, Edge "Mode / theme change mid-edit" | example | PENDING | `TreeTokenNode.test.tsx` |
| U50 | `axe` reports zero violations during and immediately after an edit interaction | C-KL-9, Principle X | example | PENDING | `TreeTokenNode.a11y.test.tsx` |

### `apps/web-app/components/TreeGroupNode/TreeGroupNode.tsx` (CHANGED)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U51 | The group-name field uses the same local-`draft` + commit-on-blur pattern: a keystroke touches only `draft`; commit calls `store.commit` | INV-9, INV-10 | example | PENDING | `TreeGroupNode.test.tsx` |
| U52 | A colliding group rename surfaces through `getError` and stages nothing; a non-colliding rename stages | C-KL-4, INV-6 | example | PENDING | `TreeGroupNode.test.tsx` |
| U53 | `axe` clean with the draft/commit name field | Principle X | example | PENDING | `TreeGroupNode.a11y.test.tsx` |

### `apps/web-app/components/TreeNode/TreeNode.tsx` (CHANGED)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U54 | `TreeNode` is `memo`'d and its props reduce to `node` + `relativePath`; given the same `node` reference it does not re-render when the store emits for an unrelated key | research §2, C-RI-1 | example | PENDING | `TreeNode.test.tsx` |
| U55 | `TreeNode` still renders the group/token structure it is handed (no behavioural regression from the prop-surface reduction) | II (no regression) | example | PENDING | `TreeNode.test.tsx` |

### `apps/web-app/components/TokenTree/TokenTree.tsx` (CHANGED)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U56 | `TokenTree` creates the store via `useStagedEdits({ initialTree, referenceView, save })` and renders `<TreeNode node={store.getTree()} …>`; it holds no `treeState` / `pendingEdits` / `fieldErrors` `useState` | plan.md, INV-5 | example | PENDING | `TokenTree.test.tsx` |
| U57 | A successful `save()` rebuilds the tree once and clears the pending/error overlay; the rendered values reflect the saved state | INV-7, C-RI-6 | example | PENDING | `TokenTree.test.tsx` |
| U58 | The unsaved-changes nav guard (`useEffect` + `Dialog`) fires off `getHasPending()` read via `useSyncExternalStore`, and the capture-phase cross-file link interception still works | FR (nav guard), INV-4 | example | PENDING | `TokenTree.test.tsx` |
| U59 | `axe` clean with the store-wired markup | Principle X | example | PENDING | `TokenTree.a11y.test.tsx` |

### `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.tsx` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U60 | The slot's outer box has the same measured height whether or not a message is present (reserved `min-height`) | INV-14, C-KL-4, FR-012, SC-002 | example | PENDING | `FieldErrorSlot.test.tsx` |
| U61 | When `errors.name` and/or `errors.value` are set, each renders as a `role="alert"` message **inside** the reserved box | INV-14, FR-012 | example | PENDING | `FieldErrorSlot.test.tsx` |
| U62 | A message longer than one line grows the box **downward only** (never shifts content above it) | INV-14 | example | PENDING | `FieldErrorSlot.test.tsx` |
| U63 | `axe` clean both with and without a message shown | Principle X, C-KL-9 | example | PENDING | `FieldErrorSlot.a11y.test.tsx` |

### `apps/web-app/components/TokenBlock/TokenBlock.tsx` (CHANGED)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U64 | `TokenBlock` always renders `FieldErrorSlot` (not the old `{errors?.name && <span role="alert">}` conditional spans) and threads `error` from `useTokenSlice` through | data-model §4, FR-012 | example | PENDING | `TokenBlock.test.tsx` |
| U65 | `TokenBlock`'s layout does not depend on whether an error message is present | SC-002, FR-012 | example | PENDING | `TokenBlock.test.tsx` |
| U66 | `axe` clean with the `FieldErrorSlot` integration | Principle X | example | PENDING | `TokenBlock.a11y.test.tsx` |

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

### `apps/web-app/e2e/support/stability.ts` (NEW)

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U70 | The `layout-shift` collector records each entry's `sources` (node + previous/current rect) and can answer "were all sources within subtree X" | C-MB-3 | example | PENDING | exercised via `render-stability.spec.ts` |
| U71 | The `commit → value visible` timing helper measures the delta with `performance.now()` around `page.evaluate` DOM reads | C-MB-1 | example | PENDING | exercised via `editing-perf.spec.ts` |

## Invariants and edge cases still to place

- **Empty / single-token document**: all stability guarantees still hold (no code
  path that only works once the tree is populated). — belongs on an `A`-level e2e
  once a tiny fixture exists; currently only implied by A2/A3 on the large fixture.
- **Rapid consecutive commits**: fast successive commits must not queue visible
  lag or compound re-renders. Partially covered by A6 (typing burst) + U38
  (deferred preview); a dedicated "commit×N in <1 s" assertion is not yet on a
  component.
- **Validation state churn** (message appears on commit, clears on next
  successful commit / keystroke) must not bounce layout — covered by U60/U65 for
  the box, A2 end to end; no separate churn-loop test yet.
- **`content-visibility: auto` trial** (research §7, task T048): only if
  initial-mount cost is shown to matter. No behavior on the list until measured.

## Out of scope

- **List virtualization / windowing**: deferred behind a post-implementation
  measurement gate (research §7, plan Complexity Tracking). If T047 shows a missed
  budget at 2,000 tokens it needs a `speckit-constitution` amendment first — not
  part of this list.
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
