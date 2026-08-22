# Data Model: Token Reference Preview & Navigation

Phase 1 output. No persisted data changes — token files on disk are never modified by this feature (spec: read-only with respect to reference authoring, and Principle IX round-trip fidelity is untouched because values pass through unchanged). Everything below is derived in memory, rebuilt per request.

## TokenReference

One reference found inside a token's `$value`. Produced by `token-core`; the DTCG spec permits a reference either as the whole value or nested inside a composite value, so the location within the value must be recorded.

| Field      | Type                              | Notes |
| ---------- | --------------------------------- | ----- |
| `targetPath` | `readonly string[]`             | Dot-separated path split into segments. Unambiguous because the DTCG spec forbids `.`, `{`, `}` in token and group names. |
| `at`       | `readonly (string \| number)[]`    | Location of the reference *within* the token's `$value`. Empty array means the whole value is the reference; otherwise the keys/indices to reach it (e.g. `["color"]` for a shadow's color, or `[0, "color"]` inside a shadow layer array). |
| `raw`      | `string`                           | The original text, e.g. `"{color.neutral.900}"`. Retained so the UI can display exactly what the file says. |

**Validation**: a string is a reference only when it matches the whole-string form `{...}` with a non-empty body containing no `{` or `}`. A string merely *containing* braces is not a reference.

## ResolutionChain

The full path walked from a reference to its end. **Every step is retained, not just the endpoint** (spec FR-003), so reference relationships can be visualized in later work without re-deriving them.

| Field    | Type                     | Notes |
| -------- | ------------------------ | ----- |
| `steps`  | `readonly ChainStep[]`   | Ordered, starting with the first target and continuing through each further reference. |
| `outcome` | `ChainOutcome`          | How the walk ended — see below. |

### ChainStep

| Field      | Type                 | Notes |
| ---------- | -------------------- | ----- |
| `path`     | `readonly string[]`  | The token arrived at in this step. |
| `file`     | `string`             | Repo-relative file the token was found in. Needed because a chain may cross files — 200 of this project's 228 references do. |
| `mode`     | `string \| undefined` | Mode this definition belongs to, when the token set defines modes. |

### ChainOutcome

A discriminated union, deliberately **not** a `Result` — an unresolvable reference is a normal displayable state, not an operation failure (see research.md §10).

| Variant         | Carries              | Meaning |
| --------------- | -------------------- | ------- |
| `resolved`      | `value: unknown`, `type: string \| undefined` | Reached a token with a literal value. `type` is that token's effective `$type`, which per the DTCG spec is the aliasing token's type too. |
| `unresolved`    | `missingPath`        | A path in the chain names no token. |
| `group-target`  | `groupPath`          | A path resolves to a group, not a token — invalid per the DTCG spec. |
| `circular`      | `cyclePath`          | A token already in this chain was reached again. Detection is what makes recursion safe. |

**State transitions**: none — a chain is computed fresh and never mutated.

## TokenDefinition

One place a token path is defined. A path may have several definitions; **75 of the 490 paths** in this project's own token set do, because `dark.json` overrides `colors.json`.

| Field   | Type                  | Notes |
| ------- | --------------------- | ----- |
| `path`  | `readonly string[]`   | The token's path. |
| `file`  | `string`              | Repo-relative file. |
| `mode`  | `string \| undefined` | From the resolver file; `undefined` when the token set defines no modes, in which case the file alone identifies it. |
| `value` | `unknown`             | The raw `$value` as parsed. |
| `effectiveType` | `string \| undefined` | Own or inherited `$type`. |

## ReferenceIndex

The whole-directory index. Built per request and discarded once the per-file view is extracted (research.md §2 — 1.40 ms to build, 14.6 KB serialized for this project's token set).

| Field            | Type                                              | Notes |
| ---------------- | ------------------------------------------------- | ----- |
| `definitions`    | `Map<pathKey, TokenDefinition[]>`                 | Every definition of every path. More than one entry means the path is multiply defined. |
| `referencesFrom` | `Map<fileAndPathKey, TokenReference[]>`           | Forward edges: what each token references. |
| `referencedBy`   | `Map<pathKey, ReferencingToken[]>`                | Reverse edges. **130 entries / 228 edges** for this project's token set. |
| `modes`          | `readonly string[]`                               | Modes declared by the resolver file; empty when none. |

`pathKey` is `path.join(".")` — safe as an identity because the DTCG spec forbids `.` in names, the same guarantee the existing `pathKey` helpers already rely on.

### ReferencingToken

An entry in the reverse index, and one row in the "referenced N times" list.

| Field  | Type                 | Notes |
| ------ | -------------------- | ----- |
| `path` | `readonly string[]`  | The referencing token. |
| `file` | `string`             | Repo-relative file — shown in the list when it differs from the file being viewed. |

**Validation rule**: a token referencing the same target more than once appears **once** (spec FR-019) — the list is a navigation aid, so duplicate links would be noise. Only *direct* referrers count; a token reaching the target through an intermediate is not listed.

## TokenReferenceView

The compact per-file slice handed from the Server Component to the client — the only part that crosses the boundary. Attached alongside the existing precomputed `effectiveType` on `PlainDtcgNode`, following the precedent already set there ("precomputes each node's effective `$type`, since the ancestor chain needed for that is only naturally available during this same tree walk").

| Field         | Type                                        | Notes |
| ------------- | ------------------------------------------- | ----- |
| `references`  | `Map<pathKey, ResolvedReference[]>`          | For each token in this file that contains references, one entry per reference. |
| `referencedBy`| `Map<pathKey, ReferencingToken[]>`           | For each token in this file, its direct referrers (omitted when empty, so no indicator renders — spec FR-021). |

### ResolvedReference

| Field        | Type                          | Notes |
| ------------ | ----------------------------- | ----- |
| `reference`  | `TokenReference`              | What the file actually says. |
| `outcomes`   | `readonly ResolvedOutcome[]`  | One per mode when the target path is multiply defined, otherwise exactly one. Never silently reduced to a single winner (spec FR-005). |

### ResolvedOutcome

| Field        | Type                  | Notes |
| ------------ | --------------------- | ----- |
| `mode`       | `string \| undefined` | Which mode this outcome applies to. |
| `chain`      | `ResolutionChain`     | Full path walked, retained per FR-003. |
| `targetFile` | `string \| undefined` | Destination for navigation; `undefined` when the chain did not resolve. |

## Derived display values

Not stored — computed at render time from the entities above.

- **Reference count label**: `referencedBy` length → `"referenced once"` (1), `"referenced twice"` (2), `"referenced N times"` (≥3). Absent entirely at 0.
- **Resolved value display**: `ChainOutcome.resolved.value`, presented the same way an equivalent literal of that type would be (spec FR-010), so a referenced color renders as a swatch.
- **Navigation target**: `/tokens/<targetFile>#<percent-encoded dot path>` (research.md §4).
