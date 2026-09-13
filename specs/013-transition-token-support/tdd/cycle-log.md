# TDD Cycle Log: Transition Token Editor Support

## Baseline

- **Commit**: `707abea`
- **Date**: 2026-09-13
- **Suite**: `pnpm exec vitest run` (fast inner-loop subset, `pnpm build` run first
  to regenerate `apps/web-app/assets/generated/*` per `pnpm run generate:icons`,
  which is not itself part of the cached `build` task's outputs in a fresh
  worktree checkout) — **164 test files passed, 805 tests passed, 0 failed**.
- **Result**: `suite_baseline: green`.

Cycles are appended below in order, one per behavior from `tdd/test-list.md`, by
`/speckit.tdd.run`.

## Cycle: U1-U5 — `TransitionValueSchema` composition and field-presence validation

- **Test**: `packages/token-core/src/transition.test.ts` — 5 cases (`accepts a
  valid transition value`, `rejects a value missing duration`, `rejects a value
  missing delay`, `rejects a value missing timingFunction`, `rejects an invalid
  nested duration`). Written together as one file since they are one cohesive
  schema-composition unit (mirrors `duration.test.ts`/`cubic-bezier.test.ts`'s own
  granularity — several `test()` cases per schema file, not one file per case).
- **Red**: `node --test src/transition.test.ts` →
  `Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../packages/token-core/src/transition.ts'` — the right reason (module doesn't
  exist yet), 1 test file failed to load, 0 ran.
- **Green**: implemented `packages/token-core/src/transition.ts`
  (`TransitionValueSchema = z.object({ duration: DurationValueSchema, delay:
  DurationValueSchema, timingFunction: CubicBezierValueSchema })`, importing both
  sub-schemas). `node --test src/transition.test.ts` → 5/5 pass. Full package
  suite `node --test src/*.test.ts` → 159/159 pass (was 154 before this feature).
- **Refactor**: none needed — the schema is a direct, minimal composition; no
  duplication or unclear naming introduced.
- **Exported**: `TransitionValueSchema`/`TransitionValue` added to
  `packages/token-core/src/index.ts` (alphabetical position, after
  `token-types.ts`'s exports, before `types.ts`'s).
- **Commit**: recorded after this entry (see git log,
  `feat(token-core): add TransitionValueSchema`).

## Cycle: A1-A5 — `TransitionEditor` embeds `DurationEditor` (x2) + `CubicBezierEditor`, scoped onChange

- **Test**: `packages/token-editor-transition/src/components/TransitionEditor/TransitionEditor.test.tsx`
  — 5 cases: renders labeled Duration/Delay/timing-function controls showing
  current values (A1); duration/delay/timing-function edits each update only
  their own field (A2/A3/A4); the two `DurationEditor` instances are not
  confused with one another when given distinct duration/delay values (A5).
- **Red**: `pnpm exec vitest run --project "packages/token-editor-transition:unit"`
  → `Error: Failed to resolve import "./TransitionEditor.tsx" ... Does the file
  exist?` — the right reason (component doesn't exist yet), 1 test file failed
  to load, 0 ran.
- **Green**: implemented `TransitionEditor.tsx` embedding the real
  `DurationEditor` (from `@dtcg-editor/token-editor-duration`) twice — each
  wrapped in its own `<fieldset>`/`<legend>` ("Duration" / "Delay") so
  `getByRole("group", { name: ... })` + `within(...)` disambiguates the two
  instances' otherwise-identical "Value"/"Unit" labels — and the real
  `CubicBezierEditor` once, each wired via
  `onChange={(next) => onChange({ ...value, field: next })}`. Same run → 5/5
  pass on the first implementation attempt (no iteration needed).
- **Refactor**: none needed.
- **Commit**: recorded after this entry (see git log,
  `feat(token-editor-*): add TransitionEditor component`).

## Cycle: A6-A8, U6 — `TransitionPreview` composes one line, delay conditional, declines on mismatch

- **Test**: `packages/token-editor-transition/src/components/TransitionPreview/TransitionPreview.test.tsx`
  — 4 cases: zero-delay value renders one line without a delay mention (A6);
  non-zero delay is appended to that same line (A7); the duration/timing-
  function text matches `DurationPreview`/`CubicBezierPreview`'s own exact
  formatting (U6, using a different value pair from A6/A7 to avoid the two
  overlapping); a schema-invalid value renders nothing (A8).
- **Red**: `pnpm exec vitest run --project "packages/token-editor-transition:unit"`
  → `Error: Failed to resolve import "./TransitionPreview.tsx" ... Does the
  file exist?` — the right reason (component doesn't exist yet); 1 file
  failed (this one), the sibling `TransitionEditor.test.tsx` file still
  passing (5/5) alongside it.
- **Green**: implemented `TransitionPreview.tsx` —
  `TransitionValueSchema.safeParse`, `null` on failure, otherwise composes
  `"{duration.value}{duration.unit} cubic-bezier(p1x, p1y, p2x, p2y)"` and
  appends `", delay {delay.value}{delay.unit}"` only when `delay.value !== 0`.
  Same run → 9/9 pass (both component test files) on the first
  implementation attempt.
- **Refactor**: none needed.
- **Commit**: recorded after this entry (see git log,
  `feat(token-editor-*): add TransitionPreview component`).

## Wrap-up: contract wiring, registration, a11y, full-suite verification

All 13 test-list behaviors (U1-U6, A1-A8) are `DONE`. Remaining `tasks.md` work
(T016-T022) was structural/non-behavioral (contract wiring, `index.ts`,
registration in the shared `built-in.ts`, `.a11y.test.tsx` files, Storybook
story) and was completed directly rather than through a further red-green
cycle, per this loop's own scope (only behavior tasks go through the cycle).

- `transitionTokenType` wired (`token-type.ts`), exported (`index.ts`).
- Registered in `apps/web-app/lib/token-editors/built-in.ts`
  (`BUILT_IN_TOKEN_TYPES` + `builtInContractsByType`); web-app's `package.json`
  gained a `workspace:*` dependency on `@dtcg-editor/token-editor-transition`
  via `pnpm add`.
- `.a11y.test.tsx` added for both components: 0 WCAG 2.2 AA violations; the two
  `DurationEditor` instances' distinct accessible group names ("Duration",
  "Delay") explicitly asserted.
- One pre-existing test, `apps/web-app/lib/token-editors/built-in.test.ts`,
  asserted `BUILT_IN_TOKEN_TYPES`'s exact contents and needed updating to
  include `"transition"` (plus a new `resolveBuiltInContract("transition")`
  case) — this is the test legitimately disagreeing with newly-correct code
  (Constitution Principle XIII: spec decides), not a weakening.
- Full verification: `pnpm build`, `pnpm lint`, `pnpm format:check` all green
  repo-wide. `pnpm exec vitest run` (fast subset): 817-818 tests pass
  consistently across two runs, 0 failures attributable to this feature.
  `pnpm test` (full CI gate) surfaced two pre-existing, unrelated wall-clock
  flakes under full-suite CPU contention (a reference-index benchmark and a
  dialog-render timeout, both in files this feature never touches, both
  passing in isolation) — matching the already-tracked
  `fix-editing-perf-ci-flake` backlog item, not a regression from this work.
