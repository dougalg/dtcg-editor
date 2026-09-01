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
