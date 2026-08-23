---
description: "Task list for Token Reference Preview & Navigation"
---

# Tasks: Token Reference Preview & Navigation

**Input**: Design documents from `/specs/007-token-reference-links/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are **mandatory** here, not optional. Constitution Principle X requires every React component to have unit **and** accessibility test coverage, `contracts/reference-validation.md` carries a "Required tests" section, and spec SC-009 requires zero critical a11y violations. Three of the components this feature touches — `TreeGroupNode`, `TreeTokenNode`, and `TreeNode` — have **no tests at all** today, so coverage is added as each is edited: T036/T038, T031/T032, and T032a/T032b respectively.

**Task IDs**: tasks inserted after the initial numbering use letter suffixes (`T021a`, `T026a`, `T032a`, …) rather than renumbering, so the ~50 existing `depends on` references stay valid. All IDs are unique and every dependency resolves.

**Organization**: Grouped by user story so each is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3, mapping to spec.md's prioritized user stories
- Every task names its exact file path

## Path Conventions

Existing monorepo layout, unchanged (plan.md "Structure Decision"):

- `packages/token-core/src/` — DTCG value semantics, React-free, co-located `*.test.ts` run by `node:test`
- `apps/web-app/lib/tokens/` — app-side token plumbing, **kebab-case** filenames (Principle X)
- `apps/web-app/hooks/` — **camelCase** filenames (Principle X)
- `apps/web-app/components/<PascalCase>/` — one component per folder with co-located `X.test.tsx` (jsdom "unit" project) and `X.a11y.test.tsx` (browser-mode "a11y" project)
- `apps/web-app/e2e/` — Playwright

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test fixtures. No existing fixture in this project contains a reference of any kind, and the project's own token set contains no broken, group-targeted, or circular reference — so every failure path can only be covered by purpose-built fixtures (spec Assumptions).

**⚠️ Isolation constraint**: `playwright.config.ts` runs one `webServer` with a single `DTCG_EDITOR_TOKENS_DIR: "./e2e/fixtures/tokens"`. Adding broken/unparseable fixtures to that directory would break `home.spec.ts` and `tokens-page.spec.ts`, which assert on the file listing. The reference fixtures therefore get their own directory and their own server.

- [X] T001 [P] Create cross-file + chained reference fixtures in `apps/web-app/e2e/fixtures/token-references/base.tokens.json` and `apps/web-app/e2e/fixtures/token-references/semantic.tokens.json` — literal targets in one file, references and a 3-hop chain in the other
- [X] T002 [P] Create failure-path fixture in `apps/web-app/e2e/fixtures/token-references/broken.tokens.json` covering a reference to a non-existent path and a reference whose target is a group, not a token
- [X] T003 [P] Create cycle fixture in `apps/web-app/e2e/fixtures/token-references/circular.tokens.json` — a chain returning to a token already in it
- [X] T004 [P] Create unparseable-file fixture in `apps/web-app/e2e/fixtures/token-references/unparseable.tokens.json` plus a file referencing into it, proving one bad file does not stop other references resolving (spec FR-007 edge case)
- [X] T005 [P] Create multiply-defined/mode fixtures in `apps/web-app/e2e/fixtures/token-references/dark.tokens.json` and `apps/web-app/e2e/fixtures/token-references/tokens.resolver.json` — one path defined in two files under distinct modes (spec FR-005)
- [X] T006 Add a second `webServer` (port 3101, `DTCG_EDITOR_TOKENS_DIR: "./e2e/fixtures/token-references"`) and a matching Playwright project scoped to the reference spec in `apps/web-app/playwright.config.ts`, leaving the existing server and suites untouched

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The reference API and the whole-directory index. Every user story depends on both — US1 needs resolution, US2 needs definitions and target files, US3 needs the reverse index.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### `token-core` reference API (contracts/token-core-reference-api.md)

- [X] T007 [P] Implement `parseReference` and `collectReferences` in `packages/token-core/src/reference.ts` — whole-string `{body}` form only, non-empty body with no `{`/`}`; `collectReferences` descends objects/arrays recording `at`; both pure, total, never throwing and never returning a `Result`
- [X] T008 [P] Write syntax tests in `packages/token-core/src/reference.test.ts` — whole-value reference, reference nested in a composite (shadow `color`, and inside a layer array), `"a {b} c"` rejected, empty body rejected, non-string values rejected
- [X] T009 Implement `resolveReference` plus `ChainOutcome`/`ChainStep`/`ResolutionChain`/`LookupHit`/`ReferenceLookup` in `packages/token-core/src/resolve-reference.ts` — walks via the injected `lookup` until a non-reference value, retains **every** step (FR-003), **no depth limit** (termination comes from cycle detection alone), group target yields `group-target`, lookup miss yields `unresolved` (depends on T007)
- [X] T010 Write resolution tests in `packages/token-core/src/resolve-reference.test.ts` — single hop, 3-hop chain, all steps retained in order, `unresolved`, `group-target`, and a `circular` case that must **fail fast rather than hang the suite**; assert `resolved.type` is the final token's effective type (depends on T009)
- [X] T011 Export the new surface (`parseReference`, `collectReferences`, `resolveReference`, and the reference/chain types) from `packages/token-core/src/index.ts` (depends on T007, T009)

### Whole-directory load and index (contracts/reference-index.md)

- [X] T012 Extract `loadTokenDirectory` and `LoadedTokenFile` into `apps/web-app/lib/tokens/load-directory.ts` from the traversal currently inside `scanTokenDirectory`, preserving recursion, symlink skipping, and per-file parse-failure isolation exactly; injected `logger`/`readDirFn`/`readFileFn` with real defaults; returns `ResultAsync`
- [X] T013 Write tests in `apps/web-app/lib/tokens/load-directory.test.ts` — documents retained, one unparseable file omitted without aborting the load, symlinks skipped, injected fs used (depends on T012)
- [X] T014 Rewrite `apps/web-app/lib/tokens/scan.ts` to consume `loadTokenDirectory` and reduce documents to its existing summary shape — **one traversal, not two** — with its public signature and return type unchanged (depends on T012)
- [X] T015 Verify no regression in `apps/web-app/lib/tokens/scan.test.ts`, extending it only where the refactor exposes new seams (depends on T014)
- [X] T016 [P] Implement `loadResolverModes` and a **Zod schema** for `tokens.resolver.json` in `apps/web-app/lib/tokens/resolver-file.ts` — Principle IV edge validation; resolves `undefined` when absent, and degrades a malformed file to `undefined` with a logged warning rather than failing the page
- [X] T017 [P] Write tests in `apps/web-app/lib/tokens/resolver-file.test.ts` — valid file parsed to `filesByMode`/`modes`, absent file yields `undefined`, malformed file yields `undefined` and logs (depends on T016)
- [X] T018 Implement `buildReferenceIndex` and `buildReferenceView` in `apps/web-app/lib/tokens/reference-index.ts` — one pass recording `definitions`, `referencesFrom`, `referencedBy` and `modes`; `referencedBy` de-duplicated per referencing token (FR-019); the view resolves once **per mode** for multiply-defined paths and never picks a winner (FR-005); empty referrer lists omitted (FR-021); pure and synchronous (depends on T009, T012, T016)
- [X] T019 Write tests in `apps/web-app/lib/tokens/reference-index.test.ts` using hand-built documents and no filesystem — cross-file resolution, a token referencing one target twice counted once, multiply-defined path yielding one outcome per mode, zero-referrer token omitted from `referencedBy`, references into an unparseable (absent) file marked unresolved (depends on T018)
- [X] T020 Extend `apps/web-app/lib/tokens/plain-node.ts` to carry the per-file `TokenReferenceView` alongside the existing precomputed `effectiveType`, following that same precedent (depends on T018)
- [X] T021 [P] Generate a synthetic benchmark fixture of **5,000 tokens whose reference chains reach depth 5** in `apps/web-app/lib/tokens/reference-index.bench-fixture.ts` — built programmatically, not committed as JSON, so it stays cheap to regenerate and cannot drift
- [X] T021a Add the SC-010 budget assertion to `apps/web-app/lib/tokens/reference-index.test.ts` — `buildReferenceIndex` over the T021 fixture, parsed with `token-core`'s Zod-validating `parseTokenFile`, MUST complete in **under 50 ms**. This is a hard gate, not a recorded observation. Depth 5 is a property of the fixture only and MUST NOT introduce a depth cap in the resolver, which is unbounded by design (depends on T018, T021)
- [X] T021b Record the measured figure against the project's own token set in `specs/007-token-reference-links/research.md` §2, replacing the 1.40 ms raw-`JSON.parse` floor with a real Zod-validated number; a result near the 50 ms budget at only 565 tokens would reopen the no-cache decision (depends on T021a)

**Checkpoint**: Reference resolution and the whole-directory index exist and are unit-tested. User story work can begin.

---

## Phase 3: User Story 1 - See what a reference actually resolves to (Priority: P1) 🎯 MVP

**Goal**: Show the concrete value a reference resolves to, and stop reporting valid references as invalid values.

**Independent Test**: Open a token file containing a reference; confirm the concrete resolved value is shown and no validation error is reported, without navigating away.

### Validation hoist — client and server, one indivisible unit (contracts/reference-validation.md)

**⚠️ T022 and T023 MUST land together in a single commit.** `route.ts` documents that it "Mirrors `TokenTree.tsx`'s client-side `canEdit` guard", and `docs/history.md` (2026-08-02) records that a previous failure to generalize this exact pair caused both a client crash and a server-side unvalidated-write hole. Client-only leaves the UI staging edits the server rejects with a 400; server-only leaves the false error on screen. These depend on T007/T011 only, **not** on the index — they are independently deployable and fix a live bug on their own.

- [X] T022 [US1] Hoist the reference check above `validateTokenValue` in `apps/web-app/app/api/tokens/[...path]/route.ts` — when `edit.value` is a reference, skip **both** the per-type validation and `serializeValue` (which is typed for that contract's value and would be wrong for a reference string) and write it through as `value = edit.value` (depends on T007, T011)
- [X] T023 [US1] Hoist the reference check above `validateTokenValue` in `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx`, adding a **sixth path** to the documented 5-path dispatch model: value is a reference → render the reference view, never `validateTokenValue` (depends on T007, T011)
- [X] T024 [US1] Add server tests to `apps/web-app/app/api/tokens/[...path]/route.test.ts` — a name-only edit to a reference-valued token is accepted; a reference value is accepted without per-type validation; a save of unrelated edits leaves a reference-valued sibling untouched (depends on T022)
- [X] T025 [US1] Add a paired client/server agreement test asserting both sides classify the same values identically as references, in `apps/web-app/lib/tokens/reference-agreement.test.tsx` (`.tsx`, not `.ts` — it renders `TokenTree` for the client-side half) — the guard against the divergence `docs/history.md` records (depends on T022, T023)

### Resolved value display

- [X] T026 [P] [US1] Create `apps/web-app/components/TokenReferenceValue/TokenReferenceValue.tsx` and `TokenReferenceValue.module.css` — renders the reference exactly as the file says it **plus** its resolved value, presenting the resolved value the same way an equivalent literal of that type is presented (FR-010, so a referenced color renders as a swatch). Delegates every non-resolved outcome to `ReferenceWarning` (depends on T020)
- [X] T026a [P] [US1] Create `apps/web-app/components/ReferenceWarning/ReferenceWarning.tsx` and `ReferenceWarning.module.css` — one user-facing warning per `ChainOutcome` failure variant, **visually and textually distinct** (FR-011a), each naming the offending path from its own payload (FR-011b): `unresolved` → the missing path, `group-target` → the group path plus that references may only target complete tokens, `circular` → the tokens forming the cycle. None is activatable (FR-016); none offers an in-app repair, which is deferred (spec Assumptions). Must not rely on color alone to distinguish the three (depends on T020)
- [X] T027 [P] [US1] Write unit tests in `apps/web-app/components/TokenReferenceValue/TokenReferenceValue.test.tsx` — whole-value reference, nested composite reference, chained reference showing the end literal, and that each non-resolved outcome delegates to `ReferenceWarning` (depends on T026)
- [X] T027a [P] [US1] Write unit tests in `apps/web-app/components/ReferenceWarning/ReferenceWarning.test.tsx` — all three variants render **different** text, each names its own offending path, none renders an activatable control, and no two variants are distinguishable by color alone (SC-011) (depends on T026a)
- [X] T027b [P] [US1] Write `apps/web-app/components/ReferenceWarning/ReferenceWarning.a11y.test.tsx` asserting zero `axe-core` WCAG 2.2 AA violations and that each warning is announced to assistive technology (depends on T026a)
- [X] T028 [P] [US1] Write accessibility tests in `apps/web-app/components/TokenReferenceValue/TokenReferenceValue.a11y.test.tsx` asserting zero `axe-core` WCAG 2.2 AA violations (depends on T026)
- [X] T029 [US1] Build the index and pass the per-file view through in `apps/web-app/app/tokens/[...path]/page.tsx` — built per request and discarded, no cache (depends on T018, T020)
- [X] T030 [US1] Wire the reference path in `apps/web-app/components/TreeNode/TreeNode.tsx` and `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` to render `TokenReferenceValue`, keeping `TreeTokenNode.tsx` under Principle X's 300-line ceiling (it is at 240 today) (depends on T023, T026)
- [X] T031 [US1] Add the FR-009 regression tests in `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx` (new file — this component has no tests today) — a `color` token holding a reference renders **no** validation error and shows its resolved value, and the same for a `dimension` token (depends on T030)
- [X] T032 [US1] Add `apps/web-app/components/TreeTokenNode/TreeTokenNode.a11y.test.tsx` (new file) asserting zero critical violations for both the reference and non-reference paths (depends on T030)
- [X] T032a [P] [US1] Add `apps/web-app/components/TreeNode/TreeNode.test.tsx` (new file — this component has no tests today) covering the dispatch: a `token` node renders `TreeTokenNode`, a `group` node renders `TreeGroupNode`, and the reference path reaches `TokenReferenceValue`. Required by Principle X, which this feature triggers by editing the component in T030 (depends on T030)
- [X] T032b [P] [US1] Add `apps/web-app/components/TreeNode/TreeNode.a11y.test.tsx` (new file) — `TreeNode` is a pure dispatch component with no accessibility semantics of its own, so this is the **explicit test asserting that**, which Principle X requires rather than allowing a silent exemption (depends on T030)

**Checkpoint**: US1 complete and independently shippable. The live false-error bug against the app's own default token directory is fixed and resolved values are visible.

---

## Phase 4: User Story 2 - Jump to a referenced token to edit it (Priority: P2)

**Goal**: Let the user activate a reference and land on the referenced token, ready to edit, including across files.

**Independent Test**: With a token referencing another, activate the reference and confirm the referenced token is brought into view ready to edit — including when it lives in a different file.

### Disclosure refactor (contracts/token-addressing-and-navigation.md, research.md §5)

**Scope note**: this deliberately absorbs the standing backlog item _"TreeGroupNode should be refactored to either be a disclosure element, or make sure it has all necessary aria props like controls, and expanded"_. Native `<details>` is what supplies reveal-a-collapsed-group for free, so deferring it would mean touching this component twice.

- [X] T033 [US2] Convert `apps/web-app/components/TreeGroupNode/TreeGroupNode.tsx` to a native `<details>`/`<summary>` disclosure, removing `const [expanded, setExpanded] = useState(true)` entirely — the DOM owns open/closed state, nothing is lifted into `TokenTree`
- [X] T034 [US2] Keep the `<details>` **uncontrolled** in `apps/web-app/components/TreeGroupNode/TreeGroupNode.tsx` — React must never pass a changing `open` prop; initial open state comes from the server-rendered attribute, preserving today's default-expanded behavior. A controlled `open` would re-assert over the browser's native expansion and defeat arrival entirely (depends on T033)
- [X] T035 [US2] Place the group-name `Input` **outside** `<details>` in `apps/web-app/components/TreeGroupNode/TreeGroupNode.tsx`, with `<summary>` carrying only the disclosure control and its accessible name, laid out via `apps/web-app/components/TokenTree/TokenTree.module.css`. Inside `<summary>` it is nested interactive content (Space toggles the group; ACT/axe-flaggable); after `<summary>` it falls inside the collapsible region and a collapsed group cannot be renamed. This is the non-trivial part of the refactor (depends on T033)
- [X] T036 [US2] Write unit tests in `apps/web-app/components/TreeGroupNode/TreeGroupNode.test.tsx` (new file — this component has no tests today) covering expand/collapse, group rename while collapsed, and duplicate-name rejection (depends on T035)
- [X] T037 [US2] Add the uncontrolled-`open` regression test to `apps/web-app/components/TreeGroupNode/TreeGroupNode.test.tsx` — collapse a group, edit a sibling token to force a `TokenTree` re-render, assert the group **stays collapsed**. This catches React re-asserting `open`, the failure mode that would silently break arrival (depends on T034, T036)
- [X] T038 [US2] Write `apps/web-app/components/TreeGroupNode/TreeGroupNode.a11y.test.tsx` (new file) asserting zero critical violations and that the disclosure exposes its expanded state — closing the gap left by today's toggle `<button>`, which has neither `aria-expanded` nor `aria-controls` (depends on T035)

### Addressing and arrival

- [X] T039 [P] [US2] Implement the fragment scheme in `apps/web-app/lib/tokens/token-fragment.ts` — `/tokens/<file>#<segment>.<segment>`, each segment percent-encoded and joined with `.`, reusing `FolderOverview.tsx`'s existing `hrefFor` encoding for the file half so both stay consistent; plus the inverse decode
- [X] T040 [P] [US2] Write tests in `apps/web-app/lib/tokens/token-fragment.test.ts` — round-trip encode/decode, segments needing percent-encoding, and a fragment naming a non-existent token decoding without error (depends on T039)
- [X] T041 [US2] Implement arrival in `apps/web-app/hooks/useTokenArrival.ts` (camelCase per Principle X) — on mount and on `hashchange`, decode the fragment, match it to the rendered token, **move focus to it**, and mark it as the arrival target. Revealing collapsed ancestors and scrolling are the **browser's** job via native `<details>` auto-expansion; this hook covers only what the browser does not do. A fragment naming a token not in the file is ignored and the page renders normally (depends on T033, T039)
- [X] T042 [US2] Write tests in `apps/web-app/hooks/useTokenArrival.test.ts` — focus moves to the target, arrival marking applied, unknown fragment ignored, `hashchange` re-runs it (depends on T041)
- [X] T043 [US2] Ensure the arrival highlight does not rely on color alone (spec a11y requirement) in `apps/web-app/components/TokenBlock/TokenBlock.module.css` (depends on T041)
- [X] T043a [US2] Assert the arrival highlight carries a non-color distinguishing signal in `apps/web-app/components/TokenBlock/TokenBlock.test.tsx` — every other accessibility requirement in this feature has a verifying test, and T043 alone is unenforced (depends on T043)

### Navigation controls

- [X] T044 [US2] Render a resolvable single-definition reference as a keyboard-operable link with an accessible name describing its destination in `apps/web-app/components/TokenReferenceValue/TokenReferenceValue.tsx`; all three failure cases keep rendering their `ReferenceWarning` and are **not** activatable (FR-016) (depends on T026, T026a, T039)
- [X] T045 [P] [US2] Create `apps/web-app/components/ReferenceDefinitionPicker/ReferenceDefinitionPicker.tsx` and its `.module.css` — a `Popover` trigger listing every definition of a multiply-defined path by **file and mode**, never silently picking a winner (FR-013); affects 75 of 490 paths in the project's own token set. Uses the existing `packages/design-system` `Popover`, no new dependency (depends on T018, T039)
- [X] T046 [P] [US2] Write unit tests in `apps/web-app/components/ReferenceDefinitionPicker/ReferenceDefinitionPicker.test.tsx` — every definition listed and labelled by file and mode, each activatable (depends on T045)
- [X] T047 [P] [US2] Write `apps/web-app/components/ReferenceDefinitionPicker/ReferenceDefinitionPicker.a11y.test.tsx` asserting zero critical violations and keyboard operability (depends on T045)
- [ ] T048 [US2] Implement the unsaved-edits guard in `apps/web-app/components/TokenTree/TokenTree.tsx` using the existing `Dialog` — triggered only when `pendingEdits.size > 0` **and** the navigation leaves the current file; offers save / discard / stay and never discards or writes without an explicit choice (FR-018). Same-file jumps are never intercepted. `beforeunload` is **not** used: it does not fire for client-side route changes and cannot offer a save option (depends on T044)
- [ ] T049 [US2] Write guard tests in `apps/web-app/components/TokenTree/TokenTree.test.tsx` — each of save / discard / stay behaves correctly, and a same-file jump raises no prompt (depends on T048)
- [ ] T050 [US2] Write cross-file navigation e2e in `apps/web-app/e2e/token-references.spec.ts` — same-file jump, cross-file jump, arrival into a **collapsed** group, multi-definition picker, and the unsaved-edits guard (depends on T006, T041, T045, T048)
- [ ] T050a [US2] Add failure-case e2e to `apps/web-app/e2e/token-references.spec.ts` against the Phase 1 fixtures — each of the three warnings renders with its own distinct text, none is activatable, and the page stays usable in every case including the circular fixture (SC-007, SC-011) (depends on T006, T026a, T050)

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Discover what depends on a token (Priority: P3)

**Goal**: Show a token how many others reference it, and let the user reach any of them.

**Independent Test**: Open a token other tokens reference and confirm it reports how many reference it and can list them, each reachable.

- [ ] T051 [P] [US3] Create `apps/web-app/components/ReferencedByBadge/ReferencedByBadge.tsx` and its `.module.css` — a `Badge`-styled `Popover` trigger reading "referenced once" (1), "referenced twice" (2), "referenced N times" (≥3), expanding to a `<ul>` of links and collapsing again; renders **nothing at all** at zero referrers (FR-021). Uses existing `design-system` `Badge`/`Popover` (depends on T020, T039)
- [ ] T052 [P] [US3] Write unit tests in `apps/web-app/components/ReferencedByBadge/ReferencedByBadge.test.tsx` — the once/twice/N wording at 1, 2 and 3+, nothing rendered at 0, every referrer listed, each entry identifying its file when it differs from the file being viewed, expand and collapse (depends on T051)
- [ ] T053 [P] [US3] Write `apps/web-app/components/ReferencedByBadge/ReferencedByBadge.a11y.test.tsx` — zero critical violations, and the trigger exposes both the count and its expanded state (depends on T051)
- [ ] T054 [US3] Render `ReferencedByBadge` for every token with at least one referrer in `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx`, including tokens that both hold a reference and are themselves referenced (both indicators appear) (depends on T030, T051)
- [ ] T055 [US3] Add coverage to `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx` for the both-holds-and-is-referenced case (depends on T054)
- [ ] T056 [US3] Extend `apps/web-app/e2e/token-references.spec.ts` — expand a referrer list, confirm cross-file referrers are included and labelled, and activate an entry to navigate back to that referencing token (depends on T050, T054)

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T057 [P] Add a round-trip regression test in `packages/token-core/src/serialize.test.ts` asserting a reference `$value` survives parse → serialize byte-identical (Principle IX; `serialize.ts` already passes `$value` through verbatim, so this locks in existing behavior)
- [ ] T058 [P] Add whole-page keyboard-only flow coverage for every control this feature introduces to `apps/web-app/e2e/keyboard-navigation.spec.ts` (spec SC-009, FR-017)
- [ ] T059 Run `specs/007-token-reference-links/quickstart.md` Scenarios 1-3 against the project's own token set, verifying the SC-001/002/003/005/006 counts (228 references, 50 chained, 75 multiply-defined paths, busiest token 8 referrers)
- [ ] T060 Verify native `<details>` auto-expansion arrival in **Chrome, Firefox, and Safari** per `specs/007-token-reference-links/quickstart.md` Scenario 2 step 2 — this is browser behavior being relied on rather than app code, so single-browser verification is insufficient
- [ ] T061 Run `pnpm lint` (including `@ls-lint/ls-lint` filename/folder rules), `pnpm build`, `pnpm test`, and `pnpm format:check` from the repo root and fix any failures
- [ ] T062 Update `docs/history.md` with the feature and the two architecture decisions worth recording — reference-awareness hoisted above per-type validation on both sides, and `TreeGroupNode` moved to a native disclosure

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — fixtures can be written immediately, in parallel with Phase 2
- **Foundational (Phase 2)**: BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2. The validation-hoist subgroup (T022-T025) depends only on T007/T011 and is deployable before the index exists
- **US2 (Phase 4)**: Depends on Phase 2 and on T026 (`TokenReferenceValue`, which US2 turns into a link)
- **US3 (Phase 5)**: Depends on Phase 2 and on T039 (fragment scheme). Independent of US2's guard and picker
- **Polish (Phase 6)**: Depends on all desired stories

### Critical Sequencing Constraints

1. **T022 and T023 must land in the same commit.** Splitting the client/server validation hoist reproduces the exact failure `docs/history.md` records for 2026-08-02.
2. **T010's cycle test must fail fast, not hang.** Cycle detection is the only thing bounding recursion in `resolveReference` — there is no depth limit by design.
3. **T034 (uncontrolled `open`) gates arrival.** A controlled `<details>` silently defeats the browser's native expansion, so T037's regression test is not optional polish.
4. **T014 must not fork the directory walk.** `scanTokenDirectory` is rewritten to consume `loadTokenDirectory`; two traversals would let symlink and error-isolation behavior drift apart.
5. **T006 before T050.** The reference e2e needs its own server and fixture directory, or the broken/circular fixtures break the existing suites.

### Parallel Opportunities

- All of Phase 1 (T001-T005) in parallel, and the whole phase in parallel with Phase 2
- T007+T008 in parallel with T012 and T016 — `token-core` and the app-side loader are different packages
- T026/T027/T028 in parallel — component, unit test, a11y test
- T045/T046/T047 in parallel, and independent of T051/T052/T053
- Once Phase 2 completes, US2 and US3 can proceed in parallel by different developers

---

## Parallel Example: Phase 2 Foundational

```bash
# token-core and app-side loading are separate packages — run together:
Task: "Implement parseReference/collectReferences in packages/token-core/src/reference.ts"
Task: "Extract loadTokenDirectory into apps/web-app/lib/tokens/load-directory.ts"
Task: "Implement loadResolverModes + Zod schema in apps/web-app/lib/tokens/resolver-file.ts"
```

## Parallel Example: User Story 1 display

```bash
Task: "Create TokenReferenceValue.tsx + .module.css"
Task: "Write TokenReferenceValue.test.tsx"
Task: "Write TokenReferenceValue.a11y.test.tsx"
```

---

## Implementation Strategy

### Bug-fix increment first (before the MVP is even complete)

T007 → T011 → T022 + T023 + T024 + T025 fixes a live, user-visible bug — every token in the app's own `dark.json` is currently told its value "must be a 6-digit hex string like `#rrggbb`" — with no indexing, no navigation, and no new components. Worth landing and validating on its own.

### MVP (User Story 1)

1. Phase 1 fixtures + Phase 2 foundational
2. Phase 3 US1
3. **STOP and VALIDATE** against quickstart.md Scenario 1
4. Ship — resolved values visible, false errors gone

### Incremental Delivery

1. Foundation → US1 (MVP) → US2 → US3
2. Each story is independently testable and adds value without breaking the previous ones

---

## Notes

- `[P]` = different files, no dependency on incomplete work
- Every new component needs its folder, its `X.test.tsx`, and its `X.a11y.test.tsx` — Principle X admits no silent exemption, and a component with no accessibility semantics of its own still needs an explicit test asserting that
- `packages/*` tests run under `node:test`; `apps/web-app` tests run under Vitest, with `*.a11y.test.tsx` in the browser-mode project
- Failure states (unresolved, group-target, circular) are **outcomes, not errors** — they are normal displayable states, so they are never modelled as `Err` (research.md §10)
- Commit after each task or logical group, except T022/T023, which must be one commit
