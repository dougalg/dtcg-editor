# Quickstart: Validating Transition Token Editor Support

## Prerequisites

- In the worktree at `.claude/worktrees/transition-token-support` (branch
  `worktree-transition-token-support`).
- Dependencies installed (`pnpm install` at repo root, run once per worktree).

## Run the schema unit tests (`token-core`)

```sh
cd packages/token-core
node --test src/transition.test.ts
```

Expected: all cases pass — valid three-field object accepted; missing/invalid `duration`,
`delay`, or `timingFunction` each rejected.

## Run the editor package's tests

```sh
pnpm --filter @dtcg-editor/token-editor-transition build
pnpm vitest run --project packages/token-editor-transition:unit
pnpm vitest run --project packages/token-editor-transition:a11y
```

Expected: `TransitionEditor`/`TransitionPreview` unit + a11y suites pass, including the specific
test asserting that changing the "Duration" sub-control never alters the "Delay" field (and vice
versa).

## Manually verify in the app

1. `pnpm --filter @dtcg-editor/web-app dev`
2. Open a token file containing:
   ```json
   {
   	"my-transition": {
   		"$type": "transition",
   		"$value": {
   			"duration": { "value": 200, "unit": "ms" },
   			"delay": { "value": 0, "unit": "ms" },
   			"timingFunction": [0.4, 0, 0.2, 1]
   		}
   	}
   }
   ```
3. Select the token; confirm three labeled controls render (Duration, Delay, Timing function),
   not a JSON textarea.
4. Change the duration's numeric value; confirm the delay and timing-function fields in the
   underlying `$value` are untouched.
5. Reference `my-transition` from another token; confirm the preview renders one short line,
   e.g. `200ms cubic-bezier(0.4, 0, 0.2, 1)` (no `delay` suffix, since it's zero). Set `delay` to
   a non-zero value and confirm the preview line then includes it.

## Full suite

```sh
pnpm build && pnpm lint && pnpm test && pnpm format:check
```

Expected: all green, matching CI's gate.
