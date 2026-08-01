## Implementation Complete

### Files Created

- `apps/web-app/lib/a11y/wcag-tags.ts` — `WCAG_22_AA_TAGS` constant, shared by both suites
- `apps/web-app/components/FolderOverview.a11y.test.tsx`
- `apps/web-app/components/SaveButton.a11y.test.tsx`
- `apps/web-app/components/TokenTree.a11y.test.tsx`
- `apps/web-app/lib/token-editors/built-in.a11y.test.tsx`
- `apps/web-app/playwright.config.ts` — `webServer` builds+starts the production app locally, skips the rebuild in CI
- `apps/web-app/e2e/support/axe.ts` — injects `axe-core`'s browser bundle via `page.addScriptTag`
- `apps/web-app/e2e/home.spec.ts`
- `apps/web-app/e2e/tokens-page.spec.ts`
- `apps/web-app/e2e/error-page.spec.ts`
- `apps/web-app/e2e/keyboard-navigation.spec.ts`
- `apps/web-app/app/error-boundary-check/page.tsx` — test-only diagnostic route (see Notes)

### Files Modified

- `apps/web-app/package.json` — 5 new devDependencies (`@vitest/browser`, `@vitest/browser-playwright`, `playwright`, `@playwright/test`, `axe-core`); `test` script now runs `vitest run && playwright test`
- `apps/web-app/vitest.config.ts` — `test.projects`: `unit` (existing jsdom config, unchanged behavior) + `a11y` (real Chromium via `@vitest/browser-playwright`'s `playwright()` provider)
- `apps/web-app/app/globals.css` — new `--muted-foreground` custom property (light/dark)
- `apps/web-app/components/TokenTree.module.css` — `.fieldLabel` fixed (see Notes)
- `apps/web-app/eslint.config.mjs` — file-level exemptions for the Playwright e2e files (see Notes)
- `apps/web-app/.gitignore` — ignores `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache`
- `.github/workflows/ci.yml` — caches `~/.cache/ms-playwright`, installs Chromium before "Test"
- `pnpm-lock.yaml`

### Acceptance Criteria

- [x] AC-01: Passed — `FolderOverview.a11y.test.tsx`, `SaveButton.a11y.test.tsx`, `TokenTree.a11y.test.tsx`, `built-in.a11y.test.tsx`, all run under `vitest run --project=a11y`
- [x] AC-02: Passed — `e2e/home.spec.ts`, `e2e/tokens-page.spec.ts`, `e2e/error-page.spec.ts`
- [x] AC-03: Passed — `e2e/keyboard-navigation.spec.ts`
- [x] AC-04: Passed — verified both `pnpm test` (in `apps/web-app`) and `pnpm test`/`turbo run test` (at the root) directly; the fail-on-violation behavior was also verified empirically mid-implementation (the real `TokenTree` contrast violation failed its test before the CSS fix)
- [x] AC-05: Passed — all five dependencies (including the `@vitest/browser-playwright` deviation, discovered at implementation time) are named and justified in `plan.md`'s dependency table
- [ ] AC-06: Deferred to `/sdd-archive`, as specified

### Notes

Several real deviations from `plan.md`, all found by actually running the suites (not just writing them) and reflected back into `plan.md`:

- **`@vitest/browser-playwright` is a required 5th dependency.** The installed `vitest@^4.1.10` no longer accepts a bare string (`"playwright"`) for `browser.provider` — it requires the `playwright()` factory from this separate package, confirmed by reading the installed `.d.ts` files directly. `axe-core` was also needed starting in Step 1 (not Step 2 as originally sketched), since the component-level test files import it directly.
- **`next/link`'s internals throw `ReferenceError: process is not defined` in real-browser Vitest.** `has-base-path.js` etc. read `process.env.__NEXT_ROUTER_BASEPATH` at module scope, which a real Next.js build inlines via DefinePlugin but which has no equivalent in a real-browser test runner. Fixed with `define: { "process.env": {} }` on the `a11y` Vitest project only.
- **One real WCAG 1.4.3 violation, now fixed.** `TokenTree.module.css`'s `.fieldLabel` used `opacity: 0.5` on `var(--foreground)`, computing to a 3.94:1 contrast ratio (needs 4.5:1). Replaced with a new `--muted-foreground` custom property (`#595959` light / `#a8a8a8` dark), both independently verified >7:1 against `--background`.
- **No organic path exists to trigger the root error boundary.** This repo's strict Result-pattern discipline means there's no user-reachable unhandled exception to test `app/error.tsx` against — `getConfig()`'s own defensive throw is provably unreachable in normal operation. Added `apps/web-app/app/error-boundary-check/page.tsx`, a route that unconditionally throws, solely for `error-page.spec.ts`. **Pitfall hit along the way**: it was first named `__error-boundary-check` (leading underscore), which Next.js treats as a "private folder" excluded from routing — 404'd until renamed.
- **`playwright`/`@playwright/test` aren't hoisted to the workspace root.** A bare `pnpm exec playwright` from the repo root fails with "Command not found" — confirmed directly. CI's install step uses `pnpm --filter @dtcg-editor/web-app exec playwright install --with-deps chromium`.
- **New `eslint.config.mjs` exemptions**, following the repo's existing per-file-override pattern (e.g. the Route Handler integration-test and `instrumentation.ts` exemptions already there): the Playwright e2e files fall outside the production dependency-injection graph (a Playwright test/config file has no injectable-parameter position of its own), so `keyboard-navigation.spec.ts`/`e2e/support/axe.ts` (real fs) and `playwright.config.ts` (real `process.env.CI`) each get a narrowly-scoped `no-restricted-imports`/`no-restricted-syntax` exemption.
- **Playwright locator gotchas, not behavior bugs, cost the most debugging time**: `getByRole` name matching is substring-based by default (`"0 name"` also matched `"10 name"`, `"20 name"`, etc. — fixed with `exact: true`), and the dimension editor's `Dimension value`/`Dimension unit` labels are identical across all 30 sibling tokens (fixed with `.first()`).
- Three pre-existing, unrelated `tsc --noEmit` errors (in `lib/tokens/read.test.ts`, `lib/tokens/scan.test.ts`, `scripts/init-config.test.ts`'s stream typing — the same ones noted in the previous feature's `impl-summary.md`) are still present and still out of scope; `next build`'s own type-check (which CI relies on) doesn't include them and passes cleanly.
