# Phase 0 Research: Token-Core Parsing Consolidation & Token-Editor Rename

No `NEEDS CLARIFICATION` markers remain in the Technical Context — every open question was already resolved during `/speckit-clarify` (spec.md `## Clarifications`) and the two `/speckit-constitution` amendments (v2.0.0, v2.0.1) that preceded this plan. This document records the resulting decisions so they don't have to be re-derived from those artifacts during implementation.

## Decision: Where each moved file's logic lands in `token-core`

**Decision**: `token-type-dimension/src/dimension.ts` (+ `dimension.test.ts`) and `token-type-color/src/conversion.ts`/`css-color.ts` (+ their tests) move to `token-core/src/` wholesale, under the same filenames — they contain only value-schema/parsing/conversion code, cleanly movable as whole files (verified by reading each file's full content, not assumed from its name).

`color.ts` does **not** move wholesale — inspection of its actual content shows it mixes two concerns in one file: value-schema/validation code (`COLOR_SPACES`, `ColorComponent`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`, `ColorValueSchema`, `ColorValue`, `COMPONENT_RANGES`, `checkColorValueIssues`) and editor-only config code (`ColorEditorOptions`, `ColorEditorOptionsSchema`, `defineColorConfig` — validates `editorOptions` for `ColorEditor`, not the token `$value`). It is **split**: the value-schema/validation exports move to `token-core/src/color.ts`; the editor-config exports move into `token-editor-color/src/token-type.ts` (the file that already needs `ColorEditorOptionsSchema` for its `TokenTypeContract.editorOptionsSchema` field), rather than staying in a file named `color.ts` that no longer exists in that package. `color.test.ts` is split the same way: its `ColorValueSchema`/`checkColorValueIssues`-covering tests move to `token-core/src/color.test.ts`; its `ColorEditorOptionsSchema`/`defineColorConfig`-covering tests move to `token-editor-color/src/token-type.test.ts` (a new test file for the now-nontrivial `token-type.ts`).

**Rationale**: Constitution Principle II requires tests live alongside the code they test, and Principle VII requires `token-core` to be the single source of truth for value schemas/parsing while editor-only config stays with the Editor (per spec Assumptions). Assuming "one file = one concern" without reading the file would have silently moved editor-only config into `token-core`, violating both FR-003 and the "no React-adjacent config in token-core" intent — this was only caught by reading `color.ts` and `color.test.ts` in full before finalizing this plan.

**Alternatives considered**: Moving `color.ts` wholesale and leaving `ColorEditorOptions`/`ColorEditorOptionsSchema`/`defineColorConfig` in `token-core` — rejected: these validate Editor configuration, not a token `$value`, so per the spec's explicit Assumption they belong with the Editor, and leaving them in `token-core` would be inconsistent with `dimension`'s equivalent (dimension has no editor-config schema today, so this asymmetry would only be discovered later, when a second type with editor config was added). Introducing a brand-new file (e.g. `token-editor-color/src/editor-options.ts`) for the 3 relocated editor-config exports instead of folding them into `token-type.ts` — rejected as an unnecessary extra module for a small, single-purpose addition to a file that already exists for exactly this kind of package-side wiring.

## Decision: What stays behind in each renamed `token-editor-*` package

**Decision**: Each renamed package keeps exactly: its `Editor` component (`editor.tsx`), editor-only styling (`editor.module.css`, `css-modules.d.ts`), and `token-type.ts` — the `TokenTypeContract` wiring object (e.g. `colorTokenType`), updated to import `ColorValueSchema`/`DimensionValueSchema` from `token-core` instead of a sibling module. `index.ts` is updated to export only the `Editor`, the wired contract, and any editor-specific config type/schema (e.g. `ColorEditorOptions`, `ColorEditorOptionsSchema`) — no longer the value schema, value type, or conversion/validation functions.

**Rationale**: Directly implements FR-003/FR-004. `token-type.ts` already existed as a separate module specifically to avoid pulling `editor.tsx`'s JSX into non-UI consumers (per its own existing code comment) — that separation is preserved, just re-pointed at an external schema instead of a sibling one.

**Alternatives considered**: Deleting `token-type.ts` and inlining the `TokenTypeContract` object directly into `token-core` (fully centralizing contract wiring, not just parsing) — rejected: Principle VII explicitly keeps rendering/registration (the `Editor` reference) out of `token-core`, and the wiring object holds a live reference to `Editor`, so it must stay in the package that can import React.

## Decision: `colorjs.io` dependency move

**Decision**: Remove `colorjs.io` from `token-type-color`'s (→ `token-editor-color`'s) `package.json` dependencies and add it to `token-core`'s, using the same tree-shakable `colorjs.io/fn` entry point already in use.

**Rationale**: `conversion.ts`, the only consumer of `colorjs.io` in this codebase, moves to `token-core` (FR-008). The constitution's Approved Dependencies list was already updated to name `token-core` as `colorjs.io`'s approved scope (v2.0.0 amendment), so this is a pre-authorized move, not a new dependency addition requiring fresh Principle VIII justification.

**Alternatives considered**: Leaving `colorjs.io` in `token-editor-color` and having `token-core`'s `conversion.ts` depend on `token-editor-color` for it — rejected outright: this is exactly the reverse dependency direction Principle VII forbids.

## Decision: Package rename mechanics

**Decision**: Rename each package directory with `git mv` (`packages/token-type-color` → `packages/token-editor-color`, etc.), update each renamed package's own `name` field via `pnpm pkg set name=@dtcg-editor/token-editor-color` (run with `--filter` from the repo root, or from inside the renamed directory), and update every dependent's `package.json` dependency entry via `pnpm` commands (`pnpm remove @dtcg-editor/token-type-color --filter web-app && pnpm add @dtcg-editor/token-editor-color@workspace:* --filter web-app`) rather than hand-editing dependency blocks.

**Rationale**: `CLAUDE.md` mandates pnpm commands for all package dependency management ("NEVER directly modify a package file to manage dependencies"). A directory rename itself is a filesystem operation with no pnpm equivalent, so `git mv` is used for that specific step; the package's own `name` field and every consumer's dependency list are still changed exclusively through `pnpm` commands.

**Alternatives considered**: Manually editing every affected `package.json`'s `name`/dependency fields with a text editor — rejected per `CLAUDE.md`'s explicit repo convention.

## Decision: Consumer import updates

**Decision**: `apps/web-app` call sites importing a value schema, type, or parsing/conversion function directly from a `token-type-*` package are repointed to `@dtcg-editor/token-core`. Verified via `grep -rn` across `apps/web-app` for every `token-type-*` import, this is:
- `lib/tokens/color-display.ts` — `checkColorValueIssues`, `colorValueToCssColor`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema` (all of it repoints to `token-core`).
- `lib/token-editors/color-editor.test.tsx` — only its `ColorValue` type import repoints to `token-core`; its `ColorEditor`/`ColorEditorOptions` imports stay pointed at (the renamed) `token-editor-color`.
- `components/TokenTree.tsx` — only its `DimensionValue` type import repoints to `token-core`; its `dimensionTokenType`/`colorTokenType` imports stay pointed at the renamed `token-editor-*` packages.
- `lib/tokens/edit-state.ts` — only its `DimensionValue` type import repoints to `token-core`; its `dimensionTokenType` import stays pointed at `token-editor-dimension`.

Call sites importing only the wired `TokenTypeContract` object (`colorTokenType`, `dimensionTokenType`) or the `Editor` component keep importing from the renamed `token-editor-*` package, updated only for the new package name — this covers `lib/token-editors/built-in.ts`, `built-in.test.ts`, `built-in.a11y.test.tsx`, and the `Editor`/config-only half of `color-editor.test.tsx`.

**Rationale**: FR-006, confirmed against the actual current import graph (inventoried via `grep -rn` across `apps/web-app` before this plan was written) rather than assumed.

**Alternatives considered**: Re-exporting the moved schemas/types from each `token-editor-*` package for backward compatibility, avoiding call-site edits — rejected per spec Assumptions: these are private, workspace-internal packages with no external consumers, so a compatibility shim adds indirection with no audience to serve, and would reintroduce the exact "importing the editor package to get parsing" problem User Story 1 exists to eliminate.
