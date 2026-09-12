# Implementation Plan: Duration Token Support

**Branch**: `011-duration-token-support` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-duration-token-support/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add full editor support for the DTCG `duration` token type. `token-core` gains a `DurationValueSchema`/`DurationValue` (Zod schema, `{ value: number >= 0, unit: "ms" | "s" }`), mirroring `dimension.ts` almost exactly with a different unit enum and a non-negativity constraint. A new `@dtcg-editor/token-editor-duration` package mirrors `@dtcg-editor/token-editor-dimension`'s structure: a `DurationEditor` component (number input + unit select), a `DurationPreview` component (short read-only text rendering, e.g. `200ms`, mirroring `token-editor-color`'s `ColorPreview` pattern), and a `durationTokenType: TokenTypeContract<DurationValue>` wiring object. `apps/web-app/lib/token-editors/built-in.ts` registers `"duration"` alongside `"dimension"`/`"color"`. No new third-party dependency.

## Technical Context

**Language/Version**: TypeScript (strict, per root `tsconfig.base.json`)

**Primary Dependencies**: React 19 (editor component), Zod (schema), `neverthrow` (not directly needed here — no new fallible operations beyond schema parsing, which `TokenTypeContract`'s existing `validateTokenValue` already wraps)

**Storage**: N/A (in-memory token document model; no persistence layer in scope)

**Testing**: Vitest + `@testing-library/react` (jsdom) for `DurationEditor`/`DurationPreview` unit tests; Vitest Browser Mode + `axe-core` for `.a11y.test.tsx` tiers; `node:test` for `token-core`'s `duration.test.ts` (non-JSX package)

**Target Platform**: Web (Next.js app, `apps/web-app`), packages consumed as workspace libraries

**Project Type**: Monorepo library + web app (pnpm workspaces / Turborepo) — this feature adds one `token-core` module and one new `token-editor-*` package, plus a registration edit in the web app

**Performance Goals**: N/A beyond existing editor responsiveness (synchronous, in-memory value edits)

**Constraints**: Must not modify `packages/token-editor-contract/src/contract.ts` (shared file intentionally left alone while sibling agents work on other token types in parallel); MUST use `packages/design-system`'s `--dtcg-ed-*` CSS custom properties (Principle XII), no hardcoded values

**Scale/Scope**: One new `token-core` module, one new `token-editor-*` package (2 components: Editor + Preview), one registration edit in `apps/web-app`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (DTCG Spec Compliance)**: PASS — `DurationValueSchema` matches the 2025.10 spec's Duration type (`{ value: number >= 0, unit: "ms" | "s" }`) exactly; the `>= 0` constraint is explicit in the schema (`z.number().min(0)`), unlike `dimension`'s unconstrained `value` (dimension permits negatives; duration's spec text does not, and this is called out here rather than silently copied).
- **Principle II / VII (Feature Organization / Token-Editor Package Contract)**: PASS — schema/types/parsing live in `token-core` (`duration.ts`); `Editor` + `Preview` + `TokenTypeContract` wiring live in the new `token-editor-duration` package; dependency direction is `token-editor-duration → token-core`, never reversed.
- **Principle III (TypeScript Strictness)**: PASS — new package extends root `tsconfig.base.json` unmodified, same as `token-editor-dimension`.
- **Principle IV (Validation at the Edges)**: PASS — validation happens once via `DurationValueSchema`/`validateTokenValue`; the `Editor`/`Preview` components trust already-typed `DurationValue` props.
- **Principle VIII (Minimal Dependencies)**: PASS — no new dependency; only workspace-internal (`@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract`) and already-catalog (`react`, `zod`, test tooling) dependencies, matching `token-editor-dimension`'s existing `package.json` shape.
- **Principle IX (Round-Trip Fidelity)**: PASS — `serializeValue` is the identity function (`(value) => value`), same as `dimension`'s, so an unmodified duration token round-trips losslessly.
- **Principle X (Component Granularity & Testing)**: PASS — `DurationEditor` and `DurationPreview` are each one component per file, PascalCase, own folder, with co-located `.test.tsx`/`.a11y.test.tsx`/`.module.css`.
- **Principle XII (Design System Usage)**: PASS — all styling in `DurationEditor.module.css`/`DurationPreview.module.css` uses `--dtcg-ed-*` tokens only, mirroring `DimensionEditor.module.css`/`ColorPreview.module.css`; no design-system component is being reimplemented (a plain `<input>`/`<select>` matches the existing `DimensionEditor` precedent, which itself does not use a design-system form component).
- **Principle XIII (TDD, NON-NEGOTIABLE)**: Gated by `speckit-implement`'s `before_implement` hook (`speckit-tdd-run`) — tasks.md orders test tasks before implementation tasks; no violation anticipated since this mirrors an already-compliant precedent (`token-editor-dimension`).

No violations requiring justification. Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/011-duration-token-support/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/token-core/
├── src/
│   ├── duration.ts             # DurationValueSchema, DurationValue (NEW)
│   ├── duration.test.ts        # node:test unit tests (NEW)
│   └── index.ts                # export DurationValue/DurationValueSchema (EDIT)

packages/token-editor-duration/ # NEW package, mirrors token-editor-dimension
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── token-type.ts           # durationTokenType: TokenTypeContract<DurationValue>
│   ├── css-modules.d.ts
│   ├── vitest-env.d.ts
│   └── components/
│       ├── DurationEditor/
│       │   ├── DurationEditor.tsx
│       │   ├── DurationEditor.test.tsx
│       │   ├── DurationEditor.a11y.test.tsx
│       │   └── DurationEditor.module.css
│       └── DurationPreview/
│           ├── DurationPreview.tsx
│           ├── DurationPreview.test.tsx
│           ├── DurationPreview.a11y.test.tsx
│           └── DurationPreview.module.css
├── vitest.setup.ts
└── vitest-a11y-tags.ts

apps/web-app/lib/token-editors/built-in.ts  # register "duration" (EDIT)
vitest.config.mts                            # add packages/token-editor-duration project (EDIT)
```

**Structure Decision**: Mirrors the existing `token-editor-dimension` package exactly (same structural shape as the `duration`/`dimension` DTCG value shapes), plus one additional `Preview` component folder (dimension has no `Preview` yet — a separate known gap, not in scope here) modeled on `token-editor-color`'s `ColorPreview`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
