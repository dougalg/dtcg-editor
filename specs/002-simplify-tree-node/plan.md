# Implementation Plan: Simplify TokenTree / TreeNode Editor Coupling

**Branch**: `002-simplify-tree-node` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-simplify-tree-node/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

`TreeNode.tsx` currently hard-codes two token types (dimension, color) as special
cases — direct imports of `@dtcg-editor/token-type-dimension` /
`@dtcg-editor/token-type-color`, a dimension-only value-validation path
(`validateDimensionValue`), a dimension-only editor-cast branch, and a
color-only read-only swatch/issue display (`describeColorForDisplay`) — while
every _other_ standard type already flows through one generic path:
`resolveBuiltInContract` + `validateTokenValue` for validation, and
`resolveEditorForType` + a single `GenericEditor` render for the UI. The fix
is not new machinery — it's deleting the two special cases and routing
dimension and color through that same existing generic path, extending
`TokenTypeContract` with one new optional member (`ValidationErrorHandler`) so a token-type
package can supply its own read-only/invalid-state rendering (the one piece,
color's swatch, that the generic path doesn't already cover) instead of the
host app needing to know what a color looks like.

Per the 2026-08-16 clarification session, this feature also fixes the mirror
image of that same coupling problem _inside_ the first-party token-type
packages themselves: `token-type-color/src/color.ts` today mixes its core
`ColorValueSchema` with editor-only concerns (`ColorEditorOptions`,
`ColorEditorOptionsSchema`, `defineColorConfig`), and each package's editor
component sits loose at `src/editor.tsx` rather than in a dedicated
`components/` directory. FR-009–FR-012 mandate a uniform editor-package
structure (`components/` for UI, `configuration.ts` for editor-specific
config, kept out of the core value-schema module) and require retrofitting
both `token-type-color` and `token-type-dimension` to it now, not just
documenting it for future packages.

## Technical Context

**Language/Version**: TypeScript (strict mode, per constitution Principle III) on Node.js ≥26.5.0

**Primary Dependencies**: React 19, Next.js 16 (App Router, `apps/web-app`), Zod 4 (`TokenTypeContract.valueSchema`), neverthrow (`Result`/`ResultAsync`) — all already in use; no new dependency is introduced by this refactor (constitution Principle VIII)

**Storage**: N/A — this feature touches only in-memory tree state and component rendering; token file read/write (`lib/tokens/read.ts`/`write.ts`) is unchanged

**Testing**: Vitest + `@testing-library/react` (`apps/web-app`, existing `TokenTree.test.tsx`/`TokenTree.generic-editor.test.tsx`/`TokenTree.override.test.tsx`/`TokenTree.a11y.test.tsx`); `node:test` for `packages/*` (existing `token-type-color`/`token-type-contract` test files); Vitest Browser Mode + `@playwright/test` for accessibility — all existing suites, reused as the regression gate for this refactor, not extended with new test infrastructure

**Target Platform**: Web (browser), served by the Next.js dev/build pipeline in `apps/web-app`

**Project Type**: Web application within a pnpm/Turborepo monorepo — this feature is an internal refactor spanning `apps/web-app`'s tree components and both first-party token-type packages (`packages/token-type-color`, `packages/token-type-dimension`)

**Performance Goals**: No new performance target; render behavior and perceived responsiveness of the token tree must not regress (informal parity, not a new measured goal)

**Constraints**: Must compile under the repo's strict TypeScript settings with no per-file relaxation (Principle III); must preserve all existing user-facing behavior and accessibility semantics (Story 2, SC-002); must not introduce a new third-party dependency (Principle VIII)

**Scale/Scope**: Two components in `apps/web-app` (`components/TreeNode.tsx`, `components/TokenTree.tsx`), the editor-registry glue in `apps/web-app/lib/token-editors/*`, `apps/web-app/lib/tokens/edit-state.ts` and `color-display.ts`; `packages/token-type-contract` gains one new optional interface member; both `packages/token-type-color` (hosting its new `ValidationErrorHandler`, plus the `configuration.ts`/`components/` retrofit) and `packages/token-type-dimension` (structural retrofit only — `components/` + an initially-empty `configuration.ts`, no behavior change) are touched

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle VII (Token-Type Package Contract)** — directly advanced by this
  feature: today `TreeNode.tsx` (the web app's editor host) hard-codes
  knowledge of `dimensionTokenType`/`colorTokenType`, which is exactly what
  this principle prohibits of a generic host. The plan brings `TreeNode.tsx`
  into compliance by routing every type — built-in or user-registered —
  through `TokenTypeContract` alone. **PASS** (post-design: still PASS —
  the new `ValidationErrorHandler` member is itself part of the pluggable contract, not a
  new hard-coded type check).
- **Principle II (Feature-Based Code Organization)** — color's swatch/issue
  display logic (`apps/web-app/lib/tokens/color-display.ts`, importing
  `token-type-color`'s internal schemas directly) currently lives outside the
  color package it's about. Moving it into `packages/token-type-color` as
  part of that package's own `ValidationErrorHandler` implementation satisfies this
  principle's plugin-boundary/code-organization match. **PASS**.
- **Principle III (TypeScript Strictness)** — no relaxation planned; the new
  `ValidationErrorHandler` contract member is typed the same way `Editor` already is
  (`(props) => ReactElement`), erased to `unknown` at the registry boundary
  exactly as `Editor` is today. **PASS**.
- **Principle V (Result-Pattern Error Handling)** — `edit-state.ts`'s
  `validateDimensionValue` (a hand-rolled discriminated union, not a
  `neverthrow` `Result`) is deleted; dimension validation moves onto the same
  `validateTokenValue` (`Result`-returning) path every other built-in type
  already uses. This is a net alignment improvement, not a new violation.
  **PASS**.
- **Principle VIII (Minimal Dependencies)** — no new dependency. **PASS**.
- **Principle II (Feature-Based Code Organization), extended** — FR-009/FR-010
  formalize, as an explicit requirement, that a token-type package's editor UI
  and editor-specific configuration are organized as clearly separated
  concerns within that package (`components/` vs. `configuration.ts`), rather
  than mixed into the same module as core value validation
  (`color.ts`/`dimension.ts`). This is a direct, stricter application of the
  same principle already invoked above for `ValidationErrorHandler`. **PASS**.

No violations requiring justification; the Complexity Tracking table below is
not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-simplify-tree-node/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This is a refactor within the existing monorepo layout — no new packages or
top-level directories. Existing files touched, moved, or added:

```text
packages/token-type-contract/
└── src/contract.ts                    # Add optional `ValidationErrorHandler` member to TokenTypeContract

packages/token-type-color/
├── src/index.ts                       # Update export paths (components/, configuration.ts)
├── src/color.ts                       # Core value schema only: ColorValueSchema, ColorObjectValueSchema,
│                                       #   LegacyHexColorValueSchema, checkColorValueIssues, COLOR_SPACES/ColorSpace
│                                       #   (ColorEditorOptions* / defineColorConfig moved OUT, to configuration.ts)
├── src/configuration.ts               # NEW: ColorEditorOptions, ColorEditorOptionsSchema, defineColorConfig
│                                       #   (moved from color.ts) — imports ColorSpace/COLOR_SPACES from color.ts
├── src/token-type.ts                  # Assembles colorTokenType; Editor/ValidationErrorHandler now imported from components/,
│                                       #   editorOptionsSchema now imported from configuration.ts
└── src/components/
    ├── editor.tsx                     # MOVED from src/editor.tsx (ColorEditor), unchanged logic
    ├── editor.module.css              # MOVED alongside editor.tsx
    └── validation-error-handler.tsx                    # NEW: swatch + validation-issue display, moved from apps/web-app's
                                        #   color-display.ts, implementing the new ValidationErrorHandler contract member

packages/token-type-dimension/
├── src/index.ts                       # Update export path (components/editor.tsx)
├── src/dimension.ts                   # Core value schema only — unchanged content
├── src/configuration.ts               # NEW: empty/no-op today (dimension has no editor-specific options yet);
│                                       #   exists per FR-009/FR-010/FR-011's structural requirement
├── src/token-type.ts                  # Editor now imported from components/editor.tsx
└── src/components/
    └── editor.tsx                     # MOVED from src/editor.tsx (DimensionEditor), unchanged logic

apps/web-app/
├── components/
│   ├── TreeNode.tsx                   # Delete dimension/color special cases; single generic dispatch path
│   └── TokenTree.tsx                  # No logic change expected (already generic); re-verified, not rewritten
├── lib/
│   ├── token-editors/
│   │   ├── built-in.ts                # No shape change; dimension already registered here
│   │   └── resolve-editor.ts          # No change; already generic
│   └── tokens/
│       ├── edit-state.ts              # Remove validateDimensionValue (superseded by validateTokenValue)
│       └── color-display.ts           # Delete; logic moves into packages/token-type-color/src/components/validation-error-handler.tsx
```

**Structure Decision**: No new projects/packages. Changes are confined to the
existing `apps/web-app` tree-rendering layer, `packages/token-type-contract`
(one new optional contract member), and both first-party token-type packages
— `packages/token-type-color` (behavioral: new `ValidationErrorHandler`; structural: config
split + `components/`) and `packages/token-type-dimension` (structural only:
`components/` + an initially-empty `configuration.ts`, no behavior change) —
per FR-009–FR-012's requirement that the new editor-package structure is
retrofitted onto both existing packages now, not just documented for future
ones.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
