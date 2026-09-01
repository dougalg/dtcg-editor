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

## Cycles 9-15: Combobox U9-U15

All exercise the Combobox built test-first in cycle 4. One test each, run individually.

- U9 (disabled item still rendered + `aria-disabled="true"`): passed; mutant `disabled = false` -> `1 failed`. Restored.
- U10 (activating a disabled item: no `onSelect`, no close): passed; single-guard mutants each still passed (defence-in-depth: cmdk `disabled` prop AND `handleSelect` early-return each independently block it); combined mutant (both removed) -> `1 failed`. Both guards kept intentionally.
- U11 (ArrowDown skips a disabled item) — moved from `Combobox.test.tsx` (jsdom) to `Combobox.a11y.test.tsx` (real Chromium): cmdk keyboard nav is unreliable under jsdom `fireEvent` and `user-event` is not a repo dependency (Hard Rule 7). Browser-tier test with `waitFor` passes. Deliberate mutant `disabled={false}` did NOT flip it (cmdk's arrow-skip is internal, not solely the `disabled` prop in this harness); U9+U10 independently pin the disabled semantics, and e2e A12/A16 cover the real keyboard skip. Recorded as a weaker mutant result.
- U12 (`selectedKey` -> `aria-current="true"` on exactly that row): passed; mutant `aria-current={undefined}` -> `1 failed`. Restored.
- U13 (`loading` -> `loadingContent`, no list, no empty): passed; mutant `{false ? loading-branch}` -> `1 failed`. Restored.
- U14 (empty `items` -> `emptyContent`, nothing selectable): **real red** — an empty cmdk `CommandList` (role=listbox) trips axe `aria-required-children` (critical). Fixed `Combobox.tsx`: the list stays mounted but `hidden` when there are no options (keeps cmdk's input `aria-controls` target valid), and the loading/empty text renders as a `role="status"` sibling; trigger `aria-controls` retargeted to `PopoverContent`'s id. Mutant `{false ? empty-branch}` -> `1 failed`. Restored.
- U15 (open popover — populated / empty / with a disabled row — zero axe): red until the U14 fix above; now 3 axe assertions pass in real Chromium.
- suite: `pnpm exec vitest run` -> 589 passed / 124 files
- refactor: `hasNoOptions` extracted; the two disabled-selection guards kept (combined mutant proved each is load-bearing without the other). 
- commit: (this commit — bundles cycles 9-15, the Combobox component's remaining behaviors + the empty-listbox a11y fix)

## Cycles 16-18: reference-catalogue-wire U16-U18

Post-rebase onto local main (`0dbde43`); baseline re-verified `pnpm exec vitest run` -> 589 passed / 124 files.

- U16 (well-formed payload parses to `ReferenceCatalogue`): red `Failed to resolve import "./reference-catalogue-wire.ts"` (module absent). Green: created `reference-catalogue-wire.ts` with `ReferenceCatalogueSchema` transcribed from contracts/candidate-catalogue-api.md (declarative schema, larger-than-minimal like cycle 4). Mutant `displayPath: z.number()` -> `1 failed`. Restored. Suite -> 590 passed.
- U17 (a preview outcome missing `steps` is rejected): passed first run. Mutant `steps: z.array(...).optional()` -> `1 failed`. Restored.
- U18 (unknown `outcome.kind` rejected by the discriminated union): passed first run. Mutant (union loosened to `z.object({ kind: z.string() }).loose()`) -> `1 failed`. Restored.
- suite: `pnpm exec vitest run` -> 592 passed / 125 files
- refactor: none (pure declarative schema)
- commit: (this commit — bundles cycles 16-18, the wire schema module + its two rejection guards)

## Cycles 19-28: reference-catalogue U19-U28

`buildReferenceCatalogue(index: ReferenceIndex): ReferenceCatalogue` — pure transform.

- U19 (every token path once as a candidate): red `Failed to resolve import "./reference-catalogue.ts"`. Green: created the module iterating `index.definitions` (token paths only — groups never enter `definitions`). Mutant (`continue` on one key) -> `1 failed`. Restored. Suite -> 593.
- U20 (no group path): passed first run — structural guarantee of `buildReferenceIndex` (`collectOccurrences` only pushes `kind === "token"`). No small mutant (would need to make the impl walk groups); pinned as a regression guard.
- U21 (single-def -> one definition, `mode: undefined`): passed; mutant (`d.mode ?? "forced"`) -> `1 failed`. Restored.
- U22 (multi-mode path -> one candidate, one definition per mode): passed with `LIGHT_DARK` resolver fixture; mutant (`defs.slice(0,1)`) -> `1 failed`. Restored.
- U23 (chained candidate -> end-of-chain preview value): **real red** — the minimal impl synthesised `{kind:"resolved", value: d.value}` from the raw `{...}` string. Green: exported `lookupForMode` from `reference-index.ts` (seam extraction — one `export` keyword, no behaviour change, `reference-index.test.ts` stays green) and added `previewOutcome()` which runs token-core `resolveReference(parseReference(def.value), lookupForMode(index, def.mode))` for a reference value, else the literal. Suite -> 597.
- U24 (missing -> `unresolved`) / U25 (group -> `group-target`) / U26 (cycle -> `circular`): passed once `previewOutcome` wired in `resolveReference` (token-core owns these outcomes). Combined mutant (`previewOutcome` never resolves references) -> U24, U26, U27 each `1 failed`. Restored.
- U27 (`preview[].outcome.steps` populated for a multi-hop chain): passed; covered by the same combined mutant (`["color.brand","color.blue"]` collapses to one step).
- U28 (`modes` mirrors the resolver; `[]` with no resolver): passed; mutant (`modes: []` always) -> `1 failed`. Restored.
- suite: `pnpm exec vitest run` -> 602 passed / 125 files
- refactor: `previewOutcome` extracted; `candidateFor` gained an `index` param. The `lookupForMode` export replaces what would have been a duplicated per-mode lookup.
- commit: `lookupForMode` export (structural) separate from the catalogue behaviour commit.

## Cycles 29-32: GET /api/tokens/references route U29-U32

`route.ts` — `listReferenceCatalogue(logger)` inner fn + `GET` wrapper (pattern from `app/api/tokens/route.ts`). Real temp-dir fixtures + `setConfigCache`.

- U29 (readable dir -> `200` body validates `ReferenceCatalogueSchema`): red `Failed to resolve import "./route.ts"`. Green: route runs `loadTokenDirectory` -> `loadResolverModes` -> `buildReferenceIndex` -> `buildReferenceCatalogue`. Mutant (route returns `{modes:[],candidates:[]}`) -> `1 failed`. Restored. Suite -> 603.
- U30 (`loadTokenDirectory` Err -> `500` `kind:"unknown"`) + U32 (via injected logger, no console) — one test, `chmod 0o000` the dir: passed. Mutant `if (false)` on the Err branch -> `1 failed` (U30). Mutant dropping the `logger` arg to `loadTokenDirectory` -> `1 failed` (U32, `state.calls` stays 0). Restored.
- U31 (present-but-invalid resolver file -> `200` `modes: []`): passed — `loadResolverModes` returns `ok(undefined)` on malformed JSON (feature 007), flows through to `modes: []`. First mutant (`_unsafeUnwrap()`) was equivalent (Ok(undefined)); decisive mutant (route hardcodes `modes: ["injected"]` instead of consulting `loadResolverModes`) -> `1 failed`. Restored.
- suite: `pnpm exec vitest run` -> 605 passed / 126 files
- refactor: none
- commit: (this commit — bundles cycles 29-32, the catalogue GET route)

## Cycles 33-37: useReferenceCatalogue hook U33-U37

`useReferenceCatalogue(fetchImpl = fetch)` — auto-fetches `/api/tokens/references` on mount, module-scope session cache, `AbortController` on unmount, never throws. `resetReferenceCatalogueCache()` exported (for a real token-set change, and between tests). `renderHook` + `act` per the `useSaveTokenEdits.test.tsx` exemplar.

- U33 (`idle -> loading -> ready` with payload): red `Failed to resolve import "./useReferenceCatalogue.ts"`. Green: hook built (larger-than-minimal — cache + abort included, cohesive). Mutant (success handler sets `"loading"`) -> `1 failed`. Restored.
- U34 (2nd consumer / re-open -> no 2nd fetch): passed. Two independent mechanisms (`inflight` promise dedup + `cachedCatalogue` sync-ready-on-reopen); single-mechanism mutants each still passed (defence in depth), **combined mutant** (remove `cachedCatalogue = parsed` AND `if (inflight === undefined)` -> `if (true)`) -> `1 failed`. Both kept.
- U35 (rejected fetch -> `status: "error"` + `SaveError` shape, no throw): passed. Mutant (rejection handler sets `"ready"`) -> `1 failed`. Restored.
- U36 (abort before resolve doesn't reject; a completed response still fills the cache): passed. Covered by the same combined mutant as U34. Restored.
- U37 (fetch reached only via injected `fetchImpl`): passed. Mutant (call global `fetch` instead) -> `1 failed`. Restored.
- suite: `pnpm exec vitest run` -> 610 passed / 127 files
- refactor: none
- commit: (this commit)

## Phase 2 (Foundational) complete — U1-U37 all DONE

Checkpoint met: `Command` + `Combobox` design-system primitives, the reference-catalogue wire schema + transform, `GET /api/tokens/references`, and `useReferenceCatalogue` are built and covered. Suite 610 passed / 127 files at this point.
