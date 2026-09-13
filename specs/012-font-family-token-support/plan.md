# Implementation Plan: Font Family Token Editor Support

**Branch**: `worktree-font-family-token-support` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-font-family-token-support/spec.md`

## Summary

Add first-class editor support for the DTCG `fontFamily` token type. `token-core` gains a
`FontFamilyValueSchema` (Zod `z.union([z.string(), z.array(z.string())])`) plus its exported
inferred type, following `font-weight.ts`'s union-schema shape. A new package,
`packages/token-editor-font-family`, mirrors `token-editor-font-weight`'s structure: a
`FontFamilyEditor` component — a list editor for add/remove/reorder of family names, always
operating on the array form internally and promoting a single-string value to a one-item list on
load (User Stories 1 and 2) — a `FontFamilyPreview` component mirroring `ColorPreview`/
`FontWeightPreview`'s validate-then-render pattern, comma-joining entries and truncating long
stacks with a "+N more" indicator (User Story 3), and a `fontFamilyTokenType:
TokenTypeContract<FontFamilyValue>` wiring module. The new type is registered in
`apps/web-app/lib/token-editors/built-in.ts`'s `BUILT_IN_TOKEN_TYPES`/`builtInContractsByType`,
and the package is added to `vitest.config.mts`'s `packages` array so its component/a11y tests
run under the shared Vitest projects setup.

## Technical Context

**Language/Version**: TypeScript (strict, per Principle III), targeting the repo's existing
Node/React versions — no new runtime requirement.

**Primary Dependencies**: Zod (`token-core`'s `FontFamilyValueSchema`), React (`Editor`/`Preview`
components), `@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract`, and
`@dtcg-editor/design-system` (its `Input`/`Button` primitives, already approved and used
identically by `token-editor-color`) — all already-approved per Principle VII's one-way
dependency rule. No new third-party dependency — see Constitution Check (Principle VIII) below.

**Storage**: N/A — no persistence layer; tokens are edited in-memory / round-tripped through
existing `token-core` parse/serialize.

**Testing**: `node:test` for `token-core`'s schema unit test (`font-family.test.ts`, matching
`font-weight.test.ts`); Vitest + `@testing-library/react` (jsdom) for `FontFamilyEditor`/
`FontFamilyPreview` unit tests; Vitest Browser Mode + `axe-core` for the two components'
`.a11y.test.tsx` tiers — all per Principle X/Technology Stack, identical tooling to
`token-editor-font-weight`/`token-editor-color`.

**Target Platform**: Web (Next.js app, `apps/web-app`), same as every other token-editor package.

**Project Type**: Library package (`packages/token-editor-font-family`) consumed by the web app —
mirrors `token-editor-font-weight`'s project type exactly.

**Performance Goals**: N/A beyond the editor's existing interactive-latency expectations (no new
perf-sensitive path introduced).

**Constraints**: Must not modify `packages/token-editor-contract/src/contract.ts` (`Preview` is
already required on `TokenTypeContract` there — this feature's contract object supplies one, per
the task's explicit instruction not to weaken that requirement). Must not modify
`docs/backlog.md`'s claim line except via `archive-task` at the end. Shared-file edit
(`apps/web-app/lib/token-editors/built-in.ts`) is expected to conflict on rebase with a sibling
in-flight `strokeStyle` feature in another worktree — expected, handled at merge time, not
something to avoid here.

**Scale/Scope**: One new `token-core` module + test, one new `token-editor-*` package (Editor +
Preview + contract wiring + full test coverage), one registration edit in
`apps/web-app/lib/token-editors/built-in.ts`, one entry added to root `vitest.config.mts`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (DTCG Spec Compliance)**: `FontFamilyValueSchema` models the 2025.10 Format
  spec's Font Family type exactly — `z.union([z.string(), z.array(z.string())])`. No deviation
  from spec (an empty array is a valid, if unusual, array-of-strings). **PASS**.
- **Principle II/VII (Feature-Based Organization / Token-Editor Package Contract)**: schema +
  type definition live in `token-core` (`font-family.ts`); `Editor`, `Preview`, and contract
  wiring live in the new `token-editor-font-family` package; dependency direction is
  `token-editor-font-family → token-core`, never reversed. **PASS**.
- **Principle III (TypeScript Strictness)**: new package's `tsconfig.json` extends
  `tsconfig.base.json` unmodified, same as `token-editor-font-weight`. **PASS**.
- **Principle IV (Validation at the Edges)**: `FontFamilyValueSchema.safeParse` is the single
  validation point (`valueSchema` for the host's own validate-before-edit path, and `Preview`'s
  own defensive re-parse of an untyped resolved value, matching `ColorPreview`/
  `FontWeightPreview`'s established pattern) — no redundant re-validation elsewhere; the
  `Editor`'s own blank-entry guard (FR-004) is UI-level input hygiene, not schema
  re-validation. **PASS**.
- **Principle VIII (Minimal Dependencies)**: no new third-party dependency. The `Editor` reuses
  `@dtcg-editor/design-system`'s existing `Input`/`Button` primitives exactly as
  `token-editor-color` already does (`ChannelInput.tsx`, `ColorFunctionValue.tsx`) — no
  bespoke list/chip component is added to `design-system` since none of that package's existing
  components fit an ordered add/remove/reorder list, and building a general-purpose one there is
  out of this feature's scope; plain `<input>`/`<button>` composition inside
  `FontFamilyEditor` is the same level of abstraction `DimensionEditor`/`FontWeightEditor`
  already use for their own markup. **PASS** — nothing to flag.
- **Principle IX (Round-Trip Fidelity)**: `serializeValue: (value) => value` (identity, matching
  every other built-in type) — the editor's internal always-array representation is only an
  editing-time convenience; on commit, `FontFamilyEditor` calls `onChange` with a single string
  when the list has exactly one entry and with an array otherwise (FR-005), so an untouched
  single-string token's `$value` is never silently promoted to a one-item array. **PASS**.
- **Principle X (Component Granularity & Testing)**: `FontFamilyEditor` and `FontFamilyPreview`
  each get their own PascalCase folder (`src/components/FontFamilyEditor/`,
  `src/components/FontFamilyPreview/`) with co-located `.tsx`/`.test.tsx`/`.a11y.test.tsx`/
  `.module.css`, one component per file. **PASS**.
- **Principle XII (Design System Usage)**: `FontFamilyPreview`'s styling uses `--dtcg-ed-*`
  custom properties only (matching `ColorPreview.module.css`/`FontWeightPreview.module.css`'s
  existing pattern); `FontFamilyEditor` reuses `design-system`'s `Input` and `Button`
  components for its list rows and add/remove/reorder controls rather than reimplementing plain
  HTML form controls from scratch — a step further than `FontWeightEditor`'s bare
  `<input>`/`<select>`, since `design-system` does have fitting primitives here
  (`Input`, `Button`) that `token-editor-color` already established the precedent for reusing.
  **PASS**.
- **Principle XIII (TDD, NON-NEGOTIABLE)**: `speckit-tdd-plan` is run explicitly before
  `speckit-implement` (in addition to the `before_implement` hook) per the task's instruction;
  this plan's task breakdown (`tasks.md`) orders each test task before its implementation task,
  and every behavior (schema union/boundary cases, editor add/remove/reorder, preview
  render/decline) gets its own red-then-green cycle logged in `tdd/cycle-log.md`. **Gate
  deferred to `speckit-tdd-plan`/`speckit-tdd-run` during implementation — no violation
  anticipated.**

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/012-font-family-token-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TokenTypeContract wiring contract)
├── tdd/                 # speckit-tdd-plan output (test-list.md, cycle-log.md)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/token-core/src/
├── font-family.ts                    # FontFamilyValueSchema + FontFamilyValue (new)
├── font-family.test.ts               # node:test unit coverage (new)
└── index.ts                          # + export FontFamilyValueSchema/FontFamilyValue (edit)

packages/token-editor-font-family/    # New package, mirrors token-editor-font-weight
├── package.json
├── tsconfig.json
├── vitest.setup.ts
├── vitest-a11y-tags.ts
├── src/
│   ├── index.ts
│   ├── token-type.ts                 # fontFamilyTokenType: TokenTypeContract<FontFamilyValue>
│   ├── css-modules.d.ts
│   ├── vitest-env.d.ts
│   └── components/
│       ├── FontFamilyEditor/
│       │   ├── FontFamilyEditor.tsx
│       │   ├── FontFamilyEditor.module.css
│       │   ├── FontFamilyEditor.test.tsx
│       │   └── FontFamilyEditor.a11y.test.tsx
│       └── FontFamilyPreview/
│           ├── FontFamilyPreview.tsx
│           ├── FontFamilyPreview.module.css
│           ├── FontFamilyPreview.test.tsx
│           └── FontFamilyPreview.a11y.test.tsx

apps/web-app/lib/token-editors/built-in.ts   # register "fontFamily" (edit, shared file)
vitest.config.mts                             # add package to `packages` array (edit)
```

**Structure Decision**: Directly mirrors the `token-editor-font-weight` precedent package-for-
package — no new structural pattern introduced. `token-core` remains the single owner of the
type's schema; the new `token-editor-font-family` package owns only editor UI + contract wiring,
per Principle VII.

## Design Decisions

- **Single-string form is promoted to a one-item list in the Editor, not a separate
  single-input mode.** Rationale: both DTCG-permitted shapes (string, array of strings) describe
  the same underlying concept — a preference-ordered list of one-or-more names — and a single
  list UI that always operates on family *names* (never asking the user to think about which
  on-disk shape they're in) is simpler to build, test, and use than two editor modes with a
  switch between them. The one-item-list-is-really-a-string case is handled purely at the
  `onChange` boundary: `FontFamilyEditor` always renders a list (of length ≥ 0) and always calls
  `onChange` with an array when the list has 0 or ≥2 entries, and with a bare string when it has
  exactly 1 — this keeps `serializeValue` a trivial identity function and preserves Principle IX
  round-trip fidelity (an untouched single-string token stays a string; a user who explicitly
  grows a one-item list to two entries gets an array, matching FR-005/spec User Story 2).
  Alternative considered: a toggle between "single value" and "list" modes, mirroring how some
  editors expose a rare-shape switch explicitly — rejected as needless extra UI surface for a
  distinction the DTCG spec itself treats as authoring-convenience-only, not a meaningful
  behavioral difference to a user picking font names.
- **List editor reuses `design-system`'s `Input`/`Button`, no new drag-and-drop dependency.**
  Reordering is exposed via per-row "move up"/"move down" buttons (disabled at the ends) rather
  than pointer-drag reordering — simplest, keyboard- and screen-reader-accessible without adding
  a drag-and-drop library, consistent with Principle VIII (no new dependency) and Principle X's
  accessibility expectations (every control must be a11y-testable via `axe-core`, which a
  pointer-only drag interaction would fail without significant extra ARIA work out of scope
  here).
- **Blank/whitespace-only entries are rejected at commit, not merely on blur.** `FontFamilyEditor`
  validates trimmed non-emptiness before calling `onChange` for an add or an edit of an existing
  entry's text (FR-004) — matching the repo's existing "reject at the edge, don't silently
  coerce" convention (Principle IV) as seen in `FontWeightEditor`'s range guard.
- **Preview truncation limit: first 3 entries, then "+N more".** Matches spec Assumption
  ("more than 3 entries" counts as long) and gives a fixed, bounded preview width (SC-005)
  without hardcoding pixel widths — an entry-count cutoff, not a character-count one, since family
  names vary widely in length and a character cutoff would truncate differently-sized stacks
  inconsistently.
- **Preview declines to render (returns `null`) on schema mismatch.** Mirrors
  `ColorPreview`/`FontWeightPreview`'s validate-then-render pattern exactly (FR-007) — no new
  pattern introduced.
- **No new dependency.** Confirmed against Principle VIII: `zod`, `react`,
  `@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract`, and
  `@dtcg-editor/design-system` are all already-approved dependencies, the last used identically
  to `token-editor-color`'s existing `Input`/`Button` usage.

## Complexity Tracking

_No Constitution Check violations — table omitted._
