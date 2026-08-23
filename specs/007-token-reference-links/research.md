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

**Rationale**: Measured against this project's own token set (16 token files, 565 tokens, plus `tokens.resolver.json` itself as a 17th, zero-token file): a full parse-and-index pass — `parseTokenFile` (Zod-validating) for every file, then `buildReferenceIndex` — costs a **2-7 ms** median across 5 runs, producing exactly the figures cited throughout this spec: **490 definitions, 228 references, 130 `referencedBy` entries**. That is far below any threshold where caching earns its complexity — and caching would have to be invalidated on every `PATCH` save, because this app *writes* token files. A stale reference count that silently disagrees with disk is a genuinely nasty class of bug, and rebuilding removes the possibility by construction. It also directly satisfies the spec's assumption that counts and chains are "derived, never stored, so they cannot drift".

**SC-010's budget** (5,000 tokens, chain depth 5) is verified separately by a synthetic benchmark (`reference-index.bench-fixture.ts`), asserted as a hard test gate in `reference-index.test.ts` rather than merely observed: **14-26 ms** across 5 runs against the full pipeline (`parseTokenFile` + `buildReferenceIndex`), comfortably inside the 50 ms budget even at roughly 9x this project's own token count. The original floor measured at planning time (1.40 ms, raw `JSON.parse` with no Zod validation, before dependencies were installed in this worktree) is superseded by these real, Zod-validated figures.

**Alternatives considered**: Module-level cache keyed on directory mtime — rejected as unnecessary complexity plus a real staleness risk for a 1.4 ms operation. Building the index in the client — rejected, it would ship every token file to the browser.

## 3. Reusing the existing directory scan

**Decision**: Extract the file-collection and per-file-parse logic currently inside `scanTokenDirectory` so a new `loadTokenDirectory` can **retain** the parsed `TokenDocument`s, with `scanTokenDirectory` reduced to a summary-producing consumer of it. Both keep the existing injected-dependency signature (`logger`, `readDirFn`, `readFileFn`).

**Rationale**: `scanTokenDirectory` already does precisely the right traversal — recursive, symlink-skipping (with a documented rationale about symlink loops), and per-file failure isolation so one bad file never affects another. That failure isolation is exactly what spec FR-007's "reference into a file that fails to parse" edge case needs. Duplicating the walk would create two traversals to keep in sync.

**Alternatives considered**: A second independent directory walk — rejected, duplicates non-obvious symlink and error-isolation behavior. Changing `scanTokenDirectory`'s return type to include documents — rejected, it would force `/` and `GET /api/tokens` (which only need summaries) to pay for retaining every parsed tree.

## 4. Addressing an individual token

**Decision**: `/tokens/<file>#<dot-separated-token-path>`, with each path segment percent-encoded and joined by `.`. The fragment is resolved in client code — read on mount and on `hashchange`, then expand ancestors, scroll into view, and move focus — rather than relying on native `:target` behavior.

**Rationale**: The DTCG format spec forbids `.`, `{`, and `}` in token and group names, which makes a dot-joined path **unambiguous by specification** rather than by convention — the same guarantee the codebase already leans on with `pathKey = path.join(".")`. A fragment is the idiomatic "address a part of this document" mechanism, needs no server round-trip for same-file jumps, and is directly supported by `next/link`.

**Division of labour with the browser**: revealing and scrolling are the browser's job, not the app's — per §5, native `<details>` auto-expansion opens every collapsed ancestor group and scrolls the target into view. App code is needed only for what the browser does *not* do: moving focus to the arrived-at token and marking it as the one navigated to (FR-014), plus reconciling the percent-encoded fragment with the raw DOM `id`. That routine runs on mount and on `hashchange`.

**Alternatives considered**: A query parameter (`?token=…`) — rejected, it triggers a server round-trip and full re-render for what is a purely in-page concern. Relying on `:target` styling alone to indicate arrival — rejected, it cannot survive the fragment-encoding mismatch and gives no focus management.

## 5. Revealing a token inside collapsed groups

**Decision**: Refactor `TreeGroupNode` to a native `<details>`/`<summary>` disclosure and let the browser's built-in auto-expansion reveal a token inside collapsed ancestor groups. **No expansion state is lifted into `TokenTree`.**

**Rationale**: Auto-expanding `<details>` is now implemented in every engine — Chrome, Firefox (139+, bug 1724299), and Safari (26.2, Feb 2026) — and was **verified empirically in all three through this app's own Next.js navigation** before adopting it. The browser walks the ancestor chain, opens every closed `<details>` containing the target, and scrolls it into view. That is the whole of FR-014's "opening any groups containing it, bringing it into view", obtained without app code.

This is strictly less machinery than the alternative: no path-keyed expansion map, no ownership question, no prop threading. It also closes a real accessibility gap on the way — today's toggle is a `<button>` with neither `aria-expanded` nor `aria-controls`, and `<summary>` supplies disclosure semantics and keyboard operability natively, which SC-009 pushes on regardless. It therefore absorbs the standing backlog item _"TreeGroupNode should be refactored to either be a disclosure element, or make sure it has all necessary aria props like controls, and expanded"_ — a deliberate scope decision, taken because this feature is what makes reveal-a-collapsed-group load-bearing, so deferring it would mean touching the same component twice.

**Two constraints this imposes, both binding on implementation**:

1. **`<details>` MUST stay uncontrolled.** React must not drive the `open` prop, or it will fight the browser's expansion — the browser sets `open` directly on the DOM node, and a controlled React render would immediately reassert its own value. Initial state comes from the `open` attribute in the server-rendered markup (preserving today's default-expanded behavior) and is never re-specified. This relies on React only writing an attribute when its _own_ prop value changes between renders, which is real but fragile enough to need an explicit regression test: collapse a group, edit a sibling token to force a `TokenTree` re-render, assert the group stays collapsed.

2. **The group-name `<input>` MUST NOT go inside `<summary>`.** `<summary>` is the click/Enter/Space target, so a text input nested in it is interactive-content-inside-interactive-content: Space in the name field can toggle the group, and it is flaggable by ACT/axe. But moving it after `<summary>` puts it inside the collapsible region, making a collapsed group unrenameable. Resolution: `<summary>` carries only the disclosure control plus its accessible name (a near drop-in for today's `aria-label={`${expanded ? "Collapse" : "Expand"} ${node.name || "/"}`}`), and the name `Input` stays outside `<details>` entirely, positioned alongside it with CSS. This needs a layout pass and is the one genuinely non-trivial part of the refactor.

**Still not free**: auto-expansion reveals and scrolls, but does not move focus or indicate _which_ token was navigated to. FR-014's "making clear which token was navigated to" and FR-017's keyboard/accessible-name requirements still need app code — see §4.

**Alternatives considered**: Lifting `expanded` into `TokenTree` as a map keyed by group path — this was the prior decision here, now rejected: it is redundant once the browser does the work, and actively incompatible with it, since a controlled `open` prop would defeat the native expansion. A `forceExpandPath` prop threaded down without lifting state — rejected as a workaround that leaves ownership ambiguous.

## 6. Where reference-awareness enters the validation dispatch

**Decision**: Check for a reference **above** `validateTokenValue`, in both `TreeTokenNode.tsx` (client) and `app/api/tokens/[...path]/route.ts` (server). `TokenTypeContract` is **not** changed, and no `valueSchema` gains a reference branch.

**The bug this fixes, concretely**. `TreeTokenNode.tsx` currently dispatches like this:

```ts
const isUsableType = effectiveType !== undefined && isDtcgTokenType(effectiveType);
const contract     = isUsableType ? resolveBuiltInContract(effectiveType) : undefined;
const validation   = contract ? validateTokenValue(contract, node.value) : undefined;
const isValid      = isUsableType && (contract === undefined || validation?.isOk());
```

Given `{ "$type": "color", "$value": "{color.neutral.900}" }`: the type is usable, the color contract resolves, and `validateTokenValue` runs `ColorValueSchema.safeParse()`. That schema is `z.union([ColorObjectValueSchema, LegacyHexColorValueSchema])`, whose legacy branch is `/^#[0-9a-fA-F]{6}$/`. A reference string matches neither branch, so the parse fails and `ColorValidationErrorHandler` renders **`must be a 6-digit hex string like "#rrggbb"`** — against every token in the app's own `dark.json`.

**Rationale**: A reference is valid for *any* `$type` — per the DTCG spec an aliasing token's type is the resolved type of its target — so it is a property of the value's *form*, not of any one type's schema. Asking "is this a reference?" therefore has to come *before* "is this a valid color?", not inside it. Hoisting the check expresses "a reference is not this type's business" exactly once per side:

```ts
const reference  = parseReference(node.value);        // from token-core
const validation = reference === undefined && contract
    ? validateTokenValue(contract, node.value)
    : undefined;
```

**The server side has two steps to skip, not one.** `route.ts` (~L201-211) runs:

```ts
const valueValidation = validateTokenValue(builtInContract, edit.value);
if (valueValidation.isErr()) return errorResponse(400, message, { … });
value = builtInContract.serializeValue(valueValidation.value);
```

Hoisting past only the validation would then hand the reference string to `color.serializeValue()`, which expects an already-parsed `ColorValue`. The hoist must land on `value = edit.value` — verbatim passthrough — which is also what Principle IX requires, since the reference has to be written back byte-identical.

The client/server pairing is non-negotiable: `route.ts` documents that it "Mirrors `TokenTree.tsx`'s client-side `canEdit` guard", and `docs/history.md` (2026-08-02) records that a previous failure to generalize this same pattern on both sides caused both a real client crash *and* a server-side unvalidated-write hole. Splitting it produces a specific failure each way — hoist client-only and the UI stages a reference edit the server then rejects with a 400; hoist server-only and the false error stays on screen. One stage, one paired test asserting both sides agree on the same input.

**Alternatives considered**: A reference branch inside each `valueSchema` (e.g. `z.union([…existing, ReferenceSchema])`) — rejected: beyond duplicating the rule per type and forcing every future third-party token-editor package to reimplement it, it corrupts the type. `TValue` for color would widen to include a string that is not a color, so `contract.Editor` would receive `"{color.neutral.900}"` as a `ColorValue`, as would `serializeValue`. A new optional `TokenTypeContract` hook — rejected as per-type indirection for a rule with zero per-type variation.

**Where it deliberately does not go**: `token-core`'s `parseTokenFile`/`schema.ts`. Detecting references at parse time would change what a parsed document means for every consumer; this stays a display-and-edit-time concern.

## 7. Modes, and reading the DTCG resolver file

**Decision**: Read `tokens.resolver.json` (when present) through a new Zod-validated loader to learn which files belong to which mode, and use that **only to label** definitions. No global light/dark mode selector is added. When no resolver file exists, definitions are identified by filename alone.

**Rationale**: This is what makes spec FR-005 answerable. **75 of the 490 token paths** in this project's own token set are defined twice — `dark.json` overriding `colors.json` — because `dark.json` is a resolver *modifier* under the `dark` context while the other 15 files form the `base` set. Without reading the resolver there is no principled way to explain to a user why one path has two definitions, and picking one silently would hide a real definition 15% of the time. The resolver file is a filesystem read of externally-authored content, so Principle IV makes a Zod schema mandatory at that edge.

**Note on an existing oddity**: `scanTokenDirectory` currently treats `tokens.resolver.json` as an ordinary token file. It parses successfully (it contains no `$value`, so it yields only groups) and therefore contributes zero tokens and zero references — harmless for the index, but it does appear in the UI's file list as an empty token file. Out of scope to change here; recorded so it is not mistaken for something this feature introduced.

**Alternatives considered**: Honoring the resolver to pick a single winner plus adding a mode selector — rejected by explicit product decision; it expands scope into whole-application theming. Deterministic file-order precedence — rejected, silently hides a definition. Ignoring modes and labelling by filename only — weaker, since "defined in `dark.json`" is far less meaningful to a user than "applies in dark mode".

## 8. Presenting the count and the choices

**Decision**: Use the existing `Popover` from `packages/design-system` for both the "referenced N times" list and the multiple-definition picker, containing a plain `<ul>` of links. Trigger styled with the existing `Badge`. A reference with exactly one definition renders as an ordinary link, not a popover.

**Rationale**: No new dependency — `Popover`, `Badge`, and `lucide-react` are already present. A floating popover does not reflow the tree the way an inline disclosure would, which matters in a dense list. `Popover` is a generic container, so the content can be a real list of links; `DropdownMenu` would impose `role="menu"`/`menuitem` semantics that fit a command menu better than a set of navigation links. Realistic sizes are small — the most-referenced token in this project's set has **6** referrers — so no virtualization or search is warranted.

**Alternatives considered**: `DropdownMenu` — rejected on semantics. `Accordion` (inline disclosure) — rejected because expanding a row in place pushes the rest of the tree down, which is disorienting mid-scan. `Command`/`Combobox` — rejected as overkill at these sizes.

## 9. Guarding unsaved edits on navigation

**Decision**: Intercept activation of any control that leaves the current file when `pendingEdits` is non-empty, and present a choice of save / discard / stay using the existing `Dialog` component. Same-file jumps are never intercepted.

**Rationale**: `TokenTree` already owns `pendingEdits` and derives `hasPendingEdits`, so the condition is available exactly where the navigation controls will be wired. Spec FR-018 requires edits be neither discarded nor written without an explicit choice, which rules out both silent navigation and auto-save. Restricting the guard to cross-file navigation keeps the common case (jumping within one file) frictionless, since nothing is lost.

**Alternatives considered**: `beforeunload` — rejected, it does not fire for client-side route changes and cannot offer a save option. Auto-saving before navigating — rejected by explicit product decision, and it conflicts with this editor's deliberate explicit-save model. Blocking navigation until saved — rejected as obstructive; it makes the link look broken.

## 10. Modelling failure as data, not as errors

**Decision**: Unresolvable, group-targeted, and circular references are represented as **outcomes of a discriminated union** on the resolution result, not as `Err` values.

**Rationale**: Constitution Principle V reserves `Result` for *fallible operations*. Resolution is not failing in these cases — it is succeeding, and the answer is "this reference does not resolve", which the UI must render as a first-class state (spec FR-011). Modelling them as `Err` would push a rendering concern through error-handling plumbing and invite callers to treat a normal, displayable condition as an exception. Genuinely fallible operations here — reading the directory, parsing the resolver file — do return `ResultAsync`/`Result` as the constitution requires.

## 11. Test fixtures

**Decision**: Add new fixtures under `apps/web-app/e2e/fixtures/token-references/` — **a new directory with its own `webServer`**, not the existing `e2e/fixtures/tokens/`. At minimum: a cross-file reference pair, a chain, a broken reference, a group-targeted reference, a circular pair, an unparseable file, and a multi-mode pair. Unit-level fixtures for `token-core` live alongside its source per Principle II.

**Why a separate directory**: `playwright.config.ts` runs a single `webServer` pointed at one `DTCG_EDITOR_TOKENS_DIR`. Dropping broken, circular, and unparseable fixtures into `e2e/fixtures/tokens/` would change what `home.spec.ts` and `tokens-page.spec.ts` see, and both assert on the file listing. A second server on its own port keeps the failure fixtures from breaking suites that have nothing to do with references (tasks.md T006).

**Rationale**: Verified that **no fixture anywhere in this project contains a reference of any kind** — `e2e/fixtures/tokens/` and `sample_data/` are entirely literal values, and no `token-core` test uses a reference-shaped value. Separately, this project's own token set contains **zero** broken, group-targeted, or circular references, so every failure path in the spec is unreachable with real data and can only be covered by purpose-built fixtures. E2E must use the fixtures directory rather than the design-system tokens, since `playwright.config.ts` deliberately points the app at fixtures via `DTCG_EDITOR_TOKENS_DIR` precisely so test content cannot drift.

**Cycle fixture caution**: a circular fixture must be reachable by the tests but must not be allowed to hang the suite if detection regresses — the cycle guard is what makes recursion safe (spec FR-006), so its test is a genuine regression guard, not a formality.

## 12. Keeping `TreeTokenNode` under the size ceiling

**Decision**: Extract the reference-rendering branch into its own component (working name `TokenReferenceValue`) in its own folder, rather than adding a sixth branch inline.

**Rationale**: `TreeTokenNode.tsx` is already **240 lines** against Principle X's 300-line soft ceiling, and its documented "5-path model" dispatch is dense. Adding reference display, the resolved-value preview, the navigation control, and the multiple-definition picker inline would push it well past the ceiling and blur its single nameable purpose ("dispatch a token to the right editor or error view"). Principle X treats approaching that ceiling as a signal to extract, not a target to defend.
