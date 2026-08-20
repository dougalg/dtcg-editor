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

- [ ] T001 Create the `TokenBlock` component skeleton: `apps/web-app/components/TokenBlock/TokenBlock.tsx` (exporting an empty `TokenBlock` function component typed per `data-model.md`'s prop table — `name`, `type`, `isNonStandardType`, `children`, `className`) and an empty `apps/web-app/components/TokenBlock/TokenBlock.module.css`.

**Checkpoint**: `pnpm lint` passes with the new folder present (correct PascalCase file/folder naming).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extract the shared row chrome into `TokenBlock` and wire both `TreeTokenNode` branches to use it, reproducing **exactly** today's visuals/text (no label/heading/pill/icon/pin-line changes yet). This is the blocking dedup step every user story builds on — per spec.md FR-010/FR-011, a single shared component must back both rendering paths before story-specific behavior is layered on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 [P] Move token-row-specific CSS rules out of `apps/web-app/components/TokenTree/TokenTree.module.css` into `apps/web-app/components/TokenBlock/TokenBlock.module.css`: `.token`, `.name`, `.type`, `.nonStandard`, `.value`, `.field`, `.fieldLabel`, `.swatch`, `.colorIssues`. Leave only tree/group-owned rules (`.root`, `.children`, `.group`, `.toggle`) in `TokenTree.module.css`, per spec.md FR-013.
- [ ] T003 Implement `apps/web-app/components/TokenBlock/TokenBlock.tsx`'s body to render the same structure `TreeTokenNode`'s two branches currently render inline (name span, optional type span, a `children` slot for the editor/value content), using the classes moved in T002 — a pure structural move with no visual/text change yet.
- [ ] T004 [P] Update `TreeTokenNode`'s invalid/read-only branch (`apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx`, the `if (!isValid)` block) to render `<TokenBlock>` instead of its inline `<li>`/`<span>` JSX, passing `name={node.name}`, `type={effectiveType}`, `isNonStandardType={effectiveType !== undefined && !isUsableType}`, and the existing value/error markup as `children`.
- [ ] T005 [P] Update `TreeTokenNode`'s valid/editable branch (`apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx`, the final `return`) to render `<TokenBlock>` instead of its inline JSX, with the same prop wiring as T004 and the existing editor/description/error markup as `children`.
- [ ] T006 Run `pnpm --filter web-app test:unit` and `pnpm build` and confirm no failures — at this point every existing `TokenTree*.test.tsx` assertion should still pass unmodified, since no label text has changed yet, only structure/ownership.

**Checkpoint**: `TokenBlock` exists and both `TreeTokenNode` branches delegate to it; zero visual or text change; dedup achieved structurally. User story phases can now proceed in priority order.

---

## Phase 3: User Story 1 - Scan a token's identity at a glance (Priority: P1) 🎯 MVP

**Goal**: Every token row shows its name once, as a heading, with plain "Name"/"Type"/"Value"/"Description" field labels instead of repeating the token name, and its type shown as "Type:" plus a pill.

**Independent Test**: Open the token tree with several tokens in a group; for any one token, confirm its name appears once as a heading, and the field labels below it read "Name"/"Type"/etc. without repeating the token's name (spec.md User Story 1).

### Implementation for User Story 1

- [ ] T007 [US1] Add an `<h2>{name}</h2>` heading at the start of `TokenBlock`'s rendered markup in `apps/web-app/components/TokenBlock/TokenBlock.tsx` (spec.md FR-001, FR-003).
- [ ] T008 [US1] Replace the `"{name} name"` / `"{name} type"` / `"{name} value"` / `"{name} description"` field labels in `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` with plain `"Name"` / `"Type"` / `"Value"` / `"Description"` labels (spec.md FR-002).
- [ ] T009 [US1] Render the token type in `apps/web-app/components/TokenBlock/TokenBlock.tsx` as `"Type:"` followed by a `Badge`-based pill showing `type`, only when `type !== undefined` (spec.md FR-004).
- [ ] T010 [US1] Adjust `packages/design-system/src/components/Badge/Badge.css` sizing/weight as needed to match the "Type: `<Badge>`" pill presentation (spec.md FR-005, research.md §2) — keep `Badge`'s existing props/API unchanged, since it has no other consumers to break.
- [ ] T011 [US1] Preserve the existing "(non-standard)" indicator next to the type pill in `apps/web-app/components/TokenBlock/TokenBlock.tsx` when `isNonStandardType` is `true` (spec.md FR-014).
- [ ] T012 [P] [US1] Update the label-text assertions in `apps/web-app/components/TokenTree/TokenTree.test.tsx`, `TokenTree.a11y.test.tsx`, `TokenTree.override.test.tsx`, and `TokenTree.generic-editor.test.tsx` to match the new heading + plain-label + pill markup.
- [ ] T013 [P] [US1] Create `apps/web-app/components/TokenBlock/TokenBlock.test.tsx` covering: the heading renders `name` exactly once; no pill renders when `type` is `undefined`; a pill renders via `Badge` when `type` is set; the non-standard indicator shows when `isNonStandardType` is `true`; `children` renders unmodified.

**Checkpoint**: User Story 1 is fully functional and testable independently — every token row shows a heading once, plain field labels, and a "Type:" pill.

---

## Phase 4: User Story 2 - Distinguish tokens from groups, and consecutive tokens from each other (Priority: P2)

**Goal**: Each token row shows a type-based icon and its own left-hand pin line matching the group pin-line style, with a visible break between two consecutive tokens' pin lines.

**Independent Test**: Render a group with two or more sibling tokens; confirm each has its own pin line, a visible break separates adjacent tokens' pin lines, and each shows a type-appropriate (or fallback) icon (spec.md User Story 2).

### Implementation for User Story 2

- [ ] T014 [P] [US2] Create `apps/web-app/components/TokenBlock/token-type-icons.tsx`: an inline-SVG icon per `DtcgTokenType` (the 13 types from `@dtcg-editor/token-core`'s `DTCG_TOKEN_TYPES`) plus one fallback icon, per research.md §3.
- [ ] T015 [US2] Render the icon resolved via T014's lookup (falling back to the generic icon when `type` is `undefined` or not a recognized `DtcgTokenType`) next to the name heading in `apps/web-app/components/TokenBlock/TokenBlock.tsx` (spec.md FR-006, FR-007).
- [ ] T016 [US2] Add a left-hand pin line to `TokenBlock`'s wrapper element in `apps/web-app/components/TokenBlock/TokenBlock.module.css`, matching `TokenTree.module.css`'s existing `.children { border-left: ... }` group pin-line style (spec.md FR-008, research.md §4).
- [ ] T017 [US2] Add vertical spacing between sibling `TokenBlock` rows in `apps/web-app/components/TokenBlock/TokenBlock.module.css` so two consecutive tokens' pin-line segments read as visually separate rather than one continuous line (spec.md FR-009, research.md §4).
- [ ] T018 [P] [US2] Extend `apps/web-app/components/TokenBlock/TokenBlock.test.tsx` with cases: the correct icon renders for a recognized type; the fallback icon renders for a missing/unrecognized type; the pin-line wrapper element is present in the rendered output.

**Checkpoint**: User Stories 1 AND 2 both work independently — tokens now show icons and pin lines in addition to heading/labels/pill.

---

## Phase 5: User Story 3 - Consistent, reusable token-row building block (Priority: P3)

**Goal**: Confirm `TokenBlock` is a single, "dumb," fully-tested, reused presentational component — the structural outcome the Foundational phase already delivered, verified and hardened here.

**Independent Test**: Inspect `TreeTokenNode`'s two branches and confirm both delegate their shared chrome to the one `TokenBlock` component, which takes plain props and contains no editing/validation/state logic (spec.md User Story 3).

### Implementation for User Story 3

- [ ] T019 [US3] Review both branches of `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` and confirm no validation/editing/staging logic leaked into `apps/web-app/components/TokenBlock/TokenBlock.tsx` during T003–T017; move anything that did back into `TreeTokenNode` (spec.md FR-012, FR-015).
- [ ] T020 [US3] Confirm `apps/web-app/components/TokenTree/TokenTree.module.css` retains only tree/group-owned styles (`.root`, `.children`, `.group`, `.toggle`) with no leftover token-row-specific rules; remove any found (spec.md FR-013).
- [ ] T021 [P] [US3] Create `apps/web-app/components/TokenBlock/TokenBlock.a11y.test.tsx` (Vitest Browser Mode + `axe-core`) asserting zero WCAG 2.2 AA violations on `TokenBlock` in isolation, per constitution Principle X.
- [ ] T022 [US3] Run `pnpm --filter web-app test:a11y` (the Playwright whole-page suite) against the tokens page and fix any keyboard-navigation/accessibility regressions surfaced by the new heading/pill/icon/pin-line markup.

**Checkpoint**: All three user stories are independently functional; `TokenBlock` is a single, dumb, fully-tested, reused component with no duplicated chrome remaining in `TreeTokenNode`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-repo validation and documentation cleanup after all three stories land.

- [ ] T023 [P] Run `pnpm build && pnpm lint && pnpm test && pnpm format:check` at the repo root and fix any issues surfaced (quickstart.md §2).
- [ ] T024 Walk through quickstart.md §3's manual visual validation steps against `pnpm --filter web-app dev` and confirm every listed behavior (heading, plain labels, type pill, icon, pin-line break, no editing/staging regressions).
- [ ] T025 [P] Update the "5-path model" doc comment above `TreeTokenNode` in `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` if its description of the rendered markup is now stale after the `TokenBlock` extraction.

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
