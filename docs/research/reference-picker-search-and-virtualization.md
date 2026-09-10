# Reference picker: search-filtering and virtualization library options

Research for `apps/web-app/components/TokenReferencePicker/`, which wraps
`packages/design-system/src/components/Combobox/Combobox.tsx`
(cmdk + Radix Popover). Triggered by a real measured regression: the
Playwright perf test
`apps/web-app/e2e/edit-token-references-perf.spec.ts` (test id A18, spec
requirement SC-004) records main-thread Long Tasks of 170 ms / 80 ms (140 /
51 / 59 ms even after `React.memo`-ing the row) when typing against the
~2,000-candidate fixture
`apps/web-app/e2e/fixtures/tokens/large_scale.tokens.json`, well over the
50 ms budget.

## Current implementation, as grounded in the local source

- `Combobox<T>` (`packages/design-system/src/components/Combobox/Combobox.tsx`)
  is a thin, fully-controlled wrapper over `cmdk`'s `Command` /
  `CommandInput` / `CommandList` / `CommandItem` (`packages/design-system/src/components/Command/Command.tsx`,
  which itself re-exports `cmdk`'s `Command` primitives) inside a Radix
  `Popover`. It sets `shouldFilter={false}` on `Command` — "The caller owns
  filtering and ordering (`cmdk` filtering is disabled) and every piece of
  state" — and maps `items` (already filtered/ordered by the caller) 1:1 to
  `CommandItem` rows with no windowing at all.
- `TokenReferencePicker.tsx` computes `items` via
  `filterCandidates(catalogue.candidates, query, edited)` from
  `apps/web-app/lib/tokens/candidate-filter.ts`, a hand-rolled pure function:
  case-insensitive substring match of the query against the full dotted
  `displayPath`, ordered by match-start position then alphabetically; an
  empty query instead sorts every candidate into three bands (same effective
  type as the edited token, then same file, then everything else),
  alphabetical within each band. `cmdk`'s own filter/sort is bypassed
  entirely (`shouldFilter={false}`), so this is the *only* filtering that
  runs.
- `apps/web-app/lib/tokens/candidate-filter.bench.ts` and
  `candidate-filter.test.ts` exist alongside it — the filter itself is
  covered and benchmarked.
- The feature spec is `specs/009-edit-token-references/spec.md`:
  - **FR-004**: "Typing in the control MUST narrow the list by a
    case-insensitive substring match of the query against each candidate's
    full dotted path (not only its final segment). Matches MUST be ordered
    by the position of the match in the path (earlier match first), then
    alphabetically by path. Fuzzy / non-adjacent matching is out of scope
    for this feature."
  - **FR-005**: "The control MUST be fully operable by keyboard alone —
    opening, searching, moving through candidates, selecting, and dismissing
    — and MUST meet WCAG 2.2 AA, including a programmatically determinable
    name for the control and screen-reader-announced results and
    selection."
  - **SC-004**: "For a token set of at least 1,000 candidate paths,
    keystroke-to-updated-list latency stays under 50 ms at the 95th
    percentile, and no single main-thread task triggered by typing exceeds
    50 ms (the Long Task threshold)."
  - **SC-006**: "The entire flow — open, search, choose, confirm — is
    completable using only the keyboard, and the control passes automated
    WCAG 2.2 AA checks with zero violations."

So any change has two hard constraints from the spec itself: FR-004's exact
match semantics (substring, not fuzzy, ordered by match position then
alphabetically) must be preserved or reproduced, and FR-005/SC-006's full
keyboard operability must not regress.

## 1. Search / filtering libraries

### cmdk's own built-in filter
cmdk ships a default `filter` prop with signature
`(value: string, search: string, keywords?: string[]) => number` returning a
rank score; passing `shouldFilter={false}` (as `Combobox.tsx` already does)
disables cmdk's own filtering *and* sorting so the caller can do both
itself — this is documented as the supported "bring your own filtering"
escape hatch and is exactly how it's used today.
[[cmdk GitHub README](https://github.com/pacocoursey/cmdk)]
Its FAQ states performance is good "up to 2,000-3,000 items" *with no
virtualization*, and explicitly: "If you need virtualization, bring your
own." [[cmdk GitHub README](https://github.com/pacocoursey/cmdk)] cmdk
itself is `^1.1.1` in `packages/design-system/package.json`, ~14.9 kB
gzipped (46 kB min) per Bundlephobia, and heavily used (~36M weekly npm
downloads, 12.8k GitHub stars).
[[Bundlephobia: cmdk](https://bundlephobia.com/package/cmdk)]

Because filtering is already fully delegated to `candidate-filter.ts` and
`shouldFilter={false}` is already set, cmdk's own filter is **not a
candidate to switch to** — re-enabling it would mean giving up FR-004's
exact "position then alphabetical" ordering for cmdk's undocumented
internal scoring, a worse fit, not a better one. The relevant question for
cmdk is only virtualization (section 2).

### Fuse.js
Fuzzy-search library (Bitap algorithm) with zero dependencies, current
version 7.5.0 stable (7.6.0-beta.0 in prerelease), ~10–12M weekly npm
downloads, 9.4 kB gzipped (26.5 kB min) full build (a smaller "basic" build
also exists).
[[Fuse.js site](https://www.fusejs.io/)] [[Bundlephobia: fuse.js](https://bundlephobia.com/package/fuse.js)]
It supports more than fuzzy scoring: its "Extended search" syntax has
explicit operators for exact-match, prefix (`^`), suffix (`$`), and
substring/include matching, so a simple substring mode is achievable, and
results carry per-match location/index information when
`includeMatches: true` is set.
[[Fuse.js site](https://www.fusejs.io/)]
However, Fuse.js's core value proposition is *fuzzy, typo-tolerant*
matching — approximate, non-adjacent character matching — which FR-004
explicitly rules out ("Fuzzy / non-adjacent matching is out of scope for
this feature"). Using it in "exact substring" mode only would mean carrying
its full fuzzy-matching machinery (tokenization, scoring, extended-query
parsing) to reproduce behavior `candidate-filter.ts` already implements in
~25 lines, and its ordering model (relevance `score`) does not natively
give "ordered by position of match, then alphabetically" — that would still
need a custom sort on top. Net: a heavier, worse-fitting dependency for
this specific requirement.

### match-sorter
Purpose-built exactly for "filter and rank a list of strings/objects for a
combobox" — its own README states this framing. Originally by
kentcdodds/match-sorter (now the actively developed fork under
`match-sorter`, also depended on by TanStack via
`@tanstack/match-sorter-utils`). Current version 8.3.0 (published ~4 months
ago as of Sept 2026), ~2.9M weekly npm downloads, "sustainable" maintenance
per ecosystem scoring, 4.1k GitHub stars, 5 open issues.
[[match-sorter GitHub](https://github.com/kentcdodds/match-sorter)]
Bundle size: 3.3 kB gzipped (6.8 kB min), including its one dependency
`remove-accents`.
[[Bundlephobia: match-sorter](https://bundlephobia.com/package/match-sorter)]
API: `matchSorter(items, query, options)`, with `keys` for object arrays
(including nested/callback keys), per-key thresholds, and a `baseSort`
fallback. Its ranking model is a fixed hierarchy —
`CASE_SENSITIVE_EQUAL` > `EQUAL` > `STARTS_WITH` > `WORD_STARTS_WITH` >
`CONTAINS` > `ACRONYM` > `MATCHES` (letters-in-order) — not FR-004's flat
"substring present, then order by match-start index, then alphabetical."
`CONTAINS` matches would tie under match-sorter's own ranking and it doesn't
expose match position as a sort key out of the box; matching FR-004 exactly
would need `matchSorterWithRankInfo()` plus a custom secondary sort using
each match's index, or just keeping `.includes()` + `.indexOf()` as today.
[[match-sorter GitHub](https://github.com/kentcdodds/match-sorter)]

### Verdict on search libraries
Neither Fuse.js nor match-sorter's default ranking reproduces FR-004's
"substring match, ordered by position then alphabetically" semantics
without a custom secondary sort layered on top, and cmdk's own filter is
already deliberately disabled in favor of that same rule. `candidate-filter.ts`
is ~25 lines, already tested (`candidate-filter.test.ts`) and benchmarked
(`candidate-filter.bench.ts`), and per the e2e evidence is not the
bottleneck — the Long Tasks are attributed to cmdk's DOM
reconciliation/roving-focus bookkeeping across ~2,000 rendered rows, not to
`filterCandidates`'s O(n) scan. Adopting a search library here would add a
dependency and a translation layer to reproduce behavior that's already
correct, small, and fast. **Recommendation: keep the hand-rolled filter.**
If a genuine fuzzy-matching feature is later added intentionally (a spec
change, not a perf fix), match-sorter is the better-fit candidate of the
two — its API is designed for exactly this
list-of-strings-in-a-combobox shape and its bundle cost is a third of
Fuse.js's — but that's out of scope for the current, purely
substring-based FR-004.

## 2. Unstyled virtualization libraries

### TanStack Virtual (`@tanstack/react-virtual`)
Headless — "Headless UI for virtualizing scrollable elements in React," no
required CSS or DOM structure of its own, exposing only a `useVirtualizer`
hook that returns virtual item offsets/sizes for the caller to render.
[[TanStack Virtual docs](https://tanstack.com/virtual/latest)]
Current version 3.14.11 (published ~1 day before this research, so an
actively maintained release cadence), ~7.65M weekly npm downloads, 25.3 kB
min / 7.5 kB gzip (its `@tanstack/virtual-core` dependency is ~48.5 kB
min separately).
[[npm: @tanstack/react-virtual](https://www.npmjs.com/package/@tanstack/react-virtual)]
[[Bundlephobia: @tanstack/react-virtual](https://bundlephobia.com/package/@tanstack/react-virtual)]
It's designed as "a coordinate system, not a list component," explicitly
supporting dynamically changing item counts/data (re-measuring/recomputing
the visible range as the underlying array — our filtered `items` — changes
every keystroke) and scrollable containers including portaled content such
as a popover.
[[TanStack Virtual docs](https://tanstack.com/virtual/latest)]
This is the library the cmdk ecosystem itself points to when the "bring
your own virtualization" escape hatch is used.

### react-window (v2, bvaughn)
Now on a v2 rewrite (`react-window.vercel.app` for current docs, v1 docs
archived separately), current npm major discovered is 2.3.1. Two
components, `List` and `Grid`, both unstyled — "no mandatory CSS," just a
`style`/`className` passthrough, though the caller must supply
height/width. 4.5 kB gzip (13.1 kB min) — the smallest of the three.
[[react-window GitHub](https://github.com/bvaughn/react-window)]
[[Bundlephobia: react-window](https://bundlephobia.com/package/react-window)]
Ecosystem summaries put it at ~1.9M weekly downloads and describe it as
"stable but no longer actively developed by [the original] maintainer" —
i.e. lower velocity than TanStack Virtual's release cadence, though it
still received a v2 rewrite.

### react-virtuoso
Not fully headless: its own docs describe it as "customizable but not
fully headless" — it ships opinionated higher-level components
(`Virtuoso`, `TableVirtuoso`, `GroupedVirtuoso`, `MessageList`) with a
predetermined DOM structure that you customize via slots/props rather than
building from primitives, closer to "batteries-included virtualized list"
than "headless coordinate system."
[[react-virtuoso GitHub](https://github.com/petyosi/react-virtuoso)]
19.3 kB gzip (60.4 kB min) at v4.18.13 — the largest of the three by a
wide margin — with ~2.1M weekly downloads and active commit history (1,035+
commits, 6.5k stars).
[[Bundlephobia: react-virtuoso](https://bundlephobia.com/package/react-virtuoso)]
It explicitly supports dynamic/changing lists (infinite scroll, prepending
older items) which is architecturally the right shape for a live-filtered
list, but its richer built-in behavior (its own scroll-follow/anchoring
heuristics) is more machinery than this picker needs and is harder to keep
"unstyled" per the design-system's own Combobox contract ("caller owns
rendering").

### cmdk + virtualization: prior art and specific risk
This combination is a known, recurring ask against cmdk, and the answers
found are consistent and cautionary:

- cmdk's own FAQ, restated by the maintainer in a GitHub Discussion: "Does
  cmdk support virtualization? ... Virtualization? No. Good performance up
  to 2,000-3,000 items, though" — with a commenter separately reporting
  ~500 ms open time on a list of only ~250 items in their case, i.e. cmdk's
  own performance ceiling is not sharply bounded and is felt well below
  2,000 items in practice.
  [[cmdk Discussion #211](https://github.com/pacocoursey/cmdk/discussions/211)]
- cmdk GitHub Issue #282: a user combining `react-window` +
  `react-virtualized-auto-sizer` with `Command` found `Command.Item`s
  stopped rendering and `Command.Empty` (the "no results" state) showed
  instead — i.e. cmdk's internal item-registration bookkeeping did not
  correctly see virtualized/windowed items as present, defeating the empty
  vs. non-empty state logic.
  [[cmdk#282](https://github.com/pacocoursey/cmdk/issues/282)]
- cmdk GitHub Issue #299: combining TanStack Virtual with cmdk's `loop`
  keyboard-navigation prop, arrow-key navigation does not wrap correctly —
  keyboard focus/looping stops at the end of the *rendered* (windowed) DOM
  list rather than the full logical list, since cmdk's own roving-focus
  logic only knows about currently-mounted `CommandItem`s.
  [[cmdk#299](https://github.com/pacocoursey/cmdk/issues/299)]
- A related report against a Combobox built with `react-virtualized`
  (not cmdk, but the same shape of problem) found the search input losing
  focus while typing, once virtualization was layered under a filtered
  combobox list.

Taken together, this is the central integration risk called out in the
task brief: cmdk's keyboard navigation and empty/non-empty state tracking
are built around iterating its own registered, currently-*mounted*
`CommandItem` children. Virtualizing `CommandList`'s children (windowing so
only ~20–30 of ~2,000 rows are in the DOM) removes items cmdk doesn't know
are still logically present, which breaks:
- `loop` wrap-around and generally arrow-key traversal past the windowed
  edge (cmdk#299),
- `Command.Empty` / empty-state detection when the visible window happens
  to render zero items even though matches exist off-screen (cmdk#282),
- and, by the same mechanism, cmdk's roving `aria-activedescendant` /
  active-item bookkeeping, since that too is derived from the mounted item
  set — a first-class concern here given FR-005/SC-006 require full
  keyboard operability and zero WCAG 2.2 AA violations, and
  `Combobox.tsx`'s `onHighlightChange`/`selectedKey` plumbing
  (`handleValueChange`, `aria-current`) already depends on cmdk's `value`/
  highlight state being consistent with the full logical list.

No maintained, documented "virtualize cmdk safely" pattern turned up in
cmdk's own repo (issues, discussions, or README) — every trail is an open
or stale issue describing breakage, not a working recipe.

## 3. Recommendation

**Search/filtering: keep `candidate-filter.ts` as-is.** It already
implements FR-004's exact contract, is fast (the e2e evidence blames DOM
reconciliation, not the filter function), and is already unit-tested and
benchmarked. Neither Fuse.js (fuzzy-first, wrong semantics for a
substring-only requirement) nor match-sorter (a different fixed ranking
hierarchy that also needs a custom secondary sort to match FR-004) is worth
the added dependency and translation layer for this feature. Revisit only
if/when a future spec change intentionally adds fuzzy matching — in that
case match-sorter is the better-shaped candidate (purpose-built for
combobox filtering, 3.3 kB gzip) over Fuse.js (9.4 kB gzip, oriented around
approximate/typo-tolerant search this feature explicitly excludes).

**Virtualization: do not virtualize cmdk's `CommandList` directly with any
of TanStack Virtual / react-window / react-virtuoso.** The prior art above
(cmdk#282, cmdk#299, cmdk maintainer's own "no" in Discussion #211) shows
this specific combination — windowing cmdk's `CommandItem` children — is a
recurring, unresolved source of breakage in exactly the two areas this
feature cannot regress: keyboard navigation (`loop`/arrow keys) and
empty/non-empty and active-item state, which underpin FR-005/SC-006's full
keyboard operability and WCAG 2.2 AA requirement. There is no documented
safe integration pattern, only open/stale bug reports.

Given that, the two realistic paths are:

1. **Cap the rendered candidate list instead of virtualizing** — bound
   `items` (already ordered by `candidate-filter.ts`) to, say, the top
   N (e.g. 100–200) results before handing them to `Combobox`, with a
   "N more — refine your search" affordance. This stays entirely inside
   cmdk's supported operating envelope ("good performance up to 2,000-3,000
   items" refers to items cmdk itself manages; capping keeps the *mounted*
   count far below where the measured Long Tasks occur), needs no new
   dependency, and doesn't touch cmdk's internal keyboard/ARIA machinery at
   all — zero risk to FR-005/SC-006. This is the lowest-risk fix and is
   likely sufficient on its own, since FR-004's ordering already surfaces
   the most relevant matches first (earliest match position, alphabetical)
   so a cap rarely hides the token the user is looking for once they've
   typed a few characters.
2. **If a true windowed-DOM virtualization is still wanted** (e.g. to
   support scrolling the full un-capped result set), the least-risky
   integration shape is **TanStack Virtual (`@tanstack/react-virtual`)**
   used *underneath* a still-fully-populated cmdk `Command`/`CommandList`
   logical structure is not compatible with cmdk's mount-based item
   registration per the issues above, so this would require moving off
   cmdk's `CommandItem`-driven keyboard/ARIA model entirely — i.e.
   reimplementing listbox roving-focus, `aria-activedescendant`, and
   selection state by hand on top of `useVirtualizer`'s windowed rows,
   rather than composing it into the existing `Command` primitive. That is
   a materially larger, riskier change to the shared design-system
   `Combobox` (used elsewhere beyond this picker) than this ask
   contemplates, and re-litigates accessibility behavior cmdk currently
   gives for free. TanStack Virtual is still the right choice *if* that
   path is taken — headless, smallest well-maintained option after
   react-window, highest download/maintenance signal of the three, explicit
   support for dynamically-changing item counts — but it should be scoped
   as its own follow-up feature (with its own accessibility test pass), not
   folded into this perf fix.

**Net recommendation: fix SC-004 by capping the rendered/mounted candidate
count in `TokenReferencePicker`/`Combobox` (option 1), not by adopting a
virtualization library.** This directly targets the measured cause (cmdk
reconciling a near-full ~2,000-row DOM on every keystroke), needs no new
dependency, and carries none of the documented cmdk-keyboard/ARIA
regression risk that every real virtualization integration attempt against
cmdk has hit.
