# Phase 1 Data Model: Font Family Token Editor Support

## Entity: Font Family Token Value (`FontFamilyValue`)

The `$value` of a token whose `$type` is `fontFamily`.

- **Shape**: `string | string[]`
  - `string`: a single font family name (e.g. `"Helvetica"`).
  - `string[]`: a preference-ordered fallback stack (e.g. `["Helvetica", "Arial", "sans-serif"]`),
    possibly empty (`[]`).
- **Validation rules** (`FontFamilyValueSchema`, `packages/token-core/src/font-family.ts`):
  - Accepts any string (no format constraint beyond being a string — the DTCG spec doesn't
    constrain font-family-name characters).
  - Accepts an array of any length (including 0) whose every element is a string.
  - Rejects any other JSON shape: number, boolean, null, plain object, or an array containing a
    non-string element.
- **No relationships**: a leaf value type, same category as `dimension`/`fontWeight`/`duration`.
  A `fontFamily` token can be the *target* of a reference from another token, but that's existing
  reference-resolution infrastructure, unchanged by this feature (spec Edge Cases).
- **State transitions**: N/A — not a stateful entity; each edit is a full replacement of the
  value via `TokenTypeEditorProps.onChange`.

## Editor-internal representation (not part of the schema)

`FontFamilyEditor` (UI layer only, `packages/token-editor-font-family`) works with an internal
`string[]` regardless of whether the incoming `value` prop is a bare string or an array — see
`plan.md` Design Decisions and `research.md`'s "Editor's internal representation" decision. This
is purely a rendering/interaction convenience; it is never persisted or exposed as a distinct
type. The boundary rule, applied on every `onChange` call:

| Internal list length | Value passed to `onChange` |
| --------------------- | --------------------------- |
| 0                      | `[]`                         |
| 1                      | the single string (not `[str]`) |
| ≥2                     | the full `string[]`          |

This rule is what makes an *untouched* single-string token round-trip losslessly (FR-008): if the
user never changes the list away from length 1, every `onChange` call (if any occur, e.g. editing
the one entry's text) still emits a bare string, never promoting the on-disk shape to an array.
