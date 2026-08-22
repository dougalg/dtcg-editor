---
description: "Task list for the light/dark mode switcher feature"
---

# Tasks: Light/Dark Mode Switcher

**Input**: Design documents from `/specs/006-light-dark-toggle/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Included — Principle X of `.specify/memory/constitution.md` mandates unit + accessibility test coverage for every component, so tests are not optional for this feature.

**Organization**: Tasks are grouped by user story (spec.md's US1/US2/US3) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes exact file path(s)

## Path Conventions

Existing monorepo layout — `apps/web-app/` (Next.js app) and `packages/design-system/` (token pipeline + shared components). See plan.md's Project Structure for the full file tree this feature touches.

---

## Phase 1: Setup

**Purpose**: Prepare the icon source layout and the one new platform primitive the generalized sprite generator needs, before touching the generator itself.

- [x] T001 Move the 14 existing icon files and `NOTICE.md` from `apps/web-app/assets/icons/*.svg` into a new `apps/web-app/assets/icons/token-types/` subfolder (git `mv`, no content changes)
- [x] T002 [P] Vendor Lucide's `sun.svg` and `moon.svg` source markup into `apps/web-app/assets/icons/theme/sun.svg` and `apps/web-app/assets/icons/theme/moon.svg`, plus `apps/web-app/assets/icons/theme/NOTICE.md` attributing Lucide (ISC License, same format as `assets/icons/token-types/NOTICE.md`)
- [x] T003 [P] Add an injected, synchronous directory-listing function (`nodeReaddirSync`, real default backed by `fs.readdirSync(path, { withFileTypes: true })`) to `apps/web-app/lib/platform/node-fs.ts`, following the existing `nodeReadFileSync`/`nodeMkdirSync` pattern in that file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The generalized sprite pipeline and the CSS override mechanism — both required before any user-story UI can render correctly.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Rewrite `apps/web-app/scripts/generate-icon-sprite.ts` per `contracts/icon-sprite-generator.md`: replace the hardcoded `ICON_FILES` array with a scan (via `nodeReaddirSync`) of every subfolder under `assets/icons/`, generating `public/<sprite-name>-sprite.svg` (existing `<symbol>`-per-icon logic, id = `dtcg-ed-icon-<basename>`) and `apps/web-app/assets/generated/<sprite-name>-sprite.ids.ts` (a generated `as const` object mapping basename → symbol id) for each (depends on T001, T002, T003)
- [x] T005 [P] Update `apps/web-app/scripts/generate-icon-sprite.test.ts` to assert the generic, multi-sprite behavior: both `token-types-sprite.svg` and `theme-sprite.svg` are produced, each with well-formed XML, unique ids, and inherited presentation attributes (depends on T004)
- [x] T006 [P] Update `apps/web-app/assets/resolve-token-type-icon-id.ts` to source its `ICON_ID_BY_TYPE`/`FALLBACK_ICON_ID` string values from the generated `apps/web-app/assets/generated/token-types-sprite.ids.ts` instead of literal strings (depends on T004)
- [x] T007 [P] Update `apps/web-app/components/TokenBlock/TokenBlock.tsx` and `apps/web-app/components/TokenBlock/TokenBlock.test.tsx` to reference `/token-types-sprite.svg` instead of `/icon-sprite.svg` (depends on T004)
- [x] T008 [P] Update `apps/web-app/.gitignore`: replace the `/public/icon-sprite.svg` entry with `/public/*-sprite.svg`, and add `/apps/web-app/assets/generated/` (depends on T004)
- [x] T009 [P] Add a `[data-theme="dark"]` attribute-selector permutation to `packages/design-system/sugarcube.config.ts`'s `variables.permutations` array, plus `propagateDependents: true`. (Revised during implementation — dropped the originally-planned `@media (prefers-color-scheme: dark)` fallback and `[data-theme="light"]` override, both unworkable; JS is the sole source of truth for `data-theme`. See research.md §1.)
- [x] T010 Run `pnpm --filter @dtcg-editor/design-system build` and `pnpm --filter web-app generate:icons`; verify `dist/styles/tokens.css` contains the `[data-theme="dark"]` block and `public/token-types-sprite.svg` + `public/theme-sprite.svg` both exist with the expected symbol ids (depends on T004–T009)

**Checkpoint**: Sprite pipeline generalized and regression-safe; dark-mode CSS override selectors exist and build cleanly. User story implementation can now begin.

---

## Phase 3: User Story 1 - Follow system appearance by default (Priority: P1) 🎯 MVP

**Goal**: With no saved preference, the editor's appearance matches the OS light/dark setting on load, with the toggle visible (per FR-002) even though its click behavior isn't fully wired until US2.

**Independent Test**: With no stored preference, set the OS to dark, load the app, confirm dark appearance; repeat with light OS setting, confirm light appearance.

### Tests for User Story 1

- [x] T011 [P] [US1] Write `apps/web-app/hooks/useTheme.test.ts`: with no stored preference and an injected fake `matchMedia`, `theme` resolves to `"dark"` when the media query matches, `"light"` when it doesn't, and `"light"` when `matchMedia` itself is unavailable/throws
- [x] T012 [P] [US1] Write `apps/web-app/components/ThemeToggle/ThemeToggle.test.tsx`: renders the sun icon when `theme === "light"` and the moon icon when `theme === "dark"` (mock `useTheme`)
- [x] T013 [P] [US1] Write `apps/web-app/components/ThemeToggle/ThemeToggle.a11y.test.tsx`: zero `axe-core` violations; control exposes `role="switch"` and a correct `aria-checked`

### Implementation for User Story 1

- [x] T014 [US1] Implement `apps/web-app/hooks/useTheme.ts` per `contracts/use-theme-hook.md`. **Consolidated during implementation**: rather than a bare system-only v1 (deferring storage to T020), the hook was written complete in one pass — storage read/write, Zod validation, `fromThrowable`/`safeCall` wrapping, and the full `toggleTheme` transition table all landed here, since splitting one small hook's logic across three edits produced worse, harder-to-review diffs than the real engineering unit. T020/T025/T026 below are marked done against this same implementation rather than re-editing it. (depends on T011)
- [x] T015 [US1] Add an inline, synchronous FOUC-prevention `<script>` to `apps/web-app/app/layout.tsx`'s `<head>` (full: stored-preference-first, `matchMedia` fallback — see consolidation note on T014/T021), and `suppressHydrationWarning` on `<html>`. Constants shared with `useTheme.ts` via a new plain (non-`"use client"`) `hooks/theme-constants.ts` module, since a Server Component can't import real values out of a `"use client"` module. (depends on T014)
- [x] T016 [US1] Implement `apps/web-app/components/ThemeToggle/ThemeToggle.tsx` + `.module.css`: wraps the design-system `Switch`, sun/moon `<use>` icon (from `theme-sprite.svg` via generated `theme-sprite.ids.ts`) inside the thumb, `checked` bound to `theme === "dark"`, dynamic `aria-label`/`title` (T022's work folded in here for the same reason as T014). Also extended `Switch`/`Switch.css` in `packages/design-system` with an optional `thumbIcon` prop (it previously had no slot for thumb content) and fixed the checked-state pill color to a neutral light/dark swatch instead of the generic Switch's accent "activated" color, via `:global(.switch)`-composed overrides — needed once real cascade order was checked against the reference screenshots (see git history for the specificity note). (depends on T012, T013, T014)
- [x] T017 [US1] Mount `ThemeToggle` in `apps/web-app/app/layout.tsx`; added `@dtcg-editor/design-system/components/Switch/Switch.css` to `app/globals.css` (depends on T016)

**Checkpoint**: User Story 1 is fully functional and independently testable — the app's default appearance correctly follows the OS setting on every load.

---

## Phase 4: User Story 2 - Manually override the theme (Priority: P1)

**Goal**: Activating the toggle immediately and persistently switches the editor to the opposite appearance, regardless of OS setting, surviving reloads.

**Independent Test**: From either appearance, activate the toggle once; confirm immediate switch to the opposite appearance that survives a page reload.

### Tests for User Story 2

- [x] T018 [P] [US2] Extend `apps/web-app/hooks/useTheme.test.ts`: `toggleTheme()` sets an explicit stored preference opposite the current theme and persists it (injected fake storage); a stored preference is read back (Zod-validated) and takes priority over system preference; an injected storage read/write that throws is treated as absent, `theme` still resolves correctly (FR-011)
- [x] T019 [P] [US2] Extend `apps/web-app/components/ThemeToggle/ThemeToggle.test.tsx`: clicking calls `toggleTheme` and the rendered icon/`aria-checked` updates immediately to the opposite state

### Implementation for User Story 2

- [x] T020 [US2] — implemented as part of T014 (see consolidation note there): injected `getStoredTheme`/`setStoredTheme` (real defaults backed by `localStorage`), `safeCall`-wrapped (a `fromThrowable`-based helper covering both real and injected implementations, per the contract doc's revision), `z.enum(["light", "dark"]).optional()` validation on read, stored value preferred over system preference, `toggleTheme()` persists the opposite of current, `matchMedia` `change` listener gated on no-stored-preference (FR-007). (depends on T014, T018)
- [x] T021 [US2] — implemented as part of T015: the inline FOUC script checks the stored preference first, falling back to `matchMedia` only when absent/invalid. (depends on T020)
- [x] T022 [US2] — implemented as part of T016: `ThemeToggle`'s `aria-label`/`title` are the dynamic text from the reference screenshots, recomputed from `theme` every render. (depends on T020)

**Checkpoint**: User Stories 1 AND 2 both work independently — default-follows-OS and manual-override-with-persistence are both correct.

---

## Phase 5: User Story 3 - Return to following system appearance (Priority: P2)

**Goal**: A second toggle activation (in the direction that matches current system appearance) clears the override and resumes following the OS live; the preference also stays in sync across open tabs.

**Independent Test**: With an override active matching the opposite of system appearance, activate the toggle again; confirm it now shows system appearance and again tracks live OS changes.

### Tests for User Story 3

- [x] T023 [P] [US3] Extend `apps/web-app/hooks/useTheme.test.ts`: when the opposite of the current (overridden) theme equals the current system preference, `toggleTheme()` removes the stored preference rather than writing it, and `theme` then tracks subsequent injected `matchMedia` `change` events again
- [x] T024 [P] [US3] Extend `apps/web-app/hooks/useTheme.test.ts`: a `window` `storage` event (simulating another tab's write) updates `theme` to match the newly stored value

### Implementation for User Story 3

- [x] T025 [US3] — implemented as part of T014: `toggleTheme()` removes the stored key (`setStoredTheme(undefined)`) instead of writing it when the opposite-of-current equals the current system preference (FR-005). (depends on T020, T023)
- [x] T026 [US3] — implemented as part of T014: a `window` `storage` event listener re-reads the stored preference and updates `theme` when it changes in another tab. (depends on T020, T024)

**Checkpoint**: All three user stories are independently functional — the full two-state-button/three-state-model toggle described in spec.md works end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-app verification that only makes sense once every story is in place.

- [x] T027 [P] Added `apps/web-app/e2e/theme-toggle.spec.ts`: keyboard reachability + visible focus ring, `Space` toggles `aria-checked`/`data-theme`, dynamic accessible name, and zero WCAG 2.2 AA violations with the toggle visible (SC-005). All 9 e2e specs (existing + new) pass; no regression to the pre-existing keyboard-navigation flow from the toggle's fixed position intercepting the first Tab stop.
- [x] T028 [P] Walked through quickstart.md's scenarios via a real `next build && next start` + Playwright screenshots: default-follows-OS, manual override + persistence across a fresh render, tooltip/aria-label text, and the existing `TokenBlock` icon regression check (renamed sprite) — all confirmed visually and via the automated suites above. Cross-tab sync is covered by the `useTheme.test.ts` `storage`-event test rather than a literal two-tab manual check.
- [x] T029 `pnpm exec vitest run` (206/206 passed), `pnpm exec playwright test` (9/9 passed), `pnpm build` (typecheck + Next production build) all pass cleanly.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T002 and T003 can start immediately in parallel with T001.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational completion. US1 (Phase 3) should land first since US2 and US3 both extend the same `useTheme.ts`/`ThemeToggle.tsx` files US1 creates — they are not parallelizable across phases even though each phase is an independently *testable* increment.
- **Polish (Phase 6)**: Depends on US1 + US2 + US3 all being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories — the MVP slice.
- **User Story 2 (P1)**: Builds on the `useTheme.ts`/`ThemeToggle.tsx` files US1 creates, but is independently *testable* per its own acceptance scenarios once its tasks land.
- **User Story 3 (P2)**: Builds on the same files US1/US2 extend; independently testable per its own acceptance scenarios once its tasks land.

### Within Each User Story

- Tests are written first (T011–T013, T018–T019, T023–T024) and should fail before their corresponding implementation tasks.
- Hook logic before component wiring; component wiring before layout mounting.

### Parallel Opportunities

- T002 and T003 (Setup).
- T005, T006, T007, T008, T009 (Foundational, after T004).
- T011, T012, T013 (US1 tests, different files).
- T018, T019 (US2 tests, different files).
- T023, T024 (US3 tests, same file but independent `describe` blocks — treat as parallelizable authoring, sequential apply).
- T027, T028 (Polish, independent activities).

---

## Parallel Example: Foundational Phase

```bash
# After T004 (sprite generator rewrite) lands, these four can proceed together:
Task: "Update generate-icon-sprite.test.ts for generic multi-sprite behavior"
Task: "Update resolve-token-type-icon-id.ts to source ids from generated mapping"
Task: "Update TokenBlock.tsx + TokenBlock.test.tsx sprite reference"
Task: "Update apps/web-app/.gitignore for generalized generated paths"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: confirm the app's default appearance correctly follows the OS setting on load (toggle is visible but not yet required to be clickable)
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → sprite pipeline and CSS override mechanism ready
2. User Story 1 → validate independently → MVP (system-following default)
3. User Story 2 → validate independently → manual override with persistence
4. User Story 3 → validate independently → full three-state model, cross-tab sync
5. Polish → keyboard/whole-page a11y coverage, quickstart walkthrough, full test/build pass

### Suggested MVP Scope

User Story 1 alone (T001–T017) is a legitimate, demoable MVP: correct default appearance, zero FOUC, toggle visible. User Story 2 (adding the interactive override) is very likely wanted in the same release, since both are P1 in spec.md — but the checkpoint after T017 is where a scope cut could happen if needed.
