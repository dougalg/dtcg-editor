---
description: "Task list for feature 009 — Edit Token References"
---

# Tasks: Edit Token References

**Input**: Design documents from `/specs/009-edit-token-references/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, **tdd/test-list.md**

**Tests**: **Mandatory and test-first.** This repo's constitution (Principle X) requires unit + accessibility coverage for every component; every behavior on `tdd/test-list.md` gets a failing test, observed red for the right reason, before its implementation task. `[A#]` / `[U#]` markers below map each task to the behaviors it covers — `/speckit.tdd.run` drives the red-green-refactor loop from those markers and ticks each task as its behaviors go green; `/speckit.implement` only covers what is left unticked. Do not reorder a task away from its behavior marker.

## Format: `[ID] [P?] [Story] Description [behavior ids]`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (from spec.md); Setup / Foundational / Polish carry no story label
- **[A#] / [U#]**: behaviors from `tdd/test-list.md` this task covers
- Exact file paths are in each task

## Path conventions

Monorepo: `packages/design-system/src/…`, `apps/web-app/…`. `token-core` is **not** modified. Runner (from `tdd-profile.md`): `pnpm exec vitest run {file} -t "{name}"` for units, `pnpm --filter @dtcg-editor/web-app exec playwright test {file}` for acceptance. `pnpm build` before any command that includes the Playwright job.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] Confirm `cmdk` and `@radix-ui/react-popover` are already in `packages/design-system/package.json` and that no dependency is added in any package (plan.md, Principle VIII); if drift is found, note it in `plan.md` rather than adding ad hoc.
- [X] T002 [P] Extend `apps/web-app/e2e/fixtures/token-references/*.json` with the minimal tokens the test list needs and does not yet have: a multi-hop cycle-closing candidate, a self-referencing token, a path multiply-defined so it is circular under one mode only, a reference to a missing path, and a reference to a group path. Provides fixtures for A2, A12–A17 and U22–U28, U50–U55, U62.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ No user-story work starts until this phase is complete.**

### design-system: `Command` (repair)

- [X] T005 [P] Write failing unit tests `packages/design-system/src/components/Command/Command.test.tsx` — [U1] renders input + list + one item per child; [U2] shows empty-slot content when the query matches nothing. Observe red.
- [X] T006 [P] Write failing a11y test `packages/design-system/src/components/Command/Command.a11y.test.tsx` — [U3] zero axe-core violations. Observe red.
- [X] T003 [P] Repair `packages/design-system/src/components/Command/Command.tsx` — replace the non-existent `@/registry/*` imports with real relative imports (`../Dialog/Dialog.tsx`) + the `cmdk` package; keep the exact export set; no behavioural additions. [U1] [U2] [U3]
- [X] T004 [P] Audit `packages/design-system/src/components/Command/Command.css` to `--dtcg-ed-*` only (Principle XII, `DESIGN.md`). No behavior.

### design-system: `Combobox` (generic controlled)

- [X] T009 [P] Write failing unit tests `packages/design-system/src/components/Combobox/Combobox.test.tsx` — [U4] trigger click → `onOpenChange(true)`, `role="combobox"` + `aria-expanded`/`aria-controls`; [U5] typing → `onQueryChange`, field shows controlled `query`; [U6] renders exactly `items` in order, no internal filter/sort; [U7] activating an enabled item → `onSelect(item)` then `onOpenChange(false)`; [U8] Escape → `onOpenChange(false)` + focus to trigger; [U9] a disabled item is still rendered; [U10] activating a disabled item → no `onSelect`, stays open; [U11] Arrow keys skip a disabled item; [U12] `selectedKey` marks exactly that row `aria-current`; [U13] `loading` → `loadingContent` only; [U14] empty `items` not loading → `emptyContent`, nothing selectable. Observe red.
- [X] T010 [P] Write failing a11y test `packages/design-system/src/components/Combobox/Combobox.a11y.test.tsx` — [U15] zero axe-core on the open popover including one disabled row. Observe red.
- [X] T007 Replace `packages/design-system/src/components/Combobox/Combobox.tsx` with the generic controlled `Combobox<T>` per contracts/reference-picker-ui.md (Popover + Command, `shouldFilter={false}`, props `open/onOpenChange`, `query/onQueryChange`, `items`, `getKey`, `renderItem`, `isItemDisabled`, `onSelect`, `selectedKey`, labels, `emptyContent`, `loading/loadingContent`). [U4] [U5] [U6] [U7] [U8] [U9] [U10] [U11] [U12] [U13] [U14] [U15]. Depends on T003.
- [X] T008 [P] Create `packages/design-system/src/components/Combobox/Combobox.css` — `--dtcg-ed-*` only. No behavior.

### web-app: catalogue data path

- [X] T053 [P] Write failing tests `apps/web-app/lib/tokens/reference-catalogue-wire.test.ts` — [U16] a well-formed payload parses to `ReferenceCatalogue`; [U17] a preview outcome missing `steps` is rejected; [U18] an unknown `outcome.kind` is rejected by the discriminated union. Observe red.
- [X] T011 [P] Create `apps/web-app/lib/tokens/reference-catalogue-wire.ts` — Zod `ReferenceCatalogueSchema` + inferred types per contracts/candidate-catalogue-api.md (`ResolutionChainWireSchema.steps` required, non-optional). [U16] [U17] [U18]
- [X] T013 [P] Write failing tests `apps/web-app/lib/tokens/reference-catalogue.test.ts` against `e2e/fixtures/token-references` — [U19] every token path appears once; [U20] no group path; [U21] single-def path → one `definition` `mode: undefined`; [U22] multi-mode path → one candidate, one `definition` per mode; [U23] chained candidate → `preview.outcome` resolved with end value; [U24] missing → `unresolved`; [U25] group → `group-target`; [U26] in-cycle candidate → `circular`; [U27] `preview[].outcome.steps` populated for a multi-hop chain; [U28] `modes` mirrors the resolver, `[]` when none. Observe red.
- [X] T012 [P] Create `apps/web-app/lib/tokens/reference-catalogue.ts` — `buildReferenceCatalogue(index: ReferenceIndex): ReferenceCatalogue`, pure transform (reuse `reference-index.ts` `buildDefinitionsForPath` + `resolveReferenceSite` semantics; group paths excluded; per-mode `preview` with `steps` populated). [U19] [U20] [U21] [U22] [U23] [U24] [U25] [U26] [U27] [U28]. Depends on T011.
- [X] T015 [P] Write failing tests `apps/web-app/app/api/tokens/references/route.test.ts` — [U29] readable dir → `200` body validates `ReferenceCatalogueSchema`; [U30] `loadTokenDirectory` `Err` → `500` `kind: "unknown"`; [U31] invalid resolver → `200` `modes: []`; [U32] injected logger used, no console output. Observe red.
- [X] T014 Create `apps/web-app/app/api/tokens/references/route.ts` — `GET` + separated `listReferenceCatalogue(logger = consoleLogger)`; `loadTokenDirectory` → `loadResolverModes` → `buildReferenceIndex` → `buildReferenceCatalogue`; `Err` → `500` `errorResponse`; invalid resolver → `200` `modes: []`. [U29] [U30] [U31] [U32]. Depends on T012.
- [X] T017 [P] Write failing tests `apps/web-app/hooks/useReferenceCatalogue.test.ts` — [U33] `idle → loading → ready` with payload; [U34] a second consumer / re-open causes no second fetch; [U35] rejected fetch → status `"error"` + `SaveError` shape, no throw; [U36] abort before resolve does not reject, a completed response still populates the cache; [U37] `fetch` reached only via injected `fetchImpl`. Observe red.
- [X] T016 Create `apps/web-app/hooks/useReferenceCatalogue.ts` — `(fetchImpl = fetch) => { status, catalogue?, error? }`, module-scope session cache keyed by token-set identity, `AbortController` on close, never throws. [U33] [U34] [U35] [U36] [U37]. Depends on T011.

**Checkpoint**: catalogue endpoint + hook + the `Combobox`/`Command` primitive ready. [U1]–[U37] green.

---

## Phase 3: User Story 1 - Repoint a reference by searching every token (Priority: P1) 🎯 MVP

**Goal**: From the reference row, open a keyboard-operable combobox, search every token path, pick one, save — only that `$value` changes.

**Independent Test**: quickstart.md steps 1–4, 9–12. Acceptance behaviors A1–A6, A17, A20.

- [X] T030 [US1] Author the acceptance spec `apps/web-app/e2e/edit-token-references.spec.ts` as **failing** tests first (server port `3101`, fixtures `e2e/fixtures/token-references`, keyboard only) — [A1] trigger opens a popover listing candidates from every file; [A2] typing narrows to whole-path substring matches incl. a mid-path fragment; [A3] selecting stages a `{…}` alias edit and closes with focus back on the trigger; [A4] Save writes the new alias and nothing else on disk changes; [A5] discard (direct or via the unsaved-changes guard) reverts to the saved target; [A6] a no-match query shows "no tokens found", nothing selectable; [A17] every fixture token path is reachable through the search. Observe red; these pass once T018–T027 land.
- [X] T019 [P] [US1] Write failing tests `apps/web-app/lib/tokens/candidate-filter.test.ts` — [U38] non-empty query keeps only case-insensitive `displayPath` substring matches; [U39] whole-path match (`brand.blue` → `color.brand.blue`); [U40] ordered by first-match index; [U41] ties broken alphabetically; [U42] no match → `[]`; [U43] empty and whitespace-only query → full list; [U44] empty query bands: same-type → same-file → rest; [U45] undefined edited type → band 1 skipped; [U46] alphabetical within a band; [U47] the edited token's own path is present; [U48] braces / leading dot matched literally. Observe red.
- [X] T018 [P] [US1] Create `apps/web-app/lib/tokens/candidate-filter.ts` — `filterCandidates(candidates, query, edited)` per contracts/hypothetical-resolution.md. [U38] [U39] [U40] [U41] [U42] [U43] [U44] [U45] [U46] [U47] [U48]
- [X] T054 [P] [US1] Write failing tests `apps/web-app/components/TokenReferenceValue/format-literal-value.test.tsx` — [U65] returns the type's built-in `Preview` output when a contract exists; [U66] falls back to raw text when no contract / no `Preview` / `Preview` declines. Observe red.
- [X] T020 [P] [US1] Extract `formatLiteralValue` + `formatRaw` from `apps/web-app/components/TokenReferenceValue/TokenReferenceValue.tsx` into `apps/web-app/components/TokenReferenceValue/format-literal-value.tsx`; update `TokenReferenceValue.tsx` to import it. [U64] (existing `TokenReferenceValue.test.tsx` stays green — the characterization safety net) [U65] [U66]. **Before writing code, confirm `.ls-lint.yml` permits a kebab-case non-component `.tsx` under `components/**`; if not, place the helper at `apps/web-app/lib/tokens/format-literal-value.tsx` instead** (analyze M3).
- [X] T022 [P] [US1] Write failing tests `apps/web-app/components/TokenReferencePicker/TokenReferencePicker.test.tsx` — [U76] first open → catalogue fetch, loading state shown; [U77] trigger + search field named for the token being repointed; [U78] typing → `filterCandidates` → narrowed list in order; [U79] empty result → "No tokens found", nothing selectable; [U80] select → `onStageEdit(editedTokenPath, { value: "{<displayPath>}" })` + close; [U81] selecting the current/pending target stages nothing but closes; [U82] re-open marks the current/pending target selected; [U83] fetch-errored → raw-text input bound to the alias, edits stage. Observe red.
- [X] T023 [P] [US1] Write failing a11y test `apps/web-app/components/TokenReferencePicker/TokenReferencePicker.a11y.test.tsx` — [U88] zero axe-core on the open popover across loading / populated / empty states (hosts [A19] in part; the disabled-row state is added by T045). Observe red.
- [X] T021 [US1] Create `apps/web-app/components/TokenReferencePicker/TokenReferencePicker.tsx` per contracts/reference-picker-ui.md — US1 scope: trigger + `Combobox` instance, `useReferenceCatalogue` on first open, `filterCandidates` for `items`, empty state, `onSelect` stages the alias + closes, FR-019 no-op, FR-018 `selectedKey`, FR-021 raw-text fallback; rows show `displayPath` + resolved literal via `format-literal-value`; no diagnostics / disabled rows / rich preview yet. [U76] [U77] [U78] [U79] [U80] [U81] [U82] [U83] [U88]. Depends on T007, T016, T018, T020.
- [X] T025 [P] [US1] Write failing tests `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.test.tsx` — [U90] resting output matches the captured `TreeTokenNode` path-1 baseline; [U91] the reference row shows a named edit trigger; [U92] a pick calls `onStageEdit(node.path, { value })`; [U93] `resolved` undefined → raw alias string shown; [U94] the rename-collision error branch is unchanged. Observe red.
- [X] T026 [P] [US1] Write failing a11y test `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.a11y.test.tsx` — [U95] zero axe-core. Observe red.
- [X] T024 [US1] Capture the current `TreeTokenNode` path-1 render as the characterization baseline [U89], then create `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.tsx` extracting that branch (props per contracts/reference-picker-ui.md), hosting `TokenReferenceValue` (resting) + the `TokenReferencePicker` trigger. [U89] [U90] [U91] [U92] [U93] [U94] [U95]. Depends on T021.
- [ ] T027 [US1] Edit `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` — path 1 becomes `return <ReferenceEditControl … />`; move the reference-branch assertions from `TreeTokenNode.test.tsx` to `ReferenceEditControl.test.tsx`; add [U96] "delegates to `ReferenceEditControl` for a reference value" and [U97] "no reference edit trigger / picker for a literal-valued token" (FR-022, analyze M1); confirm the file is under 300 lines. [U96] [U97]. Depends on T024.
- [X] T028 [US1] Write tests `apps/web-app/components/TokenTree/TokenTree.test.tsx` — [U98] the unsaved-changes navigation guard intercepts a cross-file nav while a picker-staged reference edit is pending; [U99] "discard" restores the previously saved reference. The guard is value-agnostic and may already pass — verify each with a deliberate mutant; if already green, record as covered.
- [X] T029 [P] [US1] Write tests `apps/web-app/app/api/tokens/[...path]/route.test.ts` — [U100] (characterization) a PATCH with a reference `$value` is written through verbatim, bypassing per-type validation; [U101] repointing + saving changes exactly that one `$value`, round-trip shows no other diff (hosts [A20]). The write path exists (route.ts:207); U101 may pass immediately — verify with a mutant, then it stands as the regression guard.

**Checkpoint**: MVP. [A1]–[A6], [A17], [A20] green; [U38]–[U101] green.

---

## Phase 4: User Story 2 - See what the new reference will resolve to before committing (Priority: P2)

**Goal**: Each highlighted candidate shows its resolved value (per mode, end-of-chain) and the edited token's resulting value, before any save.

**Independent Test**: quickstart.md step 4. Acceptance behaviors A7–A11.

- [X] T038 [US2] Extend `apps/web-app/e2e/edit-token-references.spec.ts` with **failing** tests first — [A7] a literal candidate shows its concrete value in the editor's normal form (swatch); [A8] a chained candidate shows its end-of-chain value; [A9] a multiply-defined candidate shows one mode-labelled value per mode; [A10] the edited-token "would resolve to" preview updates with the highlight, before save; [A11] re-opening after an unsaved selection marks the staged target current. Observe red; pass once T031–T036 land.
- [X] T032 [P] [US2] Write failing tests `apps/web-app/lib/tokens/hypothetical-resolution.test.ts` — [U57] `isSelf` iff paths deep-equal; [U58] literal candidate → per-mode `resolved` with that value; [U59] chained candidate → end-of-chain value; [U60] cycle-closing candidate → `circular` + `cyclePath`; [U61] absent path → `unresolved`; [U62] multiply-defined → one `perMode` per mode, differing per mode; [U63] synthetic lookup picks the mode's definition else the last. Observe red.
- [X] T031 [P] [US2] Create `apps/web-app/lib/tokens/hypothetical-resolution.ts` — `resolveIfRepointed(editedTokenPath, candidatePath, catalogue)` per contract; synthetic `ReferenceLookup` per mode + `token-core` `resolveReference`. [U57] [U58] [U59] [U60] [U61] [U62] [U63]
- [X] T034 [P] [US2] Write failing tests `apps/web-app/components/CandidatePreview/CandidatePreview.test.tsx` — [U67] colour candidate → swatch, not raw text; [U68] chained candidate → end-of-chain value; [U69] multiply-defined → one mode-labelled row per mode; [U70] non-resolved outcome → `ReferenceWarning`; [U73] with `hypothetical`, the "would resolve to" block renders and names the cycle for a circular outcome; [U75] marker icons are inline SVG / design-system, no direct `lucide-react` import in `apps/web-app`. Observe red.
- [X] T035 [P] [US2] Write failing a11y test `apps/web-app/components/CandidatePreview/CandidatePreview.a11y.test.tsx` — [U74] zero axe-core for each diagnostic variant. Observe red.
- [X] T033 [US2] Create `apps/web-app/components/CandidatePreview/CandidatePreview.tsx` — compact form (mode label + resolved literal via `format-literal-value`, or `ReferenceWarning` for a non-resolved outcome) and full form (highlighted: per-mode values + "edited token would resolve to" block, cycle naming). Presentational only. [U67] [U68] [U69] [U70] [U73] [U74] [U75]. Depends on T031, T020.
- [X] T037 [P] [US2] Write failing tests updating `apps/web-app/components/TokenReferencePicker/TokenReferencePicker.test.tsx` — [U84] moving the highlight updates an `aria-live` region with the result count + highlighted resolved value + diagnostic; [U85] the highlighted row renders the full `CandidatePreview` (with `hypothetical`), other rows the compact form. Observe red.
- [X] T036 [US2] Wire `CandidatePreview` + the `aria-live` region into `apps/web-app/components/TokenReferencePicker/TokenReferencePicker.tsx`; compute `resolveIfRepointed` for the highlighted candidate only. [U84] [U85]. Depends on T033, T021.

**Checkpoint**: [A7]–[A11] green; [U57]–[U85] green.

---

## Phase 5: User Story 3 - Cannot pick a circular reference; be warned about other broken choices (Priority: P3)

**Goal**: A circular candidate (incl. the token's own path) is shown with a distinct icon + "circular-reference" label and is not selectable; missing / group targets are flagged but selectable.

**Independent Test**: quickstart.md steps 5–7. Acceptance behaviors A12–A16.

- [X] T046 [US3] Extend `apps/web-app/e2e/edit-token-references.spec.ts` with **failing** tests first — [A12] highlighting the edited token's own path shows the circular icon + "circular-reference" label, Enter/click stages nothing and the popover stays open; [A13] a cycle-closing candidate carries the same icon + label, the preview names the cycle, selecting stages nothing; [A14] when the current reference already points at a missing/group path the popover still opens on it and the page renders normally; [A15] a missing/group candidate is flagged but stays selectable and can be staged; [A16] a circular candidate is visibly distinct as unselectable next to a clean one. Observe red; pass once T039–T042 land.
- [X] T040 [P] [US3] Write failing tests `apps/web-app/lib/tokens/candidate-selectability.test.ts` — [U49] own path (self, one-hop) → true; [U50] edited path a step in a 2-hop chain → true; [U51] edited path only in a 3-hop chain → true; [U52] circular under one mode only → true; [U53] unrelated pre-existing cycle → false; [U54] missing → false; [U55] group → false; [U56] clean → false. Observe red.
- [X] T039 [P] [US3] Create `apps/web-app/lib/tokens/candidate-selectability.ts` — `isCircularIfSelected(editedTokenPath, candidate)` per contract (self OR `editedTokenPath` ∈ any `candidate.preview[i].outcome.steps[].path`; O(steps), no resolve). [U49] [U50] [U51] [U52] [U53] [U54] [U55] [U56]
- [X] T044 [P] [US3] Write failing tests updating `apps/web-app/components/CandidatePreview/CandidatePreview.test.tsx` — [U71] `diagnostic: "circular"` → circular icon + "circular-reference" label, for both own-path and multi-hop cycle; [U72] `diagnostic: "missing"` / `"group"` → their own icon + label, distinct from circular. Observe red.
- [X] T041 [US3] Add the compact diagnostic markers to `apps/web-app/components/CandidatePreview/CandidatePreview.tsx` from `rowState.diagnostic`. [U71] [U72] [U75]. Depends on T033, T039.
- [X] T043 [P] [US3] Write failing tests updating `apps/web-app/components/TokenReferencePicker/TokenReferencePicker.test.tsx` — [U86] a circular candidate row is passed to `Combobox` disabled; Enter/click stages nothing, popover stays open; [U87] a missing/group candidate row stays enabled and selecting it stages the alias. Observe red.
- [X] T045 [P] [US3] Update `apps/web-app/components/TokenReferencePicker/TokenReferencePicker.a11y.test.tsx` and `CandidatePreview.a11y.test.tsx` — [U88] a disabled circular row is announced unavailable, not omitted; still zero axe-core (completes [A19]). Observe red for the new assertion.
- [X] T042 [US3] In `apps/web-app/components/TokenReferencePicker/TokenReferencePicker.tsx` build a `CandidateRowState` per row (`circular` = `isCircularIfSelected(...)`, `selectable = !circular`, `diagnostic` = worst preview outcome) and pass `isItemDisabled` to `Combobox`. [U86] [U87]. Depends on T039, T041.

**Checkpoint**: [A12]–[A16], [A19] green; [U49]–[U88] green.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T047 [P] Micro-benchmark `apps/web-app/lib/tokens/candidate-filter.bench.ts` — `filterCandidates` + a full `isCircularIfSelected` pass over a generated 1,000-path catalogue stays under one frame; p95 keystroke→sorted-list < 50 ms. Supports [A18] / SC-004.
- [X] T048 [P] Author `apps/web-app/e2e/edit-token-references-perf.spec.ts` **failing first** — [A18] typing a burst into the open picker records no main-thread Long Task > 50 ms (`PerformanceObserver`, as in `e2e/editing-perf.spec.ts`). Observe red, then make green.
- [X] T049 [P] Add a degradation case to `apps/web-app/e2e/edit-token-references.spec.ts` — catalogue route forced to `500` → the picker shows the raw alias text in an editable input, no previews, page otherwise fine (reinforces [A14] / FR-021).
- [X] T050 Run `pnpm --filter @dtcg-editor/design-system lint`, `pnpm --filter @dtcg-editor/web-app lint`, `pnpm build`, and `pnpm exec vitest run`; fix any `@ls-lint` / Biome / `DESIGN.md` (hardcoded-value) findings in new/edited files.
- [X] T051 [P] Run `specs/009-edit-token-references/quickstart.md` end to end, including the SC-007 manual `git diff` round-trip check.
- [X] T052 [P] Re-validate `specs/009-edit-token-references/checklists/requirements.md` against the finished implementation — confirm 16/16.
- [X] T055 Full acceptance gate: `pnpm build && pnpm test` green in one run — every acceptance behavior [A1]–[A20] passing together, plus commitlint / lint. This is the "outer loop green before the feature is done" gate.

---

## Phase 7: TDD remediation

From `tdd/verification.md` (verdict `PASS_WITH_GAPS`, `verified_at: e2ec578`). The
feature ships; these tighten the safety net. `HIGH`/`MED` first.

- [X] T056 [MED, Finding 1] Pin `resolveIfRepointed`'s walk-start. Add a failing test to `apps/web-app/lib/tokens/hypothetical-resolution.test.ts` asserting `resolveIfRepointed(["hub"], ["wheel"], catalogue).perMode[0].chain.steps` begins at (or otherwise names) `editedTokenPath` — so FR-014's "name the tokens in the cycle" order (`hub → wheel → hub`, not `wheel → hub → wheel`) is guaranteed. Prove it: with the test in place, `sed -i '' 's/targetPath: editedTokenPath/targetPath: candidatePath/' apps/web-app/lib/tokens/hypothetical-resolution.ts && pnpm exec vitest run apps/web-app/lib/tokens/hypothetical-resolution.test.ts` must now fail; restore.
- [ ] T057 [MED, Finding 2] Cover SC-004's p95 keystroke→updated-list latency end to end. Either extend `apps/web-app/e2e/edit-token-references-perf.spec.ts` (A18) to `performance.now()`-time each of a burst of keystrokes from `keydown` to the option list re-rendering (p95 < 50ms over ≥20 samples, as `spec.md` SC-004 / the clarification session wording requires), or add a component-level render-timing assertion in `apps/web-app/components/TokenReferencePicker/`. Command that proves it: `pnpm --filter @dtcg-editor/web-app exec playwright test edit-token-references-perf.spec.ts` shows a p95 assertion, not only the Long-Task one.
- [X] T058 [MED, Finding 3] Strengthen A12/A13's pointer-refusal check in `apps/web-app/e2e/edit-token-references.spec.ts:388,418`. Before the `click({ force: true })`, assert the **un-forced** click is refused — `await expect(own.click({ trial: true })).rejects.toThrow()` or `await own.click({ timeout: 1000 })` expected to time out — so FR-024's "not selectable ... by pointer" is verified at the interaction level, not just the `onSelect` guard. Proves done: the two tests fail if `pointer-events`/`aria-disabled` is removed from a circular row while `onSelect` still guards.
- [ ] T059 [LOW, Findings 4–6] Rename/tighten three tests: `candidate-diagnostic.test.ts:35` name to drop the "ahead of any other outcome" precedence claim **or** add a fixture where a candidate is both circular and missing/group and assert `"circular"` wins; `Combobox.test.tsx` "listFooter renders after the item list" — either assert DOM order or rename to "…alongside…"; `edit-token-references.spec.ts:270,287` — fold the `--swatch-color` `.first()).toBeVisible()` line into a single assertion that also pins the value, so the swatch check is not vacuous on its own. Proves done: `pnpm exec vitest run apps/web-app/lib/tokens/candidate-diagnostic.test.ts packages/design-system/src/components/Combobox/Combobox.test.tsx` green with the revised names/assertions.
- [ ] T060 [housekeeping] Once T055 passes on an unloaded machine / CI, run a systematic e2e-tier deliberate-mutant pass over A1–A18 (three were done ad hoc this session; the rest were not) and record it in `tdd/cycle-log.md`, then re-run `/speckit-tdd-verify` to lift the "e2e mutation not performed" gap.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)** → **Foundational (2)** blocks all stories → **US1 (3)** → **US2 (4)** → **US3 (5)** → **Polish (6)**.
- Within Foundational: `Command` tests (T005/T006) → `Command` repair (T003) → `Combobox` (T007–T010). Wire test/impl (T053/T011) → catalogue test/impl (T013/T012) → route (T015/T014) and hook (T017/T016).
- US2 builds on the US1 picker (T036 ← T021); US3 builds on US2's `CandidatePreview` (T041 ← T033). The three stories are increments, not parallel tracks.

### TDD ordering (within every phase)

- The phase's acceptance task (T030 / T038 / T046 / T048) is authored **first**, observed red, and must be green at the checkpoint.
- Each `U#` test task is written and observed failing **before** the implementation task that shares its `[U#]` marker. In this file the test task is listed immediately above its implementation task.
- Characterization first: T024 captures the `TreeTokenNode` path-1 baseline ([U89]) before T027 changes that code; T029's [U100] characterizes the current PATCH write-through before [U101] guards it.

### Parallel opportunities

- Setup: T001, T002.
- Foundational: the `Command` group (T005/T006/T003/T004) ∥ the wire+catalogue group (T053/T011/T013/T012); `Combobox` (T009/T010/T007) after T003; route (T015/T014) after T012; hook (T017/T016) after T011.
- US1: T019/T018 (filter) ∥ T054/T020 (helper); then T021; component test files (T022/T023/T025/T026/T029) are `[P]`.
- Serialization point: `TokenReferencePicker.tsx` is edited in T021 (US1), T036 (US2), T042 (US3) — these **must not** be parallelized.

## Parallel Example: Foundational

```bash
# Command tests + repair, in parallel with the catalogue-wire group:
Task: "Command.test.tsx failing (T005)"   # [U1][U2]
Task: "Command.a11y.test.tsx failing (T006)" # [U3]
Task: "reference-catalogue-wire.test.ts failing (T053)" # [U16][U17][U18]
Task: "reference-catalogue.test.ts failing (T013)"      # [U19]..[U28]
# then:
Task: "Repair Command.tsx (T003)"   # green [U1][U2][U3]
Task: "Build Combobox.tsx (T007)"   # after T003, green [U4]..[U15]
```

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1 → Phase 2 (blocks everything) → Phase 3.
2. Stop and validate: [A1]–[A6], [A17], [A20] green; repoint + save changes only that `$value` (SC-007); flow is keyboard-only (SC-006).
3. Demo.

### Incremental delivery

- Foundational + US1 → repointing works (MVP).
- + US2 → previews before save.
- + US3 → circular picks impossible, broken picks flagged.

---

## Notes

- `packages/token-core` is **not** modified — `resolveReference` already covers every outcome. No new dependency in any package.
- The server write path (`app/api/tokens/[...path]/route.ts:207`) already persists a reference `$value` verbatim — US1 adds regression guard [U101], not new write code.
- Commit after each red-green-refactor cycle (behavior commit; a separate structural commit for a refactor step). Rebase onto `main`, never merge (CLAUDE.md).
- `/speckit.tdd.run` records each cycle's red evidence in `tdd/cycle-log.md`; `/speckit.implement` handles anything still unticked after the loop.
