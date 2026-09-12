---
feature: 002-color-preview-css-format
verdict: FAIL
standard: .specify/extensions/tdd/templates/tdd-test-quality-rubric.md
verified_at: 3e207d1
behaviors: 18
proven: 3
likely: 0
test_after: 10
no_test: 0
not_applicable: 5
high_smells: 0
criteria_total: 6
criteria_covered: 6
mutation_score: unmeasured # no mutation tool in tdd-profile.md; deliberate mutants used
mutants_survived: 0 # 0 full-suite survivors; 1 partial (unit-level blind spot, now closed — see Findings)
suite: 74 Vitest + 41 node:test passed, 0 failed (package); repo-wide apps/web-app e2e 69/73 passed, 4 pre-existing baseline flake unrelated to this feature
---

# TDD Verification: Color Token Preview CSS-Style Formatting (re-run)

This re-run audits everything added since the prior report (`46bdcec`): three new
characterization behaviors (`U10`–`U12`) closing that report's Findings #1 and #3.
The prior report's findings on the original 15 behaviors are carried forward
unchanged where still applicable, and superseded where closed. **Not independent**
for Phases 0/1/2/4/5/6 (same session that wrote the code); the smell pass (Phase 3)
was again delegated to a fresh subagent with no prior context, and every finding it
returned was independently re-verified against the cited file:line before inclusion
here, per the rubric's vetting requirement.

**Verdict: FAIL, unchanged from the prior report, for the same reason.** The 10
`TEST_AFTER` behaviors from the original implementation (`U2`–`U9`, `A3`, `A6`) are
a permanent historical record — git history doesn't change because new,
better-covered work landed on top of it. This session's new work (`U10`–`U12`) is
clean: correctly classified `NOT_APPLICABLE` (characterization, verified with
fresh mutants both by this session and independently by the smell-pass subagent),
0 `HIGH` smells, both of the prior report's actionable findings closed. The FAIL
verdict is not telling you anything new happened wrong — it is telling you the same
thing the prior report told you, now with two fewer open findings.

## Test-first evidence

Unchanged from the prior report for `A1`–`A6`, `U1`–`U9` (see `git log`
`46bdcec`'s report, reproduced in substance below). New rows:

| Behavior | Class | Evidence |
|---|---|---|
| A1, A2, U1 | PROVEN | (unchanged — see prior report) |
| U2–U9, A3, A6 | TEST_AFTER | (unchanged, permanent — see prior report's full reasoning) |
| A4, A5 | NOT_APPLICABLE | (unchanged — see prior report) |
| **U10** | **NOT_APPLICABLE** | Characterization test, commit `ceafe3c`: `ColorPreview.test.tsx` gained the test with no change to `ColorPreview.tsx` in the same commit (confirmed via `git show --stat`) — consistent with pinning already-correct behavior, not driving new behavior. Green on first run per `tdd/cycle-log.md` Cycle 6; verified non-vacuous by two independent mutants (mine and the smell-pass subagent's, on different files — `ColorPreview.tsx` and `Swatch.tsx` respectively — both killed it, both restored). |
| **U11** | **NOT_APPLICABLE** | Same commit, same reasoning. Green on first run (Cycle 7); low-contrast mutant killed it, restored. |
| **U12** | **NOT_APPLICABLE** | Same commit, same reasoning. Green on first run (Cycle 8); same mutant killed it, restored. |

**tasks.md-vs-test-list cross-check, new finding**: `T014` and `T015` are ticked
`[X]` with behaviors `U10`, `U11`, `U12` all in state `BASELINE`, not literally
`DONE`. The rubric's checkbox-trust rule ("a task ticked `[X]` whose behavior id is
not `DONE`... is a completion claim with no evidence behind it") is written against
the literal state name. The underlying evidence for all three is genuine (green +
mutant-killed + restored, independently confirmed this session) — this is not an
unearned claim in substance — but it is, by the rubric's literal wording, a
technicality worth flagging rather than silently accepting the prior session's own
interpretation that `BASELINE` counts as `DONE` for ticking purposes. **Severity:
LOW** (evidenced, not fabricated; a naming-convention gap in the test-list template
itself, which defines `BASELINE` as characterization's terminal state without
saying whether Phase 6's ticking rule extends to it).

**Weakened-existing-test check**: none in this range — commit `ceafe3c` is pure
addition (`git show --stat`: only insertions in both test files, no deletions).

## Findings

| # | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| 1 (prior) | MED | No component-level test asserted the `<Swatch>` child | `ColorPreview.test.tsx` (old) | **CLOSED** by `U10` — see below for a new, narrower finding on how it was closed |
| 2 (prior) | LOW | U9's mutant check took 3 attempts, 2 false negatives | `tdd/cycle-log.md` Cycle 5 | Open, informational — unchanged, no action taken (correctly so; it's a log-honesty note, not a defect) |
| 3 (prior) | LOW | a11y coverage was 1 of 3 render variants | `ColorPreview.a11y.test.tsx` (old) | **CLOSED** by `U11`/`U12` |
| 4 (prior) | LOW, out of scope | `tdd-profile.md`'s `node-packages` entry is stale for this package | `.specify/memory/tdd-profile.md` | Open, out of this feature's scope — unchanged |
| 5 (new) | MED | `U10`'s assertion (`ColorPreview.test.tsx:75-78`) hardcodes the swatch's `style` attribute as an exact substring (`"--swatch-color: oklch(0.7 0.1 180 / 0.8)"`). The repo's own e2e test asserting the identical fact (`edit-token-references.spec.ts:277-282`) uses a whitespace-tolerant regex (`/--swatch-color:\s*color\(...\)/`) instead. Confirmed non-vacuous (a fresh mutant on `Swatch.tsx` forcing `cssColor = "red"` killed it), but more brittle than the pattern already established in this codebase for this exact check — a harmless React/jsdom style-serialization change could break it for no behavioral reason. | `ColorPreview.test.tsx:75-78` vs `apps/web-app/e2e/edit-token-references.spec.ts:277-282` | Open |
| 6 (new) | LOW-MED | `U11`'s a11y test and the pre-existing has-alpha a11y test (`ColorPreview.a11y.test.tsx:14-21` vs `:23-30`) render DOM-structurally identical markup — only the color-string text content differs, which axe-core's structural/contrast/ARIA checks don't distinguish between. A real accessibility regression would be caught by either test equally; the second buys limited marginal detection for its added browser-mode runtime cost. (`U12`'s hex-branch test is *not* flagged the same way — it exercises a genuinely different source branch, `ColorValueSchema` parsing a string vs. an object.) | `ColorPreview.a11y.test.tsx:14-21`, `:23-30` | Open |

No `HIGH` findings.

## Mutation results

No mutation tool configured. Deliberate mutants this session (in addition to the
prior report's 8 self-reported + 1 fresh):

| Mutant | Behavior | Survived (full suite) | Judgment |
|---|---|---|---|
| `ColorPreview.tsx`: `<Swatch value={value} />` → `<Swatch value="#000000" />` (this session, tdd-run Cycle 6) | U10 | No — killed by the new component-level assertion | Closes the prior report's Finding #1 gap at the unit-test layer |
| `ColorPreview.tsx`: text span given low-contrast inline style (this session, tdd-run Cycles 7–8, reusing the U9-proven mutant) | U11, U12 | No — both killed | Confirms the new a11y tests aren't vacuous |
| `Swatch.tsx`: forced `cssColor = "red"` (smell-pass subagent, independent, different file than mine) | U10 | No — killed | **Independent corroboration** that U10's assertion is real, from a different mutation site than my own |

**Prior report's partial-survivor finding is now closed**: the mutant that
previously survived every component-level test (`Swatch` fed a hardcoded value)
is now caught by `U10` — confirmed twice, once per mutation site, by two different
sessions/agents.

## Traceability

Unchanged from the prior report — `U10`–`U12` trace to `tdd/verification.md`'s own
prior Findings #1 and #3, not to `spec.md` criteria directly (they're
test-coverage remediation, not new product requirements). All 6 acceptance
criteria remain covered exactly as before; the two real-entry-point gaps
(US1-AS3, US3-AS1) are unchanged, since `U10`–`U12` are component-level tests, not
new e2e coverage.

## What was not audited

- Same list as the prior report (independence beyond the smell pass; real
  mutation testing; performance; the two proxied criteria's reachability claim).
- The redundant-test finding (#6) was reasoned from source inspection, not from
  actually disabling one test and confirming the other still catches the same
  class of regression — a cheaper, more rigorous check that would strengthen or
  refute it, not performed here.
