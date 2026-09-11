---
feature: 002-color-preview-css-format
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 6
planned_at: a38c355
updated_at: 3fbc94b
suite_baseline: red # accepted deviation, user-approved — see tdd/cycle-log.md
---

# Test List: Color Token Preview CSS-Style Formatting

## Outer loop: acceptance behaviors

One per acceptance scenario in `spec.md`. Real entry point: `apps/web-app`'s
reference-preview flow (`edit-token-references.spec.ts`), which already
renders `ColorPreview` live — no new fixture file needed for A1/A2.

**Scoping decision (recorded, not asked — see Phase 6 report)**: A3 and A6
have no reachable real-entry-point host today (no legacy-hex candidate
token exists in the e2e fixture set, and a schema-invalid color value is
not something the app's own type system lets a user reach through normal
navigation). Per the playbook's Phase 4 guidance for a criterion with no
testable observable result at the real entry point, both are verified by
proxy at the component level (U7, U8) rather than by adding new fixture
tokens whose only purpose would be to reach an otherwise-untestable path.
A4/A5 are a no-new-code guardrail story (User Story 2): their evidence is
the full pre-existing `ColorEditor` suite passing unchanged plus a `git
diff` scope check (`tasks.md` T008/T009), not a new authored test — there
is no new red to produce when nothing is meant to change.

| id  | behavior                                                                          | traces          | kind    | state   | test                                                        |
| --- | ---------------------------------------------------------------------------------- | --------------- | ------- | ------- | ------------------------------------------------------------ |
| A1  | A previewed color token, at the real app entry point, renders CSS-syntax text, not JSON | US1-AS1, FR-001 | example | DONE    | `apps/web-app/e2e/edit-token-references.spec.ts::A7` (tightened) |
| A2  | A previewed color token's swatch and text describe the same value, at the real app entry point | US1-AS2, FR-002, SC-002 | example | DONE    | `apps/web-app/e2e/edit-token-references.spec.ts::A7` (tightened) |
| A3  | A previewed legacy-hex color token's text is unchanged                            | US1-AS3, FR-004 | example | DONE    | proxied — see U7; no real-entry-point fixture (see note above) |
| A4  | The interactive color editor renders unaffected                                   | US2-AS1, FR-003 | example | DONE    | existing `ColorEditor` suite, unchanged (`tasks.md` T008)    |
| A5  | Editing a channel/alpha in the interactive editor updates the value/validation exactly as before | US2-AS2, FR-003, SC-003 | example | DONE    | existing `ColorEditor` suite, unchanged (`tasks.md` T008/T009) |
| A6  | The preview declines to render for a value that fails color validation            | US3-AS1, FR-005 | example | DONE    | proxied — see U8; no real-entry-point fixture (see note above) |

## Inner loop: unit behaviors

### `packages/token-editor-color/src/components/ColorPreview/ColorPreview.tsx`

| id  | behavior                                                                 | traces               | kind    | state   | test                              |
| --- | -------------------------------------------------------------------------- | --------------------- | ------- | ------- | ---------------------------------- |
| U1  | Renders an `oklch` value with alpha as `oklch(0.7 0.1 180 / 0.8)`         | US1-AS1, FR-001, FR-002 | example | DONE    | `ColorPreview.test.tsx` (new)      |
| U2  | Renders an `hsl` value (percent-based S/L channels) as `hsl(...)`         | FR-001, FR-006        | example | DONE    | `ColorPreview.test.tsx` (new)      |
| U3  | Renders a `display-p3` value (no dedicated CSS function) as `color(display-p3 ...)` | FR-001, FR-006        | example | DONE    | `ColorPreview.test.tsx` (new)      |
| U4  | Renders a `lab` or `lch` value (unbounded-channel family) correctly       | FR-001, FR-006        | example | DONE    | `ColorPreview.test.tsx` (new)      |
| U5  | Renders a `"none"` component using the CSS `none` keyword                 | Edge Case 1 (spec.md) | example | DONE    | `ColorPreview.test.tsx` (new)      |
| U6  | Renders a value with no alpha set, omitting the `/` syntax entirely       | Edge Case 2 (spec.md), FR-002 | example | DONE    | `ColorPreview.test.tsx` (new)      |
| U7  | Renders a legacy bare-hex string unchanged                                | US1-AS3, FR-004       | example | DONE    | `ColorPreview.test.tsx` (new)      |
| U8  | Declines (renders nothing) for a value that fails `ColorValueSchema`      | US3-AS1, FR-005       | example | DONE    | `ColorPreview.test.tsx` (new)      |
| U9  | Zero `axe-core` WCAG 2.2 AA violations rendering a representative color value | package Principle IV | example | DONE    | `ColorPreview.a11y.test.tsx` (new) |

## Invariants and edge cases still to place

None — every edge case in `spec.md` (`"none"` component, no-alpha, no-dedicated-function-name space) is placed as U5/U6/U3 above.

## Out of scope

- Any change to `ColorEditor` or its subtree (`ColorFunctionValue`, `ChannelInput`, `ColorSpaceSelect`, `SpaceConversionDialog`) — spec FR-003, explicitly guarded by A4/A5 rather than tested for new behavior.
- Free-text CSS parsing as a new input method (spec Assumptions) — this feature is presentation-only.
- Exhaustive per-color-space testing of `colorValueToCssColor` itself — already fully covered by the existing, unmodified `css-color.test.ts`; U1–U4 prove `ColorPreview` delegates to it, not that the function itself is correct for all 14 spaces.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` at planning time.

- Single test (`.tsx`, this package): `pnpm exec vitest run --project 'packages/token-editor-color:unit' packages/token-editor-color/src/components/ColorPreview/ColorPreview.test.tsx -t "<name>"`
- Single test (a11y): `pnpm exec vitest run --project 'packages/token-editor-color:a11y' packages/token-editor-color/src/components/ColorPreview/ColorPreview.a11y.test.tsx -t "<name>"`
- Single test (`node-packages` plain `.ts`, if needed): `node --test --test-name-pattern "<name>" <file>`
- Full suite (authoritative CI gate): `pnpm test`
- Suite fast (inner-loop subset, requires `pnpm build` first): `pnpm exec vitest run`
- Coverage: not configured (`@vitest/coverage-v8` not installed)
- Mutation: not configured — deliberate-mutant spot check applies instead, per `tdd-profile.md`
