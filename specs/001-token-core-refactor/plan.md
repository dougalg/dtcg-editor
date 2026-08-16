# Implementation Plan: Token-Core Parsing Consolidation & Token-Editor Rename

**Branch**: `worktree-token-core-refactor` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-token-core-refactor/spec.md`

**Revision note (2026-08-16, re-planned after 002-simplify-tree-node landed)**: 002-simplify-tree-node has since been implemented and merged. It already retrofitted `token-type-color`/`token-type-dimension` to a `components/` + `configuration.ts` structure, deleted `apps/web-app/lib/tokens/color-display.ts` (its logic moved into `token-type-color/src/components/{editor.tsx,validation-error-handler.tsx}`), and made `apps/web-app`'s tree components (`TreeNode.tsx`/`TreeTokenNode.tsx`/`TreeGroupNode.tsx`/`TokenTree.tsx`) fully generic — none of them import `token-type-color`/`token-type-dimension` directly any more. This plan is rewritten against that current codebase rather than the pre-002 layout the original plan assumed; the feature's scope (FR-001–FR-010) is unchanged, but the concrete file inventory below is not.

**Revision note (2026-08-16, validation-scope clarification)**: `/speckit-clarify` drew a line between two kinds of color validation that `color.ts` previously lumped together: **structural validation** (`ColorValueSchema`/`ColorObjectValueSchema`/`LegacyHexColorValueSchema` — does the raw value parse into a `ColorValue` shape at all) moves to `token-core` per FR-001; **data/range validation** (`checkColorValueIssues`/`COMPONENT_RANGES` — a structurally-valid value with an out-of-range component, user-recoverable in the editor UI) stays in `token-editor-color` per FR-003. This plan and its Phase 0/1 artifacts are updated accordingly: `color.ts` now splits (not moves wholesale) between the two packages.

**Revision note (2026-08-16, conversion/utility scope narrowed + editor-package folder cleanup)**: A follow-up discussion narrowed `token-core`'s scope further and added a file-organization requirement, both folded into `spec.md` (FR-001/FR-003/FR-011): `conversion.ts` (native `<input type="color">` interop) and `css-color.ts` (CSS rendering) also stay in `token-editor-color` — they're editor-presentation/interop concerns, not DTCG-compliance parsing, and no headless consumer needs them. `token-core`'s move is now `color.ts`'s structural half only (plus `dimension.ts` wholesale, which was always pure structural schema). `colorjs.io` therefore never moves — it stays in `token-editor-color`, the only consumer of it. Separately, `token-editor-color`'s remaining non-component modules (the trimmed range-check module — renamed `color.ts` → `range-validation.ts` — plus `conversion.ts` and `css-color.ts`) are grouped under a new `utils/` subfolder rather than left flat at `src/` root (FR-011), so the package's structure (UI/config/wiring/utilities) is legible at a glance. `token-core`'s own broader internal layout is explicitly out of scope here — the user will respecify it separately.

## Summary

Move every DTCG token type's value schema, its derived type definitions, and structural-validation logic (`ColorValueSchema`, `DimensionValueSchema`) out of `token-type-color`/`token-type-dimension` and into `token-core`, which becomes the single source of truth for DTCG-compliance parsing across all token types (not just the generic node/group document shape it already owned). Everything else that operates on a value but isn't structural parsing — data/range validation (`checkColorValueIssues`/`COMPONENT_RANGES`), native-widget conversion (`conversion.ts`), and CSS rendering (`css-color.ts`) — stays behind in `token-editor-color`, grouped under a new `utils/` subfolder, since none of it is needed by a headless DTCG consumer and all of it is either user-recoverable Editor behavior or Editor-only presentation/interop. The three `token-type-*` packages are renamed `token-editor-*` and reduced to holding only their `Editor` UI (already organized under `components/` per 002-simplify-tree-node), editor-specific configuration (already organized in `configuration.ts` per 002-simplify-tree-node), their `utils/`-grouped value-adjacent utilities, and `TokenTypeContract` wiring (`token-type.ts`, including the `ValidationErrorHandler` member 002 added). All call sites across the monorepo are repointed to the new package names and import locations, with zero intended change to parsing, validation, conversion, or editor behavior. This enacts constitution v2.0.1+ (Principles II, VII).

Because 002 already did the "split editor config out of the value-schema module" work (`configuration.ts` already exists and already imports `COLOR_SPACES`/`ColorSpace` from `color.ts`), this plan's remaining split inside `color.ts` is two-way: its structural exports (`COLOR_SPACES`, `ColorSpace`, `ColorComponent`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`, `ColorValueSchema`, `ColorValue`, `ColorObjectValue`) move to `token-core/src/color.ts`; its range-check exports (`COMPONENT_RANGES`, `checkColorValueIssues`, and their private `ComponentRange`/`ComponentRanges`/`isWithinRange`/`UNIT_RGB_RANGES`/`UNIT_XYZ_RANGES` helpers) move (not stay in place — see folder cleanup below) into `token-editor-color/src/utils/range-validation.ts`, repointed to import `ColorSpace`/`ColorValue`/`ColorComponent` from `@dtcg-editor/token-core` instead of defining them locally. `conversion.ts`/`css-color.ts` likewise move unchanged into `token-editor-color/src/utils/`. `configuration.ts` (stays at `src/` root, not `utils/` — it's editor config, not a value-adjacent utility) is repointed the same way, to import `COLOR_SPACES`/`ColorSpace` from `token-core`. No new file-splitting decision is needed for editor config — that boundary already exists.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (all packages), strict mode per root `tsconfig.base.json`

**Primary Dependencies**: Zod 4.4.3 (value schemas), neverthrow 8.2.0 (Result-pattern errors), `colorjs.io` 0.7.1 (color-space conversion for the native `<input type="color">` widget — stays in `token-editor-color`'s `utils/conversion.ts`, its only consumer; does NOT move to `token-core`, since it's editor-interop, not structural parsing), React 19.2.8 (stays only in the renamed `token-editor-*` packages and `apps/web-app`)

**Storage**: N/A — no persistence layer touched by this refactor

**Testing**: Node's built-in test runner (`node:test` + `node:assert/strict`) for `packages/*`; Vitest + `@testing-library/react` (`jsdom`) for `apps/web-app`; existing Vitest Browser Mode (`axe-core`) and Playwright accessibility suites for `apps/web-app`

**Target Platform**: Cross-platform Node.js library packages (`packages/*`) consumed by a Next.js web app (`apps/web-app`); no platform-specific behavior introduced

**Project Type**: pnpm workspace monorepo (Turborepo build orchestration) — internal package-boundary refactor, not a new feature surface

**Performance Goals**: N/A — pure reorganization, no runtime behavior or performance characteristic is intended to change (Success Criteria SC-003/SC-004 gate on zero regressions, not on any new performance target)

**Constraints**: `token-core` MUST remain free of any React import and any dependency on a `token-editor-*` package (Principle VII); dependency direction is one-way (`token-editor-*` → `token-core` only)

**Scale/Scope**: 4 packages touched directly (`token-core`, and the 3 renamed `token-type-color`/`token-type-dimension`/`token-type-contract` → `token-editor-color`/`token-editor-dimension`/`token-editor-contract`); 6 current call sites in `apps/web-app` importing from `@dtcg-editor/token-type-contract` (`app/api/tokens/[...path]/route.ts`, `components/DefaultValidationErrorHandler.tsx`, `components/TreeTokenNode.tsx`, `components/FallbackValueEditor.tsx`, `lib/token-editors/types.ts`) plus `lib/token-editors/built-in.ts` (the only file importing `colorTokenType`/`dimensionTokenType` directly — verified by `grep`, see research.md); 1 stale architectural comment in `token-core/src/color-sample.test.ts` to update

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Evaluated against the current constitution (`.specify/memory/constitution.md`, v2.2.0 — already amended to describe the `token-editor-*` naming/structure this spec implements, ahead of the code):

| Principle | Status | Notes |
| --- | --- | --- |
| I. DTCG Spec Compliance | PASS | No DTCG format/validation *behavior* changes — only which package defines the same, unchanged Zod schemas. |
| II. Feature-Based Code Organization | PASS | This refactor is the direct enactment of the redefined principle: `token-core` centralizes parsing per type; each `token-editor-*` package owns editor UI as its own cohesive unit. 002-simplify-tree-node already delivered the `components/`-per-package half of this; this plan delivers the `token-core`-centralization half. |
| III. TypeScript Strictness | PASS | Moved code keeps `tsconfig.base.json`'s strict settings unchanged; no per-package relaxation introduced by the move. |
| IV. Validation at the Edges | PASS | No new validation edge introduced or removed — the same Zod schemas validate at the same edges (file parse, `editorOptions` config), just relocated. |
| V. Result-Pattern Error Handling | PASS | Existing `Result`/`neverthrow`-based error handling in `TokenTypeContract`'s `validateTokenValue`/`TokenTypeValidationError` (extended by 002) is carried over unchanged, not rewritten; `checkColorValueIssues` itself stays in `token-editor-color`, unmoved and unchanged. |
| VI. Dependency Injection for I/O and Platform Externalities | N/A | No I/O/platform externality is touched by this refactor. |
| VII. Token-Editor Package Contract | PASS | This refactor is the direct enactment of the redefined principle, including the explicit one-way dependency rule; 002 already added the optional `ValidationErrorHandler` member as part of this same pluggable contract, unaffected by this plan's parsing move. |
| VIII. Minimal Dependencies | PASS | No new third-party dependency is introduced; `colorjs.io` stays put in `token-editor-color` (its only consumer, `conversion.ts`, doesn't move — see FR-008's note), so this refactor doesn't even relocate it. |
| IX. Round-Trip Fidelity | PASS | `token-core`'s parse/serialize round-trip tests are unaffected in behavior; they must simply continue passing post-move (verified in quickstart.md). |

No violations. Complexity Tracking is not needed.

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

Current state (post-002-simplify-tree-node) shown as the starting point; `NEW`/`MOVED`/`UPDATED`/`DELETED` describe what this plan still needs to do.

```text
packages/
├── token-core/
│   └── src/
│       ├── parse.ts, serialize.ts, schema.ts, resolve-type.ts,
│       │   token-types.ts, types.ts, edit.ts        # unchanged, pre-existing — internal layout untouched (respecified separately, per user)
│       ├── color.ts                                  # NEW: structural exports MOVED from token-type-color's color.ts
│       │                                              #   (COLOR_SPACES, ColorSpace, ColorComponent, ColorObjectValue,
│       │                                              #   ColorObjectValueSchema, LegacyHexColorValueSchema, ColorValueSchema, ColorValue)
│       │                                              #   NOTE: COMPONENT_RANGES/checkColorValueIssues, conversion.ts, css-color.ts
│       │                                              #   do NOT move — they stay in token-editor-color/src/utils/ (see below)
│       ├── dimension.ts                                 # MOVED wholesale from token-type-dimension (DimensionValueSchema, DimensionValue)
│       ├── color.test.ts                                 # NEW: tests for the MOVED structural exports only
│       │                                                  #   (range-check/conversion/css-color tests stay behind, see token-editor-color below)
│       ├── dimension.test.ts                              # MOVED wholesale alongside its code
│       ├── color-sample.test.ts                        # UPDATED (stale "must not depend on token-type-color" comment)
│       └── index.ts                                      # UPDATED: exports the 2 new modules above
│
├── token-editor-color/            # RENAMED from token-type-color
│   └── src/
│       ├── components/editor.tsx, editor.module.css,
│       │   validation-error-handler.tsx                  # unchanged logic; UPDATED imports (../color.ts → @dtcg-editor/token-core for structural types/schemas;
│       │                                                  #   checkColorValueIssues/COMPONENT_RANGES/colorValueToCssColor/colorValueToSrgbHex/
│       │                                                  #   srgbHexToColorSpaceComponents imports repoint ../color.ts → ../utils/*)
│       ├── css-modules.d.ts                              # unchanged
│       ├── configuration.ts                              # unchanged content; UPDATED import (./color.ts → @dtcg-editor/token-core for COLOR_SPACES/ColorSpace)
│       ├── configuration.test.ts                         # unchanged
│       ├── token-type.ts                                 # UPDATED: colorTokenType imports ColorValueSchema/ColorValue from @dtcg-editor/token-core
│       ├── utils/                                         # NEW subfolder (FR-011): groups this package's value-adjacent utilities,
│       │   │                                               #   separate from components/ (UI), configuration.ts (editor config), token-type.ts (wiring)
│       │   ├── range-validation.ts                        # RENAMED from ../color.ts (not deleted): keeps only COMPONENT_RANGES/checkColorValueIssues
│       │   │                                               #   (+ private ComponentRange/ComponentRanges/isWithinRange/UNIT_RGB_RANGES/UNIT_XYZ_RANGES);
│       │   │                                               #   ColorSpace/ColorValue/ColorComponent types now imported from @dtcg-editor/token-core
│       │   ├── range-validation.test.ts                   # RENAMED from ../color.test.ts: keeps only checkColorValueIssues/COMPONENT_RANGES tests
│       │   ├── conversion.ts, conversion.test.ts          # MOVED unchanged from src/ root (native <input type="color"> interop; colorjs.io stays here)
│       │   └── css-color.ts, css-color.test.ts            # MOVED unchanged from src/ root (colorValueToCssColor, CSS rendering)
│       └── index.ts                                      # UPDATED exports (Editor + config + contract + utils/'s checkColorValueIssues/
│                                                            #   COMPONENT_RANGES/colorValueToCssColor/colorValueToSrgbHex/
│                                                            #   srgbHexToColorSpaceComponents, no structural schema)
│
├── token-editor-dimension/        # RENAMED from token-type-dimension
│   └── src/
│       ├── components/editor.tsx                        # unchanged; UPDATED import (../dimension.ts → @dtcg-editor/token-core)
│       ├── configuration.ts                              # unchanged (already empty per 002)
│       ├── token-type.ts                                 # UPDATED: dimensionTokenType imports DimensionValueSchema/DimensionValue from @dtcg-editor/token-core
│       ├── dimension.ts, dimension.test.ts                # DELETED (moved to token-core; dimension has no data/range-validation or
│       │                                                    #   conversion logic today, so it gets no utils/ folder — nothing to put in it)
│       └── index.ts                                       # UPDATED exports (Editor + contract only, no value schema)
│
└── token-editor-contract/         # RENAMED from token-type-contract (content unchanged)
    └── src/
        ├── contract.ts, contract.test.ts
        └── index.ts

apps/web-app/
├── package.json                                        # UPDATED: dependency names token-type-* → token-editor-*
├── app/api/tokens/[...path]/route.ts                    # UPDATED: import from token-editor-contract
├── components/TreeTokenNode.tsx                         # UPDATED: import from token-editor-contract (no token-type-color/dimension import today — verified, see research.md)
├── components/DefaultValidationErrorHandler.tsx          # UPDATED: import from token-editor-contract
├── components/FallbackValueEditor.tsx                   # UPDATED: import from token-editor-contract
├── lib/tokens/edit-state.ts                              # UPDATED: no token-type-* import today (validateDimensionValue already removed by 002 — verified, see research.md)
└── lib/token-editors/
    ├── types.ts                                          # UPDATED: import from token-editor-contract
    ├── built-in.ts                                       # UPDATED: imports from token-editor-color/token-editor-dimension/token-editor-contract
    ├── built-in.test.ts, built-in.a11y.test.tsx           # UPDATED: imports from token-editor-*
    ├── color-editor.test.tsx                              # UPDATED: ColorValue type import → token-core; ColorEditor/ColorEditorOptions stay on token-editor-color
    └── color-validation-error-handler.test.tsx             # UPDATED: imports from token-editor-color/token-editor-contract
```

**Structure Decision**: This is a pnpm workspace monorepo (Turborepo build orchestration); none of the template's generic single-project/web-app/mobile options apply directly. The structure above reflects the actual `packages/*` and `apps/web-app` directories being moved, renamed, or updated in place — no new top-level directories at the repo root are introduced; the one new directory this plan adds is `token-editor-color/src/utils/` (FR-011), an intra-package grouping for value-adjacent utilities that isn't structural parsing. Tests stay co-located with the code they test per Principle II, moving alongside their source files (into `utils/` where the code itself moves there) rather than into a separate `tests/` tree. `apps/web-app/lib/tokens/color-display.ts` and `components/TokenTree.tsx`'s direct type-package imports, present in the original (pre-002) version of this plan, no longer exist to update — 002-simplify-tree-node already deleted/generalized them. `token-core`'s own pre-existing internal layout (`parse.ts`/`schema.ts`/etc.) is left untouched by this plan — the user has indicated they'll respecify `token-core`'s organization separately, so this plan only adds the two narrowly-scoped structural modules (`color.ts`, `dimension.ts`) to it without restructuring what's already there.
