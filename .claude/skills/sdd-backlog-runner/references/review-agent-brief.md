# Review-agent brief template

Fill in `{ITEM_DESCRIPTION}`, `{WORKTREE_PATH}`, `{BRANCH}`, and
`{SIBLING_BRANCHES_SECTION}` and use the result as the `prompt` for the
Step 3 `Agent` call. This agent has no memory of the build agent that came
before it -- that's intentional, it's reviewing cold.

---

You own the review, archive, and merge phase of one backlog item. A
separate agent already ran `sdd-feature`/`sdd-plan`/`sdd-implement` for
this item and stopped -- you're picking up fresh, without its context, so
you can review the work honestly rather than rubber-stamping your own
reasoning.

**Start here:** `cd {WORKTREE_PATH}` (branch `{BRANCH}`) and do all your
work relative to that directory. Do not use worktree isolation yourself and
do not create a new worktree -- this one already has the implementation
committed on it, and that's what you're reviewing. Read `feature.md`,
`plan.md`, and the actual diff/commits on this branch before doing
anything else, so you understand what was supposed to happen and what
actually happened.

**Your item, verbatim from `docs/backlog.md`:**

> {ITEM_DESCRIPTION}

**Run these steps, invoking each with the `Skill` tool:**

1. `sdd-review` -- always. If it finds problems, fix them yourself (you
   have full edit/build/test access) and re-review. Loop this until the
   review comes back clean. Only stop and surface the problem (see "When
   you need the user" below) if you've made a real attempt and are
   genuinely stuck -- not on the first sign of friction.
2. `sdd-archive` -- only once review is clean. This archives the spec and
   updates `docs/project.md` / `docs/backlog-completed.md`.

**When you need the user:**

Some decisions are genuinely not yours to make -- ambiguous requirements, a
breaking change, a subjective design/UX call, or a fix loop you're
genuinely stuck on. When you hit one, stop and state the question(s)
plainly (batch more than one together if you have several at once). There
is no coordinator relaying this for you -- whoever is watching this agent
will read your question directly and reply directly.

**If another feature merges to main while you're still working:**

You may be told (via a message to this agent) that main has moved.
Immediately rebase or merge latest main into your branch before continuing.
Resolve any conflict carefully -- never blindly discard either side. If
it's genuinely unclear which side is correct, surface that as a question
rather than guess.

{SIBLING_BRANCHES_SECTION}

**Merging when you're done:**

Once `sdd-archive` has committed its changes on your branch, you are
responsible for landing this feature on `main` yourself:

1. Fetch/check `main`'s current state. If it has moved since the build
   agent branched, rebase or merge it into your branch first and resolve
   any conflicts (see above).
2. Merge your branch into `main` (fast-forward if clean, otherwise a merge
   commit -- check `git log` on main for which style this repo already
   uses and match it).
3. Report back clearly: what merged, the final commit hash, and which
   files you touched that a sibling feature might also care about (so the
   coordinator can judge overlap for future rounds).

---

### Placeholder notes for the coordinator

- `{ITEM_DESCRIPTION}`: the exact backlog line, not a paraphrase.
- `{WORKTREE_PATH}` / `{BRANCH}`: exactly what the build agent's `Agent`
  call returned in Step 2 -- this is how continuity is preserved across the
  agent handoff without `SendMessage`.
- `{SIBLING_BRANCHES_SECTION}`: if other features are concurrently in
  flight, include a short list of their branch names/descriptions here. If
  this item is running solo, omit this section entirely rather than
  leaving it empty.
