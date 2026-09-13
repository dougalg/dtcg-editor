# Tasks: Border Token Support

**Input**: Design documents from `/specs/013-border-token-support/`

**Prerequisites**: plan.md, spec.md

**Tests**: MANDATORY — Constitution Principle XIII (TDD, NON-NEGOTIABLE) requires
every behavior be driven by a test observed failing first. `speckit-tdd-plan`
MUST run before implementation begins; the red-green-refactor cycle for each
task below is recorded in `tdd/cycle-log.md`.

**Organization**: Tasks are grouped by user story (spec.md P1/P2/P1) to enable
independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Scaffold `packages/token-editor-border` package skeleton
      (`package.json`, `tsconfig.json`, `vitest.setup.ts`,
      `vitest-a11y-tags.ts`, `src/css-modules.d.ts`, `src/vitest-env.d.ts`),
      copying the exact structure of `packages/token-editor-dimension`, with
      `dependencies` on `@dtcg-editor/token-core`,
      `@dtcg-editor/token-editor-contract`, `@dtcg-editor/token-editor-color`,
      `@dtcg-editor/token-editor-dimension`,
      `@dtcg-editor/token-editor-stroke-style` (all `workspace:*`), added via
      `pnpm add <pkg>@workspace:* --filter @dtcg-editor/token-editor-border`
      per CLAUDE.md's pnpm rule, not hand-edited.
- [ ] T002 [P] Add `packages/token-editor-border` to the `packages` array in
      `vitest.config.mts` (both `unitProject`/`a11yProject` are generated from
      that one array) so its Vitest projects run in the aggregated suite.
- [ ] T003 [P] Run `pnpm install` at the repo root to link the new package
      and its new workspace dependencies.

**Checkpoint**: Package scaffold exists, builds as an empty shell, is wired
into the root Vitest config.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `BorderValueSchema` in `token-core` that every user story's
Editor/Preview/contract depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Write failing tests for `BorderValueSchema` in
      `packages/token-core/src/border.test.ts` (`node:test` +
      `node:assert/strict`, mirroring `dimension.test.ts`'s style): accepts a
      valid `{ color, width, style }` object (color as full object form,
      color as legacy hex string, style as named keyword, style as custom
      dash-pattern object); rejects a value missing `color`/`width`/`style`;
      rejects a value whose `width` is not a valid `DimensionValue`; rejects
      a value whose `color` is not a valid `ColorValue`; rejects a value
      whose `style` is not a valid `StrokeStyleValue`. Confirm these fail
      first (no `border.ts` module exists yet) and log the red in
      `specs/013-border-token-support/tdd/cycle-log.md`.
- [ ] T005 Implement `BorderValueSchema`/`BorderValue` in
      `packages/token-core/src/border.ts` as
      `z.object({ color: ColorValueSchema, width: DimensionValueSchema, style: StrokeStyleValueSchema })`,
      importing the three schemas from their existing sibling modules
      (`./color.ts`, `./dimension.ts`, `./stroke-style.ts`) — no redefinition
      of any sub-schema. Confirm T004's tests now pass; log the green in
      `tdd/cycle-log.md`.
- [ ] T006 Export `BorderValue`/`BorderValueSchema` from
      `packages/token-core/src/index.ts`, alongside the existing exports for
      the other value schemas.

**Checkpoint**: `BorderValueSchema` is implemented, tested, and exported —
every subsequent phase can import it.

---

## Phase 3: User Story 1 - Author edits a border token's three sub-values (Priority: P1) 🎯 MVP

**Goal**: A `BorderEditor` component renders the embedded `ColorEditor`/
`DimensionEditor`/`StrokeStyleEditor`, each wired so changing one sub-field
leaves the other two untouched.

**Independent Test**: Render `BorderEditor` with a known `BorderValue`,
change only one embedded control, assert only that sub-field changed in the
emitted `onChange` value.

### Tests for User Story 1 ⚠️

> Write these tests FIRST; observe them fail (no `BorderEditor.tsx` exists
> yet) before implementing; log each red in `tdd/cycle-log.md`.

- [ ] T007 [P] [US1] Write failing tests in
      `packages/token-editor-border/src/components/BorderEditor/BorderEditor.test.tsx`
      (Vitest + `@testing-library/react`, mirroring
      `DimensionEditor.test.tsx`'s style) asserting: it renders the embedded
      `ColorEditor`, `DimensionEditor`, and `StrokeStyleEditor` with the
      corresponding sub-field's current value; changing the width control
      calls `onChange` with `{ ...value, width: <new> }` and `color`/`style`
      unchanged (deep-equal to originals); changing the color control calls
      `onChange` with only `color` changed; changing the style control calls
      `onChange` with only `style` changed; it works when `style` is the
      custom dash-pattern object form, not just a named keyword.
- [ ] T008 [P] [US1] Write failing a11y test in
      `packages/token-editor-border/src/components/BorderEditor/BorderEditor.a11y.test.tsx`
      (Vitest Browser Mode + `axe-core`, mirroring
      `DimensionEditor.a11y.test.tsx`) asserting zero WCAG 2.2 AA violations
      for a `BorderEditor` rendered with a representative `BorderValue`.

### Implementation for User Story 1

- [ ] T009 [US1] Implement `BorderEditor` in
      `packages/token-editor-border/src/components/BorderEditor/BorderEditor.tsx`:
      accepts `TokenTypeEditorProps<BorderValue>`; renders
      `<ColorEditor value={value.color} onChange={(color) => onChange({ ...value, color })} />`,
      `<DimensionEditor value={value.width} onChange={(width) => onChange({ ...value, width })} />`,
      and `<StrokeStyleEditor value={value.style} onChange={(style) => onChange({ ...value, style })} />`
      inside a labeled layout wrapper (own judgment on row vs. column, per
      spec.md's Assumptions — a `<span>`/flex row matching sibling
      `styles.container` precedent is the default choice unless it proves
      visually cramped). Confirm T007/T008 now pass; log green in
      `tdd/cycle-log.md`.
- [ ] T010 [US1] Add `packages/token-editor-border/src/components/BorderEditor/BorderEditor.module.css`
      with layout-only rules (spacing between the three embedded editors),
      sourcing all values from `--dtcg-ed-*` custom properties per
      Constitution Principle XII — no hardcoded spacing/color/border values.
- [ ] T011 [P] [US1] Add
      `packages/token-editor-border/src/components/BorderEditor/BorderEditor.stories.tsx`
      (Storybook), mirroring `DimensionEditor.stories.tsx`'s pattern, with at
      least one story using the named-keyword `style` form and one using the
      custom dash-pattern form.

**Checkpoint**: `BorderEditor` is fully functional and independently
testable — a border token's value can be edited via all three embedded
sub-controls with no cross-field clobbering.

---

## Phase 4: User Story 2 - Author sees a compact preview of a resolved border reference (Priority: P2)

**Goal**: `BorderPreview` renders a compact one-line summary of a resolved
border value, embedding `ColorPreview` for the swatch, and declines to
render for any value that doesn't match the full border shape.

**Independent Test**: Render `BorderPreview` with a valid `BorderValue` and
with several invalid/partial shapes; assert the valid case renders one
compact inline unit and every invalid case renders nothing.

### Tests for User Story 2 ⚠️

> Write these tests FIRST; observe them fail (no `BorderPreview.tsx` exists
> yet) before implementing; log each red in `tdd/cycle-log.md`.

- [ ] T012 [P] [US2] Write failing tests in
      `packages/token-editor-border/src/components/BorderPreview/BorderPreview.test.tsx`
      (mirroring `DimensionPreview.test.tsx`/`ColorPreview.test.tsx`'s
      validate-then-render style) asserting: renders width/style text plus
      an embedded `ColorPreview` for a valid border value; renders the
      custom dash-pattern `style` form's short summary correctly; declines
      (renders nothing / `container.firstChild` is `null`) for a value
      missing one of `color`/`width`/`style`; declines for a value whose
      `width` sub-value is invalid (e.g. a string instead of
      `{ value, unit }`) even though `color`/`style` are valid; declines for
      a completely unrelated shape (e.g. a plain number).
- [ ] T013 [P] [US2] Write failing a11y test in
      `packages/token-editor-border/src/components/BorderPreview/BorderPreview.a11y.test.tsx`
      asserting zero WCAG 2.2 AA violations for `BorderPreview` rendered with
      a representative valid `BorderValue`.

### Implementation for User Story 2

- [ ] T014 [US2] Implement `BorderPreview` in
      `packages/token-editor-border/src/components/BorderPreview/BorderPreview.tsx`:
      accepts `{ value: unknown }`; validates via `BorderValueSchema` from
      `@dtcg-editor/token-core` and returns `null` on failure (matching
      `DimensionPreview`/`ColorPreview`'s decline pattern); on success,
      renders one compact inline unit — e.g.
      `<ColorPreview value={parsed.data.color} />` followed by short text
      for width (`"1px"`) and style (reusing `StrokeStylePreview`'s summary
      logic for the custom dash-pattern case, or embedding
      `StrokeStylePreview` directly if that composes cleanly — implementer's
      call per plan.md's embedding-where-reasonable guidance), all inside a
      `<span>` so it lays out as one line. Confirm T012/T013 now pass; log
      green in `tdd/cycle-log.md`.
- [ ] T015 [US2] Add
      `packages/token-editor-border/src/components/BorderPreview/BorderPreview.module.css`
      with layout-only rules (inline-flex/gap for the swatch+text), sourcing
      spacing from `--dtcg-ed-*` custom properties per Principle XII.

**Checkpoint**: `BorderPreview` renders compactly and declines correctly on
every malformed-input edge case from spec.md.

---

## Phase 5: User Story 3 - Border token type is available in the token type registry (Priority: P1)

**Goal**: `border` is wired into `borderTokenType: TokenTypeContract<BorderValue>`
and registered as a built-in type in the web app, so `$type: "border"` tokens
use the dedicated editor/preview automatically.

**Independent Test**: Load a token document containing a valid `border`-typed
token in the app and confirm the dedicated `BorderEditor` renders (not the
generic/JSON fallback).

### Tests for User Story 3 ⚠️

> Write these tests FIRST where a test is practical; observe them fail before
> implementing; log each red in `tdd/cycle-log.md`.

- [ ] T016 [P] [US3] Write a failing unit test (co-located, e.g.
      `packages/token-editor-border/src/token-type.test.ts` using
      `node:test`, mirroring how sibling contracts are exercised via
      `validateTokenValue` in `token-editor-contract`'s own tests) asserting
      `borderTokenType.type === "border"`, `borderTokenType.valueSchema` is
      `BorderValueSchema` (accepts/rejects the same fixtures as T004),
      `serializeValue` round-trips a `BorderValue` unchanged (identity), and
      `Editor`/`Preview` are the `BorderEditor`/`BorderPreview` functions.

### Implementation for User Story 3

- [ ] T017 [US3] Implement `borderTokenType` in
      `packages/token-editor-border/src/token-type.ts`
      (`TokenTypeContract<BorderValue>`, mirroring
      `token-editor-dimension/src/token-type.ts`): `type: "border"`,
      `valueSchema: BorderValueSchema` (imported from
      `@dtcg-editor/token-core`), `serializeValue: (value) => value`,
      `Editor: BorderEditor`, `Preview: BorderPreview`. Confirm T016 now
      passes; log green in `tdd/cycle-log.md`.
- [ ] T018 [US3] Export `BorderEditor`, `BorderPreview`, and
      `borderTokenType` from `packages/token-editor-border/src/index.ts`,
      mirroring `token-editor-dimension/src/index.ts`'s export shape.
- [ ] T019 [US3] Register `border` in
      `apps/web-app/lib/token-editors/built-in.ts`: add `"border"` to
      `BUILT_IN_TOKEN_TYPES`, import `borderTokenType` from
      `@dtcg-editor/token-editor-border`, and add the
      `border: borderTokenType as unknown as TokenTypeContract<unknown>`
      entry (with the same "same safety argument as dimension above" comment
      style already used for every other entry) to
      `builtInContractsByType`. **Note**: this file is being concurrently
      edited by sibling agents for the `number` and `transition` types —
      expect a merge conflict on rebase; resolve by keeping all three
      additions (this feature's `border` entry plus theirs), not by
      discarding either side.
- [ ] T020 [US3] Add `@dtcg-editor/token-editor-border` as a `workspace:*`
      dependency of `apps/web-app` via
      `pnpm add @dtcg-editor/token-editor-border@workspace:* --filter @dtcg-editor/web-app`
      (per CLAUDE.md's pnpm rule) if not already resolvable through the
      workspace.

**Checkpoint**: All three user stories are complete; a `border`-typed token
in a real token file renders the dedicated editor end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T021 [P] Run `pnpm build` at the repo root (the sole type-checking
      gate per the constitution) and fix any type errors surfaced by the new
      package or the `built-in.ts` edit.
- [ ] T022 [P] Run `pnpm lint` (Biome + `@ls-lint/ls-lint`) and fix any
      findings in the new package.
- [ ] T023 Run the full suite (`pnpm test`) and confirm it passes, including
      the new `packages/token-editor-border` Vitest unit + a11y projects and
      `packages/token-core`'s `node --test` suite.
- [ ] T024 Run `speckit-tdd-verify` (or the manual deliberate-mutant spot
      check per `.specify/memory/tdd-profile.md`, since this repo has no
      mutation-testing tool configured) against the changed files in this
      feature and record the result in
      `specs/013-border-token-support/tdd/verification.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user
  stories (every story's Editor/Preview/contract imports `BorderValueSchema`).
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational. Independent of US1,
  though `BorderEditor` and `BorderPreview` share no code, so both can
  proceed in parallel once Phase 2 is done.
- **User Story 3 (Phase 5)**: Depends on US1 and US2 both being implemented
  (the contract wires their concrete `Editor`/`Preview` together) — NOT
  independent of US1/US2, unlike a typical spec-kit feature, because a
  composite type's registration step needs both halves to exist first.
- **Polish (Phase 6)**: Depends on all prior phases.

### Parallel Opportunities

- T002/T003 can run in parallel with each other (not with T001).
- T007/T008 (US1 tests) can be written in parallel with T012/T013 (US2
  tests) — different files, both only need Phase 2's `BorderValueSchema`.
- T009 (BorderEditor impl) and T014 (BorderPreview impl) can proceed in
  parallel once their respective tests are red.
- T021/T022 can run in parallel.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational (`BorderValueSchema`).
3. Phase 3: User Story 1 (`BorderEditor`) — this alone lets an author view
   and edit a border token's value, even before a compact preview exists
   (the host falls back to generic rendering for the reference-preview case
   until US2 lands).
4. **STOP and VALIDATE**: `BorderEditor`'s tests pass independently.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. User Story 1 → editable border tokens work.
3. User Story 2 → resolved border references preview compactly.
4. User Story 3 → the whole thing is reachable from the running app with no
   manual configuration.
5. Polish → build/lint/full-suite green, TDD discipline verified.
