# Implementation Plan: Edit Token References

**Branch**: `009-edit-token-references` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-edit-token-references/spec.md`

## Summary

Let a user repoint a whole-value reference token from inside the editor: a
keyboard-operable combobox popover, opened from an edit trigger that replaces
today's read-only reference text, searches every token path in the loaded
directory, previews what each candidate resolves to and what the edited token
*would* resolve to, flags self / circular / missing / group targets, and stages
an ordinary pending edit that the existing Save flow persists.

Three facts from the codebase shape the whole design:

1. **Persistence already works.** `app/api/tokens/[...path]/route.ts` already
   detects a reference `$value` on a PATCH edit and writes it through verbatim,
   bypassing per-type `valueSchema`/`serializeValue` (route.ts:207-215, added by
   feature 007). Staging `{ value: "{new.path}" }` as a `ClientEdit` and saving
   it needs **zero server-side change** to the write path. The feature is a
   client picker plus a read-only catalogue endpoint.

2. **Resolution already exists and is React-free.** `token-core`'s
   `resolveReference` returns all four outcome kinds this feature must surface
   (`resolved` / `unresolved` / `group-target` / `circular`) and is already
   imported into client components (`TreeTokenNode` uses `parseReference`). The
   per-mode / multiply-defined / chain machinery in
   `lib/tokens/reference-index.ts` (feature 007) is reused as-is server-side; the
   "what would the edited token resolve to" preview reuses `resolveReference`
   client-side against a lookup rebuilt from the catalogue. Whether repointing to
   a candidate would **close a cycle** (FR-014/FR-024 — the one diagnostic that
   *blocks* selection) is derived per candidate from the chain `steps` already in
   the catalogue payload, without a per-candidate resolve (research §4a). **No
   new resolution semantics, and `token-core` is not modified.**

3. **The whole-directory index is the expensive part, and it's already built.**
   `buildReferenceIndex` over this project's own set (16 files, 565 tokens) costs
   2-7 ms median (feature 007 research). The catalogue endpoint runs that same
   pipeline (`loadTokenDirectory` → `loadResolverModes` → `buildReferenceIndex`)
   and serialises a candidate list + per-path definitions. Built server-side,
   fetched by the client on first picker activation, cached for the session
   (spec FR-023, clarified 2026-09-01).

The design-system has **no working combobox**: `components/Command/Command.tsx`
and `components/Combobox/Combobox.tsx` are unbuilt stubs importing a
non-existent `@/registry/*` alias, and `Combobox.tsx` only exports a demo with
hardcoded data. Because `cmdk` is an Approved Dependency for
`packages/design-system` **only** (constitution, Principle VIII), the searchable
list primitive must live there, not in `apps/web-app`. This feature repairs
`Command` into a real cmdk-backed component and adds a generic `Combobox`
alongside it (both already have a co-located `.css`), then composes the
token-specific picker in `apps/web-app`. This absorbed scope is called out in
Constraints below, the same way feature 007 absorbed the `TreeGroupNode`
disclosure refactor.

## Technical Context

**Language/Version**: TypeScript, strict per root `tsconfig.base.json` (no
per-package relaxation).

**Primary Dependencies**: React 19 / Next.js 16 App Router (`apps/web-app`);
`@dtcg-editor/token-core` (`parseReference`, `resolveReference`,
`ReferenceLookup`, `ResolutionChain` — consumed, not changed); `zod`,
`neverthrow`; `packages/design-system` — `Popover` (real), `Command` (repaired
this feature), `Combobox` (built this feature), backed by `@radix-ui/react-popover`
+ `cmdk`, both already present. **No new dependency in any package.**

**Storage**: None. Token files are read; the only write is the existing
reference-value PATCH. The catalogue is rebuilt per request, never cached
server-side (mirrors feature 007's index — no staleness against a just-saved
file).

**Testing**: `node:test` for any non-JSX `packages/*` change (none expected);
Vitest + `@testing-library/react` (jsdom) for `apps/web-app` and
`packages/design-system` components; Vitest Browser Mode + `axe-core` for
component-level WCAG 2.2 AA; `@playwright/test` for the whole-page keyboard flow.
New e2e fixtures reuse the existing `token-references` fixture directory + server
(`TOKEN_REFERENCES_PORT = 3101`, see `playwright.config.ts`) — it already
contains cross-file, chained, broken, circular, group-target and multi-mode
tokens, which is exactly this feature's candidate/preview matrix.

**Target Platform**: Web (Next.js App Router), modern evergreen browsers.

**Project Type**: Web application in an existing pnpm/Turborepo monorepo
(`apps/web-app` + `packages/*`).

**Performance Goals** (spec SC-004, clarified 2026-09-01): keystroke-to-updated-
list under **50 ms p95** for a 1,000-path candidate set, with **no single
main-thread task over 50 ms** (the Long Task threshold) attributable to typing.
Asserted by a benchmark over a synthetic 1,000-path catalogue plus a Playwright
Long-Tasks check, consistent with `e2e/editing-perf.spec.ts` and
`e2e/color-editor-perf.spec.ts`. Catalogue *build* reuses feature 007's budget
(under 50 ms for 5,000 tokens; measured 14-26 ms).

**Constraints**:

- **Client/server value handling must not diverge.** `docs/history.md`
  (2026-08-02) records a client/server validation split in this exact edit path
  causing both a client crash and an unvalidated-write hole. The reference-value
  branch is already mirrored (`TreeTokenNode` path 1 ↔ route.ts:207); this
  feature must not add a client-only guard that the server doesn't also apply, or
  vice-versa. The picker only ever stages a `{a.b.c}` alias string — the same
  shape both sides already handle.
- **`TreeTokenNode.tsx` is 324 lines, over Principle X's 300-line ceiling.** The
  reference branch (path 1, lines 117-154) must be *extracted* into its own
  component, not extended inline. This also net-reduces `TreeTokenNode`.
- **Absorbed scope: repair `design-system`'s `Command`, add `Combobox`.** The
  stubs can't be imported today; `cmdk` can't move to `apps/web-app` without a
  dependency flag. Both get full unit + a11y tests as Principle X requires for
  any component. Kept minimal — a generic filtered-listbox-in-popover, no
  token-specific knowledge.
- **cmdk's default scoring is fuzzy; FR-004 mandates substring + match-position
  order.** The `Combobox` must run with cmdk filtering disabled
  (`shouldFilter={false}`) and apply this feature's own deterministic
  substring/position/alphabetical sort, so the ordering is testable.
- **Block circular, warn on the rest (FR-016, FR-024).** A candidate that would
  make the edited token part of a cycle — including its own path (a one-hop
  self-cycle), no separate "self-reference" concept — is rendered with a
  distinct icon + "circular-reference" label and a **disabled** `CommandItem`:
  not reachable by keyboard or pointer, selecting it stages nothing and leaves
  the popover open (FR-024, SC-008). A *missing* or *group* target is only
  flagged in the preview and stays selectable, matching the editor's existing
  graceful-degradation stance. Circular is all-or-nothing across modes — a
  candidate circular under any mode is disabled outright.
- **Round-trip fidelity (Principle IX).** Saving a repoint changes only that
  token's `$value` string; `serialize.ts` passes `$value` through verbatim. A
  parse→serialize round-trip test asserts no other diff (spec SC-007).

**Scale/Scope**: This project's own token set — 16 files, 565 tokens, ~490
distinct paths, 228 references (191 cross-file, 47 chained), 75 multiply-defined
paths. The 1,000-path perf target is ~2× today's scale, constraining growth.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle | Status | Notes |
| --- | --- | --- |
| I. DTCG Spec Compliance | Pass | Only ever writes a spec-valid `{group.token}` alias string. A *missing* or *group* target may still be saved — the editor already tolerates broken references rather than making them impossible (a deliberate, spec-compatible graceful-degradation choice from feature 007). A *circular* target (including a self-reference) can **not** be saved through this control (FR-024, SC-008) — the picker refuses it — which is strictly more conservative than the spec requires. No new deviation, nothing to flag. |
| II. Feature-Based Code Organization | Pass | Catalogue plumbing lives in `lib/tokens/` beside `reference-index.ts`; the picker and the extracted reference-value view each get their own folder with co-located tests/styles; `Command`/`Combobox` stay in `packages/design-system/src/components/*`. |
| III. TypeScript Strictness | Pass | Catalogue wire type is a Zod-inferred type; outcome kinds are a discriminated union narrowed at use. No `any`. |
| IV. Validation at the Edges | Pass | The catalogue endpoint's *response* is app-internal (same-codebase producer/consumer, like the PATCH `SaveError` body) so it's typed, not re-validated field-by-field. The endpoint's own inputs (token files, `tokens.resolver.json`) are already Zod-validated by `loadTokenDirectory`/`loadResolverModes`. The PATCH request body stays validated by the existing `EditRequestSchema`. |
| V. Result-Pattern Error Handling | Pass | Catalogue build returns `ResultAsync`; the route maps `Err` to a non-2xx `SaveError`-shaped body. "Catalogue unavailable" and each broken-target kind are **display outcomes, not errors** (same call feature 007 made) — a status enum + discriminated union in the hook, not thrown. |
| VI. Dependency Injection for I/O | Pass | The catalogue endpoint reuses `loadTokenDirectory`/`loadResolverModes`, which already take injected fs fns with real defaults. The client fetch hook takes an injected `fetch` (matches `useSaveTokenEdits`). |
| VII. Token-Editor Package Contract | Pass | `token-core` is **not modified** — `resolveReference` already covers every case. No `TokenTypeContract` change: a reference is valid for every `$type`, so the picker sits above per-type editors, exactly where feature 007 put the reference *view*. Dependency direction unchanged. |
| VIII. Minimal Dependencies | Pass | Nothing added anywhere. `cmdk` + `@radix-ui/react-popover` already in `design-system`; repairing the `Command` stub is why the searchable list stays in that package rather than pulling `cmdk` into `apps/web-app` (which *would* need a flag). |
| IX. Round-Trip Fidelity | Pass | Repoint writes only the `$value` alias string; `serialize.ts` passes it through verbatim. Round-trip regression test per spec SC-007. |
| X. Component Granularity & Testing | Pass, with care | `TreeTokenNode.tsx` (324/300) has its reference branch extracted, net-reducing it. Every new/repaired component — `Command`, `Combobox`, `ReferenceEditControl`, `TokenReferencePicker`, `CandidatePreview` — gets its own PascalCase folder with unit **and** `axe-core` a11y tests, including a11y coverage of the disabled circular `CommandItem` (announced as unavailable, not silently skipped). The combobox is a plausible 3rd "searchable list" instance (with `Select`, `DropdownMenu`) → deliberately consolidated into `design-system` per the reuse rule, not hand-rolled in the app. |
| XI. Modern Defaults | Pass | ESM throughout; native `AbortController` for the catalogue fetch; no legacy pattern. |
| XII. Design System Usage | Pass | All picker chrome (trigger, popover, list, input, empty state) comes from `design-system` components and `--dtcg-ed-*` tokens. The repaired `Command`/`Combobox` themselves must be audited to `DESIGN.md` (no hardcoded values in their `.css`). Candidate value previews reuse each type's built-in `Preview` (e.g. the colour swatch) via `resolveBuiltInContract`, exactly as `TokenReferenceValue` already does. |

**No violations — Complexity Tracking is intentionally empty.**

## Project Structure

### Documentation (this feature)

```text
specs/009-edit-token-references/
├── plan.md              # This file
├── spec.md              # Feature specification (clarified 2026-09-01)
├── research.md          # Phase 0 — decisions + rationale
├── data-model.md        # Phase 1 — entities
├── quickstart.md        # Phase 1 — validation guide
├── contracts/           # Phase 1
│   ├── candidate-catalogue-api.md       # GET endpoint request/response shape
│   ├── reference-picker-ui.md           # picker component contract + a11y
│   └── hypothetical-resolution.md       # "what would the edited token resolve to"
├── checklists/
│   └── requirements.md   # already passing 16/16
└── tasks.md             # Phase 2 — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
packages/design-system/src/components/
├── Command/
│   ├── Command.tsx                 # REPAIRED — real cmdk imports, drop @/registry/* alias
│   ├── Command.css                 # EDITED — audit to --dtcg-ed-* per DESIGN.md
│   ├── Command.test.tsx            # NEW
│   └── Command.a11y.test.tsx       # NEW
└── Combobox/
    ├── Combobox.tsx                # REPLACED — generic controlled combobox (Popover+Command),
    │                               #   shouldFilter=false, caller supplies filtered+sorted items
    ├── Combobox.css                # NEW
    ├── Combobox.test.tsx           # NEW
    └── Combobox.a11y.test.tsx      # NEW

apps/web-app/
├── lib/tokens/
│   ├── reference-catalogue.ts          # NEW — buildReferenceCatalogue(index): pure, from feature 007's ReferenceIndex
│   ├── reference-catalogue.test.ts     # NEW
│   ├── reference-catalogue-wire.ts     # NEW — Zod schema + type for the API response
│   ├── candidate-filter.ts             # NEW — substring match + position/alpha ordering (FR-004), empty-query banding (FR-020)
│   ├── candidate-filter.test.ts        # NEW
│   ├── candidate-selectability.ts      # NEW — isCircularIfSelected(editedPath, candidate): self OR editedPath in any preview chain step (FR-024). Cheap, no resolve; runs for every listed candidate
│   ├── candidate-selectability.test.ts # NEW
│   ├── hypothetical-resolution.ts      # NEW — resolveIfRepointed(editedPath, candidatePath, catalogue) -> ResolutionChain per mode. Full resolve; runs for the HIGHLIGHTED candidate only (FR-012, cycle naming for FR-014)
│   └── hypothetical-resolution.test.ts # NEW
├── app/api/tokens/references/route.ts  # NEW — GET: build catalogue for the configured dir, return wire shape
├── app/api/tokens/references/route.test.ts  # NEW
├── hooks/
│   ├── useReferenceCatalogue.ts        # NEW — fetch-once-per-session + cache + status enum, injected fetch
│   └── useReferenceCatalogue.test.ts   # NEW
├── components/
│   ├── ReferenceEditControl/           # NEW — extracted from TreeTokenNode path 1: reference text + edit trigger
│   ├── TokenReferencePicker/           # NEW — the Combobox instance: search, candidate rows, staged-target indication
│   ├── CandidatePreview/               # NEW — per-candidate resolved value(s) + edited-token preview + diagnostics
│   ├── TreeTokenNode/                  # EDITED — path 1 delegates to ReferenceEditControl; net line reduction
│   └── TokenTree/                      # EDITED (if needed) — pass an onStageEdit path already exists; verify guard covers popover
└── e2e/
    ├── fixtures/token-references/      # REUSED — already has the full broken/chain/multi-mode matrix
    └── edit-token-references.spec.ts   # NEW — keyboard-only open→search→preview→pick→save; WCAG scan
```

**Structure Decision**: Existing layout unchanged. `token-core` untouched.
Every addition follows a convention already present — `lib/tokens/` owns app-side
token plumbing, `app/api/tokens/**` owns the read/write endpoints, components are
one-per-folder with co-located tests, e2e reuses the isolated `token-references`
fixture server. The only cross-package edit is repairing the two `design-system`
combobox stubs, which are unimportable in their current state.

## Implementation sequencing

1. **`design-system` `Command` repair + `Combobox`** — unblocks the picker UI;
   independently testable and mergeable.
2. **`reference-catalogue.ts` + wire schema + `GET /api/tokens/references`** —
   pure transform over feature 007's `ReferenceIndex`, then the thin route.
3. **`candidate-filter.ts` + `candidate-selectability.ts` +
   `hypothetical-resolution.ts`** — pure, table-driven unit tests against the
   fixture matrix; no UI. `candidate-selectability` gates the disabled state
   (FR-024); `hypothetical-resolution` feeds the highlighted preview (FR-012).
4. **`useReferenceCatalogue.ts`** — fetch/cache/status hook.
5. **`CandidatePreview` → `TokenReferencePicker` → `ReferenceEditControl`** —
   compose UI bottom-up, each with unit + a11y tests.
6. **Wire into `TreeTokenNode` path 1**; verify the unsaved-changes guard and
   discard path (FR-008) still hold with the popover mounted.
7. **e2e**: keyboard-only full flow + `axe` scan on the open popover (SC-006).

## Complexity Tracking

> No Constitution Check violations — this section is intentionally empty.
