# Quickstart: Validating Font Family Token Editor Support

## Prerequisites

- Dependencies installed: `pnpm install` (repo root).
- Working inside this feature's worktree
  (`.claude/worktrees/font-family-token-support`, branch
  `worktree-font-family-token-support`).

## Automated validation

```sh
# token-core schema unit tests (node:test)
pnpm --filter @dtcg-editor/token-core test

# new package's own node:test-runnable files (if any) + build
pnpm --filter @dtcg-editor/token-editor-font-family build
pnpm --filter @dtcg-editor/token-editor-font-family test

# Full component + a11y suite (Vitest projects, includes the new package
# once added to vitest.config.mts's `packages` array)
pnpm test:vitest

# Whole-repo build + test gate (same as CI)
pnpm build
pnpm test
```

Expected outcome: all of the above exit 0, with new passing tests covering
`FontFamilyValueSchema` (single string, string array including empty, rejection of non-string
elements/other shapes), `FontFamilyEditor` (renders a promoted one-item list for a string value,
add/remove/reorder, blank-entry rejection, string-vs-array `onChange` boundary rule), and
`FontFamilyPreview` (comma-joined rendering, "+N more" truncation, decline-to-render on schema
mismatch) — plus zero `axe-core` WCAG 2.2 AA violations for each component's `.a11y.test.tsx`.

## Manual validation (per spec.md's Acceptance Scenarios)

1. `pnpm dev`, open the web app, load or create a token document containing:
   ```json
   { "body": { "$type": "fontFamily", "$value": ["Helvetica", "Arial", "sans-serif"] } }
   ```
2. Select the `body` token in the tree — confirm a dedicated list editor appears (not the generic
   read-only JSON textarea fallback), showing three ordered entries. **Covers Acceptance
   Scenario 1.1.**
3. Add a new family name — confirm it's appended to `$value`. **Covers Acceptance Scenario 1.2.**
4. Remove an entry — confirm it's removed from `$value` (down to possibly `[]`). **Covers
   Acceptance Scenario 1.3.**
5. Reorder two entries (e.g. move the last entry to first) — confirm `$value`'s order updates.
   **Covers Acceptance Scenario 1.4.**
6. Try to add a blank entry — confirm it's rejected. **Covers Acceptance Scenario 1.5.**
7. Repeat with a token authored as a single string:
   ```json
   { "heading": { "$type": "fontFamily", "$value": "Helvetica" } }
   ```
   Confirm the list editor shows one entry, `"Helvetica"`; editing just that entry's text keeps
   `$value` a string on save; adding a second entry makes `$value` an array. **Covers User
   Story 2's Acceptance Scenarios 2.1-2.3.**
8. Add a third token that references `body` (`{ "$value": "{body}" }`) and view its
   reference/candidate preview — confirm it renders `"Helvetica, Arial, sans-serif"` as readable
   text, not JSON. **Covers Acceptance Scenario 3.1.**
9. Extend `body`'s `$value` to 5+ entries and re-check its preview — confirm it shows the first 3
   entries followed by a "+N more" indicator. **Covers Acceptance Scenario 3.3 / SC-005.**
10. View a preview for a value that fails the schema (e.g. `$value: 42` on a `fontFamily`-typed
    token forced via raw JSON edit) — confirm the preview renders nothing and the host's generic
    fallback is used instead. **Covers Acceptance Scenario 3.4.**

See `data-model.md` for the full validation ruleset and `contracts/token-type-contract.md` for
the exact interface being implemented.
