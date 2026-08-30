# Quickstart: Validating Fast, Seamless Editing

Runnable checks that prove the feature meets its Success Criteria. Details of *what* each
check asserts live in [`contracts/`](./contracts/); numeric budgets live in [`spec.md`](./spec.md).

## Prerequisites

- `pnpm install` at the repo root
- Worktree: `.claude/worktrees/fast-seamless-editing`, branch `worktree-fast-seamless-editing`
- Playwright browsers: `pnpm --filter @dtcg-editor/web-app exec playwright install chromium`

## One-time setup: the large fixture

```sh
# Generates apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json (~2,000 tokens,
# deterministic, includes a token referenced by >=100 others). Commit the output.
pnpm --filter @dtcg-editor/web-app exec tsx scripts/generate-large-fixture.ts
```

Expected: the file is written, is valid JSON, and opening
`/tokens/large_scale.tokens.json` in the app renders the tree with no error banner.

## 1. Component-level: render isolation + a11y (fast loop)

```sh
pnpm test:vitest
```

Expected:
- `useStagedEdits.test.tsx` — `getPendingEdit(k)` / `getFieldError(k)` return a stable
  reference across an unrelated edit and a stable empty `getServerSnapshot`; `subscribe` and
  the mutators keep stable identity for the store's lifetime (INV-1, INV-2, INV-2a).
- `TreeTokenNode.test.tsx` — typing in one row of a multi-row tree re-renders only that row
  (C-RI-1); staged-edit payloads match the pre-change baseline for the same input (C-RI-6).
- `TokenBlock.test.tsx` / `FieldErrorSlot.test.tsx` — the error slot's box size is identical
  with and without a message (INV-10, C-KL-4).
- `*.a11y.test.tsx` — `axe` clean during and after an edit and a simulated focus move.

## 2. Baseline capture (before starting the render work)

```sh
git switch --detach $(git merge-base HEAD main)   # or the branch's first commit
pnpm --filter @dtcg-editor/web-app run build
pnpm --filter @dtcg-editor/web-app exec playwright test editing-perf render-stability
# copy the "perf" annotations into specs/010-fast-seamless-editing/baseline.md as "before"
git switch worktree-fast-seamless-editing
```

Expected: the perf specs fail their budget assertions on the old code (that's the point) but
still print the `type: "perf"` annotation numbers to record. (C-MB-6)

## 3. End-to-end: latency + layout stability (production build)

```sh
pnpm --filter @dtcg-editor/web-app run build
pnpm --filter @dtcg-editor/web-app run test:a11y
```

Expected on the finished feature:
- `editing-perf.spec.ts` — commit→visible ≤ 100 ms p95; typing burst drops no characters
  and echoes within a frame; referenced-token (≥ 100 referrers) commit ≤ 100 ms
  (C-MB-1, C-MB-2, C-RI-4).
- `render-stability.spec.ts` — zero `layout-shift` sources outside the edited field + its
  error slot across edit, full tab-through, and ripple interactions (C-MB-3).
- `keyboard-navigation.spec.ts` — full tab-through of the **large** fixture: focus on a
  real control at every stop, focus indicator visible and unclipped, visual focus order
  (C-KL-2, C-KL-3, C-KL-7).
- All pre-existing e2e specs still green (no regression to save flow, references, theme).

## 4. Manual smoke (optional, matches the user's words)

1. Open `/tokens/large_scale.tokens.json`.
2. Edit a value near the bottom — it should feel instant, the page shouldn't flicker or
   jump, and the caret/scroll shouldn't move.
3. Tab through ten rows — only the focus ring should move; nothing should resize or shift.
4. Edit the widely-referenced token — its dependents' resolved previews update, the rest of
   the tree stays still.

## Definition of done for this feature

- Checks 1 and 3 pass on the finished branch; check 2's baseline is committed to
  `baseline.md` and the perf specs assert against it (SC-008).
- `pnpm lint` and `pnpm test` green at the repo root.
- No new runtime dependency (or, if virtualization proved necessary per `research.md` §7, a
  merged `speckit-constitution` amendment adding it to Approved Dependencies).
