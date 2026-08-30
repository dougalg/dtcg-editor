---
description: "Task list for Fast, Seamless Editing (010)"
---

# Tasks: Fast, Seamless Editing

**Input**: Design documents in `specs/010-fast-seamless-editing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED for this feature. NFR-001/NFR-002 mandate automated regression guards,
`contracts/measurement-and-baseline.md` defines them, and Constitution Principle X requires
unit + a11y coverage for every component. The React-free `StagedEditsStore` / resolver get
React-free unit tests.

**Organization**: by user story (US1 → US2 → US3 from spec.md). Setup + Foundational are
shared; every story is independently testable once Foundational lands.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: different file, no dependency on an incomplete task
- **[Story]**: `[US1]` / `[US2]` / `[US3]` — user-story phases only

## Path Conventions

Monorepo web app; all work under `apps/web-app/` — `lib/tokens/` (React-free store +
resolver), `hooks/`, `components/`, `e2e/`, `scripts/`. New design tokens (if any) in
`packages/design-system/src/design-tokens/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the large fixture + the measurement harness the perf/stability guards need.

- [ ] T001 [P] Add `apps/web-app/scripts/generate-large-fixture.ts` — deterministic seeded generator emitting ~2,000 DTCG tokens across nested groups, including ≥ 1 token referenced by ≥ 100 other in-file tokens and a few multi-hop reference chains (INV-15, C-MB-7)
- [ ] T002 Run the generator, commit `apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json`, and confirm `/tokens/large_scale.tokens.json` renders with no error banner
- [ ] T003 [P] Add `apps/web-app/e2e/support/stability.ts` — an in-page `PerformanceObserver('layout-shift')` collector that keeps each entry's `sources` (node + prev/current rect) scoped to a subtree, plus a `commit → value visible` timing helper using `performance.now()` around `page.evaluate` DOM reads (C-MB-3, pattern from `e2e/color-editor-perf.spec.ts`)
- [ ] T004 [P] Add `apps/web-app/e2e/editing-perf.spec.ts` (skeleton) — navigate the large fixture; measure commit→visible, a 5 s / ~10 cps typing burst, and a ≥ 100-referrer commit; push `testInfo.annotations` `type: "perf"`; assert `< 100 ms` / `≤ 1 frame` with a CI margin. Expected to FAIL pre-implementation (C-MB-1, C-MB-2)
- [ ] T005 [P] Add `apps/web-app/e2e/render-stability.spec.ts` (skeleton) — three interactions on the large fixture (type+commit an edit; full tab-through; commit an edit to the widely-referenced token); assert every observed `layout-shift` source is confined to the edited field + its error slot. Expected to FAIL pre-implementation (C-MB-3)
- [ ] T006 Register a Playwright project/server for `large_scale.tokens.json` in `apps/web-app/playwright.config.ts` (or confirm the `default` server serves `e2e/fixtures/tokens/`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the `StagedEditsStore`, its hooks, and the `TokenTree` shell — every story
reads through these.

**⚠️ No user-story work can begin until this phase is complete.**

- [ ] T007 Capture the baseline: check out `$(git merge-base HEAD main)`, build `apps/web-app`, run `editing-perf` + `render-stability`, and record the `perf` annotation numbers into `specs/010-fast-seamless-editing/baseline.md` as the "before" column (C-MB-6, SC-008)
- [ ] T008 [P] Add shared types to `apps/web-app/lib/tokens/staged-edits-store.ts` (or a co-located `staged-edits-types.ts`): `EditableFields`, `ResolvedValue` (`"value" | "unresolved" | "cycle"`), `PathKey` (data-model.md preamble)
- [ ] T009 Implement the `StagedEditsStore` core in `apps/web-app/lib/tokens/staged-edits-store.ts` — `#tree` / `#index` / `#pending` / `#errors` / `#fieldsCache` / `#listeners` / injected `#save`; `subscribe`, `getTree`, `getFields` (cached), `getError`, `getHasPending`, `getEdits`, `validate`, `commit` (validate → stage diff / set error), `reportError`, `discard`, `save` (`#save` → `applyEditsToPlainNode` into `#tree` → clear overlay → rebuild → emit); private `getEffectiveNode`. `getResolvedPreview` returns the static `#serverPreview` value for now — US3 makes it live (INV-1..INV-8)
- [ ] T010 [P] Add `apps/web-app/lib/tokens/staged-edits-store.test.ts` (React-free) — snapshot stability for untouched keys (INV-1, INV-3), stable method identity (INV-2), `commit` validates before staging and stages only changed fields with net result equal to today's (INV-6), `save()` is the only `#tree` mutation and calls `applyEditsToPlainNode` once (INV-7), `getHasPending` (INV-4), constructor refuses to do I/O without the injected `save` (INV-5)
- [ ] T011 [P] Implement `apps/web-app/hooks/useStagedEdits.ts` — `StagedEditsContext` + a hook that lazily instantiates ONE `StagedEditsStore` per mount and wires the injected `save` (default: the call from `useSaveTokenEdits`) (INV-5, Principle VI)
- [ ] T012 [P] Add `apps/web-app/hooks/useStagedEdits.test.tsx` — a fresh store per mount (INV-5), stable `subscribe` (INV-2), the `getServerSnapshot` path renders without throwing
- [ ] T013 [P] Implement `apps/web-app/hooks/useTokenSlice.ts` — `(key) => { fields, error, commit, discard }` via two `useSyncExternalStore` reads (`getFields`, `getError`) plus `commit`/`discard` bound to `key` (INV-19)
- [ ] T014 [P] Add `apps/web-app/hooks/useTokenSlice.test.tsx` — an unrelated `commit` leaves this key's `fields` / `error` reference identity unchanged (INV-1, C-RI-1 at unit level)
- [ ] T015 Rewire `apps/web-app/components/TokenTree/TokenTree.tsx` — `useStagedEdits({ initialTree: node, referenceView, save })`; render `<TreeNode node={store.getTree()} relativePath={…} />`; `SaveButton` → `store.save`; the unsaved-changes `useEffect` + `Dialog` read `getHasPending()` via `useSyncExternalStore`; delete the `treeState` / `pendingEdits` / `fieldErrors` `useState` and the local `applyEditsToPlainNode` call. Keep the capture-phase click listener and the injected `navigate` (INV-6, FR-018)
- [ ] T016 Update `apps/web-app/components/TokenTree/TokenTree.test.tsx` — store wiring, save-success rebuild, nav guard still fires off `hasPending`, cross-file link still intercepted
- [ ] T017 [P] Add `memo()` to `apps/web-app/components/TreeNode/TreeNode.tsx` and reduce its props to `node` + `relativePath` (drop `root` / `pendingEdits` / `fieldErrors` / `onStageEdit` / `onFieldError`); update `apps/web-app/components/TreeNode/TreeNode.test.tsx`

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

### Implementation for User Story 1

- [ ] T018 [US1] Rework `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` — `memo()`; `useTokenSlice(key)`; `const [draft, setDraft] = useState<Partial<EditableFields>>({})`; `const shown = { ...fields, ...draft }`; keystroke handlers call `setDraft` only; a single `commit()` (blur / Enter / debounce) calls `store.commit(key, draft)` and clears `draft` only on success (INV-9..INV-12); `useMemo` the `parseReference` → contract → editor-resolution dispatch keyed on `shown.value` + `effectiveType` + `inferredType` (INV-13); the fallback editor's `JSON.parse` failure calls `store.reportError(key, …)`; keep `contract.ValidationErrorHandler` / `DefaultValidationErrorHandler` rendering in this component
- [ ] T019 [P] [US1] Rework `apps/web-app/components/TreeGroupNode/TreeGroupNode.tsx` — `memo()`; the group-name field uses the same `useTokenSlice` + local `draft` + commit-on-blur pattern; rename-collision is now checked inside `store.commit` (surfaces via `getError`)
- [ ] T020 [P] [US1] Add a trailing-debounce helper (~150–250 ms) in `apps/web-app/hooks/useCommitDebounce.ts` (or inline in `TreeTokenNode`) that still flushes immediately on blur / Enter
- [ ] T021 [US1] Update `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx` — C-RI-1 (typing in row A re-renders only row A, via render-count spy on sibling rows / group headers / Save button), C-RI-3 (commit reflects, no spinner/skeleton/disabled state), C-RI-6 (staged payloads match the pre-change behaviour for the same keystroke sequence), C-RI-7 (caret offset preserved across a sibling edit)
- [ ] T022 [P] [US1] Update `apps/web-app/components/TreeGroupNode/TreeGroupNode.test.tsx` — name draft/commit; a colliding rename surfaces through `getError` and stages nothing
- [ ] T023 [P] [US1] Add / update `apps/web-app/components/TreeTokenNode/TreeTokenNode.a11y.test.tsx` — `axe` clean during and immediately after an edit
- [ ] T024 [US1] Fill in the `editing-perf.spec.ts` edit-echo + typing-burst assertions so they pass against the large fixture — commit→visible ≤ 100 ms p95, zero dropped characters, per-frame echo (C-MB-1, C-MB-2, SC-001, SC-006); keep the `perf` annotations
- [ ] T025 [US1] Add the "type + commit an edit" interaction to `render-stability.spec.ts` — zero `layout-shift` sources outside the edited field + its error slot; tree + editor scroll positions unchanged (C-MB-3, SC-002, FR-003)

**Checkpoint**: value / name / description edits are instant, isolated, and caret/scroll-safe
— MVP is shippable.

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

- [ ] T026 [P] [US2] Create `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.tsx` — always rendered; reserves a fixed `min-height`; renders `role="alert"` name/value messages inside that reserved box when present (INV-14, C-KL-4, FR-010, FR-012)
- [ ] T027 [P] [US2] Add `apps/web-app/components/FieldErrorSlot/FieldErrorSlot.test.tsx` + `FieldErrorSlot.a11y.test.tsx` — outer box size identical with and without a message; alert semantics; `axe` clean
- [ ] T028 [US2] Integrate `FieldErrorSlot` into `apps/web-app/components/TokenBlock/TokenBlock.tsx`, replacing the ad-hoc `{errors?.name && <span role="alert">}` spans; thread `error` from `useTokenSlice` through `TreeTokenNode`
- [ ] T029 [US2] `apps/web-app/components/TokenBlock/TokenBlock.module.css` — reserved-slot `min-height`, focus `outline` + `outline-offset`, all via `--dtcg-ed-*`; if a needed spacing / offset value doesn't exist, add it to `packages/design-system/src/design-tokens/*.json` and regenerate (Principle XII)
- [ ] T030 [US2] Audit `overflow` on `apps/web-app/components/TokenBlock/TokenBlock.module.css`, `apps/web-app/components/TokenTree/TokenTree.module.css`, and tree ancestors so the focus ring is never clipped or obscured; fix offending `overflow` / padding (C-KL-1, C-KL-7, SC-003, FR-007)
- [ ] T031 [P] [US2] Make focus-revealed UI use pre-reserved space — `apps/web-app/components/TypeSuggestion/TypeSuggestion.tsx` and any hint/affordance: always-mounted (visually muted) or in a reserved box, never inserted into flow on focus (C-KL-5, FR-008)
- [ ] T032 [US2] Keep `<details>` uncontrolled; add a test (`TreeGroupNode.test.tsx` or a new `e2e` case) that tabbing tree → editor → back leaves scroll position + every group's open/closed state unchanged and re-renders no rows (C-KL-6, FR-009, FR-010)
- [ ] T033 [US2] Verify `apps/web-app/hooks/useTokenArrival.ts` still moves focus to the target heading and expands `<details>` ancestors with `memo()`'d rows in place; add a regression assertion (no code change expected)
- [ ] T034 [US2] Extend `apps/web-app/e2e/keyboard-navigation.spec.ts` — a full Tab-through of `large_scale.tokens.json`: `toBeFocused` at every stop, `hasVisibleFocusIndicator`, focus order matches visual order (C-KL-2, C-KL-3, C-MB-5)
- [ ] T035 [US2] Add the "full tab-through" interaction to `apps/web-app/e2e/render-stability.spec.ts` — zero `layout-shift` sources outside the newly focused control across the whole pass (C-KL-1, SC-002, SC-003)
- [ ] T036 [P] [US2] Update `apps/web-app/components/TokenBlock/TokenBlock.test.tsx` — renders the slot, `error` wiring, no layout dependence on message presence
- [ ] T037 [US2] Decide + document (code comment + `research.md` §3b cross-ref) that inline validation surfaces on commit, not per keystroke; if any specific field needs live errors, wire `store.validate(key, draft)` in its `onChange` without staging (FR-005 flicker, research §3b)

**Checkpoint**: keyboard navigation is stable end to end; no reflow on Tab.

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

- [ ] T038 [P] [US3] Implement `apps/web-app/lib/tokens/preview-resolver.ts` — `buildReverseDeps(tree, serverPreview)` (transitive in-file referrers) and `resolvePreview(key, getEffectiveNode, serverPreview)` (chain walk over effective nodes, `visited` cycle guard, splice the server value at any hop not in the file's index; returns `ResolvedValue`) (INV-16, INV-18)
- [ ] T039 [P] [US3] Add `apps/web-app/lib/tokens/preview-resolver.test.ts` — multi-hop chain (C-LR-3), cycle → `{kind:"cycle"}` in bounded time (C-LR-6), rename that dangles `{a}` → `{kind:"unresolved"}` (C-LR-5), cross-file hop resolves from `serverPreview` (C-LR-7), value edited to become / cease being a reference (C-LR-4)
- [ ] T040 [US3] Extend `apps/web-app/lib/tokens/staged-edits-store.ts` — build `#reverseDeps` + `#serverPreview` at construction and on `save()`; `getResolvedPreview` now delegates to `resolvePreview` behind `#previewCache`; `commit` invalidates `#previewCache` for `key ∪ reverseDeps(key)` only, then emits (INV-17)
- [ ] T041 [US3] Add to `apps/web-app/lib/tokens/staged-edits-store.test.ts` — invalidation scope is exactly `key ∪ reverseDeps(key)` (INV-17, C-LR-2), untouched keys keep a stable preview snapshot, resolution never observes a row's `draft` (INV-8, C-LR-9)
- [ ] T042 [P] [US3] Implement `apps/web-app/hooks/useResolvedPreview.ts` — `(key) => ResolvedValue` via `useSyncExternalStore(store.subscribe, () => store.getResolvedPreview(key))` wrapped in `useDeferredValue`; add `apps/web-app/hooks/useResolvedPreview.test.tsx`
- [ ] T043 [US3] `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` reference path — render `TokenReferenceValue` from `useResolvedPreview(key)` instead of the static `node.references[0]`; only the reference dispatch path calls the hook
- [ ] T044 [US3] Add to `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx` — committing an edit to token A updates only A's transitive in-file dependents' previews; non-dependent rows do not re-render (C-RI-4, C-LR-1, C-LR-2); dangling-after-rename shows `unresolved` live (C-LR-5)
- [ ] T045 [US3] Fill in the `editing-perf.spec.ts` referenced-token case — a ≥ 100-referrer commit reflects on screen ≤ 100 ms and continued typing is not frame-blocked while dependents recompute (C-MB-1, C-LR-8, SC-005)
- [ ] T046 [US3] Add the "ripple" interaction to `apps/web-app/e2e/render-stability.spec.ts` — editing the widely-referenced token yields zero `layout-shift` outside the edited field + the updated previews; the tree is not rebuilt and expanded groups stay open (C-LR-1, SC-002, SC-004)

**Checkpoint**: the reference ripple is live, local, and within budget.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T047 Re-measure SC-001 / SC-006 / SC-007 on the finished branch at 2,000 tokens; if any budget is missed, open the virtualization decision per `research.md` §7 (a `speckit-constitution` amendment to Approved Dependencies) before continuing — otherwise proceed
- [ ] T048 [P] If the gap is initial-mount cost (not re-render cost), trial `content-visibility: auto` on tree rows in `apps/web-app/components/TokenBlock/TokenBlock.module.css` behind the same measurement guards (research.md §7)
- [ ] T049 Fill the "after" column of `specs/010-fast-seamless-editing/baseline.md` and make `editing-perf.spec.ts` / `render-stability.spec.ts` assert "meets budget AND not worse than baseline" on every measured interaction (C-MB-6, SC-008)
- [ ] T050 Run `pnpm lint` + `pnpm test` + `pnpm --filter @dtcg-editor/web-app run test:a11y` at the repo root; fix fallout; confirm all pre-existing e2e specs (save flow, references, theme, inferred-type) still pass — no regression
- [ ] T051 [P] Execute `specs/010-fast-seamless-editing/quickstart.md` checks 1 and 3 end to end and tick `specs/010-fast-seamless-editing/checklists/requirements.md`
- [ ] T052 [P] Confirm `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` is at/under the 300-line Principle X guideline after the rework; if not, extract a subcomponent (its own folder + tests)
- [ ] T053 [P] One-line `/speckit-clarify` touch-up to spec.md User Story 3 wording (inline-tree terms), per the `plan.md` spec-alignment note — non-blocking

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: needs Setup (T007 needs T004/T005 to exist). **Blocks all user stories.**
- **User Stories (Phase 3–5)**: each needs Foundational complete. US1 → US2 can proceed in parallel; **US3 depends on US1** (it edits `TreeTokenNode`'s reworked reference path) as well as Foundational.
- **Polish (Phase 6)**: needs US1 + US2 + US3 (T047/T049 need all measured interactions wired).

### Key task dependencies

- T009 → T008; T010/T011/T013 → T009; T015 → T011 + T013; T016 → T015.
- T018 (US1 core) → T009 + T013 + T015; T019/T020 [P] alongside T018; T021 → T018; T024 → T018 + T004.
- T028 (US2) → T026; T029 → T028; T034/T035 → the large fixture (T002) + Foundational.
- T040 (US3) → T038 + T009; T042 → T040; T043 → T042 + T018; T045/T046 → T043.
- T047/T049 → T024 + T035 + T045 + T046.

### Parallel Opportunities

- Setup: T001, T003, T004, T005 in parallel.
- Foundational: T008 then T010/T011/T013 in parallel; T012/T014/T017 in parallel.
- US1: T018 and T019 touch different files → parallel; then T021/T022/T023 in parallel.
- US2: T026/T027 (new `FieldErrorSlot`) run parallel to US1; T031/T036 parallel.
- US3: T038/T039 parallel; T042 parallel with `TreeTokenNode` edits until T043.
- Polish: T048, T051, T052, T053 in parallel.

---

## Parallel Example: Foundational

```bash
# After T009 (StagedEditsStore core) lands:
Task: "T010 React-free store unit tests in apps/web-app/lib/tokens/staged-edits-store.test.ts"
Task: "T011 useStagedEdits + context in apps/web-app/hooks/useStagedEdits.ts"
Task: "T013 useTokenSlice in apps/web-app/hooks/useTokenSlice.ts"
```

## Parallel Example: User Story 1

```bash
Task: "T018 Rework TreeTokenNode in apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx"
Task: "T019 Rework TreeGroupNode name field in apps/web-app/components/TreeGroupNode/TreeGroupNode.tsx"
# then, after T018:
Task: "T021 TreeTokenNode.test.tsx render-isolation + caret + staged-payload parity"
Task: "T023 TreeTokenNode.a11y.test.tsx axe-during-edit"
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1: Setup — fixture + measurement harness.
2. Phase 2: Foundational — store, hooks, `TokenTree` shell (**blocks everything**).
3. Phase 3: User Story 1 — draft/commit rows, memo, edit-latency guards.
4. **STOP and validate**: editing is instant and isolated; caret/scroll safe. Demo.

### Incremental Delivery

- Setup + Foundational → plumbing ready.
- + US1 → instant, non-disruptive edits (**MVP**).
- + US2 → stable keyboard navigation, no reflow on Tab.
- + US3 → live, local reference-preview ripple.
- Phase 6 → re-measure at 2,000 tokens, lock the baseline, full lint/test sweep.

### Notes

- `[P]` = different file, no incomplete dependency.
- The `StagedEditsStore` and `preview-resolver` are React-free — test them without rendering.
- Verify each new test fails before wiring the behaviour that makes it pass.
- Commit after each task or logical group.
- Do not touch the PATCH route, `token-core`, or `plain-node.ts` output (INV-7).
