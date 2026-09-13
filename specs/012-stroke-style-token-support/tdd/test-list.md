---
feature: 012-stroke-style-token-support
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 7
suite_baseline: green
---

# Test List: Stroke Style Token Editor Support

**Baseline**: `pnpm exec vitest run` -> 781 passed prior to this feature's first test (at the
`worktree-font-family-token-support` claim commit this branch started from);
`pnpm --filter @dtcg-editor/token-core test` -> 147 passed. Fully green — no pre-existing reds to
account for at this feature's start.

This package has no dedicated Playwright acceptance layer of its own, matching every other
`token-editor-*` package's precedent (per-type editors are validated at the component-render
tier). The outer loop below treats each component's rendered behavior as this feature's
acceptance tier.

## Outer loop: acceptance behaviors

| id | behavior | traces | state | test |
| --- | --- | --- | --- | --- |
| A1 | `strokeStyle` is a registered built-in type | AC 1.1, FR-001 | DONE | `built-in.test.ts::BUILT_IN_TOKEN_TYPES includes ... and strokeStyle` |
| A2 | Picking a different named style updates `$value` to that keyword | AC 1.2 | DONE | `StrokeStyleEditor.test.tsx::selecting a different named style calls onChange with that exact string` |
| A3 | A custom `{dashArray,lineCap}` value shows the custom mode with its fields | AC 1.3 | DONE | `StrokeStyleEditor.test.tsx::renders the custom-dash-pattern mode selected with dash entries and line cap shown` |
| A4 | Switching mode writes a valid default for the new mode | AC 1.4 | DONE | `StrokeStyleEditor.test.tsx::switching to custom-dash-pattern mode calls onChange with a default dash object` / `::switching to named-style mode calls onChange with the solid keyword` |
| A5 | Editing dash fields/lineCap/add/remove updates `$value`; invalid edits are not committed | AC 1.5 | DONE | `StrokeStyleEditor.test.tsx` (value/unit/lineCap/add/remove/non-numeric cases) |
| A6 | A named-style value shows as its keyword text in preview | AC 2.1 | DONE | `StrokeStylePreview.test.tsx::renders a named-style value as its keyword text` |
| A7 | A custom value shows a short readable summary in preview | AC 2.2 | DONE | `StrokeStylePreview.test.tsx::renders a custom dash-pattern value as a short summary` |
| A8 | An invalid value declines to render in preview | AC 2.3 | DONE | `StrokeStylePreview.test.tsx::declines to render for a value that fails schema validation` |

## Inner loop: unit behaviors

### `packages/token-core/src/stroke-style.ts`

| id | behavior | test |
| --- | --- | --- |
| U1-U8 | Accepts each of the 8 named-style keywords | `stroke-style.test.ts` (parameterized) |
| U9 | Rejects an unrecognized keyword string | `::rejects an unrecognized keyword string` |
| U10 | Accepts a well-formed `{dashArray,lineCap}` object | `::accepts a well-formed dashArray/lineCap object` |
| U11 | Accepts an empty `dashArray` | `::accepts an empty dashArray` |
| U12 | Rejects a malformed `dashArray` entry (missing unit) | `::rejects an object with a malformed dashArray entry` |
| U13 | Rejects an invalid `dashArray` entry unit | `::rejects an object with an invalid dashArray entry unit` |
| U14 | Rejects an invalid `lineCap` | `::rejects an object with an invalid lineCap` |
| U15 | Rejects a missing `lineCap` | `::rejects an object missing lineCap` |
| U16 | Rejects a non-string/non-object shape | `::rejects a non-string/non-object shape (a number)` |

### `packages/token-editor-stroke-style/src/components/StrokeStyleEditor/StrokeStyleEditor.tsx`

| id | behavior | test |
| --- | --- | --- |
| U17 | Named mode selected + current keyword shown | `::renders the named-style mode selected with the current keyword shown` |
| U18 | Offers all 8 named styles | `::offers all 8 named styles in the style select` |
| U19 | Selecting a keyword calls onChange | `::selecting a different named style calls onChange with that exact string` |
| U20 | Custom mode selected with entries/lineCap shown | `::renders the custom-dash-pattern mode selected with dash entries and line cap shown` |
| U21 | Switching to custom mode calls onChange with a default object | `::switching to custom-dash-pattern mode calls onChange with a default dash object` |
| U22 | Switching to named mode calls onChange with "solid" | `::switching to named-style mode calls onChange with the solid keyword` |
| U23 | Editing a dash value calls onChange | `::editing a dash segment's value calls onChange with the updated dashArray` |
| U24 | Editing a dash unit calls onChange | `::editing a dash segment's unit calls onChange with the updated dashArray` |
| U25 | Changing lineCap calls onChange | `::changing the line cap calls onChange with the updated lineCap` |
| U26 | Adding a segment calls onChange | `::adding a segment calls onChange with an appended dash entry` |
| U27a | Removing a segment calls onChange | `::removing a segment calls onChange with that entry removed` |
| U27b | A non-numeric dash value does not call onChange | `::entering a non-numeric dash segment value does not call onChange` |
| U28 | No WCAG 2.2 AA violations (both modes) | `StrokeStyleEditor.a11y.test.tsx` |

### `packages/token-editor-stroke-style/src/components/StrokeStylePreview/StrokeStylePreview.tsx`

| id | behavior | test |
| --- | --- | --- |
| U29 | Renders a named-style value as text | `::renders a named-style value as its keyword text` |
| U30 | Renders a custom value as a short summary | `::renders a custom dash-pattern value as a short summary` |
| U31 | Declines to render an invalid value | `::declines to render for a value that fails schema validation` |
| U32 | No WCAG 2.2 AA violations (both forms) | `StrokeStylePreview.a11y.test.tsx` |

### `apps/web-app/lib/token-editors/built-in.ts`

| id | behavior | test |
| --- | --- | --- |
| U33 | `BUILT_IN_TOKEN_TYPES` includes `"strokeStyle"` | `built-in.test.ts` |

## Out of scope

- A dedicated Playwright acceptance spec: no `token-editor-*` package has one; component-render
  tests are this feature's acceptance tier (see note above).
- A translation table between named styles and dash patterns (Preview or Editor): explicitly
  rejected in `plan.md`'s Design Decisions.

## Verification commands

- Single test (this stack): `pnpm exec vitest run <file> -t "<name>"`
- Single test (token-core, node:test): `node --test --test-name-pattern "<name>" <file>`
- Full suite (fast): `pnpm exec vitest run` and `pnpm --filter @dtcg-editor/token-core test`
- Full suite (CI gate): `pnpm test`
