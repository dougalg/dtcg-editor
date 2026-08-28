# Implementation Plan: Inline CSS-Function Color Editor

**Branch**: `001-color-editor-inline` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `packages/token-editor-color/specs/001-color-editor-inline/spec.md`

## Summary

Rework `@dtcg-editor/token-editor-color`'s `Editor` from a stacked-label form into
a single inline, monospace CSS-function widget (e.g. `oklch( 0.7 0.15 145 / 12 )`)
where every part is a live control from first render — each channel and the alpha
are numeric inputs, the colour space is a `Select` — all styled to read as plain
underlined text until hovered or focused. Switching colour space converts the
*perceived* colour (not the raw channel numbers); an inexact/gamut-mapped
conversion is confirmed through an Accept/Deny dialog before anything is written.

Technical approach: the perceptual conversion + gamut-mapping capability is added
to `@dtcg-editor/token-core` (which already owns colour value shape and is where
the repo constitution puts all colour maths), backed by the already-approved
`colorjs.io` — which moves from the editor package into `token-core`. The editor
package becomes purely presentational: it composes `token-core`'s new
`convertColorValue` with `@dtcg-editor/design-system`'s `Input` / `Select` /
`Dialog` components and `--dtcg-ed-*` tokens, and holds no colour maths and no
direct colour-library dependency.

## Technical Context

**Language/Version**: TypeScript (strict; repo `tsconfig.base.json` — `strict`,
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
`noImplicitReturns`; `any` lint-banned)

**Primary Dependencies**:
- `@dtcg-editor/token-core` — colour value types/schemas + **new** `convertColorValue`
- `@dtcg-editor/token-editor-contract` — `TokenTypeContract` / `TokenTypeEditorProps`
- `@dtcg-editor/design-system` — `Input`, `Select`, `Dialog` components; `--dtcg-ed-*` tokens (**new dependency of this package**)
- `colorjs.io` (`/fn` entry) — **relocated** from `token-editor-color` to `token-core`
- `react` (catalog), `zod` (catalog, existing), `neverthrow` (token-core side)

**Storage**: N/A — the editor is a controlled component; it reads a `ColorValue`
prop and emits changes via `onChange`. No persistence in this feature.

**Testing**:
- `token-core`: `node:test` + `node:assert/strict` (package renders no JSX) for `convertColorValue`
- `token-editor-color`: Vitest + `@testing-library/react` (`jsdom`) unit tests per component; Vitest Browser Mode (`@vitest/browser` + Playwright, real Chromium) + `axe-core` WCAG 2.2 AA `.a11y.test.tsx` per component
- Storybook: extend `Editors/ColorEditor` story (repo-root `.storybook/`)

**Target Platform**: Modern evergreen browsers (the web app) and as a published
library package. No IE/legacy targets.

**Project Type**: pnpm-workspace monorepo — one shared library change
(`packages/token-core`) plus one editor-UI plugin package rework
(`packages/token-editor-color`).

**Performance Goals**: Interaction stays at 60 fps; a single `convertColorValue`
call is sub-millisecond. No batching or memoisation infrastructure needed.

**Constraints**:
- No new third-party runtime dependency — `colorjs.io` is relocated, not added
  (it is already an Approved Dependency scoped to `token-core`).
- No literal design values anywhere in the editor's TSX/CSS (repo Principle XII).
- The editor performs no colour maths and no `ColorValue` re-validation
  (package Principles I, II).

**Scale/Scope**: 1 new `token-core` module (~1 function + helpers, ~10 test
cases), ~5 small React components in `token-editor-color`, 1 Storybook story
extended, existing `conversion.ts` / `css-color.ts` deleted from the editor
after their logic lands in `token-core`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates are drawn from **both** the package constitution
(`packages/token-editor-color/.specify/memory/constitution.md`, v1.0.0) and the
repo-root constitution (`.specify/memory/constitution.md`, v2.7.1), per the
package constitution's "Scope & Precedence".

| # | Gate | Verdict | Notes |
|---|------|---------|-------|
| Pkg I | Conversion & parsing live in `token-core`; no direct colour-library dependency in this package | **PASS (by design)** | `convertColorValue` is added to `token-core`; `colorjs.io` moves out of `token-editor-color` into `token-core`; the editor imports only the plain function. |
| Pkg II | Editor is presentational, not a validation boundary; no new Zod schema/parse edge | **PASS** | Editor keeps consuming `ColorValueSchema` from the contract; channel-input numeric hygiene (reject non-numeric) is control-level input handling, not a system trust boundary, and is explicitly permitted by Principle II. |
| Pkg III | Design-system is the only source of UI values; reuse its components | **PASS (with tracked dependency)** | `Input`/`Select`/`Dialog` reused; all design values via `--dtcg-ed-*`. The resting-dotted / hover-and-focus-solid underline treatment may not exist in the design system yet — per FR-019a it is contributed there (maintainer-owned) and consumed by token name; the editor ships **no** permanent local hardcode. See research.md R6. |
| Pkg IV | One component per folder; unit + a11y tests for every component | **PASS** | Structure below gives each of `ColorEditor`, `ColorFunctionValue`, `ChannelInput`, `ColorSpaceSelect`, `SpaceConversionDialog` its own folder with `*.test.tsx` + `*.a11y.test.tsx`. |
| Pkg V | DTCG 2025.10 Color module conformance; deviations flagged | **PASS** | No change to the colour spaces, channel ranges, or `$value` shapes. The legacy bare-hex deviation is already flagged in `token-core/color.ts`; this feature keeps it viewable/editable (FR-020) without widening it. |
| Root VII | `token-core` owns parsing/type/validation/**conversion**; one-way dependency | **PASS (restored)** | This feature moves colour conversion to where Principle VII and the Approved-Dependencies list already say it belongs. Dependency direction stays `token-editor-color → token-core`. |
| Root VIII | New dependency needs a `plan.md` paper trail | **N/A / PASS** | No new dependency. `colorjs.io` is relocated within the workspace; it is already listed as Approved (`packages/token-core` only, via `colorjs.io/fn`). Documented in research.md R1. |
| Root X | PascalCase component + folder-per-component; unit + a11y coverage; 300-line soft ceiling; flag 3+ near-duplicate components | **PASS** | See structure. `ChannelInput` is deliberately one reusable component used 3–4× (channels + alpha), not duplicated. |
| Root XI | Modern defaults (ESM, etc.) | **PASS** | ESM `.ts`/`.tsx` with explicit source extensions, matching the package today. |
| Root XII | Design-system tokens + components only; no literals, even in local CSS | **PASS (with R6)** | As Pkg III. Any interim gap in the underline treatment resolves to "no underline until the design-system token exists", never a literal. |
| Root IX | Round-trip fidelity (parse→serialize lossless) | **N/A** | Concerns `token-core` parse/serialize, untouched here. Space conversion is intentionally lossy and gated by the confirmation dialog; it is not a round-trip. |

**Result**: All gates PASS or N/A. **Complexity Tracking is empty** — no violation
to justify.

### Post-Design Re-Check (after Phase 1)

Design artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`)
introduce no new violation:
- `convertColorValue` lives in `token-core`, returns `Result` (Principle V),
  injects `Logger` for the throw-wrap (Principle VI), stays React-free — Pkg I /
  Root VII upheld.
- The editor consumes only the plain function + design-system components; it
  keeps no colour maths and adds no schema — Pkg II upheld.
- R6 resolves the underline treatment through `--dtcg-ed-*` `var()`s with a
  keyword fallback and a maybe-new design-system utility — no literal, no
  permanent local copy — Pkg III / Root XII / FR-019a upheld.
- Five single-purpose components, each foldered with unit + a11y tests — Pkg IV /
  Root X upheld; `ChannelInput` is one reused component (channels + alpha), not a
  near-duplicate set.
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
│   ├── convert-color-value.md     # token-core: convertColorValue() contract
│   └── editor-components.md       # token-editor-color: component prop contracts
├── checklists/
│   └── requirements.md  # spec quality checklist (already present)
└── tasks.md             # /speckit-tasks output — NOT created here
```

### Source code (affected paths)

```text
packages/token-core/
├── package.json                       # + colorjs.io dependency (relocated)
└── src/
    ├── color.ts                       # unchanged (types/schemas)
    ├── color-convert.ts               # NEW — convertColorValue() + colorjs.io space registration + CSS-color string helper
    ├── color-convert.test.ts          # NEW — node:test coverage
    └── index.ts                       # + export convertColorValue, ColorConversion types, colorValueToCssColor

packages/token-editor-color/
├── package.json                       # + @dtcg-editor/design-system; - colorjs.io
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
    │   ├── conversion.ts              # DELETED (logic moved to token-core)
    │   ├── conversion.test.ts         # DELETED
    │   ├── css-color.ts               # DELETED (moved to token-core)
    │   ├── css-color.test.ts          # DELETED
    │   ├── range-validation.ts        # kept (COMPONENT_RANGES, checkColorValueIssues) — used for FR-021 messages & channel labels
    │   └── range-validation.test.ts   # kept
    ├── components/ColorEditor/ColorEditor.module.css   # replaced: no bespoke literals; consumes --dtcg-ed-* only (or removed if styling is all utility-class based)
    ├── configuration.ts               # unchanged (colorSpaces allow-list)
    ├── token-type.ts                  # unchanged wiring
    └── index.ts                       # re-exports updated (drop conversion/css-color re-exports; they now come from token-core)

packages/token-editor-color/src/components/ColorEditor/ColorEditor.stories.tsx
    # extended: + OutOfGamut, + WithAlpha, + LegacyHex, + NoneChannel stories; interaction to open the conversion dialog
```

**Structure Decision**: Two-package change. `packages/token-core` gains the
colour-conversion capability (one new module + tests + index exports, one
`package.json` dependency line relocated). `packages/token-editor-color` is
re-built around five small single-purpose components under
`src/components/*/`, each PascalCase-named in its own folder with co-located
unit + a11y tests, per package Principle IV and repo Principle X. The editor's
`utils/conversion.ts` and `utils/css-color.ts` are removed once their logic
lives in `token-core`; `utils/range-validation.ts` stays (it is UI-facing
labelling and the FR-021 in-range messaging, not colour maths).

## Complexity Tracking

> No Constitution Check violations. Section intentionally empty.
