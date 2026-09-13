# TDD Verification: Border Token Support

## Test-first evidence

Every behavior in `tdd/test-list.md` (A1-A7, U1-U29) has a recorded red
observed before the corresponding implementation, per `tdd/cycle-log.md`
Cycles 1-5. Each red failure was for the expected structural reason (module
not found / import unresolved / assertion against not-yet-registered type),
not a typo or unrelated error, confirming the tests were actually exercising
code that did not yet exist.

## Mutation strength: deliberate-mutant spot check

This repository has no mutation-testing tool configured
(`.specify/memory/tdd-profile.md`: `mutation: null`), so per Constitution
Principle XIII the required verification is a deliberate-mutant spot check:
break the implementation one small way, confirm a test fails, restore
exactly.

**Mutant**: In `BorderEditor.tsx`, changed the width sub-editor's `onChange`
handler from `(width) => onChange({ ...value, width })` to a handler that
additionally clobbers `style` with an unrelated value
(`style: value.color as never`) when the width control changes — exactly
the "clobbers a sibling field" defect class FR-003/A1 exists to catch.

**Result**: `pnpm exec vitest run
packages/token-editor-border/src/components/BorderEditor/BorderEditor.test.tsx`
-> 1 failed, 4 passed. The failing test was
`"changing only the width control calls onChange with width updated, color
and style unchanged"` (A1/U11), which reported the actual `onChange` call
carrying the clobbered `style` value against the expected unchanged one —
the test caught the mutant for the right reason.

**Restore**: The file was restored to its exact original content and
re-verified green (5/5 passed).

## Acceptance-criteria coverage

All 7 acceptance scenarios in `spec.md` (US1.1-1.3, US2.1-2.2, US3.1-3.2)
map to at least one `A`-series behavior in `tdd/test-list.md`, each with a
passing test, per the Outer loop table.

## Verdict

PASS. No remediation tasks required.
