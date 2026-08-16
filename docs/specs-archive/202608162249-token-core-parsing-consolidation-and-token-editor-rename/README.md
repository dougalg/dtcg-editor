# Token-Core Parsing Consolidation & Token-Editor Rename

Implemented on: 2026-08-16

Moves every DTCG token type's structural value schema and derived type definitions
(`ColorValueSchema`/`ColorObjectValueSchema`/`LegacyHexColorValueSchema`/`DimensionValueSchema`)
into `token-core`, which becomes the single source of truth for DTCG-compliance parsing
across all token types — not just the generic node/group document shape it already owned.

`token-type-color`, `token-type-dimension`, and `token-type-contract` are renamed
`token-editor-color`/`token-editor-dimension`/`token-editor-contract` and trimmed to hold
only their `Editor` UI, editor-specific configuration, `TokenTypeContract` wiring, and
(for color) a new `src/utils/` subfolder grouping value-adjacent utilities that are *not*
structural parsing: `range-validation.ts` (`checkColorValueIssues`/`COMPONENT_RANGES` —
data/range validation of an already-structurally-valid value, user-recoverable in the
Editor UI), `conversion.ts` (native `<input type="color">` widget interop, `colorjs.io`),
and `css-color.ts` (CSS rendering). None of the three moved to `token-core`, since none is
needed by a headless DTCG consumer (validator, CLI, server-side check) — only the raw
"does this value parse into the type's shape at all" schema does.

Every `apps/web-app` consumer was repointed to the renamed packages and to `token-core`'s
new exports, with zero intended change to parsing, validation, conversion, or editor
behavior — verified against a captured pre-refactor baseline (`pnpm build`/`lint`/`test`
all green, 173/173 unit+a11y tests, 5/6 e2e specs with one pre-existing, unrelated flake
present both before and after).

## Key files

- `packages/token-core/src/color.ts`, `dimension.ts` — new structural schema modules
- `packages/token-editor-color/src/utils/` — new subfolder (range-validation.ts, conversion.ts, css-color.ts)
- `packages/token-editor-{color,dimension,contract}/` — renamed from `token-type-*`

## Notable decisions

- `token-core`'s scope for this feature is narrowly DTCG-compliance parsing/structural
  validation only — its own broader internal reorganization was explicitly deferred to a
  separate, future respecification.
- `colorjs.io` never moved: it's used only by `conversion.ts`, which itself stays in
  `token-editor-color` as editor-interop code, not structural parsing.

See `docs/project.md`'s Architecture Decisions table for the full rationale trail.
