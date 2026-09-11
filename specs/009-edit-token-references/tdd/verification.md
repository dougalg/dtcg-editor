---
feature: 009-edit-token-references
verdict: PASS_WITH_GAPS
standard: .specify/extensions/tdd/templates/tdd-test-quality-rubric.md
verified_at: e2ec578
behaviors: 131
proven: 128
likely: 0
test_after: 0
no_test: 0
not_applicable: 3
high_smells: 0
med_smells: 3
low_smells: 3
criteria_total: 8
criteria_covered: 7
mutation_score: n/a # no mutation tool (mutation: null in tdd-profile.md); 7 deliberate mutants over 6 behaviors, 6 caught, 1 survived
mutants_survived: 1 # resolveIfRepointed walk-start — real (non-equivalent) survivor inside U107 (DONE)
suite: 689 passed, 0 failed, ~24s (vitest projects only; Playwright not run in this audit — see "What was not audited")
---

# TDD Verification: Edit Token References

**Verdict: PASS_WITH_GAPS.** The discipline holds — 37 unsquashed commits in a
clean test-first shape, a per-behavior cycle log that records the red command (or
the deliberate-mutant check where a behavior passed first run), zero HIGH smells,
no weakened or skipped existing test, and every acceptance criterion reaches a
test. The gaps: one deliberate mutant survived inside a `DONE` behaviour
(`resolveIfRepointed`'s walk-start is unpinned), SC-004's p95 keystroke→list
latency is measured only at the pure-function tier, and e2e-tier mutation plus the
full `pnpm build && pnpm test` gate could not run in this session's degraded local
environment (Playwright runs went from ~15s to 20–35min with non-deterministic
`page.goto` server-suspension failures).

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

- **Playwright / e2e was not run in this audit.** The local environment degraded
  during this long session — `edit-token-references.spec.ts` (normally ~12s) took
  20–35min with non-deterministic `page.goto` `net::ERR_NETWORK_IO_SUSPENDED` /
  navigation-timeout failures, some in the unrelated `keyboard-navigation.spec.ts`
  (feature 010). A1–A20 were last verified green in isolation **earlier this same
  session** (`edit-token-references.spec.ts` 18/18 twice incl. post-rebase;
  `-perf.spec.ts` A18 passing twice), not by this audit.
- **e2e-tier mutation was not performed** (same reason). Only 3 acceptance-layer
  deliberate mutants exist, run earlier in the session and recorded in the cycle
  log — not a systematic pass over A1–A18.
- **No mutation tool.** `mutation_score` is `n/a`; strength rests on 7 scoped
  deliberate mutants over 6 behaviours. Behaviours not sampled: the `Command`/
  `Combobox` primitives (U1–U15), the catalogue wire schema (U16–U18), the route
  (U29–U32), the hook (U33–U37) beyond what the earlier-session cycle log records,
  `format-literal-value` (U65–U66), `CandidatePreview` rendering (U67–U75),
  `ReferenceEditControl` (U90–U95).
- **Coverage was not run** — `@vitest/coverage-v8` is not installed
  (`coverage: null`).
- **The full `pnpm build && pnpm test` gate (T055) was not demonstrated green in
  one run** — see the `/speckit-implement` completion report. Its vitest, lint,
  build, and commitlint constituents were each verified green separately.
- **The audit is not independent** — the same session wrote the session-3 tests
  under audit (see the independence caveat above).
- **`packages/token-core`'s serializer** (`serialize.ts`) is upstream of this
  feature and out of scope per `plan.md`; its formatting-normalisation behaviour
  is documented here (FR-007 note) but not graded.
