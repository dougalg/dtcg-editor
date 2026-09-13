# Contract: `fontFamilyTokenType`

The interface `packages/token-editor-font-family` exposes to host apps, implementing
`TokenTypeContract<FontFamilyValue>` from `@dtcg-editor/token-editor-contract`
(`packages/token-editor-contract/src/contract.ts`, unmodified by this feature).

```ts
export const fontFamilyTokenType: TokenTypeContract<FontFamilyValue> = {
  type: "fontFamily",
  valueSchema: FontFamilyValueSchema,       // from @dtcg-editor/token-core
  serializeValue: (value) => value,          // identity — see data-model.md boundary rule
  Editor: FontFamilyEditor,
  Preview: FontFamilyPreview,
};
```

## `Editor` contract

- **Input**: `TokenTypeEditorProps<FontFamilyValue>` — `{ value: string | string[], onChange: (next: string | string[]) => void, options?: unknown }`.
- **Behavior**:
  - Renders `value` (promoted to a one-item list if a bare string) as an ordered list of text
    fields, one per family name.
  - "Add" appends a new empty-then-edited entry.
  - Each row has "remove" and "move up"/"move down" controls (ends disabled appropriately).
  - Calls `onChange` per the length-based boundary rule in `data-model.md` — never with an entry
    that is blank/whitespace-only (FR-004).
- **Accessibility**: every control has an accessible name (`aria-label`/associated `<label>`);
  `axe-core` WCAG 2.2 AA clean in all list-length states covered by `.a11y.test.tsx`.

## `Preview` contract

- **Input**: `{ value: unknown }` (an arbitrary resolved value, not guaranteed to conform).
- **Behavior**:
  - `FontFamilyValueSchema.safeParse(value)`; returns `null` on failure (FR-007).
  - On success, renders the family names comma-joined; a string value renders as itself; an
    array renders its first 3 entries comma-joined, plus `"+N more"` for entries beyond the
    third; an empty array renders empty text (not a crash, not `null`).
- **Styling**: `--dtcg-ed-*` custom properties only, no hardcoded colors/fonts/spacing.

## `built-in.ts` registration contract

`apps/web-app/lib/token-editors/built-in.ts` adds `"fontFamily"` to `BUILT_IN_TOKEN_TYPES` and a
matching `fontFamily: fontFamilyTokenType as unknown as TokenTypeContract<unknown>` entry to
`builtInContractsByType`, per that file's existing per-type pattern (see the `dimension`/
`fontWeight` entries for the established comment/casting convention). This file is shared with a
concurrently in-flight sibling feature (`strokeStyle`) in another worktree; a merge conflict here
on rebase is expected and resolved at merge time, not avoided by skipping registration.
