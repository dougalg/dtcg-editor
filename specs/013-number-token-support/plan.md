# Implementation Plan: Number Token Editor Support

**Branch**: `worktree-number-token-support` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-number-token-support/spec.md`

## Summary

Add first-class editor support for the DTCG `number` token type. `token-core` gains a
`NumberValueSchema` (a plain `z.number()` — no unit, no integer/range constraint, unlike
`fontWeight`) plus its exported inferred type, following `font-weight.ts`'s module shape but
simpler. A new package, `packages/token-editor-number`, mirrors `token-editor-font-weight`'s
structure minus the alias picker: a `NumberEditor` component (a number input, satisfying
FR-003/FR-004; User Story 1), a `NumberPreview` component mirroring `ColorPreview`'s/
`FontWeightPreview`'s read-only-literal-rendering pattern (User Story 2), and a
`numberTokenType: TokenTypeContract<NumberValue>` wiring module. The new type is registered in
`apps/web-app/lib/token-editors/built-in.ts`'s `BUILT_IN_TOKEN_TYPES`/`builtInContractsByType`,
and the package is added to `vitest.config.mts`'s `packages` array so its component/a11y tests
run under the shared Vitest projects setup.

## Technical Context

**Language/Version**: TypeScript (strict, per Principle III), targeting the repo's existing
Node/React versions — no new runtime requirement.

**Primary Dependencies**: Zod (`token-core`'s `NumberValueSchema`), React (`Editor`/`Preview`
components), `@dtcg-editor/token-core` and `@dtcg-editor/token-editor-contract` (both already
approved, per Principle VII's one-way dependency rule). No new third-party dependency — see
Constitution Check (Principle VIII) below.

**Storage**: N/A — no persistence layer; tokens are edited in-memory / round-tripped through
existing `token-core` parse/serialize.

**Testing**: `node:test` for `token-core`'s schema unit test (`number.test.ts`, matching
`font-weight.test.ts`); Vitest + `@testing-library/react` (jsdom) for `NumberEditor`/
`NumberPreview` unit tests; Vitest Browser Mode + `axe-core` for the two components'
`.a11y.test.tsx` tiers — all per Principle X/Technology Stack, identical tooling to
`token-editor-font-weight`/`token-editor-dimension`.

**Target Platform**: Web (Next.js app, `apps/web-app`), same as every other token-editor package.

**Project Type**: Library package (`packages/token-editor-number`) consumed by the web app —
mirrors `token-editor-font-weight`'s project type exactly.

**Performance Goals**: N/A beyond the editor's existing interactive-latency expectations (no new
perf-sensitive path introduced).

**Constraints**: Must not modify `packages/token-editor-contract/src/contract.ts` (shared file —
`Preview` is already a required field on `TokenTypeContract`, so this feature's contract object
supplies one without any change there). Must not modify `docs/backlog.md`'s claim line except
via `archive-task` at the end. `apps/web-app/lib/token-editors/built-in.ts` and root
`vitest.config.mts` are shared files two sibling in-flight features (`border`, `transition`)
also edit concurrently in separate worktrees — a merge conflict on rebase is expected and
handled by the coordinator, not by this feature avoiding the edit.

**Scale/Scope**: One new `token-core` module + test, one new `token-editor-*` package (Editor +
Preview + contract wiring + full test coverage), one registration edit in
`apps/web-app/lib/token-editors/built-in.ts`, one entry added to root `vitest.config.mts`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (DTCG Spec Compliance)**: `NumberValueSchema` models the 2025.10 Format spec's
  Number type exactly — `z.number()` (finite by default; Zod's `z.number()` already rejects
  `NaN`/`Infinity`/`-Infinity` since they fail `Number.isFinite`, matching FR-002). No deviation
  from spec. **PASS**.
- **Principle II/VII (Feature-Based Organization / Token-Editor Package Contract)**: schema +
  type definition live in `token-core` (`number.ts`); `Editor`, `Preview`, and contract wiring
  live in the new `token-editor-number` package; dependency direction is
  `token-editor-number → token-core`, never reversed. **PASS**.
- **Principle III (TypeScript Strictness)**: new package's `tsconfig.json` extends
  `tsconfig.base.json` unmodified, same as `token-editor-font-weight`. **PASS**.
- **Principle IV (Validation at the Edges)**: `NumberValueSchema.safeParse` is the single
  validation point (in the host's edit-commit path and in `Preview`'s own defensive re-parse of
  an untyped resolved value, matching `ColorPreview`/`FontWeightPreview`'s established pattern) —
  no redundant re-validation elsewhere. **PASS**.
- **Principle VIII (Minimal Dependencies)**: no new third-party dependency. The `Editor` is a
  plain `<input type="number">`, no keyword-alias picker needed (this type has none). **PASS** —
  nothing to flag.
- **Principle IX (Round-Trip Fidelity)**: `serializeValue: (value) => value` (identity, matching
  `dimensionTokenType`/`fontWeightTokenType` — the value's on-disk shape and in-memory shape are
  identical for this type). **PASS**.
- **Principle X (Component Granularity & Testing)**: `NumberEditor` and `NumberPreview` each get
  their own PascalCase folder (`src/components/NumberEditor/`, `src/components/NumberPreview/`)
  with co-located `.tsx`/`.test.tsx`/`.a11y.test.tsx`/`.module.css`, one component per file.
  **PASS**.
- **Principle XII (Design System Usage)**: `NumberPreview`'s styling uses `--dtcg-ed-*` custom
  properties only (matching `FontWeightPreview.module.css`'s existing pattern); `NumberEditor`'s
  markup reuses the same plain `<input>`/`<label>` structure `FontWeightEditor`/`DimensionEditor`
  already use (no design-system `Input` component exists yet for this pattern — established
  precedent, not an omission introduced by this feature). **PASS**.
- **Principle XIII (TDD, NON-NEGOTIABLE)**: `speckit-implement`'s `before_implement` hook
  (`speckit-tdd-run`) drives every behavior task test-first; this plan's task breakdown
  (`tasks.md`) orders each test task before its implementation task. **Gate deferred to
  `speckit-tdd-plan`/`speckit-tdd-run` during implementation — no violation anticipated.**

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/013-number-token-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TokenTypeContract wiring contract)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/token-core/src/
├── number.ts                         # NumberValueSchema + NumberValue (new)
├── number.test.ts                    # node:test unit coverage (new)
└── index.ts                          # + export NumberValueSchema/NumberValue (edit)

packages/token-editor-number/         # New package, mirrors token-editor-font-weight
├── package.json
├── tsconfig.json
├── vitest.setup.ts
├── vitest-a11y-tags.ts
├── src/
│   ├── index.ts
│   ├── token-type.ts                 # numberTokenType: TokenTypeContract<NumberValue>
│   ├── css-modules.d.ts
│   ├── vitest-env.d.ts
│   └── components/
│       ├── NumberEditor/
│       │   ├── NumberEditor.tsx
│       │   ├── NumberEditor.module.css
│       │   ├── NumberEditor.test.tsx
│       │   └── NumberEditor.a11y.test.tsx
│       └── NumberPreview/
│           ├── NumberPreview.tsx
│           ├── NumberPreview.module.css
│           ├── NumberPreview.test.tsx
│           └── NumberPreview.a11y.test.tsx

apps/web-app/lib/token-editors/built-in.ts   # register "number" (edit)
vitest.config.mts                             # add package to `packages` array (edit)
```

**Structure Decision**: Directly mirrors the `token-editor-font-weight` precedent
package-for-package, minus the alias picker (this type has no keyword aliases) — no new
structural pattern introduced. `token-core` remains the single owner of the type's schema; the
new `token-editor-number` package owns only editor UI + contract wiring, per Principle VII.

## Design Decisions

- **Editor: single plain number input, no unit/step affordance.** Unlike `dimension` (unit
  suffix) or `fontWeight` (alias picker), the DTCG Number type is a bare, unitless number with no
  secondary form — `NumberEditor` ships as a single `<input type="number" step="any">` (no
  `min`/`max`, since the spec places none; `step="any"` so fractional values like `0.5` for
  opacity aren't silently rounded by the browser's native stepping behavior). This is the
  smallest control that satisfies FR-003 for every valid `$value` (any finite number, any sign).
- **Validation rejects non-finite input at the DOM layer.** An `<input type="number">`'s `value`
  is always either a valid numeric string or `""` (browsers refuse to let a user type a
  non-numeric character into it); `NumberEditor`'s change handler parses via `Number(...)` and
  guards with `Number.isFinite`, matching `FontWeightEditor`'s `Number.isInteger` guard pattern
  but without the integer/range check — an empty or unparseable field does not call `onChange`
  (FR-004).
- **Preview renders raw value text, no formatting/rounding.** Matching `ColorPreview`/
  `FontWeightPreview`'s "show what's actually in `$value`" precedent: `NumberPreview` renders
  `String(value)` verbatim — no locale formatting, no fixed decimal places — so the preview never
  diverges from the underlying value the user actually wrote (Principle IX's round-trip-fidelity
  spirit applied to display, not just storage).
- **No new dependency.** Confirmed against Principle VIII: `zod`, `react`,
  `@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract` are all already-approved
  dependencies used identically to `token-editor-font-weight`.

## Complexity Tracking

_No Constitution Check violations — table omitted._
