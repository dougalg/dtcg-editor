# Contract: Hypothetical Resolution & Candidate Filtering

Three pure modules in `apps/web-app/lib/tokens/`. No React, no I/O. They are
the core of the picker's testability:

- `candidate-filter.ts` — which rows show, in what order (FR-004, FR-020).
- `candidate-selectability.ts` — which rows are disabled circular candidates
  (FR-013, FR-014, FR-024). Runs for **every** listed row; cheap, no resolve.
- `hypothetical-resolution.ts` — the rich "edited token would resolve to"
  preview (FR-012) and cycle naming (FR-014). Runs for the **highlighted** row
  only.

---

## `candidate-filter.ts`

```ts
interface EditedTokenContext {
  path: readonly string[];
  effectiveType: string | undefined;
  file: string;                 // relativePath of the file the edited token lives in
}

export function filterCandidates(
  candidates: readonly ReferenceCandidate[],
  query: string,
  edited: EditedTokenContext,
): readonly ReferenceCandidate[];
```

**Non-empty query** (after `.trim()`, lowercased):

1. Keep candidates whose `displayPath.toLowerCase()` **contains** the query as
   a substring (FR-004 — whole dotted path, not just the leaf).
2. Sort by:
   a. ascending index of the first substring match in `displayPath`
      (earlier match first);
   b. then `displayPath` ascending (`localeCompare`).
3. No fuzzy / subsequence matching. Braces or leading/trailing dots in the
   query are treated as literal path characters for the `contains` test
   (spec Edge Case "Query with alias punctuation") — no special parsing.

**Empty / whitespace query** (FR-020): return **all** candidates in three
bands, `displayPath` ascending within each:

1. `effectiveType === edited.effectiveType` (and type is defined);
2. else `definitions.some(d => d.file === edited.file)`;
3. else the rest.

A candidate that qualifies for band 1 is not repeated in band 2.

**Notes**

- The edited token's own path is **not** filtered out — it appears as a
  candidate and the UI flags it as a self-reference (FR-013, FR-016: warn,
  don't block).
- Pure and allocation-light: one `filter` + one `sort` over ≤ ~1,000 entries,
  well inside the 50 ms budget (research §9).

**Tests** (table-driven against a fixture catalogue):

- [ ] substring matches mid-path, not just leaf (`brand.blue` matches
      `color.brand.blue`).
- [ ] `a.size` vs `b.size` both returned for query `size`, ordered
      alphabetically.
- [ ] earlier-match ranks first (`color` query: `color.x` before `x.color`).
- [ ] no match → `[]`.
- [ ] empty query → all candidates, band 1 (same type) before band 2 (same
      file) before the rest.
- [ ] query `"{color.brand}"` matches `color.brand.*` (punctuation literal).
- [ ] self path present in results (it is flagged + disabled by
      `candidate-selectability`, not filtered out).

---

## `candidate-selectability.ts`

```ts
export function isCircularIfSelected(
  editedTokenPath: readonly string[],
  candidate: ReferenceCandidate,
): boolean;
```

**Returns `true`** (⇒ the picker renders a disabled `<CommandItem>` with the
"circular-reference" icon + label, FR-024) when **either**:

1. `arraysEqual(candidate.path, editedTokenPath)` — the token's own path, a
   one-hop self-cycle (FR-013 — no separate "self-reference" category); **or**
2. `editedTokenPath` deep-equals some `step.path` in
   `candidate.preview[i].outcome.steps` for **any** `i` — the candidate's own
   resolution chain (in any mode) runs through the edited token, so repointing
   here closes a loop back to it.

**Returns `false`** for a candidate whose own chain is broken (`unresolved` /
`group-target`) or even circular *in a cycle that does not include
`editedTokenPath`* — those are surfaced in the preview but stay selectable,
exactly like a missing/group pick (FR-016). FR-024 blocks "a path that would
**close a cycle**" through the edited token, not "any path that is itself
broken".

**Cost**: O(total chain steps across `candidate.preview`) — a handful of array
compares per candidate, over data already in the catalogue payload. No
synthetic lookup, no `resolveReference`. Safe to run for all ~1,000 rows on an
empty query within the 50 ms budget (research §9).

**Tests** (against `e2e/fixtures/token-references`):

- [ ] `candidate.path === editedTokenPath` → `true`.
- [ ] candidate whose chain passes through the edited token (2-hop, 3-hop) →
      `true`.
- [ ] candidate circular under one mode only → `true` (all-or-nothing across
      modes).
- [ ] candidate in an unrelated pre-existing cycle not involving the edited
      token → `false`.
- [ ] candidate resolving to a missing path → `false`.
- [ ] candidate resolving to a group → `false`.
- [ ] clean candidate → `false`.

---

## `hypothetical-resolution.ts`

```ts
export function resolveIfRepointed(
  editedTokenPath: readonly string[],
  candidatePath: readonly string[],
  catalogue: ReferenceCatalogue,
): HypotheticalResolution;
```

Runs for the **highlighted** candidate only — it is the rich preview and the
cycle-member source for FR-014. Row-level "is this a disabled circular
candidate" is `candidate-selectability.isCircularIfSelected`, not this function.

**Algorithm**

1. `isSelf = arraysEqual(editedTokenPath, candidatePath)` — structural,
   independent of resolution. Presented as a circular reference, not a separate
   "self-reference" notice (FR-013).
2. Build one synthetic `ReferenceLookup` per mode in
   `catalogue.modes` (or a single `undefined`-mode lookup when `modes` is
   empty), closing over `catalogue.candidates`:
   - `lookup(path)` finds the candidate whose `path` deep-equals `path`.
   - Pick its `CandidateDefinition` for this mode (`d.mode === mode`), else the
     last definition (mirrors `reference-index.ts` `lookupForMode`).
   - Return `{ node: { kind: "token", value: def.rawValue, path },
     effectiveType: candidate.effectiveType, file: def.file, mode: def.mode }`
     — the minimal `LookupHit` `resolveReference` reads.
   - Return `undefined` when no candidate matches (→ `unresolved`, FR-015).
3. For each mode, call
   `resolveReference({ raw: "{"+candidatePath.join(".")+"}", targetPath: candidatePath },
   lookupForMode)`. `resolveReference`'s own `visited` set yields `circular`
   when the proposed target chains back to `editedTokenPath` or any earlier
   node (FR-014).
4. Return `{ editedTokenPath, candidatePath, isSelf, perMode }`.

**Why reuse `resolveReference`**: it is the single source of chain-walking and
cycle detection in the codebase (`token-core`, React-free, already a client
dep). Re-implementing the walk here would drift from it. `token-core` is **not
modified** — only consumed.

**Known limitation**: uses the *candidate's authored `rawValue`* from the
catalogue, not any unsaved pending edit to that candidate. Repointing token A
while a pending edit also changes token B's value can make A's preview for a
`{B}`-involving chain slightly stale until save+reload. Accepted (research §5) —
previews are decision aids (US2 priority P2), not authoritative, and the common
case (one edit at a time) is exact.

**Tests** (against `e2e/fixtures/token-references`):

- [ ] candidate resolving to a literal → `perMode[].chain.outcome.kind ===
      "resolved"` with that value.
- [ ] candidate that is itself a chain → end-of-chain value.
- [ ] candidate = edited token's path → `isSelf === true`; chain
      outcome `circular` or `unresolved`.
- [ ] candidate that would close a loop back to the edited token →
      `outcome.kind === "circular"`, `cyclePath` names the cycle.
- [ ] candidate path absent from catalogue → `outcome.kind === "unresolved"`.
- [ ] group path (not in `candidates`, but passed directly) → `unresolved`
      (groups aren't offered; a pre-existing group ref is shown via feature
      007's view, not this function).
- [ ] multiply-defined candidate → one `perMode` entry per mode, differing
      where the modes differ.

### Rendering: hypothetical replaces the own preview (FR-009/FR-012, revised 2026-09-12, second pass)

`CandidatePreview` (the only consumer of `HypotheticalResolution`) does **not**
compare the hypothetical against the candidate's own preview to decide
whether to show it. When `hypothetical` is passed, it is rendered *instead
of* `candidate.preview` — not alongside it, and with no "would resolve to"
caption — for exactly the rows a hypothetical is computed for (the
highlighted row, and any row FR-014 requires cycle-naming for). Every other
row has no `hypothetical` (perf budget, SC-004) and renders `candidate.preview`
unchanged. This replaced an earlier same-day revision that added a
mode-for-mode identity comparison (`hypotheticalDiffersFromPreview`, since
removed) to conditionally *append* the hypothetical only when it differed;
user feedback simplified this further — the user only cares about the effect
of the selection, so there is never a need to show both.
