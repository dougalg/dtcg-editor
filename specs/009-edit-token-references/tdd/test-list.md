---
feature: 009-edit-token-references
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 16
planned_at: 4da9386
updated_at: 4da9386
suite_baseline: green
---

# Test List: Edit Token References

Baseline: `pnpm exec vitest run` → 572 passed / 120 files (green) at `4da9386`,
after `pnpm build`. Note: `pnpm test` (the turbo CI gate) additionally runs the
Playwright job, which needs a fresh `pnpm build` first — run `pnpm build` before
any command that includes the e2e job locally.

Stale-profile note: `tdd-profile.md` `detected_at: b55f969` is ~98 commits behind
HEAD and was written for feature 010. The stack shape it records (root `vitest`
projects incl. `packages/design-system:{unit,a11y}`, `node:test` for
`packages/*`, Playwright acceptance for `apps/web-app`) is still accurate for the
files this feature touches. Consider `/speckit.tdd.setup refresh` before the loop.

## Outer loop: acceptance behaviors

One per acceptance criterion in `spec.md` (User Story scenarios), plus four
success-criteria behaviors with no matching scenario. Hosted by Playwright
(`pnpm --filter @dtcg-editor/web-app exec playwright test {file}`) unless noted.
All stay `PENDING` until the feature works end to end.

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| A1  | Activating a reference token's edit trigger opens a search popover listing candidate tokens drawn from every file in the loaded set | US1-1, FR-001, FR-002 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A2  | Typing part of a token's dotted path narrows the list to whole-path substring matches, including a mid-path fragment (not only the leaf) | US1-2, FR-004 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A3  | Selecting a candidate stages a pending edit setting the value to that path in `{…}` alias syntax and closes the popover, focus back on the trigger | US1-3, FR-006, FR-001 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A4  | Saving a staged reference change writes the file with the new alias and nothing else on disk changes | US1-4, FR-007, SC-001 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A5  | Discarding pending edits (directly, or via the unsaved-changes guard on a cross-file nav) reverts the reference to its last saved target | US1-5, FR-008 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A6  | A query matching no candidate shows an explicit "no tokens found" state and nothing is selectable | US1-6, FR-017 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A7  | Highlighting a candidate that resolves to a literal shows its concrete value alongside it in the editor's normal form (e.g. a colour swatch) | US2-1, FR-009 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A8  | Highlighting a candidate whose own value is a reference previews the concrete value at the end of the chain | US2-2, FR-010 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A9  | Highlighting a candidate defined under multiple modes previews one resolved value per mode, each mode-labelled | US2-3, FR-011 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A10 | Highlighting a candidate previews what the edited token itself would resolve to if that candidate were chosen, before any save | US2-4, FR-012, SC-003 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A11 | Re-opening the popover after an unsaved selection shows the staged target marked as the current selection | US2-5, FR-018 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A12 | Highlighting the edited token's own path shows the circular-reference icon + "circular-reference" label; Enter or click stages nothing and the popover stays open | US3-1, FR-013, FR-024, SC-008 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A13 | Highlighting a candidate whose selection would close a cycle shows the same icon + label, the preview names the cycle tokens, and selecting it stages nothing | US3-2, FR-014, FR-024, SC-008 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A14 | When the current reference already points at a missing or group path, the popover still opens on it, the broken reference text stays shown/editable, and the page renders normally | US3-3, FR-021 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A15 | Highlighting a candidate that resolves to a missing or group path flags it in the preview but the candidate stays selectable and can be staged | US3-4, FR-015, FR-016 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A16 | A circular candidate is visibly distinct as unselectable next to a clean one, without the user attempting to select it | US3-5, FR-024 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A17 | Every token path in the loaded fixture directory is reachable as a candidate through the search | SC-002 | example | PENDING | `apps/web-app/e2e/edit-token-references.spec.ts` |
| A18 | Typing a burst into the open picker against a ~1,000-path set records no main-thread Long Task > 50 ms, and keystroke→updated-list p95 < 50 ms | SC-004 | example | PENDING | `apps/web-app/e2e/edit-token-references-perf.spec.ts` (acceptance-perf) |
| A19 | The open popover — populated, empty, and with a disabled circular row — has zero axe-core WCAG 2.2 AA violations | SC-006, FR-005 | example | DONE | `TokenReferencePicker.a11y.test.tsx::the open picker, including a disabled circular row and the live region, has no WCAG 2.2 AA violations` (U88; empty-popover state = `Combobox` U15) |
| A20 | A PATCH that repoints a reference changes exactly that one `$value`; a parse→serialize round-trip of the file shows no other diff | SC-007, FR-007 | example | DONE | `apps/web-app/app/api/tokens/[...path]/route.test.ts::PATCH repointing a reference changes exactly that one $value and nothing else (SC-007, hosts A20)` (U101) |

## Inner loop: unit behaviors

Grouped by the component from `plan.md` that owns them. Runner: `vitest`
(`pnpm exec vitest run {file}` / `… -t "{name}"`), jsdom for `:unit`, real
Chromium for `.a11y.test.tsx`.

### `packages/design-system/src/components/Command/Command.tsx`

Repaired stub (currently unimportable — no baseline to characterize). Thin `cmdk`
wrapper.

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U1  | Renders the search input, the list region, and one item per child | FR-002 | example | DONE | `Command.test.tsx::renders the search input, the list, and one option per item` |
| U2  | Shows the empty-slot content when the query matches no item | FR-017 | example | DONE | `Command.test.tsx::shows the empty-slot content when the query matches no item` |
| U3  | The rendered `Command` has zero axe-core violations | FR-005 | example | DONE | `Command.a11y.test.tsx::has no WCAG 2.2 AA violations` |

### `packages/design-system/src/components/Combobox/Combobox.tsx`

New generic controlled combobox (replaces the hardcoded demo). Never filters or
sorts — the caller passes `items` ready.

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U4  | Clicking the trigger calls `onOpenChange(true)`; the trigger exposes `role="combobox"` with `aria-expanded` and `aria-controls` | FR-001, FR-005 | example | DONE | `Combobox.test.tsx::clicking the trigger requests open` |
| U5  | Typing in the search field calls `onQueryChange`; the field's value is the controlled `query` | FR-004 | example | DONE | `Combobox.test.tsx::the search field shows the controlled query` |
| U6  | Renders exactly the `items` given, in the given order — no internal filter or sort | FR-004 | example | DONE | `Combobox.test.tsx::renders exactly the items given` |
| U7  | Activating an enabled item calls `onSelect` with that item and then `onOpenChange(false)` | FR-006 | example | DONE | `Combobox.test.tsx::activating an enabled item` |
| U8  | Pressing Escape calls `onOpenChange(false)` and returns focus to the trigger | FR-001 | example | DONE | `Combobox.test.tsx::pressing Escape requests close` |
| U9  | An item where `isItemDisabled` returns true is still rendered | FR-024 | example | DONE | `Combobox.test.tsx::a disabled item is still rendered` |
| U10 | Activating a disabled item never calls `onSelect` and does not close the popover | FR-024, SC-008 | example | DONE | `Combobox.test.tsx::activating a disabled item never calls onSelect` |
| U11 | ArrowDown / ArrowUp move over enabled items and skip a disabled item | FR-024, FR-005 | example | DONE | `Combobox.a11y.test.tsx::ArrowDown moves over enabled items and skips a disabled one` |
| U12 | `selectedKey` marks the matching row as current (`aria-current`) and no other row | FR-018 | example | DONE | `Combobox.test.tsx::selectedKey marks exactly that row` |
| U13 | `loading` true renders `loadingContent` and neither the item list nor `emptyContent` | FR-023 | example | DONE | `Combobox.test.tsx::loading shows loadingContent` |
| U14 | `items` empty and not loading renders `emptyContent`, and no row is selectable | FR-017 | example | DONE | `Combobox.test.tsx::shows emptyContent and nothing selectable` |
| U15 | The open popover has zero axe-core violations, including with one disabled row present (announced unavailable, not omitted) | FR-005, SC-006 | example | DONE | `Combobox.a11y.test.tsx::axe: populated/empty/disabled-row` |
| U103 | `onHighlightChange` reports the key of the row the highlight moves to — added mid-loop as the seam TokenReferencePicker's live region (U84) needs | FR-005 | example | DONE | `Combobox.a11y.test.tsx` (browser tier — cmdk highlight eventing is not jsdom-observable) |

### `apps/web-app/lib/tokens/reference-catalogue-wire.ts`

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U16 | A well-formed catalogue payload parses to the typed `ReferenceCatalogue` | FR-023 | example | DONE | `reference-catalogue-wire.test.ts::a well-formed catalogue payload parses` |
| U17 | A preview outcome missing `steps` is rejected (steps required — selectability depends on it) | FR-024 | example | DONE | `reference-catalogue-wire.test.ts::a preview outcome missing steps is rejected` |
| U18 | An unknown `outcome.kind` is rejected by the discriminated union | FR-015 | example | DONE | `reference-catalogue-wire.test.ts::an unknown outcome.kind is rejected` |

### `apps/web-app/lib/tokens/reference-catalogue.ts`

`buildReferenceCatalogue(index)` — pure transform over feature 007's
`ReferenceIndex`.

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U19 | Every token path in the index appears exactly once as a candidate | FR-002, SC-002 | example | DONE | `reference-catalogue.test.ts` |
| U20 | No group path appears as a candidate | FR-002, FR-024 | example | DONE | `reference-catalogue.test.ts` |
| U21 | A path defined once → a single `definition` with `mode: undefined` | FR-003 | example | DONE | `reference-catalogue.test.ts` |
| U22 | A path defined under N modes → one candidate with one `definition` per mode | FR-003, FR-011 | example | DONE | `reference-catalogue.test.ts` |
| U23 | A candidate whose value is a chain → `preview.outcome.kind === "resolved"` with the end-of-chain value | FR-010 | example | DONE | `reference-catalogue.test.ts` |
| U24 | A candidate resolving to a missing path → `preview.outcome.kind === "unresolved"` | FR-015 | example | DONE | `reference-catalogue.test.ts` |
| U25 | A candidate resolving to a group → `preview.outcome.kind === "group-target"` | FR-015 | example | DONE | `reference-catalogue.test.ts` |
| U26 | A candidate already inside a cycle → `preview.outcome.kind === "circular"` | FR-014, FR-015 | example | DONE | `reference-catalogue.test.ts` |
| U27 | `preview[].outcome.steps` is fully populated for a resolved multi-hop chain | FR-024 (invariant) | example | DONE | `reference-catalogue.test.ts` |
| U28 | `modes` mirrors the resolver's mode list; `[]` when the set has no resolver | FR-011 | example | DONE | `reference-catalogue.test.ts` |

### `apps/web-app/app/api/tokens/references/route.ts`

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U29 | A readable directory → `200` whose body validates `ReferenceCatalogueSchema` | FR-002, FR-023 | example | DONE | `route.test.ts` (references) |
| U30 | `loadTokenDirectory` returns `Err` → `500` with `kind: "unknown"` | FR-021 | example | DONE | `route.test.ts` (references) |
| U31 | A present-but-invalid resolver file → `200` with `modes: []` (degrade, not error) | FR-021, FR-011 | example | DONE | `route.test.ts` (references) |
| U32 | `listReferenceCatalogue` writes diagnostics through the injected logger (no console output under test) | Principle VI | example | DONE | `route.test.ts` (references) |

### `apps/web-app/hooks/useReferenceCatalogue.ts`

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U33 | First use transitions `idle → loading → ready` and exposes the payload | FR-023 | example | DONE | `useReferenceCatalogue.test.tsx` |
| U34 | A second consumer, or a re-open, does not trigger a second fetch (session cache) | FR-023 | example | DONE | `useReferenceCatalogue.test.tsx` |
| U35 | A rejected fetch → status `"error"` with a `SaveError`-shaped error, and does not throw | FR-021 | example | DONE | `useReferenceCatalogue.test.tsx` |
| U36 | An abort before the response resolves does not reject; a response that completes still populates the cache | FR-023 | example | DONE | `useReferenceCatalogue.test.tsx` |
| U37 | `fetch` is reached only through the injected `fetchImpl` | Principle VI | example | DONE | `useReferenceCatalogue.test.tsx` |
| U102 | `enabled: false` stays `idle` and does not fetch; flipping to `true` starts the fetch (FR-023 "on first activation") — added mid-loop while building U76's picker | FR-023 | example | DONE | `useReferenceCatalogue.test.tsx` |

### `apps/web-app/lib/tokens/candidate-filter.ts`

`filterCandidates(candidates, query, edited)` — pure.

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U38 | A non-empty query keeps only candidates whose `displayPath` contains it, case-insensitively | FR-004 | example | DONE | `candidate-filter.test.ts` |
| U39 | The match is against the whole dotted path — `brand.blue` matches `color.brand.blue` | FR-004 | example | DONE | `candidate-filter.test.ts` |
| U40 | Results are ordered by the index of the first match, earliest match first | FR-004 | example | DONE | `candidate-filter.test.ts` |
| U41 | Candidates with an equal first-match index are ordered alphabetically by `displayPath` | FR-004 | example | DONE | `candidate-filter.test.ts` |
| U42 | A query matching nothing returns an empty list | FR-017 | example | DONE | `candidate-filter.test.ts` |
| U43 | An empty query returns every candidate; a whitespace-only query behaves identically | FR-020 | example | DONE | `candidate-filter.test.ts` |
| U44 | For an empty query, a same-effective-type candidate sorts before a same-file-only candidate, which sorts before all others | FR-020 | example | DONE | `candidate-filter.test.ts` |
| U45 | For an empty query when the edited token's effective type is undefined, band 1 is skipped (no false "same type" grouping) | FR-020 | example | DONE | `candidate-filter.test.ts` |
| U46 | Within a band the order is alphabetical by `displayPath` | FR-020 | example | DONE | `candidate-filter.test.ts` |
| U47 | The edited token's own path is present in the results, not filtered out | FR-013 | example | DONE | `candidate-filter.test.ts` |
| U48 | A query containing braces or a leading/trailing dot matches literally as a substring — `{color.brand}` matches `color.brand.*` | FR-004 (edge case) | example | DONE | `candidate-filter.test.ts` |

### `apps/web-app/lib/tokens/candidate-selectability.ts`

`isCircularIfSelected(editedTokenPath, candidate)` — pure, runs for every listed row.

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U49 | Returns true when `candidate.path` deep-equals `editedTokenPath` (the one-hop self-cycle) | FR-013, FR-024 | example | DONE | `candidate-selectability.test.ts` |
| U50 | Returns true when `editedTokenPath` is a step in the candidate's 2-hop resolution chain | FR-014, FR-024 | example | DONE | `candidate-selectability.test.ts` |
| U51 | Returns true when `editedTokenPath` is a step only in the candidate's 3-hop chain | FR-014, FR-024 | example | DONE | `candidate-selectability.test.ts` |
| U52 | Returns true when the candidate is circular under one mode only | FR-024 (edge case: cross-mode) | example | DONE | `candidate-selectability.test.ts` |
| U53 | Returns false for a candidate in a pre-existing cycle that does not include `editedTokenPath` | FR-016, FR-024 | example | DONE | `candidate-selectability.test.ts` |
| U54 | Returns false for a candidate resolving to a missing path | FR-016 | example | DONE | `candidate-selectability.test.ts` |
| U55 | Returns false for a candidate resolving to a group | FR-016 | example | DONE | `candidate-selectability.test.ts` |
| U56 | Returns false for a candidate that resolves cleanly | FR-006 | example | DONE | `candidate-selectability.test.ts` |

### `apps/web-app/lib/tokens/hypothetical-resolution.ts`

`resolveIfRepointed(editedTokenPath, candidatePath, catalogue)` — pure; runs for
the highlighted candidate only. Delegates chain-walking to `token-core`'s
`resolveReference`.

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U57 | `isSelf` is true exactly when `candidatePath` deep-equals `editedTokenPath` | FR-013 | example | DONE | `hypothetical-resolution.test.ts` |
| U58 | A candidate resolving to a literal → each `perMode[].chain.outcome.kind === "resolved"` with that value | FR-012 | example | DONE | `hypothetical-resolution.test.ts` |
| U59 | A candidate whose value is a chain → the previewed value is the end-of-chain value | FR-010, FR-012 | example | DONE | `hypothetical-resolution.test.ts` |
| U60 | A candidate that would close a loop back to the edited token → `outcome.kind === "circular"` with `cyclePath` naming the cycle | FR-014 | example | DONE | `hypothetical-resolution.test.ts` |
| U61 | A candidate path absent from the catalogue → `outcome.kind === "unresolved"` | FR-015 | example | DONE | `hypothetical-resolution.test.ts` |
| U62 | A multiply-defined candidate → one `perMode` entry per mode, differing where the mode definitions differ | FR-011, FR-012 | example | DONE | `hypothetical-resolution.test.ts` |
| U63 | The synthetic lookup picks the definition matching the requested mode, else the last definition | FR-011 (invariant) | example | DONE | `hypothetical-resolution.test.ts` |

### `apps/web-app/components/TokenReferenceValue/format-literal-value.tsx` (extracted)

Helper lifted out of `TokenReferenceValue.tsx` (brownfield — the existing
`TokenReferenceValue.test.tsx` suite is the safety net; see U64).

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U64 | `TokenReferenceValue`'s existing render behavior is unchanged after the helper is extracted | FR-009 | characterization | BASELINE | `apps/web-app/components/TokenReferenceValue/TokenReferenceValue.test.tsx` (existing) |
| U65 | `formatLiteralValue(value, type)` returns the type's built-in `Preview` output when a contract exists | FR-009 | example | DONE | `format-literal-value.test.tsx` |
| U66 | Falls back to the raw text form when there is no contract, no `Preview`, or `Preview` declines | FR-009 | example | DONE | `format-literal-value.test.tsx` |

### `apps/web-app/components/CandidatePreview/CandidatePreview.tsx`

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U67 | A colour candidate renders the swatch preview, not raw text | FR-009 | example | DONE | `CandidatePreview.test.tsx` |
| U68 | A candidate whose value is a chain renders the end-of-chain value | FR-010 | example | DONE | `CandidatePreview.test.tsx` |
| U69 | A multiply-defined candidate renders one mode-labelled row per mode | FR-011 | example | DONE | `CandidatePreview.test.tsx` |
| U70 | A non-resolved outcome renders a `ReferenceWarning` instead of a value | FR-015 | example | DONE | `CandidatePreview.test.tsx` |
| U71 | `diagnostic: "circular"` renders the circular-reference icon and the short "circular-reference" label — for both the own-path case and a multi-hop cycle | FR-013, FR-024 | example | DONE | `CandidatePreview.test.tsx` |
| U72 | `diagnostic: "missing"` and `diagnostic: "group"` each render their own icon + label, distinct from circular | FR-015 | example | DONE | `CandidatePreview.test.tsx` |
| U73 | With `hypothetical` set, an "edited token would resolve to" block renders over `hypothetical.perMode`, naming the cycle for a circular outcome | FR-012, FR-014 | example | DONE | `CandidatePreview.test.tsx` |
| U74 | The rendered `CandidatePreview` (each diagnostic variant) has zero axe-core violations | FR-005 | example | DONE | `CandidatePreview.a11y.test.tsx` |
| U75 | The circular/missing/group marker icons are inline SVG or design-system-exported — no direct `lucide-react` import in `apps/web-app` | Principle VIII | example | DONE | `CandidatePreview.test.tsx` |

### `apps/web-app/components/TokenReferencePicker/TokenReferencePicker.tsx`

The `Combobox` instance. Edited across US1 (base), US2 (preview), US3 (disabled
circular) — behaviors tagged with the story that adds them.

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U76 | First open triggers the catalogue fetch; while `status: "loading"` the popover shows the loading state | US1, FR-023 | example | DONE | `TokenReferencePicker.test.tsx` |
| U77 | The trigger and the search field each have an accessible name identifying the token being repointed | US1, FR-005 | example | DONE | `TokenReferencePicker.test.tsx` |
| U78 | Typing passes the query through `filterCandidates` and renders the narrowed list in that order | US1, FR-004 | example | DONE | `TokenReferencePicker.test.tsx` |
| U79 | An empty result renders "No tokens found" and nothing is selectable | US1, FR-017 | example | DONE | `TokenReferencePicker.test.tsx` |
| U80 | Selecting a candidate calls `onStageEdit(editedTokenPath, { value: "{<displayPath>}" })` and closes | US1, FR-006 | example | DONE | `TokenReferencePicker.test.tsx` |
| U81 | Selecting the candidate equal to the current/pending reference value stages nothing but still closes | US1, FR-019 | example | DONE | `TokenReferencePicker.test.tsx` |
| U82 | On re-open, the row for the current/pending target is marked selected | US1, FR-018 | example | DONE | `TokenReferencePicker.test.tsx` |
| U83 | When the catalogue fetch has errored, the popover renders a raw-text input bound to the alias string, and edits to it stage the change | US1, FR-021 | example | DONE | `TokenReferencePicker.test.tsx` |
| U84 | Moving the highlight updates an `aria-live` region with the result count and the highlighted candidate's resolved value + any diagnostic | US2, FR-005, FR-012 | example | DONE | `TokenReferencePicker.test.tsx` (count; highlighted value -> e2e A7/A10) |
| U85 | The highlighted candidate's full `CandidatePreview` (with `hypothetical`) is rendered; other rows show only the compact form | US2, FR-009, FR-012 | example | DONE | `TokenReferencePicker.a11y.test.tsx` (browser tier; multi-step nav -> e2e A7/A10) |
| U86 | A circular candidate row is passed to `Combobox` as disabled; Enter/click stages nothing and the popover stays open | US3, FR-024, SC-008 | example | DONE | `TokenReferencePicker.test.tsx` |
| U87 | A missing or group candidate row stays enabled and selecting it stages the alias | US3, FR-016 | example | DONE | `TokenReferencePicker.test.tsx` |
| U88 | The open popover — loading, populated, empty, and with a disabled circular row — has zero axe-core violations (hosts A19) | US1, FR-005, SC-006 | example | DONE | `TokenReferencePicker.a11y.test.tsx` (empty-state axe -> Combobox U15) |

### `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.tsx`

Extracted from `TreeTokenNode.tsx` path 1 (brownfield — existing path-1 tests in
`TreeTokenNode.test.tsx` are the safety net; U89).

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U89 | The current `TreeTokenNode` path-1 render for a reference token (raw alias text + resolved list) is captured before the extraction | FR-001 | characterization | BASELINE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx` (existing reference cases; extraction commit `0152cc6`) |
| U90 | `ReferenceEditControl` resting output matches that captured baseline | FR-001 | example | DONE | `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.test.tsx::resting output matches the TreeTokenNode path-1 baseline` |
| U91 | The reference row shows an edit trigger with an accessible name | FR-001, FR-005 | example | DONE | `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.test.tsx::the reference row shows a repoint trigger whose accessible name identifies the edited token` |
| U92 | A pick made through the hosted picker calls `onRepoint(aliasValue)` (→ `TreeTokenNode` `commit({ value })`) | FR-006 | example | DONE | `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.test.tsx::picking a candidate through the hosted picker calls onRepoint with the alias value` |
| U93 | When `resolved` is undefined (index build failed) the raw alias string is shown as the resting state | FR-021 | example | DONE | `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.test.tsx::when resolved is undefined (index build failed) the raw alias string is the resting value` |
| U94 | The name-field rename-collision error branch is unchanged | FR-001 (regression) | example | DONE | `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.test.tsx::a name-field error is still surfaced through the shared FieldErrorSlot` |
| U95 | The rendered `ReferenceEditControl` has zero axe-core violations | FR-005 | example | DONE | `apps/web-app/components/ReferenceEditControl/ReferenceEditControl.a11y.test.tsx::the resting reference row … has no WCAG 2.2 AA violations` |

### `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx` (edited)

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U96 | For a token whose `$value` is a reference, `TreeTokenNode` delegates to `ReferenceEditControl` | FR-001 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx::a reference-valued token delegates to ReferenceEditControl — the repoint trigger is present` |
| U97 | For a token whose `$value` is a literal, no reference edit trigger / picker is rendered | FR-022 | example | DONE | `apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx::a literal-valued token renders no reference repoint trigger (FR-022)` |

### `apps/web-app/lib/tokens/staged-edits-store.ts` (edited)

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U104 | `commit` stages a whole-value reference string on a typed token without running per-type value validation (a reference is valid for any `$type`) — added mid-loop: `#validateDraftValue` was rejecting `{…}` against the token's contract, so a picker repoint reached `commit` and staged nothing | FR-006, FR-001 | example | DONE | `apps/web-app/lib/tokens/staged-edits-store.test.ts::commit stages a whole-value reference string without type-validating it` |

### `apps/web-app/components/TokenTree/TokenTree.tsx` (verify)

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U98 | The existing unsaved-changes navigation guard intercepts a cross-file navigation while a picker-staged reference edit is pending | FR-008 | example | DONE | `apps/web-app/components/TokenTree/TokenTree.test.tsx::the unsaved-changes guard intercepts a cross-file nav after a picker-staged reference edit` |
| U99 | Choosing "discard" in the unsaved-changes dialog after a picker-staged edit restores the previously saved reference | FR-008 | example | DONE | `apps/web-app/components/TokenTree/TokenTree.test.tsx::'Discard and leave' after a picker-staged repoint restores the previously saved reference` |

### `apps/web-app/app/api/tokens/[...path]/route.ts` (existing + regression)

| id  | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U100 | A PATCH whose `edit.value` is a reference string is written through verbatim, bypassing per-type value validation (current behavior) | FR-007 | characterization | BASELINE | `apps/web-app/app/api/tokens/[...path]/route.test.ts::PATCH accepts a reference value without running it through the target type's valueSchema` (pre-existing, commit 9eb280b) |
| U101 | Repointing a reference and saving changes exactly that one `$value`; a parse→serialize round-trip shows no other diff (hosts A20) | FR-007, SC-007 | example | DONE | `apps/web-app/app/api/tokens/[...path]/route.test.ts::PATCH repointing a reference changes exactly that one $value and nothing else (SC-007, hosts A20)` |

## Invariants and edge cases still to place

All placed. Recorded invariants used above as `traces` (no matching FR/AC id):

- **U27** — `preview[].outcome.steps` populated: an invariant of the catalogue
  payload that `candidate-selectability` (U49–U52) depends on. Rationale: FR-024
  circular detection is derived per row from these steps without a re-resolve
  (plan research §4a).
- **U63** — synthetic lookup mode-selection mirrors `reference-index.ts`
  `lookupForMode`. Rationale: the hypothetical preview must compose modes the
  same way the real resolver does, or FR-011/FR-012 previews would disagree with
  what a save produces.

## Out of scope

- **SC-005** ("in usability testing, users correctly identify … 90%"): a
  post-launch study, no automatable observable. Circular targets are removed from
  the judgement set by FR-024, so the residual risk is small. Not on this list.
- **FR-022 "no way to convert a reference into a literal value"**: the absence of
  a feature; only its testable half — "no picker on a literal-valued token"
  (U97) — is listed.
- **`TreeTokenNode.tsx` < 300-line ceiling** (Principle X): a structural/lint
  check, enforced by `pnpm lint` (task T050), not a runtime behavior.
- **CSS token compliance** of `Command.css` / `Combobox.css` (Principle XII):
  enforced by `DESIGN.md` review + lint, not a test.
- Editing references nested in composite values; bulk repointing; editing the
  resolver file — all out of scope per `spec.md` "Out of Scope".

## Verification commands

Copied from `.specify/memory/tdd-profile.md` (stack `web-app`; `node-packages`
variant noted where relevant):

- Single test (web-app / design-system): `pnpm exec vitest run {file} -t "{name}"`
- Single test (packages/* node): `node --test --test-name-pattern "{name}" {file}`
- One file: `pnpm exec vitest run {file}`
- Fast suite (vitest projects only): `pnpm exec vitest run` — **requires `pnpm build` first**
- Full suite (authoritative CI gate): `pnpm test` — runs `^build` then vitest + every package test + the Playwright job; run `pnpm build` first locally
- Acceptance (Playwright): `pnpm --filter @dtcg-editor/web-app exec playwright test {file}`
- Coverage: not installed (`@vitest/coverage-v8` optional peer only)
- Mutation: not installed (no StrykerJS in the lockfile)
- Property-based: not installed (no fast-check) — invariants U27/U63 sampled at boundaries as `example`
