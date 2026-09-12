---
description: "Task list for Duration Token Support (011)"
---

# Tasks: Duration Token Support

**Input**: Design documents from `/specs/011-duration-token-support/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: MANDATORY — Constitution Principle XIII (Test-Driven Development, NON-NEGOTIABLE) requires every behavior change be driven by a test observed failing first. `speckit-implement`'s `before_implement` hook (`speckit-tdd-run`) drives this loop; this file still lists a test task before each implementation task it covers, per that principle's ordering requirement.

**Organization**: Tasks are grouped by user story (spec.md P1/P2/P3), following the existing `token-editor-dimension`/`token-editor-color` precedents almost directly.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Create `packages/token-editor-duration/` package skeleton (`package.json`, `tsconfig.json`, `src/css-modules.d.ts`, `src/vitest-env.d.ts`, `vitest.setup.ts`, `vitest-a11y-tags.ts`) mirroring `packages/token-editor-dimension`'s equivalents exactly (dependency list unchanged, package name `@dtcg-editor/token-editor-duration`)
- [ ] T002 [P] Add `packages/token-editor-duration` to the `packages` array in `vitest.config.mts`
- [ ] T003 Run `pnpm install` so the new workspace package is linked

**Checkpoint**: Package scaffolding exists and installs cleanly; no source code yet.

---

## Phase 2: Foundational — `token-core` duration schema (blocks all user stories)

**Purpose**: The `DurationValue`/`DurationValueSchema` that every user story's editor/preview code needs.

- [ ] T004 [U1][U2][U3][U4][U5][U6] Write failing tests in `packages/token-core/src/duration.test.ts` (node:test): accepts `{value:200,unit:"ms"}` [U1], accepts `{value:0,unit:"s"}` [U2], rejects negative `value` [U3], rejects unrecognized `unit` [U4], rejects missing `unit` [U5], rejects non-numeric `value` [U6] — confirm red (schema doesn't exist yet)
- [ ] T005 [U1][U2][U3][U4][U5][U6] Implement `DurationValueSchema`/`DurationValue` in `packages/token-core/src/duration.ts` (`z.object({ value: z.number().min(0), unit: z.enum(["ms","s"]) })`) — confirm T004 goes green
- [ ] T006 Export `DurationValue`/`DurationValueSchema` from `packages/token-core/src/index.ts`

**Checkpoint**: `node --test packages/token-core/src/duration.test.ts` passes. Foundation ready for editor/preview work.

---

## Phase 3: User Story 1 - Edit a duration token's value and unit (Priority: P1) 🎯 MVP

**Goal**: A dedicated `DurationEditor` replaces the JSON-textarea fallback for `duration` tokens.

**Independent Test**: Render `DurationEditor` with a `DurationValue`, confirm the number input and unit select show current state, and confirm editing each calls `onChange` with the updated value (per `TokenTypeEditorProps<DurationValue>`).

### Tests for User Story 1 ⚠️ (write first, confirm red)

- [ ] T007 [P] [US1] [U7][U8][U9][U10][U11][U12] Write failing tests in `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.test.tsx`: renders current value/unit [U7]; unit select offers exactly `["ms","s"]` [U8]; editing the numeric value calls `onChange` with value updated, unit preserved [U9]; a non-numeric value input is rejected by the number input, reporting `0` [U10]; changing the unit calls `onChange` with unit updated, value preserved [U11]; a negative numeric input is rejected (per FR-003's `>= 0` constraint — the editor MUST NOT call `onChange` with a negative value; e.g. clamp to `0` or ignore the change, either way `onChange` never receives `value < 0`) [U12]
- [ ] T008 [P] [US1] [U13][U14] Write failing tests in `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.a11y.test.tsx`: zero WCAG 2.2 AA violations for an `ms` value [U13] and for an `s` value [U14] (mirrors `DimensionEditor.a11y.test.tsx`)

### Implementation for User Story 1

- [ ] T009 [US1] [U7][U8][U9][U10][U11][U12] Implement `DurationEditor` in `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.tsx` (mirrors `DimensionEditor.tsx`; `UNITS = ["ms","s"] as const`; numeric `onChange` handler additionally guards `next < 0` so an invalid/negative edit never propagates, satisfying T007's negative-value case) — confirm T007/T008 go green
- [ ] T010 [P] [US1] Add `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.module.css` (copy `DimensionEditor.module.css`'s `--dtcg-ed-*`-token layout verbatim)
- [ ] T011 [US1] Create `packages/token-editor-duration/src/token-type.ts` exporting `durationTokenType: TokenTypeContract<DurationValue>` (`type: "duration"`, `valueSchema: DurationValueSchema`, `serializeValue: (value) => value`, `Editor: DurationEditor` — `Preview` added in User Story 2) — completes [U20]
- [ ] T012 [US1] Create `packages/token-editor-duration/src/index.ts` exporting `DurationEditor` and `durationTokenType`
- [ ] T012a [US1] [A1][A2][A3] Confirm A1/A2/A3 (outer-loop acceptance behaviors for US1) are green via T007's existing assertions — no separate acceptance-level test file, per `tdd/test-list.md`'s note that the component-export boundary is this feature's real entry point

**Checkpoint**: `DurationEditor` is fully functional and independently testable; `durationTokenType` exists but has no `Preview` yet.

---

## Phase 4: User Story 2 - See a readable preview of a duration token (Priority: P2)

**Goal**: A `DurationPreview` renders a resolved duration value as short text (e.g. `200ms`), mirroring `ColorPreview`.

**Independent Test**: Render `DurationPreview` with a raw `unknown` value; confirm a valid duration value renders `<number><unit>` text and an invalid one renders nothing (`null`).

### Tests for User Story 2 ⚠️ (write first, confirm red)

- [ ] T013 [P] [US2] [U15][U16][U17][U18] Write failing tests in `packages/token-editor-duration/src/components/DurationPreview/DurationPreview.test.tsx`: `{value:200,unit:"ms"}` renders text `"200ms"` [U15]; `{value:1,unit:"s"}` renders text `"1s"` [U16]; `{value:1.5,unit:"s"}` renders text `"1.5s"` [U17]; an invalid value (e.g. `{not:"a duration"}`) renders nothing (`container.firstChild` is `null`) [U18]
- [ ] T014 [P] [US2] [U19] Write failing tests in `packages/token-editor-duration/src/components/DurationPreview/DurationPreview.a11y.test.tsx`: zero WCAG 2.2 AA violations for a rendered preview (mirrors `ColorPreview.a11y.test.tsx`)

### Implementation for User Story 2

- [ ] T015 [US2] [U15][U16][U17][U18][U19] Implement `DurationPreview` in `packages/token-editor-duration/src/components/DurationPreview/DurationPreview.tsx` (mirrors `ColorPreview.tsx`: `DurationValueSchema.safeParse(value)`, return `null` on failure, else render `` `${parsed.data.value}${parsed.data.unit}` `` in a `<span>`) — confirm T013/T014 go green
- [ ] T016 [P] [US2] Add `packages/token-editor-duration/src/components/DurationPreview/DurationPreview.module.css` (copy `ColorPreview.module.css`'s `--dtcg-ed-font-mono` text styling)
- [ ] T017 [US2] [U20] Wire `Preview: DurationPreview` into `durationTokenType` in `packages/token-editor-duration/src/token-type.ts`
- [ ] T018 [US2] Export `DurationPreview` from `packages/token-editor-duration/src/index.ts`
- [ ] T018a [US2] [A4][A5] Confirm A4/A5 (outer-loop acceptance behaviors for US2) are green via T013's existing assertions

**Checkpoint**: `durationTokenType` now has both `Editor` and `Preview`; both are independently testable and functional.

---

## Phase 5: User Story 3 - Duration tokens are recognized as a first-class supported type (Priority: P3)

**Goal**: `duration` is registered as a built-in type in the web app, on par with `dimension`/`color`.

**Independent Test**: Confirm `BUILT_IN_TOKEN_TYPES` includes `"duration"` and `resolveBuiltInContract("duration")` returns `durationTokenType`.

### Tests for User Story 3 ⚠️ (write first, confirm red)

- [ ] T019pre [US3] [U21][U22] Add `apps/web-app`'s workspace dependency first (`pnpm add @dtcg-editor/token-editor-duration --workspace --filter @dtcg-editor/web-app`, per CLAUDE.md — never hand-edit `package.json`), then write failing tests in `apps/web-app/lib/token-editors/built-in.test.ts` (new, or extend an existing registry test if one already asserts this list — search for one referencing `"dimension"`/`"color"`): `BUILT_IN_TOKEN_TYPES` includes `"duration"` [U21]; `resolveBuiltInContract("duration")` returns a contract with `type: "duration"` [U22] — confirm red (registration doesn't exist yet)

### Implementation for User Story 3

- [ ] T019 [US3] [U21][U22][A6][A7] Register `duration` in `apps/web-app/lib/token-editors/built-in.ts`: import `durationTokenType` from `@dtcg-editor/token-editor-duration`, add `"duration"` to `BUILT_IN_TOKEN_TYPES`, add the `duration: durationTokenType as unknown as TokenTypeContract<unknown>` entry to `builtInContractsByType` — confirm T019pre goes green (covers A6); A7 (round-trip fidelity) is already covered by `token-core`'s existing type-agnostic round-trip fixture tests once `duration` is a recognized `DtcgTokenType` (already true — see `token-types.ts`)

**Checkpoint**: `duration` tokens are indistinguishable from other built-in types anywhere the app enumerates or validates token types.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T022 [P] Add `packages/token-editor-duration/src/components/DurationEditor/DurationEditor.stories.tsx` (mirrors `DimensionEditor.stories.tsx`, `Milliseconds`/`Seconds` stories)
- [ ] T023 Run `pnpm build` and `pnpm test` (full monorepo) and fix any fallout
- [ ] T024 Walk through `quickstart.md` manually (or via Playwright if an existing e2e suite covers token editing) to confirm end-to-end behavior in the running web app
- [ ] T025 Run `speckit-tdd-verify`'s deliberate-mutant spot check on `DurationEditor`'s negative-value guard and `DurationPreview`'s parse-failure branch (no mutation tool configured — see `.specify/memory/tdd-profile.md`), recording evidence in `specs/011-duration-token-support/tdd/cycle-log.md`

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → User Stories in priority order (Phase 3 → 4 → 5), since Phase 5 registers the `durationTokenType` Phase 4 completes (Preview) — while US1 alone is a viable MVP (editor works, no preview yet, not yet registered), US3's registration task depends on both Editor and Preview existing so the registered contract is complete. **Polish (Phase 6)** last.
- Within each story: tests before implementation, confirmed red before the paired implementation task is started (Constitution Principle XIII).

## Parallel Example: User Story 1

```text
Task: "Write failing tests in DurationEditor.test.tsx" (T007)
Task: "Write failing tests in DurationEditor.a11y.test.tsx" (T008)
# both can run in parallel — different files, no interdependency
```

## Implementation Strategy

**MVP**: Phases 1–3 (Setup, Foundational, US1) deliver a working `DurationEditor` component, independently testable, before any preview or registration work exists.

**Incremental delivery**: US1 → US2 (adds Preview) → US3 (registers in the web app, making the whole feature reachable end-to-end) → Polish.
