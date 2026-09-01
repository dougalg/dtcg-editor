# Phase 0 Research: Edit Token References

Each decision below resolves a "how" the spec/plan left open. No `NEEDS
CLARIFICATION` markers remain in the spec after the 2026-09-01 clarification
session; the items here are design choices within the cleared scope.

---

## 1. Where the searchable-list primitive lives

**Decision**: Repair `packages/design-system/src/components/Command/Command.tsx`
into a working `cmdk`-backed component and replace
`components/Combobox/Combobox.tsx` with a generic controlled combobox
(`Popover` + `Command`). Compose the token-specific picker in `apps/web-app`.

**Rationale**:
- `cmdk` is an Approved Dependency for `packages/design-system` **only**
  (constitution, Technology Stack). Building the list in `apps/web-app` would
  need either a new dependency flag (Principle VIII) or a hand-rolled ARIA
  combobox — a well-known accessibility trap that Principle X's a11y-test
  mandate exists to discourage.
- Both files already exist as stubs with a co-located `.css`; they import a
  non-existent `@/registry/*` alias and `Combobox.tsx` only exports a
  hardcoded demo. They are unimportable today — repairing them is closing a
  latent breakage, not greenfield scope.
- Principle X's reuse rule: a searchable combobox is a plausible third
  "list-in-a-popover" alongside `Select` and `DropdownMenu`; the rule says
  consolidate into `design-system`, not hand-roll a third variant in the app.

**Alternatives considered**:
- *Hand-rolled combobox in `apps/web-app`* — rejected: reinvents focus
  management / `aria-activedescendant` / listbox semantics `cmdk` already
  solves; still needs full a11y tests; violates the reuse rule.
- *Add `cmdk` to `apps/web-app`* — rejected: needs a Principle VIII flag for a
  dependency already sanctioned one package over, for no benefit.
- *Use `Select`* — rejected: `Select` is a fixed option list, not a
  type-to-filter search over 1,000 entries.

---

## 2. Candidate filtering & ordering (spec FR-004, FR-020)

**Decision**: Run `Command`/`cmdk` with `shouldFilter={false}`. A pure
`candidate-filter.ts` in `apps/web-app/lib/tokens/` owns matching and order:

- **Non-empty query**: case-insensitive **substring** test against the full
  dotted path. Rank by index of first match (earlier = higher), then
  alphabetically by path. No fuzzy / subsequence matching.
- **Empty / whitespace query**: full list in three bands — (1) same effective
  type as the edited token, (2) same file as the edited token, (3) everything
  else — alphabetical by path within each band.

`candidate-filter` decides *which rows show and in what order* only — it does
**not** decide selectability. Whether a row is a disabled circular candidate is
a separate render-time flag from `candidate-selectability.isCircularIfSelected`
(§4a), applied per row as the list maps candidates to `CommandItem`s.

**Rationale**: cmdk's built-in scorer is a fuzzy `command-score`; the
clarified spec mandates deterministic substring + position order, which must
be testable in isolation. Disabling cmdk's filter and sorting upstream keeps
the ordering a property of one pure, unit-tested function and keeps cmdk doing
only what it's good at (keyboard/focus/`aria-activedescendant`).

**Alternatives considered**:
- *cmdk custom `filter` prop* — cmdk's `filter` returns a score it then sorts
  by; expressing "match position then alphabetical" through a single numeric
  score is fragile. A pre-sorted list with filtering off is clearer.
- *Server-side filtering* — rejected: 1,000 paths is a few KB; round-tripping
  every keystroke can't hit the 50 ms p95 budget and adds failure modes.

---

## 3. Catalogue transport & shape (spec FR-002, FR-003, FR-023)

**Decision**: New `GET /api/tokens/references` route. It runs the feature-007
pipeline (`loadTokenDirectory` → `loadResolverModes` → `buildReferenceIndex`)
for the configured directory and returns a Zod-typed body:

```
{
  modes: string[],
  candidates: Array<{
    path: string[],
    effectiveType: string | undefined,
    definitions: Array<{ mode: string | undefined, file: string, rawValue: unknown }>,
    preview: Array<{ mode: string | undefined, outcome: ResolutionChainWire }>
  }>
}
```

- `candidates` excludes group paths (a reference target must be a token).
- `preview` is the candidate's *own* resolved value(s), one per mode when
  multiply defined — computed server-side by reusing
  `resolveReferenceSite`-style logic, serialised as a plain `ResolutionChain`
  (already POJO-shaped: `steps[]` + discriminated `outcome`).
- `definitions[].rawValue` is included so the client can resolve a
  *hypothetical* repoint without another round-trip (see §4).

The route maps a build failure to a non-2xx `SaveError`-shaped body (the
existing `errorResponse` helper), consistent with the PATCH route.

**Rationale**: mirrors feature 007's "rebuild per request, never cache
server-side" — no staleness against a just-saved file. The body is
app-internal (same-codebase producer and consumer, like the PATCH `SaveError`
body) so the client types it rather than re-validating field-by-field
(Principle IV, matching `useSaveTokenEdits`'s `parseSaveError`).

**Alternatives considered**:
- *Reuse `GET /api/tokens/[...path]`* — that returns one file's node tree, not
  a directory-wide path catalogue; FR-002 needs every file.
- *Server Component prop instead of an endpoint* — the picker opens lazily on a
  client interaction well after the page's Server Component has rendered;
  FR-023 explicitly wants a fetch-on-activation with a loading state, which a
  build-time prop can't provide.
- *Ship the whole `ReferenceIndex`* — it carries `documentsByFile` (full node
  trees); far more than the picker needs. The trimmed shape above is enough.

---

## 4. "What would the edited token resolve to" (spec FR-012, US2 AC-4)

**Decision**: `hypothetical-resolution.ts` (pure, `apps/web-app/lib/tokens/`).
Given the edited token's path, a candidate path, and the catalogue, build a
synthetic `ReferenceLookup` over `catalogue.candidates` (each `definition`
becomes a synthetic `{ kind: "token", value: rawValue }` node, chosen per mode
exactly as `lookupForMode` does), then call `token-core`'s `resolveReference`
with a synthetic `TokenReference` whose `targetPath` is the candidate path —
once per mode. Return the resulting `ResolutionChain[]`.

**Runs for the highlighted candidate only** — it is the rich preview
(FR-012) and the source of the cycle-member list when naming a circular chain
(FR-014). It is *not* run for every listed row.

**Rationale**: `resolveReference` is pure, React-free, already a client
dependency, and already emits every outcome kind the preview must show
(`resolved` / `unresolved` / `group-target` / `circular`). Cycle detection is
its `visited` set — feeding it a lookup that reflects the *proposed* edit makes
"this pick would close a loop" fall out for free (FR-014). No new resolution
code, no `token-core` change.

**Alternatives considered**:
- *Re-implement a chain walk in the app* — duplicates `resolveReference` and
  its cycle logic; drifts from `token-core`.
- *Ask the server for the hypothetical* — needs a request per highlighted
  candidate; can't meet the interaction-latency budget and is offline-fragile.

---

## 4a. Per-row circular detection that gates selection (spec FR-013, FR-014, FR-024)

**Decision**: `candidate-selectability.ts` — `isCircularIfSelected(editedTokenPath,
candidate): boolean`. A candidate is circular (⇒ disabled `CommandItem`, FR-024)
when **either**:

1. `candidate.path` deep-equals `editedTokenPath` — the one-hop self-cycle
   (FR-013: a self-reference is just the smallest circular reference, no separate
   category); **or**
2. `editedTokenPath` appears as a `step.path` in **any** of the candidate's
   `preview[i].outcome.steps` — i.e. the candidate's own resolution chain (any
   mode) passes through the edited token, so pointing at it closes a loop back to
   here.

This is O(total steps) per candidate over data already in the catalogue payload
— **no synthetic lookup, no `resolveReference` call per row**. It runs for every
candidate the list renders, including the full list on an empty query
(~1,000 rows × a few steps = well inside the 50 ms budget, research §9).

**A pre-existing, unrelated cycle** in a candidate's own chain that does *not*
include `editedTokenPath` is **not** blocked — it is only flagged in the preview
(same tier as missing / group), because selecting it does not make *this* token
part of a cycle. FR-024's wording is precise: "any path that would **close a
cycle**" (back through the edited token), not "any path that is itself broken".

**Cross-mode rule (spec Edge Case)**: circular under *any* mode ⇒ disabled
outright — a reference names one path, not one per mode, so it cannot be
"circular in dark, fine in light".

**Alternatives considered**:
- *Run `resolveIfRepointed` for every visible row* — correct but O(rows ×
  chain-walk); redundant when the catalogue already ships each candidate's
  chain `steps`.
- *Only block the exact self-path, warn on longer cycles* — rejected: the user's
  directive and FR-024 explicitly cover multi-hop cycles that close on the
  edited token.

---

## 5. Catalogue fetch lifecycle (spec FR-023)

**Decision**: `useReferenceCatalogue(fetchImpl = fetch)` hook. First call
triggers one `GET /api/tokens/references`; the resolved catalogue is held in a
module-scope cache keyed by the current directory (a single-token-set app —
one key in practice) so re-opening the picker, or opening it on another token,
reuses it with no refetch. Status is a `"idle" | "loading" | "ready" | "error"`
enum plus the payload / `SaveError`, never a thrown value (matches
`useSaveTokenEdits`). The in-flight request is abortable via `AbortController`
if the popover closes first, but a completed fetch still populates the cache.

**Loading vs empty vs unavailable** — three distinct popover states:
- *loading*: fetch in flight, first open (spec Edge Case "Catalogue still
  loading").
- *empty*: catalogue ready, query matches nothing (FR-017) — no selection
  possible.
- *unavailable*: fetch errored (FR-021) — the raw alias text stays visible and
  editable as plain text, no rich previews; the user is no worse off than
  today.

**Rationale**: FR-023 asks for exactly this shape. Session cache (not
`localStorage`) because the catalogue must not outlive a token-set change and
carries no per-viewer value.

**Alternatives considered**:
- *Refetch every open* — wasteful; the set rarely changes mid-session and a
  save only changes one `$value` string, never the path set.
- *Invalidate the cache on save* — a repoint changes a value, not the catalogue
  of *paths*; the only stale field would be a candidate's own `preview` if the
  user repointed a token that is itself a candidate. Accepted as a known minor
  staleness (documented in the contract); a full-page reload after save already
  refreshes it, and US2 previews are decision aids, not authoritative.

---

## 6. Extracting `TreeTokenNode` path 1 (Principle X, plan Constraints)

**Decision**: Move the "value is a reference" branch (`TreeTokenNode.tsx`
lines ~117-154) into `ReferenceEditControl`, which takes the same inputs the
branch uses today (`node`, `currentName`, `handleNameChange`, `effectiveType`,
`referencedByBadge`, `errors`, `resolved`) plus `onStageEdit`. It renders the
`TokenBlock` wrapper, the reference text + edit trigger, and hosts
`TokenReferencePicker`. `TreeTokenNode` path 1 becomes a single delegating
`return`.

**Rationale**: `TreeTokenNode.tsx` is 324/300 lines; the plan forbids
extending it inline. Extraction net-reduces it and gives the new behaviour its
own test surface. `TokenReferenceValue` (feature 007) stays as the read-only
resolved-value list rendered *inside* the control when the popover is closed —
it is not replaced.

**Alternatives considered**:
- *Add the picker inline in `TreeTokenNode`* — pushes it further over the
  ceiling; violates plan Constraints.

---

## 7. Staging & saving the repoint (spec FR-006, FR-007, FR-008)

**Decision**: Selecting a candidate calls the existing
`onStageEdit(node.path, { value: "{candidate.path}" })`. No new staging
mechanism, no new hook. Save, discard, and the unsaved-changes navigation
guard in `TokenTree` are unchanged — the guard already intercepts
cross-file navigation while `pendingEdits` is non-empty and already lists
"a definition-picker entry" among the controls it covers (`TokenTree.tsx`
comment, feature 007). Re-selecting the current target stages nothing
(FR-019): compare candidate path to the token's current (possibly pending)
reference value first.

**Server**: none. `route.ts:207` already writes a reference `$value` through
verbatim, above per-type validation. Add only a regression test asserting a
PATCH that repoints a reference changes exactly that one `$value` and
round-trips clean (SC-007).

**Rationale**: the spec's own Assumptions say "reuses existing edit/save
flow"; the code confirms it already handles this value shape end to end.

**Alternatives considered**:
- *A dedicated reference-edit endpoint* — pointless; PATCH already does it.

---

## 8. Accessibility approach (spec FR-005, SC-006)

**Decision**: The repaired `Command`/`Combobox` carry the listbox semantics
(`role="combobox"` trigger with `aria-expanded`/`aria-controls`; `cmdk`
manages `aria-activedescendant` and option roles). `TokenReferencePicker`
adds: an accessible name on the trigger and the search input
("Repoint reference for `<token path>`"), an `aria-live="polite"` region
announcing result count and the highlighted candidate's resolved value +
any diagnostic, and a visible + `aria-current` marker on the staged target
(FR-018). Escape closes and returns focus to the trigger (clarified 2026-09-01).

**Testing**: `axe-core` zero-violations on the open popover (component tier);
Playwright keyboard-only open→type→arrow→enter→save with no mouse (SC-006).

**Rationale**: consolidates the standard combobox pattern in `design-system`
and layers only the token-specific announcements in the app.

**Alternatives considered**:
- *Rely on cmdk defaults alone* — cmdk gives structural semantics but not the
  domain announcements (what a candidate resolves to, why one won't resolve)
  that SC-005 depends on.

---

## 9. Performance validation (spec SC-004)

**Decision**: Two guards.
- A Vitest benchmark over a generated 1,000-path catalogue: `candidate-filter`
  **plus** a `candidate-selectability` pass over the full result (worst case:
  empty query = all 1,000 rows) stays well under one frame; assert p95
  keystroke→sorted-list < 50 ms.
- A Playwright test on the fixture app: type a burst into the open picker,
  assert no Long Task > 50 ms is recorded (same `PerformanceObserver`
  technique as `e2e/editing-perf.spec.ts` / `e2e/color-editor-perf.spec.ts`).

**Rationale**: matches how this repo already pins editor performance; gives
SC-004 a concrete pass/fail.

---

## 10. Result vs. outcome modelling (Principle V)

**Decision**: Genuinely fallible operations — the catalogue directory
load/parse, the `fetch` — are `ResultAsync` / a status enum. The
broken-target kinds (missing, group, circular) and "catalogue unavailable" are
**display outcomes**, rendered with their own explanatory copy, not `Err`
values threaded through error plumbing. This is the same call feature 007 made
and documented; this feature stays consistent with it.

**Circular is additionally a selection gate.** Being a display outcome and
disabling the row are orthogonal: `candidate-selectability.isCircularIfSelected`
(a plain `boolean`, §4a) decides `CommandItem disabled`; `CandidatePreview`
still renders the circular explanation for the highlighted row. Neither path
throws or produces an `Err`.
