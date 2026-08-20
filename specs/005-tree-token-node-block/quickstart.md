# Quickstart: Validating TreeTokenNode Block Extraction & Label Redesign

## Prerequisites

- Dependencies installed at the repo root: `pnpm install`
- Run all commands from the repo root unless noted otherwise

## 1. Component-level checks (fast feedback loop)

```sh
pnpm --filter web-app test:unit
```

Expected: `TokenBlock.test.tsx` passes, covering (per `data-model.md`'s `TokenBlock` props):
- Renders the `name` prop as an `<h2>`.
- Renders no "Type:" pill when `type` is `undefined`.
- Renders a "Type:" pill (via `Badge`) with the type value when `type` is set.
- Renders the "(non-standard)" indicator when `isNonStandardType` is `true`.
- Renders the correct icon for a recognized `DtcgTokenType`, and the fallback icon otherwise.
- Renders whatever is passed as `children` unmodified (it's a dumb slot).

Also expected: previously-passing `TokenTree*.test.tsx` files still pass once updated for the new label text (see `research.md` §5) — no `"{name} name"`/`"{name} type"`/`"{name} value"` strings should remain anywhere in test expectations or source.

```sh
pnpm --filter web-app test:a11y
```

This runs both the Vitest Browser Mode `axe-core` component suite (`*.a11y.test.tsx`, includes the new `TokenBlock.a11y.test.tsx`) and the Playwright whole-page suite. Expected: zero WCAG 2.2 AA violations on `TokenBlock` in isolation, and no new violations/keyboard-navigation regressions on the full tokens page (`apps/web-app/e2e/tokens-page.spec.ts` or equivalent) from the new heading/pill/pin-line/icon markup.

## 2. Whole-repo checks

```sh
pnpm build && pnpm lint && pnpm test && pnpm format:check
```

Expected: all pass — `pnpm build` is this repo's sole type-checking gate (per the constitution's Development Workflow section), so a `TokenBlock` prop-typing mistake surfaces here even without a separate `tsc --noEmit` step. `pnpm lint` also re-validates the new component's file/folder naming against `@ls-lint/ls-lint` (Principle X: `TokenBlock.tsx` exporting `TokenBlock`, living in `apps/web-app/components/TokenBlock/`).

## 3. Manual visual validation

```sh
pnpm --filter web-app dev
```

Then, in a browser, open a token file's page (`/tokens/<...path>` for any file under whatever sample/fixture token directory the running app is configured to serve) and confirm, for a group containing at least two sibling tokens:

- Each token's name appears once, as a heading, not repeated in any field label below it.
- Each token shows "Type:" followed by a pill-styled type value (for tokens with a resolved type).
- Each token has its own type-appropriate icon (or the fallback icon, for a token with no recognized type).
- Each token has a left-hand pin line matching the visual weight/style already used for group nesting, with a visible gap between two consecutive tokens' pin-line segments.
- Toggling a group open/closed and editing a token's name/value/description still behaves exactly as before (no regression in the editing/staging/validation flows described in `spec.md`'s Assumptions and FR-015).

## Out of scope for this quickstart

- No new API, CLI, or file-format behavior exists to validate (see `plan.md`: no `contracts/` directory was produced for this feature).
- No performance benchmarking — this is a like-for-like presentational change with no stated performance target beyond "no regression."
