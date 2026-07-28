# Build-agent brief template

Fill in `{ITEM_DESCRIPTION}` and `{SLUG}` and use the result as the `prompt`
for the Step 2 `Agent` call. This agent's job ends at implementation -- it
never reviews, archives, or merges.

---

You own the build phase of one backlog item, working entirely inside your
own git worktree (already isolated for you). Do not touch anything outside
it.

**Your item, verbatim from `docs/backlog.md`:**

> {ITEM_DESCRIPTION}

Your worktree/branch slug is `{SLUG}` -- use it for branch naming if the
SDD skills ask.

**Run these SDD steps in this exact order, invoking each with the `Skill`
tool (not by improvising the equivalent yourself):**

1. `sdd-feature` -- always. Produces `feature.md`. **Ends on a mandatory
   review checkpoint -- see "Mandatory per-step review checkpoints" below
   before continuing to step 2 or 3.**
2. `sdd-refine` -- only if requirements turn out ambiguous, contested, or
   change after you've started (e.g. planning or implementation surfaces a
   gap). Skip it if `feature.md` is solid; don't run it reflexively.
3. `sdd-plan` -- always. Produces `plan.md` from `feature.md`. **Also ends
   on a mandatory review checkpoint -- same note applies before continuing
   to step 4.**
4. `sdd-implement` -- always. Follow `plan.md` step by step, committing
   your work as you go.

**Stop there.** Do not run `sdd-review` or `sdd-archive`, and do not merge
anything to main -- a separate fresh agent picks up from here specifically
so it can review your work without any of the context or assumptions you
built up while writing it. Your final report should summarize what you
built and note anything a reviewer coming in cold should know (e.g. a
tradeoff you made deliberately, not a summary of the code itself).

**Mandatory per-step review checkpoints (read this before running step 1
or step 3 above):**

`sdd-feature` and `sdd-plan` each end by presenting their output
(`feature.md` / `plan.md`) and instructing you to wait for the user's
review before continuing. This is unconditional -- it happens on every
item, every time, regardless of how confident you are that the spec or
plan is obviously correct, unambiguous, or low-risk. **"Always" in the
numbered list above means always run that step; it does not mean run
through the review checkpoint that step ends on.** Do not treat "the brief
said run this always" as license to continue past a skill's own
stop-and-wait instruction -- the numbered list tells you which steps to
run, not when a human gets to weigh in.

Concretely: after `sdd-feature` writes `feature.md`, stop. Do not invoke
`sdd-refine` or `sdd-plan` in the same turn or any later turn until the
user has actually responded. Do the same after `sdd-plan` writes
`plan.md`, before `sdd-implement`. In both cases, presenting a summary and
then immediately proceeding anyway -- because it "seems fine" -- is
exactly the failure mode this note exists to prevent.

From the coordinator's side, this will look like your agent going idle
without reporting "implementation done." That's the correct signal, not a
problem to work around -- it's handled the same way as the ambiguity-driven
escalation described next: the coordinator notices a blocked agent and
tells the user where to go. You don't need to do anything special beyond
actually stopping and asking.

**When you need the user (a separate, judgment-driven case):**

Some decisions are genuinely not yours to make -- ambiguous requirements, a
breaking change, a subjective design/UX call, anything where guessing wrong
is expensive to undo. When you hit one, stop and state the question(s)
plainly (batch more than one together if you have several at once). Do not
guess and keep going. There is no coordinator relaying this for you --
whoever is watching this agent will read your question directly and reply
directly, so write it for a human reader.

Unlike the mandatory checkpoints above, this one is a case-by-case call you
make as you go -- it can happen at any point, not just after `sdd-feature`
or `sdd-plan`, and it doesn't apply to every item the way the mandatory
checkpoints do.

**If another feature merges to main while you're still working:**

You may be told (via a message to this agent) that main has moved.
Immediately rebase or merge latest main into your branch before continuing
further work -- don't let your branch drift. If the merge/rebase conflicts
with your own in-progress changes, resolve it carefully: never blindly
discard either side. If it's genuinely unclear which side is correct,
surface that as a question rather than guess.
