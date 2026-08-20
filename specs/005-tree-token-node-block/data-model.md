# Phase 1 Data Model: TreeTokenNode Block Extraction & Label Redesign

This feature introduces no persisted or transmitted data — no schema, storage, or API payload changes. The "entities" below are presentational/UI-level shapes: React component props and a static lookup table, not domain data.

## `TokenBlock` props

The new presentational component's public contract — plain data in, no I/O, no editing/validation state.

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | The token's name, rendered once as the `<h2>` heading (FR-001). |
| `type` | `DtcgTokenType \| string \| undefined` | The token's `effectiveType`. `undefined` → no "Type:" pill rendered (preserves existing conditional behavior). A recognized `DtcgTokenType` → pill + matching icon. An unrecognized string → pill + fallback icon + the existing "non-standard" indicator (FR-014). |
| `isNonStandardType` | `boolean` | Whether `type` is present but not a recognized `DtcgTokenType` — drives the "(non-standard)" indicator and fallback icon selection. Passed explicitly rather than re-derived inside `TokenBlock`, since `TreeTokenNode` already computes `isUsableType`. |
| `children` | `ReactNode` | Slot for whatever `TreeTokenNode` renders as the token's value/editor content (the resolved editor, `FallbackValueEditor`, or the read-only value span) — `TokenBlock` does not know or care what's inside this slot. |
| `className` | `string \| undefined` (optional) | Escape hatch for the two call sites (valid/invalid branches) to add branch-specific modifiers if ever needed, without `TokenBlock` needing to know about validity itself. |

Notes:
- No `onChange`/`onStageEdit`/`onFieldError` props — those stay owned by `TreeTokenNode`, which passes already-resolved event handlers into whatever it renders inside the `children` slot. `TokenBlock` itself is inert.
- `pending`-edit-aware values (staged name/value/description) are resolved by `TreeTokenNode` before being handed to `TokenBlock` — `TokenBlock` always receives the *current* name/type, never a "pending vs. saved" pair to reconcile itself.

## Token type → icon lookup

A static, module-level lookup, not a runtime/dynamic entity:

| Key | Value |
|---|---|
| Each of the 13 `DtcgTokenType` values (`color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`, `strokeStyle`, `border`, `transition`, `shadow`, `gradient`, `typography`) | An inline SVG icon element/component specific to that type. |
| Fallback (used when `type` is `undefined`, or a string not in the 13 above) | One generic inline SVG icon. |

This lookup is pure, static data (no fetching, no validation, no `Result` wrapping needed — it cannot fail; every case is covered including the fallback) and lives co-located with `TokenBlock`, not in `token-core` (icons are a UI-rendering concern, out of scope for `token-core` per constitution Principle VII).

## No state transitions

`TokenBlock` is stateless and has no lifecycle beyond React's normal render — there is nothing here that changes over time independent of its props. All stateful behavior (pending edits, field errors, expand/collapse) remains exactly where it already lives (`TreeTokenNode`, `TreeGroupNode`, `TokenTree`), unmodified by this feature (FR-015).
