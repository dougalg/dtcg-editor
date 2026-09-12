# Quickstart: Duration Token Support

## Prerequisites

- Repo dependencies installed (`pnpm install` at the repo root, already done in this worktree).

## Validate `token-core`'s schema

```sh
cd packages/token-core
node --test src/duration.test.ts
```

Expect: all cases pass — valid `{ value, unit: "ms" | "s" }` accepted, negative `value`/unrecognized `unit`/missing `unit`/non-numeric `value` rejected.

## Validate the editor package

```sh
pnpm --filter @dtcg-editor/token-editor-duration build
pnpm --filter @dtcg-editor/token-editor-duration test
```

From the repo root, the shared Vitest config also runs `DurationEditor`/`DurationPreview`'s `.test.tsx` (unit) and `.a11y.test.tsx` (axe, zero WCAG 2.2 AA violations) projects:

```sh
pnpm test:vitest
```

## Validate end-to-end registration

1. `pnpm --filter @dtcg-editor/web-app dev`
2. Open a token document containing a `duration`-typed token (or create one via the type picker — `duration` now appears alongside `dimension`/`color`).
3. Confirm the numeric value + unit select render (not a JSON textarea), editing both persists correctly, and a reference resolving to a `duration` value renders as `<number><unit>` (e.g. `200ms`) wherever resolved-value previews appear.

## Full repo gate

```sh
pnpm build
pnpm test
```

Both must pass with the new package included (`vitest.config.mts`'s `packages` array includes `packages/token-editor-duration`).
