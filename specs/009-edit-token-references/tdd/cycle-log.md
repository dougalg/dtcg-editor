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

## Cycle 4: U4 Combobox trigger requests open; trigger is a combobox with aria-expanded/controls

- test: `packages/design-system/src/components/Combobox/Combobox.test.tsx::clicking the trigger requests open; the trigger is a combobox with aria-expanded/controls` (new)
- red: `pnpm exec vitest run …Combobox.test.tsx -t "clicking the trigger requests open"` -> `Error: Failed to resolve import "@/registry/components/command/react/command" from "…/Combobox/Combobox.tsx"` — the file was still the demo stub with no `ComboboxProps` export (1 failed suite, 0 tests).
- green: replaced the demo with the generic controlled `Combobox<T>` per contracts/reference-picker-ui.md (`Popover` + `Button role="combobox"` trigger + `Command shouldFilter={false}` list). Larger-than-minimal step: the whole component skeleton, since the contract is fixed and U5-U15 exercise the same shape; kept because the suite stays green (U5-U15 will be mutant-verified against it). Suite -> 576 passed / 123 files
- refactor: none
- commit: (bundled with cycle 5)

## Cycle 5: U5 Combobox search field shows the controlled query and reports typing

- test: `packages/design-system/src/components/Combobox/Combobox.test.tsx::the search field shows the controlled query and reports typing via onQueryChange` (new)
- red: passed on first run (implemented in cycle 4). Deliberate mutant (`CommandInput` loses its `value={query}` prop) -> `1 failed` — test has teeth. Restored.
- green: no change. Suite -> 577 passed / 123 files
- refactor: none
- commit: (this commit — bundles cycles 4-5, the component's introduction + first two behaviors)

## Cycle 6: U6 Combobox renders exactly the items given, in order, no internal filtering

- test: `Combobox.test.tsx::renders exactly the items given, in the given order, with no internal filtering` (new)
- red: passed first run (built cycle 4). Mutant (`[...items].reverse().map`) -> `1 failed`. Restored.
- green: no change. Suite -> 580 passed / 123 files (bundled)
- refactor: none

## Cycle 7: U7 Combobox activating an enabled item calls onSelect then closes

- test: `Combobox.test.tsx::activating an enabled item calls onSelect with it, then closes the popover` (new)
- red: passed first run. Mutant (`handleSelect` drops `onOpenChange(false)`) -> `1 failed`. Restored.
- green: no change.
- refactor: none

## Cycle 8: U8 Combobox pressing Escape requests close

- test: `Combobox.test.tsx::pressing Escape requests close` (new)
- red: passed first run. Mutant (`<Popover>` loses `onOpenChange`) -> `1 failed`. Restored.
- green: no change. Suite -> 580 passed / 123 files
- refactor: none
- commit: (this commit — bundles cycles 6-8, all characterization-by-mutant of the Combobox built test-first in cycle 4)
