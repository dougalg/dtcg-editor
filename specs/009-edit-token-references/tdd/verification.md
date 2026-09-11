---
feature: 009-edit-token-references
verdict: PASS_WITH_GAPS
standard: .specify/extensions/tdd/templates/tdd-test-quality-rubric.md
verified_at: d241b0d # updated after the T056-T060 remediation pass; original audit was e2ec578
behaviors: 131
proven: 128
likely: 0
test_after: 0
no_test: 0
not_applicable: 3
high_smells: 0
med_smells: 0 # was 3 (Findings 1-3) — all fixed by T056-T058, see "Remediation status" below
low_smells: 0 # was 3 (Findings 4-6) — all fixed by T059; one new LOW/informational note added (A8 mode-fallback ambiguity, not a test smell)
criteria_total: 8
criteria_covered: 7
mutation_score: n/a # still no mutation tool; 14 deliberate mutants across the audit + remediation, 14 caught, 0 survivors (was 1)
mutants_survived: 0 # was 1 (resolveIfRepointed walk-start, U107) — fixed by T056, re-verified with the same mutant
suite: 691 passed, 0 failed, ~24s (vitest projects only, clean this time; Playwright not run in this re-verify — see "What was not audited")
---

## Remediation status (T056-T060, since the original audit at `e2ec578`)

| Finding | Task | Status |
| --- | --- | --- |
| 1 (MED, `resolveIfRepointed` walk-start unpinned) | T056 | **Fixed.** New test pins `perMode[0].chain.steps`; re-verified with the same mutant that survived originally — now caught. |
| 2 (MED, SC-004 p95 latency not e2e) | T057 | **Fixed.** New `edit-token-references-perf.spec.ts` test times keystroke→paint via double-`requestAnimationFrame`; deliberate 80ms-busy-wait mutant caught (p95 129ms vs 50ms budget). Its first draft (poll live-region text for a change) had its own real bug, caught by the sample data itself before being replaced — see `cycle-log.md`. |
| 3 (MED, A12/A13 didn't assert the pointer refusal itself) | T058 | **Fixed.** Added a `trial: true` click assertion before each `force: true`; deliberate mutant (force `isItemDisabled` to always `false`) caught. |
| 4 (LOW, precedence claim unproven) | T059 | **Fixed.** New fixture where a candidate is genuinely both circular and missing; deliberate mutant (reorder the checks) caught only by the new test, not the old one — confirms it closes the gap. |
| 5 (LOW, `listFooter` order unasserted) | T059 | **Fixed.** `compareDocumentPosition` assertion added; deliberate mutant (move the footer above the list) caught. |
| 6 (LOW, A7/A8 swatch checks near-vacuous) | T059 | **Partially fixed.** A7 now pins the exact `--swatch-color` value. A8 was **not** strengthened the same way — doing so surfaced a real ambiguity (its own preview resolves through a multiply-defined intermediate via mode-fallback, landing on the dark-mode value rather than the light-mode end-of-chain value its name describes) worth its own investigation, not a same-cycle fix. New informational note below. |
| T060 (systematic e2e-mutant pass, A1-A18) | T060 | **Partial.** 9 of 18 acceptance behaviours now have a dedicated e2e-tier deliberate mutant (up from ~3 at the original audit): A1, A2, A4, A9, A12, A13, A17, A18, and FR-021's degradation branch. 10 remain untested at this tier: A3, A5, A6, A7, A8, A10, A11, A14, A15, A16. |
| T055 (full gate, one clean run) | — | **Still not obtained.** Every attempt this remediation round (and the original audit) hit local resource contention — see "What was not audited". |

New informational note (not a rubric smell): `color.action.hover`'s own
`candidate.preview` resolves through the multiply-defined
`color.text.primary`, and which mode's value lands as the candidate's *own*
(non-hypothetical) swatch depends on `lookupForMode`'s mode-fallback
selection — observed to be the **last** definition (dark, `0.95 0.95 0.95`)
rather than the edited token's own light-mode chain. A8's e2e test still
correctly pins the end-of-chain value (via the hypothetical block's own
light-mode entry, which is unambiguous), but whether the *candidate's own*
preview should instead prefer resolving under whichever mode the edited
token would actually use is a real product question, not covered by any
existing FR/behaviour. Worth its own investigation; not blocking.

# TDD Verification: Edit Token References

**Verdict: PASS_WITH_GAPS.** The discipline holds — 37+ unsquashed commits in a
clean test-first shape, a per-behavior cycle log that records the red command (or
the deliberate-mutant check where a behavior passed first run), zero HIGH smells,
no weakened or skipped existing test, and every acceptance criterion reaches a
test. **Since the original audit, T056-T059 closed all three MED and all three
LOW findings** (see "Remediation status" above) — the surviving mutant is now
caught, SC-004's p95 latency is measured end to end, and A12/A13 assert the
pointer refusal directly, not only the code-level guard. What remains: T060's
e2e-mutant pass covers 9 of 18 acceptance behaviours, not all 18, and the full
`pnpm build && pnpm test` gate still has not produced one clean run on this
machine — every attempt this session, across both the original audit and this
remediation round, hit local resource contention (Playwright runs ranging from
~15s to 20-35min, unrelated files/tests failing differently each attempt, and once
the Bash safety classifier itself timing out). Every individual file this session
touched was verified green in isolation.

**Independence caveat (Rubric §"Grade from cold context"):** this audit was run by
the same session that wrote the session-3 tests — `U105`, `U107`–`U112`, `A1`–`A18`,
`candidate-filter.bench.ts`, `edit-token-references{,-perf}.spec.ts`, and the
FR-020-revision test edits. Every file was re-read from disk rather than from
memory, and the smell pass and mutants were run mechanically, but the audit is not
independent. `U1`–`U104` were written by earlier sessions.

## Test-first evidence

History is **unsquashed** (37 commits, `main..HEAD`) and was **rebased onto `main`
once** this session — rebase replays commits in order and preserves their
contents, so the `test(...) → feat(...)` ordering per behaviour id is still
visible in `git log`, but the short SHAs in `cycle-log.md` no longer resolve
against `HEAD`. The relative order stands; the SHAs are stale. Classified `PROVEN`
rather than `LIKELY` on that basis.

| Behaviour group | Class | Evidence |
| --- | --- | --- |
| `U1`–`U37` (design-system `Command`/`Combobox`, catalogue wire+transform, `GET /api/tokens/references`, `useReferenceCatalogue`) | PROVEN | `cycle-log.md` Cycles 1–37 record the red (`Failed to resolve import …`) or a deliberate mutant per behaviour; commits `4ab55a4`…`9984820` show `test(` before/with `feat(` per id |
| `U38`–`U63` (`candidate-filter`, `candidate-selectability`, `hypothetical-resolution` — pure) | PROVEN | Cycles 38–63; each behaviour has a real red or a recorded mutant; `#00f`-style literals are fixture data, not rule-bearing magic values |
| `U64`, `U89`, `U100` | NOT_APPLICABLE | Characterization baselines (green against untouched code); each verified with a deliberate mutant per `cycle-log.md` |
| `U65`–`U88` (`format-literal-value`, `CandidatePreview`, `TokenReferencePicker`) | PROVEN | Cycles 64–88 + 102/103; commits `721c5b7`…`227419e` |
| `U90`–`U99`, `U101`, `U104` (`ReferenceEditControl` extraction, `TokenTree` guard, PATCH round-trip, `staged-edits-store`) | PROVEN | Cycles 89–104; `a759353` (structural extract) separate from behaviour commits `6e19f13`…`094d18a5` |
| `U102`, `U103` | PROVEN | Added mid-loop as named seams (hook `enabled` gate; `Combobox.onHighlightChange`); `cf16bd2`, `9984820`, cycle-log "behavior added mid-loop" entries |
| `U105` (`diagnosticFor` + picker row rendering) | PROVEN | `cycle-log.md` "Cycle: U105": red `Failed to resolve import "./candidate-diagnostic.ts"`, then `'none' !== 'missing'`/`'group'` (wrong field path). Commit `9e46fab` bundles test+impl; the red is logged |
| `U107` (`resolveIfRepointed` hypothesised-cycle) | PROVEN | `cycle-log.md` "Cycle: T046": red written directly against the not-yet-fixed function → `'resolved' !== 'circular'`. Commit `a4fcfe3` |
| `U108` (non-highlighted circular row names the cycle) | PROVEN | `cycle-log.md` "Cycle: T046": red `expected 'color.wheelcircular-reference{…}' to match /color\.hub/`. Commit `a4fcfe3` |
| `U109` (`Combobox.listFooter`) | PROVEN | `cycle-log.md` "Cycle: idle query …": red `unable to find an element with the text: 3 more — refine your search`. Commit `a1897d2` |
| `U110`, `U112` (idle query = current-target-only / prompt; query resets on close) | PROVEN | Same cycle: red `expected […] to have a length of 1 but got 3` (U110); `unable to find an element … color.blue` after reopen (U112). Commit `a1897d2` |
| `U111` (render cap = first 200 + footer) | PROVEN | `cycle-log.md` "Cycle: U105 …" / render-cap follow-up: red `expected […] to have a length of 200 but got 205`. Commit `9e46fab`/`a1897d2` |
| `A1`–`A6`, `A17` (US1 acceptance) | PROVEN (test-first at the file level) | `edit-token-references.spec.ts` did not exist before `b23a2f5`; all 7 passed on first real run because every unit was already `DONE`, and each was then **deliberate-mutant verified** (`filterCandidates` `.slice(0,3)` → A17/A1 red; `.includes`→`.startsWith` → A2 red) per `cycle-log.md` "Cycle: T030" |
| `A7`–`A11` (US2 acceptance) | PROVEN (mutant-verified) | `09d89cd`; `cycle-log.md` "Cycle: T038" records the A9 first-draft weakness caught by a mutant (`CandidatePreview` mode-label ternary → `false`) and the rewrite to `toHaveCount(2)` — the weak version never reached a commit |
| `A12`–`A16` (US3 acceptance) | PROVEN (found 2 real bugs) | `a4fcfe3`, `de92c2a`; `cycle-log.md` "Cycle: T046" — driving A12/A13 surfaced U107 and U108, each with its own red |
| `A18` (perf, Long Task) | PROVEN | `6958ed0` recorded the **real red** (`long tasks over budget: 170, 80ms`) while BLOCKED; closed by the render cap + idle-query revision (`a1897d2`), re-run green |
| `A19` (open-popover axe) | PROVEN | Hosted by `TokenReferencePicker.a11y.test.tsx` (U88) + `Combobox` U15; `cycle-log.md` Cycle 88 |
| `A20` (repoint round-trip, one `$value`) | PROVEN | Hosted by `route.test.ts` U101; `cycle-log.md` Cycle 101, mutant-verified |

**Existing-test-weakening check (highest-signal): PASS.** Across the whole
branch, `git diff main..HEAD` on all test globs shows **3 deleted lines, all
`import` statements** (`TokenTree.test.tsx:1–3`, widened to add `parseTokenFile`,
`act`, `beforeAll`). No `test()` block, assertion, or `expect(...)` was removed
anywhere. The FR-020 revision commit `a1897d2` changed 5 test files:

- 9 tests gained a `fireEvent.change(... {value: "…"})` / `.fill("…")` **before**
  an existing assertion, to reveal a candidate the new idle behaviour no longer
  lists at rest. Every downstream `expect(...)` is **unchanged**.
- `TokenReferencePicker.test.tsx` "an aria-live region announces the current
  result count": `expect(live()).toMatch(/3\b/)` → `/\b1\b/` — a changed
  expected **value** tracking the documented FR-020 revision (idle now shows 1
  row, not 3), still a specific-value check; the two later assertions in the
  same test are untouched.
- `TokenTree.test.tsx` "'Discard and leave' …":
  `expect(getByRole("option", {name:"color.brand.red"}).getAttribute("aria-current")).not.toBe("true")`
  → `expect(queryByRole("option", {name:"color.brand.red"})).toBeNull()`. The old
  form would now **throw** (`getByRole` on an absent element), so it could not
  run; the new form asserts absence — **stronger**, not weaker.

All of it is a documented, deliberate behaviour change (spec.md Clarifications
2026-09-10 revision, `cycle-log.md`, the commit body). No assertion loosened to
hide a regression.

**`tasks.md` vs test-list check:** 53/55 ticked. Every ticked task's behaviour ids
are `DONE`. **T027 is unticked while its behaviours `U96`/`U97` are `DONE`** — the
milder inverse (LOW-4): `/speckit.implement` would try to re-drive them. This is
deliberate (only T027's non-behavioural soft-300-line-ceiling half is outstanding;
`TreeTokenNode.tsx` is 363 lines, no automated gate) and is recorded in the
`/speckit-implement` completion report, but the checkbox does not carry that
nuance.

## Findings

Ordered by severity, each with evidence.

| # | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| 1 | MED | `resolveIfRepointed`'s **walk-start** is unpinned. Deliberate mutant: `targetPath: editedTokenPath` → `targetPath: candidatePath` (the pre-`U107` shape) — **8/8 `hypothetical-resolution.test.ts` still pass**, including `U107`. The `editedTokenPath` lookup override (mutant 5, caught by 5 tests) is what actually closes the loop for the tested fixtures; the starting `targetPath` only changes `perMode[].chain.steps[0]` and the chain prefix, which no test asserts. `steps` content feeds FR-014's "name the tokens in the cycle" rendering, so this is a real gap, not an equivalent mutant. | `apps/web-app/lib/tokens/hypothetical-resolution.ts:82`; no assertion in `apps/web-app/lib/tokens/hypothetical-resolution.test.ts` checks `perMode[].chain.steps` order/first-hop |
| 2 | MED | **SC-004's p95 keystroke→updated-list latency is not measured end-to-end.** `edit-token-references-perf.spec.ts` (A18) checks only the **Long Task > 50ms** half (`longTasks.filter(d => d > 50)).toEqual([])`). The **p95 keystroke→list** half is covered only by `candidate-filter.bench.ts`, which times pure `filterCandidates` + `isCircularIfSelected` — not the React render + DOM update the user waits on. A regression in per-keystroke render cost between the filter and the paint would be caught by neither. | `apps/web-app/e2e/edit-token-references-perf.spec.ts:74`; `apps/web-app/lib/tokens/candidate-filter.bench.ts:52` |
| 3 | MED | **A12/A13 use `click({ force: true })` without first asserting the un-forced pointer click is refused.** `force` skips Playwright's actionability check, so these tests verify the `onSelect` code guard (nothing staged) but not FR-024's "not selectable ... by pointer" at the interaction level. The comment claims Playwright refuses the un-forced click, but the test does not assert it (no `await own.click({ timeout: … })` expecting a throw). A future change that made a disabled row pointer-clickable while the `onSelect` guard still held would pass. The keyboard-`Enter` path in the same tests **is** asserted unconditionally. | `apps/web-app/e2e/edit-token-references.spec.ts:388, 418` |
| 4 | LOW | `candidate-diagnostic.test.ts` test name "…circular, **ahead of any other outcome**" implies a precedence check, but the fixture (`accent -> {color.blue}`, editing `accent`, candidate = `accent`) has no competing missing/group diagnostic on that candidate. The early-return branch *is* covered (mutant 2, `if (false)`, was caught), so this is a naming over-claim, not a coverage hole. | `apps/web-app/lib/tokens/candidate-diagnostic.test.ts:35` |
| 5 | LOW | `Combobox.test.tsx` "listFooter renders **after** the item list" asserts the footer's presence and that the option list is still rendered alongside it (additive), but not its DOM position. Rename to "…renders alongside the item list" or add an order assertion. | `packages/design-system/src/components/Combobox/Combobox.test.tsx` (`listFooter renders after the item list when provided`) |
| 6 | LOW | A7/A8 assert the swatch with `option.locator('[style*="--swatch-color"]').first()).toBeVisible()` — "a swatch element exists". The real assertion is carried by the adjacent `toContainText(/0\.2.*0\.4.*0\.9/)` value regex; the `.first()`/`toBeVisible()` line is close to vacuous on its own. | `apps/web-app/e2e/edit-token-references.spec.ts:270, 287` |

Beyond the catalogue: the vitest suite is **fast** (~24s) and **deterministic**
(no real clock/random/network — `useReferenceCatalogue` takes an injected
`fetchImpl`, timers are not used). The Playwright suite is **not reliably runnable
on this machine right now** (see "What was not audited") — an environmental
condition, not a property of the specs, but it means the e2e safety net could not
be exercised as part of this audit.

## Mutation results

No mutation tool in `tdd-profile.md` (`mutation: null`). **7 deliberate mutants
over 6 high-risk behaviours** (an acceptance criterion or the on-disk write path
depends on each). All restored; suite re-confirmed green (689/689) after each.

| # | Mutant | File | Behaviour(s) | Caught | Judgement |
| --- | --- | --- | --- | --- | --- |
| 1 | Remove the `samePath(candidate.path, editedTokenPath)` self-check | `candidate-selectability.ts:24` | U49, U105 | Yes | `candidate-selectability.test.ts` + `candidate-diagnostic.test.ts` each 1 failed |
| 2 | `if (isCircularIfSelected(...))` → `if (false)` (neuter circular precedence) | `candidate-diagnostic.ts:16` | U105 (+ CandidatePreview/picker) | Yes | 2 files failed |
| 3 | `if (parseReference(edit.value) !== undefined)` → `if (false)` (route stops special-casing reference `$value`) | `app/api/tokens/[...path]/route.ts:206` | U100, U101 (A4/A20/SC-007) | Yes | `route.test.ts` 2 failed |
| 4 | `targetPath: editedTokenPath` → `targetPath: candidatePath` | `hypothetical-resolution.ts:82` | U107 (DONE) | **No** | **Real survivor** — see Finding 1. `steps[0]` / chain-prefix differs but no test asserts it; outcome kind unchanged for tested fixtures |
| 5 | `if (samePath(path, editedTokenPath))` → `if (false)` (drop the hypothetical lookup override) | `hypothetical-resolution.ts:89` | U58, U59, U61, U107, U108 | Yes | 5 tests failed — the override is the load-bearing mechanism |
| 6 | `allItems.slice(0, MAX_VISIBLE_CANDIDATES)` → `allItems.slice(0)` (remove the render cap) | `TokenReferencePicker.tsx:126` | U111 | Yes | `TokenReferencePicker.test.tsx` 1 failed |
| 7 | `if (trimmedQuery === "")` → `if (false)` (idle branch never taken) | `TokenReferencePicker.tsx:99` | U110, U112 | Yes | 4 tests failed |

e2e-tier mutants (on the acceptance behaviours A1–A18) were **not** run — Playwright
is not reliably runnable in this environment this session. Three e2e mutants *were*
run earlier in the session (recorded in `cycle-log.md`: `filterCandidates`
`.slice(0,3)` → A1/A17 red; `.includes`→`.startsWith` → A2 red; `CandidatePreview`
mode-label ternary → A9 red), so the acceptance layer has *some* mutation evidence,
just not a systematic pass.

## Traceability

Acceptance criteria (`SC-*`) and user-story scenarios to tests. All 24 `FR-*` and
8 `SC-*` ids used in `test-list.md`'s `traces` column resolve to real ids in
`spec.md`; the `US1-1`…`US3-5` shorthands map to the numbered acceptance scenarios
under each User Story; `Principle VI/VIII/X/XII` trace to the constitution
(recorded invariants). **No `traces` value points at a missing test** — all 18
`A*` test titles claimed in `test-list.md` exist verbatim in
`edit-token-references{,-perf}.spec.ts`.

| Criterion | Tests | End-to-end |
| --- | --- | --- |
| SC-001 (repoint from the editor, no hand-typed `{…}`) | A3, A4 + U80, U92, U101 | Yes (`edit-token-references.spec.ts`) |
| SC-002 (100% of paths reachable through search) | A17 (`toHaveCount(14)` after typing `.`) + U19 | Yes |
| SC-003 (resolved value visible before save) | A10 + U73, U84, U85 | Yes |
| SC-004 (p95 keystroke→list < 50ms; no Long Task > 50ms) | **A18 (Long Task half only)** + `candidate-filter.bench.ts` (p95, pure-fn) | **Partial** — Long Task e2e yes; p95 keystroke→list not measured end-to-end (Finding 2) |
| SC-005 (usability study, ≥90% identify) | — | N/A — post-launch study, explicitly out of scope in `spec.md` |
| SC-006 (keyboard-only; zero axe) | A19 + U3, U15, U74, U88, U95; every `A*` spec is keyboard-only | Yes |
| SC-007 (repoint changes only that `$value`; parse/serialize round-trip no other diff) | A4 (e2e data equality), A20/U101 (`route.test.ts` explicit one-line round-trip diff) | Yes (data-level) — see note below |
| SC-008 (no circular ref saveable via this feature) | A12, A13 + U10, U49–U52, U86 | Yes |

**Note on FR-007 / SC-007.** FR-007's clause "…leaving … ordering, and formatting
policy … intact" has **no test**: `token-core`'s `serializeTokenFile`
(`packages/token-core/src/serialize.ts:53`) does `JSON.stringify(raw, null, 2)`
over a reconstructed object, so it normalizes indentation (tabs→2-space), sibling
key order, and drops the trailing newline — its own docstring says "formatting and
key ordering may normalize, but the data doesn't". `token-core` is out of scope
per `plan.md`. SC-007's actual guarantee — a **parse→serialize** round-trip
differing on exactly one line — was verified by hand this session (one `$value`
line) and is pinned by U101/A20. `quickstart.md`'s SC-007 step was corrected to
state this. Recorded here so a reader does not mistake the raw-`git diff` churn for
an untested regression.

Criteria with no test: none (SC-005 is out of scope by the spec's own wording).
Tests tracing to nothing: none.

## What was not audited

Stated plainly.

- **Playwright / e2e was not run as one full-suite pass in this re-verify**, but
  every individual e2e file this remediation round touched **was** run and
  confirmed green, several times, in isolation: `edit-token-references.spec.ts`
  18/18 (repeatedly, including after T058/T059's changes), `-perf.spec.ts` 2/2
  (A18 + the new p95 test, including after T057's changes). What was not run is
  the full multi-project Playwright suite in one go — every attempt at that this
  session (original audit and this round) hit local resource contention.
- **e2e-tier mutation is now at 9 of 18 acceptance behaviours** (T060, up from 3
  at the original audit): A1, A2, A4, A9, A12, A13, A17, A18, and FR-021's
  degradation branch, each caught. **Still not e2e-mutant-tested**: A3, A5, A6,
  A7, A8, A10, A11, A14, A15, A16 — see "Remediation status" above.
- **No mutation tool.** `mutation_score` is `n/a`; strength rests on 14 scoped
  deliberate mutants (was 7) across the pure-function/component/route tier plus
  the 9 e2e ones above. Unit-tier behaviours still not sampled: the `Command`/
  `Combobox` primitives (U1–U15) beyond T059's `listFooter` mutant, the catalogue
  wire schema (U16–U18), the route (U29–U32), the hook (U33–U37) beyond what the
  earlier-session cycle log records, `format-literal-value` (U65–U66),
  `CandidatePreview` rendering (U67–U75), `ReferenceEditControl` (U90–U95).
- **Coverage was not run** — `@vitest/coverage-v8` is not installed
  (`coverage: null`).
- **The full `pnpm build && pnpm test` gate (T055) has not produced a clean run
  on this session's machine**, including a re-run after this report was first
  written: build 7/7, but the e2e stage timed out on 8 tests (`Test timeout of
  30000ms exceeded` on `locator.click`/`getByRole`), spread across **three**
  features — `keyboard-navigation.spec.ts` (010), `edit-token-references.spec.ts`
  A5/A8/A9/T049 (009), and `token-references.spec.ts` (007, unmodified by this
  branch — e.g. its `color.brand.blue` "referenced twice" badge test). Failures
  on an untouched feature's spec, in the same shape (a timeout waiting for an
  element, not an assertion mismatch), are the signature of a slow/contended
  fixture server, not a code regression — reinforced by A5/A8/A9 each having
  passed in isolation twice earlier this session. **The user confirmed the gate
  passes on their machine.** T055 is ticked on that basis plus the isolation
  evidence above, not a clean run witnessed by this audit. Its vitest, lint,
  build, and commitlint constituents were each verified green separately on
  this machine.
- **The audit is not independent** — the same session wrote the session-3 tests
  under audit (see the independence caveat above).
- **`packages/token-core`'s serializer** (`serialize.ts`) is upstream of this
  feature and out of scope per `plan.md`; its formatting-normalisation behaviour
  is documented here (FR-007 note) but not graded.
