---
feature: 002-color-preview-css-format
verdict: FAIL
standard: .specify/extensions/tdd/templates/tdd-test-quality-rubric.md
verified_at: d318cde
behaviors: 18
proven: 3
likely: 0
test_after: 10
no_test: 0
not_applicable: 5
high_smells: 0
criteria_total: 6
criteria_covered: 6
mutation_score: unmeasured # no mutation tool; deliberate mutants used
mutants_survived: 0
suite: 74 Vitest + 41 node:test passed, 0 failed (package); repo-wide apps/web-app e2e 71/73 passed, 2 pre-existing baseline flake unrelated to this feature
---

# TDD Verification: Color Token Preview CSS-Style Formatting (second re-run)

Audits everything added since the prior report (`df4e2f0`): commits `98f1529`
(T016, T017) and `d318cde` (docs only). **Independence note, honestly reduced
this round**: the diff in scope is trivial (a 2-line assertion swap and a
7-line comment addition, no new test, no new behavior) — I assessed it directly
rather than delegating the smell pass to a fresh subagent, unlike the prior two
reports. This is a deliberate proportionality call, not an oversight, but it
means this round's smell-pass conclusions carry less independent weight than
the prior two rounds', which used a fresh subagent whose findings I then
vetted line-by-line.

**Verdict: FAIL, unchanged, same permanent reason as both prior reports.** The
original 15 behaviors' `TEST_AFTER` classifications are git history and cannot
change. This round's own work — T016 and T017 — is clean: both prior report's
open findings (#5, #6) are now closed, correctly, with no new findings.

## Test-first evidence

Unchanged from the prior report's table for all 18 behaviors — T016/T017 did
not add or change any behavior's classification; they refined `U10`'s test and
documented `U11`'s, both already `BASELINE`.

**Weakened-existing-test check**: `U10`'s assertion changed from
`.toContain("--swatch-color: oklch(0.7 0.1 180 / 0.8)")` to
`.toMatch(/--swatch-color:\s*oklch\(0\.7 0\.1 180 \/ 0\.8\)/)` (commit
`98f1529`). This is **not a weakening of what's checked** — the full color
value (space, all three components, alpha) is still required verbatim in both
forms; the only change is tolerating whitespace-count variance around the
colon (`\s*` accepts zero-or-more spaces where the old exact string required
exactly one). This mirrors the pattern already established in this codebase's
own e2e test for the identical fact
(`edit-token-references.spec.ts:277-282`), and was verified in `tdd-run` (not
just claimed) by re-applying the original `Swatch`-hardcoding mutant against
the new assertion and confirming it still fails. Correctly closes prior
Finding #5.

`U11`'s change (commit `98f1529`) is a comment only — no assertion touched,
confirmed by the diff. Correctly closes prior Finding #6 as a documented
decision, not a code change.

**tasks.md-vs-test-list cross-check, new note**: `T016` and `T017` are ticked
`[X]` but carry no `[Un]` behavior marker in `tasks.md` — they were remediation
tasks the prior verify report appended itself, not tasks `tdd-plan` wrote with
a marker. Per Phase 6's rule, "a task with no marker is not this command's
work" for ticking purposes; `tdd-run`'s own report (session transcript)
acknowledged this tension and ticked them anyway on the grounds that they were
invoked directly by id and their work is fully evidenced. **Severity: LOW**,
same character as the prior report's `BASELINE`-vs-`DONE` finding — a
convention gap in how remediation tasks interact with the marker system, not
an unearned claim (both tasks' evidence is genuine, checked above).

## Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 (orig.) | MED | No component-level swatch assertion | **CLOSED** (round 1, `U10`) |
| 2 (orig.) | LOW | U9's mutant check took 3 attempts | Open, informational, unchanged |
| 3 (orig.) | LOW | a11y coverage was 1 of 3 variants | **CLOSED** (round 1, `U11`/`U12`) |
| 4 (orig.) | LOW, out of scope | `tdd-profile.md` stale for this package | Open, out of scope, unchanged |
| 5 (round 1) | MED | U10's assertion more brittle than the e2e pattern | **CLOSED** (this round, T016) |
| 6 (round 1) | LOW-MED | U11 redundant with the has-alpha a11y test | **CLOSED** (this round, T017 — kept + documented, not removed; the underlying DOM-identity observation itself is still true and now explicitly acknowledged in the test file rather than a report) |
| 7 (new) | LOW | T016/T017 ticked without a `[Un]` behavior marker in `tasks.md` | Open, informational — see cross-check note above |

No `HIGH` findings. No open MED findings — all MED-or-above findings across all
three rounds are now closed.

## Mutation results

No mutation tool. This round's mutant activity was re-verification, not new
coverage: `tdd-run`'s T016 cycle re-applied the exact `Swatch`-hardcoding
mutant from `U10`'s original cycle against the newly-loosened regex and
confirmed it still fails (`git diff` empty after restore, confirmed in
`tdd/cycle-log.md`). No new mutant was warranted for T017 (a comment carries no
executable behavior to mutate).

## Traceability

Unchanged from the prior report. 6/6 acceptance criteria covered; the two
real-entry-point gaps (US1-AS3, US3-AS1) remain as previously recorded
scoping decisions, untouched by this round.

## What was not audited

- Same standing list as both prior reports (independence beyond what's noted
  above for this round specifically; real mutation testing; performance; the
  two proxied criteria's reachability claim).
- **This round's smell pass was not delegated to a fresh subagent**, unlike
  the prior two rounds — a deliberate scope call given the trivial diff size,
  disclosed above rather than silently omitted. If you want full independence
  restored for future rounds regardless of diff size, say so and it'll be the
  default again.
- Finding #7 (the marker-less ticking) was reasoned from re-reading `tasks.md`
  and `tdd-run`'s own transcript, not independently re-litigated against the
  rubric's Phase 6 text by a fresh reader.
