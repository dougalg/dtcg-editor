# Quickstart: Validating Font Weight Token Editor Support

## Prerequisites

- Dependencies installed: `pnpm install` (repo root).
- Working inside this feature's worktree
  (`.claude/worktrees/font-weight-token-support`, branch
  `worktree-font-weight-token-support`).

## Automated validation

```sh
# token-core schema unit tests (node:test)
pnpm --filter @dtcg-editor/token-core test

# new package's own node:test-runnable files (if any) + build
pnpm --filter @dtcg-editor/token-editor-font-weight build
pnpm --filter @dtcg-editor/token-editor-font-weight test

# Full component + a11y suite (Vitest projects, includes the new package
# once added to vitest.config.mts's `packages` array)
pnpm test:vitest

# Whole-repo build + test gate (same as CI)
pnpm build
pnpm test
```

Expected outcome: all of the above exit 0, with new passing tests covering
`FontWeightValueSchema` (valid integers, valid aliases, out-of-range/non-integer/unrecognized
rejections), `FontWeightEditor` (renders current value, calls `onChange` with a new integer,
respects `min`/`max`), and `FontWeightPreview` (renders numeric and alias values as text, returns
nothing for an invalid value) — plus zero `axe-core` WCAG 2.2 AA violations for each component's
`.a11y.test.tsx`.

## Manual validation (per spec.md's Acceptance Scenarios)

1. `pnpm dev`, open the web app, load or create a token document containing:
   ```json
   { "weight": { "$type": "fontWeight", "$value": 400 } }
   ```
2. Select the `weight` token in the tree — confirm a dedicated numeric editor appears (not the
   generic read-only JSON textarea fallback). **Covers Acceptance Scenario 1.1.**
3. Change the value to `700` — confirm the token's `$value` updates and the change persists the
   same way other token edits do. **Covers Acceptance Scenario 1.2.**
4. Attempt to enter `0`, `1001`, or a non-numeric value — confirm the editor prevents/flags the
   invalid value. **Covers Acceptance Scenario 1.3.**
5. Add a second token that references the first (`{ "$value": "{weight}" }`) and view its
   reference/candidate preview — confirm it renders the resolved numeric weight as readable text,
   not JSON. **Covers Acceptance Scenario 2.1.**
6. Repeat steps 1–5 with a token whose `$value` is a keyword alias (e.g. `"bold"`) instead of a
   number — confirm the same editor/preview behavior for the alias form. **Covers Acceptance
   Scenario 2.2 and Edge Case "unrecognized string is invalid" (try `"extra-bold-ish"`, expect
   rejection).**

See `data-model.md` for the full validation ruleset and `contracts/token-type-contract.md` for
the exact interface being implemented.
