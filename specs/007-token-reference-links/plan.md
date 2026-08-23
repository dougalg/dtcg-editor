# Implementation Plan: Token Reference Preview & Navigation

**Branch**: `worktree-token-reference-links` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-token-reference-links/spec.md`

## Summary

Make DTCG token references first-class in the editor: show the value a reference resolves to, let the user jump to the referenced token, and show each token which other tokens depend on it.

References are currently **not a concept anywhere in the codebase** — nothing detects, parses, resolves, or renders a `{a.b.c}` value, so this feature introduces the capability from scratch. Three things follow from that, and they drive the whole design:

1. **A live bug gets fixed on the way.** Because a reference string fails the per-type `valueSchema`, a `color` token holding a reference is currently told its value *"must be a 6-digit hex string like `#rrggbb`"*. That fires against the app's own default token directory (every token in `dark.json`). The fix is to check for a reference *above* per-type validation, mirrored on client and server.
2. **Cross-file is mandatory, not optional.** 200 of the 228 references in this project's own token set point at a token in a different file, but the app loads exactly one file per page. A whole-directory index is required. Measured cost to build it: **1.40 ms**, producing a **14.6 KB** index — cheap enough to rebuild per request and skip caching entirely, which also removes any chance of it going stale against a file the app just saved.
3. **Nothing can be linked to yet.** There is no per-token URL, anchor, or deep link anywhere — the finest addressable unit is a whole file. An addressing scheme has to be invented for User Stories 2 and 3.

Reference syntax and chain walking go into `token-core` (React-free, filesystem-free, taking an injected lookup); cross-file lookup, modes, and the reverse index stay in the web app.

## Technical Context

**Language/Version**: TypeScript, strict per root `tsconfig.base.json`

**Primary Dependencies**: React 19 / Next.js 16 (`apps/web-app`), `zod`, `neverthrow`, and the existing `packages/design-system` components (`Popover`, `Badge`, `Dialog`) — **no new dependency**

**Storage**: None. Token files are read, never modified by this feature; all derived data is rebuilt per request.

**Testing**: `node:test` for `packages/token-core`; Vitest + `@testing-library/react` for `apps/web-app`; Vitest Browser Mode + `axe-core` for component a11y; `@playwright/test` for whole-page and keyboard flows

**Target Platform**: Web (Next.js App Router)

**Project Type**: Web application in an existing monorepo (`apps/web-app` + `packages/*`)

**Performance Goals**: Reference index build **under 50 ms for 5,000 tokens at chain depth 5** (SC-010), asserted by a benchmark rather than observed. Measured floor today: 1.40 ms / 16 files / 565 tokens — so the budget constrains growth, not current scale. Depth 5 describes the benchmark fixture only; the resolver itself follows chains without a depth cap.

**Constraints**: Client and server validation must change together — `docs/history.md` (2026-08-02) records a previous divergence in this exact pair causing both a client crash and a server-side unvalidated-write hole. `TreeTokenNode.tsx` is at 240 lines against Principle X's 300-line ceiling, so the new rendering must be extracted, not inlined. This feature deliberately absorbs the standing backlog item _"TreeGroupNode should be refactored to either be a disclosure element, or make sure it has all necessary aria props like controls, and expanded"_, because native `<details>` is what supplies reveal-a-collapsed-group for free (research.md §5).

**Scale/Scope**: This project's own token set — 16 files, 565 tokens, 490 distinct paths, 228 references (200 cross-file, 50 chained, longest chain 3 hops), 75 multiply-defined paths, busiest token 8 referrers.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle | Status | Notes |
| --- | --- | --- |
| I. DTCG Spec Compliance | Pass | Follows the spec as written: chains followed "until they find a token with an explicit value"; circular chains reported as unknown with a warning; references may target only complete tokens, so a group target is invalid; an aliasing token's type is its target's resolved type. **No deviation, so nothing requires flagging.** An earlier single-hop proposal was rejected specifically because it would have deviated from a normative MUST. |
| II. Feature-Based Code Organization | Pass | Reference syntax + resolution live together in `token-core`, not split across parser/validator layers; the app-side index lives in `lib/tokens/` beside the existing token code; each new component gets its own folder with co-located tests and styles. |
| III. TypeScript Strictness | Pass | No `any`; failure states are a discriminated union narrowed at use, not `unknown` casts. |
| IV. Validation at the Edges | Pass | `tokens.resolver.json` is a new externally-authored file read and gets a Zod schema. Reference *syntax* parsing operates on data already validated by `parseTokenFile`, so it is pure structural inspection, not a new trust boundary. |
| V. Result-Pattern Error Handling | Pass | Genuinely fallible operations (directory load, resolver-file read) return `ResultAsync`. Unresolvable/group-target/circular are **outcomes, not errors** — they are normal displayable states, each with its own user-facing warning (FR-011/FR-011a), so modelling them as `Err` would push a rendering concern through error plumbing. Documented in research.md §10. |
| VI. Dependency Injection for I/O | Pass | `loadTokenDirectory`/`loadResolverModes` take injected fs functions with real defaults, matching `scanTokenDirectory`'s existing signature. `token-core`'s resolver takes an injected `lookup` rather than reaching for a filesystem. |
| VII. Token-Editor Package Contract | Pass | `token-core` gains reference syntax/resolution and stays React-free; dependency direction unchanged. **`TokenTypeContract` is not modified** — the reference check is hoisted above `validateTokenValue` instead, because a reference is valid for every `$type` and is therefore not any one type's business. |
| VIII. Minimal Dependencies | Pass | Nothing new. `Popover`, `Badge`, `Dialog`, and `lucide-react` are already present. |
| IX. Round-Trip Fidelity | Pass | No value is ever rewritten; `serialize.ts` already passes `$value` through verbatim, so a reference survives a save byte-identical. A regression test asserts this. |
| X. Component Granularity & Testing | Pass, with care | New components each in their own PascalCase folder with unit **and** a11y tests. Actively enforced here: `TreeTokenNode.tsx` is already 240/300 lines, so the reference view is extracted rather than added inline (research.md §12). `TreeGroupNode`'s move to native `<details>`/`<summary>` also removes an existing a11y gap — today's toggle `<button>` exposes neither `aria-expanded` nor `aria-controls` (research.md §5). |
| XI. Modern Defaults | Pass | ESM throughout; no legacy pattern introduced. |

**No violations — Complexity Tracking is intentionally empty.**

## Project Structure

### Documentation (this feature)

```text
specs/007-token-reference-links/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — 12 decisions with rationale
├── data-model.md        # Phase 1 — derived entities
├── quickstart.md        # Phase 1 — validation guide
├── contracts/           # Phase 1
│   ├── token-core-reference-api.md
│   ├── reference-index.md
│   ├── reference-validation.md
│   └── token-addressing-and-navigation.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
packages/token-core/src/
├── reference.ts                     # NEW — parseReference, collectReferences
├── reference.test.ts                # NEW — co-located per Principle II
├── resolve-reference.ts             # NEW — chain walking + cycle detection
├── resolve-reference.test.ts        # NEW
└── index.ts                         # EDITED — export the new surface

apps/web-app/
├── lib/tokens/
│   ├── load-directory.ts            # NEW — parses every file, retains documents
│   ├── load-directory.test.ts       # NEW
│   ├── resolver-file.ts             # NEW — Zod-validated tokens.resolver.json reader
│   ├── resolver-file.test.ts        # NEW
│   ├── reference-index.ts           # NEW — index + per-file view
│   ├── reference-index.test.ts      # NEW
│   ├── scan.ts                      # EDITED — consume load-directory, one traversal
│   └── plain-node.ts                # EDITED — carry the per-file reference view
├── app/
│   ├── tokens/[...path]/page.tsx    # EDITED — build index, pass the view
│   └── api/tokens/[...path]/route.ts # EDITED — hoist reference check above validation
├── components/
│   ├── TokenReferenceValue/         # NEW — resolved value + navigation control
│   ├── ReferenceWarning/            # NEW — one distinct warning per failure case
│   ├── ReferencedByBadge/           # NEW — "referenced N times" + popover list
│   ├── TreeTokenNode/               # EDITED — new reference path in the dispatch
│   ├── TreeGroupNode/               # EDITED — native <details>/<summary> disclosure
│   └── TokenTree/                   # EDITED — arrival focus + navigation guard
└── e2e/
    ├── fixtures/token-references/    # NEW — own dir + own webServer (port 3101), so the
    │                                 #   broken/circular fixtures cannot break the existing
    │                                 #   suites: cross-file, chain, broken, group-target,
    │                                 #   circular, unparseable, multi-mode
    └── token-references.spec.ts     # NEW
```

**Structure Decision**: Existing layout is unchanged. Every addition follows a convention already present — `token-core` owns DTCG value semantics, `lib/tokens/` owns app-side token plumbing, components live one-per-folder with co-located tests, e2e uses its own isolated fixture directory.

## Implementation sequencing

Ordered so each stage is independently verifiable, and so the highest-value slice lands first.

1. **`token-core` reference API** — syntax + chain walking + cycle detection, fully unit-tested with no app involvement. Pure functions, no I/O.
2. **Validation hoist (client + server together)** — smallest change that fixes the live false-error bug. Delivers visible value before any indexing exists, and must not be split across commits given the mirroring history.
3. **Directory load + index** — extract `loadTokenDirectory` from `scanTokenDirectory`, add the resolver-file reader, build the index and per-file view. Pure and directly unit-testable once loading is injected.
4. **User Story 1 — resolved value display** — wire the view through `plain-node`/`page.tsx` into the extracted `TokenReferenceValue`. Independently shippable.
5. **Token addressing + arrival** — fragment scheme, `TreeGroupNode` → native `<details>`/`<summary>` disclosure (reveal and scroll come from the browser), then focus/highlight for the part it does not cover.
6. **User Story 2 — navigation** — reference links, multi-definition picker, unsaved-edits guard.
7. **User Story 3 — reverse index UI** — `ReferencedByBadge` and its popover list.
8. **Fixtures + failure-path tests** — broken, group-target, circular, unparseable, cross-file. Can be written earlier; must be complete before done.

Stages 1–2 alone already fix a real bug; stages 1–4 deliver User Story 1 (the P1 MVP).

## Risks

| Risk | Mitigation |
| --- | --- |
| Client/server validation drift | Change both in one stage, with a paired test asserting they agree. Documented precedent of this exact failure in `docs/history.md`. |
| Cycle detection regressing into a hang | Cycle detection is the *only* thing bounding recursion. Fixture-backed test that must fail fast rather than hang the suite. |
| Per-request indexing slower than measured | 1.40 ms floor was measured without Zod. Re-measure once deps are installed; the decision holds across a wide range, and caching remains available (at the cost of invalidation-on-save). |
| `TreeTokenNode` exceeding the 300-line ceiling | Extraction is planned up front (stage 4), not deferred. |
| React re-asserting `open` and defeating native `<details>` expansion | The disclosure is uncontrolled — `open` is set in initial markup only, never as a changing prop. Regression test: collapse a group, edit a sibling token to force a `TokenTree` re-render, assert it stays collapsed (research.md §5). |
| Group name becoming unrenameable, or nested-interactive-content a11y failure | The name `Input` stays outside `<details>`; `<summary>` carries only the disclosure control and its accessible name. Needs a deliberate layout pass, flagged in research.md §5 as the non-trivial part of the refactor. |
| Multiply-defined paths surprising users | 75 of 490 paths affected; never silently resolved to one winner — the chooser shows file and mode. |

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

_No violations — table intentionally omitted._
