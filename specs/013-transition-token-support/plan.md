# Implementation Plan: Transition Token Editor Support

**Branch**: `worktree-transition-token-support` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-transition-token-support/spec.md`

## Summary

Add first-class editor support for the DTCG `transition` composite token type. `token-core` gains
a `TransitionValueSchema` (`z.object({ duration: DurationValueSchema, delay: DurationValueSchema,
timingFunction: CubicBezierValueSchema })`), composed entirely from the three existing sub-schemas
already exported by `token-core` (`DurationValueSchema` for both `duration` and `delay`,
`CubicBezierValueSchema` for `timingFunction`) — no new leaf validation logic is written. A new
package, `packages/token-editor-transition`, provides a `TransitionEditor` that embeds the real,
already-shipped `DurationEditor` (from `@dtcg-editor/token-editor-duration`, instantiated twice —
once for `duration`, once for `delay`, each independently wired and clearly labeled) and the real
`CubicBezierEditor` (from `@dtcg-editor/token-editor-cubic-bezier`, for `timingFunction`), wired via
plain prop drilling rather than reimplementing bespoke sub-controls. `TransitionPreview` similarly
embeds `DurationPreview` and `CubicBezierPreview` where doing so keeps the result to one short
line, only inlining the delay when it's non-zero. A `transitionTokenType:
TokenTypeContract<TransitionValue>` wiring module ties it together. The new type is registered in
`apps/web-app/lib/token-editors/built-in.ts`'s `BUILT_IN_TOKEN_TYPES`/`builtInContractsByType`
(a shared file also being edited concurrently by sibling `number`/`border` feature work — a
rebase-time conflict there is expected and handled by the coordinator, not by this feature), and
the package is added to `vitest.config.mts`'s `packages` array.

## Technical Context

**Language/Version**: TypeScript (strict, per Principle III), targeting the repo's existing
Node/React versions — no new runtime requirement.

**Primary Dependencies**: Zod (`token-core`'s `TransitionValueSchema`, composed from
`DurationValueSchema`/`CubicBezierValueSchema`), React, `@dtcg-editor/token-core`,
`@dtcg-editor/token-editor-contract`, and — new for this feature —
`@dtcg-editor/token-editor-duration` and `@dtcg-editor/token-editor-cubic-bezier` as real
`workspace:*` runtime dependencies of `token-editor-transition`, so its `TransitionEditor`/
`TransitionPreview` can embed those packages' actual `DurationEditor`/`DurationPreview`/
`CubicBezierEditor`/`CubicBezierPreview` components directly. See Constitution Check (Principle
VIII) below for why this inter-`token-editor-*` dependency is justified rather than treated as an
unapproved dependency addition.

**Storage**: N/A — no persistence layer; tokens are edited in-memory / round-tripped through
existing `token-core` parse/serialize.

**Testing**: `node:test` for `token-core`'s schema unit test (`transition.test.ts`, matching
`duration.test.ts`/`cubic-bezier.test.ts`'s style); Vitest + `@testing-library/react` (jsdom) for
`TransitionEditor`/`TransitionPreview` unit tests, including tests that specifically assert the
two embedded `DurationEditor` instances (duration vs. delay) never cross-talk; Vitest Browser Mode
+ `axe-core` for both components' `.a11y.test.tsx` tiers — all per Principle X/Technology Stack,
identical tooling to every other `token-editor-*` package.

**Target Platform**: Web (Next.js app, `apps/web-app`), same as every other token-editor package.

**Project Type**: Library package (`packages/token-editor-transition`) consumed by the web app.

**Performance Goals**: N/A beyond the editor's existing interactive-latency expectations.

**Constraints**: Must not modify `packages/token-editor-contract/src/contract.ts` — `Preview` is
already required on `TokenTypeContract` there, and this feature's contract object supplies one.
Must not modify `packages/token-editor-duration` or `packages/token-editor-cubic-bezier`
themselves — only consume their existing exported `Editor`/`Preview` components and
`token-core` schemas. Must not modify `docs/backlog.md`'s claim line except via `archive-task` at
the end. Shared-file edit (`apps/web-app/lib/token-editors/built-in.ts`) is expected to conflict
on rebase with sibling in-flight `number`/`border` features in other worktrees — expected, handled
at merge time by the coordinator, not something to avoid here.

**Scale/Scope**: One new `token-core` module + test, one new `token-editor-*` package (Editor +
Preview + contract wiring + full test coverage, embedding two sibling packages' components), one
registration edit in `apps/web-app/lib/token-editors/built-in.ts`, one entry added to root
`vitest.config.mts`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (DTCG Spec Compliance)**: `TransitionValueSchema` models the 2025.10 Format
  spec's Transition type exactly — an object of `duration`, `delay` (both Duration values) and
  `timingFunction` (a CubicBezier value), with no additional or omitted required fields. No
  deviation from spec. **PASS**.
- **Principle II/VII (Feature-Based Organization / Token-Editor Package Contract)**: schema +
  type definition live in `token-core` (`transition.ts`), composed from the existing
  `DurationValueSchema`/`CubicBezierValueSchema` rather than redefined; `Editor`, `Preview`, and
  contract wiring live in the new `token-editor-transition` package; dependency direction is
  `token-editor-transition → token-core`, never reversed. **PASS**.
- **Principle III (TypeScript Strictness)**: new package's `tsconfig.json` extends
  `tsconfig.base.json` unmodified, matching every other `token-editor-*` package. **PASS**.
- **Principle IV (Validation at the Edges)**: `TransitionValueSchema.safeParse` is the single
  validation point (the contract's `valueSchema` for the host's validate-before-edit path, and
  `TransitionPreview`'s own defensive re-parse of an untyped resolved value, matching
  `DurationPreview`/`CubicBezierPreview`'s established pattern) — no redundant re-validation
  elsewhere; the embedded sub-editors receive already-typed `DurationValue`/`CubicBezierValue`
  slices, so they do no re-validation of their own beyond what they already do standalone.
  **PASS**.
- **Principle VIII (Minimal Dependencies)**: no new *third-party* dependency. This feature does
  add two new *internal* (`workspace:*`) dependencies —
  `token-editor-transition → token-editor-duration` and
  `token-editor-transition → token-editor-cubic-bezier` — which is new for this repo (no
  `token-editor-*` package has previously depended on a sibling `token-editor-*` package rather
  than only on `token-core`/`token-editor-contract`). Justification, per this principle's
  "named and justified before being added" requirement: `duration` and `cubicBezier` already have
  complete, tested, accessible editors; a `transition` value is *entirely* composed of values
  those editors already handle correctly, so reimplementing lightweight duration/cubic-bezier
  input controls a second (and third) time inside `token-editor-transition` would duplicate
  behavior (numeric parsing, unit selection, control-point clamping) those packages already own
  and independently test, which is the same kind of duplication Principle X/XII already prohibit
  for design-system components — just one level up, between editor packages instead of within
  one. The alternative (hand-rolled bespoke sub-controls, as an ordinary `token-editor-*` package
  would use for a primitive type) was considered and rejected specifically because both sibling
  editors already exist, are already the source of truth for how a user edits a duration or a
  cubic bezier anywhere else in the app, and a `transition` token's own duration/delay/timing
  fields should look and behave identically to standalone `duration`/`cubicBezier` tokens rather
  than drift via a second implementation. This is a deliberate, repo-wide architectural direction
  for every DTCG composite type (`border`, `transition`, `shadow`, `gradient`, `typography`), not
  a one-off exception. **PASS, with the above internal-dependency rationale recorded per
  Principle VIII.**
- **Principle IX (Round-Trip Fidelity)**: `serializeValue: (value) => value` (identity, matching
  every other built-in type) — `TransitionEditor` never restructures the three-field object shape,
  only ever replaces one field at a time via `{ ...value, [field]: next }`, so an untouched token
  is never altered and an edit to one field never perturbs the other two on disk. **PASS**.
- **Principle X (Component Granularity & Testing)**: `TransitionEditor` and `TransitionPreview`
  each get their own PascalCase folder (`src/components/TransitionEditor/`,
  `src/components/TransitionPreview/`) with co-located `.tsx`/`.test.tsx`/`.a11y.test.tsx`/
  `.module.css`, one component per file. Embedding `DurationEditor` twice inside
  `TransitionEditor` does not violate "one component per file" — `TransitionEditor` is still the
  sole component *defined* in its file; it merely renders two instances of an already-defined,
  already-tested sibling component, the same way any component renders other components as
  children. **PASS**.
- **Principle XII (Design System Usage)**: `TransitionEditor`'s own markup (the wrapping
  container and the two field labels distinguishing "Duration" from "Delay") uses `--dtcg-ed-*`
  custom properties only, matching `DurationEditor.module.css`/`CubicBezierEditor.module.css`'s
  existing pattern; no hardcoded design values. **PASS**.
- **Principle XIII (TDD, NON-NEGOTIABLE)**: `speckit-tdd-plan` is run explicitly before
  `speckit-implement` (in addition to the `before_implement` hook) per the task's instruction;
  this plan's task breakdown (`tasks.md`) orders each test task before its implementation task,
  and every behavior (schema composition/nesting, editor delegation per sub-field including the
  duration-vs-delay non-cross-talk case, preview render/decline) gets its own red-then-green cycle
  logged in `tdd/cycle-log.md`. **Gate deferred to `speckit-tdd-plan`/`speckit-tdd-run` during
  implementation — no violation anticipated.**

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/013-transition-token-support/
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
├── transition.ts                     # TransitionValueSchema + TransitionValue (new)
├── transition.test.ts                # node:test unit coverage (new)
└── index.ts                          # + export TransitionValueSchema/TransitionValue (edit)

packages/token-editor-transition/     # New package
├── package.json                      # depends on token-editor-duration + token-editor-cubic-bezier
├── tsconfig.json
├── vitest.setup.ts
├── vitest-a11y-tags.ts
├── src/
│   ├── index.ts
│   ├── token-type.ts                 # transitionTokenType: TokenTypeContract<TransitionValue>
│   ├── css-modules.d.ts
│   ├── vitest-env.d.ts
│   └── components/
│       ├── TransitionEditor/
│       │   ├── TransitionEditor.tsx          # embeds DurationEditor x2 + CubicBezierEditor
│       │   ├── TransitionEditor.module.css
│       │   ├── TransitionEditor.test.tsx
│       │   └── TransitionEditor.a11y.test.tsx
│       └── TransitionPreview/
│           ├── TransitionPreview.tsx         # embeds DurationPreview + CubicBezierPreview
│           ├── TransitionPreview.module.css
│           ├── TransitionPreview.test.tsx
│           └── TransitionPreview.a11y.test.tsx

apps/web-app/lib/token-editors/built-in.ts   # register "transition" (edit, shared file)
vitest.config.mts                             # add package to `packages` array (edit)
```

**Structure Decision**: Follows the established `token-editor-*` package shape (Editor + Preview
+ contract wiring, one component per PascalCase folder), with the one deliberate structural
addition described above: real `workspace:*` dependencies on two sibling `token-editor-*`
packages, so their `Editor`/`Preview` components are embedded directly rather than reimplemented.

## Design Decisions

- **Embed the real sibling `Editor`/`Preview` components, not copies or thin wrappers.**
  `TransitionEditor` imports `DurationEditor` and `CubicBezierEditor` directly and renders:
  ```tsx
  <DurationEditor
    value={value.duration}
    onChange={(duration) => onChange({ ...value, duration })}
  />
  <DurationEditor
    value={value.delay}
    onChange={(delay) => onChange({ ...value, delay })}
  />
  <CubicBezierEditor
    value={value.timingFunction}
    onChange={(timingFunction) => onChange({ ...value, timingFunction })}
  />
  ```
  Each `onChange` closure captures only its own field, so an edit to one sub-field's
  `TokenTypeEditorProps.onChange` call spreads the *current* `value` and replaces only that key —
  the other two fields are structurally untouched (not merely unedited by user action), which is
  what makes the "duration edit never bleeds into delay" acceptance scenario (spec User Story 1,
  scenario 5) a property of the wiring itself rather than something that only happens to hold
  today. Alternative considered: re-deriving lightweight bespoke duration/cubic-bezier controls
  scoped to `token-editor-transition` — rejected per the Principle VIII rationale above.
- **Distinguishing the two `DurationEditor` instances: explicit text labels, not component
  props.** `DurationEditor` itself takes no `label`/`name` prop (per its existing, unmodified
  contract in `token-editor-duration` — this feature must not change that package). Disambiguation
  is done entirely in `TransitionEditor`'s own markup: each `DurationEditor` instance is wrapped
  in a `<div>`/`<span>` with a preceding visible text label ("Duration" / "Delay") and an
  `aria-label`/`id`+`htmlFor` association on that wrapper for the a11y tier, so a screen-reader
  user gets the same disambiguation a sighted user gets from layout order and label text. This
  was flagged as a candidate open design question in the task brief; resolved without escalation
  because it doesn't require touching `token-editor-duration`'s own component, only how
  `token-editor-transition` labels the two slots it renders that component into.
- **`TransitionPreview` inlines duration + timing function; delay only when non-zero.** Rationale
  mirrors spec User Story 2 / SC-004: a composite preview must still read as one short line
  (Constitution/spec precedent from every other `Preview`), and `delay: 0` is the overwhelmingly
  common case for a transition token, so surfacing it unconditionally would make the common case
  noisier for no informational gain. `TransitionPreview` re-validates with
  `TransitionValueSchema.safeParse` (declining/`null` on mismatch, matching every other `Preview`)
  and then composes its line using `DurationValueSchema`/`CubicBezierValueSchema`-shaped data it
  already has in hand — it does not need to re-invoke the sibling `DurationPreview`/
  `CubicBezierPreview` React components at runtime (which each independently re-parse from
  `unknown` and are designed for standalone contexts), but does reuse their exact formatting
  logic/output shape (`{value}{unit}` for duration, `cubic-bezier(...)` for the timing function)
  so the composite line reads identically to what a user already sees for the corresponding
  standalone token types. Alternative considered: literally rendering `<DurationPreview
  value={value.duration} />` and `<CubicBezierPreview value={value.timingFunction} />` inside
  `TransitionPreview`'s JSX — viable and arguably more literal "embedding," but each of those
  renders its own `<span>` with its own module's CSS class, which the layout/compact-line
  requirement (SC-004: always one line, delay conditionally included) makes awkward to
  conditionally join with plain text ("," / at) around them cleanly; matching their formatting
  output instead of their JSX shells keeps `TransitionPreview` in full control of the one-line
  layout. This is a judgment call the task explicitly delegated ("use your judgment on layout").
- **No new third-party dependency.** Confirmed against Principle VIII: `zod`, `react`,
  `@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract` are already-approved; the two
  new dependencies (`@dtcg-editor/token-editor-duration`, `@dtcg-editor/token-editor-cubic-bezier`)
  are internal workspace packages, not third-party, and are justified above.

## Complexity Tracking

_No Constitution Check violations — table omitted. The internal `token-editor-* →
token-editor-*` dependency is a new pattern for this repo, not a violation; its rationale is
recorded under Principle VIII above per the task's explicit instruction._
