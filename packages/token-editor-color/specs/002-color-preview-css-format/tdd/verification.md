---
feature: 002-color-preview-css-format
verdict: FAIL
standard: .specify/extensions/tdd/templates/tdd-test-quality-rubric.md
verified_at: 49802ed
behaviors: 15
proven: 3
likely: 0
test_after: 10
no_test: 0
not_applicable: 2
high_smells: 0
criteria_total: 6
criteria_covered: 6
mutation_score: unmeasured # no mutation tool in tdd-profile.md; deliberate mutants used
mutants_survived: 0 # 0 full-suite survivors; 1 partial (see Mutation results)
suite: 71 passed + 41 node:test passed, 0 failed (package); repo-wide apps/web-app e2e 71/73 passed, 2 pre-existing baseline flake unrelated to this feature
---

# TDD Verification: Color Token Preview CSS-Style Formatting

**This audit was not independent for Phases 0, 1, 2, 4, 5, and 6** — it was run by
the same session that wrote the tests and drove the loop. Phase 3 (the smell
pass) was delegated to a fresh-context subagent with no prior knowledge of this
work, per the rubric's instruction; its findings are reported verbatim below and
were independently corroborated by a fresh deliberate mutant I ran myself in
Phase 4. Everywhere else, treat "I checked X" as self-audit, not independent
verification — the git-history cross-check (Phase 1/2) is the strongest
counterweight available, since it does not depend on memory.

**Verdict: FAIL.** Not because the work is undisciplined — 3 behaviors are
`PROVEN` with real red-then-green evidence, 0 `HIGH` smells were found, all 6
acceptance scenarios are covered — but because **10 of 15 behaviors classify as
`TEST_AFTER`** under the rubric's strict git-history criteria: their tests were
written in commits *after* the source commit that already made them pass. This
is the rubric working as designed, catching something `/speckit.tdd.run`'s own
rules explicitly sanction (a test that "passes on first run" because an earlier,
correctly-general implementation already covers it, verified with a deliberate
mutant instead of a literal red) but that a strict "did the test come first"
audit cannot credit as `PROVEN`. See the Test-first evidence section for the
full reasoning — this is a real, load-bearing finding about the two commands'
differing standards, not a data-entry mistake.

## Test-first evidence

| Behavior | Class | Evidence |
|---|---|---|
| A1 | PROVEN | Cycle log records the red command + failure output; `9602458` changes the e2e test and `ColorPreview.tsx` + `ColorPreview.test.tsx` together, matching the log |
| A2 | PROVEN | Same commit, same red (the e2e test's two assertions — swatch attribute and text — are one test) |
| U1 | PROVEN | Cycle log red: `Unable to find an element with the text: oklch(0.7 0.1 180 / 0.8)`; `9602458` adds `ColorPreview.test.tsx`'s first test and the `ColorPreview.tsx` implementation in the same commit |
| U2 | TEST_AFTER | No red recorded (cycle log: "passed on first run"); `ColorPreview.tsx`'s source change landed in `9602458`, this test's addition in `79e54b6` — later |
| U3 | TEST_AFTER | Same as U2 — `79e54b6` |
| U4 | TEST_AFTER | Same as U2 — `79e54b6` |
| U5 | TEST_AFTER | Same as U2 — `79e54b6` |
| U6 | TEST_AFTER | Same as U2 — `79e54b6` |
| U7 | TEST_AFTER | No red recorded; test added in `d93886b`, after the `9602458` source change |
| U8 | TEST_AFTER | Cycle log records a red, but it is a **broken-test** red (`Invalid Chai property: toBeEmptyDOMElement`), not a behavior-missing red — the rubric's `PROVEN` criteria requires the red to demonstrate the behavior is missing, which this one does not; the real (fixed) test then passed on first run, same as U2–U7. Added in `d93886b`, after `9602458` |
| U9 | TEST_AFTER | No red recorded (passed on first run; cycle log's mutant check took 3 attempts, 2 of which were false negatives — see Findings #2); added in `fc30239`, after `9602458` |
| A3 | TEST_AFTER | Proxied by U7 (no test of its own — `tdd/test-list.md`'s own recorded scoping decision); inherits U7's classification |
| A6 | TEST_AFTER | Proxied by U8; inherits U8's classification |
| A4 | NOT_APPLICABLE | Not a characterization test in the rubric's literal sense, but the closest fit: verified by an unchanged pass count on pre-existing tests against code this feature did not touch, which is exactly what `NOT_APPLICABLE`'s "green by definition against untouched code" describes |
| A5 | NOT_APPLICABLE | Same as A4 |

**Why 10 behaviors are `TEST_AFTER` despite following `/speckit.tdd.run`'s own
rules**: `U1`'s cycle made the "obvious implementation" move — swap
`formatRaw()` for the already-existing, already-tested `colorValueToCssColor`.
That one correct, general change made `U2`–`U9` pass before their tests
existed, because the function they exercise was already right for every case.
The playbook explicitly sanctions writing the test afterward and proving it
isn't vacuous with a deliberate mutant instead of a literal red (Step 3's
table: "Test passes on first run → Verify with a deliberate mutant"). That is
what happened, and it is recorded honestly in `tdd/cycle-log.md`, cycle by
cycle. But `/speckit.tdd.verify`'s `PROVEN` bar is stricter: it requires the
test file to have changed *in the same commit as, or before,* the source
change. A correctly-generalizing first implementation structurally cannot
satisfy that bar for the behaviors it also happens to satisfy. This is not a
flaw unique to this feature — it will recur for any feature where one small,
correct change legitimately covers several list items at once, unless the
loop is deliberately run in a less efficient way that writes every
representative test case in a single batch *before* the first implementation
edit. Recorded here as a process observation for future features, not a
defect in this one.

**Weakened-existing-test check**: none found — the opposite happened. The one
pre-existing test this feature touched
(`apps/web-app/e2e/edit-token-references.spec.ts`'s "A7" test, commit
`9602458`) had its assertion **strengthened**: a loose regex
(`/0\.2.*0\.4.*0\.9/`, which would have matched the old raw-JSON output just as
well as the new CSS text) became an exact string match
(`"color(srgb 0.2 0.4 0.9)"`). Confirmed independently by the smell-pass
subagent (see Findings) and by my own reading of the diff.

**tasks.md-vs-test-list cross-check**: no mismatches. Every task ticked `[X]`
with a behavior marker has that behavior at `DONE`; every `DONE` behavior with
a test/implementation task has that task ticked.

## Findings

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | MED | No component-level test asserts anything about the `<Swatch>` child — only the adjacent text is checked. A deliberate mutant I ran (`Swatch value={value}` → `Swatch value="#000000"`) **survived all 9 component-level tests** (`ColorPreview.test.tsx` + `.a11y.test.tsx`, both fully green with the mutant in place) and was only caught by the real-entry-point e2e test (A1/A2, `edit-token-references.spec.ts`). Independently corroborated by the smell-pass subagent, which flagged the same gap by inspection before I ran the mutant. Not a `HIGH`/surviving-mutant-inside-a-DONE-behavior finding in the strict sense — the acceptance layer (A2, itself `PROVEN`) does catch it — but the component suite's safety net for SC-002 ("swatch and text can never disagree") is thinner and slower than it should be: a regression here is caught only by the (much slower) Playwright suite, not the fast Vitest one. | `packages/token-editor-color/src/components/ColorPreview/ColorPreview.test.tsx` (no assertion references `Swatch`, `--swatch-color`, or `style` anywhere in the file) |
| 2 | LOW | U9's deliberate-mutant check (cycle-log.md, Cycle 5) took 3 attempts before finding a real kill — `role="button"` and a dangling `aria-labelledby` both produced false negatives (not flagged by this axe ruleset/scope) before a low-contrast mutation was caught. Recorded honestly in the cycle log rather than only reporting the successful attempt, which is good practice, but worth noting that 2 of 3 candidate mutants for this test would not have proven a regression. | `tdd/cycle-log.md` Cycle 5 |
| 3 | LOW | `ColorPreview.a11y.test.tsx` covers one variant (oklch with alpha). The in-package exemplar (`ColorFunctionValue.a11y.test.tsx`) covers alpha-present and alpha-absent separately; `ColorPreview` also has an alpha-absent branch (U6) and a legacy-hex branch (U7) that are unit-tested but never exercised through axe. Not a `HIGH`/foreign-style finding — `ColorPreview`'s markup is simpler and may not need it — but a smaller a11y surface than the package's own established pattern. | `packages/token-editor-color/src/components/ColorPreview/ColorPreview.a11y.test.tsx` |
| 4 | LOW (out of scope for this feature) | `.specify/memory/tdd-profile.md`'s `node-packages` entry (nominally covering `packages/token-editor-color`) documents `node:test` + `node:assert/strict` as the convention, but this package's own component tests (both pre-existing, e.g. `ColorFunctionValue.*`, and this feature's `ColorPreview.*`) actually use Vitest + `@testing-library/react` + a real-Chromium a11y layer. The profile is stale for this package's `.tsx` tests, not wrong about this feature's own files (which correctly followed the in-package exemplar instead). Flagged for a future `speckit-tdd-setup refresh`, not a remediation task on this feature. | `.specify/memory/tdd-profile.md` |

No `HIGH` findings.

## Mutation results

No mutation tool configured (`tdd-profile.md`: `mutation: null`). Deliberate mutants:

| Mutant | Behavior | Survived (full suite) | Judgment |
|---|---|---|---|
| `ColorPreview.tsx`: `<Swatch value={value} />` → `<Swatch value="#000000" />` (fresh, this audit) | A2 / SC-002 | No — killed by the e2e A7 test | Real gap at the component-test layer (Finding #1), but not an equivalent mutant and not a full-suite survivor; the acceptance layer's `PROVEN` A2 test is the actual safety net today |
| 8 mutants from `tdd-run` (cycle-log.md, Cycles 1–5: `+ "X"` appended to `cssColor` ×3, guard `if (!parsed.success)` → `if (false)` ×1, `role="button"` / `aria-labelledby` / low-contrast style ×3) | U1–U9 | Self-reported: all killed except 2 explicitly-recorded false negatives (Finding #2), all restored | Self-reported evidence, cross-checked against `git diff` emptiness claims in the same log entries; not independently re-run in this audit pass beyond the fresh mutant above |

## Traceability

| Criterion | Tests | End to end |
|---|---|---|
| US1-AS1 (oklch + alpha → CSS, not JSON) | U1 (unit); A1 covers the general claim via a different color space (srgb) at the real entry point | Partial — the requirement (FR-001) is end-to-end verified, but not with this scenario's specific color space |
| US1-AS2 (swatch/text agree) | A2 | Yes |
| US1-AS3 (legacy hex unaffected) | U7 (unit only) | No — see note below |
| US2-AS1 (editor renders unaffected) | A4 (existing suite + diff) | Yes, by absence-of-change rather than a new assertion |
| US2-AS2 (editing still works) | A5 (existing suite + diff) | Yes, by absence-of-change |
| US3-AS1 (declines on invalid value) | U8 (unit only) | No — see note below |

**Two criteria (US1-AS3, US3-AS1) have no real-entry-point test** — this was a
deliberate scoping decision recorded in `tdd/test-list.md` at planning time (no
legacy-hex candidate token exists in the e2e fixture set; a schema-invalid
color isn't reachable through normal app navigation), not an oversight
discovered now. Per the rubric's Phase 5 rule 4 ("a criterion covered only by
unit tests with doubles at every boundary is not verified end to end"), this
is reported as a real gap regardless of whether the scoping decision was
reasonable — `ColorPreview` doesn't use doubles at its boundaries (it's a real
render, not a mocked one), which narrows the gap, but it is still not proven
through the actual app.

Untested criteria: none (every criterion has at least a unit test).
Tests tracing to nothing: none.

## What was not audited

- **Independence**: this audit was run by the session that wrote the code,
  for every phase except the smell pass (Phase 3), which was delegated to a
  fresh subagent. Treat Phases 0/1/2/4/5/6 as self-audit, strengthened by
  the git-history cross-check (which does not depend on memory) but not
  equivalent to a cold external review.
- **Mutation testing**: no tool configured; only 1 fresh + 8 self-reported
  deliberate mutants, not exhaustive. A real mutation run would likely surface
  more of the same class of finding as #1 (thin component-level coverage of
  the swatch/text-agreement property).
- **Performance**: not assessed — no criterion in `spec.md` calls for it.
- **The two proxied criteria's real-app reachability**: I did not attempt to
  construct a real e2e fixture for legacy-hex or invalid-color candidates to
  verify the "not reachable through normal navigation" claim in
  `tdd/test-list.md`'s scoping note — I took that record at face value rather
  than re-deriving it.
- **`packages/token-editor-color`'s other components**: only `ColorPreview`
  and the one touched e2e test were graded. `ColorEditor` and its subtree were
  confirmed *unchanged* (via suite pass-count and diff), not re-audited for
  their own pre-existing test quality — out of this feature's scope.
