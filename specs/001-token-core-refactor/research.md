# Phase 0 Research: Token-Core Parsing Consolidation & Token-Editor Rename

No `NEEDS CLARIFICATION` markers remain in the Technical Context — every open question was already resolved during `/speckit-clarify` (spec.md `## Clarifications`) and the `/speckit-constitution` amendments that preceded this plan. This document records the resulting decisions so they don't have to be re-derived from those artifacts during implementation. Re-verified 2026-08-16 against the current codebase, after 002-simplify-tree-node landed.

## Decision: Where each moved file's logic lands in `token-core`

**Decision**: `token-type-dimension/src/dimension.ts` (+ `dimension.test.ts`) and `token-type-color/src/conversion.ts`/`css-color.ts` (+ their tests) move to `token-core/src/` wholesale, under the same filenames — they contain only value-schema/parsing/conversion code, cleanly movable as whole files (verified by reading each file's full content, not assumed from its name).

`color.ts` does **not** move wholesale, and — per the `/speckit-clarify` validation-scope session — it now splits between two packages rather than moving as one unit:

- **Structural exports** (does a raw value parse into a `ColorValue` shape at all) — `COLOR_SPACES`, `ColorSpace`, `ColorComponent`, `ColorObjectValue`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`, `ColorValueSchema`, `ColorValue` — move to `token-core/src/color.ts`, per FR-001. Their tests move to `token-core/src/color.test.ts`.
- **Data/range-validation exports** (a structurally-valid value with an out-of-range component, e.g. hue outside `[0, 360)`) — `COMPONENT_RANGES`, `checkColorValueIssues`, and their private helpers (`ComponentRange`, `ComponentRanges`, `isWithinRange`, `UNIT_RGB_RANGES`, `UNIT_XYZ_RANGES`) — **stay** in `token-editor-color/src/color.ts`, per FR-003/Assumptions, since a range issue is user-recoverable directly in the Editor UI rather than a structural parse failure. This file is updated in place (not deleted): it keeps its own name, drops its now-moved structural exports, and imports `ColorSpace`/`ColorValue`/`ColorComponent` from `@dtcg-editor/token-core` instead of defining them locally. Its tests stay in `token-editor-color/src/color.test.ts`, trimmed the same way.

Unlike the original (pre-002) version of this research, there is now **no editor-config code left inside `color.ts` to split out for that reason** — 002 already moved `ColorEditorOptions`/`ColorEditorOptionsSchema`/`defineColorConfig` into their own `configuration.ts` module (which itself imports `COLOR_SPACES`/`ColorSpace` from `color.ts`, repointed to `@dtcg-editor/token-core` by this refactor). The split that remains is the structural/data-validation one described above, not an editor-config one.

**Rationale**: Constitution Principle II requires tests live alongside the code they test, and Principle VII requires `token-core` to be the single source of truth for structural value schemas/parsing while editor-only concerns — including user-recoverable data validation — stay with the Editor package. The `/speckit-clarify` session established that "value-level validation" is not monolithic: a value's shape (structural) determines whether it's a valid token at all and belongs in `token-core`'s parse/validate contract; a value's in-range-ness (data) is specific to what the Editor can let a user fix in place, and moving it to `token-core` would give a React-free package a UI-shaped concern with no UI consumer of its own reason to exist there.

**Alternatives considered**: Moving `color.ts` wholesale, including `checkColorValueIssues`/`COMPONENT_RANGES` (the plan's original approach, before the validation-scope clarification) — rejected per the clarified spec: range-check issues are editor-recoverable, not structural, so `token-core` importing/exporting them would blur the exact boundary FR-001/FR-003 now draw. Re-deriving the config/value-schema split from scratch, as the original (pre-002) research assumed — rejected: it's already done (`configuration.ts` exists), and redoing it would either duplicate `configuration.ts` or regress 002's work.

## Decision: What stays behind in each renamed `token-editor-*` package

**Decision**: Each renamed package keeps exactly what 002-simplify-tree-node already organized: `components/` (the `Editor`, its styling, and — for color — `ColorValidationErrorHandler`), `configuration.ts` (editor-specific config, e.g. `ColorEditorOptions`; empty for dimension), and `token-type.ts` (the `TokenTypeContract` wiring object, e.g. `colorTokenType`, including the `ValidationErrorHandler` member 002 added), updated to import `ColorValueSchema`/`DimensionValueSchema`/`ColorValue`/`DimensionValue` from `token-core` instead of a sibling module — plus, for `token-editor-color` only, the trimmed `color.ts` retaining `checkColorValueIssues`/`COMPONENT_RANGES` (see the decision above). `index.ts` is updated to export `components/`'s `Editor` (+ `ValidationErrorHandler` for color), `configuration.ts`'s config type/schema, `color.ts`'s `checkColorValueIssues`/`COMPONENT_RANGES` (color only), and the wired contract — no longer the structural value schema, value type, or conversion functions.

**Rationale**: Directly implements FR-003/FR-004, building on 002's existing package-internal structure rather than redesigning it. `token-type.ts` already existed as a separate module specifically to avoid pulling `components/editor.tsx`'s JSX into non-UI consumers (per its own existing code comment) — that separation is preserved, just re-pointed at an external schema instead of a sibling one.

**Alternatives considered**: Deleting `token-type.ts` and inlining the `TokenTypeContract` object directly into `token-core` (fully centralizing contract wiring, not just parsing) — rejected: Principle VII explicitly keeps rendering/registration (the `Editor` reference) out of `token-core`, and the wiring object holds a live reference to `Editor`, so it must stay in the package that can import React.

## Decision: `colorjs.io` dependency move

**Decision**: Remove `colorjs.io` from `token-type-color`'s (→ `token-editor-color`'s) `package.json` dependencies and add it to `token-core`'s, using the same tree-shakable `colorjs.io/fn` entry point already in use (verified: `conversion.ts` — the only consumer of `colorjs.io` in this codebase — is unchanged by 002, still lives in `token-type-color/src/conversion.ts`).

**Rationale**: `conversion.ts` moves to `token-core` (FR-008). The constitution's Approved Dependencies list already names `token-core` as `colorjs.io`'s approved scope, so this is a pre-authorized move, not a new dependency addition requiring fresh Principle VIII justification.

**Alternatives considered**: Leaving `colorjs.io` in `token-editor-color` and having `token-core`'s `conversion.ts` depend on `token-editor-color` for it — rejected outright: this is exactly the reverse dependency direction Principle VII forbids.

## Decision: Package rename mechanics

**Decision**: Rename each package directory with `git mv` (`packages/token-type-color` → `packages/token-editor-color`, etc.), update each renamed package's own `name` field via `pnpm pkg set name=@dtcg-editor/token-editor-color` (run with `--filter` from the repo root, or from inside the renamed directory), and update every dependent's `package.json` dependency entry via `pnpm` commands (`pnpm remove @dtcg-editor/token-type-color --filter web-app && pnpm add @dtcg-editor/token-editor-color@workspace:* --filter web-app`) rather than hand-editing dependency blocks.

**Rationale**: `CLAUDE.md` mandates pnpm commands for all package dependency management ("NEVER directly modify a package file to manage dependencies"). A directory rename itself is a filesystem operation with no pnpm equivalent, so `git mv` is used for that specific step; the package's own `name` field and every consumer's dependency list are still changed exclusively through `pnpm` commands.

**Alternatives considered**: Manually editing every affected `package.json`'s `name`/dependency fields with a text editor — rejected per `CLAUDE.md`'s explicit repo convention.

## Decision: Consumer import updates (re-verified post-002)

**Decision**: Re-running `grep -rn` across `apps/web-app` for every `@dtcg-editor/token-type-*` import today (post-002) turns up a materially smaller and different call-site list than the original (pre-002) research assumed, because 002 already deleted `lib/tokens/color-display.ts` and made `TreeNode.tsx`/`TokenTree.tsx` fully generic:

- `lib/token-editors/built-in.ts` — the **only** file importing `colorTokenType`/`dimensionTokenType` (the wired contracts) directly, from `@dtcg-editor/token-type-color`/`@dtcg-editor/token-type-dimension`. Repoints to `@dtcg-editor/token-editor-color`/`@dtcg-editor/token-editor-dimension`, name change only — it never imported a value schema directly.
- `app/api/tokens/[...path]/route.ts`, `components/DefaultValidationErrorHandler.tsx`, `components/TreeTokenNode.tsx`, `components/FallbackValueEditor.tsx`, `lib/token-editors/types.ts` — all import only from `@dtcg-editor/token-type-contract` (`validateTokenValue`, `TokenTypeValidationError`, `TokenTypeEditorProps`), never a concrete type package. Repoint to `@dtcg-editor/token-editor-contract`, name change only.
- `lib/token-editors/color-editor.test.tsx` — imports `ColorEditor`/`ColorEditorOptions` from `token-type-color` (stays on `token-editor-color`, name change only) and the `ColorValue` type (repoints to `token-core`).
- `lib/token-editors/color-validation-error-handler.test.tsx`, `built-in.test.ts`, `built-in.a11y.test.tsx` — import only wired contracts/`Editor`/`ValidationErrorHandler` from the type packages; repoint to `token-editor-*`, name change only.
- `lib/tokens/edit-state.ts` — no `@dtcg-editor/token-type-*` import today (002 already deleted its `validateDimensionValue`/`DimensionValue` usage). Nothing to repoint here.
- `components/TokenTree.tsx` — no `@dtcg-editor/token-type-*` import today (002 already made it fully generic). Nothing to repoint here.

**Rationale**: FR-006, confirmed against the actual current import graph (inventoried via `grep -rn` across `apps/web-app` immediately before writing this plan, not reused from the pre-002 plan). The upshot: this refactor's `apps/web-app` footprint is now *smaller* than originally planned — only package-name updates plus one type-import repoint (`color-editor.test.tsx`'s `ColorValue`), because 002 already eliminated every direct-value-schema import from application code.

**Alternatives considered**: Re-exporting the moved schemas/types from each `token-editor-*` package for backward compatibility, avoiding call-site edits — rejected per spec Assumptions: these are private, workspace-internal packages with no external consumers, so a compatibility shim adds indirection with no audience to serve, and would reintroduce the exact "importing the editor package to get parsing" problem User Story 1 exists to eliminate.
