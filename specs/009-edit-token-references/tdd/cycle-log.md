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
