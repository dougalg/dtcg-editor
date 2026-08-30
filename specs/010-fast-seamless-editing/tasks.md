---
description: "Task list for Fast, Seamless Editing (010)"
---

# Tasks: Fast, Seamless Editing

**Input**: Design documents in `specs/010-fast-seamless-editing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md,
`tdd/test-list.md`, `tdd/cycle-log.md`

**Tests**: MANDATORY and test-first for this feature. NFR-001/NFR-002 mandate automated
regression guards, `contracts/measurement-and-baseline.md` defines them, Constitution
Principle X requires unit + a11y coverage for every component, and Constitution Principle
XIII (Test-Driven Development, NON-NEGOTIABLE) requires every behaviour change to be driven
by a test **observed failing first**, with the red recorded in `tdd/cycle-log.md`. The
React-free `StagedEditsStore` / resolver get React-free unit tests. The behaviour catalogue
and their ids are in `tdd/test-list.md` (`A1`..`A12` outer, `U1`..`U71` inner); this file
mirrors it and no implementation task starts before its `[U#]`/`[A#]` test is red.

**TDD ordering.** Task ids are not renumbered, so a test task can appear *before* a
lower-numbered implementation task it guards (e.g. `T021` is listed before `T018`). Within
any (test, implementation) pair for the same behaviour id, author the test and watch it fail
for the right reason before writing the code that makes it pass — `/speckit-tdd-run` drives
this loop one behaviour at a time and ticks a task only when it can read a behaviour id from
it.

**Organization**: by user story (US1 → US2 → US3 from spec.md). Setup + Foundational are
shared; every story is independently testable once Foundational lands.

## Format: `[ID] [P?] [Story?] [Behaviour ids] Description with file path`

- **[P]**: different file, no dependency on an incomplete task
- **[Story]**: `[US1]` / `[US2]` / `[US3]` — user-story phases only
- **[Behaviour ids]**: the `A#` / `U#` from `tdd/test-list.md` the task covers

## Path Conventions

Monorepo web app; all work under `apps/web-app/` — `lib/tokens/` (React-free store +
resolver), `hooks/`, `components/`, `e2e/`, `scripts/`. New design tokens (if any) in
`packages/design-system/src/design-tokens/`.

**Runner prerequisite**: run `pnpm build` once before the vitest inner loop (turbo-cached).
Without it, `apps/web-app` test files fail with Vite import-resolution errors on
`@dtcg-editor/design-system` / `token-core` — a false red. `pnpm test` handles this itself.
See `.specify/memory/tdd-profile.md`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the large fixture + the measurement harness the perf/stability guards need.

- [X] T001 [P] [U67] [U68] [U69] [U72] [U73] [U74] [U75] Add `apps/web-app/scripts/generate-large-fixture.ts` + a co-located `apps/web-app/scripts/generate-large-fixture.test.ts` (authored red first) — deterministic seeded generator emitting ~2,000 DTCG tokens across nested groups, including ≥ 1 token referenced by ≥ 100 other in-file tokens (U72), a few multi-hop reference chains, and — near the top of the file for fast Tab-reach — one token of every editable dispatch path: a valid `color`, a valid `dimension`, a `{reference}` value, a token with no registered editor (fallback JSON), and a token with an invalid value for its `$type` (U73); written to a caller path via an injected file-writer, the pure fn doing no I/O (U74). Tests: byte-identical output for a fixed seed (U67), ~2,000 tokens nested ≥3 deep (U68), loads through the token pipeline with no parse error (U69), ≥100-referrer token (U72), dispatch paths in the first 20 tokens (U73), injected file-writer (U74) (INV-15, C-MB-7, SC-003, Principle VI)
- [ ] T002 [U69] Run the generator, commit `apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json`, and confirm `/tokens/large_scale.tokens.json` renders with no error banner
- [ ] T003 [P] [U70] [U71] Add `apps/web-app/e2e/support/stability.ts` — an in-page `PerformanceObserver('layout-shift')` collector that keeps each entry's `sources` (node + prev/current rect) scoped to a subtree (U70), plus a `commit → value visible` timing helper using `performance.now()` around `page.evaluate` DOM reads (U71) (C-MB-3, pattern from `e2e/color-editor-perf.spec.ts`)
- [ ] T004 [P] [A1] [A5] [A6] [A8] Add `apps/web-app/e2e/editing-perf.spec.ts` (skeleton) — navigate the large fixture; measure commit→visible, a 5 s / ~10 cps typing burst, and a ≥ 100-referrer commit; push `testInfo.annotations` `type: "perf"`; assert `< 100 ms` / `≤ 1 frame` with a CI margin. Expected to FAIL pre-implementation — this is the outer-loop red for A1/A5/A6 (C-MB-1, C-MB-2)
- [ ] T005 [P] [A2] [A4] [A7] [A8] [A10] [A11] Add `apps/web-app/e2e/render-stability.spec.ts` (skeleton) — three interactions on the large fixture (type+commit an edit; full tab-through; commit an edit to the widely-referenced token); assert every observed `layout-shift` source is confined to the edited field + its error slot. Expected to FAIL pre-implementation — outer-loop red for A2/A4/A10/A11 (C-MB-3)
- [ ] T006 Register a Playwright project/server for `large_scale.tokens.json` in `apps/web-app/playwright.config.ts` (or confirm the `default` server serves `e2e/fixtures/tokens/`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the `StagedEditsStore`, its hooks, and the `TokenTree` shell — every story
reads through these.

**⚠️ No user-story work can begin until this phase is complete.**

- [ ] T007 [A8] Capture the baseline: check out `$(git merge-base HEAD main)`, build `apps/web-app`, run `editing-perf` + `render-stability`, and record the `perf` annotation numbers into `specs/010-fast-seamless-editing/baseline.md` as the "before" column (C-MB-6, SC-008)
- [ ] T008 [P] Add shared types to `apps/web-app/lib/tokens/staged-edits-store.ts` (or a co-located `staged-edits-types.ts`): `EditableFields`, `ResolvedValue` (`"value" | "unresolved" | "cycle"`), `PathKey` (data-model.md preamble)
- [X] T010 [P] [U1] [U2] [U3] [U4] [U5] [U6] [U7] [U8] [U9] [U10] [U12] [U13] [U14] [U15] [U16] [U17] [U21] Author `apps/web-app/lib/tokens/staged-edits-store.test.ts` (React-free), **red first** — method-identity stability (U1), `getFields` cached + base⊕pending (U2), untouched-key snapshot identity across `commit` (U3), `commit` validates-before-stages / stages only changed fields (U4), invalid draft sets `#errors` and stages nothing (U5), unchanged-value boundary (U6), net `#pending` parity with today (U7), colliding group rename rejected (U8), `getHasPending` both sides (U9), `getEdits` fresh array (U10), `save()` is the only `getTree()` mutation (U12), save-failure leaves state intact (U13), constructor refuses I/O without injected `save` (U14), `discard` scope (U15), `reportError` (U16), `validate` is pure (U17), base-derived reads stable at construction (U21)
- [X] T009 [U1] [U2] [U3] [U4] [U5] [U6] [U7] [U9] [U10] [U11] [U12] [U13] [U14] [U15] [U16] [U17] [U21] Implement the `StagedEditsStore` core in `apps/web-app/lib/tokens/staged-edits-store.ts` — `#tree` / `#index` / `#pending` / `#errors` / `#fieldsCache` / `#listeners` / injected `#save`; `subscribe`, `getTree`, `getFields` (cached), `getError`, `getHasPending`, `getEdits`, `validate`, `commit` (validate → stage diff / set error), `reportError`, `discard`, `save` (`#save` → `applyEditsToPlainNode` into `#tree` → clear overlay → rebuild → emit); private `getEffectiveNode`. `getResolvedPreview` returns the static `#serverPreview` value for now — US3 makes it live (INV-1..INV-8). Makes T010 green
- [ ] T012 [P] [U31] [U32] [U33] Author `apps/web-app/hooks/useStagedEdits.test.tsx`, **red first** — a fresh store per mount (U31), the injected `save` is wired and the store imports no fetcher (U32), the `getServerSnapshot` path renders without throwing (U33)
- [ ] T011 [P] [U31] [U32] [U33] Implement `apps/web-app/hooks/useStagedEdits.ts` — `StagedEditsContext` + a hook that lazily instantiates ONE `StagedEditsStore` per mount and wires the injected `save` (default: the call from `useSaveTokenEdits`) (INV-5, Principle VI). Makes T012 green
- [ ] T014 [P] [U34] [U35] [U36] Author `apps/web-app/hooks/useTokenSlice.test.tsx`, **red first** — the returned shape + key-bound `commit`/`discard` (U34), an unrelated `commit` leaves this key's `fields` / `error` reference identity unchanged and does not re-render the consumer (U35, C-RI-1 at unit level), stable getsnapshot closures (U36)
- [ ] T013 [P] [U34] [U35] [U36] Implement `apps/web-app/hooks/useTokenSlice.ts` — `(key) => { fields, error, commit, discard }` via two `useSyncExternalStore` reads (`getFields`, `getError`) plus `commit`/`discard` bound to `key` (INV-19). Makes T014 green
- [ ] T016 [U56] [U57] [U58] [U59] Author/update `apps/web-app/components/TokenTree/TokenTree.test.tsx` + `TokenTree.a11y.test.tsx`, **red first** — store wiring and no `treeState`/`pendingEdits`/`fieldErrors` `useState` (U56), save-success rebuild + overlay clear (U57), nav guard fires off `getHasPending` and the cross-file link is still intercepted (U58), `axe` clean with the store-wired markup (U59)
- [ ] T015 [U56] [U57] [U58] Rewire `apps/web-app/components/TokenTree/TokenTree.tsx` — `useStagedEdits({ initialTree: node, referenceView, save })`; render `<TreeNode node={store.getTree()} relativePath={…} />`; `SaveButton` → `store.save`; the unsaved-changes `useEffect` + `Dialog` read `getHasPending()` via `useSyncExternalStore`; delete the `treeState` / `pendingEdits` / `fieldErrors` `useState` and the local `applyEditsToPlainNode` call. Keep the capture-phase click listener and the injected `navigate` (INV-6, FR-018). Makes T016 green
- [ ] T017 [P] [U54] [U55] Add `memo()` to `apps/web-app/components/TreeNode/TreeNode.tsx` and reduce its props to `node` + `relativePath` (drop `root` / `pendingEdits` / `fieldErrors` / `onStageEdit` / `onFieldError`); update `apps/web-app/components/TreeNode/TreeNode.test.tsx` **first** to assert it does not re-render on an unrelated store emit (U54) and still renders the structure (U55), then confirm `TreeNode.a11y.test.tsx` still passes with the reduced prop surface

**Checkpoint**: the store + context + per-key subscription plumbing exist and are tested; no
row consumes them yet.

---

## Phase 3: User Story 1 - Editing a token value feels instant and stays put (Priority: P1) 🎯 MVP

**Goal**: a value / name / description edit applies within 100 ms with no spinner, focus +
caret + scroll are preserved, and no other row or page region re-renders or shifts.

**Independent Test**: on the large fixture, type + commit an edit in one row — the value is
visible effectively instantly, the same field stays focused with the caret in place, the
tree and editor haven't scrolled, a per-row render spy shows only that row re-rendered, and
no region outside the edited field changed size/position.

**MVP scope note**: FR-001a (referencing tokens' previews echoing on commit) and the former
US1 acceptance scenario 3 are delivered in US3 (T038–T046). This story covers the edited
token's *own* echo only.

### Implementation for User Story 1

- [ ] T021 [US1] [U39] [U40] [U41] [U42] [U43] [U44] [U45] [U46] Author/update `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx`, **red first** — typing in row A re-renders only row A via a render-count spy on sibling rows / group headers / Save button (U39, C-RI-1), staged-payload parity for a keystroke sequence (U40, C-RI-6), a keystroke touches only `draft` (U41), commit calls `store.commit` once and clears `draft` only on success / retains on failure (U42), caret offset preserved across a sibling edit (U43, C-RI-7), no spinner/skeleton/disabled state on commit (U44, C-RI-3), dispatch chain memoised + pure for equal key (U45), fallback JSON-parse failure → `store.reportError` (U46)
- [ ] T018 [US1] [U39] [U40] [U41] [U42] [U43] [U44] [U45] [U46] Rework `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` — `memo()`; `useTokenSlice(key)`; `const [draft, setDraft] = useState<Partial<EditableFields>>({})`; `const shown = { ...fields, ...draft }`; keystroke handlers call `setDraft` only; a single `commit()` (blur / Enter / debounce) calls `store.commit(key, draft)` and clears `draft` only on success (INV-9..INV-12); `useMemo` the `parseReference` → contract → editor-resolution dispatch keyed on `shown.value` + `effectiveType` + `inferredType` (INV-13); the fallback editor's `JSON.parse` failure calls `store.reportError(key, …)`; keep `contract.ValidationErrorHandler` / `DefaultValidationErrorHandler` rendering in this component. Makes T021 green
- [ ] T022 [P] [US1] [U51] [U52] Author/update `apps/web-app/components/TreeGroupNode/TreeGroupNode.test.tsx`, **red first** — the group-name field is draft/commit (U51), a colliding rename surfaces through `getError` and stages nothing while a non-colliding rename stages (U52)
- [ ] T019 [P] [US1] [U51] [U52] Rework `apps/web-app/components/TreeGroupNode/TreeGroupNode.tsx` — `memo()`; the group-name field uses the same `useTokenSlice` + local `draft` + commit-on-blur pattern; rename-collision is now checked inside `store.commit` (surfaces via `getError`); update `apps/web-app/components/TreeGroupNode/TreeGroupNode.a11y.test.tsx` (U53) for the draft/commit name field. Makes T022 green
- [ ] T023 [P] [US1] [U50] [U53] Add / update `apps/web-app/components/TreeTokenNode/TreeTokenNode.a11y.test.tsx` (U50) and `apps/web-app/components/TreeGroupNode/TreeGroupNode.a11y.test.tsx` (U53) — `axe` clean during and immediately after an edit
- [ ] T020 [P] [US1] [U42] Add a trailing-debounce helper (~150–250 ms) in `apps/web-app/hooks/useCommitDebounce.ts` (or inline in `TreeTokenNode`) that still flushes immediately on blur / Enter
- [ ] T024 [US1] [A1] [A6] Fill in the `editing-perf.spec.ts` edit-echo + typing-burst assertions so they pass against the large fixture — commit→visible ≤ 100 ms p95, zero dropped characters, per-frame echo (C-MB-1, C-MB-2, SC-001, SC-006); keep the `perf` annotations
- [ ] T025 [US1] [A2] [A10] Add the "type + commit an edit" interaction to `render-stability.spec.ts` — zero `layout-shift` sources outside the edited field + its error slot; tree + editor scroll positions unchanged (C-MB-3, SC-002, FR-003)
- [ ] T025a [US1] [A9] Extend `apps/web-app/e2e/keyboard-navigation.spec.ts` with the commit focus/caret case — after a value edit committed by blur and by Enter, `document.activeElement` is still a visible control (never `<body>`) and the caret offset is preserved (FR-002, C-RI-7, Edge "Focus after commit via Enter")

**Checkpoint**: value / name / description edits are instant, isolated, and caret/scroll-safe
— MVP is shippable. Gate: **A1, A2, A6, A9, A10 green** (T024/T025/T025a).

---

## Phase 4: User Story 2 - Tabbing and keyboard movement never disturb the page (Priority: P2)

**Goal**: Tab / Shift+Tab moves only the focus indicator — no control resize, no reflow, no
panel remount; validation messages and focus-revealed helper UI occupy reserved space; the
focus ring is always fully visible.

**Independent Test**: starting from the first control, Tab through the entire large-fixture
tree and the Save button, then Shift+Tab back — at every stop `document.activeElement` is a
real control, the focus indicator is visible and unclipped, focus order matches visual
order, and no element other than the indicator changes position.

### Implementation for User Story 2

- [ ] T027 [P] [US2] [U60] [U61] [U62] [U63] Author `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.test.tsx` + `FieldErrorSlot.a11y.test.tsx`, **red first** — outer box height identical with and without a message (U60), each error renders `role="alert"` inside the reserved box (U61), a multi-line message grows downward only (U62), `axe` clean with and without a message (U63)
- [ ] T026 [P] [US2] [U60] [U61] [U62] Create `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.tsx` — always rendered; reserves a fixed `min-height`; renders `role="alert"` name/value messages inside that reserved box when present (INV-14, C-KL-4, FR-010, FR-012). Makes T027 green
- [ ] T036 [P] [US2] [U64] [U65] Author/update `apps/web-app/components/TokenBlock/TokenBlock.test.tsx` + `TokenBlock.a11y.test.tsx` (U66), **red first** — always renders the slot and threads `error` from `useTokenSlice` (U64), layout does not depend on message presence (U65), `axe` clean with the `FieldErrorSlot` integration (U66)
- [ ] T028 [US2] [U64] [U65] [U66] Integrate `FieldErrorSlot` into `apps/web-app/components/TokenBlock/TokenBlock.tsx`, replacing the ad-hoc `{errors?.name && <span role="alert">}` spans; thread `error` from `useTokenSlice` through `TreeTokenNode`. Makes T036 green
- [ ] T029 [US2] [A2] [A3] `apps/web-app/components/TokenBlock/TokenBlock.module.css` — reserved-slot `min-height`, focus `outline` + `outline-offset`, all via `--dtcg-ed-*`; if a needed spacing / offset value doesn't exist, add it to `packages/design-system/src/design-tokens/*.json` and regenerate (Principle XII)
- [ ] T030 [US2] [A3] Audit `overflow` on `apps/web-app/components/TokenBlock/TokenBlock.module.css`, `apps/web-app/components/TokenTree/TokenTree.module.css`, and tree ancestors so the focus ring is never clipped or obscured; fix offending `overflow` / padding (C-KL-1, C-KL-7, SC-003, FR-007)
- [ ] T031 [P] [US2] [A11] Make focus-revealed UI use pre-reserved space — `apps/web-app/components/TypeSuggestion/TypeSuggestion.tsx` and any hint/affordance: always-mounted (visually muted) or in a reserved box, never inserted into flow on focus (C-KL-5, FR-008)
- [ ] T032 [US2] [A3] [U54] Keep `<details>` uncontrolled; add a test (`TreeGroupNode.test.tsx` or a new `e2e` case) that tabbing tree → editor → back leaves scroll position + every group's open/closed state unchanged and re-renders no rows (C-KL-6, FR-009, FR-010)
- [ ] T033 [US2] [A3] Verify `apps/web-app/hooks/useTokenArrival.ts` still moves focus to the target heading and expands `<details>` ancestors with `memo()`'d rows in place; add a regression assertion (no code change expected)
- [ ] T034 [US2] [A3] Extend `apps/web-app/e2e/keyboard-navigation.spec.ts` — a full Tab-through of `large_scale.tokens.json`: `toBeFocused` at every stop, `hasVisibleFocusIndicator`, focus order matches visual order, iterating the representative token of each editable dispatch path placed at the top of the fixture (C-KL-2, C-KL-3, C-MB-5, SC-003). Makes A3 green
- [ ] T035 [US2] [A2] Add the "full tab-through" interaction to `apps/web-app/e2e/render-stability.spec.ts` — zero `layout-shift` sources outside the newly focused control across the whole pass (C-KL-1, SC-002, SC-003)
- [ ] T037 [US2] Decide + document (code comment + `research.md` §3b cross-ref) that inline validation surfaces on commit, not per keystroke; if any specific field needs live errors, wire `store.validate(key, draft)` in its `onChange` without staging (FR-005 flicker, research §3b)
- [ ] T037b [US2] [U49] Author/update `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx` for the mid-edit context change (U49), **red first** — toggling colour theme and switching resolver mode while a field holds an uncommitted `draft` preserves the draft and keeps focus on that field (never `document.body`)
- [ ] T037a [US2] [A12] [U49] Make the mid-edit context change non-destructive in `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` (makes T037b green) and add an `apps/web-app/e2e/keyboard-navigation.spec.ts` case driving theme + resolver-mode changes mid-draft (A12) (FR-014, Edge "Mode / theme change mid-edit", C-KL-8)

**Checkpoint**: keyboard navigation is stable end to end; no reflow on Tab. Gate: **A3, A11,
A12 green**, and **A2 covers the tab-through** (T034/T035/T037a).

---

## Phase 5: User Story 3 - Changes and selections stay local (Priority: P3)

**Goal**: editing a token that other in-file tokens reference updates only those dependents'
resolved previews, in place — no tree rebuild, no group collapse, non-dependent rows don't
re-render — and it stays within the 100 ms budget even at ≥ 100 referrers.

**Independent Test**: on the large fixture, commit an edit to the ≥ 100-referrer token — the
referencing rows' previews update within 100 ms, the tree doesn't visibly rebuild, expanded
groups stay expanded, a render spy shows non-referencing rows didn't re-render, and the
visual diff is confined to the previews (plus the edited field).

### Implementation for User Story 3

- [X] T039 [P] [US3] [U22] [U23] [U24] [U25] [U26] [U27] [U28] [U29] [U30] Author `apps/web-app/lib/tokens/preview-resolver.test.ts`, **red first** — literal (U22), multi-hop chain (U23, C-LR-3), missing in-file target → `unresolved` (U24, C-LR-5), cross-file hop resolves from `serverPreview` (U25, C-LR-7), cycle → `{kind:"cycle"}` in bounded time (U26, C-LR-6), value becomes / ceases being a reference (U27, C-LR-4), `buildReverseDeps` transitive + cross-file-omitting (U28), `buildReverseDeps` terminates on a cyclic graph (U29), `resolvePreview` total / never throws — sampled at boundaries (U30)
- [X] T038 [P] [US3] [U22] [U23] [U24] [U25] [U26] [U27] [U28] [U29] [U30] Implement `apps/web-app/lib/tokens/preview-resolver.ts` — `buildReverseDeps(tree, serverPreview)` (transitive in-file referrers) and `resolvePreview(key, getEffectiveNode, serverPreview)` (chain walk over effective nodes, `visited` cycle guard, splice the server value at any hop not in the file's index; returns `ResolvedValue`) (INV-16, INV-18). Makes T039 green
- [X] T041 [US3] [U18] [U19] [U20] Add to `apps/web-app/lib/tokens/staged-edits-store.test.ts`, **red first** — resolution never observes a row's `draft` (U18, INV-8, C-LR-9), `commit` invalidates `#previewCache` for exactly `key ∪ reverseDeps(key)` and nothing else (U19, INV-17, C-LR-2), `getResolvedPreview` cached + cleared on save (U20)
- [X] T040 [US3] [U18] [U19] [U20] Extend `apps/web-app/lib/tokens/staged-edits-store.ts` — build `#reverseDeps` + `#serverPreview` at construction and on `save()`; `getResolvedPreview` now delegates to `resolvePreview` behind `#previewCache`; `commit` invalidates `#previewCache` for `key ∪ reverseDeps(key)` only, then emits (INV-17). Makes T041 green
- [ ] T042 [P] [US3] [U37] [U38] Implement `apps/web-app/hooks/useResolvedPreview.ts` — `(key) => ResolvedValue` via `useSyncExternalStore(store.subscribe, () => store.getResolvedPreview(key))` wrapped in `useDeferredValue`; add `apps/web-app/hooks/useResolvedPreview.test.tsx` first (U37 returns/updates only on change; U38 deferred)
- [ ] T044 [US3] [U47] [U48] Add to `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx`, **red first** — committing an edit to token A updates only A's transitive in-file dependents' previews and non-dependent rows do not re-render (U47, C-RI-4, C-LR-1, C-LR-2); dangling-after-rename shows `unresolved` live (U48, C-LR-5)
- [ ] T043 [US3] [U47] [U48] `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` reference path — render `TokenReferenceValue` from `useResolvedPreview(key)` instead of the static `node.references[0]`; only the reference dispatch path calls the hook. Makes T044 green
- [ ] T045 [US3] [A5] [A7] Fill in the `editing-perf.spec.ts` referenced-token case — a ≥ 100-referrer commit reflects on screen ≤ 100 ms and continued typing is not frame-blocked while dependents recompute (FR-001a, C-MB-1, C-LR-8, SC-005). Makes A5 green
- [ ] T046 [US3] [A4] [A7] Add the "ripple" interaction to `apps/web-app/e2e/render-stability.spec.ts` — editing the widely-referenced token yields zero `layout-shift` outside the edited field + the updated previews; the tree is not rebuilt and expanded groups stay open (C-LR-1, SC-002, SC-004). Makes A4 green

**Checkpoint**: the reference ripple is live, local, and within budget. Gate: **A4, A5 green**.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T047 [A7] Re-measure SC-001 / SC-006 / SC-007 on the finished branch at 2,000 tokens; if any budget is missed, open the virtualization decision per `research.md` §7 (a `speckit-constitution` amendment to Approved Dependencies) before continuing — otherwise proceed
- [ ] T048 [P] [A7] If the gap is initial-mount cost (not re-render cost), trial `content-visibility: auto` on tree rows in `apps/web-app/components/TokenBlock/TokenBlock.module.css` behind the same measurement guards (research.md §7)
- [ ] T049 [A8] Fill the "after" column of `specs/010-fast-seamless-editing/baseline.md` and make `editing-perf.spec.ts` / `render-stability.spec.ts` assert "meets budget AND not worse than baseline" on every measured interaction (C-MB-6, SC-008). Makes A7, A8 green
- [ ] T050 Run `pnpm lint` + `pnpm test` + `pnpm --filter @dtcg-editor/web-app run test:a11y` at the repo root; fix fallout; confirm all pre-existing e2e specs (save flow, references, theme, inferred-type) still pass — no regression (C-RI-6)
- [ ] T051 [P] Execute `specs/010-fast-seamless-editing/quickstart.md` checks 1 and 3 end to end and tick `specs/010-fast-seamless-editing/checklists/requirements.md`
- [ ] T052 [P] Confirm `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` is at/under the 300-line Principle X guideline after the rework; if not, extract a subcomponent (its own folder + tests)
- [ ] T053 [P] Reconcile `tdd/test-list.md` state column with reality (every `A#`/`U#` `DONE`), append its cycle evidence to `tdd/cycle-log.md`, and run `/speckit-tdd-verify` before archiving
_(T053a done during the `/speckit-analyze` pass — spec.md US3 / FR-009 / FR-010 / SC-004 are
now in inline-tree terms and FR-016 was removed.)_

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: needs Setup (T007 needs T004/T005 to exist). **Blocks all user stories.**
- **User Stories (Phase 3–5)**: each needs Foundational complete. US1 → US2 can proceed in parallel; **US3 depends on US1** (it edits `TreeTokenNode`'s reworked reference path) as well as Foundational.
- **Polish (Phase 6)**: needs US1 + US2 + US3 (T047/T049 need all measured interactions wired).

### Key task dependencies (test precedes implementation for each behaviour)

- T008 → T010 (red) → T009 (green); T012 (red) → T011; T014 (red) → T013; T009 + T013 → T016 (red) → T015; T017 pairs its own test.
- T021 (red) → T018; T019/T020 [P] alongside T018 with T022 (red) → T019; T024/T025/T025a → T018 + T004/T005.
- T027 (red) → T026; T036 (red) → T028; T029 → T028; T034/T035/T037a → the large fixture (T002) + Foundational; T037b (red) → T037a.
- T039 (red) → T038; T041 (red) → T040 → T038 + T009; T042 pairs its own test; T044 (red) → T043 → T042 + T018; T045/T046 → T043.
- T047/T049 → T024 + T035 + T045 + T046.

### Parallel Opportunities

- Setup: T001, T003, T004, T005 in parallel.
- Foundational: T008 then the test/impl pairs T010→T009, T012→T011, T014→T013 in sequence but the three pairs in parallel with each other; T016→T015 and T017 after T009/T013.
- US1: the T021→T018 and T022→T019 pairs touch different files → parallel; then T023 after both.
- US2: T027→T026 (new `FieldErrorSlot`) run parallel to US1; T031 parallel.
- US3: T039→T038 parallel; T042 (+ its test) parallel with `TreeTokenNode` edits until T043.
- Polish: T048, T051, T052 in parallel.

---

## Parallel Example: Foundational

```bash
# Author the red tests first, in parallel:
Task: "T010 React-free store unit tests (red) in apps/web-app/lib/tokens/staged-edits-store.test.ts"
Task: "T012 useStagedEdits tests (red) in apps/web-app/hooks/useStagedEdits.test.tsx"
Task: "T014 useTokenSlice tests (red) in apps/web-app/hooks/useTokenSlice.test.tsx"
# then make each green:
Task: "T009 StagedEditsStore core in apps/web-app/lib/tokens/staged-edits-store.ts"
Task: "T011 useStagedEdits + context in apps/web-app/hooks/useStagedEdits.ts"
Task: "T013 useTokenSlice in apps/web-app/hooks/useTokenSlice.ts"
```

## Parallel Example: User Story 1

```bash
# red first:
Task: "T021 TreeTokenNode.test.tsx render-isolation + caret + staged-payload parity (red)"
Task: "T022 TreeGroupNode.test.tsx name draft/commit + collision (red)"
# then green:
Task: "T018 Rework TreeTokenNode in apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx"
Task: "T019 Rework TreeGroupNode name field in apps/web-app/components/TreeGroupNode/TreeGroupNode.tsx"
Task: "T023 TreeTokenNode.a11y.test.tsx / TreeGroupNode.a11y.test.tsx axe-during-edit"
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1: Setup — fixture + measurement harness.
2. Phase 2: Foundational — store, hooks, `TokenTree` shell (**blocks everything**).
3. Phase 3: User Story 1 — draft/commit rows, memo, edit-latency guards.
4. **STOP and validate**: editing is instant and isolated; caret/scroll safe; A1/A2/A6/A9/A10 green. Demo.

### Incremental Delivery

- Setup + Foundational → plumbing ready.
- + US1 → instant, non-disruptive edits (**MVP**).
- + US2 → stable keyboard navigation, no reflow on Tab.
- + US3 → live, local reference-preview ripple.
- Phase 6 → re-measure at 2,000 tokens, lock the baseline, full lint/test sweep.

### Notes

- `[P]` = different file, no incomplete dependency.
- The `StagedEditsStore` and `preview-resolver` are React-free — test them without rendering.
- **Every new test is observed failing for the right reason before the code that makes it
  pass; the red goes in `tdd/cycle-log.md`** (Constitution XIII).
- Commit after each cycle at green — the test and its implementation together, nothing else.
- Do not touch the PATCH route, `token-core`, or `plain-node.ts` output (INV-7).
