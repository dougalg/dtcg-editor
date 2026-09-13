# Implementation Plan: Typography Token Editor Support

**Branch**: `worktree-typography-token-support` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-typography-token-support/spec.md`

## Summary

Add first-class editor support for the DTCG `typography` composite token type. `token-core` gains
a `TypographyValueSchema` (`z.object({ fontFamily: FontFamilyValueSchema, fontSize:
DimensionValueSchema, fontWeight: FontWeightValueSchema, letterSpacing: DimensionValueSchema,
lineHeight: z.number() })`), composed entirely from three existing sub-schemas already exported by
`token-core` plus one bare `z.number()` for `lineHeight` (which per the 2025.10 spec is a unitless
multiplier, not a Dimension) — no new leaf validation logic beyond that one primitive. A new
package, `packages/token-editor-typography`, provides a `TypographyEditor` that embeds the real,
already-shipped `FontFamilyEditor` (`@dtcg-editor/token-editor-font-family`), `DimensionEditor`
(`@dtcg-editor/token-editor-dimension`, instantiated twice — once for `fontSize`, once for
`letterSpacing`, each independently wired, wrapped in its own `<fieldset>`/`<legend>`),
`FontWeightEditor` (`@dtcg-editor/token-editor-font-weight`), and `NumberEditor`
(`@dtcg-editor/token-editor-number`, for `lineHeight`) — wired via plain prop drilling rather than
reimplementing bespoke sub-controls. `TypographyPreview` composes a short one-line summary (e.g.
`16px/1.4 Arial 700`) matching the sibling `Preview` components' own formatting conventions. A
`typographyTokenType: TokenTypeContract<TypographyValue>` wiring module ties it together. The new
type is registered in `apps/web-app/lib/token-editors/built-in.ts`'s
`BUILT_IN_TOKEN_TYPES`/`builtInContractsByType` (a shared file also being edited concurrently by a
sibling `shadow` feature in another worktree — a rebase-time conflict there is expected and
handled by the coordinator, not by this feature), and the package is added to
`vitest.config.mts`'s `packages` array.

## Technical Context

**Language/Version**: TypeScript (strict, per Principle III), targeting the repo's existing
Node/React versions — no new runtime requirement.

**Primary Dependencies**: Zod (`token-core`'s `TypographyValueSchema`, composed from
`FontFamilyValueSchema`/`DimensionValueSchema`/`FontWeightValueSchema` plus a bare `z.number()`),
React, `@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract`, and — new for this feature
— `@dtcg-editor/token-editor-font-family`, `@dtcg-editor/token-editor-dimension`,
`@dtcg-editor/token-editor-font-weight`, and `@dtcg-editor/token-editor-number` as real
`workspace:*` runtime dependencies of `token-editor-typography`, so its `TypographyEditor` can
embed those packages' actual `Editor` components directly. See Constitution Check (Principle
VIII) below for why this inter-`token-editor-*` dependency is justified rather than treated as an
unapproved dependency addition.

**Storage**: N/A — no persistence layer; tokens are edited in-memory / round-tripped through
existing `token-core` parse/serialize.

**Testing**: `node:test` for `token-core`'s schema unit test (`typography.test.ts`, matching
`border.test.ts`/`transition.test.ts`'s style); Vitest + `@testing-library/react` (jsdom) for
`TypographyEditor`/`TypographyPreview` unit tests, including tests that specifically assert the
two embedded `DimensionEditor` instances (fontSize vs. letterSpacing) never cross-talk; Vitest
Browser Mode + `axe-core` for both components' `.a11y.test.tsx` tiers — all per Principle
X/Technology Stack, identical tooling to every other `token-editor-*` package.

**Target Platform**: Web (Next.js app, `apps/web-app`), same as every other token-editor package.

**Project Type**: Library package (`packages/token-editor-typography`) consumed by the web app.

**Performance Goals**: N/A beyond the editor's existing interactive-latency expectations.

**Constraints**: Must not modify `packages/token-editor-contract/src/contract.ts` — `Preview` is
already required on `TokenTypeContract` there, and this feature's contract object supplies one.
Must not modify `packages/token-editor-font-family`, `packages/token-editor-dimension`,
`packages/token-editor-font-weight`, or `packages/token-editor-number` themselves — only consume
their existing exported `Editor`/`Preview` components and `token-core` schemas. Must not modify
`docs/backlog.md`'s claim line except via `archive-task` at the end. Shared-file edit
(`apps/web-app/lib/token-editors/built-in.ts`) is expected to conflict on rebase with the sibling
in-flight `shadow` feature in another worktree — expected, handled at merge time by the
coordinator, not something to avoid here.

**Scale/Scope**: One new `token-core` module + test, one new `token-editor-*` package (Editor +
Preview + contract wiring + full test coverage, embedding four sibling packages' components), one
registration edit in `apps/web-app/lib/token-editors/built-in.ts`, one entry added to root
`vitest.config.mts`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (DTCG Spec Compliance)**: `TypographyValueSchema` models the 2025.10 Format
  spec's Typography type exactly — an object of `fontFamily`, `fontSize`, `fontWeight`,
  `letterSpacing`, `lineHeight`, with `lineHeight` modeled as a bare unitless `z.number()` per
  spec (not a Dimension value, despite superficially looking like one) — with no additional or
  omitted required fields. No deviation from spec. **PASS**.
- **Principle II/VII (Feature-Based Organization / Token-Editor Package Contract)**: schema +
  type definition live in `token-core` (`typography.ts`), composed from the existing
  `FontFamilyValueSchema`/`DimensionValueSchema`/`FontWeightValueSchema` rather than redefined;
  `Editor`, `Preview`, and contract wiring live in the new `token-editor-typography` package;
  dependency direction is `token-editor-typography → token-core`, never reversed. **PASS**.
- **Principle III (TypeScript Strictness)**: new package's `tsconfig.json` extends
  `tsconfig.base.json` unmodified, matching every other `token-editor-*` package. **PASS**.
- **Principle IV (Validation at the Edges)**: `TypographyValueSchema.safeParse` is the single
  validation point (the contract's `valueSchema` for the host's validate-before-edit path, and
  `TypographyPreview`'s own defensive re-parse of an untyped resolved value, matching
  `TransitionPreview`/`BorderPreview`'s established pattern) — no redundant re-validation
  elsewhere; the embedded sub-editors receive already-typed value slices (`FontFamilyValue`,
  `DimensionValue`, `FontWeightValue`, `number`), so they do no re-validation of their own beyond
  what they already do standalone. **PASS**.
- **Principle VIII (Minimal Dependencies)**: no new *third-party* dependency. This feature adds
  four new *internal* (`workspace:*`) dependencies — `token-editor-typography →
  token-editor-font-family`, `→ token-editor-dimension`, `→ token-editor-font-weight`, `→
  token-editor-number` — continuing the pattern `token-editor-border`/`token-editor-transition`
  already established for this repo. Justification, per this principle's "named and justified
  before being added" requirement: `fontFamily`, `dimension`, `fontWeight`, and `number` each
  already have complete, tested, accessible editors; a `typography` value is *entirely* composed
  of values those editors already handle correctly, so reimplementing lightweight input controls
  a second time inside `token-editor-typography` would duplicate behavior (font-family stack
  parsing, unit selection, keyword-alias handling, numeric input) those packages already own and
  independently test — the same reuse argument already accepted for `border`/`transition`. The
  alternative (hand-rolled bespoke sub-controls) was considered and rejected for the same reason:
  a `typography` token's own font-family/size/weight/spacing fields should look and behave
  identically to standalone tokens of those types rather than drift via a second implementation.
  This is a deliberate, repo-wide architectural direction for every DTCG composite type (`border`,
  `transition`, `shadow`, `gradient`, `typography`), not a one-off exception. **PASS, with the
  above internal-dependency rationale recorded per Principle VIII.**
- **Principle IX (Round-Trip Fidelity)**: `serializeValue: (value) => value` (identity, matching
  every other built-in type) — `TypographyEditor` never restructures the five-field object shape,
  only ever replaces one field at a time via `{ ...value, [field]: next }`, so an untouched token
  is never altered and an edit to one field never perturbs the other four on disk. **PASS**.
- **Principle X (Component Granularity & Testing)**: `TypographyEditor` and `TypographyPreview`
  each get their own PascalCase folder (`src/components/TypographyEditor/`,
  `src/components/TypographyPreview/`) with co-located `.tsx`/`.test.tsx`/`.a11y.test.tsx`/
  `.module.css`, one component per file. Embedding `DimensionEditor` twice inside
  `TypographyEditor` does not violate "one component per file" — `TypographyEditor` is still the
  sole component *defined* in its file; it merely renders instances of already-defined,
  already-tested sibling components. **PASS**.
- **Principle XII (Design System Usage)**: `TypographyEditor`'s own markup (the wrapping
  container, the fieldset/legend groups distinguishing "Font Size" from "Letter Spacing") uses
  `--dtcg-ed-*` custom properties only, matching `TransitionEditor.module.css`'s existing pattern;
  no hardcoded design values. **PASS**.
- **Principle XIII (TDD, NON-NEGOTIABLE)**: `speckit-tdd-plan` is run explicitly before
  `speckit-implement` (in addition to the `before_implement` hook) per the task's instruction;
  this plan's task breakdown (`tasks.md`) orders each test task before its implementation task,
  and every behavior (schema composition/nesting of five sub-schemas, editor delegation per
  sub-field including the fontSize-vs-letterSpacing non-cross-talk case, preview render/decline)
  gets its own red-then-green cycle logged in `tdd/cycle-log.md`. **Gate deferred to
  `speckit-tdd-plan`/`speckit-tdd-run` during implementation — no violation anticipated.**

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/014-typography-token-support/
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
├── typography.ts                     # TypographyValueSchema + TypographyValue (new)
├── typography.test.ts                # node:test unit coverage (new)
└── index.ts                          # + export TypographyValueSchema/TypographyValue (edit)

packages/token-editor-typography/     # New package
├── package.json                      # depends on font-family/dimension/font-weight/number editors
├── tsconfig.json
├── vitest.setup.ts
├── vitest-a11y-tags.ts
├── src/
│   ├── index.ts
│   ├── token-type.ts                 # typographyTokenType: TokenTypeContract<TypographyValue>
│   ├── css-modules.d.ts
│   ├── vitest-env.d.ts
│   └── components/
│       ├── TypographyEditor/
│       │   ├── TypographyEditor.tsx          # embeds FontFamilyEditor, DimensionEditor x2,
│       │   │                                 # FontWeightEditor, NumberEditor
│       │   ├── TypographyEditor.module.css
│       │   ├── TypographyEditor.test.tsx
│       │   └── TypographyEditor.a11y.test.tsx
│       └── TypographyPreview/
│           ├── TypographyPreview.tsx         # composed short-text summary
│           ├── TypographyPreview.module.css
│           ├── TypographyPreview.test.tsx
│           └── TypographyPreview.a11y.test.tsx

apps/web-app/lib/token-editors/built-in.ts   # register "typography" (edit, shared file)
vitest.config.mts                             # add package to `packages` array (edit)
```

**Structure Decision**: Follows the established `token-editor-*` package shape (Editor + Preview
+ contract wiring, one component per PascalCase folder), with the same deliberate structural
addition `border`/`transition` already made: real `workspace:*` dependencies on sibling
`token-editor-*` packages, so their `Editor` components are embedded directly rather than
reimplemented.

## Design Decisions

- **Embed the real sibling `Editor` components, not copies or thin wrappers.**
  `TypographyEditor` imports `FontFamilyEditor`, `DimensionEditor`, `FontWeightEditor`, and
  `NumberEditor` directly and renders each inside its own `<fieldset>`/`<legend>` group ("Font
  Family", "Font Size", "Font Weight", "Letter Spacing", "Line Height"), wiring each `onChange`
  closure to spread the *current* `value` and replace only its own key — the same pattern
  `TransitionEditor`/`BorderEditor` already use. This makes "an edit to one sub-field never
  bleeds into another" a property of the wiring itself, not incidental behavior.
- **`lineHeight` is edited via `NumberEditor`, not a bespoke inline input.** The task brief
  offered two options: (a) embed `NumberEditor` from `@dtcg-editor/token-editor-number` — its
  `TokenTypeEditorProps<NumberValue>` shape is exactly `z.number()`, identical to `lineHeight`'s
  own shape; or (b) a small bespoke inline number input, if (a) added awkward friction (e.g. a
  mismatched label for what's semantically a multiplier rather than an arbitrary number).
  **Decision: (a), embed `NumberEditor`.** No real friction materialized: `NumberEditor` renders
  a single labeled ("Value") numeric `<input type="number" step="any">` with no unit/keyword
  chrome that would misrepresent a unitless multiplier — the "Value" label reads correctly under
  `TypographyEditor`'s own wrapping `<fieldset><legend>Line Height</legend>`, giving the full
  accessible name "Line Height Value" (mirroring how `DimensionEditor`'s own "Value"/"Unit"
  labels already read fine nested under "Font Size"/"Letter Spacing" fieldsets). Rejected
  alternative (b): would require duplicating `NumberEditor`'s own numeric-parsing/step-handling
  logic (see `NumberEditor.tsx`'s `step="any"` handling of fractional input, which matters here
  since line-height multipliers like `1.4`/`1.5` are exactly the fractional case that logic
  exists for) for no behavioral gain, purely to change a label — not justified per Principle
  VIII/X's reuse-over-duplication reasoning, and continuing the embed pattern keeps
  `token-editor-typography` architecturally consistent with `border`/`transition` rather than
  carving out a one-off exception for a single field.
- **Distinguishing the two `DimensionEditor` instances: explicit `<fieldset>`/`<legend>` labels,
  not component props.** `DimensionEditor` itself takes no `label`/`name` prop (per its existing,
  unmodified contract in `token-editor-dimension` — this feature must not change that package).
  Disambiguation is done entirely in `TypographyEditor`'s own markup, exactly matching
  `TransitionEditor`'s two-`DurationEditor`-instance precedent: each `DimensionEditor` instance is
  wrapped in its own `<fieldset>` with a `<legend>` ("Font Size" / "Letter Spacing"), giving each
  an accessible group name distinct from the other for both sighted and screen-reader users.
- **`TypographyPreview` composes a plain joined string rather than nesting sibling `Preview`
  components' own JSX.** With five fields (more than `transition`'s three), nesting
  `FontFamilyPreview`/`DimensionPreview`/`FontWeightPreview`'s own `<span>` wrapper elements
  inside one line would mean either accepting five separate DOM nodes with five separate CSS
  classes inside what should read as a single visual line, or fighting their individual wrapper
  styling to make that work — the exact awkwardness `TransitionPreview`'s own plan.md flagged as
  a reason to compose text instead, now more pronounced at five fields than three.
  `TypographyPreview` re-validates with `TypographyValueSchema.safeParse` (declining/`null` on
  mismatch, matching every other `Preview`) and composes `${fontSize.value}${fontSize.unit}/
  ${lineHeight} ${fontFamily} ${fontWeight}` — e.g. `16px/1.4 Arial 700` — matching the task
  brief's own example and each sibling `Preview`'s exact per-field formatting
  (`DimensionPreview`'s `{value}{unit}`, `FontFamilyPreview`'s plain-string/joined-stack text,
  `FontWeightPreview`'s `String(value)`). `letterSpacing` is included only when it is non-zero
  (mirroring `TransitionPreview`'s "only show delay when non-zero" precedent for a field that is
  usually its default and would otherwise clutter the common case), appended as
  ` +${letterSpacing.value}${letterSpacing.unit}`.
- **No new third-party dependency.** Confirmed against Principle VIII: `zod`, `react`,
  `@dtcg-editor/token-core`, `@dtcg-editor/token-editor-contract` are already-approved; the four
  new dependencies (`@dtcg-editor/token-editor-font-family`, `@dtcg-editor/token-editor-dimension`,
  `@dtcg-editor/token-editor-font-weight`, `@dtcg-editor/token-editor-number`) are internal
  workspace packages, not third-party, and are justified above.

## Complexity Tracking

_No Constitution Check violations — table omitted. The internal `token-editor-* →
token-editor-*` dependency (now four such edges from one package, more than `border`/`transition`
each had) is a continuation of an already-accepted repo pattern, not a new violation; its
rationale is recorded under Principle VIII above per the task's explicit instruction._
