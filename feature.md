# Feature: Accessibility Testing

## Summary

Add automated accessibility testing to `apps/web-app` so the existing UI (file/folder navigation, the token tree, token editors, and the save flow) is checked against WCAG 2.2 AA on every test run and CI build. Testing happens at two levels: component-level checks via Vitest Browser Mode (real-browser rendering, so axe-core's rendering-dependent rules like color contrast work correctly) and page/flow-level checks via Playwright (full page loads plus keyboard-only navigation and focus-order verification across real app routes). This is a first pass over the app's current surface area — it establishes the tooling and conventions that later features (e.g. the colour token editor, the generic fallback editor) will extend to their own components.

## User Stories

- As a design system team member using the editor with a screen reader or keyboard-only, I want the app's core flows (browsing tokens, opening an editor, editing a value, saving) to be operable and correctly announced, so that I'm not blocked by inaccessible UI.
- As a contributor to dtcg-editor, I want accessibility regressions caught automatically in CI, so that a11y isn't something that silently regresses as components change.
- As a contributor adding a new component or page, I want an established a11y test pattern (component-level and page-level) to follow, so I don't have to invent an approach from scratch.

## Functional Requirements

### FR-01: Component-level automated a11y checks (Vitest Browser Mode)

Introduce a Vitest "browser" test project (using the Playwright provider under `@vitest/browser`, alongside the existing jsdom project — see Technical Scope) that renders each existing web-app component in a real browser and asserts zero axe-core violations against WCAG 2.2 AA rules. Covers:

- `components/FolderOverview.tsx`
- `components/SaveButton.tsx`
- `components/TokenTree.tsx`
- The built-in token editor(s) resolved via `lib/token-editors/` (currently the dimension token type's `Editor`, from `@dtcg-editor/token-type-dimension`)

### FR-02: Page-level automated a11y checks (Playwright)

Introduce a Playwright test suite that loads each existing page against a real running instance of the app and asserts zero axe-core violations against WCAG 2.2 AA rules at the full-page level (catching issues that only manifest from real layout/composition, not visible in isolated component renders). Covers:

- `app/page.tsx` (home)
- `app/tokens/[...path]/page.tsx` (token folder/file view, including the rendered editor for a token)
- `app/error.tsx` (error boundary fallback)

### FR-03: Keyboard-navigation and focus-order verification (Playwright)

Using the same Playwright suite, verify keyboard-only operability of the app's primary flows:

- Tab order reaches every interactive element in the token tree, the resolved editor, and the save button, in a logical sequence.
- Every focusable element has a visible focus indicator.
- The core flow — browse the token tree, open a token, edit its value via the resolved editor, save — is fully completable without a mouse.

### FR-04: CI enforcement

Both the Vitest Browser Mode suite and the Playwright suite run as part of this repo's existing test pipeline (`pnpm test` / `turbo run test`) and fail the build on any WCAG 2.2 AA violation, consistent with this repo's convention that the test suite is the enforced source of truth (no warn-only mode).

## Acceptance Criteria

- [x] AC-01: A Vitest browser-mode project exists in `apps/web-app` (co-located `*.test.tsx` files per this repo's testing convention) running axe-core WCAG 2.2 AA checks against `FolderOverview`, `SaveButton`, `TokenTree`, and the dimension token type's `Editor`.
- [x] AC-02: A Playwright test suite exists exercising `app/page.tsx`, `app/tokens/[...path]/page.tsx`, and `app/error.tsx`, each asserting zero axe-core WCAG 2.2 AA violations at the page level.
- [x] AC-03: The Playwright suite includes at least one keyboard-only test that completes the full "browse → open → edit → save" flow without a mouse, asserting a logical tab order and visible focus indicators throughout.
- [x] AC-04: Both suites run under this repo's existing test commands (`pnpm test` in `apps/web-app`, and `turbo run test` at the root) and a WCAG 2.2 AA violation in either suite causes a non-zero exit / failed build. Verified both commands directly; verified the fail-on-violation behavior empirically during implementation (the real `TokenTree` color-contrast violation failed its test before being fixed).
- [x] AC-05: Any new dependency (e.g. `@vitest/browser`, an axe integration package, `@playwright/test`) is named and justified in `plan.md` per the Minimal Dependencies convention, not added ad hoc during implementation. (Includes `@vitest/browser-playwright`, a deviation discovered and documented during implementation — see `plan.md`'s dependency table.)
- [ ] AC-06: `docs/project.md`'s Testing section is updated (at `/sdd-archive` time) to describe the new two-tier a11y testing setup alongside the existing Vitest/jsdom and `node:test` conventions. Deferred to `/sdd-archive`, as specified.

## Technical Scope

### Affected Modules

- `apps/web-app` — all existing components, pages, and the token-editor resolution path (`lib/token-editors/`).

### New Components Required

- A Vitest "browser" test project/config (Playwright-provider-backed), running alongside the existing jsdom project, without disrupting existing jsdom-based tests.
- An axe-core integration for the browser-mode tests (component-level assertions).
- A new Playwright test project/config (`playwright.config.ts`) with a `webServer` entry that starts the Next.js app for the suite to run against.
- An axe-core integration for Playwright (page-level assertions), e.g. via an official axe+Playwright integration.
- Keyboard-navigation/focus-order test helpers for the Playwright suite.

### Integration Points

- `apps/web-app`'s existing Vitest config and `test` script (must accommodate both a jsdom project and a browser project without one breaking the other).
- Root `turbo.json` / `test` pipeline, so the new Playwright suite runs as part of `turbo run test` (or an equivalent wired-in task) and its failure fails CI.
- `lib/token-editors/resolve-editor.ts` and `built-in.ts`, since page-level tests need to exercise the real editor-resolution path, not a mock.

## Non-Functional Requirements

- **Performance**: Real-browser test suites (both Vitest Browser Mode and Playwright) are slower than jsdom; acceptable since correctness (accurate contrast/rendering checks) is required, but the plan should keep browser-test scope to what's specified here rather than converting all existing jsdom tests.
- **Accessibility standard**: WCAG 2.2 AA is the enforced conformance target for both suites.
- **Reliability**: Playwright's `webServer` startup must be deterministic in CI (no flaky "server not ready" failures) — the plan should specify a readiness check.
- **Maintainability**: New a11y tests follow this repo's "tests live alongside the code they test" convention where the test framework allows it (Vitest browser-mode component tests); the Playwright suite, which needs a top-level location for page-level tests, should keep its footprint as small and clearly-scoped as possible given it's a necessary deviation from that convention.

## Out of Scope

- Manual accessibility audits, real screen-reader testing (e.g. VoiceOver/NVDA sessions), or usability testing with actual assistive-technology users — this pass is automated-only.
- WCAG AAA conformance, or any conformance level beyond AA.
- Accessibility of components/features not yet built (the generic fallback token editor, a colour token editor, or any other future token-type editor) — those features will extend this same testing pattern to their own components as part of their own acceptance criteria, not retroactively here.
- Accessibility of user-supplied, config-registered custom editors (via `dtcg-editor.config.mts`) beyond what the core engine's contract requires — a third party's own editor implementation is their responsibility, not something this repo's test suite can validate.
- Visual regression testing or design-review-style accessibility (e.g. subjective UX accessibility feedback) — scope here is strictly automated, standards-based (WCAG 2.2 AA) checks.

## Open Questions

- Exact package choice for the axe integrations (e.g. `axe-playwright` vs `@axe-core/playwright` for the Playwright side; `vitest-axe` vs direct `axe-core` calls for the browser-mode side) is deferred to `/sdd-plan`, which must name and justify the choice per the Minimal Dependencies convention.
- Whether Playwright's `webServer` should run against `next dev` or a production `next build && next start` in CI is deferred to `/sdd-plan` (production build is closer to real usage but slower to boot per CI run).
