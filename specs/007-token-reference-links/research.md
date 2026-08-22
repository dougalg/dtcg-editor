# Research: Token Reference Preview & Navigation

Phase 0 output. Every decision below was checked against the real codebase and the real token set rather than assumed; where a number appears, it was measured.

## Starting position: references do not exist as a concept today

Verified by searching the whole source tree for `alias`, `referenc`, `$ref`, `resolveAlias`, and curly-brace regexes: **no code anywhere detects, parses, resolves, or renders a `{a.b.c}` value.** `packages/token-core/src/parse.ts` assigns `value: obj.$value` verbatim, so a reference is stored as an ordinary string, indistinguishable from a legacy hex color at the model level. `resolveEffectiveType` resolves `$type` inheritance only, despite the name.

Consequences that shape everything below:

- A reference in a `color`/`dimension` token **fails `validateTokenValue`** and renders through the error path — the source of the false "must be a 6-digit hex string" message (spec FR-009).
- A reference in a standard type with no built-in contract renders in `FallbackValueEditor` as `"{space.md}"`, JSON quotes included.
- There is **no per-token URL, anchor, or deep link** anywhere in the app. Only two content routes exist (`/` and `/tokens/<file>`), and only two `<Link>`s in the entire codebase.
- The app **loads exactly one file per page**; `scanTokenDirectory` is the only multi-file code and it discards every parsed document, returning summaries only.

## 1. Where reference syntax and chain resolution live

**Decision**: Reference *syntax* and *chain walking* go in `packages/token-core`, exposed from its `index.ts`. Cross-file lookup, modes, and the reverse index stay in `apps/web-app/lib/tokens/`. token-core's resolver is pure and takes an injected lookup function:

```
resolveReference(reference, lookup: (path) => TokenNode | undefined) -> ResolutionChain
```

**Rationale**: Constitution Principle VII makes `token-core` the single source of truth for every token type's parsing and value shapes, and requires it stay React-free and app-agnostic. Reference syntax is squarely DTCG value-shape knowledge, so a second copy elsewhere would be exactly the duplicated source of truth `token-types.ts` explicitly warns against. Chain walking and cycle detection are pure algorithms over that syntax, so they belong with it. But *finding* a token across a directory needs filesystem and mode knowledge token-core must not have — passing a `lookup` closure keeps the algorithm headlessly reusable (a CLI or validator could supply its own) while satisfying Principle VI's injection rule.

**Alternatives considered**: Putting resolution wholly in `apps/web-app` — rejected, it makes the DTCG-defined chain-following rule app-private and unavailable to any other consumer. Giving `token-core` direct multi-document/filesystem access — rejected, it would make a deliberately dependency-light, React-free package aware of directories and the app's config.

## 2. Cross-file index: built per request, not cached

**Decision**: Build the whole-directory reference index **on every request**, in the Server Component, and discard the parsed documents once the index exists. No caching layer, no invalidation.

**Rationale**: Measured against this project's own token set (16 files, 67 KB of JSON, 565 tokens): a full parse-and-index pass costs **1.40 ms** and the resulting index serializes to **14.6 KB** (130 target entries, 228 edges). That is far below any threshold where caching earns its complexity — and caching would have to be invalidated on every `PATCH` save, because this app *writes* token files. A stale reference count that silently disagrees with disk is a genuinely nasty class of bug, and rebuilding removes the possibility by construction. It also directly satisfies the spec's assumption that counts and chains are "derived, never stored, so they cannot drift".

**Caveat, carried into the plan as a verification step**: 1.40 ms is a floor measured with raw `JSON.parse` plus a tree walk. The real path runs `token-core`'s `parseTokenFile`, which adds Zod validation per node. That could not be measured here because this worktree has no `node_modules` installed yet. The schemas involved are light (`z.record(z.string(), z.unknown())` plus a three-field metadata object), so the realistic range is single-digit to low-double-digit milliseconds — comfortably inside the decision either way. Re-measure once dependencies are installed; only a surprising result (hundreds of ms) would justify revisiting caching.

**Alternatives considered**: Module-level cache keyed on directory mtime — rejected as unnecessary complexity plus a real staleness risk for a 1.4 ms operation. Building the index in the client — rejected, it would ship every token file to the browser.

## 3. Reusing the existing directory scan

**Decision**: Extract the file-collection and per-file-parse logic currently inside `scanTokenDirectory` so a new `loadTokenDirectory` can **retain** the parsed `TokenDocument`s, with `scanTokenDirectory` reduced to a summary-producing consumer of it. Both keep the existing injected-dependency signature (`logger`, `readDirFn`, `readFileFn`).

**Rationale**: `scanTokenDirectory` already does precisely the right traversal — recursive, symlink-skipping (with a documented rationale about symlink loops), and per-file failure isolation so one bad file never affects another. That failure isolation is exactly what spec FR-007's "reference into a file that fails to parse" edge case needs. Duplicating the walk would create two traversals to keep in sync.

**Alternatives considered**: A second independent directory walk — rejected, duplicates non-obvious symlink and error-isolation behavior. Changing `scanTokenDirectory`'s return type to include documents — rejected, it would force `/` and `GET /api/tokens` (which only need summaries) to pay for retaining every parsed tree.

## 4. Addressing an individual token

**Decision**: `/tokens/<file>#<dot-separated-token-path>`, with each path segment percent-encoded and joined by `.`. The fragment is resolved in client code — read on mount and on `hashchange`, then expand ancestors, scroll into view, and move focus — rather than relying on native `:target` behavior.

**Rationale**: The DTCG format spec forbids `.`, `{`, and `}` in token and group names, which makes a dot-joined path **unambiguous by specification** rather than by convention — the same guarantee the codebase already leans on with `pathKey = path.join(".")`. A fragment is the idiomatic "address a part of this document" mechanism, needs no server round-trip for same-file jumps, and is directly supported by `next/link`. Resolving it in JS rather than via `:target` is necessary anyway, because arriving at a token may require expanding collapsed ancestor groups before it can be scrolled to — and doing it in JS sidesteps any mismatch between the encoded fragment and the raw DOM `id`.

**Alternatives considered**: A query parameter (`?token=…`) — rejected, it triggers a server round-trip and full re-render for what is a purely in-page concern. Relying on native fragment scrolling alone — rejected, it cannot open a collapsed ancestor group.

## 5. Revealing a token inside collapsed groups

**Decision**: Lift `TreeGroupNode`'s `expanded` state into `TokenTree` as a map keyed by group path, defaulting to expanded (preserving today's behavior), so arriving at a token can force its ancestors open.

**Rationale**: `expanded` is currently `useState(true)` local to each `TreeGroupNode`, with no prop, callback, or lifted state — nothing outside the component can open a specific group. `TokenTree` already owns the cross-cutting client state (`pendingEdits`, `fieldErrors`) and is the natural owner. Because groups default to expanded, this is behavior-preserving until a user collapses something.

**Alternatives considered**: Converting `TreeGroupNode` to a native `<details>` element, which browsers auto-expand on fragment navigation — genuinely attractive, and there is already a separate backlog item proposing exactly that refactor ("TreeGroupNode should be refactored to either be a disclosure element…"). Rejected *here* to avoid absorbing an unrelated backlog item into this feature, and because relying on browser auto-expansion is harder to test deterministically. Worth revisiting when that backlog item is picked up. A `forceExpandPath` prop threaded down without lifting state — rejected as a workaround that leaves ownership ambiguous.

## 6. Where reference-awareness enters the validation dispatch

**Decision**: Check for a reference **above** `validateTokenValue`, in both `TreeTokenNode.tsx` (client) and `app/api/tokens/[...path]/route.ts` (server). `TokenTypeContract` is **not** changed, and no `valueSchema` gains a reference branch.

**Rationale**: A reference is valid for *any* `$type` — per the DTCG spec an aliasing token's type is the resolved type of its target — so it is a property of the value's *form*, not of any one type's schema. Teaching all present and future `valueSchema`s about references would duplicate that rule per type and force every future token-editor package to reimplement it. Hoisting the check expresses "a reference is not this type's business" exactly once per side.

The client/server pairing is non-negotiable: `route.ts` documents that it "Mirrors `TokenTree.tsx`'s client-side `canEdit` guard", and `docs/history.md` (2026-08-02) records that a previous failure to generalize this same pattern on both sides caused both a real client crash *and* a server-side unvalidated-write hole. Both sides must change together.

**Alternatives considered**: A reference branch inside each `valueSchema` — rejected per above. A new optional `TokenTypeContract` hook — rejected as unnecessary indirection for a rule that is uniform across every type.

## 7. Modes, and reading the DTCG resolver file

**Decision**: Read `tokens.resolver.json` (when present) through a new Zod-validated loader to learn which files belong to which mode, and use that **only to label** definitions. No global light/dark mode selector is added. When no resolver file exists, definitions are identified by filename alone.

**Rationale**: This is what makes spec FR-005 answerable. **75 of the 490 token paths** in this project's own token set are defined twice — `dark.json` overriding `colors.json` — because `dark.json` is a resolver *modifier* under the `dark` context while the other 15 files form the `base` set. Without reading the resolver there is no principled way to explain to a user why one path has two definitions, and picking one silently would hide a real definition 15% of the time. The resolver file is a filesystem read of externally-authored content, so Principle IV makes a Zod schema mandatory at that edge.

**Note on an existing oddity**: `scanTokenDirectory` currently treats `tokens.resolver.json` as an ordinary token file. It parses successfully (it contains no `$value`, so it yields only groups) and therefore contributes zero tokens and zero references — harmless for the index, but it does appear in the UI's file list as an empty token file. Out of scope to change here; recorded so it is not mistaken for something this feature introduced.

**Alternatives considered**: Honoring the resolver to pick a single winner plus adding a mode selector — rejected by explicit product decision; it expands scope into whole-application theming. Deterministic file-order precedence — rejected, silently hides a definition. Ignoring modes and labelling by filename only — weaker, since "defined in `dark.json`" is far less meaningful to a user than "applies in dark mode".

## 8. Presenting the count and the choices

**Decision**: Use the existing `Popover` from `packages/design-system` for both the "referenced N times" list and the multiple-definition picker, containing a plain `<ul>` of links. Trigger styled with the existing `Badge`. A reference with exactly one definition renders as an ordinary link, not a popover.

**Rationale**: No new dependency — `Popover`, `Badge`, and `lucide-react` are already present. A floating popover does not reflow the tree the way an inline disclosure would, which matters in a dense list. `Popover` is a generic container, so the content can be a real list of links; `DropdownMenu` would impose `role="menu"`/`menuitem` semantics that fit a command menu better than a set of navigation links. Realistic sizes are small — the most-referenced token in this project's set has **8** referrers — so no virtualization or search is warranted.

**Alternatives considered**: `DropdownMenu` — rejected on semantics. `Accordion` (inline disclosure) — rejected because expanding a row in place pushes the rest of the tree down, which is disorienting mid-scan. `Command`/`Combobox` — rejected as overkill at these sizes.

## 9. Guarding unsaved edits on navigation

**Decision**: Intercept activation of any control that leaves the current file when `pendingEdits` is non-empty, and present a choice of save / discard / stay using the existing `Dialog` component. Same-file jumps are never intercepted.

**Rationale**: `TokenTree` already owns `pendingEdits` and derives `hasPendingEdits`, so the condition is available exactly where the navigation controls will be wired. Spec FR-018 requires edits be neither discarded nor written without an explicit choice, which rules out both silent navigation and auto-save. Restricting the guard to cross-file navigation keeps the common case (jumping within one file) frictionless, since nothing is lost.

**Alternatives considered**: `beforeunload` — rejected, it does not fire for client-side route changes and cannot offer a save option. Auto-saving before navigating — rejected by explicit product decision, and it conflicts with this editor's deliberate explicit-save model. Blocking navigation until saved — rejected as obstructive; it makes the link look broken.

## 10. Modelling failure as data, not as errors

**Decision**: Unresolvable, group-targeted, and circular references are represented as **outcomes of a discriminated union** on the resolution result, not as `Err` values.

**Rationale**: Constitution Principle V reserves `Result` for *fallible operations*. Resolution is not failing in these cases — it is succeeding, and the answer is "this reference does not resolve", which the UI must render as a first-class state (spec FR-011). Modelling them as `Err` would push a rendering concern through error-handling plumbing and invite callers to treat a normal, displayable condition as an exception. Genuinely fallible operations here — reading the directory, parsing the resolver file — do return `ResultAsync`/`Result` as the constitution requires.

## 11. Test fixtures

**Decision**: Add new fixtures under `apps/web-app/e2e/fixtures/tokens/`, including at minimum a cross-file reference pair, a chain, a broken reference, a group-targeted reference, and a circular pair. Unit-level fixtures for `token-core` live alongside its source per Principle II.

**Rationale**: Verified that **no fixture anywhere in this project contains a reference of any kind** — `e2e/fixtures/tokens/` and `sample_data/` are entirely literal values, and no `token-core` test uses a reference-shaped value. Separately, this project's own token set contains **zero** broken, group-targeted, or circular references, so every failure path in the spec is unreachable with real data and can only be covered by purpose-built fixtures. E2E must use the fixtures directory rather than the design-system tokens, since `playwright.config.ts` deliberately points the app at fixtures via `DTCG_EDITOR_TOKENS_DIR` precisely so test content cannot drift.

**Cycle fixture caution**: a circular fixture must be reachable by the tests but must not be allowed to hang the suite if detection regresses — the cycle guard is what makes recursion safe (spec FR-006), so its test is a genuine regression guard, not a formality.

## 12. Keeping `TreeTokenNode` under the size ceiling

**Decision**: Extract the reference-rendering branch into its own component (working name `TokenReferenceValue`) in its own folder, rather than adding a sixth branch inline.

**Rationale**: `TreeTokenNode.tsx` is already **240 lines** against Principle X's 300-line soft ceiling, and its documented "5-path model" dispatch is dense. Adding reference display, the resolved-value preview, the navigation control, and the multiple-definition picker inline would push it well past the ceiling and blur its single nameable purpose ("dispatch a token to the right editor or error view"). Principle X treats approaching that ceiling as a signal to extract, not a target to defend.
