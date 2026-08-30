# Implementation Plan: Fast, Seamless Editing

**Branch**: `worktree-fast-seamless-editing` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-fast-seamless-editing/spec.md`

## Summary

Editing a token file today re-renders the **entire** file's token tree on every keystroke:
`TokenTree` holds all edit state (`treeState`, `pendingEdits`, `fieldErrors` — all `useState`),
every edit replaces a `Map` by identity, and nothing below it (`TreeNode` → `TreeGroupNode`
→ `TreeTokenNode` → editors) is memoized. Each re-rendered `TreeTokenNode` also re-runs
`parseReference` / `resolveBuiltInContract` / `validateTokenValue` / `resolveEditorForType`,
and every rename keystroke rebuilds the whole tree via `applyEditsToPlainNode`. On a large
file this is where the lag, the caret jumps, and the layout churn on tab come from.

The approach, in priority order matching the spec's user stories:

1. **Isolate the edited row's render (P1).** Introduce one `StagedEditsStore` per `TokenTree`
   mount — a React-free class (`apps/web-app/lib/tokens/staged-edits-store.ts`) that owns the
   whole editing session: the base tree, the unsaved overlay, reference resolution, and
   validation, behind a small **key-addressed** interface (`getFields(key)`,
   `getError(key)`, `getResolvedPreview(key)`, `getHasPending()`, `validate`, `commit`,
   `discard`, `save`). Components stay thin: they read what they need for one `key` via
   `useSyncExternalStore` (`useTokenSlice` / `useResolvedPreview`), hold only transient
   per-field `draft` state (`useState`), and call `store.commit(key, draft)` on
   blur / Enter / debounce. A keystroke is `setDraft` only — no store write. `memo` on
   `TreeNode` / `TreeGroupNode` / `TreeTokenNode`, whose props reduce to stable `node`
   (structure) + `relativePath`. The overlay is never folded into a merged tree while
   editing — only `save()` does that, once (`research.md` §2 / §2a).
2. **Stabilize keyboard navigation (P2).** Reserve layout space for validation messages and
   any focus-revealed helper UI so tabbing never reflows; guarantee the focus indicator is
   never clipped by an `overflow` ancestor; keep native `<details>` uncontrolled so focus
   moves don't collapse groups.
3. **Keep the reference ripple local (P3 / FR-011).** The store builds a reverse-dependency
   index on `save()`; a `commit` invalidates the resolved-preview cache for only
   `key ∪ reverseDeps(key)`; reference rows re-resolve via `getResolvedPreview` behind
   `useDeferredValue`. Cross-file chain hops resolve from the server `referenceView` value
   (`research.md` §3a; `contracts/live-reference-resolution.md`).
4. **Lock it in.** A large generated fixture (~2,000 tokens), Playwright specs that measure
   edit-echo latency and assert zero out-of-region layout shift on edit / tab / ripple, a
   component-level render-count guard, React-free store/resolver unit tests, and a committed
   baseline record (SC-008).

**Spec-alignment note:** the spec's User Story 3 is written around "selecting a different
token" swapping an editor panel. This app has no such panel — every token in a file is
edited inline in one tree. The plan reads US3 as its faithful analog for this UI: *an edit
or focus move in one row must not visibly re-render or shift any other row or the page
chrome*. See `research.md` §6; worth a one-line `/speckit-clarify` touch-up to the spec but
not a blocker.

## Technical Context

**Language/Version**: TypeScript (strict, via root `tsconfig.base.json`), React 19, Node ≥ 20

**Primary Dependencies**: Next.js 16.3.1 (App Router), React 19 / React-DOM (pnpm catalog) —
`memo` / `useMemo` / `useDeferredValue` / `useSyncExternalStore`, all native, no shim —
`@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract`, `@dtcg-editor/token-editor-*`,
`@dtcg-editor/design-system` (`--dtcg-ed-*` tokens), `neverthrow`. The `StagedEditsStore`
receives the save call as an injected constructor arg (Principle VI); no new package.

**Storage**: N/A — token files on disk, read/written by the existing Next route handlers;
this feature adds no persistence and does not touch the save path or serialization

**Testing**: Vitest (jsdom `*.test.ts[x]` unit; browser-mode `*.a11y.test.tsx` under real
CSS cascade with `axe-core`), Playwright (`apps/web-app/e2e`, run against `pnpm run start`
production build), all wired through the single root `vitest.config.ts` `test.projects`

**Target Platform**: Modern evergreen browsers (Chromium is the test target); desktop web

**Project Type**: Monorepo web application — all work confined to `apps/web-app`

**Performance Goals** (from spec Success Criteria, taken as the budget):
- Value edit visible on screen within **100 ms** of commit in ≥ 95% of edits, no loading indicator (SC-001)
- Typed text never trails input by more than **one animation frame (~16 ms)**; zero dropped characters over 5 s at ~10 cps (SC-006)
- Editing a token referenced by ≥ 100 others still meets the 100 ms echo, no visible tree rebuild (SC-005)
- All guarantees hold for documents up to **2,000 tokens** (SC-007)

**Constraints**:
- Zero measured layout shift in any page region outside the edited field and its own
  validation area, during/after an edit, on Tab/Shift+Tab, and on ripple update (SC-002/003/004)
- Focus never falls to `document.body` during editing or tabbing; focus indicator fully
  visible (unclipped, unobscured) at every stop (SC-003)
- No change to token parsing, validation *rules* (`validateTokenValue` / rename-collision
  run unchanged, now at commit rather than per keystroke), the save/PATCH wire contract, or
  on-disk output
- Design values only via `--dtcg-ed-*` (Principle XII) — including any reserved-space `min-height`
- No new runtime dependency without an Approved-Dependencies amendment (Principle VIII)

**Scale/Scope**: One file's token tree per page; largest realistic hand-authored set
~2,000 tokens; ~6 editable token types today (color, dimension, + fallback/generic)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Relevance | Status |
| --- | --- | --- |
| I. DTCG Spec Compliance | Feature must not alter parsing/validation/serialization or round-trip | **PASS** — render-path only; no change to `token-core`, contracts, or the save route |
| II. Feature-Based Organization | New/changed code stays cohesive per component/hook | **PASS** — changes live in `apps/web-app/components/{TokenTree,TreeNode,TreeGroupNode,TreeTokenNode,TokenBlock}`, `apps/web-app/hooks`, and `apps/web-app/lib/tokens` (the React-free store + resolver); each is its own folder/file with a co-located test |
| III. TypeScript Strictness | No `any`, no flag relaxation, `!` needs justification | **PASS** — plan adds no relaxation; store API + `ResolvedValue` are fully typed |
| IV. Validation at the Edges | — | **PASS** — no new edges; a row's `draft` is trusted UI state, and it only reaches `#pending` through `store.commit`, which runs the same `validateTokenValue` / rename-collision checks as today |
| V. Result-Pattern Errors | — | **PASS** — no new fallible boundaries; `commit` returns `boolean` + writes `FieldErrors`, `save()` propagates the existing `SaveError` |
| VI. Dependency Injection for I/O | The store must not import the save call; measurement must not reach into globals | **PASS** — `StagedEditsStore` takes `save` as a constructor arg (`useStagedEdits` passes `useSaveTokenEdits`'s call in), matching `TokenTree`'s existing injected `navigate`; test-only measurement uses Playwright `page.evaluate` + `PerformanceObserver` |
| VII. Token-Editor Package Contract | — | **PASS** — editors unchanged; they still receive `value`/`onChange` |
| VIII. Minimal Dependencies | Prefer React built-ins over a library | **PASS** — `memo` / `useMemo` / `useDeferredValue` / `useSyncExternalStore`, all native, **no** `use-sync-external-store/with-selector` shim; `StagedEditsStore` is a ~120-line hand-rolled class, not a state library; **no** virtualization library unless post-implementation measurement proves it necessary (tracked in Complexity Tracking) |
| IX. Round-Trip Fidelity | — | **PASS** — `save()` still calls `applyEditsToPlainNode` once; PATCH body + `token-core` serialization untouched (INV-7) |
| X. Component Granularity & Testing | New component: own folder, < 300 lines, unit + a11y tests; 3+ near-duplicates → `design-system` | **PASS (with obligations)** — the store/resolver are deep **non-React** modules in `lib/tokens/` with concentrated React-free tests, which lets `TreeTokenNode` get *thinner*; `FieldErrorSlot` gets its own folder + `*.test.tsx` + `*.a11y.test.tsx`; if the error-slot / focus-visible pattern lands in 3+ places it moves to `design-system` |
| XI. Modern Defaults | Use current React idioms | **PASS** — React 19 concurrent primitives are the modern-default tool here |
| XII. Design System Usage | Any CSS (reserved min-heights, focus outline offset) via `--dtcg-ed-*` only | **PASS (gate on implementation)** — no literals; add tokens to `design-system` if a needed value is missing |
| Workflow: rebase not merge | — | **PASS** — branch already rebased on local `main` |

**Initial gate: PASS.** One conditional item (virtualization) is deferred to Phase 0 and
tracked below; if Phase 0 selects it, this section gains a MAJOR/MINOR dependency note and a
Complexity Tracking row before implementation.

**Post-design re-check (after Phase 1): PASS.** The design is a deep `StagedEditsStore`
(~120-line React-free class) + a preview resolver, read through native `useSyncExternalStore`
via three small hooks — no state library, no shim (Principle VIII); virtualization stays
deferred behind a post-implementation measurement gate (`research.md` §7). The store takes
`save` as an injected arg (Principle VI); `commit` runs the same validation as today and
`save()` is the only mutation of the base tree, via one `applyEditsToPlainNode` — PATCH body
and serialization untouched (INV-6, INV-7 → I / IV / IX hold). The store/resolver are deep
*non-React* modules with concentrated React-free tests (`lib/tokens/`), which keeps
`TreeTokenNode` under the size limit rather than growing it; CSS work is `--dtcg-ed-*`-only
and `FieldErrorSlot` gets its own folder + unit + a11y tests (X / XII). No Complexity
Tracking row is active.

## Project Structure

### Documentation (this feature)

```text
specs/010-fast-seamless-editing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── render-isolation.md
│   ├── keyboard-and-layout-stability.md
│   ├── live-reference-resolution.md
│   └── measurement-and-baseline.md
├── baseline.md          # Recorded before/after numbers (SC-008), created during implementation
├── checklists/
│   └── requirements.md  # Already created by /speckit-specify
└── tasks.md             # /speckit-tasks output — NOT created here
```

### Source Code (repository root)

```text
apps/web-app/
├── lib/tokens/
│   ├── staged-edits-store.ts       # NEW: StagedEditsStore class — owns #tree/#index/
│   │                               #      #reverseDeps/#serverPreview/#pending/#errors/caches;
│   │                               #      getFields/getError/getResolvedPreview/getHasPending/
│   │                               #      validate/commit/reportError/discard/save; #save injected.
│   │                               #      React-free.
│   ├── staged-edits-store.test.ts  # NEW: INV-1/3/6/7/16, cache-invalidation scope, no I/O
│   ├── preview-resolver.ts         # NEW: pure resolvePreview(key, getEffectiveNode, serverPreview)
│   │                               #      + buildReverseDeps — cycle-safe, file-boundary splice
│   └── preview-resolver.test.ts    # NEW: multi-hop / cycle / dangling / cross-file (C-LR-3/5/6/7)
├── hooks/
│   ├── useStagedEdits.ts           # NEW: StagedEditsContext + hook that lazily makes ONE store
│   │                               #      per mount and wires the injected `save`
│   ├── useStagedEdits.test.tsx     # NEW: per-mount instance (INV-5), subscribe stability (INV-2)
│   ├── useTokenSlice.ts            # NEW: (key) => { fields, error, commit, discard }
│   ├── useTokenSlice.test.tsx      # NEW
│   ├── useResolvedPreview.ts       # NEW: (key) => ResolvedValue, useDeferredValue-wrapped
│   └── useResolvedPreview.test.tsx # NEW
├── components/
│   ├── TokenTree/
│   │   ├── TokenTree.tsx            # CHANGED: `useStagedEdits({ initialTree: node, referenceView,
│   │   │                            #          save })`; render `<TreeNode node={store.getTree()}>`;
│   │   │                            #          SaveButton → store.save; nav guard → getHasPending.
│   │   │                            #          NO treeState/pendingEdits/fieldErrors useState.
│   │   ├── TokenTree.test.tsx       # CHANGED: store wiring + save-success rebuild
│   │   └── TokenTree.module.css
│   ├── TreeNode/TreeNode.tsx        # CHANGED: memo; props = node (structure) + relativePath only
│   ├── TreeGroupNode/               # CHANGED: memo; useTokenSlice + local draft for the name field
│   ├── TreeTokenNode/
│   │   ├── TreeTokenNode.tsx        # CHANGED: memo; useTokenSlice(key) + local
│   │   │                            #          useState<Partial<EditableFields>>({});
│   │   │                            #          shown = {...fields, ...draft}; keystroke = setDraft;
│   │   │                            #          commit() → store.commit; useResolvedPreview for
│   │   │                            #          the reference path; useMemo the dispatch chain
│   │   ├── TreeTokenNode.test.tsx   # CHANGED: C-RI-1, C-RI-4/C-LR-2, C-RI-6
│   │   └── TreeTokenNode.a11y.test.tsx  # NEW/CHANGED: focus + no-shift on tab
│   ├── TokenBlock/
│   │   ├── TokenBlock.tsx           # CHANGED: always render the FieldErrorSlot
│   │   ├── TokenBlock.module.css    # CHANGED: reserved min-height + focus-visible offset,
│   │   │                            #          all via --dtcg-ed-* (add tokens if missing)
│   │   └── TokenBlock.test.tsx      # CHANGED
│   └── FieldErrorSlot/              # NEW
│       ├── FieldErrorSlot.tsx
│       ├── FieldErrorSlot.test.tsx
│       └── FieldErrorSlot.a11y.test.tsx
├── e2e/
│   ├── editing-perf.spec.ts        # NEW: edit-echo latency, typing lag, ripple latency (C-LR-1/8)
│   ├── render-stability.spec.ts    # NEW: zero out-of-region layout shift on edit / tab / ripple
│   ├── keyboard-navigation.spec.ts # CHANGED: full tab-through + focus-visible over large fixture
│   ├── support/
│   │   └── stability.ts            # NEW: PerformanceObserver layout-shift + render-timing helpers
│   └── fixtures/tokens/
│       └── large_scale.tokens.json # NEW: ~2,000-token generated fixture
└── scripts/
    └── generate-large-fixture.ts   # NEW: deterministic large-fixture generator
```

**Structure Decision**: Monorepo **web application**; 100% of the change is inside
`apps/web-app` — `lib/tokens/` (the React-free `StagedEditsStore` + `preview-resolver`),
`hooks/` (three small `useSyncExternalStore` hooks), `components/`, `e2e/`, `scripts/`. No
`packages/*` change is required. The one thing that would cross into `packages/design-system`
is a missing design token (a spacing value for the reserved error slot, a focus-outline
offset) — added there per Principle XII; and `FieldErrorSlot` / the focus-visible treatment
is promoted to `design-system` if it lands in 3+ places (Principle X).

## Complexity Tracking

> Filled only if the Constitution Check has violations that must be justified.

| Potential violation | Trigger | Simpler alternative & why it may be insufficient |
| --- | --- | --- |
| Add a list-virtualization / windowing dependency (Principle VIII, Approved Dependencies) | Phase 0 / early measurement shows render isolation + concurrent primitives still miss SC-001/006/007 at 2,000 tokens | Render isolation (memo + stable handlers + local input state + deferred derived work) is tried first and measured; virtualization is only escalated to if the numbers demand it, and then needs a `speckit-constitution` amendment to the Approved Dependencies list before use |

No other anticipated violations. If Phase 1 design introduces one, it is added here with
justification before `/speckit-tasks`.
