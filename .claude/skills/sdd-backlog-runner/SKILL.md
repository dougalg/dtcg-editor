---
name: sdd-backlog-runner
description: >
  Runs the full SDD pipeline (sdd-feature -> sdd-refine -> sdd-plan ->
  sdd-implement -> sdd-review -> archive-task) end-to-end over open items in
  docs/backlog.md, splitting each feature across two fresh dedicated
  background agents (a build agent for feature/plan/implement, then a brand
  new review agent for review/archive/merge) and merging each to main as
  soon as it's done. Use this whenever the user asks to work through the
  backlog, process docs/backlog.md, implement several backlog items, clear
  the backlog, or set up parallel worktrees for backlog work -- including
  phrases like "run the backlog", "work through backlog.md", "do the next
  few backlog items", or "parallelize the backlog". Always prefer this over
  manually looping sdd-feature/sdd-plan/sdd-implement yourself one item at a
  time when more than one backlog item is in play.
---

# SDD Backlog Runner

You are the **coordinator**. Your job is dispatch, tracking, and merge
propagation -- not implementation. Every backlog item's actual SDD work
happens inside **two fresh, single-purpose agents run in strict sequence**,
in a shared git worktree. You never skip or reorder SDD steps for an item,
and you never do a feature's implementation or review work yourself in the
coordinator's own context.

**Why two agents instead of one running the whole pipeline:** a build agent
that writes the implementation is the wrong agent to also grade its own
homework -- it's biased by every shortcut and assumption it made along the
way. Starting review in a brand new agent, with no memory of _why_ the code
was written that way, gives you a genuinely independent check. It also
means an agent is never alive longer than one clear job, which keeps each
one's context focused and easy to reason about.

The point of a dedicated agent per stage is also that the user gets a
nameable thing they can open and talk to directly when it needs a decision.
Don't collapse that back into a relay pattern where every question flows
through you -- that defeats the reason this skill exists.

## Prerequisites

- `docs/project.md` must exist (SDD architecture context). If it doesn't,
  run `sdd-init` first -- every downstream step depends on it.
- `docs/backlog.md` must exist and have at least one open item (`- [ ]`).
  Completed items live in `docs/backlog-completed.md`; ignore those.

## Before dispatching anything: check real state, not memory

This repo may be getting worked on by more than one session or job at the
same time. A task list or your own recollection of "what's already running"
can be stale. Before every dispatch round:

- `git worktree list` and `git branch -a` -- are there worktrees/branches
  already in flight for items you're about to pick up?
- `cat docs/backlog.md` -- fresh read, don't assume it matches what you saw
  earlier in the conversation.
- `git log --oneline -20` on main -- has something merged since you last
  checked?

If you find a worktree or branch that looks like it's already mid-pipeline
for an item, don't duplicate it -- either leave it alone or, if you're
unsure whether it's still active, check whether its agent is still running
before touching its worktree.

## Step 1: Pick this round's items and decide grouping

Read every open item in `docs/backlog.md`. For each, form a quick judgment
about which files/areas it will likely touch (skim the codebase if the
description is vague). Then decide:

- **Running everything serially (one item at a time) is always the safe
  default** and requires no special reasoning.
- **Concurrency is optional** -- only group items to run at the same time
  when you're reasonably confident they won't touch overlapping files. This
  is your judgment call to make; you don't need to ask the user's
  permission to parallelize or to run serially.
- Any item that's repo-wide or high-blast-radius (e.g. a lint/format rule
  change, a dependency bump, a rename that touches every file) must run
  **alone**, with no other agent concurrently active, because merge/rebase
  churn on a change like that will otherwise cascade into every sibling
  item's worktree.
- If one item's outcome clearly shapes another (e.g. both touch the same
  config module), sequence them into waves instead of forcing them
  concurrent -- run the shaping item first, merge it, then start the
  dependent one against fresh main.
- **Concurrency always requires worktrees.** Every feature gets its own
  worktree regardless of whether it's running solo or alongside others --
  this keeps the coordinator's own working tree untouched and gives a
  uniform merge story either way.

## Step 2: Dispatch the build agent

For each item you're starting this round, spawn one `Agent` call:

- `subagent_type: "general-purpose"` (needs Bash, Skill, file edits, git).
- `isolation: "worktree"` -- this gives the agent its own git worktree and
  branch automatically. Note the path/branch the tool result returns; you
  need it for the handoff in Step 3.
- `description`: a short, distinctive label built from the item plus its
  stage, e.g. `backlog build: editable section labels`. This is what the
  user looks for to find and talk to this agent directly, so make it
  recognizable at a glance -- not `backlog-item-1`.
- `run_in_background`: leave at the default (true).
- `prompt`: fill in `references/build-agent-brief.md` with this item's
  backlog description and its worktree/branch slug.

This agent runs `sdd-feature` -> `sdd-refine` (only if actually needed) ->
`sdd-plan` -> `sdd-implement`, then stops -- it does not review or archive
itself, and it does not merge anything. Once it reports implementation
done:

1. Confirm the worktree has real, committed work (not just an idle
   worktree) before moving on.
2. Call `TaskStop` on the build agent. Its job is over; don't continue it
   with `SendMessage` later, even if something about the review stage seems
   related -- that would defeat the fresh-eyes point of splitting it out.

## Step 3: Hand off to a fresh review agent

Spawn a **brand new** `Agent` call for review and archiving -- never
`SendMessage` the build agent back to life, and never reuse a review agent
across features either.

- `subagent_type: "general-purpose"`.
- Do **not** pass `isolation: "worktree"` here -- that would branch a new
  worktree off current main and lose the build agent's uncommitted work.
  Instead, the prompt (via `references/review-agent-brief.md`) tells this
  agent the exact worktree path and branch to `cd` into and work from.
- `description`: same item, stage updated, e.g.
  `backlog review: editable section labels`.
- `prompt`: fill in `references/review-agent-brief.md` with the worktree
  path/branch from Step 2, the item description, and (if any sibling
  features are concurrently in flight) their branch names.

This agent runs `sdd-review`, fixing anything it finds and re-reviewing in
a loop itself (it has full edit/build/test access -- it doesn't need a
third agent for this), until the review is clean or it's genuinely stuck.
Once clean, it runs `archive-task`, then merges its branch into `main`
itself. Once it reports the merge:

1. Verify with `git log` on `main`.
2. Call `TaskStop` on the review agent -- always kill it once archiving and
   merging are confirmed done, before starting the next feature.
3. Propagate the merge to siblings (Step 4) and start this item's slot
   fresh next round with two brand new agents -- nothing carries over
   between features.

## Step 4: While agents are running, stay hands-off except for the mechanical parts

Your involvement while build/review agents are running is limited to:

- **Merge propagation** (mechanical, no human judgment needed): as soon as
  a review agent merges to main, message every other still-running agent
  (`SendMessage`) telling it main has moved and to rebase/merge latest main
  into its branch immediately -- don't wait for it to notice on its own,
  and don't batch this until end of a wave.
- **Noticing blocked agents**: if an agent's run ends because it's waiting
  on a decision, say so plainly to the user (which agent, by its
  description/name) so they know where to go -- but don't answer on its
  behalf, don't paraphrase the question into your own recommendation, and
  don't use `SendMessage` to push an answer you invented. The user talks to
  that agent directly.
- **Re-checking state** before starting the next wave (see the section
  above) -- another item finishing early can change what's safe to
  parallelize next.

## Step 5: Repeat until the backlog is empty

After each merge, re-read `docs/backlog.md` and re-check worktree/branch
state fresh, then decide the next round using Step 1's reasoning again --
always as a fresh build agent followed by a fresh review agent, never
resuming an old one. Stop when there are no open items left.

## Handling conflicts during rebase/merge

Never resolve a conflict by blindly discarding either side. If an agent (or
you, propagating a rebase) hits a conflict against unrelated
work-in-progress on main (e.g. an uncommitted manual edit), stash it,
complete the fast-forward/merge, then reapply the stash and hand-resolve
the conflict -- preserving both sides' intent. If it's not obvious which
side is correct, that's a real escalation, not a judgment call to make
alone.
