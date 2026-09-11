# Phase 1 Data Model: Color Token Preview CSS-Style Formatting

This feature introduces no new entity, field, or state transition. It
changes how one existing entity is *rendered*, not its shape. Recorded here
for completeness against the spec's Key Entities section.

## Color Token Preview (existing, unchanged shape)

The read-only rendering path (`ColorPreview`) for a color value the user is
not currently editing.

| Aspect | Before this feature | After this feature |
|---|---|---|
| Input prop | `value: unknown` (a resolved reference's value, re-validated via `ColorValueSchema.safeParse` before use) | unchanged |
| Swatch | `<Swatch value={value} />`, computes its rendered color via `colorValueToCssColor` | unchanged |
| Text | `formatRaw(value)` → `JSON.stringify(value)` | `colorValueToCssColor(parsed.data)` — same value the swatch already computed from |
| Decline behavior (invalid value) | Swatch renders `null`; `formatRaw` still stringifies whatever was passed | Both swatch and text decline together, since both now gate on the same `ColorValueSchema.safeParse` result (see quickstart.md Scenario 3) |

No change to `ColorValue` itself (`@dtcg-editor/token-core`'s
`ColorValueSchema` / `ColorObjectValue` / legacy hex string union) — this
feature is strictly a presentation-layer change over that existing type.

## Color Token Editor (existing, explicitly out of scope)

`ColorEditor` and its subtree (`ColorFunctionValue`, `ChannelInput`,
`ColorSpaceSelect`, `SpaceConversionDialog`) are unmodified by this
feature. Listed here only to record that no shared model or utility they
depend on is touched either — `colorValueToCssColor` is consumed
read-only by both `Swatch` (used by both `Editor` and `Preview`) and, after
this feature, `ColorPreview`'s text; nothing about `ColorEditor`'s own
per-channel editing model changes.
