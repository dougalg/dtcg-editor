# Implementation Plan: Inline CSS-Function Color Editor

**Branch**: `001-color-editor-inline` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `packages/token-editor-color/specs/001-color-editor-inline/spec.md`

## Summary

Rework `@dtcg-editor/token-editor-color`'s `Editor` from a stacked-label form into
a single inline, monospace CSS-function widget (e.g. `oklch( 0.7 0.15 145 / 12 )`)
where every part is a live control from first render — each channel and the alpha
are numeric inputs, the colour space is a `Select` — all styled to read as plain
underlined text until hovered or focused. Numbers display exactly as stored
(trailing zeros trimmed, no rounding). Switching colour space converts the
*perceived* colour (not the raw channel numbers); a conversion that is out of
gamut, undefines a channel, or differs by more than a configurable ΔEOK
tolerance (`editorOptions.spaceSwitchTolerance`, default 0.02) is confirmed
through an Accept/Deny dialog before anything is written.

Technical approach: the perceptual conversion + gamut-mapping capability
(`convertColorValue`) is added **inside `@dtcg-editor/token-editor-color`** as a
framework-free `src/utils/` module, backed by `colorjs.io` which **stays a
dependency of this package**. This follows the amended constitutions — repo-root
Principle VII (v3.0.0) and package Principle I (v2.0.0) now place UI-driven
perceptual colour conversion in the `token-editor-*` package, not `token-core`.
`token-core` is unchanged: it still owns `ColorValue` parsing, schemas, and
serialization, which the editor imports and does not fork. The editor's React
layer stays presentational: it composes `convertColorValue` with
`@dtcg-editor/design-system`'s `Input` / `Select` / `Dialog` components and
`--dtcg-ed-*` tokens, and contains no colour maths of its own in the components.

## Technical Context

**Language/Version**: TypeScript (strict; repo `tsconfig.base.json` — `strict`,
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
`noImplicitReturns`; `any` lint-banned)

**Primary Dependencies**:
- `@dtcg-editor/token-core` — colour value types/schemas + serialization (unchanged; imported, not modified)
- `@dtcg-editor/token-editor-contract` — `TokenTypeContract` / `TokenTypeEditorProps`
- `@dtcg-editor/design-system` — `Input`, `Select`, `Dialog`, `Button` components; `--dtcg-ed-*` tokens (**new dependency of this package**)
- `colorjs.io` (`/fn` entry) — **stays** a dependency of `token-editor-color`; backs the new `src/utils/` conversion module
- `neverthrow` (catalog) — **new dependency of this package**; the `Result` return of `convertColorValue` (Principle V). `token-core` already uses it but does not re-export it.
- `@dtcg-editor/errors` (`workspace:*`) — **new dependency of this package**; `UnknownError` / `toLoggedUnknownError` / `Logger` / `consoleLogger` for the conversion throw-wrap (Principle V/VI).
- `react` (catalog), `zod` (catalog, existing)

**Storage**: N/A — the editor is a controlled component; it reads a `ColorValue`
prop and emits changes via `onChange`. No persistence in this feature.

**Testing**:
- `token-editor-color/src/utils/` conversion module: `node:test` + `node:assert/strict` (framework-free module; matches the package's existing `utils/*.test.ts`, which run via the package's own `test` script and are excluded from the Vitest project)
- `token-editor-color` components: Vitest + `@testing-library/react` (`jsdom`) unit tests per component; Vitest Browser Mode (`@vitest/browser` + Playwright, real Chromium) + `axe-core` WCAG 2.2 AA `.a11y.test.tsx` per component
- Storybook: extend `Editors/ColorEditor` story (repo-root `.storybook/`)
- `token-core`: no test changes (not modified)

**Target Platform**: Modern evergreen browsers (the web app) and as a published
library package. No IE/legacy targets.

**Project Type**: pnpm-workspace monorepo — a single-package rework of the
`packages/token-editor-color` editor-UI plugin. `packages/token-core` is not
touched.

**Performance Goals**: Interaction stays at 60 fps; a single `convertColorValue`
call is sub-millisecond. No batching or memoisation infrastructure needed.

**Constraints**:
- New dependencies for this package: `@dtcg-editor/design-system` (Principle XII
  components + tokens), `neverthrow` (Principle V `Result`), `@dtcg-editor/errors`
  (Principle V/VI `UnknownError` + `Logger`). All are workspace-standard —
  `neverthrow` is cataloged and used by `token-core`; `@dtcg-editor/errors` is a
  workspace package. `colorjs.io` already present, no change.
- No literal design values anywhere in the editor's TSX/CSS (repo Principle XII).
- The React components perform no colour maths and no `ColorValue`
  re-validation; conversion lives in `src/utils/` and validation stays in
  `token-core` (package Principles I, II).

**Scale/Scope**: extended `src/utils/conversion.ts` in `token-editor-color`
(`convertColorValue` + `formatChannel` helper, ~13 `node:test` cases), one new
`ColorEditorOptions` field (`spaceSwitchTolerance`) + its schema/config test, ~5
small React components, 1 Storybook story extended. `token-core` untouched.

**Config**: the colour editor's `editorOptions` (in `dtcg-editor.config`) gains
`spaceSwitchTolerance?: number` — the ΔEOK threshold for a silent space switch
(FR-010a, from the 2026-08-29 clarification). Default `0.02` when unset.
Validated at config-load by `ColorEditorOptionsSchema`, exactly like the
existing `colorSpaces` option.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates are drawn from **both** the package constitution
(`packages/token-editor-color/.specify/memory/constitution.md`, **v2.0.0**) and
the repo-root constitution (`.specify/memory/constitution.md`, **v3.0.0**), per
the package constitution's "Scope & Precedence". Both were amended for this
feature: repo-root Principle VII and package Principle I now place UI-driven
perceptual colour conversion + `colorjs.io` in `token-editor-color`, not
`token-core`.

| # | Gate | Verdict | Notes |
|---|------|---------|-------|
| Pkg I (v2.0.0) | Parsing/validation/serialization from `token-core`, not re-implemented; colour conversion + gamut mapping owned here; `colorjs.io` allowed here; conversion module React-free + independently unit-tested | **PASS (by design)** | `convertColorValue` is a framework-free `src/utils/` module in this package, `node:test`-covered; `colorjs.io` stays this package's dependency; components import the plain function. `token-core`'s schemas/serialization are imported unchanged. |
| Pkg II | Editor is presentational, not a validation boundary; no new Zod schema/parse edge | **PASS** | Components consume `ColorValueSchema` via the contract; channel-input numeric hygiene is control-level, explicitly permitted by Principle II. The `src/utils/` conversion module adds no schema — it transforms already-typed values. The new `spaceSwitchTolerance` field extends the **existing** `ColorEditorOptionsSchema`, which validates host *config* at config-load time (the host's edge), not token values at runtime — same category as the existing `colorSpaces` option, not a new trust boundary in the editor. |
| Pkg III | Design-system is the only source of UI values; reuse its components | **PASS (with tracked dependency)** | `Input`/`Select`/`Dialog` reused; all design values via `--dtcg-ed-*`. The resting-dotted / hover-and-focus-solid underline treatment may not exist in the design system yet — per FR-019a it is contributed there (maintainer-owned) and consumed by token name; the editor ships **no** permanent local hardcode. See research.md R6. |
| Pkg IV | One component per folder; unit + a11y tests for every component | **PASS** | Structure below gives each of `ColorEditor`, `ColorFunctionValue`, `ChannelInput`, `ColorSpaceSelect`, `SpaceConversionDialog` its own folder with `*.test.tsx` + `*.a11y.test.tsx`. |
| Pkg V | DTCG 2025.10 Color module conformance; deviations flagged | **PASS** | No change to the colour spaces, channel ranges, or `$value` shapes. The legacy bare-hex deviation is already flagged in `token-core/color.ts`; this feature keeps it viewable/editable (FR-020) without widening it. |
| Root VII (v3.0.0) | `token-core` owns parsing/type/validation/**serialization**; UI-driven perceptual conversion + gamut mapping live in the `token-editor-*` package and may depend on a colour library there; one-way dependency | **PASS** | Exactly this layout: conversion + `colorjs.io` in `token-editor-color`; `token-core` imported read-only for schemas/serialization; direction stays `token-editor-color → token-core`. |
| Root VIII | New dependency needs a `plan.md` paper trail | **PASS** | New deps for this package: `@dtcg-editor/design-system` (workspace; Principle XII components + tokens), `neverthrow` (cataloged, already used by `token-core`; Principle V `Result`), `@dtcg-editor/errors` (workspace; Principle V/VI `UnknownError`/`Logger`). None is a genuinely-new third-party addition to the repo — all are workspace-standard and mandated by the principles they serve. `colorjs.io` is pre-existing and Approved for this package (repo-root v3.0.0). |
| Root X | PascalCase component + folder-per-component; unit + a11y coverage; 300-line soft ceiling; flag 3+ near-duplicate components | **PASS** | See structure. `ChannelInput` is deliberately one reusable component used 3–4× (channels + alpha), not duplicated. |
| Root XI | Modern defaults (ESM, etc.) | **PASS** | ESM `.ts`/`.tsx` with explicit source extensions, matching the package today. |
| Root XII | Design-system tokens + components only; no literals, even in local CSS | **PASS (with R6)** | As Pkg III. Any interim gap in the underline treatment resolves to "no underline until the design-system token exists", never a literal. |
| Root IX | Round-trip fidelity (parse→serialize lossless) | **N/A** | Concerns `token-core` parse/serialize, untouched. Space conversion is intentionally lossy and gated by the confirmation dialog; it is not a round-trip. |
| Root V / VI (via Pkg I) | Result pattern for fallible ops; DI for platform externalities | **PASS** | `convertColorValue` returns `Result<ColorConversion, UnknownError>`, wrapping any `colorjs.io` throw once with `fromThrowable` and logging via an injected `Logger` default. |

**Result**: All gates PASS or N/A. **Complexity Tracking is empty** — no violation
to justify. (The two constitution amendments are not "complexity to justify" —
they are deliberate governance changes made via `/speckit-constitution`, recorded
in each file's Sync Impact Report.)

### Post-Design Re-Check (after Phase 1)

Design artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`)
introduce no new violation:
- `convertColorValue` is a `src/utils/` module in `token-editor-color`, returns
  `Result` (Root V), injects `Logger` for the throw-wrap (Root VI), stays
  React-free and `node:test`-covered — Pkg I / Root VII upheld.
- The React components consume only the plain function + design-system
  components; they hold no colour maths and add no schema — Pkg II upheld.
- R6 resolves the underline treatment through `--dtcg-ed-*` `var()`s with a
  keyword fallback and a maybe-new design-system utility — no literal, no
  permanent local copy — Pkg III / Root XII / FR-019a upheld.
- Five single-purpose components, each foldered with unit + a11y tests — Pkg IV /
  Root X upheld; `ChannelInput` is one reused component (channels + alpha), not a
  near-duplicate set.
- 2026-08-29 clarification folded in: `spaceSwitchTolerance` extends the existing
  `ColorEditorOptionsSchema` (host config edge, not a new editor boundary — Pkg
  II); `formatChannel` is a pure display helper with no rounding (FR-002d). No
  gate affected.
Gate still **PASS**; Complexity Tracking still empty.

## Project Structure

### Documentation (this feature)

```text
packages/token-editor-color/specs/001-color-editor-inline/
├── plan.md              # This file
├── spec.md              # Feature spec (input)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── convert-color-value.md     # token-editor-color: src/utils convertColorValue() contract
│   └── editor-components.md       # token-editor-color: component prop contracts
├── checklists/
│   └── requirements.md  # spec quality checklist (already present)
└── tasks.md             # /speckit-tasks output — NOT created here
```

### Source code (affected paths)

```text
packages/token-core/
└── (UNCHANGED — schemas, parsing, serialization imported read-only)

packages/token-editor-color/
├── package.json                       # + @dtcg-editor/design-system, neverthrow, @dtcg-editor/errors   (colorjs.io stays)
└── src/
    ├── components/
    │   ├── ColorEditor/               # orchestrator: holds ColorValue, dispatches onChange, owns the conversion-confirmation flow
    │   │   ├── ColorEditor.tsx
    │   │   ├── ColorEditor.test.tsx
    │   │   └── ColorEditor.a11y.test.tsx
    │   ├── ColorFunctionValue/        # renders the inline monospace `space( c c c / a )` layout from a ColorObjectValue
    │   │   ├── ColorFunctionValue.tsx
    │   │   ├── ColorFunctionValue.test.tsx
    │   │   └── ColorFunctionValue.a11y.test.tsx
    │   ├── ChannelInput/              # one numeric value (channel or alpha) as an <Input> styled as plain text; commit/Escape semantics
    │   │   ├── ChannelInput.tsx
    │   │   ├── ChannelInput.test.tsx
    │   │   └── ChannelInput.a11y.test.tsx
    │   ├── ColorSpaceSelect/          # <Select> of offered spaces, styled as plain text
    │   │   ├── ColorSpaceSelect.tsx
    │   │   ├── ColorSpaceSelect.test.tsx
    │   │   └── ColorSpaceSelect.a11y.test.tsx
    │   ├── SpaceConversionDialog/     # <Dialog> listing per-channel before→after + Accept/Deny
    │   │   ├── SpaceConversionDialog.tsx
    │   │   ├── SpaceConversionDialog.test.tsx
    │   │   └── SpaceConversionDialog.a11y.test.tsx
    │   ├── ColorPreview/              # unchanged
    │   └── ColorValidationErrorHandler/  # unchanged
    ├── utils/
    │   ├── conversion.ts              # EXTENDED — add convertColorValue(value, targetSpace, tolerance, logger=consoleLogger) + formatChannel() display helper; keep colorValueToSrgbHex; drop srgbHexToColorSpaceComponents (FR-017 removes its only caller)
    │   ├── conversion.test.ts         # EXTENDED — + convertColorValue T1–T13 + formatChannel (node:test)
    │   ├── css-color.ts               # kept as-is (colorValueToCssColor — no colour lib, browser does the maths)
    │   ├── css-color.test.ts          # kept
    │   ├── range-validation.ts        # kept (COMPONENT_RANGES, checkColorValueIssues) — FR-021 messages & channel labels
    │   └── range-validation.test.ts   # kept
    ├── components/ColorEditor/ColorEditor.module.css   # replaced: no bespoke literals; consumes --dtcg-ed-* only (or removed if styling is all utility-class based)
    ├── configuration.ts               # + spaceSwitchTolerance? on ColorEditorOptions / ColorEditorOptionsSchema (FR-010a)
    ├── configuration.test.ts          # + cases for the new field (accepts 0 / positive / absent; rejects negative / non-number)
    ├── token-type.ts                  # unchanged wiring
    └── index.ts                       # + export convertColorValue, formatChannel & ColorConversion/ChannelChange/ConversionNote types; drop the srgbHexToColorSpaceComponents re-export

packages/token-editor-color/src/components/ColorEditor/ColorEditor.stories.tsx
    # extended: + OutOfGamut, + WithAlpha, + LegacyHex, + NoneChannel stories; interaction to open the conversion dialog
```

**Structure Decision**: Single-package change in `packages/token-editor-color`.
The perceptual conversion capability is **added to the existing
`src/utils/conversion.ts`** (already `colorjs.io`-backed, already `node:test`-
covered, already framework-free) as `convertColorValue`, rather than a new
package or a `token-core` module — matching repo-root Principle VII (v3.0.0) and
package Principle I (v2.0.0). `token-core` is not touched; its schemas and
serialization are imported read-only. The React layer is rebuilt around five
small single-purpose components under `src/components/*/`, each PascalCase in its
own folder with co-located unit + a11y tests (Pkg IV / Root X).
`utils/css-color.ts` and `utils/range-validation.ts` stay put.

## Complexity Tracking

> No Constitution Check violations. Section intentionally empty.
