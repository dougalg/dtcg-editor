# Implementation Plan: Token-Core Parsing Consolidation & Token-Editor Rename

**Branch**: `worktree-token-core-refactor` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-token-core-refactor/spec.md`

## Summary

Move every DTCG token type's value schema, conversion, and validation logic (`ColorValueSchema`, `checkColorValueIssues`, `colorValueToCssColor`, color-space `conversion.ts`, `DimensionValueSchema`) out of `token-type-color`/`token-type-dimension` and into `token-core`, which becomes the single source of truth for parsing across all token types (not just the generic node/group document shape it already owned). The three `token-type-*` packages are renamed `token-editor-*` and reduced to holding only their `Editor` component, styling, editor-specific config schemas, and `TokenTypeContract` wiring. All call sites across the monorepo — most notably `apps/web-app` — are repointed to the new package names and import locations, with zero intended change to parsing, validation, or editor behavior. This enacts constitution v2.0.1 (Principles II, III, VII, amended specifically to unblock this feature).

## Technical Context

**Language/Version**: TypeScript 5.9.3 (all packages), strict mode per root `tsconfig.base.json`

**Primary Dependencies**: Zod 4.4.3 (value schemas), neverthrow 8.2.0 (Result-pattern errors), `colorjs.io` 0.7.1 (color-space conversion — moves from `token-type-color`/`token-editor-color` to `token-core`, via the `colorjs.io/fn` tree-shakable entry point), React 19.2.8 (stays only in the renamed `token-editor-*` packages and `apps/web-app`)

**Storage**: N/A — no persistence layer touched by this refactor

**Testing**: Node's built-in test runner (`node:test` + `node:assert/strict`) for `packages/*`; Vitest + `@testing-library/react` (`jsdom`) for `apps/web-app`; existing Vitest Browser Mode (`axe-core`) and Playwright accessibility suites for `apps/web-app`

**Target Platform**: Cross-platform Node.js library packages (`packages/*`) consumed by a Next.js web app (`apps/web-app`); no platform-specific behavior introduced

**Project Type**: pnpm workspace monorepo (Turborepo build orchestration) — internal package-boundary refactor, not a new feature surface

**Performance Goals**: N/A — pure reorganization, no runtime behavior or performance characteristic is intended to change (Success Criteria SC-003/SC-004 gate on zero regressions, not on any new performance target)

**Constraints**: `token-core` MUST remain free of any React import and any dependency on a `token-editor-*` package (Principle VII); dependency direction is one-way (`token-editor-*` → `token-core` only)

**Scale/Scope**: 4 packages touched directly (`token-core`, and the 3 renamed `token-type-color`/`token-type-dimension`/`token-type-contract` → `token-editor-color`/`token-editor-dimension`/`token-editor-contract`); ~10 call sites in `apps/web-app` importing from these packages today (per `grep` inventory below); 1 stale architectural comment/test in `token-core/src/color-sample.test.ts` to update

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Evaluated against constitution v2.0.1 (`.specify/memory/constitution.md`):

| Principle | Status | Notes |
| --- | --- | --- |
| I. DTCG Spec Compliance | PASS | No DTCG format/validation *behavior* changes — only which package defines the same, unchanged Zod schemas. |
| II. Feature-Based Code Organization | PASS | This refactor is the direct enactment of the redefined principle: `token-core` centralizes parsing per type; `token-editor-*` owns editor UI as its own cohesive unit. |
| III. TypeScript Strictness | PASS | Moved code keeps `tsconfig.base.json`'s strict settings unchanged; no per-package relaxation introduced by the move. |
| IV. Validation at the Edges | PASS | No new validation edge introduced or removed — the same Zod schemas validate at the same edges (file parse, `editorOptions` config), just relocated. |
| V. Result-Pattern Error Handling | PASS | Existing `Result`/`neverthrow`-based error handling in moved code (e.g. `checkColorValueIssues`) is carried over unchanged, not rewritten. |
| VI. Dependency Injection for I/O and Platform Externalities | N/A | No I/O/platform externality is touched by this refactor. |
| VII. Token-Editor Package Contract | PASS | This refactor is the direct enactment of the redefined principle, including the explicit one-way dependency rule. |
| VIII. Minimal Dependencies | PASS | No new third-party dependency is introduced; `colorjs.io` moves with the code that uses it (FR-008), it isn't newly added. |
| IX. Round-Trip Fidelity | PASS | `token-core`'s parse/serialize round-trip tests are unaffected in behavior; they must simply continue passing post-move (verified in quickstart.md). |

No violations. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: Design (`data-model.md`, `contracts/*.md`) surfaced that `color.ts`/`color.test.ts` must be *split* rather than moved wholesale (editor-config code — `ColorEditorOptions`, `ColorEditorOptionsSchema`, `defineColorConfig` — is colocated with value-parsing code in the current file, discovered by reading the actual file rather than assuming from its name). This refines the plan but does not change the Constitution Check outcome above: the split is exactly what Principle VII already requires (parsing in `token-core`, editor config with the Editor) — all 9 principles remain PASS/N/A, no new violation, no Complexity Tracking entry needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-token-core-refactor/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── token-core.md
│   ├── token-editor-color.md
│   ├── token-editor-dimension.md
│   └── token-editor-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/
├── token-core/
│   └── src/
│       ├── parse.ts, serialize.ts, schema.ts, resolve-type.ts,
│       │   token-types.ts, types.ts, edit.ts        # unchanged, pre-existing
│       ├── color.ts                                  # NEW: value-schema/validation exports SPLIT from token-type-color's color.ts
│       ├── conversion.ts                              # MOVED wholesale from token-type-color
│       ├── css-color.ts                                # MOVED wholesale from token-type-color
│       ├── dimension.ts                                 # MOVED wholesale from token-type-dimension
│       ├── color.test.ts                                # NEW: value-schema tests SPLIT from token-type-color's color.test.ts
│       ├── conversion.test.ts, css-color.test.ts,
│       │   dimension.test.ts                             # MOVED wholesale alongside their code
│       ├── color-sample.test.ts                        # UPDATED (stale dependency-direction comment)
│       └── index.ts                                      # UPDATED exports
│
├── token-editor-color/            # RENAMED from token-type-color
│   └── src/
│       ├── editor.tsx, editor.module.css, css-modules.d.ts   # unchanged
│       ├── token-type.ts                                      # UPDATED: colorTokenType imports schema from token-core; GAINS ColorEditorOptions/ColorEditorOptionsSchema/defineColorConfig split out of the old color.ts
│       ├── token-type.test.ts                                  # NEW: editor-config tests SPLIT from token-type-color's color.test.ts
│       └── index.ts                                            # UPDATED exports (editor + contract + editor-config only)
│
├── token-editor-dimension/        # RENAMED from token-type-dimension
│   └── src/
│       ├── editor.tsx                                          # unchanged
│       ├── token-type.ts                                       # UPDATED: imports schema from token-core
│       └── index.ts                                             # UPDATED exports
│
└── token-editor-contract/         # RENAMED from token-type-contract (content unchanged)
    └── src/
        ├── contract.ts, contract.test.ts
        └── index.ts

apps/web-app/
├── package.json                                        # UPDATED: dependency names token-type-* → token-editor-*
├── app/api/tokens/[...path]/route.ts                    # UPDATED: import from token-editor-contract
├── components/TokenTree.tsx                             # UPDATED: imports from token-editor-color/dimension
├── components/FallbackValueEditor.tsx                   # UPDATED: import from token-editor-contract
├── lib/tokens/color-display.ts                          # UPDATED: parsing imports move to token-core
├── lib/tokens/edit-state.ts                              # UPDATED: import from token-editor-dimension
└── lib/token-editors/
    ├── types.ts, built-in.ts                             # UPDATED: imports from token-core + token-editor-*
    ├── built-in.test.ts, built-in.a11y.test.tsx           # UPDATED: imports from token-editor-*
    └── color-editor.test.tsx                              # UPDATED: type import from token-core, Editor from token-editor-color
```

**Structure Decision**: This is a pnpm workspace monorepo (Turborepo build orchestration); none of the template's generic single-project/web-app/mobile options apply directly. The structure above reflects the actual `packages/*` and `apps/web-app` directories being moved, renamed, or updated in place — no new top-level directories are introduced. Tests stay co-located with the code they test per Principle II, moving alongside their source files rather than into a separate `tests/` tree.
