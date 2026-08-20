# Implementation Plan: TreeTokenNode Block Extraction & Label Redesign

**Branch**: `005-tree-token-node-block` | **Date**: 2026-08-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-tree-token-node-block/spec.md`

## Summary

`TreeTokenNode` currently duplicates the same row-chrome JSX (name label, type label, pin-less layout) across its valid and invalid rendering branches, using CSS that lives in the shared `TokenTree.module.css`. This feature extracts that shared chrome into one new, presentational ("dumb") `TokenBlock` component — a CUBE-CSS Block with its own CSS module — and uses it from both `TreeTokenNode` branches. Within that component: the token name becomes a single `<h2>` heading (not repeated per field), the type is shown as "Type:" plus a pill (the existing `Badge` component restyled/reused), each token gets a type-based icon (inline SVG, no new dependency) with a generic fallback, and each token gets its own left pin line with a visible gap between consecutive tokens. No editing/validation/staging logic moves — only the presentational layer.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, per Principle III), Node.js (repo-wide toolchain), React 19 (per `apps/web-app`'s existing dependency)

**Primary Dependencies**: React, Next.js (`apps/web-app`), existing `@dtcg-editor/design-system` `Badge` component, existing `@dtcg-editor/token-core` (`isDtcgTokenType`, `DTCG_TOKEN_TYPES`) — all already-approved dependencies; no new dependency is introduced (icons are hand-authored inline SVG, per Principle VIII's "built-ins before libraries" and the absence of any icon library in the constitution's approved-dependency list)

**Storage**: N/A — this is a purely presentational change; no data model, persistence, or API surface changes

**Testing**: Vitest + `@testing-library/react` for the new `TokenBlock` component's unit tests; Vitest Browser Mode + `axe-core` for its component-level accessibility test (per Principle X, every component needs both); existing `TokenTree` accessibility (`TokenTree.a11y.test.tsx`) and Playwright whole-page/keyboard suites re-run to catch regressions from the heading/pin-line/pill markup change

**Target Platform**: Web (Next.js app, `apps/web-app`), no platform-specific behavior

**Project Type**: Web application (existing monorepo: `apps/web-app` + `packages/*`) — this feature touches `apps/web-app/components/` and `packages/design-system/src/components/Badge` only

**Performance Goals**: N/A beyond "no regression" — this is a like-for-like presentational refactor of an already-rendered tree; no new data fetching, no new render-blocking work

**Constraints**: Must not change any token editing/validation/staging behavior (FR-015); must preserve existing conditional rendering (no type → no pill; non-standard type → visible indicator retained, FR-014); must not introduce a new runtime dependency for icons

**Scale/Scope**: Two files change ownership of logic (`TreeTokenNode.tsx`, `TokenTree.module.css`), one new component is added (`TokenBlock`), one existing component (`Badge`) gains pill-capable styling/variant. Token tree sizes are whatever a user's existing token file already contains — no new scale assumption introduced.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle X (Component Granularity & Testing)**: The new `TokenBlock` component gets its own folder (`apps/web-app/components/TokenBlock/`), PascalCase file matching its name, co-located `.module.css` and test files, unit test coverage, and accessibility test coverage — satisfies this principle directly rather than adding tech debt. `TreeTokenNode` itself stays under its existing structure; extracting `TokenBlock` out of it reduces (not increases) its responsibility surface. PASS.
- **Principle VIII (Minimal Dependencies)**: No new dependency proposed. Icons are inline SVG (a hand-authored, zero-dependency mapping), consistent with "built-ins are the default." PASS.
- **Principle I (DTCG Spec Compliance)**: Not implicated — no schema, format, or validation logic changes; `DTCG_TOKEN_TYPES` is read-only reference data for the icon mapping, not modified. PASS.
- **Principle IV/V/VI (Validation at the Edges / Result Pattern / DI for I/O)**: Not implicated — `TokenBlock` has no I/O, no fallible operations, no validation logic; it is purely presentational, receiving already-validated data as props. PASS.
- **Principle IX (Round-Trip Fidelity)**: Not implicated — no parse/serialize logic touched. PASS.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/005-tree-token-node-block/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature exposes no external API, CLI, or service interface — it is an internal React component restructuring within an existing web app page. Per the Phase 1 instructions ("skip if project is purely internal"), contracts are skipped.

### Source Code (repository root)

```text
apps/web-app/components/
├── TreeTokenNode/
│   ├── TreeTokenNode.tsx            # unchanged responsibilities, delegates row chrome to TokenBlock
│   └── TreeTokenNode.test.tsx       # existing tests updated for new label text ("Name" not "{name} name", etc.)
├── TreeGroupNode/
│   └── TreeGroupNode.tsx            # unchanged (pin-line visual reference only, not itself modified)
├── TokenTree/
│   ├── TokenTree.tsx                # unchanged
│   └── TokenTree.module.css         # token-row-specific rules removed; tree/group-owned rules remain
└── TokenBlock/                      # NEW — the extracted CUBE-CSS Block
    ├── TokenBlock.tsx               # dumb presentational component: heading, type pill, icon, pin line, slot for editor/value content
    ├── TokenBlock.module.css        # styles moved from TokenTree.module.css + new pin-line/pill/icon layout rules
    ├── TokenBlock.test.tsx          # unit tests (rendering, prop variations)
    └── TokenBlock.a11y.test.tsx     # Vitest Browser Mode + axe-core test

packages/design-system/src/components/Badge/
├── Badge.tsx                        # unchanged API; either used as-is (already pill-shaped, see research.md) or gains a documented variant
└── Badge.css                        # unchanged, or extended with a variant class — not replaced
```

**Structure Decision**: Existing monorepo layout is unchanged. This feature adds exactly one new component folder (`apps/web-app/components/TokenBlock/`), matching Principle X's folder-per-component convention, and edits three existing files (`TreeTokenNode.tsx`, `TokenTree.module.css`, and possibly `Badge.css`) in place. No new package, no new top-level directory.

## Complexity Tracking

_No Constitution Check violations — table not applicable._
