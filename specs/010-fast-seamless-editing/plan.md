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

1. **Isolate the edited row's render (P1).** Give each token row local input state so typing
   updates only that row; commit to a per-mount staged-edits **instance store** on
   blur/debounce. Each row subscribes to just its own `pendingEdit` / `fieldError` slice via
   React's native `useSyncExternalStore` (store passed by context; no shim), which removes
   the Map/callback prop-drilling through `TreeNode` → `TreeGroupNode` → `TreeTokenNode`
   entirely and lets plain `memo` on the group/row components do its job. `pendingEdits`
   stays a pure overlay — never folded into a merged tree while editing (`research.md` §2a).
2. **Stabilize keyboard navigation (P2).** Reserve layout space for validation messages and
   any focus-revealed helper UI so tabbing never reflows; guarantee the focus indicator is
   never clipped by an `overflow` ancestor; keep native `<details>` uncontrolled so focus
   moves don't collapse groups.
3. **Keep ripple local (P3).** When an edit changes a referenced value, update only the
   affected resolved previews; use `useDeferredValue` / `startTransition` so derived
   recomputation never blocks the keystroke.
4. **Lock it in.** A large generated fixture (~2,000 tokens), Playwright specs that measure
   edit-echo latency and assert zero out-of-region layout shift on edit / tab / ripple, a
   component-level render-count guard, and a committed baseline record (SC-008).

**Spec-alignment note:** the spec's User Story 3 is written around "selecting a different
token" swapping an editor panel. This app has no such panel — every token in a file is
edited inline in one tree. The plan reads US3 as its faithful analog for this UI: *an edit
or focus move in one row must not visibly re-render or shift any other row or the page
chrome*. See `research.md` §6; worth a one-line `/speckit-clarify` touch-up to the spec but
not a blocker.

## Technical Context

**Language/Version**: TypeScript (strict, via root `tsconfig.base.json`), React 19, Node ≥ 20

**Primary Dependencies**: Next.js 16.3.1 (App Router), React 19 / React-DOM (pnpm catalog),
`@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract`, `@dtcg-editor/token-editor-*`,
`@dtcg-editor/design-system` (`--dtcg-ed-*` tokens), `neverthrow`

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
- No change to token parsing, validation semantics, save/PATCH flow, or on-disk output
- Design values only via `--dtcg-ed-*` (Principle XII) — including any reserved-space `min-height`
- No new runtime dependency without an Approved-Dependencies amendment (Principle VIII)

**Scale/Scope**: One file's token tree per page; largest realistic hand-authored set
~2,000 tokens; ~6 editable token types today (color, dimension, + fallback/generic)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Relevance | Status |
| --- | --- | --- |
| I. DTCG Spec Compliance | Feature must not alter parsing/validation/serialization or round-trip | **PASS** — render-path only; no change to `token-core`, contracts, or the save route |
| II. Feature-Based Organization | New/changed code stays cohesive per component/hook | **PASS** — changes live in `apps/web-app/components/{TokenTree,TreeNode,TreeGroupNode,TreeTokenNode,TokenBlock}` and `apps/web-app/hooks`; any extracted row/store is its own folder |
| III. TypeScript Strictness | No `any`, no flag relaxation, `!` needs justification | **PASS** — plan adds no relaxation; memo generics typed via existing `TreeNodeProps` |
| IV. Validation at the Edges | — | **PASS** — no new edges; local input state is trusted UI state, committed through the existing `onStageEdit` path which already validates |
| V. Result-Pattern Errors | — | **PASS** — no new fallible boundaries |
| VI. Dependency Injection for I/O | Perf/measurement harness must not reach into globals ad hoc | **PASS (with care)** — test-only measurement uses Playwright's `page.evaluate` + `PerformanceObserver`; any in-component timing hook (if used) takes an injected clock, matching `TokenTree`'s existing injected `navigate` |
| VII. Token-Editor Package Contract | — | **PASS** — editors unchanged; they already receive `value`/`onChange` |
| VIII. Minimal Dependencies | Prefer React built-ins over a library | **PASS (intended)** — `memo`/`useCallback`/`useMemo`/`useDeferredValue`/`useTransition`/`useSyncExternalStore` (all native React, **no** `use-sync-external-store/with-selector` shim); the staged-edits store is a ~40-line hand-rolled instance class, not a state library; **no** virtualization library unless Phase 0 proves it necessary, which would require a Tech-Stack amendment (tracked in Complexity Tracking) |
| IX. Round-Trip Fidelity | — | **PASS** — save path untouched |
| X. Component Granularity & Testing | Any new component: own file/folder, < 300 lines, unit + a11y tests; 3+ near-duplicates → `design-system` | **PASS (with obligations)** — an extracted memoized row or a reserved-space "field error slot" gets its own folder + `*.test.tsx` + `*.a11y.test.tsx`; if the error-slot / focus-visible pattern is reused 3+ places it moves to `design-system` |
| XI. Modern Defaults | Use current React idioms | **PASS** — React 19 concurrent primitives are the modern-default tool here |
| XII. Design System Usage | Any CSS (reserved min-heights, focus outline offset) via `--dtcg-ed-*` only | **PASS (gate on implementation)** — no literals; add tokens to `design-system` if a needed value is missing |
| Workflow: rebase not merge | — | **PASS** — branch already rebased on local `main` |

**Initial gate: PASS.** One conditional item (virtualization) is deferred to Phase 0 and
tracked below; if Phase 0 selects it, this section gains a MAJOR/MINOR dependency note and a
Complexity Tracking row before implementation.

**Post-design re-check (after Phase 1): PASS.** Research selected a render-isolation approach
built only on native React (`memo`/`useMemo`/`useDeferredValue`/`useSyncExternalStore`) plus
a ~40-line hand-rolled `StagedEditsStore` — no state library, no `with-selector` shim — and
explicitly deferred virtualization behind a measurement gate (`research.md` §7), so
Principle VIII holds with no amendment. `data-model.md` adds only in-memory UI state (no new
edges → IV/V unaffected); `pendingEdits` stays a pure overlay and the save-success merge is
net-identical to today (INV-1..INV-4 → I/IX hold). Design work items that touch CSS are
constrained to `--dtcg-ed-*` tokens and new components get their own folder + unit + a11y
tests (`plan.md` structure table), keeping X/XII satisfied. No Complexity Tracking row is
active.

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
│   └── measurement-and-baseline.md
├── baseline.md          # Recorded before/after numbers (SC-008), created during implementation
├── checklists/
│   └── requirements.md  # Already created by /speckit-specify
└── tasks.md             # /speckit-tasks output — NOT created here
```

### Source Code (repository root)

```text
apps/web-app/
├── components/
│   ├── TokenTree/
│   │   ├── TokenTree.tsx            # CHANGED: create the store via useStagedEdits, provide
│   │   │                            #          it by context, keep treeState as useState;
│   │   │                            #          stop passing Maps/callbacks down
│   │   ├── TokenTree.test.tsx       # CHANGED: cover store wiring + save-success merge
│   │   └── TokenTree.module.css
│   ├── TreeNode/TreeNode.tsx        # CHANGED: wrap dispatch children in memo boundaries
│   ├── TreeGroupNode/               # CHANGED: memo; no longer forwards Maps/callbacks
│   ├── TreeTokenNode/
│   │   ├── TreeTokenNode.tsx        # CHANGED: memo; two useSyncExternalStore reads for its
│   │   │                            #          own pendingEdit/fieldError; local draft state;
│   │   │                            #          memoize contract/validation/editor resolution;
│   │   │                            #          commit on blur/Enter/debounce
│   │   ├── TreeTokenNode.test.tsx   # CHANGED
│   │   └── TreeTokenNode.a11y.test.tsx  # NEW/CHANGED: focus + no-shift on tab
│   ├── TokenBlock/
│   │   ├── TokenBlock.tsx           # CHANGED: render a persistent field-error slot
│   │   ├── TokenBlock.module.css    # CHANGED: reserved min-height + focus-visible offset,
│   │   │                            #          all via --dtcg-ed-* (add tokens if missing)
│   │   └── TokenBlock.test.tsx      # CHANGED
│   └── FieldErrorSlot/              # NEW (only if the reserved-space slot is its own component)
│       ├── FieldErrorSlot.tsx
│       ├── FieldErrorSlot.test.tsx
│       └── FieldErrorSlot.a11y.test.tsx
├── hooks/
│   ├── useStagedEdits.ts           # NEW: StagedEditsStore class (pendingEdits/fieldErrors +
│   │                               #      subscribe/getters/mutators) + a hook that lazily
│   │                               #      instantiates it per mount; + StagedEditsContext.
│   │                               #      treeState is NOT here — stays in TokenTree
│   └── useStagedEdits.test.tsx     # NEW: pure store (INV-1/2a/3/4) + hook wiring
│                                   #      (INV-2 subscribe stability, INV-3a per-mount)
├── e2e/
│   ├── editing-perf.spec.ts        # NEW: edit-echo latency, typing lag, ripple latency
│   ├── render-stability.spec.ts    # NEW: zero out-of-region layout shift on edit / tab / ripple
│   ├── keyboard-navigation.spec.ts # CHANGED: extend full tab-through + focus-visible over large fixture
│   ├── support/
│   │   └── stability.ts            # NEW: PerformanceObserver layout-shift + render-timing helpers
│   └── fixtures/tokens/
│       └── large_scale.tokens.json # NEW: ~2,000-token generated fixture (+ generator script)
└── scripts/
    └── generate-large-fixture.ts   # NEW: deterministic large-fixture generator
```

**Structure Decision**: Monorepo **web application**; 100% of the change is inside
`apps/web-app` (`components/`, `hooks/`, `e2e/`, `scripts/`). No `packages/*` change is
required. The one exception that would cross into `packages/design-system` is a missing
design token (e.g. a spacing value for the reserved error slot, or a focus-outline offset) —
added there per Principle XII, and the reserved-space `FieldErrorSlot` / focus-visible
treatment is promoted to `design-system` if it ends up used in 3+ places (Principle X).

## Complexity Tracking

> Filled only if the Constitution Check has violations that must be justified.

| Potential violation | Trigger | Simpler alternative & why it may be insufficient |
| --- | --- | --- |
| Add a list-virtualization / windowing dependency (Principle VIII, Approved Dependencies) | Phase 0 / early measurement shows render isolation + concurrent primitives still miss SC-001/006/007 at 2,000 tokens | Render isolation (memo + stable handlers + local input state + deferred derived work) is tried first and measured; virtualization is only escalated to if the numbers demand it, and then needs a `speckit-constitution` amendment to the Approved Dependencies list before use |

No other anticipated violations. If Phase 1 design introduces one, it is added here with
justification before `/speckit-tasks`.
