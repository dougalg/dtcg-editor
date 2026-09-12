# Research: Duration Token Support

No `NEEDS CLARIFICATION` markers were left in `plan.md`'s Technical Context — this feature is a structural analog of the already-implemented `dimension` token type, so the design decisions below are precedent lookups rather than open research questions.

## Decision: `DurationValueSchema` shape

- **Decision**: `z.object({ value: z.number().min(0), unit: z.enum(["ms", "s"]) })`.
- **Rationale**: designtokens.org/tr/2025.10/format's Duration type defines `$value` as `{ value: number (>= 0), unit: "ms" | "s" }`. `dimension.ts`'s existing schema is `z.object({ value: z.number(), unit: z.enum(["px", "rem"]) })` — identical shape, but dimension's `value` is intentionally unconstrained (negative dimensions, e.g. negative margins, are valid CSS). Duration's spec text explicitly requires non-negative values, so `.min(0)` is added — a deliberate, spec-driven deviation from copying `dimension.ts` verbatim, called out here per Principle I ("any deviation from spec-adjacent precedent must be flagged, not silent").
- **Alternatives considered**: Reusing `DimensionValueSchema` with a different unit enum via generics — rejected, since `token-core`'s existing pattern (one file per type, e.g. `color.ts`, `dimension.ts`) doesn't use shared generic schema factories, and introducing one now would be a larger structural change than this feature warrants for two small schemas.

## Decision: Editor component shape

- **Decision**: `DurationEditor` mirrors `DimensionEditor` almost line-for-line — a labeled number `<input>` for `value` and a labeled `<select>` for `unit`, both controlled via the `TokenTypeEditorProps<DurationValue>` contract (`value`, `onChange`).
- **Rationale**: Identical `{value, unit}` shape means identical interaction model; deviating would be inconsistent UX between two structurally identical token types for no reason.
- **Alternatives considered**: A single combined text input (`"200ms"`) parsed on blur — rejected: `DimensionEditor`'s two-control precedent is simpler to validate/test and keeps units machine-selectable (a stray typo like `"m"` instead of `"ms"` can't be typed at all).

## Decision: Preview component shape

- **Decision**: `DurationPreview` mirrors `ColorPreview`'s pattern — receives `{ value: unknown }`, re-validates via `DurationValueSchema.safeParse`, renders `null` on mismatch (letting the host fall back to generic text), and otherwise renders a short formatted string `${value}${unit}` (e.g. `200ms`, `1.5s`).
- **Rationale**: `token-editor-contract`'s `Preview` doc comment explicitly describes this exact contract — the value is `unknown` because it comes from resolving an arbitrary other token, not this contract's own already-validated `Editor` path. `dimension` doesn't have a `Preview` yet (a known, separate gap per the task brief), so `color`'s `ColorPreview` is the only existing precedent to follow.
- **Alternatives considered**: Reusing a generic "resolved value" formatter across all primitive types — rejected as out of scope; no such shared formatter exists yet, and introducing one is a larger refactor than this feature's scope.

## Decision: Styling

- **Decision**: `DurationEditor.module.css` copies `DimensionEditor.module.css` verbatim (same layout: inline-flex fields with `--dtcg-ed-space-*` gaps); `DurationPreview.module.css` copies `ColorPreview.module.css`'s `--dtcg-ed-font-mono` text styling (no swatch needed, since duration has no visual color to show — the text alone is the entire preview, unlike color's swatch + text pairing).
- **Rationale**: Principle XII requires `--dtcg-ed-*` tokens exclusively; both source files already comply, so copying preserves compliance without inventing new values.

## Decision: No new dependency

- **Decision**: No third-party dependency added. `token-editor-duration`'s `package.json` dependency list matches `token-editor-dimension`'s (`@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract`, `react`, `zod` + the same devDependency test/build tooling set).
- **Rationale**: Principle VIII — built-ins/first-party packages are the default; nothing here needs a library beyond what `dimension`'s already-approved dependency list uses.
