# Quickstart: Color Token Preview CSS-Style Formatting

Validates the feature end-to-end. No `contracts/` directory: this feature
introduces no new external interface — the `TokenTypeContract`'s `Preview`
slot (`{ value: unknown }` → `ReactElement | null`) is unchanged; see
`data-model.md`.

## Prerequisites

```sh
cd packages/token-editor-color
pnpm install   # from repo root, if not already done
```

## Run the package's own test stack (plain `.ts` logic)

```sh
pnpm --filter @dtcg-editor/token-editor-color test
# equivalent to: node --test 'src/**/*.test.ts'
```

`css-color.test.ts` (unchanged, already covers every DTCG color space) must
stay green throughout.

## Run the component-level test stack (`.tsx` + a11y, root-aggregated Vitest)

```sh
# from repo root
pnpm exec vitest run --project 'packages/token-editor-color:unit' ColorPreview
pnpm exec vitest run --project 'packages/token-editor-color:a11y' ColorPreview
```

(Project names per `vitest.config.ts`'s `packages.flatMap(...)` aggregation
— `<pkgRoot>:unit` / `<pkgRoot>:a11y` where `pkgRoot` is
`"packages/token-editor-color"`.)

## Scenario 1 — Preview renders CSS syntax, not JSON (spec US1, FR-001)

1. Render `<ColorPreview value={{ colorSpace: "oklch", components: [0.7, 0.1, 180], alpha: 0.8 }} />`.
2. **Expect**: the rendered text is `oklch(0.7 0.1 180 / 0.8)` (exactly what
   `colorValueToCssColor` returns for this input — see `css-color.test.ts`
   for the full space-by-space mapping), not
   `{"colorSpace":"oklch","components":[0.7,0.1,180],"alpha":0.8}`.

## Scenario 2 — Swatch and text always agree (spec FR-002, SC-002)

1. For each of the 14 DTCG color spaces, render `<ColorPreview>` with a
   representative value.
2. **Expect**: the swatch's `--swatch-color` custom property and the
   rendered text are both derived from the same `colorValueToCssColor(...)`
   call — assert this by construction (one call site) rather than by
   string-comparing two independently-computed values.

## Scenario 3 — Invalid value still declines entirely (spec US3, FR-005)

1. Render `<ColorPreview value={{ not: "a color" }} />`.
2. **Expect**: nothing renders (`null`) — no swatch, no text, no malformed
   CSS-looking string.

## Scenario 4 — Legacy hex is unaffected (spec FR-004)

1. Render `<ColorPreview value="#3366ff" />`.
2. **Expect**: text renders as `#3366ff`, unchanged from current behavior.

## Scenario 5 — Editor is untouched (spec FR-003, User Story 2)

1. Run the existing `ColorEditor` test suite in full:
   ```sh
   pnpm exec vitest run --project 'packages/token-editor-color:unit' ColorEditor
   pnpm exec vitest run --project 'packages/token-editor-color:a11y' ColorEditor
   ```
2. **Expect**: zero failures, zero changed assertions relative to `main` —
   this feature's diff must not touch any file under `ColorEditor/`,
   `ColorFunctionValue/`, `ChannelInput/`, `ColorSpaceSelect/`, or
   `SpaceConversionDialog/`.

## Full package gate

```sh
pnpm test   # repo-root aggregate gate: build, vitest projects, package
            # node:test suites, commitlint — per tdd-profile.md
```
