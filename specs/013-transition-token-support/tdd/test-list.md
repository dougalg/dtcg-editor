---
feature: 013-transition-token-support
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 8
planned_at: 707abea
updated_at: 707abea
suite_baseline: green
---

# Test List: Transition Token Editor Support

This feature has no dedicated acceptance/e2e runner of its own (it lives in
`packages/token-editor-transition`, a `node-packages`/`web-app`-Vitest-projects
hybrid — schema in `node-packages`, components under the `web-app` stack's shared
`vitest.config.mts` projects — per `.specify/memory/tdd-profile.md`; the profile's
only `acceptance` entry is scoped to `apps/web-app`'s Playwright suite, which this
feature does not need to touch to satisfy its spec). The highest testable level
for this feature's "real entry point" is therefore each component's own
render/interaction test (`TransitionEditor.test.tsx`, `TransitionPreview.test.tsx`)
— the outer loop below targets those files directly, one behavior per `spec.md`
Acceptance Scenario.

## Outer loop: acceptance behaviors

| id  | behavior                                                                                          | traces          | kind    | state | test                                                                    |
| --- | -------------------------------------------------------------------------------------------------- | --------------- | ------- | ----- | ------------------------------------------------------------------------ |
| A1  | Renders labeled "Duration", "Delay", and timing-function controls, each showing that field's value | US1-AS1         | example | DONE  | `TransitionEditor.test.tsx::renders labeled Duration, Delay, and timing function controls showing the current value`         |
| A2  | Changing the duration control updates only `$value.duration`                                       | US1-AS2         | example | DONE  | `TransitionEditor.test.tsx::changing the duration control updates only duration`      |
| A3  | Changing the delay control updates only `$value.delay`                                              | US1-AS3         | example | DONE  | `TransitionEditor.test.tsx::changing the delay control updates only delay`            |
| A4  | Changing a timing-function control point updates only `$value.timingFunction`                       | US1-AS4         | example | DONE  | `TransitionEditor.test.tsx::changing a timing function control point updates only timingFunction`           |
| A5  | The "Duration" control shows `duration`'s value and the "Delay" control shows `delay`'s value, not swapped, for two distinct values | US1-AS5 | example | DONE  | `TransitionEditor.test.tsx::the Duration and Delay controls are not confused with one another` |
| A6  | A zero-delay value's preview renders one line combining duration + timing function, no delay mention | US2-AS1        | example | DONE  | `TransitionPreview.test.tsx::renders one line combining duration and timing function, delay omitted when zero` |
| A7  | A non-zero-delay value's preview includes the delay in that same one line                           | US2-AS2         | example | DONE  | `TransitionPreview.test.tsx::includes the delay in that same line when it is non-zero`              |
| A8  | A schema-invalid value's preview renders nothing                                                    | US2-AS3, FR-008 | example | DONE  | `TransitionPreview.test.tsx::declines to render for a value that does not conform to the transition schema` |

## Inner loop: unit behaviors

### `packages/token-core/src/transition.ts`

| id  | behavior                                                          | traces  | kind    | state | test                                                        |
| --- | -------------------------------------------------------------------- | ------- | ------- | ----- | -------------------------------------------------------------- |
| U1  | Accepts a valid object with `duration`, `delay`, `timingFunction`     | FR-002  | example | DONE  | `transition.test.ts::accepts a valid transition value`         |
| U2  | Rejects a value missing `duration`                                    | FR-002  | example | DONE  | `transition.test.ts::rejects a value missing duration`         |
| U3  | Rejects a value missing `delay`                                       | FR-002  | example | DONE  | `transition.test.ts::rejects a value missing delay`            |
| U4  | Rejects a value missing `timingFunction`                              | FR-002  | example | DONE  | `transition.test.ts::rejects a value missing timingFunction`   |
| U5  | Rejects a value whose nested `duration` is itself invalid (e.g. negative `value`), proving the nested schema is enforced | FR-002, Edge Cases | example | DONE | `transition.test.ts::rejects an invalid nested duration` |

### `packages/token-editor-transition/src/components/TransitionEditor/TransitionEditor.tsx`

Behaviors A1-A5 above are this component's own render/interaction tests — no
additional inner-loop behaviors beyond the outer loop are needed for this
component, since every rule FR-003/FR-004/FR-006 impose is already exercised at
the "real entry point" (the rendered component) rather than at some smaller unit
beneath it.

### `packages/token-editor-transition/src/components/TransitionPreview/TransitionPreview.tsx`

Behaviors A6-A8 above cover this component directly. One additional formatting
boundary is worth its own unit-level check since it's easy to get subtly wrong:

| id  | behavior                                                                                     | traces | kind    | state | test                                                                   |
| --- | ----------------------------------------------------------------------------------------------- | ------ | ------- | ----- | --------------------------------------------------------------------------- |
| U6  | The duration/timing-function portion of the preview text matches `DurationPreview`'s `{value}{unit}` and `CubicBezierPreview`'s `cubic-bezier(p1x, p1y, p2x, p2y)` formatting exactly | FR-007 | example | DONE | `TransitionPreview.test.tsx::matches DurationPreview/CubicBezierPreview's own formatting exactly` |

## Invariants and edge cases still to place

- Round-trip fidelity of an untouched `transition` token (`serializeValue` is the
  identity function; `TransitionEditor` only ever replaces one field via
  `{ ...value, field: next }`) is a structural property of the implementation
  chosen in `plan.md`'s Design Decisions, not a separately id'd behavior — it is
  exercised as a side effect of A2/A3/A4 asserting the *other* two fields are
  unchanged after each edit.
- `delay.value === 0` while the editor still shows the full three-control view
  regardless of value (spec Edge Cases: "the preview's rule never applies to the
  editor") is implicitly covered by A1 rendering both controls unconditionally;
  no separate behavior id is needed since there is no conditional-rendering logic
  in the Editor to test.

## Out of scope

- A `token-core`-level "parse a full token document containing a `transition`
  token" integration test: the existing generic parse/serialize round-trip
  machinery already exercises any registered `$type`'s schema generically,
  matching how `duration`/`cubicBezier`/`fontFamily` were each added without one.
- `axe-core` a11y checks are not separately id'd here as A/U behaviors — the
  constitution's Principle X requires an `.a11y.test.tsx` file per component
  regardless of feature-specific behavior, tracked instead as task T019 in
  `tasks.md` (structural, not behavioral).
- Storybook stories (`tasks.md` T020): presentational only, not a testable
  behavior.
- Whether `token-editor-duration`'s `DurationEditor` or
  `token-editor-cubic-bezier`'s `CubicBezierEditor` correctly handle their own
  numeric/unit/control-point edge cases: already covered by those packages' own
  test suites, which this feature must not modify or duplicate.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` (`node-packages` stack for
`token-core`; `web-app` stack's `single`/`suite_fast` pattern for the new
package's Vitest-run component tests, since the new package is included in the
root `vitest.config.mts` projects):

- Single test (token-core): `node --test --test-name-pattern "{name}" {file}`
- Single test (component/a11y): `pnpm exec vitest run {file} -t "{name}"`
- Full suite: `pnpm test`
- Fast inner loop (Vitest projects only, requires `pnpm build` first):
  `pnpm exec vitest run`
- `token-core` package suite: `pnpm --filter @dtcg-editor/token-core test`
- New package suite (once scaffolded):
  `pnpm --filter @dtcg-editor/token-editor-transition test`
