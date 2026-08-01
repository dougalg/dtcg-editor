# Accessibility Testing

Implemented on: 2026-08-01

Added two-tier automated WCAG 2.2 AA checking to `apps/web-app`. A Vitest Browser Mode project (`test.projects` entry `a11y`, real Chromium via `@vitest/browser` + `@vitest/browser-playwright`) runs `axe-core` against `FolderOverview`, `SaveButton`, `TokenTree`, and the dimension token editor, co-located as `*.a11y.test.tsx` files alongside the unchanged jsdom `unit` project. A separate `@playwright/test` suite (`apps/web-app/e2e/`) checks the home, tokens, and error pages plus a full keyboard-only browse → open → edit → save flow, including focus-order and visible-focus-indicator assertions. Both suites run under the existing `pnpm test` / `turbo run test` pipeline, enforced (non-warn-only) in CI, which now also installs and caches Playwright's Chromium browser.

Found and fixed two real, pre-existing issues along the way:

- A genuine WCAG 1.4.3 color-contrast violation in `TokenTree`'s field labels (opacity-based text dimming replaced with an explicit, contrast-verified `--muted-foreground` CSS custom property).
- A `process is not defined` crash from `next/link`'s internals when rendered in a real-browser (non-Node) test environment, fixed with a scoped Vite `define`.

Also added a small test-only diagnostic route (`app/error-boundary-check/page.tsx`) so the root error boundary has a real page to exercise, since this repo's Result-pattern discipline leaves no organic reachable path to an unhandled exception.

Two deviations from the original plan, both discovered during implementation and documented in `plan.md`: `@vitest/browser-playwright` turned out to be a required 5th dependency (Vitest 4.1.10's browser provider is a factory, not a string), and `axe-core` was needed starting in Step 1 rather than Step 2.
