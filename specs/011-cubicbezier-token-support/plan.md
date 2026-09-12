# Implementation Plan: cubicBezier Token Support

**Branch**: `worktree-cubicbezier-token-support` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-cubicbezier-token-support/spec.md`

## Summary

Add first-class editor support for the DTCG `cubicBezier` token type. `token-core` gains a
`CubicBezierValueSchema` Zod tuple (`[P1x, P1y, P2x, P2y]`, x-coordinates bound to `[0,1]`,
y-coordinates unconstrained) and its inferred `CubicBezierValue` type. A new
`packages/token-editor-cubic-bezier` package (mirroring `packages/token-editor-dimension`'s
structure exactly) supplies the `Editor` (four labeled number inputs), a `Preview`
(short `cubic-bezier(a, b, c, d)` text rendering, mirroring `ColorPreview`), and the
`TokenTypeContract` wiring (`cubicBezierTokenType`). `apps/web-app/lib/token-editors/built-in.ts`
registers the new type alongside `dimension`/`color`. No new dependency is introduced.

## Technical Context

**Language/Version**: TypeScript (strict, per Principle III), Node.js (repo engine version)

**Primary Dependencies**: Zod (schema, `token-core`), React (`Editor`/`Preview` components),
`@dtcg-editor/token-editor-contract` (`TokenTypeContract` interface) — all already-approved
dependencies (Principle VIII); no new dependency added.

**Storage**: N/A — tokens live in JSON files on disk, parsed/serialized by `token-core`; this
feature only adds a new `$type`'s schema/UI, not a new storage mechanism.

**Testing**: `node --test` + `node:assert/strict` for the React-free `token-core` schema
(`cubic-bezier.test.ts`); Vitest + `@testing-library/react` (jsdom) for the `Editor`/`Preview`
unit tests; Vitest Browser Mode + `axe-core` (WCAG 2.2 AA tags) for the `.a11y.test.tsx` tier —
matching `token-editor-dimension`'s existing two-tier setup exactly (Principle X / Technology
Stack).

**Target Platform**: Web (Next.js app, `apps/web-app`); `token-editor-cubic-bezier` and
`token-core` are platform-agnostic installable packages.

**Project Type**: pnpm/Turborepo monorepo — library packages (`token-core`,
`token-editor-cubic-bezier`) consumed by a web app (`apps/web-app`).

**Performance Goals**: N/A — a four-field controlled form and a short text preview have no
measurable performance target beyond normal UI responsiveness; no new success criterion in
`spec.md` calls for one.

**Constraints**: Must not modify `packages/token-editor-contract/src/contract.ts` (shared file
two sibling-type agents are also touching in parallel this session — see Complexity Tracking's
note below, though this is a scope constraint, not a constitutional violation). Must not
introduce a new third-party dependency (Principle VIII / VIII already covers the "no new dep
without justification" case — none is being added here).

**Scale/Scope**: One new `token-core` module + test, one new package (`token-editor-cubic-bezier`)
with one `Editor` + one `Preview` component (each in its own folder per Principle X) + their
tests, and a small registration edit in `apps/web-app/lib/token-editors/built-in.ts`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (DTCG Spec Compliance)**: PASS. The tuple schema encodes the spec's exact
  constraint (`P1x`/`P2x` in `[0,1]`, `P1y`/`P2y` unconstrained) directly, matching
  designtokens.org/tr/2025.10/format's Cubic Bezier type with no deviation.
- **Principle II / VII (token-core vs token-editor-* split)**: PASS. `CubicBezierValueSchema` +
  `CubicBezierValue` (parsing/type-definition/validation) live in `token-core`, React-free.
  The `Editor`, `Preview`, and `TokenTypeContract` wiring live in the new
  `token-editor-cubic-bezier` package. Dependency direction is one-way
  (`token-editor-cubic-bezier` → `token-core`), matching `token-editor-dimension`'s precedent.
- **Principle III (TypeScript Strictness)**: PASS. New package's `tsconfig.json` extends
  `tsconfig.base.json` exactly as `token-editor-dimension`'s does, with no flag relaxed.
- **Principle IV (Validation at the Edges)**: PASS. The four-tuple is validated once, by
  `CubicBezierValueSchema`, at the point a raw `$value` enters the system (file parse /
  `TreeTokenNode`'s edit-commit path) — the `Editor` receives an already-validated
  `CubicBezierValue` and re-validates nothing.
- **Principle VIII (Minimal Dependencies)**: PASS. No new dependency — four native
  `<input type="number">` elements, same as `DimensionEditor`'s single numeric field.
- **Principle IX (Round-Trip Fidelity)**: PASS. `serializeValue` is the identity function
  (`(value) => value`), matching `dimensionTokenType`'s pattern — the validated tuple is
  already the exact on-disk shape, so no lossy transform is introduced.
- **Principle X (Component Granularity & Testing)**: PASS. `CubicBezierEditor` and
  `CubicBezierPreview` are each defined in their own file/folder
  (`components/CubicBezierEditor/`, `components/CubicBezierPreview/`), PascalCase-named, with
  co-located `.test.tsx` + `.a11y.test.tsx` (+ `.module.css` for the editor). Neither
  component is anywhere near the 300-line ceiling.
- **Principle XII (Design System Usage)**: PASS. All styling (`CubicBezierEditor.module.css`,
  `CubicBezierPreview.module.css`) uses only `packages/design-system`'s `--dtcg-ed-*` custom
  properties, following `DimensionEditor.module.css`/`ColorPreview.module.css`'s exact pattern;
  no design-system component exists for this widget shape (four adjacent labeled number
  inputs), so nothing is being reimplemented that design-system already provides.
- **Principle XIII (TDD, NON-NEGOTIABLE)**: PASS (procedural, enforced by
  `speckit-implement`'s `before_implement` hook running `speckit-tdd-run`). This plan does not
  bypass that gate.
- **Scope constraint — not touching `contract.ts`**: The task brief explicitly directs this
  feature to avoid editing `packages/token-editor-contract/src/contract.ts` because two other
  agents are concurrently adding sibling token types in the same session, to avoid unnecessary
  merge conflicts on a shared file. `contract.ts` already declares `Preview` as optional
  (`Preview?(...)`), so `cubicBezierTokenType` can supply a concrete `Preview` without any
  change to that file. No constitutional principle requires editing it for this feature, so
  this is a scope note, not a gate violation — nothing in Complexity Tracking is needed.

**Result**: No violations. Nothing requires an entry in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/011-cubicbezier-token-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/token-core/src/
├── cubic-bezier.ts            # CubicBezierValueSchema + CubicBezierValue (NEW)
├── cubic-bezier.test.ts       # node:test unit tests (NEW)
└── index.ts                   # export the two new symbols (EDIT)

packages/token-editor-cubic-bezier/                          # NEW package
├── package.json
├── tsconfig.json
├── vitest.setup.ts
├── vitest-a11y-tags.ts
└── src/
    ├── index.ts
    ├── token-type.ts                       # cubicBezierTokenType (TokenTypeContract)
    ├── css-modules.d.ts
    ├── vitest-env.d.ts
    └── components/
        ├── CubicBezierEditor/
        │   ├── CubicBezierEditor.tsx
        │   ├── CubicBezierEditor.module.css
        │   ├── CubicBezierEditor.test.tsx
        │   └── CubicBezierEditor.a11y.test.tsx
        └── CubicBezierPreview/
            ├── CubicBezierPreview.tsx
            ├── CubicBezierPreview.module.css
            ├── CubicBezierPreview.test.tsx
            └── CubicBezierPreview.a11y.test.tsx

apps/web-app/lib/token-editors/built-in.ts   # register "cubicBezier" (EDIT)
vitest.config.mts                            # add packages/token-editor-cubic-bezier to
                                              # the `packages` array (EDIT)
```

**Structure Decision**: Monorepo library-package pattern, following
`packages/token-editor-dimension` byte-for-byte in layout: one `token-core` module for the
spec-conformant schema, one `token-editor-*` package for the pluggable UI, one registration
edit in the host app. This is the repo's only existing pattern for adding a token type and the
constitution (Principle II/VII) mandates it.

## Complexity Tracking

> No violations — table intentionally omitted.
