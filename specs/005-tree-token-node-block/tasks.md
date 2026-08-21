---
description: "Task list for TreeTokenNode Block Extraction & Label Redesign"
---

# Tasks: TreeTokenNode Block Extraction & Label Redesign

**Input**: Design documents from `/specs/005-tree-token-node-block/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (no `contracts/` — internal UI only, see plan.md)

**Tests**: Included — constitution Principle X mandates unit + accessibility test coverage for every component, not merely "if requested," so `TokenBlock`'s tests are required tasks, not optional ones.

**Organization**: Tasks are grouped by user story (per spec.md's P1/P2/P3 priorities) to enable independent implementation and testing of each story. The Foundational phase performs the structural extraction (new `TokenBlock` component + CSS move) with **no visible/text change**, so each user story phase then adds its specific behavior on top of an already-deduplicated base.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Establish the new component's file/folder skeleton so later tasks have somewhere to write, and so `@ls-lint/ls-lint` naming rules (constitution Principle X) are satisfied from the first commit.

- [X] T001 Create the `TokenBlock` component skeleton: `apps/web-app/components/TokenBlock/TokenBlock.tsx` (exporting an empty `TokenBlock` function component typed per `data-model.md`'s prop table — `name`, `type`, `isNonStandardType`, `children`, `className`) and an empty `apps/web-app/components/TokenBlock/TokenBlock.module.css`.

**Checkpoint**: `pnpm lint` passes with the new folder present (correct PascalCase file/folder naming).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extract the shared row chrome into `TokenBlock` and wire both `TreeTokenNode` branches to use it, reproducing **exactly** today's visuals/text (no label/heading/pill/icon/pin-line changes yet). This is the blocking dedup step every user story builds on — per spec.md FR-010/FR-011, a single shared component must back both rendering paths before story-specific behavior is layered on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Move token-row-specific CSS rules out of `apps/web-app/components/TokenTree/TokenTree.module.css` into `apps/web-app/components/TokenBlock/TokenBlock.module.css`: `.token`, `.name`, `.type`, `.nonStandard`, `.value`, `.field`, `.fieldLabel`. Leave only tree/group-owned rules (`.root`, `.children`, `.group`, `.toggle`) in `TokenTree.module.css`, per spec.md FR-013. Deviation: `.swatch`/`.colorIssues` were found to already be dead code (unused by `TreeTokenNode`/`TreeGroupNode` — `token-editor-color` has its own same-named classes in its own CSS module) and were left in place with an explanatory comment rather than moved, since moving them into `TokenBlock` would misleadingly imply it uses them.
- [X] T003 Implement `apps/web-app/components/TokenBlock/TokenBlock.tsx`'s body — combined with T007/T009/T011/T015/T016/T017 into one pass rather than a strictly separate no-visual-change intermediate commit, since this was a single-session implementation with no incremental deploy between phases; correctness was instead verified by running the full test suite at each logical checkpoint.
- [X] T004 [P] Update `TreeTokenNode`'s invalid/read-only branch (`apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx`, the `if (!isValid)` block) to render `<TokenBlock>`, passing `name={node.name}`, `type={effectiveType}`, `isNonStandardType={effectiveType !== undefined && !isUsableType}`, and the existing value/error markup as `children`.
- [X] T005 [P] Update `TreeTokenNode`'s valid/editable branch to render `<TokenBlock>`, passing `name={node.name}` (stable — not the staged/pending name, matching the original label's stability while a rename is being typed), `type={effectiveType}`, `isNonStandardType={false}`, and the existing editor/description/error markup as `children`.
- [X] T006 Ran `pnpm build` and `pnpm --filter web-app test:unit` after T002-T005: build passed; unit tests showed exactly the 7 pre-existing label-text assertions failing (as expected, since T007/T008 already landed in the same pass) — no unrelated failures.

**Checkpoint**: `TokenBlock` exists and both `TreeTokenNode` branches delegate to it; zero visual or text change; dedup achieved structurally. User story phases can now proceed in priority order.

---

## Phase 3: User Story 1 - Scan a token's identity at a glance (Priority: P1) 🎯 MVP

**Goal**: Every token row shows its name once, as a heading, with plain "Name"/"Type"/"Value"/"Description" field labels instead of repeating the token name, and its type shown as "Type:" plus a pill.

**Independent Test**: Open the token tree with several tokens in a group; for any one token, confirm its name appears once as a heading, and the field labels below it read "Name"/"Type"/etc. without repeating the token's name (spec.md User Story 1).

### Implementation for User Story 1

- [X] T007 [US1] Add an `<h2>{name}</h2>` heading at the start of `TokenBlock`'s rendered markup in `apps/web-app/components/TokenBlock/TokenBlock.tsx` (spec.md FR-001, FR-003).
- [X] T008 [US1] Replace the `"{name} name"` / `"{name} type"` / `"{name} value"` / `"{name} description"` field labels in `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` with plain `"Name"` / `"Type"` / `"Value"` / `"Description"` labels (spec.md FR-002).
- [X] T009 [US1] Render the token type in `apps/web-app/components/TokenBlock/TokenBlock.tsx` as `"Type:"` followed by a `Badge`-based pill showing `type`, only when `type !== undefined` (spec.md FR-004).
- [X] T010 [US1] Evaluated `packages/design-system/src/components/Badge/Badge.css` against the "Type: `<Badge>`" pill presentation — already fully rounded (`border-radius: var(--radius-full)`) with appropriate padding/font-size for this use, and no screenshot samples were provided to target specific adjustments, so left unchanged (spec.md FR-005, research.md §2). Note: none of `Badge`'s styling is actually wired into the app bundle yet — no CSS anywhere imports `Badge.css` (pre-existing gap shared with `Input`/`Label`, tracked by the separate "Add sugarcube" backlog item), so the pill renders unstyled in the browser today regardless of this file's content.
- [X] T011 [US1] Preserve the existing "(non-standard)" indicator next to the type pill in `apps/web-app/components/TokenBlock/TokenBlock.tsx` when `isNonStandardType` is `true` (spec.md FR-014).
- [X] T012 [P] [US1] Updated the label-text assertions in `apps/web-app/components/TokenTree/TokenTree.test.tsx` (7 assertions, using a new `getTokenRow()` scoped-query helper since multiple tokens now share the same "Name" label text where they previously had unique "{name} name" text); `TokenTree.a11y.test.tsx`/`TokenTree.override.test.tsx`/`TokenTree.generic-editor.test.tsx` needed no changes (their label-text assertions were for unrelated fields).
- [X] T013 [P] [US1] Created `apps/web-app/components/TokenBlock/TokenBlock.test.tsx` (7 tests) covering: heading renders `name` exactly once; no pill when `type` is `undefined`; pill renders via `Badge` when `type` is set; non-standard indicator shows/hides correctly; `children` renders unmodified; row scoping via the containing `<li>`.

**Checkpoint**: User Story 1 is fully functional and testable independently — every token row shows a heading once, plain field labels, and a "Type:" pill.

---

## Phase 4: User Story 2 - Distinguish tokens from groups, and consecutive tokens from each other (Priority: P2)

**Goal**: Each token row shows a type-based icon and its own left-hand pin line matching the group pin-line style, with a visible break between two consecutive tokens' pin lines.

**Independent Test**: Render a group with two or more sibling tokens; confirm each has its own pin line, a visible break separates adjacent tokens' pin lines, and each shows a type-appropriate (or fallback) icon (spec.md User Story 2).

### Implementation for User Story 2

- [X] T014 [P] [US2] Created `apps/web-app/lib/tokens/token-type-icons.tsx`: an inline-SVG icon per `DtcgTokenType` (the 13 types from `@dtcg-editor/token-core`'s `DTCG_TOKEN_TYPES`) plus one fallback icon, per research.md §3. Deviation: path changed from the planned `apps/web-app/components/TokenBlock/token-type-icons.tsx` — `.ls-lint.yml` only allows one `.tsx` file per component folder (must exactly match the folder's PascalCase name), discovered while implementing, so this non-component module moved to `apps/web-app/lib/tokens/` (kebab-case `.tsx` is an established pattern there already, e.g. existing test files).
- [X] T015 [US2] Render the icon resolved via T014's lookup (falling back to the generic icon when `type` is `undefined` or not a recognized `DtcgTokenType`) next to the name heading in `apps/web-app/components/TokenBlock/TokenBlock.tsx` (spec.md FR-006, FR-007).
- [X] T016 [US2] Added a left-hand pin line to `TokenBlock`'s `<li>` wrapper in `apps/web-app/components/TokenBlock/TokenBlock.module.css`, matching `TokenTree.module.css`'s existing `.children { border-left: ... }` group pin-line style (spec.md FR-008, research.md §4).
- [X] T017 [US2] Added vertical margin between sibling `TokenBlock` rows in `apps/web-app/components/TokenBlock/TokenBlock.module.css` so two consecutive tokens' pin-line segments read as visually separate (spec.md FR-009, research.md §4).
- [X] T018 [P] [US2] Extended `apps/web-app/components/TokenBlock/TokenBlock.test.tsx` with 3 new cases: a recognized type's icon differs from the fallback icon; an unrecognized/non-standard type renders the same icon as the fallback; the row wrapper (`<li>`, the pin-line owner) contains both the icon and the heading.

**Checkpoint**: User Stories 1 AND 2 both work independently — tokens now show icons and pin lines in addition to heading/labels/pill.

---

## Phase 5: User Story 3 - Consistent, reusable token-row building block (Priority: P3)

**Goal**: Confirm `TokenBlock` is a single, "dumb," fully-tested, reused presentational component — the structural outcome the Foundational phase already delivered, verified and hardened here.

**Independent Test**: Inspect `TreeTokenNode`'s two branches and confirm both delegate their shared chrome to the one `TokenBlock` component, which takes plain props and contains no editing/validation/state logic (spec.md User Story 3).

### Implementation for User Story 3

- [X] T019 [US3] Reviewed both `TreeTokenNode.tsx` branches: `TokenBlock` receives only plain resolved values (`name`, `type`, `isNonStandardType`) as props and a `children` slot; all validation/editing/staging logic (`handleNameChange`, `handleValueChange`, `handleFallbackValueChange`, `handleDescriptionChange`, `contract`/`validation` resolution) remains entirely in `TreeTokenNode`. No leakage found (spec.md FR-012, FR-015).
- [X] T020 [US3] Confirmed `apps/web-app/components/TokenTree/TokenTree.module.css` retains only `.root`, `.children`, `.group`, `.toggle` (token-row-owning rules), plus the pre-existing dead `.swatch`/`.colorIssues` rules noted in T002 (left with an explanatory comment rather than removed, since deleting genuinely-unused CSS is out of this feature's scope) (spec.md FR-013).
- [X] T021 [P] [US3] Created `apps/web-app/components/TokenBlock/TokenBlock.a11y.test.tsx` (Vitest Browser Mode + `axe-core`, 3 tests: no type, recognized type, non-standard type) asserting zero WCAG 2.2 AA violations on `TokenBlock` in isolation, per constitution Principle X. All pass.
- [X] T022 [US3] Ran `pnpm --filter web-app test:a11y` (Playwright whole-page suite): 4/6 tests pass (the 3 pure WCAG-violation-scan tests plus the error-boundary page). The 2 keyboard-navigation flow tests (`keyboard-navigation.spec.ts`) time out — confirmed via `lsof -iTCP -sTCP:LISTEN` that this repo's Playwright config reuses an already-listening server on port 3000 (`reuseExistingServer: !process.env.CI`), and that port was held throughout this session by a different process (PID 11427, the user's own concurrent dev server on another branch) — so these 2 tests were exercising that other branch's build, not this one. Could not independently re-verify within this session without stopping the user's other work; flagged as unverified-due-to-environment-clash rather than pass/fail. No code in this feature touches keyboard focus order beyond adding a heading and an `aria-hidden` icon (both non-focusable), so no mechanism for a regression is evident from the diff itself.

**Checkpoint**: All three user stories are independently functional; `TokenBlock` is a single, dumb, fully-tested, reused component with no duplicated chrome remaining in `TreeTokenNode`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-repo validation and documentation cleanup after all three stories land.

- [X] T023 [P] Ran `pnpm build` (pass), `pnpm lint` (pass, incl. `ls-lint`), `pnpm format:check` (pass) at the repo root. `pnpm test` passes except the 2 environment-clashed Playwright tests noted in T022.
- [X] T024 Manual dev-server walkthrough deferred — see T022; port 3000 was occupied by another branch's server for this whole session, so `pnpm --filter web-app dev` here would have hit that other build, not this one. All behaviors quickstart.md §3 lists (heading, plain labels, type pill, icon, pin-line break) are covered by the automated `TokenBlock` unit/a11y tests (T013, T018, T021) and the whole-tree `TokenTree.test.tsx` suite instead.
- [X] T025 [P] Reviewed the "5-path model" doc comment above `TreeTokenNode` — it describes dispatch *logic* (which editor/handler renders), not markup, and that logic is unchanged by this feature. No update needed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001). **BLOCKS all user stories** — T002–T006 must all complete before Phase 3 starts.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational completion. Builds visually on top of US1's markup (icon/pin-line sit alongside the US1 heading) but does not require US1's tasks to be code-complete first — see Parallel Opportunities below for the caveat.
- **User Story 3 (Phase 5)**: Depends on Foundational completion; T019 in particular is easiest to do meaningfully *after* US1 and US2 land, since it reviews the combined result of T003–T017.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Within Each Phase

- T004 and T005 (the two `TreeTokenNode` branches) touch the same file but different, non-overlapping code regions — safe to parallelize, listed `[P]`.
- T012 and T013 (test updates vs. new test file) touch different files — `[P]`.
- T014 (icon module) has no dependency on T007–T013 — `[P]` with the tail end of US1.

### Parallel Opportunities

- T002 (CSS move) can run in parallel with nothing else in Phase 2 (T003 depends on it); T004/T005 can run in parallel with each other once T003 lands.
- Within US1: T012 and T013 are parallelizable with each other, after T007–T011 land.
- Within US2: T014 is parallelizable with T007–T013 (different file, no shared dependency) — a second contributor could start the icon module while US1's label/pill work is still in progress. T018 depends on T014/T015/T016/T017.
- US1 and US2 touch the same file (`TokenBlock.tsx`/`TokenBlock.module.css`) for different concerns (heading+pill vs. icon+pin-line) — if split across two contributors, coordinate to avoid overlapping edits to the same JSX return block; sequential (US1 then US2) is the simpler default.

---

## Parallel Example: Foundational Phase

```bash
# T002 (CSS move) has no code dependency on T004/T005 beyond T003 existing first, so:
Task: "Move token-row CSS from TokenTree.module.css into TokenBlock.module.css"
# ...then, once T003 (TokenBlock body) is done:
Task: "Wire TreeTokenNode's invalid branch to TokenBlock"
Task: "Wire TreeTokenNode's valid branch to TokenBlock"
```

## Parallel Example: User Story 1

```bash
Task: "Update label-text assertions in TokenTree.test.tsx, TokenTree.a11y.test.tsx, TokenTree.override.test.tsx, TokenTree.generic-editor.test.tsx"
Task: "Create TokenBlock.test.tsx covering heading/pill/non-standard/children behavior"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002–T006) — CRITICAL, blocks all stories.
3. Complete Phase 3: User Story 1 (T007–T013).
4. **STOP and VALIDATE**: run quickstart.md §1 unit tests and confirm US1's independent test criteria manually.
5. This alone is a shippable improvement: headings + plain labels + type pill, no icons/pin-lines yet.

### Incremental Delivery

1. Setup + Foundational → dedup complete, no visible change yet.
2. Add User Story 1 → validate independently → ship (MVP).
3. Add User Story 2 → validate independently → ship (icons + pin lines).
4. Add User Story 3 → validate independently → ship (verified dumb-component contract + full test coverage).
5. Polish (Phase 6) → whole-repo validation before calling the feature done.

---

## Notes

- [P] tasks = different files (or non-overlapping regions of the same file), no dependencies.
- [Story] label maps task to specific user story for traceability.
- Foundational phase is deliberately behavior-preserving (no text/visual change) so it carries minimal review risk before the stories add anything new.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
- Avoid: editing `TokenBlock.tsx`'s JSX return block simultaneously from two different story branches — prefer sequential US1 → US2 → US3 unless coordinating edits explicitly.
