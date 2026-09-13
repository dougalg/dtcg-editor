---
description: "Task list for strokeStyle token editor support"
---

# Tasks: Stroke Style Token Editor Support

**Input**: Design documents from `specs/012-stroke-style-token-support/`

**Tests**: Required — Principle XIII (TDD, NON-NEGOTIABLE). Every behavioral task below carries
the `tdd/test-list.md` behavior id(s) it covers.

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create package scaffold `packages/token-editor-stroke-style/` (package.json,
      tsconfig.json, vitest.setup.ts, vitest-a11y-tags.ts, src/css-modules.d.ts,
      src/vitest-env.d.ts), mirroring `packages/token-editor-font-weight`'s equivalent files
      (package name `@dtcg-editor/token-editor-stroke-style`, plus a
      `@dtcg-editor/design-system` dependency for the mode-switch/pickers)
- [X] T002 Run `pnpm install` so the new workspace package and its dependencies are linked
- [X] T003 [P] Add `"packages/token-editor-stroke-style"` to `vitest.config.mts`'s `packages`
      array

**Checkpoint**: package scaffold exists and is wired into the workspace/test runner.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T004 [U1-U16] Write failing `node:test` cases in `packages/token-core/src/stroke-style.test.ts`
      for `StrokeStyleValueSchema`: accepts each of the 8 named-style keywords; rejects an
      unrecognized keyword; accepts a well-formed `{ dashArray, lineCap }` object; accepts an
      empty `dashArray`; rejects a malformed `dashArray` entry (missing unit); rejects an invalid
      `dashArray` entry unit; rejects an invalid `lineCap`; rejects a missing `lineCap`; rejects a
      non-string/non-object shape. Run it, confirm it fails (module doesn't exist), and record
      the observed red in `tdd/cycle-log.md`
- [X] T005 [U1-U16] Implement `StrokeStyleValueSchema`/`StrokeStyleValue` in
      `packages/token-core/src/stroke-style.ts` (`z.union([z.enum([...8 keywords]),
      z.object({ dashArray: z.array(DimensionValueSchema), lineCap: z.enum([...]) })])`,
      importing `DimensionValueSchema` from `./dimension.ts`) — smallest change to make T004
      pass, run the full `token-core` suite, confirm green
- [X] T006 Export `StrokeStyleValueSchema`/`StrokeStyleValue` from `packages/token-core/src/index.ts`

**Checkpoint**: `token-core`'s strokeStyle schema is implemented, tested, and exported.

---

## Phase 3: User Story 1 - Edit a strokeStyle token's value (Priority: P1)

### Tests for User Story 1 (write first, run, confirm failing, only then implement)

- [X] T007 [US1] [U17-U27] Write failing tests in `StrokeStyleEditor.test.tsx`: named-style mode
      selected + current keyword shown; all 8 keywords offered; selecting a different keyword
      calls `onChange`; custom-dash-pattern mode selected with entries/lineCap shown; switching
      to custom mode calls `onChange` with a default dash object; switching to named mode calls
      `onChange` with `"solid"`; editing a dash segment's value/unit calls `onChange` with the
      updated array; changing lineCap calls `onChange`; adding/removing a segment calls
      `onChange`; a non-numeric dash value does not call `onChange`. Run against the
      not-yet-created component and confirm it fails
- [X] T008 [US1] [U28] Write failing tests in `StrokeStyleEditor.a11y.test.tsx`: zero WCAG 2.2 AA
      violations for both modes. Run and confirm it fails
- [X] T009 [US1] Record the observed red in `tdd/cycle-log.md`

### Implementation for User Story 1

- [X] T010 [US1] [U17-U28] Implement `StrokeStyleEditor` in `StrokeStyleEditor.tsx`: a
      design-system `RadioGroup` mode toggle (named / custom-dash-pattern), a `Select` of the 8
      keywords in named mode, and in custom mode a dynamic list of dash-segment rows (number
      input + unit `Select`, add/remove) plus a line-cap `Select` — smallest change to make
      T007/T008 pass, confirm green
- [X] T011 [US1] Add `StrokeStyleEditor.module.css` styled only with `--dtcg-ed-*` custom
      properties
- [X] T012 [US1] Create `packages/token-editor-stroke-style/src/token-type.ts` exporting
      `strokeStyleTokenType: TokenTypeContract<StrokeStyleValue>` (Editor only; Preview added in
      Phase 4)
- [X] T013 [US1] Create `packages/token-editor-stroke-style/src/index.ts`
- [X] T014 [US1] [A1] Extend `apps/web-app/lib/token-editors/built-in.test.ts`'s
      `BUILT_IN_TOKEN_TYPES` assertion to also expect `"strokeStyle"`. Run and confirm it fails
- [X] T015 [US1] [A1] Register `"strokeStyle"` in `built-in.ts`
      (`BUILT_IN_TOKEN_TYPES`/`builtInContractsByType`) and add
      `"@dtcg-editor/token-editor-stroke-style": "workspace:*"` to `apps/web-app/package.json`
      via `pnpm add` — smallest change to make T014 pass
- [X] T016 [US1] Run `pnpm build` and fix any TypeScript errors (fixed a strict-mode error in
      `StrokeStyleEditor.test.tsx`'s tuple-destructure of a possibly-undefined mock call, and an
      a11y lint violation from wrapping design-system `Select`/`RadioGroupItem` in a `<label>` —
      switched those wrappers to plain `<span>`s with `aria-label` on the control, matching
      `ColorSpaceSelect`'s precedent)

**Checkpoint**: A `strokeStyle` token opened in the web app shows `StrokeStyleEditor`, not the
JSON fallback.

---

## Phase 4: User Story 2 - See a readable preview (Priority: P2)

### Tests for User Story 2 (write first, run, confirm failing, only then implement)

- [X] T017 [US2] [U29-U31] Write failing tests in `StrokeStylePreview.test.tsx`: renders a
      named-style value as its keyword text; renders a custom value as `"dashed (<lineCap>)"`;
      declines to render (`null`) for a value that fails schema validation
- [X] T018 [US2] [U32] Write failing tests in `StrokeStylePreview.a11y.test.tsx`: zero WCAG 2.2
      AA violations for both forms
- [X] T019 [US2] Record the observed red in `tdd/cycle-log.md`

### Implementation for User Story 2

- [X] T020 [US2] Implement `StrokeStylePreview` in `StrokeStylePreview.tsx`:
      `StrokeStyleValueSchema.safeParse`, `null` on failure, else render the keyword or the
      `"dashed (<lineCap>)"` summary
- [X] T021 [US2] Add `StrokeStylePreview.module.css` (`--dtcg-ed-font-mono`, matching
      `ColorPreview`/`FontWeightPreview`)
- [X] T022 [US2] Wire `Preview: StrokeStylePreview` into `strokeStyleTokenType`
- [X] T023 [US2] Export `StrokeStylePreview` from `index.ts`
- [X] T024 [US2] Run `pnpm build` and fix any TypeScript errors

**Checkpoint**: `strokeStyle` tokens show a readable preview for both value forms.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T025 [P] Add `StrokeStyleEditor.stories.tsx` (Storybook), with a Named and a
      CustomDashPattern story; add the package to `turbo.json`'s `//#storybook`/`//#build-storybook`
      `dependsOn` lists
- [X] T026 Run `pnpm build` (whole-repo Turbo build) — clean
- [X] T027 Run `pnpm exec vitest run` (whole repo) and `pnpm --filter @dtcg-editor/token-core test`
      — both fully green (781/781 and 147/147 respectively at completion)
- [X] T028 Run `pnpm lint`, `pnpm lint:filenames`, and `pnpm format:check` — all clean
- [X] T029 [A1-A8] Manually cross-check every Acceptance Scenario in `spec.md` against the
      component-render test coverage (this package has no dedicated Playwright acceptance layer,
      matching every other `token-editor-*` package's precedent)

---

## Dependencies & Execution Order

Setup → Foundational (blocks all user stories) → User Story 1 → User Story 2 (extends
`token-type.ts` from US1) → Polish.
