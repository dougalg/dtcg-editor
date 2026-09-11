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

## Baseline fix (session 3 preflight): reference-catalogue.ts type error

`pnpm build` (the authoritative type-check gate) was **red** from cycle 23:
`reference-catalogue.ts:29` — `resolveReference` returns token-core's deeply-`readonly`
`ResolutionChain`, not assignable to the mutable Zod-inferred `ResolutionChainWire`
(`Types of property 'steps' are incompatible ... 'readonly' ... cannot be assigned to the mutable type`).
Not caught earlier because cycle-log baselines used `pnpm exec vitest run` (vite transpile-only,
no type-check) rather than `pnpm build && …`. Behaviour was correct (U23-U28 green); type-only.

- fix: `previewOutcome` wraps the reference-branch result in `structuredClone(...) as ResolutionChainWire`
  — a plain mutable deep copy (sanctioned built-in, Principle VIII), behaviour-identical.
- verified: `pnpm --filter @dtcg-editor/web-app run build` -> type-checks (exit 0); `pnpm build` -> all 7 packages green; `reference-catalogue.test.ts` -> 10 passed.
- process correction: from here the per-green check is `pnpm build && pnpm exec vitest run`, not vitest alone.
- commit: (this fix commit, before resuming at U38)

## Cycles 38-48: candidate-filter U38-U48

`filterCandidates(candidates, query, edited): readonly ReferenceCandidate[]` — pure. Per-green check now `pnpm build && pnpm exec vitest run`.

- U38 (non-empty query -> case-insensitive substring on `displayPath`): red import error. Green: `.filter(c => c.displayPath.toLowerCase().includes(q))` after `q = query.trim().toLowerCase()`. Mutant `.startsWith(q)` -> `1 failed`.
- U39 (whole dotted path, not just leaf): passed. Mutant (leaf-only `split(".").at(-1)`) -> `1 failed`.
- U40 (order by first-match index) + U41 (alphabetical tie-break) — batched, one comparator: red (no sort). Green: `.sort` by `indexOf(q)` delta, then `localeCompare`. U41's first fixture had unequal positions (broken test) — fixed to leaf-only paths (`z.size`/`a.size`/`m.size`, match at index 2). Mutant (localeCompare only) -> U40 `1 failed`; mutant (posDelta only) -> U41 `1 failed`.
- U42 (no match -> `[]`): passed. Mutant `.filter(() => true)` -> `1 failed`.
- U43 (empty + whitespace query -> every candidate): passed. `if (q === "")` guard AND `includes("")` both return all (defence in depth); decisive mutant (`.slice(0,1)` in the empty-query branch) -> `1 failed`.
- U44 (bands: same-type -> same-file -> rest) + U45 (undefined edited type -> band 0 skipped) + U46 (alphabetical within a band) — batched, one `emptyQueryBand` + sort: red (no banding). Green: 3-band sort. U45 fixture strengthened with a `effectiveType: undefined` candidate to give the guard teeth. Mutants: reversed band delta -> U44 `1 failed`; dropped `!== undefined` guard -> U45 `1 failed`; `return [...candidates]` (no sort) -> U46 `1 failed`.
- U47 (edited token's own path not removed): passed. Mutant (filter out `edited.path`) -> `1 failed`.
- U48 (braces / leading dot matched literally): passed. Mutant (`query.replace(/[{}]/g, "")`) -> `1 failed`.
- fix: test line 124 `{ effectiveType: undefined }` -> omit the key (`exactOptionalPropertyTypes` — caught by `pnpm build`, not vitest).
- suite: `pnpm build` (7 pkgs green) + `pnpm exec vitest run` -> 621 passed / 128 files
- refactor: `emptyQueryBand` extracted.
- commit: (this commit — bundles cycles 38-48, the candidate-filter module)

## Cycles 49-56: candidate-selectability U49-U56

`isCircularIfSelected(editedTokenPath, candidate): boolean` — pure; real `ReferenceCatalogue` candidates built via `buildReferenceCatalogue(buildReferenceIndex(files))`.

- U49 (candidate IS the edited path -> true): red import error. Green: `samePath(candidate.path, editedTokenPath) || editedTokenPath in any preview step`. Fixture strengthened — `accent` is a *reference* token (chain runs through `blue`, not itself) so only the own-path check flags it. Mutant (drop the own-path check) -> `1 failed`.
- U50 (edited path a step in the 2-hop chain) / U51 (only in the 3-hop chain) / U52 (circular through edited under one mode only, multiply-defined): all passed. Mutant (drop the `preview.some(steps.some(...))` check -> `return false`) -> U50 `1 failed` (same code path serves U51/U52).
- U53 (unrelated pre-existing cycle) / U54 (missing) / U55 (group) / U56 (clean): all -> false. Mutant (`return true || ...`) -> all 4 `1 failed`.
- suite: `pnpm build` (green) + `pnpm exec vitest run` -> 629 passed / 129 files
- refactor: none (`samePath` helper is minimal)
- commit: (this commit — bundles cycles 49-56, the candidate-selectability module)

## Cycles 57-63: hypothetical-resolution U57-U63

`resolveIfRepointed(editedTokenPath, candidatePath, catalogue): HypotheticalResolution` — pure; builds a synthetic `ReferenceLookup` per mode over `catalogue.candidates` and delegates chain-walking to token-core `resolveReference`.

- U57 (`isSelf` iff paths deep-equal): red import error. Green: module built. Mutant (`isSelf: false`) -> `1 failed`.
- U58 (literal -> `resolved` + value) / U59 (chain -> end-of-chain value) / U60 (loop back to edited -> `circular` + `cyclePath`): passed. Mutant (lookup finds nothing) -> U58, U60 `1 failed` (U59 shares the lookup path).
- U61 (candidate path absent -> `unresolved`): passed. Mutant (lookup returns a fake hit for any path) -> `1 failed`.
- U62 (multiply-defined -> one perMode per mode, values differ): passed. Mutant (`modes` forced to `[undefined]`) -> `1 failed`.
- U63 (synthetic lookup picks the mode's definition, else the last): passed. Mutant (drop the `?? .at(-1)` fallback) -> `1 failed`.
- suite: `pnpm build` (green) + `pnpm exec vitest run` -> 636 passed / 130 files
- refactor: none (`samePath` local helper matches `candidate-selectability`'s; not worth a shared module yet)
- commit: (this commit — bundles cycles 57-63)

## Phase 3 pure-logic layer complete — U38-U63

`candidate-filter`, `candidate-selectability`, `hypothetical-resolution` all built test-first. 63/121 behaviors DONE. Remaining: components (U64-U101) + acceptance (A1-A20).

## Cycles 64-66: format-literal-value U64-U66 (brownfield extraction)

- U64 (characterization / BASELINE): TokenReferenceValue.test.tsx + .a11y.test.tsx (12 tests) already pin the current render. Confirmed green; deliberate mutant (formatLiteralValue -> always raw, drop Preview) -> 1 failed. State BASELINE.
- extraction (structural commit 3cfbc8a): formatLiteralValue + formatRaw moved from TokenReferenceValue.tsx to apps/web-app/lib/tokens/format-literal-value.tsx (kebab-case — .ls-lint.yml forbids a non-folder-matching .tsx in a component dir) + co-located .module.css. TokenReferenceValue.test.tsx stayed green (U64 held).
- U65 (returns the type's built-in Preview when a contract has one): passed post-extraction. Mutant (drop the Preview call) -> 1 failed. Restored.
- U66 (falls back to raw text — undefined / unknown type / Preview declines): passed. Mutant (return preview, no ?? span) -> 1 failed. Restored.
- suite: pnpm build (green) + pnpm exec vitest run -> 638 passed / 131 files
- refactor: none beyond the extraction
- commit: 3cfbc8a (structural), (this commit — U65/U66 tests)

## Cycle 67: U67 CandidatePreview renders the colour swatch, not just raw text

- test: `CandidatePreview.test.tsx::a colour candidate renders the swatch preview, not just raw text` (new)
- red: `Failed to resolve import "./CandidatePreview.tsx"`.
- green: minimal `CandidatePreview` — maps `candidate.preview` entries, `formatLiteralValue(outcome.value, outcome.type)` for a resolved outcome else `ReferenceWarning`. `pnpm build` caught a wire-vs-token-core type mismatch (`ResolutionChainWire.steps` `mode?` optional vs `ChainStep.mode` required) -> `as unknown as ResolutionChain` at the `ReferenceWarning` call site (previewOutcome always populates `mode`; same friction as cycle 23). Mutant (`outcome.kind === "resolved"` -> `false`) -> `1 failed`. Restored.
- suite: `pnpm build` (green) + `pnpm exec vitest run` -> 639 passed / 132 files
- refactor: none
- commit: (this commit)

## Cycles 68-75: CandidatePreview U68-U75

Built on the U67 component. `pnpm build` in the per-green check throughout.

- U68 (chained candidate -> end-of-chain value): passed (previewOutcome already resolved it). Mutant (`formatLiteralValue(null, ...)`) -> `1 failed`.
- U69 (multiply-defined -> one mode-labelled row per mode): passed. Mutant (`multiMode` -> `false`) -> `1 failed`.
- U70 (non-resolved outcome -> `ReferenceWarning`): passed. Mutant (warning branch -> `null`) -> `1 failed`.
- U71 (`diagnostic: "circular"` -> circular icon + "circular-reference" label): **real red** (no `diagnostic` prop). Green: `diagnostic` prop + inline-SVG `DiagnosticIcon` + `DIAGNOSTIC_LABEL` marker. Mutant (`diagnostic !== "none"` -> `false`) -> `1 failed`.
- U72 (`missing`/`group` markers, distinct from circular): passed against the same marker. Mutant (`DIAGNOSTIC_LABEL.missing` = "circular-reference") -> `1 failed`.
- U73 (with `hypothetical` -> "would resolve to" block, naming a cycle): **real red** (no `hypothetical` prop). Green: `hypothetical` prop + a per-mode block reusing an extracted `OutcomeValue` helper. Test fixed mid-cycle (multiple `role="alert"` — the candidate's own preview is also circular; switched to `getAllByRole` + scoped caption check). Mutant (drop the block) -> `1 failed`.
- U74 (a11y — plain / each diagnostic / with hypothetical): new `.a11y.test.tsx`, 3 axe checks pass. Mutant (SVG `role="img"` without a label) -> `1 failed`.
- U75 (no `lucide-react` import — inline SVG, Principle VIII): source-read test. First assertion (`not.toContain("lucide-react")`) matched a doc-comment; tightened to `not.toMatch(/from ["']lucide-react["']/)`. Mutant (add `import { AlertCircle } from "lucide-react"`) -> `1 failed`.
- suite: `pnpm build` (green) + `pnpm exec vitest run` -> 649 passed / 133 files
- refactor: `OutcomeValue` extracted (shared by the candidate's own preview and the hypothetical block).
- commit: (this commit — bundles cycles 68-75, the rest of CandidatePreview)

## Cycle 75 revision: U75 moved from a runtime test to a lint rule

The source-read test (`import("node:fs/promises")`) hit `biome`'s `noRestrictedImports`
(fs bindings only in `lib/platform/node-fs.ts`). A static "no `lucide-react` in
`apps/web-app`" constraint belongs in tooling, not a single-file runtime check:
added `lucide-react` to `noRestrictedImports.paths` for `apps/web-app/**` in
`biome.json` — enforced repo-wide, permanently, at every file. Verified it bites
(injected `import { X } from "lucide-react"` -> biome error). The fs-based test
was removed (Hard Rule 4: replaced, not weakened; venue was wrong). Suite 648.

## Cycle 76: U76 TokenReferencePicker fetches the catalogue on first open

- test: `TokenReferencePicker.test.tsx::first open triggers the catalogue fetch and shows a loading state` (new)
- red: `Failed to resolve import "./TokenReferencePicker.tsx"`.
- green: minimal picker = a `Combobox` whose trigger label is `Repoint reference for <path>`; `useReferenceCatalogue(fetchImpl, activated)` where `activated` flips true on first open (`enabled` gate — added to the hook as a structural refactor, commit 662cf2e, U33-U37 unaffected); `loading={status === "loading"}` -> `loadingContent`. Test harness: removed `document.body.innerHTML = ""` from afterEach (Radix portal + manual clear -> `NotFoundError`). Mutant (`enabled` forced `true`) -> `1 failed` (fetch fires before the click). Restored.
- biome.json: `TokenReferencePicker.{tsx,test.tsx}` added to the `noRestrictedGlobals(fetch)` exemption (injectable `fetchImpl`, same as `useSaveTokenEdits`).
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 649 passed / 134 files
- refactor: `enabled` gate on the hook (own commit 662cf2e).
- commit: 662cf2e (hook refactor), 97f2947 (U76)

## Cycle 102: U102 useReferenceCatalogue 'enabled' gate (behavior added mid-loop)

- Added to the test list while building U76 — the `enabled` param introduced as a seam in commit 662cf2e needed its own hook-level coverage.
- test: `useReferenceCatalogue.test.tsx::enabled:false stays idle and does not fetch until flipped to true` (new)
- red: passed on first run (impl added in 662cf2e). Mutant (drop `if (!enabled) return;` in the effect) -> `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 650 passed / 134 files
- refactor: none
- commit: (this commit)

## Cycles 77-83: TokenReferencePicker U77-U83

- U77 (trigger + search field name the token): passed post-wiring. Test fixed (both are `role="combobox"` — assert on `aria-label` values). Mutant (`triggerLabel="x"`) -> `1 failed`.
- U78 (typing -> `filterCandidates` -> narrowed list in order): **real red** (stub `items = []`). Green: `items = useMemo(filterCandidates(catalogue.candidates, query, {path, effectiveType, file}))`; added optional `editedEffectiveType` / `editedFile` props for the empty-query banding. Mutant (skip `filterCandidates`) -> `1 failed`.
- U79 (no match -> "No tokens found", nothing selectable): passed (Combobox `emptyContent`). Mutant covered via U78's filter mutation.
- U80 (select -> `onStageEdit(editedTokenPath, {value: "{path}"})` + close) / U81 (select current target -> no stage, still close): passed. One mutant (`onStageEdit(..., {value: "{wrong}"})` always) -> both `1 failed`.
- U82 (re-open -> current target row `aria-current="true"`): passed (`selectedKey`). Mutant (`selectedKey={undefined}`) -> `1 failed`.
- U83 (catalogue fetch errored -> raw-text `<input>` that stages edits, FR-021): **real red**. Green: `if (status === "error")` returns an `<input aria-label="Reference for <path>">` with `onChange -> onStageEdit`. Mutant (`if (false)`) -> `1 failed`.
- `pnpm build` caught `exactOptionalPropertyTypes`: `Combobox`'s `selectedKey?: string` can't take `string | undefined` -> widened to `string | undefined` (design-system, U12 unaffected).
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 657 passed / 134 files
- refactor: none
- commit: (this commit — U77-U83 + the Combobox selectedKey widen)

## Cycle 103: Combobox onHighlightChange (behavior added mid-loop, seam for U84)

- Added to the test list: `TokenReferencePicker`'s live region (U84) needs to know which row the highlight is on. Added `onHighlightChange?: (key | undefined)` to `ComboboxProps`, wired to cmdk `Command`'s `value`/`onValueChange` — **cmdk only fires `onValueChange` reliably when `value` is controlled**, so `Combobox` now holds an internal `highlight` state.
- test: `Combobox.a11y.test.tsx::onHighlightChange reports the key of the row the highlight moves to` — jsdom `fireEvent`/`dispatchEvent` do not drive cmdk's highlight eventing at all (same wall as U11); the browser tier does. `waitFor` + `dispatchEvent(KeyboardEvent ArrowDown)`.
- red: `expected "vi.fn()" to be called with [ 'a' ] — Number of calls: 0` (with uncontrolled `value`). Green: controlled `value={highlight}` + `handleValueChange`. Mutant (`onValueChange={setHighlight}`, skip `onHighlightChange`) -> `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 658 passed / 135 files
- refactor: none
- commit: (this commit)

## Cycle 84: U84 TokenReferencePicker aria-live result count

- Split from the list's compound U84 ("count AND highlighted value"): the **count** is jsdom-observable; the highlighted-candidate announcement depends on cmdk highlight eventing (jsdom-blind) and is covered at the e2e tier (A7/A10).
- test: `TokenReferencePicker.test.tsx::an aria-live region announces the current result count` (new)
- red: `Unable to find an accessible element with the role "status" and name "Search results"`.
- green: a visually-hidden `role="status" aria-live="polite"` region rendered outside the popover; text is `"N tokens match"` / `"No matches"` while open, `""` when closed. Given `aria-label="Search results"` to disambiguate from the Combobox's own `role="status"` loading/empty region.
- A first attempt also wired a `CandidatePreview` into every row's `renderItem`; that polluted every option's accessible name/textContent and broke U78/U80/U81/U82 -> **reverted to the U83 green** and redone with the count region only (playbook: step too big). The per-row preview returns in U85+.
- Mutant (`items.length` -> `0` in the template) -> `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 659 passed / 135 files
- refactor: none
- commit: (this commit)

## Cycle 85: U85 highlighted candidate's full preview in the picker's live region

(Post-rebase onto local main `4b9bbae`: vitest bumped v4 -> v5. Baseline re-verified green — 662.)

- test: `TokenReferencePicker.a11y.test.tsx::the highlighted candidate's full preview (value + would-resolve-to) shows in the picker's live region` — **browser tier** (cmdk highlight eventing is jsdom-blind, as with U11/U103).
- red: `expected '3 tokens match' to match /#0000ff/i` — no preview wired into the region.
- green: `Combobox.onHighlightChange` -> `setHighlightKey`; the highlighted candidate's `CandidatePreview` (with `resolveIfRepointed` `hypothetical`) rendered inside the `role="status"` region alongside the count. The per-row `renderItem` stays `c.displayPath` only (a full per-row preview broke option names in cycle 84 — that stays out).
- Test assertion relaxed after cmdk's controlled-`value` + dynamic-items would not advance the highlight past the second row reliably: asserts the auto-highlighted row's value + "would resolve to" block appear, and that arrowing keeps a resolved value shown. Exact multi-step highlight navigation -> e2e A7/A10.
- `pnpm build` caught `exactOptionalPropertyTypes`: `CandidatePreview.hypothetical?: HypotheticalResolution` -> widened `| undefined`.
- Mutant (drop the `{highlighted ? <CandidatePreview/> : null}`) -> `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 662 passed / 136 files
- refactor: none
- commit: (this commit)

## Cycles 86-87: TokenReferencePicker disabled circular rows / selectable missing-group (U86, U87)

- U86 (circular candidate row disabled -> select stages nothing, popover stays open): red `expected 'false' to be 'true'` (aria-disabled). Green: `isItemDisabled={(c) => isCircularIfSelected(editedTokenPath, c)}` to `Combobox`. The edited token `color.accent` is its own candidate -> self-cycle -> disabled. Mutant (`isItemDisabled={() => false}`) -> `1 failed`.
- U87 (missing/group candidate stays enabled + stageable): passed first run — `isCircularIfSelected` returns false for a missing target (U54). A `{color.ghost}` fixture candidate: not `aria-disabled`, clicking it stages `{broken}`. Mutant (`isItemDisabled={() => true}`) -> `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 664 passed / 136 files (vitest v5 re-optimizes deps on the first run after a change, briefly reporting a lower count + a `collectTests` line — settles on a second run).
- refactor: none
- commit: (this commit)

## Cycle 88: U88 TokenReferencePicker a11y (hosts A19)

- test: `TokenReferencePicker.a11y.test.tsx::the open picker, including a disabled circular row and the live region, has no WCAG 2.2 AA violations` (browser tier).
- Scoped to the picker-specific composition (trigger + `role="status"` live region + a disabled circular row): the empty-popover state's axe cleanliness is already `Combobox` U15's, and driving the picker's controlled search input to empty is browser-tier-flaky (setting `.value` + `input` event doesn't trip React's controlled `onQueryChange`).
- red/green: the populated + disabled-row axe run passed on first write. Mutant (`aria-expanded={"maybe"}` on the Combobox trigger) -> axe `aria-valid-attr-value` -> `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 664 passed / 136 files
- refactor: none
- commit: (this commit)

## TokenReferencePicker complete — U76-U88 (+ U102, U103)

## Cycle 89: U89 characterize TreeTokenNode path-1, then extract ReferenceEditControl

- behavior kind: `characterization` — capture the current path-1 (reference token) render before pulling it into its own component.
- The safety net is the existing `TreeTokenNode.test.tsx` reference cases (raw alias text, resolved list, name-error branch). `pnpm exec vitest run apps/web-app/components/TreeTokenNode/` -> 29 passed / 5 files — the baseline that must survive the refactor.
- Mutant check: `if (dispatch.reference !== undefined)` -> `if (false && dispatch.reference !== undefined)` -> `Failed Tests 4`. Restored. The cases do pin the path-1 render.
- State set to `BASELINE`.
- Structural extraction (separate commit `0152cc6`, on green): `ReferenceValueDisplay` + the path-1 `TokenBlock` render moved verbatim into `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.tsx`; `TreeTokenNode` path-1 now returns `<ReferenceEditControl ... />`. `useResolvedPreview` / `TokenReferenceValue` / `ResolvedReference` imports moved with it. `error` prop typed `FieldErrors | undefined`.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 664 passed / 136 files (unchanged from cycle 88).
- refactor: the extraction *is* this cycle's structural step; nothing further.
- commit: `0152cc6` (structural).

## Cycle 90: U90 ReferenceEditControl resting output matches the baseline

- test: `ReferenceEditControl.test.tsx::resting output matches the TreeTokenNode path-1 baseline: name field, raw alias, resolved value, no validation error` — renders `ReferenceEditControl` directly under a `StagedEditsContext.Provider`, cross-file reference (`targetFile "base.json"`, `relativePath "a.json"`) so the server `resolved` governs, matching the `TreeTokenNode` path-1 case.
- red (first draft used `relativePath "base.json"` → same-file → the store's live resolution took over and reported `Missing target: no token exists at "color.brand.blue"`): `Unable to find an element with the text: /srgb/`. Corrected the fixture to the cross-file scenario the baseline actually exercises; code unchanged.
- green: passes against the already-extracted component (parity test). Mutant (`ReferenceValueDisplay resolved={undefined}` in the render) → `1 failed`. Restored via `git checkout`.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` → 665 passed / 137 files.
- refactor: none.
- commit: (this commit).

## Cycle 91: U91 ReferenceEditControl hosts a repoint trigger with an accessible name

- test: `ReferenceEditControl.test.tsx::the reference row shows a repoint trigger whose accessible name identifies the edited token` — asserts a `role="combobox"` named `"Repoint reference for text"`, `aria-expanded="false"`.
- red: `Unable to find an accessible element with the role "combobox" and name "Repoint reference for text"` — no picker was mounted.
- green: mount `<TokenReferencePicker editedTokenPath={node.path} editedEffectiveType editedFile currentReferenceValue={rawRef} triggerContent="Change reference" onStageEdit={(_p,{value}) => onRepoint(value)} />` in the value field; new `onRepoint` + optional `fetchImpl` props on `ReferenceEditControl`, `TreeTokenNode` wires `onRepoint={(value) => commit({ value })}`.
- regression fixed in-cycle: the trigger first rendered `currentReferenceValue`, duplicating the raw alias text → U90's `getByText("{color.brand.blue}")` became ambiguous. Added a `triggerContent?: ReactNode` prop to `TokenReferencePicker` (defaults to `currentReferenceValue`) and passed `"Change reference"` from `ReferenceEditControl`.
- biome: `ReferenceEditControl.{tsx,test.tsx}` added to the `noRestrictedGlobals` (`fetch`) exemption list for the `typeof fetch` prop type.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` → 666 passed / 137 files.
- refactor: none.
- commit: (this commit).

## Cycle 92: U92 a pick through the hosted picker calls onRepoint with the alias

- test: `ReferenceEditControl.test.tsx::picking a candidate through the hosted picker calls onRepoint with the alias value` — stub `fetchImpl` catalogue (`color.blue|red|accent`), open the picker, click the `color.red` option, expect `onRepoint("{color.red}")`.
- Passed first run (the `onStageEdit -> onRepoint` bridge landed in U91). Mutant (`onStageEdit={() => {}}` in `ReferenceEditControl`) -> `expected "vi.fn()" to be called with [ '{color.red}' ]` -> `1 failed`. Restored via `git checkout`.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 667 passed / 137 files (v5 re-optimizes deps on the first run after a new test file, briefly reporting `4 failed` files + a `collectTests` line — settles on the second run).
- refactor: none.
- commit: (this commit).

## Cycle 93: U93 resolved-undefined resting value is the raw alias

- test: `ReferenceEditControl.test.tsx::when resolved is undefined (index build failed) the raw alias string is the resting value` — `renderControl({ resolved: undefined })`; the alias text is shown in the `styles.value` span, no `/srgb/` preview, no navigable link.
- red (first draft asserted `queryByRole("list")` is null — but the test's own wrapper `<ul>` / `TokenBlock`'s row is a list): `expected <ul>…</ul> to be null`. Retargeted to the value span's class + absence of the resolved preview / link; code unchanged.
- green: passes against the pre-existing `ReferenceValueDisplay` `resolved === undefined` branch. Mutant (`{rawRef}` -> `{""}` in that branch) -> `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 668 passed / 137 files.
- refactor: none.
- commit: (this commit).

## Cycle 94: U94 name-field error branch unchanged by the extraction

- test: `ReferenceEditControl.test.tsx::a name-field error is still surfaced through the shared FieldErrorSlot` — `renderControl({ error: { name: "That name is already taken", value: undefined } })`; the `role="alert"` text is that message.
- green first run (the extracted component forwards `error` straight to `TokenBlock`, which owns the `FieldErrorSlot`). Mutant (`error={undefined}` on the `TokenBlock` call) -> `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 669 passed / 137 files.
- refactor: none.
- commit: (this commit).

## Cycle 95: U95 ReferenceEditControl resting-state a11y (browser tier)

- test: `ReferenceEditControl.a11y.test.tsx::the resting reference row (value display + closed repoint trigger) has no WCAG 2.2 AA violations` — `apps/web-app:a11y` (real Chromium), `axe.run` over the rendered container with `WCAG_22_AA_TAGS`.
- green first run. Mutant (a bare `<input type="text" />` added beside the value label) -> axe `label` ("Ensure every form element has a label") -> `1 failed`. Restored.
- Scope: resting state only; the open-popover axe (populated / empty / disabled circular row) is A19 / `TokenReferencePicker.a11y.test.tsx` U88.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 670 passed / 138 files.
- refactor: none.
- commit: (this commit).

## Cycle 96: U96 TreeTokenNode delegates a reference row to ReferenceEditControl

- test: `TreeTokenNode.test.tsx::a reference-valued token delegates to ReferenceEditControl — the repoint trigger is present` — a reference token rendered through `TokenTree` exposes `role="combobox"` named `"Repoint reference for text"`, which only `ReferenceEditControl` renders.
- green first run (delegation landed in cycle 91). Mutant (`if (dispatch.reference !== undefined)` -> `if (false && …)` in `TreeTokenNode`) -> `7 failed` incl. this one. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 671 passed / 138 files.
- refactor: none.
- commit: (this commit).

## Cycle 97: U97 no repoint trigger on a literal-valued token (FR-022)

- test: `TreeTokenNode.test.tsx::a literal-valued token renders no reference repoint trigger (FR-022)` — a literal color token through `TokenTree` has no `role="combobox"` named `/repoint reference/i`.
- green first run (only the path-1 branch mounts `ReferenceEditControl`). Mutant (`dispatch.reference !== undefined` -> `=== undefined`) -> `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 672 passed / 138 files.
- refactor: none.
- commit: (this commit).

## ReferenceEditControl complete — U89-U97

## Cycle 104 (added mid-loop): U104 commit accepts a reference string without type-validating it

- Discovered while wiring U98: `TreeTokenNode`'s `onRepoint={(value) => commit({ value })}` staged nothing — `StagedEditsStore.#validateDraftValue` ran the token's type contract over the `{…}` string and rejected it, so `commit` returned `false`.
- test: `staged-edits-store.test.ts::commit stages a whole-value reference string without type-validating it` — a `color`-typed token, `commit("color.accent", { value: "{color.brand.blue}" })`.
- red: `AssertionError: false !== true` (`commit` rejected the reference).
- green: `#validateDraftValue` returns `undefined` (no error) when `typeof draft.value === "string" && parseReference(draft.value) !== undefined` — a reference is valid for any `$type` (contracts/reference-validation.md), matching what `TreeTokenNode` path-1 already assumes for display and what the PATCH route does on write (U100 BASELINE).
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 673 passed / 138 files.
- refactor: none.
- commit: (this commit).

## Cycle 98: U98 unsaved-changes guard fires on a picker-staged reference edit

- test: `TokenTree.test.tsx::the unsaved-changes guard intercepts a cross-file nav after a picker-staged reference edit` — `stubCatalogueFetch()` (endpoint-aware fetch stub), render `treeWithCrossFileReference()` at `semantic.json`, open the `text` row's picker and select `color.brand.red`, then click the cross-file link -> "Unsaved changes" dialog shows.
- red (first attempt, before U104): `Unable to find an element with the text: Unsaved changes` — the repoint reached `commit({ value })` which the store rejected, so nothing staged and the guard saw no pending edit. Split out **U104** (store must not type-validate a reference string), drove it, then restarted this cycle.
- green after U104. Mutant (`onRepoint={() => {}}` in `TreeTokenNode`) -> `1 failed`. Restored.
- New test infra in `TokenTree.test.tsx`: `beforeAll` jsdom polyfills (ResizeObserver / hasPointerCapture / scrollIntoView) for the Popover+cmdk picker, `resetReferenceCatalogueCache()` in `afterEach`, `stubCatalogueFetch` + `repointTextViaPicker` helpers.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 674 passed / 138 files.
- refactor: none.
- commit: (this commit).

## Cycle 99: U99 discard after a picker-staged repoint restores the saved reference

- test: `TokenTree.test.tsx::'Discard and leave' after a picker-staged repoint restores the previously saved reference` — repoint `text` at `color.brand.red` via the picker, trigger the cross-file guard, click "Discard and leave"; then Save is disabled (nothing pending) and re-opening the picker shows `color.brand.blue` (the saved target) as `aria-current="true"`, `color.brand.red` not.
- green first run (rides the existing `discardAll()` in `handleDiscardAndGo`). Mutant (comment out `discardAll();` in `handleDiscardAndGo`) -> `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` -> 675 passed / 138 files.
- refactor: none.
- commit: (this commit).

## Cycle 100: U100 PATCH writes a reference string verbatim (characterization)

- Already covered by an existing passing test on `main`: `route.test.ts::PATCH accepts a reference value without running it through the target type's valueSchema` (commit `9eb280b`, feature 003's T022-T025). It writes `value: "{color.brand.blue}"` to a `color` token → `200`, on disk verbatim, not rejected by `ColorValueSchema`. That is exactly U100's behavior.
- Per the playbook Phase 1 ("already covered by an existing passing test → verify it asserts the behavior, mark DONE with the test named"): verified, state stays `BASELINE`, `test` column points at the concrete test. No code, no new test, no commit of its own.

## Cycle 101: U101 repoint round-trip changes exactly one $value (hosts A20)

- test: `route.test.ts::PATCH repointing a reference changes exactly that one $value and nothing else (SC-007, hosts A20)` — a fixture with a reference token carrying `$description` + `$extensions`, sibling colour/dimension tokens, nested groups; PATCH repoints `color.text` to `{color.brand.green}`; the whole parsed on-disk file deep-equals the original with only that one `$value` changed.
- green first run (the PATCH route already writes references verbatim — U100). Mutant (`value = edit.value` → `value = \`${edit.value} \`` in the route's reference branch) → `deepEqual` diff on the trailing space → `1 failed`. Restored.
- suite: `pnpm build` (7/7) + `pnpm exec vitest run` → 676 passed / 138 files.
- refactor: none.
- commit: (this commit).

## Inner loop complete — U1-U104 all DONE/BASELINE

## Outer loop status

- **A19** (open-popover axe) — closed by U88's `TokenReferencePicker.a11y.test.tsx` (populated + disabled circular row + live region) plus `Combobox` U15 for the empty-popover state. No separate Playwright axe host exists for a mounted popover; state -> DONE.
- **A20** (repoint round-trip, one `$value` diff) — closed by U101 in `route.test.ts` (integration tier; no acceptance runner reaches the written file). State -> DONE.
- **A1–A17** — DONE (T030, T038, T046 cycles above). Turned out not to need the T002 fixture extension: the existing `token-references` set already had every shape needed.
- **A18** — DONE. Was BLOCKED (T048 above: a real perf gap at ~2,000 candidates); closed by the render cap (T048's follow-up) plus the idle-query revision immediately below, which removes the expensive full-directory idle listing entirely.
- **A1–A18 all DONE.** Outer loop closed pending T050–T052/T055 (polish/gate, no behavior markers — `/speckit.implement`'s scope, not this loop's).

## Cycle: U105 diagnosticFor + picker row visual wiring (opening the outer loop)

Discovered while starting T030/T038: the outer-loop acceptance behaviors A7,
A9, A15, A16 require each candidate row to visibly show its diagnostic /
resolved value, but `TokenReferencePicker`'s `renderItem` only ever returned
`c.displayPath` — no unit or a11y test caught this because U84/U85 deferred
the actual visible-content assertion to e2e (see test-list.md notes on both).

- test: `apps/web-app/lib/tokens/candidate-diagnostic.test.ts` (new, 4 cases)
- red: `pnpm exec vitest run apps/web-app/lib/tokens/candidate-diagnostic.test.ts`
  → `Error: Failed to resolve import "./candidate-diagnostic.ts"` (file did not
  exist). After adding a first-draft implementation: 2/4 failed —
  `AssertionError: 'none' !== 'missing'` / `'none' !== 'group'` (used
  `entry.outcome.kind` where the wire shape is `entry.outcome.outcome.kind` —
  `preview[].outcome` is a `ResolutionChainWire`, not the `ChainOutcome`
  itself).
- green: fixed the field path in `candidate-diagnostic.ts`. 4/4 passed. Wired
  `diagnosticFor` + `CandidatePreview` into `TokenReferencePicker.tsx`'s
  `renderItem` (diagnostic always, `hypothetical` only for the highlighted
  row), wrapped in `aria-hidden` so the option's accessible name stays the
  bare `displayPath`. This broke 4 existing `TokenReferencePicker.test.tsx`
  assertions that queried `getByRole("option", { name: "…" })` with an exact
  name (now the accessible name was unaffected — those 3 actually stayed
  green) and 1 that asserted `option.textContent` exactly equals
  `["color.red"]` (this one broke — legitimately, since the row now visibly
  carries more than the path, which is what FR-009 asks for). Updated that
  one assertion to check the option count + accessible name instead of raw
  textContent. Full suite: `pnpm exec vitest run` → 680 passed / 139 files
  (was 676/138).
- refactor: none beyond the aria-hidden wrapper decision above.
- commit: (this commit)
- notes: no new behavior id for the picker wiring — it is the production
  half of the already-listed U85, not a newly discovered observable result.
  `U105` is new (the `diagnosticFor` pure function itself).

## Cycle: T030 — US1 acceptance spec (A1, A2, A3, A4, A5, A6, A17)

`apps/web-app/e2e/edit-token-references.spec.ts` did not exist, so the file
itself was the red: `pnpm --filter @dtcg-editor/web-app exec playwright test
edit-token-references.spec.ts --project=token-references` had nothing to run
before this cycle. All 7 tests passed on the very first real run — expected,
since every unit each one composes over (U1-U105) was already DONE — so per
the playbook's "test passes on first run" rule, each was checked with a
deliberate mutant instead of trusted at face value:

- A17 + A1: mutated `filterCandidates`' empty-query branch to
  `.slice(0, 3)` before sorting → A17 failed (`Expected: 14, Received: 3`,
  `getByRole('option')` resolved to 3 elements) and A1 failed too (its
  cross-file candidate assertions happened to fall outside the truncated
  three). Reverted; rebuilt; both green again.
- A2: mutated the non-empty-query branch from `.includes(q)` to
  `.startsWith(q)` → A2 failed (`brand.blue` no longer matches
  `color.brand.blue`, `getByRole('option')` resolved to 0 elements).
  Reverted; rebuilt; green again.
- A3, A4, A5, A6 not independently mutant-checked this cycle: A4/A5 assert
  against the literal written file content through the same PATCH path
  U101 already mutant-verifies at the unit tier (test-list.md, U101 note);
  A3/A6 assert `aria-expanded`/focus/count directly against real DOM state
  with no room for a tautological pass. Documented here rather than skipped
  silently.
- Playwright config: added `edit-token-references.spec.ts` to the
  `token-references` project's `testMatch` (port 3101, this fixture set) and
  to `default`'s `testIgnore`, so it never runs against the wrong fixtures.
- No new fixtures needed (T002 as originally scoped): the existing
  `token-references` fixture set already contains every shape these 7 tests
  needed — cross-file candidates (A1), a mid-path-only substring match
  (A2, `color.brand.blue`), and a 14-candidate catalogue (A17), counted with
  a throwaway script over `buildReferenceCatalogue` + this fixture directory.
- suite: `pnpm exec vitest run` unaffected (e2e-only cycle, no unit files
  touched). `playwright test edit-token-references.spec.ts --project=token-references`
  → 7 passed.
- refactor: none.
- commit: (this commit)

## Cycle: T038 — US2 acceptance spec (A7, A8, A9, A10, A11)

Extended `edit-token-references.spec.ts` with a second `describe` block,
edited token deliberately **not** `color.text.primary` (US1's target) —
that path is also the only multiply-defined candidate, so highlighting it
while editing itself would hit the circular/self case (FR-013) instead of a
normal preview. Edits `color.unaffected-sibling` in
`references-unparseable.tokens.json` instead; no file is ever saved in this
block, so no fixture backup/restore needed.

All 5 passed on first real run except two selector bugs caught immediately
(not mutants — genuine test mistakes):

- A7/A8: asserted `option.locator('[style*="--swatch-color"]')` had
  `toHaveCount(1)`, got 3 — the sole matching candidate is also
  auto-highlighted by cmdk, so its row carries **both** its own
  `candidate.preview` swatch **and** the highlighted-only `hypothetical`
  block's per-mode swatches (2 catalogue modes: light, dark) = 3 total.
  Not a bug; loosened to `.first()` + `toBeVisible()`.
- A10: `getByRole("status", { name: "Search results" })` was a strict-mode
  violation — every `TokenReferencePicker` instance on the page renders its
  own (empty, closed) live region, so the page had 2. Scoped to
  `getByTestId("token-color.unaffected-sibling")` first.

Then, per the playbook's first-run-pass rule, deliberate-mutant checked A9
(mode-labelling — the one most exposed to a tautological pass, since the
same page also shows mode labels in the *hypothetical* block):

- red (mutant): `CandidatePreview.tsx`'s `multiMode && entry.mode !==
  undefined` ternary (the *candidate's own* per-mode label, not the
  hypothetical one) forced to `false`. First version of A9 (assert
  `option` `toContainText(/light/i)` / `/dark/i`) **did not catch it** — the
  hypothetical block's own (unmutated) mode labels satisfied the same
  substring assertions. That is a real test weakness the mutant check
  exists to catch, not a false positive: caught, not silently accepted.
- Rewrote A9 to assert `option.getByText("light:", { exact: true })` /
  `"dark:"` have count **2** each (one from the candidate's own preview +
  one from the hypothetical), instead of merely present. Re-ran against the
  same mutant → correctly failed (`Expected: 2, Received: 1`). Reverted the
  mutant, rebuilt, re-ran clean → 2/2 passed.
- A7, A8, A11 not independently mutant-checked: A7/A8 assert both a real DOM
  attribute (`--swatch-color`, only ever set by `Swatch.tsx`'s own
  colour-parsing branch) and a value-specific regex, which a vacuous
  render can't satisfy; A11 asserts a real `aria-current` DOM attribute
  after a full select → close → reopen round trip, already the same shape
  U82 mutant-verifies at the unit tier.
- suite: `pnpm --filter @dtcg-editor/web-app exec playwright test
  edit-token-references.spec.ts --project=token-references` → 12 passed
  (US1's 7 + US2's 5).
- refactor: none.
- commit: (this commit)

## Cycle: T046 — US3 acceptance spec (A12, A13, A14, A15, A16), and a real product-gap fix found along the way

Third `describe` block, editing `color.text.primary` again (US1's target) —
its own path being a circular candidate is exactly A12's setup, and its
existing chain (`text.primary -> brand.blue`; `action.default ->
text.primary`) makes `color.action.default` a genuine cycle-closing
candidate for A13. No file save happens in this block.

Two real bugs found (not test mistakes) while making A12/A13 pass, both
fixed with their own red-green-refactor cycle before the acceptance test
was retried:

1. **A12**: `own.click()` timed out — Playwright's actionability check
   refuses a real pointer click on an element it can't call "enabled"
   (cmdk sets both `aria-disabled` and pointer-event gating from the same
   `disabled` prop). This is FR-024 working correctly (a disabled row
   really can't be clicked), not a test bug — switched to `click({ force:
   true })` to still exercise the `onSelect` guard directly, and added an
   `Enter`-key attempt for the same assertion.

2. **A13**: the highlighted-only "would resolve to" cycle-naming (FR-014)
   never appeared for `color.action.default`, a genuine (non-self)
   cycle-closing candidate. Root cause, chased through two layers:
   - cmdk's own `CommandItem` ties `onPointerMove` (highlight-on-hover) and
     the "pick the first item on mount/list-change" (`W()`/`Q()`) logic to
     the *same* `disabled` flag as `aria-disabled` — a disabled row can
     never become cmdk's `value`, by hover **or** hard-coded initial
     select, so `TokenReferencePicker`'s `highlightKey` could never equal a
     disabled candidate's key except by coincidence at the very first
     unfiltered render. New unit test `TokenReferencePicker.test.tsx`
     (U108) pins this: a non-self cycle-closing candidate names the cycle
     even when it isn't `highlightKey`. Fixed by computing the
     hypothetical for *every* diagnostic-circular row, not only the
     highlighted one — matches FR-014's own wording ("The control MUST
     identify a candidate ... and, in the preview, name the tokens in the
     cycle"), which (unlike FR-012's "for the highlighted candidate")
     carries no highlight qualifier.
   - Once every circular row got a computed hypothetical, `wheel`/`hub`
     style non-self cycles still previewed as `"resolved"`, not
     `"circular"` — `resolveIfRepointed` walked from `candidatePath`
     against the *unmodified* real catalogue, so it only ever caught a
     cycle that was *already real* in the fixture (which is all the
     existing U60 test happened to cover — `edited -> {loop}`, `loop ->
     {edited}`, a pre-existing cycle unrelated to any hypothetical
     repoint). New unit test `hypothetical-resolution.test.ts` (U107) pins
     the actually-hypothetical case (`wheel -> {hub}`, clean today; hub
     repointed at wheel would close it). Fixed by walking from
     `editedTokenPath` instead, with `editedTokenPath`'s own lookup
     overridden to the hypothetical value — `resolveReference`'s own
     `visited` set then catches a real revisit of `editedTokenPath`
     correctly. Bonus: this also fixes the `isSelf` case, which the old
     approach silently mis-reported as `"resolved"` whenever the edited
     token's *current* value happened to be clean.
   - red (U108): `TokenReferencePicker.test.tsx -t "names the cycle even
     when"` → `AssertionError: expected 'color.wheelcircular-reference…'
     to match /color\.hub/`.
   - red (U107): `hypothetical-resolution.test.ts` → (written directly
     against the not-yet-fixed function) `'resolved' !== 'circular'`.
   - green: both — `pnpm exec vitest run
     apps/web-app/components/TokenReferencePicker
     apps/web-app/lib/tokens/hypothetical-resolution.test.ts
     apps/web-app/components/CandidatePreview` → all passed; full fast
     suite `pnpm exec vitest run` → 681 passed / 139 files.

A14 also needed one selector fix after these two: the loop's second
iteration intermittently collided in the *full-file* run (`strict mode
violation … resolved to 2 elements`) — `CommandInput` hardcodes
`aria-expanded="true"` unconditionally (cmdk's own listbox semantics,
unrelated to `Popover` open/closed state), so a `/search tokens/i`
page-wide query could still match a just-closed-but-not-yet-unmounted
picker from the loop's first iteration. Fixed by naming the search field
per path (`Search tokens to repoint ${path}`) and waiting for it to
`toBeHidden()` before the next iteration, instead of trusting the
trigger's own `aria-expanded` alone. Reproduced the race twice before the
fix, ran clean twice after.

- suite: `pnpm --filter @dtcg-editor/web-app exec playwright test
  edit-token-references.spec.ts --project=token-references` → 17 passed
  (US1's 7 + US2's 5 + US3's 5), twice in a row.
- refactor: none beyond the two production fixes above (each its own
  red-green pair, not a refactor of green code).
- commit: (this commit)

## Cycle: T047 — candidate-filter micro-benchmark (supports A18/SC-004)

`apps/web-app/lib/tokens/candidate-filter.bench.ts` — times `filterCandidates`
plus a full `isCircularIfSelected` pass (what `TokenReferencePicker`'s
`renderItem` actually does per row via `diagnosticFor`, U105) over a
synthetic 1,000-candidate catalogue, across 7 simulated keystrokes × 10 runs.
Not a red-green cycle in the usual sense — `filterCandidates` and
`isCircularIfSelected` are both pure and already fully implemented; this is
a performance *gate* against existing code, same shape as
`reference-index.test.ts`'s pre-existing SC-010 benchmark, which it follows
for pattern (wall-clock via `performance.now()`, not the DI clock seam, and
isolated into its own late `sequence.groupOrder` project so it doesn't
compete with the rest of the suite for CPU).

- `vitest.config.ts`'s `BENCH_FILE` (singular, one hardcoded path) became
  `BENCH_FILES` (array) to add this file alongside
  `reference-index.test.ts` — both excluded from the normal `:unit`
  project's glob, both included in the `:bench` project.
- suite: `pnpm exec vitest run --project "apps/web-app:bench"` → 15 passed
  (14 existing `reference-index.test.ts` + this one). Full fast suite:
  `pnpm exec vitest run` → 683 passed / 140 files (was 681/139) — confirms
  the new file isn't also picked up by the default `:unit` project.
- refactor: none.
- commit: (this commit)

## Cycle: T048 — A18 acceptance-perf spec, BLOCKED with a real finding

`apps/web-app/e2e/edit-token-references-perf.spec.ts`, "default" Playwright
project, `large_scale.tokens.json` (already ≥2,000 candidate paths, no new
fixture needed — `group-0.sub-0.token-1`'s existing `{hub}` value is the
reference token exercised).

- First real run (after two selector-only fixes — `getByRole("option")`
  unscoped also matched this page's native `<select>` colour-space
  dropdowns' own hidden `<option>`s; the initial catalogue fetch/parse
  itself needed excluding from the measured window, or its arrival
  mid-keystroke inflated the count): **genuine red**, not a test bug —
  `pnpm --filter @dtcg-editor/web-app exec playwright test
  edit-token-references-perf.spec.ts --project=default` →
  `long tasks over budget: 170, 80ms` while typing `"token-0"` into an
  already-loaded, already-open picker over the full ~2,000-candidate list.
- Tried one small, well-justified fix: wrapped `CandidatePreview` in
  `React.memo` — every non-circular, non-highlighted row's `diagnostic`
  ("none", a string literal) and `hypothetical` (`undefined`) stay
  referentially stable across keystrokes for any candidate that survives a
  narrowing, so memo should skip re-invoking most rows' render function.
  Re-ran: **still red** — `long tasks over budget: 140, 51, 59ms`.
  Marginal-at-best; the dominant cost is evidently the *first* keystroke's
  reorder/reconciliation over a near-full ~2,000-row list (empty-query
  band order → match-position order touches nearly every remaining row),
  which memoized props can't avoid — a reorder still moves/diffs that many
  DOM nodes even when no individual row's content changes.
- **Stopping here rather than improvising further**, per the playbook's
  escape hatch for a step too big for one cycle: a real fix needs capping
  or virtualizing the rendered result list (e.g. render only the top N
  matches with a "N of M shown — narrow your search" indicator) — a new,
  spec-worthy behavior with its own accessibility and empty/degenerate-case
  implications, not a same-cycle tweak. `memo` is kept (real, harmless
  improvement; unit suite unaffected, all 17 `edit-token-references.spec.ts`
  tests re-verified green after it) but the acceptance test itself stays
  authored and red, its failure evidence above the record.
- suite: `pnpm exec vitest run` → 683 passed / 140 files (unaffected by the
  `memo` wrap). `edit-token-references.spec.ts --project=token-references`
  → 17 passed (re-verified after the `memo` change, no regression).
- refactor: none (the `memo` wrap *is* the attempted fix, not a
  behavior-preserving cleanup of green code).
- commit: (this commit)
- **Recommendation for the next session**: cap `TokenReferencePicker`'s
  rendered `items` at some N (a few hundred), independent of `Combobox`
  itself (keep `Combobox` filter-agnostic per its own contract) —
  `filterCandidates`'s ordering already puts the most likely matches first,
  so a cap loses only long-tail results a user would keep typing past
  anyway. Needs: a truncation-aware count in the `aria-live` announcement
  (U84), a new unit behavior + test for the cap itself, and a mutant-
  verified re-run of this same acceptance spec once implemented.

## Cycle: T049 — degradation when the catalogue route fails (FR-021)

New `describe` block in `edit-token-references.spec.ts`: `page.route()`
intercepts `**/api/tokens/references` to a `500`, then opens the picker on
`color.text.primary`. Passed on first real run; deliberate-mutant checked
(`TokenReferencePicker.tsx`'s `status === "error"` branch guard forced to
`false && …`) — confirmed red (`element(s) not found` for the raw-text
input), reverted, rebuilt, green again.

- suite: `edit-token-references.spec.ts --project=token-references` → 18
  passed (17 above + this one). Full fast suite: `pnpm exec vitest run` →
  683 passed / 140 files (unaffected — e2e-only cycle).
- refactor: none.
- commit: (this commit)

## Cycle: idle query no longer lists the whole directory (FR-020 revision, follow-up to A18)

User decision after the A18 fix (research doc + capping): don't show all
candidates by default — wait for the user to type. Clarified via
`AskUserQuestion`: on reopen with an already-staged/current target, show
that one row (pre-selected) rather than nothing, so FR-018's "reopening
shows what's currently pointed at" keeps working without typing.

- `packages/design-system/src/components/Combobox/Combobox.tsx`: new
  `listFooter?: ReactNode` prop, rendered after the item list (additive,
  not a replacement for `emptyContent`/`loadingContent`) — the caller-owned
  "N more — refine your search" affordance the render cap needs. Test
  first (`Combobox.test.tsx`, 2 new cases: renders when provided, absent
  otherwise) — red (element not found) → green.
- `TokenReferencePicker.tsx`: `allItems` for an empty/whitespace query is
  now `catalogue.candidates.filter(c => alias(c.path) === stagedTarget)`
  (0 or 1 row) instead of the full `filterCandidates` banded list;
  `emptyContent`/the live-region announcement distinguish "Type to search
  tokens" (idle, nothing to show) from "No tokens found" (typed, no
  match). New unit tests first (`TokenReferencePicker.test.tsx`): idle
  shows only the current target's row, pre-selected; idle with no
  current-target match shows nothing + the prompt. Both red (received the
  old full/empty-catalogue list) → green.
- Found and fixed one more real bug while verifying: the popover's `query`
  state wasn't reset on close, so a leftover search from a prior open
  session silently narrowed (or emptied) the *next* reopen's idle listing
  instead of showing the current target — caught by
  `TokenTree.test.tsx`'s discard-and-reopen test breaking for a reason
  unrelated to the fix under test. New test first (`TokenReferencePicker.test.tsx`,
  "closing the popover resets the query") — red → green
  (`handleOpenChange` now clears `query` on close).
- This deliberately breaks the idle-full-listing assumption in 9 existing,
  previously-green tests across 4 files (`TokenReferencePicker.test.tsx`
  ×7 internal to that file's own suite before the additions above,
  `TokenReferencePicker.a11y.test.tsx` ×1, `ReferenceEditControl.test.tsx`
  ×1, `TokenTree.test.tsx` ×1, `edit-token-references.spec.ts` ×3 e2e:
  A1/A17/A16) and the acceptance-level A1/A17/A16 scenarios — each updated
  to type a query first (or, for A17, filter on "." since every fixture
  path is dotted) rather than reading the old idle full list, per this
  session's explicit decision; `spec.md` FR-018/FR-020, the "Whitespace-
  only or empty query" edge case, and US1 scenario 1 updated with a dated
  Revision entry, matching this doc's existing convention (see the
  2026-09-01 circular-reference revision above it).
- suite: `pnpm exec vitest run` → 689 passed / 140 files.
  `edit-token-references.spec.ts --project=token-references` → 18 passed.
  `edit-token-references-perf.spec.ts --project=default` (A18, previously
  BLOCKED) → **now passes** — idle starting from 0-1 rows instead of the
  full directory removes the first-keystroke near-full-list reorder that
  the earlier capping fix alone hadn't fully absorbed.
- refactor: none beyond the query-reset fix above (itself a behavioral
  fix, not a cleanup of green code).
- commit: (this commit)

## Note: TreeTokenNode.tsx line count (T027 / Principle X)

The `ReferenceEditControl` extraction took `TreeTokenNode.tsx` from 409 -> 363 lines.
Still over the 300-line ceiling T027 asks to confirm. That ceiling is a
structural/lint check (T050 / `pnpm lint`), out of scope for this loop per the
test-list; T027 stays unticked until the file is brought under 300 (further
extraction of the non-reference dispatch paths, no behaviour change). U96/U97 —
T027's behavioural half — are DONE.

## Cycle: T056 remediation — pin resolveIfRepointed's walk-start (verification.md Finding 1)

`/speckit-tdd-verify`'s deliberate mutant (`targetPath: editedTokenPath` →
`candidatePath`) survived inside `U107` because no test asserted the chain's
`steps` order — only `outcome.kind`, which the `editedTokenPath` lookup override
produces correctly either way for the sampled fixture.

- test: `hypothetical-resolution.test.ts::the hypothetical chain's steps start
  at the edited token itself, so the cycle names hub before wheel` (new)
- First run: **passed** (the implementation was already correct from the U107
  cycle; only the assertion was missing). Per the playbook, applied the
  verification report's own mutant: `targetPath: editedTokenPath` →
  `candidatePath` in `hypothetical-resolution.ts` → `AssertionError: expected
  ["wheel"] to deeply equal ["hub"]` at `chain.steps[0]`. Restored exactly;
  `pnpm exec vitest run apps/web-app/lib/tokens/hypothetical-resolution.test.ts`
  → 9/9 green again.
- green: no implementation change needed — the test alone closes the gap.
- refactor: none.
- suite: `pnpm exec vitest run` → 690 passed / 140 files (was 689/140).
- commit: (this commit)

## Cycle: T058 remediation — assert the pointer refusal itself, not only the onSelect guard (verification.md Finding 3)

A12/A13 used `click({ force: true })` straight away — proving the `onSelect`
guard, but never asserting the row is actually inert to a real pointer click
(FR-024's own wording).

- test: added `await expect(own.click({ trial: true, timeout: 2000
  })).rejects.toThrow()` before each `force: true` click, in both A12 and A13.
  `trial: true` runs Playwright's actionability check (wait/scroll/hover)
  without dispatching the click.
- First run: **passed** against the real app (2.3s/2.5s — a healthy,
  freshly-restarted server; the earlier session-long flakiness turned out to
  be partly a **stale reused `next start` process** serving an old build
  across repeated `pnpm build` calls — `webServer.reuseExistingServer` — not
  purely OS contention. Killed the port-3101/3100/3102 listeners before each
  rebuild from here on).
- Deliberate mutant, attempt 1: removed `candidate-selectability.ts`'s
  self-path check (the same mutant `/speckit-tdd-verify` used at the unit
  tier) — **did not fail A12**. Root cause: `color.text.primary` is
  multiply-defined, and its **dark**-mode preview's `steps[0].path` is
  `["color","text","primary"]` (the literal dark-mode definition records
  itself as the chain's starting step), so the `.some()` fallback in
  `isCircularIfSelected` still returns `true` for this specific fixture even
  without the explicit self-check — a fixture-specific coincidence, not a
  flaw in the new assertion. Reverted.
- Deliberate mutant, attempt 2: `TokenReferencePicker.tsx`'s
  `isItemDisabled` forced to always return `false` (still calling
  `isCircularIfSelected` so the import stays used) — directly removes the
  pointer-block regardless of the underlying detection logic. **Caught**:
  both A12 and A13 failed — `Expected: "true", Received: "false"` on
  `aria-disabled` (the pre-existing check fails first; the new trial-click
  assertion is exercised alongside it, not proven to fail in isolation on
  this particular mutant, but the row is confirmed genuinely pointer-clickable
  under the mutant, which is what the new assertion is written to catch).
  Restored exactly; `edit-token-references.spec.ts --project=token-references`
  → 18/18 green again (16.8s).
- suite: `pnpm exec vitest run` → 690 passed / 140 files (unaffected — e2e-only
  cycle).
- refactor: none.
- commit: (this commit)

## Cycle: T059 remediation — three LOW findings (verification.md Findings 4-6)

- **Finding 4** (`candidate-diagnostic.test.ts`): renamed "…circular, ahead of
  any other outcome" to drop the unproven precedence claim, and added a new
  test, "circular takes precedence over missing when a candidate is both"
  (`accent: {$value: "{color.nope}"}`, editing `accent` — accent is both its
  own path *and* its own preview is `unresolved`). First run: passed
  (implementation already correct). Deliberate mutant: reordered
  `diagnosticFor` to check missing/group before circular →
  `AssertionError: expected 'missing' to equal 'circular'` on the **new**
  test only (the older, non-competing fixture still passed, confirming the
  new test is what closes the gap). Restored; `candidate-diagnostic.test.ts`
  → 5/5 green.
- **Finding 5** (`Combobox.test.tsx`): "listFooter renders after the item
  list" now also asserts real DOM order via
  `lastOption.compareDocumentPosition(footer) & DOCUMENT_POSITION_FOLLOWING`,
  not just presence. First run: passed. Deliberate mutant: moved the
  `listFooter` block above `CommandList` in `Combobox.tsx` →
  `AssertionError: expected 0 to be truthy`. Restored; suite → 12/12 green.
- **Finding 6** (`edit-token-references.spec.ts`, A7/A8): A7's swatch
  assertion now pins the specific `--swatch-color` value
  (`color(srgb 0.2 0.4 0.9)`, from `css-color.ts`'s known format for that
  literal) instead of only "a swatch element exists". **A8 was not
  strengthened the same way** — doing so surfaced a real ambiguity, not a
  test bug: `color.action.hover`'s own (single-definition) preview resolves
  through the multiply-defined `color.text.primary`, and `.first()` on
  `--swatch-color` picked up the **dark**-mode value (`0.95 0.95 0.95`, via
  mode-fallback-to-last-definition), not the light-mode end-of-chain value
  the test's name/comment describes — the `0.2 0.4 0.9` text A8 already
  asserted was coming from the *hypothetical* block's own light-mode entry,
  not the candidate's own preview swatch. Reverted A8's swatch line to its
  original `.first()).toBeVisible()` form with a comment explaining why, and
  left the underlying mode-fallback-vs-end-of-chain question unresolved
  (worth its own investigation, out of scope for a LOW-severity test-name
  finding).
- suite: every affected file verified green **in isolation**:
  `candidate-diagnostic.test.ts` 5/5, `Combobox.test.tsx` 12/12,
  `edit-token-references.spec.ts --project=token-references` 18/18 (16.1s).
  Full-suite `pnpm exec vitest run` was **not** obtained clean this cycle —
  three consecutive attempts each failed a different, unrelated file or two
  (`TreeGroupNode.test.tsx`, `TokenTree.test.tsx`'s pre-existing discard
  test, then `packages/token-editor-color`'s `ColorEditor.test.tsx` — a
  package this feature has never touched), and one attempt even made the
  Bash safety classifier itself time out. Every one of those "failing"
  files was re-run alone immediately after and passed cleanly. This is the
  same class of local-machine resource exhaustion recorded against T055 —
  worker-process thrash under a very long, build/test-heavy session — not a
  regression from T059's changes.
- refactor: none.
- commit: (this commit)
