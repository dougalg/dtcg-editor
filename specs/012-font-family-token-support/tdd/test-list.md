---
feature: 012-font-family-token-support
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 12
planned_at: 4dd7606
updated_at: 4dd7606
suite_baseline: green
---

# Test List: Font Family Token Editor Support

This feature has no dedicated acceptance/e2e runner of its own (it lives in
`packages/token-editor-font-family`, a `node-packages`-stack library package per
`.specify/memory/tdd-profile.md`; the profile's only `acceptance` entry is scoped
to `apps/web-app`'s Playwright suite, which this feature does not need to touch to
satisfy its spec). The highest testable level for this feature's "real entry
point" is therefore each component's own render/interaction test
(`FontFamilyEditor.test.tsx`, `FontFamilyPreview.test.tsx`) — the outer loop below
targets those files directly, one behavior per `spec.md` Acceptance Scenario.

## Outer loop: acceptance behaviors

| id  | behavior                                                                                   | traces           | kind    | state   | test                                                                          |
| --- | -------------------------------------------------------------------------------------------- | ---------------- | ------- | ------- | ------------------------------------------------------------------------------ |
| A1  | An array `$value` renders as one ordered row per entry                                       | US1-AS1          | example | PENDING | `FontFamilyEditor.test.tsx::renders array value`                              |
| A2  | Adding a family name appends it to the array                                                 | US1-AS2          | example | PENDING | `FontFamilyEditor.test.tsx::add appends`                                     |
| A3  | Removing an entry removes it from the array                                                  | US1-AS3          | example | PENDING | `FontFamilyEditor.test.tsx::remove removes`                                  |
| A4  | Reordering two entries updates the array's order                                             | US1-AS4          | example | PENDING | `FontFamilyEditor.test.tsx::reorder`                                          |
| A5  | Submitting a blank/whitespace-only entry does not update `$value`                             | US1-AS5, FR-004  | example | PENDING | `FontFamilyEditor.test.tsx::rejects blank entry`                             |
| A6  | A string `$value` renders as a single-entry list                                             | US2-AS1          | example | PENDING | `FontFamilyEditor.test.tsx::promotes string to one-item list`                |
| A7  | Editing the sole entry of a string-sourced list keeps `$value` a string                       | US2-AS2, FR-005  | example | PENDING | `FontFamilyEditor.test.tsx::single-entry edit stays a string`                |
| A8  | Adding a second entry to a string-sourced list produces an array `$value`                     | US2-AS3, FR-005  | example | PENDING | `FontFamilyEditor.test.tsx::growing to two entries becomes an array`         |
| A9  | A short array value's preview renders the names comma-joined                                 | US3-AS1          | example | PENDING | `FontFamilyPreview.test.tsx::renders comma-joined array`                     |
| A10 | A single-string value's preview renders that string                                          | US3-AS2          | example | PENDING | `FontFamilyPreview.test.tsx::renders string value`                           |
| A11 | A stack of more than 3 entries previews the first 3 plus a "+N more" indicator                | US3-AS3, SC-005  | example | PENDING | `FontFamilyPreview.test.tsx::truncates a long list`                          |
| A12 | A schema-invalid value's preview renders nothing                                              | US3-AS4, FR-007  | example | PENDING | `FontFamilyPreview.test.tsx::declines to render for a mismatched value`      |

## Inner loop: unit behaviors

### `packages/token-core/src/font-family.ts`

| id  | behavior                                                          | traces      | kind    | state   | test                                                          |
| --- | -------------------------------------------------------------------- | ----------- | ------- | ------- | ---------------------------------------------------------------- |
| U1  | Accepts a single string                                           | FR-002      | example | DONE | `font-family.test.ts::accepts a single string`                |
| U2  | Accepts an array of strings                                       | FR-002      | example | DONE | `font-family.test.ts::accepts an array of strings`            |
| U3  | Accepts an empty array                                             | Edge Cases  | example | DONE | `font-family.test.ts::accepts an empty array`                 |
| U4  | Rejects an array containing a non-string element                  | FR-002, Edge Cases | example | DONE | `font-family.test.ts::rejects an array containing a non-string element`     |
| U5  | Rejects a bare number                                              | FR-002      | example | DONE | `font-family.test.ts::rejects a bare number`                       |
| U6  | Rejects `null`                                                     | FR-002      | example | DONE | `font-family.test.ts::rejects null`                            |
| U7  | Rejects a plain object                                             | FR-002      | example | DONE | `font-family.test.ts::rejects a plain object`                  |

### `packages/token-editor-font-family/src/components/FontFamilyEditor/FontFamilyEditor.tsx`

| id  | behavior                                                                    | traces      | kind    | state   | test                                                                  |
| --- | -------------------------------------------------------------------------------- | ----------- | ------- | ------- | -------------------------------------------------------------------------- |
| U8  | Removing the only remaining entry results in an `onChange([])` call             | Edge Cases  | example | PENDING | `FontFamilyEditor.test.tsx::removing the last entry yields an empty array` |
| U9  | The "move up" control is disabled/no-op for the first entry                     | US1 (implied by AS4) | example | PENDING | `FontFamilyEditor.test.tsx::move up disabled at the top`          |
| U10 | The "move down" control is disabled/no-op for the last entry                    | US1 (implied by AS4) | example | PENDING | `FontFamilyEditor.test.tsx::move down disabled at the bottom`     |

### `packages/token-editor-font-family/src/components/FontFamilyPreview/FontFamilyPreview.tsx`

| id  | behavior                                                    | traces     | kind    | state   | test                                                              |
| --- | ---------------------------------------------------------------- | ---------- | ------- | ------- | ---------------------------------------------------------------------- |
| U11 | An empty array value's preview renders empty text without throwing | Edge Cases | example | PENDING | `FontFamilyPreview.test.tsx::renders empty text for an empty array`   |

## Invariants and edge cases still to place

- Round-trip fidelity of an untouched token's on-disk shape (string stays string,
  array stays array) is exercised structurally by A6-A8/U-boundary behaviors above
  rather than as a separate token-core round-trip test, since `serializeValue` is
  the identity function and the shape-preservation logic lives entirely in
  `FontFamilyEditor`'s `onChange` boundary (covered by A7/A8/U8).

## Out of scope

- A `token-core`-level "parse a full token document containing a `fontFamily`
  token" integration test: the existing generic parse/serialize round-trip
  machinery (`packages/token-core`'s existing document-level tests) already
  exercises any registered `$type`'s schema generically; this feature adds a new
  schema to that registry but doesn't need its own document-level test, matching
  how `font-weight`/`duration`/`cubicBezier` were each added without one.
- `axe-core` a11y checks are not separately id'd here as A/U behaviors — the
  constitution's Principle X requires an `.a11y.test.tsx` file per component
  regardless of feature-specific behavior, tracked instead as tasks T022 in
  `tasks.md` (structural, not behavioral).
- Storybook stories (`tasks.md` T023): presentational only, not a testable
  behavior.

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
  `pnpm --filter @dtcg-editor/token-editor-font-family test`
