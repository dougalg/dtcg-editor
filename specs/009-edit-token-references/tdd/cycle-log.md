# Cycle Log: Edit Token References

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite (fast, vitest projects): `pnpm build && pnpm exec vitest run` -> 572 passed, 0 failed, 120 files
- suite (full): `pnpm test` -> non-zero exit, but only `@dtcg-editor/web-app#test` (Playwright) failed, and only because the turbo pipeline started `next start` without a fresh `next build`. No test regression. Run `pnpm build` before `pnpm test` locally.
- commit: `4da9386`
- recorded: cycle 0, before any change
- pre-existing reds: none in the vitest tier

## Cycle 1: U1 Command renders the search input, the list, and one option per item

- test: `packages/design-system/src/components/Command/Command.test.tsx::renders the search input, the list, and one option per item` (new)
- red: `pnpm exec vitest run packages/design-system/src/components/Command/Command.test.tsx -t "renders the search input, the list, and one option per item"` -> `Error: Failed to resolve import "@/registry/components/dialog/react/dialog" from "…/Command/Command.tsx"` (1 failed suite, 0 tests)
- green: `packages/design-system/src/components/Command/Command.tsx:12` — the `@/registry/components/dialog/react/dialog` import path corrected to `../Dialog/Dialog.tsx` (the stub's only unresolvable import). Test passed on re-run; deliberate mutant (`Command` returns `null`) confirmed the test fails, then restored. Suite `pnpm exec vitest run` -> 573 passed / 121 files
- refactor: none needed (one import-path line + new test file)
- commit: (this commit)

## Cycle 2: U2 Command shows the empty-slot content when the query matches no item

- test: `packages/design-system/src/components/Command/Command.test.tsx::shows the empty-slot content when the query matches no item` (new)
- red: `pnpm exec vitest run …Command.test.tsx -t "shows the empty-slot content"` — passed on first run (Command is a thin cmdk wrapper already correct after cycle 1's import fix). Deliberate mutant (`CommandEmpty` returns `null`) -> `1 failed` — test has teeth. Restored.
- green: no implementation change needed. Suite `pnpm exec vitest run` -> 574 passed / 121 files
- refactor: none needed
- commit: (this commit)

## Cycle 3: U3 Command has zero axe-core WCAG 2.2 AA violations

- test: `packages/design-system/src/components/Command/Command.a11y.test.tsx::has no WCAG 2.2 AA violations` (new)
- red: `pnpm exec vitest run …Command.a11y.test.tsx -t "has no WCAG 2.2 AA violations"` -> `TypeError: Cannot read properties of null (reading 'useRef')` in cmdk — a browser-mode duplicate-React config gap, not an a11y defect (playbook: broken config, fix first).
- config fix (separate commit 4925d54): `vitest.config.ts` a11y project gains `resolve.dedupe: ["react","react-dom"]` + `optimizeDeps.include: ["cmdk"]`. Re-run -> passed. Deliberate mutant (`CommandItem` renders a bare `<div>`, losing `role="option"`) -> `1 failed` — test has teeth. Restored.
- green: no `Command` implementation change; the config fix made the existing wrapper testable. Suite `pnpm exec vitest run` -> 575 passed / 122 files
- refactor: none needed
- commit: f54e802 (behavior), 4925d54 (config)
