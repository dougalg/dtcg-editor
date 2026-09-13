# Implementation Plan: Stroke Style Token Editor Support

**Branch**: `worktree-stroke-style-token-support` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-stroke-style-token-support/spec.md`

## Summary

Add first-class editor support for the DTCG `strokeStyle` token type. `token-core` gains a
`StrokeStyleValueSchema` (Zod `z.union` of the 8-keyword enum and a `{ dashArray, lineCap }`
object, reusing the existing `DimensionValueSchema` for each `dashArray` entry) plus its exported
inferred type. A new package, `packages/token-editor-stroke-style`, mirrors
`token-editor-font-weight`/`token-editor-cubic-bezier`'s structure: a `StrokeStyleEditor`
component (a mode toggle between named-style and custom-dash-pattern, User Story 1), a
`StrokeStylePreview` component mirroring `FontWeightPreview`/`ColorPreview`'s
validate-then-render pattern (User Story 2), and a `strokeStyleTokenType: TokenTypeContract<StrokeStyleValue>`
wiring module. The new type is registered in `apps/web-app/lib/token-editors/built-in.ts`'s
`BUILT_IN_TOKEN_TYPES`/`builtInContractsByType`, and the package is added to
`vitest.config.mts`'s `packages` array and `turbo.json`'s Storybook `dependsOn` lists.

## Technical Context

**Language/Version**: TypeScript (strict, per Principle III), no new runtime requirement.

**Primary Dependencies**: Zod (`token-core`'s `StrokeStyleValueSchema`, reusing
`DimensionValueSchema`), React, `@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract`,
and `@dtcg-editor/design-system` (for the mode-switch `RadioGroup` and the keyword/unit/line-cap
`Select`s — already approved, already used by `token-editor-color`). No new third-party
dependency — see Constitution Check (Principle VIII) below.

**Storage**: N/A — no persistence layer.

**Testing**: `node:test` for `token-core`'s schema unit test (`stroke-style.test.ts`); Vitest +
`@testing-library/react` (jsdom) for `StrokeStyleEditor`/`StrokeStylePreview` unit tests; Vitest
Browser Mode + `axe-core` for the two components' `.a11y.test.tsx` tiers — identical tooling to
every other `token-editor-*` package.

**Target Platform**: Web (Next.js app, `apps/web-app`).

**Project Type**: Library package (`packages/token-editor-stroke-style`) consumed by the web app.

**Performance Goals**: N/A — no new perf-sensitive path.

**Constraints**: Must not modify `packages/token-editor-contract/src/contract.ts` — `Preview` is
already required there; this feature supplies one, per every other built-in type. Must not modify
`docs/backlog.md`'s claim line except via `archive-task` at the end. `apps/web-app/lib/token-editors/built-in.ts`
is a shared file another in-flight feature (`fontFamily`, in a sibling worktree) also edits — a
merge conflict there at integration time is expected and is the coordinator's concern, not a
reason to skip registration here.

**Scale/Scope**: One new `token-core` module + test, one new `token-editor-*` package (Editor +
Preview + contract wiring + full test coverage), one registration edit in `built-in.ts`
(+ its existing test extended), one entry added to `vitest.config.mts` and `turbo.json`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (DTCG Spec Compliance)**: `StrokeStyleValueSchema` models the 2025.10 Format
  spec's Stroke Style type exactly — `z.union([z.enum([...8 keywords]), z.object({ dashArray:
  z.array(DimensionValueSchema), lineCap: z.enum(["round","butt","square"]) })])`. **PASS**.
- **Principle II/VII (Feature-Based Organization / Token-Editor Package Contract)**: schema +
  type definition live in `token-core` (`stroke-style.ts`); `Editor`, `Preview`, and contract
  wiring live in the new `token-editor-stroke-style` package; dependency direction is
  `token-editor-stroke-style → token-core`, never reversed. **PASS**.
- **Principle III (TypeScript Strictness)**: new package's `tsconfig.json` extends
  `tsconfig.base.json` unmodified, matching every sibling package. **PASS**.
- **Principle IV (Validation at the Edges)**: `StrokeStyleValueSchema.safeParse` is the single
  validation point (host-side validation via `valueSchema`, and `StrokeStylePreview`'s own
  defensive re-parse of an untyped resolved value, matching `FontWeightPreview`'s established
  pattern). **PASS**.
- **Principle VIII (Minimal Dependencies)**: no new third-party dependency. The mode switch uses
  the design system's existing `RadioGroup`; the keyword/unit/line-cap pickers use the existing
  `Select` — both already used elsewhere in `token-editor-color` (`ColorSpaceSelect`,
  `ColorFunctionValue`'s `RadioGroup`-adjacent controls). **PASS** — nothing to flag.
- **Principle IX (Round-Trip Fidelity)**: `serializeValue: (value) => value` (identity). **PASS**.
- **Principle X (Component Granularity & Testing)**: `StrokeStyleEditor` and `StrokeStylePreview`
  each get their own PascalCase folder with co-located `.tsx`/`.test.tsx`/`.a11y.test.tsx`/
  `.module.css`, one component per file. **PASS**.
- **Principle XII (Design System Usage)**: checked first whether a radio-group/select
  design-system component already exists for the mode switch, per this feature's brief — it
  does (`packages/design-system/src/components/RadioGroup`, `.../Select`), already consumed by
  `token-editor-color`. `StrokeStyleEditor` uses both rather than reimplementing a toggle/picker
  with plain HTML; styling elsewhere (dash-segment number inputs, labels) uses only
  `--dtcg-ed-*` custom properties, matching `DimensionEditor.module.css`'s pattern. **PASS**.
- **Principle XIII (TDD, NON-NEGOTIABLE)**: every behavior (schema union branches and malformed
  input, editor mode-switching, preview render/decline) was driven by a test written first,
  observed failing, then made to pass with the smallest change — see `tdd/cycle-log.md`.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/012-stroke-style-token-support/
├── plan.md              # This file
├── tasks.md
└── tdd/
    ├── test-list.md
    └── cycle-log.md
```

### Source Code (repository root)

```text
packages/token-core/src/
├── stroke-style.ts                   # StrokeStyleValueSchema + StrokeStyleValue (new)
├── stroke-style.test.ts              # node:test unit coverage (new)
└── index.ts                          # + export StrokeStyleValueSchema/StrokeStyleValue (edit)

packages/token-editor-stroke-style/    # New package
├── package.json
├── tsconfig.json
├── vitest.setup.ts
├── vitest-a11y-tags.ts
├── src/
│   ├── index.ts
│   ├── token-type.ts                 # strokeStyleTokenType: TokenTypeContract<StrokeStyleValue>
│   ├── css-modules.d.ts
│   ├── vitest-env.d.ts
│   └── components/
│       ├── StrokeStyleEditor/
│       │   ├── StrokeStyleEditor.tsx
│       │   ├── StrokeStyleEditor.module.css
│       │   ├── StrokeStyleEditor.stories.tsx
│       │   ├── StrokeStyleEditor.test.tsx
│       │   └── StrokeStyleEditor.a11y.test.tsx
│       └── StrokeStylePreview/
│           ├── StrokeStylePreview.tsx
│           ├── StrokeStylePreview.module.css
│           ├── StrokeStylePreview.test.tsx
│           └── StrokeStylePreview.a11y.test.tsx

apps/web-app/lib/token-editors/built-in.ts        # register "strokeStyle" (edit)
apps/web-app/lib/token-editors/built-in.test.ts   # extend assertion (edit)
apps/web-app/package.json                          # + workspace dependency (edit, via pnpm add)
vitest.config.mts                                   # add package to `packages` array (edit)
turbo.json                                          # add package to Storybook dependsOn (edit)
```

**Structure Decision**: Mirrors the `token-editor-font-weight`/`token-editor-cubic-bezier`
precedent package-for-package. `token-core` remains the single owner of the type's schema; the
new package owns only editor UI + contract wiring, per Principle VII.

## Design Decisions

- **Mode switch: design-system `RadioGroup`, not a `Select`.** The task brief explicitly asks to
  check for an existing radio-group/select component before reaching for plain HTML — the
  design system has both (`RadioGroup`, `Select`), and both are already used inside
  `token-editor-color`. A two-way, mutually-exclusive, always-visible mode choice (named vs.
  custom) is a better fit for a `RadioGroup` (both options visible at once, one click to switch)
  than a `Select` (which would hide the alternative behind a dropdown for a binary choice).
  `Select` is used for every actual value picker within a mode (the 8 keywords, the per-segment
  unit, the line cap) since those are exactly `ColorSpaceSelect`'s "pick one of a fixed small
  set" shape.
- **Custom-dash-pattern editor: one row per `dashArray` entry (value + unit), plus add/remove
  buttons, plus a line-cap `Select`.** `dashArray` is spec-unbounded in length, so a fixed-arity
  UI (e.g. always exactly 2 fields) would not cover the full value space; a dynamic list with
  add/remove is the smallest UI that can express every valid `dashArray`. Each row reuses
  `DimensionEditor`'s value+unit shape exactly (a number input plus a `px`/`rem` `Select`) since
  each entry literally is a `DimensionValue`.
- **Switching modes writes a fixed default, not a translation of the previous value.** Matching
  `FontWeightEditor`'s "no lossy conversion between forms" precedent: switching to named-style
  always writes `"solid"`; switching to custom always writes `{ dashArray: [{ value: 4, unit:
  "px" }], lineCap: "butt" }`. No attempt is made to infer a "closest" dash pattern for a given
  keyword or vice versa — the DTCG spec defines no such mapping, and inventing one would be
  unrequested behavior.
- **Preview summary for the custom form: `"dashed (<lineCap>)"`.** The custom object has no
  keyword of its own to display, and dumping the full JSON (a `dashArray` of arbitrary length)
  would not read as "short, readable text" (spec Acceptance Scenario 2.2). Since a dash-pattern
  object is visually a dashed line, `"dashed (<lineCap>)"` communicates the closest named
  concept plus the one extra fact (line cap) that most affects its rendered look, without
  claiming false precision about the exact dash lengths. This is Preview-only rendering — it
  changes no data, per Principle IX.
- **No new dependency.** `zod`, `react`, `@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract`,
  `@dtcg-editor/design-system` are all already-approved dependencies used identically to existing
  packages (`design-system` specifically already a dependency of `token-editor-color`).

## Complexity Tracking

_No Constitution Check violations — table omitted._
