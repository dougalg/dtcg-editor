# Quickstart: Validating Number Token Editor Support

## Prerequisites

- Dependencies installed: `pnpm install` (repo root).
- Working inside this feature's worktree
  (`.claude/worktrees/number-token-support`, branch `worktree-number-token-support`).

## Automated validation

```sh
# token-core schema unit tests (node:test)
pnpm --filter @dtcg-editor/token-core test

# new package's own node:test-runnable files (if any) + build
pnpm --filter @dtcg-editor/token-editor-number build
pnpm --filter @dtcg-editor/token-editor-number test

# Full component + a11y suite (Vitest projects, includes the new package
# once added to vitest.config.mts's `packages` array)
pnpm test:vitest

# Whole-repo build + test gate (same as CI)
pnpm build
pnpm test
```

Expected outcome: all of the above exit 0, with new passing tests covering `NumberValueSchema`
(valid positive/negative/zero/fractional numbers, rejection of non-number shapes and of
`NaN`/`Infinity`/`-Infinity`), `NumberEditor` (renders current value, calls `onChange` with a new
finite number, rejects non-numeric/empty input) and `NumberPreview` (renders a numeric value as
text, returns nothing for an invalid value) — plus zero `axe-core` WCAG 2.2 AA violations for
each component's `.a11y.test.tsx`.

## Manual validation (per spec.md's Acceptance Scenarios)

1. `pnpm dev`, open the web app, load or create a token document containing:
   ```json
   { "opacity": { "$type": "number", "$value": 1.5 } }
   ```
2. Select the `opacity` token in the tree — confirm a dedicated number editor appears (not the
   generic read-only JSON textarea fallback). **Covers Acceptance Scenario 1.1.**
3. Change the value to `2` — confirm the token's `$value` updates and the change persists the
   same way other token edits do. **Covers Acceptance Scenario 1.2.**
4. Clear the field or type a non-numeric value — confirm the editor prevents/flags the invalid
   value. **Covers Acceptance Scenario 1.3.**
5. Enter a negative number (`-1`) and a fractional number (`0.75`) — confirm both are accepted
   and written as-is. **Covers Acceptance Scenario 1.4.**
6. Add a second token that references the first (`{ "$value": "{opacity}" }`) and view its
   reference/candidate preview — confirm it renders the resolved number as readable text, not
   JSON. **Covers Acceptance Scenario 2.1.**

See `data-model.md` for the full validation ruleset and `contracts/token-type-contract.md` for
the exact interface being implemented.
