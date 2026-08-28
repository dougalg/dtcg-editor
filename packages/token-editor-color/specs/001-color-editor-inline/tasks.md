---
description: "Task list for the Inline CSS-Function Color Editor"
---

# Tasks: Inline CSS-Function Color Editor

**Input**: Design documents in `packages/token-editor-color/specs/001-color-editor-inline/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/convert-color-value.md`, `contracts/editor-components.md`,
`quickstart.md`

**Tests**: Included — the package constitution (Principle IV) mandates a
`*.test.tsx` + `*.a11y.test.tsx` per component, and `contracts/` defines
`node:test` obligations (T1–T13) for the conversion module.

**Organization**: Grouped by user story (US1–US4 from `spec.md`) so each is an
independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: `[US1]`–`[US4]` for user-story-phase tasks only
- Every task names an exact file path

## Path Conventions

Single package: `packages/token-editor-color/`. All paths below are repo-relative.
`token-core` is **not** modified by this feature.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependencies and empty folder structure so ls-lint / TS pass.

- [ ] T001 Add `@dtcg-editor/design-system` as a workspace dependency of this package: `pnpm --filter @dtcg-editor/token-editor-color add @dtcg-editor/design-system@workspace:*`, then confirm `pnpm --filter @dtcg-editor/token-editor-color build` still passes. Do NOT add `colorjs.io` to `packages/token-core` (repo-root Principle VII v3.0.0).
- [ ] T002 [P] Create component folders with stub files so `@ls-lint/ls-lint` and `tsc` pass: `packages/token-editor-color/src/components/ColorFunctionValue/`, `.../ChannelInput/`, `.../ColorSpaceSelect/`, `.../SpaceConversionDialog/` — each with `<Name>.tsx` (stub export), `<Name>.test.tsx`, `<Name>.a11y.test.tsx`. `ColorEditor/` already exists.
- [ ] T003 [P] Resolve the FR-019a / research-R6 dependency: check `@dtcg-editor/design-system` for a resting-dotted → hover/focus-solid underline utility/tokens (working names `--dtcg-ed-color-editable-*`, `.editable-text`). If present, note the exact names in `packages/token-editor-color/specs/001-color-editor-inline/research.md` R6; if absent, file the design-system change and record the agreed names there. The editor will `var()`-reference them with a keyword fallback either way — no local hardcode.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: shared utils, config, and the editor shell every user story builds on.

**⚠️ CRITICAL**: no user-story phase can start until this phase is complete.

- [ ] T004 [P] Add `formatChannel(n: number): string` to `packages/token-editor-color/src/utils/conversion.ts` — plain decimal (never exponent), trim trailing fractional zeros and a bare trailing `.`, render `-0` as `"0"`, no rounding (data-model "formatChannel"; research R3; FR-002d).
- [ ] T005 [P] Add `formatChannel` cases (contract T13) to `packages/token-editor-color/src/utils/conversion.test.ts` (`node:test`): `0.5→"0.5"`, `0.5000→"0.5"`, `145→"145"`, `145.0→"145"`, `-0→"0"`, `0.123456→"0.123456"`, `0.0000001→"0.0000001"` (no `1e-7`).
- [ ] T006 Add `spaceSwitchTolerance?: number` to `ColorEditorOptions` and `ColorEditorOptionsSchema` (`z.number().nonnegative().optional()`) in `packages/token-editor-color/src/configuration.ts` (FR-010a; data-model "ColorEditorOptions").
- [ ] T007 [P] Add `spaceSwitchTolerance` cases to `packages/token-editor-color/src/configuration.test.ts`: accepts `0`, a positive number, and absence; rejects a negative number and a non-number.
- [ ] T008 Implement `packages/token-editor-color/src/components/ColorSpaceSelect/ColorSpaceSelect.tsx` — design-system `Select` (`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` from `@dtcg-editor/design-system/components/Select/Select.tsx`); props `{ value: ColorSpace | "hex", offered: readonly ColorSpace[], onChange }`; lists `offered` in `COLOR_SPACES` canonical order with current indicated (FR-007, FR-008); reuse `offeredColorSpaces()`; controlled; accessible name "Colour space"; legacy mode shows a synthetic `hex` current entry (research R9). Chevron hidden and trigger left unstyled here — styling lands in T029 (contracts/editor-components "ColorSpaceSelect"; research R7).
- [ ] T009 [P] `packages/token-editor-color/src/components/ColorSpaceSelect/ColorSpaceSelect.test.tsx` — lists all 14 spaces by default and only the restricted subset (+ current) when `offered` is limited, in canonical order; marks the current space; emits `onChange` on selection; renders the `hex` entry in legacy mode.
- [ ] T010 [P] `packages/token-editor-color/src/components/ColorSpaceSelect/ColorSpaceSelect.a11y.test.tsx` — zero `axe-core` WCAG 2.2 AA violations; asserts the accessible name.
- [ ] T011 Rewrite `packages/token-editor-color/src/components/ColorEditor/ColorEditor.tsx` shell — branch object-form vs legacy bare-hex (research R9); render `ColorSpaceSelect` + `ColorFunctionValue` inline for object form; surface `checkColorValueIssues(value)` in a `role="alert"` region wired via `aria-describedby` (FR-021); **remove** `<input type="color">` (FR-017), the three `none` checkboxes (FR-015), the standalone hex `<input>` (FR-016), the "has alpha" checkbox, and the `.labelText` captions; hold no local colour copy, only `pendingSpace`/`pendingConversion` (later phases); no `ColorValue` re-validation (Pkg Principle II). Channel/alpha and space-switch wiring land in T019 / T027.
- [ ] T012 Remove `srgbHexToColorSpaceComponents` from `packages/token-editor-color/src/utils/conversion.ts`, delete its cases from `.../conversion.test.ts`, and drop its re-export from `packages/token-editor-color/src/index.ts` (FR-017 removed its only caller).

**Checkpoint**: shell renders a colour token with a live space select and an issues region; no story behaviour yet.

---

## Phase 3: User Story 1 — Read and edit channel values in place (Priority: P1) 🎯 MVP

**Goal**: every channel and the alpha are live number inputs styled as plain text; typing + commit writes the value; Escape abandons; no rounding on display.

**Independent Test**: render the editor for `{ colorSpace: "oklch", components: [0.7, 0.15, 145] }`, confirm each channel is already a focusable input, focus one, type, commit → `$value` updated and the inline string re-rendered; Escape mid-edit reverts.

### Implementation for User Story 1

- [ ] T013 [P] [US1] Implement `packages/token-editor-color/src/components/ChannelInput/ChannelInput.tsx` — design-system `Input` (`type="number"`, `inputMode="decimal"`) present and focusable from first render, never click-to-activate (FR-002c); initial text = `formatChannel(value)`; local `draft` while focused; **Enter/blur** commit a finite number via `onCommit`, empty draft + `onClear` ⇒ `onClear`, otherwise revert; **Escape** discards `draft` and keeps focus (FR-005/FR-006, US1 AC5/AC6); `value === "none"` shows the literal text `none`, first keystroke starts a numeric draft from empty (research R4); `aria-label` from `label` (visually hidden); `aria-invalid` + `aria-describedby` when `invalid` (FR-021, research R11). Underline/monospace styling deferred to T029.
- [ ] T014 [P] [US1] `packages/token-editor-color/src/components/ChannelInput/ChannelInput.test.tsx` — renders as an input on first render (no click needed); shows `formatChannel(value)`; Enter and blur each commit a parsed number; non-numeric / empty not committed and reverts; Escape reverts and keeps focus; `"none"` renders literally then accepts a numeric edit; empty + `onClear` triggers removal.
- [ ] T015 [P] [US1] `packages/token-editor-color/src/components/ChannelInput/ChannelInput.a11y.test.tsx` — zero `axe-core` WCAG 2.2 AA violations; asserts the accessible name resolves from `label`.
- [ ] T016 [US1] Implement `packages/token-editor-color/src/components/ColorFunctionValue/ColorFunctionValue.tsx` — props `{ value: ColorObjectValue, onComponentChange, onAlphaChange, spaceSelect: ReactNode }`; render `{spaceSelect}( c0 c1 c2 [ / alpha ] )` with one `ChannelInput` per component (value via `formatChannel`); render the alpha `ChannelInput` when `value.alpha !== undefined`, else a focusable `+ α` add-alpha control that sets `alpha: 1` and moves focus into the new input (research R8); the `/` separator and inner padding are inert — no underline, not focusable (FR-002b); bracketing `(` `)` are inert text that visually tracks the space select's hover/focus state (FR-002/FR-004); no layout shift when a channel is focused (FR-002c). Depends on T013.
- [ ] T017 [P] [US1] `packages/token-editor-color/src/components/ColorFunctionValue/ColorFunctionValue.test.tsx` — renders `space( c c c )`; shows ` / a` only when alpha present; `+ α` adds `alpha: 1`; clearing the alpha input removes the segment; numbers pass through `formatChannel` (e.g. stored `0.5` not `0.5000`, no rounding of `0.123456`); `/` and padding carry no interactive handlers.
- [ ] T018 [P] [US1] `packages/token-editor-color/src/components/ColorFunctionValue/ColorFunctionValue.a11y.test.tsx` — zero `axe-core` violations; explicit assertion for the parts with no interactive semantics of their own.
- [ ] T019 [US1] Wire channel/alpha editing into `packages/token-editor-color/src/components/ColorEditor/ColorEditor.tsx` — `onComponentChange(i, n)` / `onAlphaChange(n | undefined)` rebuild the `ColorObjectValue`; when the incoming value carried `hex`, recompute it via `colorValueToSrgbHex(next)` so it stays consistent, and never add `hex` when it was absent (FR-016, research R10); call `onChange`; no schema re-run. Depends on T011, T016.
- [ ] T020 [P] [US1] `packages/token-editor-color/src/components/ColorEditor/ColorEditor.test.tsx` (edit path) — editing a channel updates `$value` and re-renders the inline string; `hex` fallback tracks edits when present and stays absent when the value had none; Escape mid-edit writes nothing.
- [ ] T021 [P] [US1] Rewrite `packages/token-editor-color/src/components/ColorEditor/ColorEditor.a11y.test.tsx` for the reworked UI — object editor with alpha + an out-of-range channel, and the legacy bare-hex editor: zero `axe-core` WCAG 2.2 AA violations.

**Checkpoint**: an author can open a colour token and edit every channel + alpha inline; MVP shippable.

---

## Phase 4: User Story 2 — Switch colour space, preserving the perceived colour (Priority: P1)

**Goal**: choosing a space in the select converts the perceived colour; a switch that is out of gamut, undefines a channel, or exceeds the configured ΔEOK tolerance opens an Accept/Deny dialog first; Deny is a full no-op.

**Independent Test**: in-sRGB-gamut colour `srgb`→`oklch` ⇒ no dialog, both strings describe the same colour; wide-gamut `oklch` outside sRGB → `srgb` ⇒ dialog with per-channel deltas, Deny leaves `$value` byte-for-byte unchanged and the select shows `oklch`.

**Depends on US1** for `ColorFunctionValue` / `ChannelInput` (to render the converted result); the conversion util and dialog are independently testable.

### Implementation for User Story 2

- [ ] T022 [P] [US2] Implement `convertColorValue(value, targetSpace, tolerance)` in `packages/token-editor-color/src/utils/conversion.ts` per `contracts/convert-color-value.md` — `colorjs.io/fn` `to()`; `inGamut()` then `toGamut(color, { space, method: "css" })` on overflow (+ `{ kind: "gamut-clamped" }`); `NaN` hue → `0` (+ `{ kind: "hue-undefined", channelIndex }`, research R5); round-trip `deltaEOK`; classify `"within-tolerance"` (in gamut, defined, `deltaEOK < tolerance`) / `"gamut-mapped"` / `"channel-undefined"`; `ChannelChange[3]` with unrounded `from`/`to` and target-space `COMPONENT_RANGES` labels; `ConversionNote[]`; `deltaEOK` on the result; alpha passthrough (FR-014); `hex` recomputed iff input had one; `"none"`→`0` (research R4); legacy hex treated as `srgb` (R9); wrap any throw once with `fromThrowable`, log via an injected `Logger` default, return `err(UnknownError)` — never throw (repo Principles V/VI). Export from `src/index.ts` with the `ColorConversion`/`ChannelChange`/`ConversionNote` types.
- [ ] T023 [P] [US2] Add contract cases T1–T12 to `packages/token-editor-color/src/utils/conversion.test.ts` (`node:test`) — every `COLOR_SPACES`×`COLOR_SPACES` round-trip `deltaEOK < 0.02` at `tolerance = 0.02` (T1); `srgb`→`oklch` in-gamut ⇒ `"within-tolerance"`, no notes (T2); `oklch(0.7 0.3 30)`→`srgb` ⇒ `"gamut-mapped"` + `gamut-clamped`, components in `[0,1]` (T3); achromatic `srgb(0.5 0.5 0.5)`→`oklch` ⇒ `"channel-undefined"` + `hue-undefined` `channelIndex: 2`, hue `0` (T4); alpha `0.4` preserved (T5); `"none"` component ⇒ no `"none"`/`NaN` out (T6); `hex` recomputed / absent (T7/T8); same-space call ⇒ `"within-tolerance"`, `deltaEOK ~ 0`, all `changed: false` (T9); legacy `"#3366cc"`→`oklch` ok, finite (T10); forced `colorjs.io` throw ⇒ `err` is `UnknownError`, `Logger` called once, nothing thrown (T11); `tolerance = 0` on an in-gamut switch with `deltaEOK > 0` ⇒ not `"within-tolerance"` (T12).
- [ ] T024 [US2] Implement `packages/token-editor-color/src/components/SpaceConversionDialog/SpaceConversionDialog.tsx` — design-system `Dialog` (`DialogContent`/`DialogTitle`/`DialogDescription` from `@dtcg-editor/design-system/components/Dialog/Dialog.tsx`); props `{ open, sourceSpace, conversion: ColorConversion, onAccept, onDeny }`; title "Convert to {targetSpace}?"; one row per `conversion.channelChanges` showing `formatChannel(from)` → `formatChannel(to)` + a plain-language consequence from `conversion.notes` (gamut clamp / undefined hue); **Accept** and **Deny** actions; initial focus on **Deny**; Escape / backdrop / close ⇒ `onDeny` (FR-011/FR-012/FR-013, research R11). Holds no state, does no maths.
- [ ] T025 [P] [US2] `packages/token-editor-color/src/components/SpaceConversionDialog/SpaceConversionDialog.test.tsx` — one table row per `channelChanges` with formatted `from`/`to` and the matching note text; Accept fires `onAccept`; Deny, Escape, and backdrop each fire `onDeny`.
- [ ] T026 [P] [US2] `packages/token-editor-color/src/components/SpaceConversionDialog/SpaceConversionDialog.a11y.test.tsx` — zero `axe-core` WCAG 2.2 AA violations; focus is trapped; initial focus lands on **Deny**.
- [ ] T027 [US2] Wire the space-switch flow into `packages/token-editor-color/src/components/ColorEditor/ColorEditor.tsx` — on `ColorSpaceSelect` `onChange(next)` call `convertColorValue(value, next, options?.spaceSwitchTolerance ?? 0.02)`; `classification === "within-tolerance"` ⇒ `onChange(converted)`; else set `pendingSpace = next` + `pendingConversion` and render `SpaceConversionDialog`; **Accept** ⇒ `onChange(converted)` then clear pending; **Deny/dismiss** ⇒ clear pending (the `Select`, controlled off `value.colorSpace`, snaps back — no imperative reset, FR-013); alpha preserved (FR-014); a legacy bare-hex value + a real-space pick converts from the hex and writes object form (FR-020, research R9). Depends on T008, T011, T022, T024.
- [ ] T028 [P] [US2] Extend `packages/token-editor-color/src/components/ColorEditor/ColorEditor.test.tsx` — in-gamut switch applies with no dialog and yields the same perceived colour (not raw-number reinterpretation); out-of-gamut / achromatic / over-tolerance opens the dialog before any write; Accept writes the converted (gamut-mapped) value; Deny changes nothing and the select shows the original space; `options.spaceSwitchTolerance: 0` forces the dialog on an otherwise-silent switch; legacy hex → object form on a space change.

**Checkpoint**: perceptual space switching + confirmation dialog fully working; US1 still green.

---

## Phase 5: User Story 3 — Consistent inline appearance from the design system (Priority: P2)

**Goal**: the control reads as editable prose — dotted underline at rest, solid on hover/focus, monospace, zero literal design values, design-system components throughout.

**Independent Test**: render the editor and audit — each segment has its own dotted underline at rest, no border/box/caret chrome, no `none` checkbox / hex field; hover or focus a segment ⇒ solid underline + stronger foreground on that segment only; grep finds no design-value literals.

### Implementation for User Story 3

- [ ] T029 [US3] Apply the research-R6 underline treatment via design-system tokens/utility (from T003): `ChannelInput` and the `ColorSpaceSelect` trigger get the resting-dotted → `:hover`/`:focus-visible` solid underline + stronger `--dtcg-ed-*` foreground, no border/box/spinner/caret at rest; `ColorSpaceSelect` chevron hidden; `ColorFunctionValue` uses the `--dtcg-ed-*` monospace token (`typography.mono`) (FR-002/FR-002a/FR-002d display path/FR-004/FR-004a/FR-004b/FR-019/FR-019a). Reference `var(--dtcg-ed-*)` with a keyword fallback — no literal, no permanent local copy. Touches `ChannelInput.tsx`, `ColorSpaceSelect.tsx`, `ColorFunctionValue.tsx` and any co-located `*.module.css`.
- [ ] T030 [US3] Delete `packages/token-editor-color/src/components/ColorEditor/ColorEditor.module.css` (or reduce to `var(--dtcg-ed-*)`-only rules); remove the bespoke `.swatch`/`.picker`/`.labelText` styles now that those elements are gone (FR-019, SC-006).
- [ ] T031 [P] [US3] Add US3 AC1–AC4 assertions to `ColorFunctionValue.test.tsx` / `ColorEditor.test.tsx` — every segment shows a dotted underline at rest; no button/box/border/caret chrome; no `none` checkbox and no standalone hex input; pointer-leave and blur return every segment to the resting appearance.
- [ ] T032 [P] [US3] Add a wrap test (US3 AC5 / FR-023) in `ColorFunctionValue.test.tsx` — a long inline value wraps within a narrow container with no horizontal overflow and stays fully editable when wrapped.
- [ ] T033 [US3] Run the `quickstart.md` §5 design-value audit — `rg -n "#[0-9a-fA-F]{3,8}\b|[0-9]+px|[0-9]*\.?[0-9]+rem|box-shadow:|transition:" packages/token-editor-color/src --glob '!*.test.*'` — and confirm zero matches outside `var(--dtcg-ed-*)` usage.

**Checkpoint**: the editor matches the mockups and passes the Principle XII audit.

---

## Phase 6: User Story 4 — Preview and inspect states in Storybook (Priority: P3)

**Goal**: the existing `Editors/ColorEditor` story covers every meaningful state and can drive the conversion dialog without the web app.

**Independent Test**: `pnpm storybook`, open `Editors/ColorEditor`, each story renders without console errors and the `OutOfGamut` interaction opens the dialog.

### Implementation for User Story 4

- [ ] T034 [US4] Extend `packages/token-editor-color/src/components/ColorEditor/ColorEditor.stories.tsx` — keep the `ControlledColorEditor` wrapper and the existing `Default` / `RestrictedColorSpaces`; add `OutOfGamut` (wide-gamut `oklch` outside sRGB), `WithAlpha`, `LegacyHex` (`"#1f75cb"`), and `NoneChannel` stories (FR-022).
- [ ] T035 [US4] Add a play/interaction to the `OutOfGamut` story in `ColorEditor.stories.tsx` that opens the space select, chooses `srgb`, and asserts `SpaceConversionDialog` renders with per-channel before→after rows (FR-022, SC-008).
- [ ] T036 [US4] Manually run `pnpm storybook` and walk the `quickstart.md` §3 table — all six stories render error-free; `WithAlpha` add/remove works; `OutOfGamut` Deny/Accept behave; `NoneChannel` and `LegacyHex` render.

**Checkpoint**: all four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T037 [P] Finalise `packages/token-editor-color/src/index.ts` exports — `convertColorValue`, `formatChannel`, `ColorConversion` / `ChannelChange` / `ConversionNote` types added; `colorValueToCssColor` / `colorValueToSrgbHex` retained; `srgbHexToColorSpaceComponents` re-export removed (contract "Adjacent obligations").
- [ ] T038 [P] Verify `packages/token-editor-color/src/token-type.ts` still wires `editorOptionsSchema: ColorEditorOptionsSchema` unchanged and that `git diff` shows **no** change under `packages/token-core/`.
- [ ] T039 Run `pnpm --filter @dtcg-editor/token-editor-color test` (node:test) and `pnpm exec vitest run --project 'packages/token-editor-color:unit'` + `... --project 'packages/token-editor-color:a11y'` — all green (`quickstart.md` §1–2).
- [ ] T040 Run `pnpm lint` and `pnpm build` from the repo root — `@ls-lint/ls-lint` folder/name rules and strict-TS type-check all green (`quickstart.md` §5).
- [ ] T041 Walk the `quickstart.md` §4 end-to-end checklist in `web-app` (`pnpm --filter web-app dev`) — inline channel edit + Escape revert; in-gamut switch = same colour; out-of-gamut/achromatic switch = dialog, Deny is a no-op; no `none` checkbox / colour picker / hex field; tab order space→c0→c1→c2→alpha/`+ α`; full-precision display with trimmed zeros; `editorOptions.spaceSwitchTolerance` of `0` forces the dialog, a large value suppresses it, invalid fails config load.
- [ ] T042 [P] Confirm `colorjs.io` is still in `packages/token-editor-color/package.json` and absent from `packages/token-core/package.json`, and `@dtcg-editor/design-system` is present in `packages/token-editor-color/package.json` (`quickstart.md` "Done when").

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: needs Setup. **Blocks every user story.**
- **US1 (Phase 3)**: needs Foundational. No dependency on other stories.
- **US2 (Phase 4)**: needs Foundational; needs **US1** for `ColorFunctionValue` / `ChannelInput` to render the converted result. `convertColorValue` + `SpaceConversionDialog` (T022–T026) have no US1 dependency and can be built in parallel with Phase 3.
- **US3 (Phase 5)**: needs the US1 (and ideally US2) components to exist — it styles them.
- **US4 (Phase 6)**: needs US1 + US2 behaviour to demo; `NoneChannel` / `LegacyHex` / `WithAlpha` stories only need US1.
- **Polish (Phase 7)**: after all desired stories.

### Within Each User Story

- Models/helpers before the components that use them; components before the `ColorEditor` wiring task; wiring before the wiring-level `ColorEditor.test.tsx` additions.
- `ChannelInput` (T013) before `ColorFunctionValue` (T016).
- `ColorSpaceSelect` (T008) + `convertColorValue` (T022) + `SpaceConversionDialog` (T024) before the space-switch wiring (T027).

### Parallel Opportunities

- **Phase 1**: T002, T003 in parallel (T001 first — it changes `package.json`).
- **Phase 2**: T004+T005 (formatChannel), T007 in parallel; T009+T010 in parallel after T008; T006 before T007; T011 after T008; T012 independent.
- **Phase 3**: T013→(T014, T015 parallel); T016 after T013→(T017, T018 parallel); T019 after T011+T016; T020, T021 parallel after T019.
- **Phase 4**: T022→T023 parallel with T024→(T025, T026); T027 after T022+T024+T008+T011; T028 after T027.
- **Phase 5**: T029 then T030; T031, T032 parallel; T033 last.
- **Phase 7**: T037, T038, T042 parallel; T039 → T040 → T041 sequential (each gates the next).

---

## Parallel Example: User Story 1

```bash
# After T013 (ChannelInput.tsx) lands:
Task: "T014 [US1] ChannelInput.test.tsx — first-render input, commit, Escape, none"
Task: "T015 [US1] ChannelInput.a11y.test.tsx — zero axe violations, accessible name"

# After T016 (ColorFunctionValue.tsx) lands:
Task: "T017 [US1] ColorFunctionValue.test.tsx — layout, alpha add/remove, formatChannel"
Task: "T018 [US1] ColorFunctionValue.a11y.test.tsx — zero axe violations"
```

## Parallel Example: User Story 2 (conversion track, parallel with Phase 3)

```bash
Task: "T022 [US2] convertColorValue(value, targetSpace, tolerance) in src/utils/conversion.ts"
Task: "T024 [US2] SpaceConversionDialog.tsx — Dialog, per-channel table, Accept/Deny"
# then:
Task: "T023 [US2] conversion.test.ts T1–T12 (node:test)"
Task: "T025 [US2] SpaceConversionDialog.test.tsx"
Task: "T026 [US2] SpaceConversionDialog.a11y.test.tsx"
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 US1.
3. **STOP & VALIDATE**: an author can edit every channel + alpha inline, no rounding, Escape reverts. Demo.

### Incremental Delivery

1. Setup + Foundational → shell renders.
2. + US1 → inline editing (MVP).
3. + US2 → perceptual space switching + confirmation dialog.
4. + US3 → design-system styling / mockup match / Principle XII audit.
5. + US4 → Storybook coverage.
6. Polish → exports, full test + lint + build, quickstart end-to-end.

### Notes

- `[P]` = different files, no incomplete-task dependency.
- `token-core` is never edited — it is imported read-only (repo Principle VII v3.0.0).
- Commit after each task or logical group; keep `colorjs.io` out of `token-core`.
- Every component ships `*.test.tsx` + `*.a11y.test.tsx` (package Principle IV).
- The R6 underline treatment may land in `@dtcg-editor/design-system` separately; the editor references the agreed `var(--dtcg-ed-*)` names with a keyword fallback and is not blocked (FR-019a).
