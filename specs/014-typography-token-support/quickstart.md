# Quickstart: Validating Typography Token Editor Support

## Prerequisites

- In the worktree at `.claude/worktrees/typography-token-support` (branch
  `worktree-typography-token-support`).
- Dependencies installed (`pnpm install` at repo root, run once per worktree).

## Run the schema unit tests (`token-core`)

```sh
cd packages/token-core
node --test src/typography.test.ts
```

Expected: all cases pass — valid five-field object accepted; missing/invalid `fontFamily`,
`fontSize`, `fontWeight`, `letterSpacing`, or `lineHeight` each rejected; a `lineHeight` given a
`unit` shape (i.e. a Dimension-like object) rejected since it must be a bare number.

## Run the editor package's tests

```sh
pnpm --filter @dtcg-editor/token-editor-typography build
pnpm vitest run --project packages/token-editor-typography:unit
pnpm vitest run --project packages/token-editor-typography:a11y
```

Expected: `TypographyEditor`/`TypographyPreview` unit + a11y suites pass, including the specific
test asserting that changing the "Font Size" sub-control never alters "Letter Spacing" (and vice
versa).

## Manually verify in the app

1. `pnpm --filter @dtcg-editor/web-app dev`
2. Open a token file containing:
   ```json
   {
   	"my-typography": {
   		"$type": "typography",
   		"$value": {
   			"fontFamily": "Arial",
   			"fontSize": { "value": 16, "unit": "px" },
   			"fontWeight": 700,
   			"letterSpacing": { "value": 0, "unit": "px" },
   			"lineHeight": 1.4
   		}
   	}
   }
   ```
3. Select the token; confirm five labeled controls render (Font Family, Font Size, Font Weight,
   Letter Spacing, Line Height), not a JSON textarea.
4. Change the font size's numeric value; confirm letter spacing and the other three fields in the
   underlying `$value` are untouched.
5. Reference `my-typography` from another token; confirm the preview renders one short line, e.g.
   `16px/1.4 Arial 700` (no letter-spacing suffix, since it's zero). Set `letterSpacing` to a
   non-zero value and confirm the preview line then includes it.

## Full suite

```sh
pnpm build && pnpm lint && pnpm test && pnpm format:check
```

Expected: all green, matching CI's gate.
