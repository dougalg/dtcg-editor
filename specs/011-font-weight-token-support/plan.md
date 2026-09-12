# Implementation Plan: Font Weight Token Editor Support

**Branch**: `worktree-font-weight-token-support` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-font-weight-token-support/spec.md`

## Summary

Add first-class editor support for the DTCG `fontWeight` token type. `token-core` gains a
`FontWeightValueSchema` (Zod `z.union` of an integer 1–1000 and the DTCG-defined keyword-alias
enum) plus its exported inferred type, following `dimension.ts`'s exact shape. A new package,
`packages/token-editor-font-weight`, mirrors `token-editor-dimension`'s structure: a
`FontWeightEditor` component (a number input, satisfying FR-003/FR-004; User Story 1), a
`FontWeightPreview` component mirroring `ColorPreview`'s read-only-literal-rendering pattern
(User Story 2), and a `fontWeightTokenType: TokenTypeContract<FontWeightValue>` wiring module.
The new type is registered in `apps/web-app/lib/token-editors/built-in.ts`'s
`BUILT_IN_TOKEN_TYPES`/`builtInContractsByType`, and the package is added to
`vitest.config.mts`'s `packages` array so its component/a11y tests run under the shared
Vitest projects setup.

## Technical Context

**Language/Version**: TypeScript (strict, per Principle III), targeting the repo's existing
Node/React versions — no new runtime requirement.

**Primary Dependencies**: Zod (`token-core`'s `FontWeightValueSchema`), React (`Editor`/`Preview`
components), `@dtcg-editor/token-core` and `@dtcg-editor/token-editor-contract` (both already
approved, per Principle VII's one-way dependency rule). No new third-party dependency — see
Constitution Check (Principle VIII) below.

**Storage**: N/A — no persistence layer; tokens are edited in-memory / round-tripped through
existing `token-core` parse/serialize.

**Testing**: `node:test` for `token-core`'s schema unit test (`font-weight.test.ts`, matching
`dimension.test.ts`); Vitest + `@testing-library/react` (jsdom) for `FontWeightEditor`/
`FontWeightPreview` unit tests; Vitest Browser Mode + `axe-core` for the two components'
`.a11y.test.tsx` tiers — all per Principle X/Technology Stack, identical tooling to
`token-editor-dimension`/`token-editor-color`.

**Target Platform**: Web (Next.js app, `apps/web-app`), same as every other token-editor package.

**Project Type**: Library package (`packages/token-editor-font-weight`) consumed by the web app —
mirrors `token-editor-dimension`'s project type exactly.

**Performance Goals**: N/A beyond the editor's existing interactive-latency expectations (no
new perf-sensitive path introduced).

**Constraints**: Must not modify `packages/token-editor-contract/src/contract.ts` (shared file
two sibling in-flight features also touch — `Preview` is already optional on
`TokenTypeContract`, so this feature's contract object can supply `Preview` without any change
there). Must not modify `docs/backlog.md`'s claim line except via `archive-task` at the end.

**Scale/Scope**: One new `token-core` module + test, one new `token-editor-*` package (Editor +
Preview + contract wiring + full test coverage), one registration edit in
`apps/web-app/lib/token-editors/built-in.ts`, one entry added to root `vitest.config.mts`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (DTCG Spec Compliance)**: `FontWeightValueSchema` models the 2025.10 Format
  spec's Font Weight type exactly — `z.union([z.number().int().min(1).max(1000), z.enum([...18
  aliases])])`. No deviation from spec. **PASS**.
- **Principle II/VII (Feature-Based Organization / Token-Editor Package Contract)**: schema +
  type definition live in `token-core` (`font-weight.ts`); `Editor`, `Preview`, and contract
  wiring live in the new `token-editor-font-weight` package; dependency direction is
  `token-editor-font-weight → token-core`, never reversed. **PASS**.
- **Principle III (TypeScript Strictness)**: new package's `tsconfig.json` extends
  `tsconfig.base.json` unmodified, same as `token-editor-dimension`. **PASS**.
- **Principle IV (Validation at the Edges)**: `FontWeightValueSchema.safeParse` is the single
  validation point (in `valueSchema`/`Editor`'s host-side validation call and in `Preview`'s own
  defensive re-parse of an untyped resolved value, matching `ColorPreview`'s established
  pattern) — no redundant re-validation elsewhere. **PASS**.
- **Principle VIII (Minimal Dependencies)**: no new third-party dependency. The `Editor` is a
  plain `<input type="number">` (User Story 1/2, required); a keyword-alias `<select>` (User
  Story 3, nice-to-have) uses a plain HTML `<select>` exactly like `DimensionEditor`'s unit
  picker — no new dependency either way. **PASS** — nothing to flag.
- **Principle IX (Round-Trip Fidelity)**: `serializeValue: (value) => value` (identity, matching
  `dimensionTokenType`/`colorTokenType` — the value's on-disk shape and in-memory shape are
  identical for this type, number or string). **PASS**.
- **Principle X (Component Granularity & Testing)**: `FontWeightEditor` and `FontWeightPreview`
  each get their own PascalCase folder
  (`src/components/FontWeightEditor/`, `src/components/FontWeightPreview/`) with co-located
  `.tsx`/`.test.tsx`/`.a11y.test.tsx`/`.module.css`, one component per file. **PASS**.
- **Principle XII (Design System Usage)**: `FontWeightPreview`'s styling uses
  `--dtcg-ed-*` custom properties only (e.g. `var(--dtcg-ed-font-mono)`, matching
  `ColorPreview.module.css`'s existing pattern); `FontWeightEditor`'s markup reuses the same
  plain `<input>`/`<label>`/`<select>` structure `DimensionEditor` already uses (no
  design-system `Input`/`Select` component exists yet for this pattern — `DimensionEditor` is
  the established precedent, not a design-system component omission introduced by this
  feature). **PASS**.
- **Principle XIII (TDD, NON-NEGOTIABLE)**: `speckit-implement`'s `before_implement` hook
  (`speckit-tdd-run`) drives every behavior task test-first; this plan's task breakdown
  (`tasks.md`) orders each test task before its implementation task. **Gate deferred to
  `speckit-tdd-plan`/`speckit-tdd-run` during implementation — no violation anticipated.**

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/011-font-weight-token-support/
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
├── font-weight.ts                    # FontWeightValueSchema + FontWeightValue (new)
├── font-weight.test.ts               # node:test unit coverage (new)
└── index.ts                          # + export FontWeightValueSchema/FontWeightValue (edit)

packages/token-editor-font-weight/    # New package, mirrors token-editor-dimension
├── package.json
├── tsconfig.json
├── vitest.setup.ts
├── vitest-a11y-tags.ts
├── src/
│   ├── index.ts
│   ├── token-type.ts                 # fontWeightTokenType: TokenTypeContract<FontWeightValue>
│   ├── css-modules.d.ts
│   ├── vitest-env.d.ts
│   └── components/
│       ├── FontWeightEditor/
│       │   ├── FontWeightEditor.tsx
│       │   ├── FontWeightEditor.module.css
│       │   ├── FontWeightEditor.test.tsx
│       │   └── FontWeightEditor.a11y.test.tsx
│       └── FontWeightPreview/
│           ├── FontWeightPreview.tsx
│           ├── FontWeightPreview.module.css
│           ├── FontWeightPreview.test.tsx
│           └── FontWeightPreview.a11y.test.tsx

apps/web-app/lib/token-editors/built-in.ts   # register "fontWeight" (edit)
vitest.config.mts                             # add package to `packages` array (edit)
```

**Structure Decision**: Directly mirrors the `token-editor-dimension` precedent package-for-
package — no new structural pattern introduced. `token-core` remains the single owner of the
type's schema; the new `token-editor-font-weight` package owns only editor UI + contract wiring,
per Principle VII.

## Design Decisions

- **Editor: number input only, no alias dropdown in v1.** The task's explicit scope statement
  ("a plain number input satisfying the schema is enough for v1... use your judgment") together
  with spec Assumption 1 settles this: `FontWeightEditor` ships as a single
  `<input type="number" min="1" max="1000" step="1">`, matching `DimensionEditor`'s
  `value`-field pattern. A keyword-alias `<select>` (User Story 3 / FR-007) is captured in
  `tasks.md` as an explicit, separately-orderable task so it can be included in this pass or
  deferred without re-planning, but the feature is complete without it. Rationale: the DTCG
  spec makes the alias form optional syntax sugar over the same underlying integer scale (each
  alias has a well-known equivalent numeric weight, e.g. `bold` = 700) — a number input alone
  already lets a user express every valid `$value` the integer branch allows, and covers 100% of
  spec-valid input via typing (the alias branch is a convenience, not a capability gap).
- **Alias-to-number mapping only used for display, not enforced.** If the alias dropdown is
  implemented, selecting an alias writes the literal alias string as `$value` (FR-007's own
  acceptance criterion), never a converted number — no lossy conversion between the two forms is
  invented.
- **Preview renders raw value text, no numeric-to-alias (or reverse) translation.** Matching
  `ColorPreview`'s "show what's actually in `$value`" precedent: a numeric `$value` renders as
  its number (e.g. `"700"`), an alias `$value` renders as its string (e.g. `"bold"`) — this
  satisfies spec Acceptance Scenarios 2.1/2.2 without inventing a translation table between the
  two forms, which the DTCG spec does not require and which would make Preview's rendering
  diverge from the underlying value the user actually wrote (Principle IX's round-trip-fidelity
  spirit: only what's asked for should be transformed).
- **No new dependency.** Confirmed against Principle VIII: `zod`, `react`, `@dtcg-editor/token-core`,
  `@dtcg-editor/token-editor-contract` are all already-approved dependencies used identically to
  `token-editor-dimension`.

## Complexity Tracking

_No Constitution Check violations — table omitted._
