# Tasks: Shadow Token Support

**Input**: Design documents from `/specs/014-shadow-token-support/`

**Prerequisites**: plan.md, spec.md

**Tests**: MANDATORY — Constitution Principle XIII (TDD, NON-NEGOTIABLE) requires
every behavior be driven by a test observed failing first. `speckit-tdd-plan`
MUST run before implementation begins; the red-green-refactor cycle for each
task below is recorded in `tdd/cycle-log.md`.

**Organization**: Tasks are grouped by user story (spec.md P1/P2/P2/P1) to
enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Scaffold `packages/token-editor-shadow` package skeleton
      (`package.json`, `tsconfig.json`, `vitest.setup.ts`,
      `vitest-a11y-tags.ts`, `src/css-modules.d.ts`, `src/vitest-env.d.ts`),
      copying the exact structure of `packages/token-editor-border`, with
      `dependencies` on `@dtcg-editor/token-core`,
      `@dtcg-editor/token-editor-contract`, `@dtcg-editor/token-editor-color`,
      `@dtcg-editor/token-editor-dimension` (all `workspace:*`), added via
      `pnpm add <pkg>@workspace:* --filter @dtcg-editor/token-editor-shadow`
      per CLAUDE.md's pnpm rule, not hand-edited.
- [x] T002 [P] Add `packages/token-editor-shadow` to the `packages` array in
      `vitest.config.mts` so its Vitest projects run in the aggregated suite.
- [x] T003 [P] Run `pnpm install` at the repo root to link the new package
      and its new workspace dependencies.

**Checkpoint**: Package scaffold exists, builds as an empty shell, is wired
into the root Vitest config.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `ShadowValueSchema` in `token-core` that every user story's
Editor/Preview/contract depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 [U1][U2][U3][U4][U5][U6][U7][U8][U9][U10][U11][U12][U13][U14][U15] Write failing tests for `ShadowValueSchema` in
      `packages/token-core/src/shadow.test.ts` (`node:test` +
      `node:assert/strict`, mirroring `border.test.ts`'s style): accepts a
      valid single-layer object `{ color, offsetX, offsetY, blur, spread }`;
      accepts a valid array of one layer; accepts a valid array of multiple
      layers; rejects a single-layer object missing any of the five required
      keys; rejects a layer whose `color` is not a valid `ColorValue`;
      rejects a layer whose `offsetX`/`offsetY`/`blur`/`spread` is not a
      valid `DimensionValue`; rejects an array containing one invalid layer
      even when the others are valid; rejects an empty array. Confirm these
      fail first (no `shadow.ts` module exists yet) and log the red in
      `specs/014-shadow-token-support/tdd/cycle-log.md`.
- [x] T005 [U1][U2][U3][U4][U5][U6][U7][U8][U9][U10][U11][U12][U13][U14][U15] Implement `ShadowLayerSchema`/`ShadowValueSchema`/`ShadowValue`/
      `ShadowLayer` in `packages/token-core/src/shadow.ts` as
      `ShadowLayerSchema = z.object({ color: ColorValueSchema, offsetX: DimensionValueSchema, offsetY: DimensionValueSchema, blur: DimensionValueSchema, spread: DimensionValueSchema })`
      and `ShadowValueSchema = z.union([ShadowLayerSchema, z.array(ShadowLayerSchema).min(1)])`,
      importing the two sub-schemas from their existing sibling modules
      (`./color.ts`, `./dimension.ts`) — no redefinition of any sub-schema.
      The `.min(1)` on the array form enforces spec.md's "empty array is
      invalid" edge case. Confirm T004's tests now pass; log the green in
      `tdd/cycle-log.md`.
- [x] T006 Export `ShadowValue`, `ShadowLayer`, `ShadowValueSchema`, and
      `ShadowLayerSchema` from `packages/token-core/src/index.ts`, alongside
      the existing exports for the other value schemas.

**Checkpoint**: `ShadowValueSchema` is implemented, tested, and exported —
every subsequent phase can import it.

---

## Phase 3: User Story 1 - Author edits a single-layer shadow token's five sub-values (Priority: P1) 🎯 MVP

**Goal**: A `ShadowLayerFields` component renders the embedded `ColorEditor`
and four `DimensionEditor` instances (offsetX/offsetY/blur/spread), each
clearly labeled and wired so changing one sub-field leaves the other four
untouched; `ShadowEditor` renders `ShadowLayerFields` directly (no repeater
chrome) when `value` is a bare single-layer object.

**Independent Test**: Render `ShadowEditor` with a known bare-object
`ShadowLayer` value, change only one embedded control, assert only that
sub-field changed in the emitted `onChange` value and no repeater controls
are present.

### Tests for User Story 1 ⚠️

> Write these tests FIRST; observe them fail (no `ShadowLayerFields.tsx`/
> `ShadowEditor.tsx` exist yet) before implementing; log each red in
> `tdd/cycle-log.md`.

- [ ] T007 [P] [US1] [U16][U17][U18][U19][U20][U21] Write failing tests in
      `packages/token-editor-shadow/src/components/ShadowLayerFields/ShadowLayerFields.test.tsx`
      (Vitest + `@testing-library/react`, mirroring `BorderEditor.test.tsx`'s
      style) asserting: it renders the embedded `ColorEditor` and four
      `DimensionEditor` instances, each showing the corresponding sub-field's
      current value; each is wrapped in its own `<fieldset>`/`<legend>`
      labeled "Offset X"/"Offset Y"/"Blur"/"Spread" (mirroring
      `TransitionEditor`'s disambiguation pattern for repeated sibling
      editors); changing the offsetX control calls `onChange` with
      `{ ...layer, offsetX: <new> }` and every other sub-field unchanged
      (deep-equal to originals); same assertion independently for offsetY,
      blur, spread, and color.
- [ ] T008 [P] [US1] [U22] Write failing a11y test in
      `packages/token-editor-shadow/src/components/ShadowLayerFields/ShadowLayerFields.a11y.test.tsx`
      (Vitest Browser Mode + `axe-core`, mirroring
      `BorderEditor.a11y.test.tsx`) asserting zero WCAG 2.2 AA violations for
      `ShadowLayerFields` rendered with a representative `ShadowLayer`.
- [ ] T009 [P] [US1] [A1][A2][A3][A4][A5][U23][U24] Write failing tests in
      `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.test.tsx`
      asserting: given a bare-object `ShadowValue` (not an array), it renders
      exactly one `ShadowLayerFields` block and no add/remove/move controls;
      changing a sub-field calls `onChange` with the updated bare object (not
      wrapped in an array).
- [ ] T010 [P] [US1] [U32] Write failing a11y test in
      `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.a11y.test.tsx`
      asserting zero WCAG 2.2 AA violations for `ShadowEditor` rendered with a
      representative bare-object `ShadowValue`.

### Implementation for User Story 1

- [ ] T011 [US1] [U16][U17][U18][U19][U20][U21] Implement `ShadowLayerFields` in
      `packages/token-editor-shadow/src/components/ShadowLayerFields/ShadowLayerFields.tsx`:
      accepts `{ value: ShadowLayer; onChange: (layer: ShadowLayer) => void }`;
      renders `<ColorEditor value={value.color} onChange={(color) => onChange({ ...value, color })} />`
      unlabeled (matching `BorderEditor`'s single-color precedent — no
      ambiguity to disambiguate) and four `<fieldset>`/`<legend>`-wrapped
      `<DimensionEditor>` instances for offsetX/offsetY/blur/spread, each
      `onChange` updating only that key. Confirm T007/T008 now pass; log
      green in `tdd/cycle-log.md`.
- [ ] T012 [US1] Add
      `packages/token-editor-shadow/src/components/ShadowLayerFields/ShadowLayerFields.module.css`
      with layout-only rules (spacing between the five embedded editors),
      sourcing all values from `--dtcg-ed-*` custom properties per
      Constitution Principle XII — no hardcoded spacing/color/border values.
- [ ] T013 [US1] [A1][A2][A3][A4][A5][U23][U24] Implement `ShadowEditor` in
      `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.tsx`:
      accepts `TokenTypeEditorProps<ShadowValue>`; when `value` is not an
      array, renders one `<ShadowLayerFields value={value} onChange={onChange} />`
      with no repeater chrome. (The array branch is added in Phase 4 — User
      Story 1's implementation only needs to not break on an array value by
      routing it to Phase 4's not-yet-built repeater; until Phase 4 lands,
      guard the array case with a minimal passthrough so T009/T010 for the
      bare-object case pass without depending on unwritten repeater code.)
      Confirm T009/T010 now pass; log green in `tdd/cycle-log.md`.
- [ ] T014 [US1] Add `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.module.css`
      with layout-only rules, sourcing all values from `--dtcg-ed-*` custom
      properties per Principle XII.
- [ ] T015 [P] [US1] Add
      `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.stories.tsx`
      (Storybook), mirroring `BorderEditor.stories.tsx`'s pattern, with a
      bare single-layer story.

**Checkpoint**: A single-layer shadow token can be edited via all five
embedded sub-controls with no cross-field clobbering, with no repeater UI
shown for the bare-object case.

---

## Phase 4: User Story 2 - Author manages a stack of multiple shadow layers (Priority: P2)

**Goal**: `ShadowEditor` renders a repeater (add/remove/move-up/move-down)
over `ShadowLayerFields` blocks when `value` is an array, adapting
`FontFamilyEditor`'s list pattern to composite layer objects per plan.md's
Design Decisions — including preserving the bare-object-vs-array on-disk
distinction and disabling remove on the last remaining layer.

**Independent Test**: Render `ShadowEditor` with a known two-layer array
value; add/remove/reorder layers and assert the emitted array reflects each
operation with no other layer's values altered; assert remove is disabled
when exactly one layer remains; assert a one-item array value keeps showing
repeater chrome (not collapsed to the bare-object UI) and serializes back out
as a one-item array, not a bare object.

### Tests for User Story 2 ⚠️

> Write these tests FIRST; observe them fail (no repeater logic exists yet in
> `ShadowEditor`) before implementing; log each red in `tdd/cycle-log.md`.

- [ ] T016 [P] [US2] [A6][A7][A8][A9][U25][U26][U27][U28][U29][U30][U31] Extend
      `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.test.tsx`
      with failing tests asserting: given a two-layer array `ShadowValue`, it
      renders two `ShadowLayerFields` blocks plus add/remove/move-up/
      move-down controls per row; clicking "Add layer" calls `onChange` with
      a three-layer array, the first two layers unchanged (deep-equal), and
      the new third layer being a schema-valid default; clicking "Remove" on
      the middle of three layers calls `onChange` with a two-layer array
      containing exactly the first and third original layers, unchanged and
      in order; clicking "Move down" on the first of two layers calls
      `onChange` with the two layers swapped, neither layer's own sub-values
      altered; changing a sub-field of the second of two layers calls
      `onChange` with only that layer's field changed, the first layer
      untouched; given a value with exactly one layer, the remove control for
      that row is `disabled`; given a one-item *array* `ShadowValue` (not a
      bare object), it still renders repeater chrome (not the bare-object
      single-`ShadowLayerFields` UI) and any edit's `onChange` result is
      still wrapped in a one-item array, not unwrapped to a bare object.
- [ ] T017 [P] [US2] [U33] Extend
      `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.a11y.test.tsx`
      with a failing test asserting zero WCAG 2.2 AA violations for
      `ShadowEditor` rendered with a representative multi-layer array
      `ShadowValue`.

### Implementation for User Story 2

- [ ] T018 [US2] [A6][A7][A8][A9][U25][U26][U27][U28][U29][U30][U31] Implement the repeater branch of `ShadowEditor` in
      `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.tsx`:
      track a `wasArray` flag captured from whether the incoming `value` prop
      is an array (per plan.md's Design Decisions — re-derived on prop
      change, not on internal state, so the on-disk shape choice is
      preserved rather than re-inferred from the current layer count); when
      `value` is an array, render one row per layer — each row a
      `ShadowLayerFields` plus "Remove"/"Move up"/"Move down" `Button`s from
      `@dtcg-editor/design-system` (mirroring `FontFamilyEditor`'s control
      set and `disabled` boundary rules, plus disabling "Remove" outright
      when `layers.length === 1`) — and an "Add layer" `Button` appending a
      fixed schema-valid default layer (opaque black `srgb` color, alpha 1,
      all four dimensions `0px`, per spec.md's Assumptions). On commit,
      serialize back to an array if `wasArray` was true (even when reduced to
      one layer) or if the array now has more than one layer, and to a bare
      object only when `wasArray` was false and exactly one layer remains.
      Confirm T016/T017 now pass; log green in `tdd/cycle-log.md`.
- [ ] T019 [US2] Extend
      `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.module.css`
      with layout-only rules for the repeater rows/controls, sourcing all
      values from `--dtcg-ed-*` custom properties per Principle XII.
- [ ] T020 [P] [US2] Extend
      `packages/token-editor-shadow/src/components/ShadowEditor/ShadowEditor.stories.tsx`
      with a multi-layer array story.

**Checkpoint**: A multi-layer shadow token can be edited, added to, removed
from, and reordered, with each layer independently editable via its own
`ShadowLayerFields` and no data loss to sibling layers.

---

## Phase 5: User Story 3 - Author sees a compact preview of a resolved shadow reference (Priority: P2)

**Goal**: `ShadowPreview` renders a single-line summary for a single-layer
shadow value (embedding `ColorPreview`) and collapses to `"N shadows"` for a
multi-layer array, declining to render for any value that doesn't match the
shadow shape.

**Independent Test**: Render `ShadowPreview` with a valid single-layer value,
a valid multi-layer array, and several invalid/partial shapes; assert the
single-layer case renders one compact inline line, the multi-layer case
renders the literal `"N shadows"` text, and every invalid case renders
nothing.

### Tests for User Story 3 ⚠️

> Write these tests FIRST; observe them fail (no `ShadowPreview.tsx` exists
> yet) before implementing; log each red in `tdd/cycle-log.md`.

- [ ] T021 [P] [US3] [A10][A11][A12][U34][U35][U36][U37][U38][U39][U40][U41] Write failing tests in
      `packages/token-editor-shadow/src/components/ShadowPreview/ShadowPreview.test.tsx`
      (mirroring `BorderPreview.test.tsx`'s validate-then-render style)
      asserting: renders offsetX/offsetY/blur/spread text plus an embedded
      `ColorPreview` for a valid single-layer value, all on one line; renders
      the literal text `"3 shadows"` for a valid three-layer array value (and
      `"2 shadows"` for a two-layer array, confirming N is dynamic, not
      hardcoded); declines (renders nothing / `container.firstChild` is
      `null`) for a single layer missing one of its five required keys;
      declines for a layer whose `blur` sub-value is invalid (e.g. a string
      instead of `{ value, unit }`) even though the other four sub-fields are
      valid; declines for an array containing one invalid layer; declines
      for an empty array; declines for a completely unrelated shape (e.g. a
      plain number).
- [ ] T022 [P] [US3] [U42] Write failing a11y test in
      `packages/token-editor-shadow/src/components/ShadowPreview/ShadowPreview.a11y.test.tsx`
      asserting zero WCAG 2.2 AA violations for `ShadowPreview` rendered with
      a representative valid single-layer `ShadowValue` and with a
      representative valid multi-layer array `ShadowValue`.

### Implementation for User Story 3

- [ ] T023 [US3] [A10][A11][A12][U34][U35][U36][U37][U38][U39][U40][U41] Implement `ShadowPreview` in
      `packages/token-editor-shadow/src/components/ShadowPreview/ShadowPreview.tsx`:
      accepts `{ value: unknown }`; validates via `ShadowValueSchema` from
      `@dtcg-editor/token-core` and returns `null` on failure (matching
      `BorderPreview`'s decline pattern); on success, if the parsed value is
      an array with more than one entry, renders the text `` `${parsed.data.length} shadows` ``;
      otherwise (bare object, or a one-item array — both read as "one
      shadow" for preview purposes per spec.md User Story 3, which only
      requires N to reflect the *actual* layer count and does not require
      preserving the bare-object/array distinction in this read-only view)
      renders one compact line — `<ColorPreview value={layer.color} />`
      followed by short offsetX/offsetY/blur/spread text (e.g.
      `"0px 2px 4px 0px"`) — for the single layer (unwrapping a one-item
      array to that one layer first). Confirm T021/T022 now pass; log green
      in `tdd/cycle-log.md`.
- [ ] T024 [US3] Add
      `packages/token-editor-shadow/src/components/ShadowPreview/ShadowPreview.module.css`
      with layout-only rules (inline-flex/gap for the swatch+text), sourcing
      spacing from `--dtcg-ed-*` custom properties per Principle XII.

**Checkpoint**: `ShadowPreview` renders compactly for both single- and
multi-layer values and declines correctly on every malformed-input edge case
from spec.md.

---

## Phase 6: User Story 4 - Shadow token type is available in the token type registry (Priority: P1)

**Goal**: `shadow` is wired into `shadowTokenType: TokenTypeContract<ShadowValue>`
and registered as a built-in type in the web app, so `$type: "shadow"` tokens
use the dedicated editor/preview automatically.

**Independent Test**: Load a token document containing a valid `shadow`-typed
token (single layer and array forms) in the app and confirm the dedicated
`ShadowEditor` renders (not the generic/JSON fallback).

### Tests for User Story 4 ⚠️

> Write these tests FIRST where a test is practical; observe them fail before
> implementing; log each red in `tdd/cycle-log.md`.

- [ ] T025 [P] [US4] [U43] Write a failing unit test (co-located, e.g.
      `packages/token-editor-shadow/src/token-type.test.ts` using
      `node:test`, mirroring `token-editor-border/src/token-type.test.ts`'s
      pattern if present, else `border.ts`'s own contract-shape assertions)
      asserting `shadowTokenType.type === "shadow"`,
      `shadowTokenType.valueSchema` is `ShadowValueSchema` (accepts/rejects
      the same fixtures as T004), `serializeValue` round-trips a
      `ShadowValue` unchanged (identity) for both bare-object and array
      forms, and `Editor`/`Preview` are the `ShadowEditor`/`ShadowPreview`
      functions.

### Implementation for User Story 4

- [ ] T026 [US4] [U43] Implement `shadowTokenType` in
      `packages/token-editor-shadow/src/token-type.ts`
      (`TokenTypeContract<ShadowValue>`, mirroring
      `token-editor-border/src/token-type.ts`): `type: "shadow"`,
      `valueSchema: ShadowValueSchema` (imported from
      `@dtcg-editor/token-core`), `serializeValue: (value) => value`,
      `Editor: ShadowEditor`, `Preview: ShadowPreview`. Confirm T025 now
      passes; log green in `tdd/cycle-log.md`.
- [ ] T027 [US4] Export `ShadowEditor`, `ShadowLayerFields`, `ShadowPreview`,
      and `shadowTokenType` from `packages/token-editor-shadow/src/index.ts`,
      mirroring `token-editor-border/src/index.ts`'s export shape.
- [ ] T028 [P] [US4] [A13][A14][A15][U44] Write a failing test in
      `apps/web-app/lib/token-editors/built-in.test.ts` (extending the
      existing test file's coverage, mirroring how it already asserts other
      types) that `resolveBuiltInContract("shadow")` returns
      `shadowTokenType`, `BUILT_IN_TOKEN_TYPES` includes `"shadow"`, and
      `builtInExtensions` contains a `{ type: "shadow", editor: ShadowEditor }`
      entry. Confirm it fails first (shadow not yet registered); log the red
      in `tdd/cycle-log.md`.
- [ ] T029 [US4] [A13][A14][A15][U44] Register `shadow` in
      `apps/web-app/lib/token-editors/built-in.ts`: add `"shadow"` to
      `BUILT_IN_TOKEN_TYPES`, import `shadowTokenType` from
      `@dtcg-editor/token-editor-shadow`, and add the
      `shadow: shadowTokenType as unknown as TokenTypeContract<unknown>`
      entry (with the same "same safety argument as dimension above" comment
      style already used for every other entry) to
      `builtInContractsByType`. **Note**: this file is being concurrently
      edited by a sibling agent for the `typography` type in a different
      worktree — expect a merge conflict on rebase; resolve by keeping both
      additions (this feature's `shadow` entry plus theirs), not by
      discarding either side.
- [ ] T030 [US4] Add `@dtcg-editor/token-editor-shadow` as a `workspace:*`
      dependency of `apps/web-app` via
      `pnpm add @dtcg-editor/token-editor-shadow@workspace:* --filter @dtcg-editor/web-app`
      (per CLAUDE.md's pnpm rule) if not already resolvable through the
      workspace.

**Checkpoint**: All four user stories are complete; a `shadow`-typed token in
a real token file renders the dedicated editor end-to-end, for both
single-layer and multi-layer values.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T031 [P] Run `pnpm build` at the repo root (the sole type-checking gate
      per the constitution) and fix any type errors surfaced by the new
      package or the `built-in.ts` edit.
- [ ] T032 [P] Run `pnpm lint` (Biome + `@ls-lint/ls-lint`) and fix any
      findings in the new package.
- [ ] T033 Run the full suite (`pnpm test`) and confirm it passes, including
      the new `packages/token-editor-shadow` Vitest unit + a11y projects and
      `packages/token-core`'s `node --test` suite.
- [ ] T034 Run `speckit-tdd-verify` (or the manual deliberate-mutant spot
      check per `.specify/memory/tdd-profile.md`, since this repo has no
      mutation-testing tool configured) against the changed files in this
      feature and record the result in
      `specs/014-shadow-token-support/tdd/verification.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user
  stories (every story's Editor/Preview/contract imports `ShadowValueSchema`).
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of
  US2/US3, though US2 (Phase 4) directly extends the `ShadowEditor.tsx` file
  US1 creates, so in practice US2 starts after US1's `ShadowEditor` skeleton
  exists (not merely after Phase 2).
- **User Story 2 (Phase 4)**: Depends on Foundational AND on US1's
  `ShadowLayerFields`/`ShadowEditor` skeleton existing (the repeater composes
  `ShadowLayerFields` per row and extends the same `ShadowEditor.tsx` file) —
  unlike `border`/`transition`'s sibling stories, US1 and US2 are NOT
  file-independent, since both live in `ShadowEditor.tsx`.
- **User Story 3 (Phase 5)**: Depends on Foundational only — `ShadowPreview`
  shares no code with `ShadowEditor`/`ShadowLayerFields`, so it can proceed
  in parallel with US1/US2 once Phase 2 is done.
- **User Story 4 (Phase 6)**: Depends on US1, US2, and US3 all being
  implemented (the contract wires their concrete `Editor`/`Preview`
  together) — NOT independent of the earlier stories, because a composite
  type's registration step needs every half to exist first.
- **Polish (Phase 7)**: Depends on all prior phases.

### Parallel Opportunities

- T002/T003 can run in parallel with each other (not with T001).
- T007/T008 (US1 `ShadowLayerFields` tests) can be written in parallel with
  T021/T022 (US3 `ShadowPreview` tests) — different files, both only need
  Phase 2's `ShadowValueSchema`.
- T009/T010 (US1 `ShadowEditor` bare-object tests) must land before T016/T017
  (US2 repeater tests), since both extend the same `ShadowEditor.tsx`/
  `.test.tsx`/`.a11y.test.tsx` files.
- T023 (`ShadowPreview` impl) can proceed in parallel with T011–T020
  (`ShadowLayerFields`/`ShadowEditor` impl) once their respective tests are
  red.
- T031/T032 can run in parallel.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational (`ShadowValueSchema`).
3. Phase 3: User Story 1 (`ShadowLayerFields` + bare-object `ShadowEditor`) —
   this alone lets an author view and edit a single-layer shadow token's
   value, even before the repeater or a compact preview exist.
4. **STOP and VALIDATE**: `ShadowEditor`'s bare-object-case tests pass
   independently.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. User Story 1 → editable single-layer shadow tokens work.
3. User Story 2 → multi-layer shadow tokens gain add/remove/reorder.
4. User Story 3 → resolved shadow references preview compactly, for both
   single- and multi-layer values.
5. User Story 4 → the whole thing is reachable from the running app with no
   manual configuration.
6. Polish → build/lint/full-suite green, TDD discipline verified.
