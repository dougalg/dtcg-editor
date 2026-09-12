# Quickstart: Validating cubicBezier Token Support

## Prerequisites

- Repo dependencies installed (`pnpm install` at repo root).
- This feature's code implemented per `tasks.md`.

## 1. Schema validation (token-core)

```sh
cd packages/token-core
pnpm test
```

Expect `cubic-bezier.test.ts` to pass, covering: a valid tuple, an out-of-range P1x, an
out-of-range P2x, an in-range-but-extreme P1y/P2y (negative and `>1`), a too-short tuple, a
too-long tuple, and a non-numeric entry.

## 2. Editor + Preview unit and a11y tests

```sh
pnpm test:vitest --project packages/token-editor-cubic-bezier:unit --project packages/token-editor-cubic-bezier:a11y
```

(or `pnpm test` at repo root, which runs every project including the two above once
`vitest.config.mts`'s `packages` array includes `packages/token-editor-cubic-bezier`).

Expect zero `axe-core` WCAG 2.2 AA violations for both `CubicBezierEditor` and
`CubicBezierPreview`, and unit coverage of: initial render showing all four values (US1
Scenario 1), editing P1y (US1 Scenario 2), clamping P1x above 1 and below 0 (US1 Scenarios 3–4),
`Preview` rendering a resolved value (US2 Scenario 1) and declining a malformed one (US2
Scenario 2).

## 3. End-to-end manual check (optional, via the running app)

```sh
pnpm --filter @dtcg-editor/web-app dev
```

1. Open a token file (or create one) containing:
   ```json
   { "easing": { "$type": "cubicBezier", "$value": [0.4, 0, 0.2, 1] } }
   ```
2. Select the `easing` token — confirm four labeled number fields appear (not a JSON textarea).
3. Change the P1y field to `-0.5` — confirm the token's value updates to `[0.4, -0.5, 0.2, 1]`.
4. Try setting P1x to `1.5` — confirm it's clamped to `1` (or rejected), never persisted `>1`.
5. Reference `easing` from another token and view its reference preview — confirm a
   `cubic-bezier(0.4, -0.5, 0.2, 1)`-style short text rendering appears.

## 4. Round-trip fidelity

Add (or confirm) a `token-core` round-trip fixture (per Principle IX) containing a `cubicBezier`
token with an out-of-range y value, e.g. `[0.68, -0.55, 0.27, 1.55]`, and confirm
`packages/token-core`'s existing round-trip test suite (`parse.test.ts` /
`serialize.test.ts`) passes it unchanged.

## Full suite / build gate

```sh
pnpm build
pnpm test
```

Both must pass repo-wide before this feature is considered done.
