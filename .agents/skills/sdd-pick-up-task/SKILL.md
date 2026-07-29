---
name: sdd-pick-up-task
description: >
  SDD step 0.5 (optional, run before /sdd-feature). Lets the user pick an open
  item from docs/backlog.md or propose a brand-new task, then claims it: marks
  it in-progress with a worktree pointer directly on the backlog line and
  opens a dedicated git worktree for the work via EnterWorktree. Also resumes
  an already-claimed item by finding and re-entering its existing worktree
  instead of creating a duplicate one. Use when the user wants to start work
  on a backlog item, asks "what should I work on next", wants an isolated
  worktree set up before /sdd-feature, or wants to come back to a task they
  (or someone else) already started.
argument-hint: <backlog item to pick up, or new task to add (optional)>
---

# SDD: Pick Up a Backlog Task

You are helping the user claim a single unit of SDD work and get it isolated
in its own git worktree before the feature pipeline (`/sdd-feature` onward)
starts.

## Why this exists

`docs/backlog.md` is shared coordination state — more than one person or
agent session may be looking at it at once. This skill exists to solve two
problems that come from that:

- Without a visible "claimed" marker, two sessions can both run
  `/sdd-feature` against the same backlog line and duplicate the work.
- Once work is claimed and living in its own worktree, a session picking the
  same line back up later (a restart, a different terminal, a teammate)
  needs to find and re-enter that worktree rather than starting a second one
  from scratch.

## Pre-conditions

- Always start in the `main` branch. If you are in a worktree, leave it and go back to main
- If `docs/backlog.md` doesn't exist yet, there's nothing to pick from — treat
  every request as "propose a new task" and create the file first, using the
  header/intro style already established in similar SDD docs (see how
  `docs/backlog-completed.md` introduces itself, if it exists, for the tone).
- Before doing anything else in Step 1, run `git worktree list` and
  `git branch -a`. Treat their actual output, not anything you recall from
  earlier in the conversation, as the source of truth for which worktrees are
  genuinely still alive — backlog notes can go stale if a worktree was
  removed without updating the file.

## Step 1: Find out what the user wants to work on

If the conversation already names a specific backlog item or a new task
description, skip straight to Step 2 with that as the selection.

Otherwise, read `docs/backlog.md` and present the open items, distinguishing
two kinds of line:

- Plain open items (`- [ ] ...`) — free to claim.
- Items already carrying a `(in progress — worktree \`...\`, branch \`...\`)`
  note — still show these, but label them as already claimed. The user might
  want to resume one instead of starting something new.

Ask which one they'd like, or whether they'd rather describe a new task to
add. Wait for their answer before proceeding.

## Step 2: Resolve the selection

**Brand-new task** (not one of the listed items): prepend it to the top of
`docs/backlog.md`'s item list as a new `- [ ]` line, matching the voice and
format of existing entries. Show the user the line you added. This is now the
selected item — continue to Step 3.

**An already-claimed item:** don't create a second worktree for it — that
would fork the work in two directions and leave one half orphaned. Instead:

1. Parse the worktree path out of its note and check it against the
   `git worktree list` output you already captured in Pre-conditions.
2. If it's genuinely still there, tell the user you're resuming it, then call
   `EnterWorktree` with that exact `path`. Skip Steps 3 and 4 — the worktree
   and its claim note already exist; there's nothing left to set up.
3. If that path is *not* in `git worktree list` anymore (pruned, deleted,
   whatever), the note is stale. Say so plainly, and ask whether to clear the
   stale note and re-claim the item fresh (continue to Step 3) or investigate
   first — e.g. the branch may still exist under `git branch -a` even if the
   worktree directory is gone, in which case the work isn't actually lost.

**A plain open item:** continue to Step 3.

## Step 3: Claim the item on docs/backlog.md

Derive a short kebab-case slug from the item's text — the same style
`/sdd-archive` already uses for its archive folder names (a few meaningful
words, not the full sentence).

Edit the item's line in `docs/backlog.md` to append a claim note. Leave the
checkbox unchecked — claiming isn't finishing:

```
- [ ] <original item text> (in progress — worktree `.claude/worktrees/<slug>`, branch `worktree-<slug>`)
```

Show the user the diff. Because this file is shared state other sessions
rely on to avoid duplicate work, **ask before committing** — something like:
"This marks the item as claimed so nothing else picks it up concurrently. OK
to commit this to `docs/backlog.md` on main directly (and push, if there's a
remote)?" Only commit or push once they confirm. If they decline, tell them
plainly that the claim won't be visible to any other session until it is
committed — so the collision risk this skill exists to prevent is still live.

## Step 4: Open the worktree

Call `EnterWorktree` with `name` set to the exact same slug used in Step 3,
so the tool's own naming convention produces the matching
`.claude/worktrees/<slug>` path and `worktree-<slug>` branch that the claim
note already points at.

One thing worth telling the user: because worktrees typically branch from
`origin/<default-branch>`, the new worktree's own copy of `docs/backlog.md`
may *not* contain the claim note you just committed on main — unless that
commit was already pushed and the branch picks it up. That's expected and
harmless: the note's job is to be visible on main for other sessions, not to
be read from inside the worktree. It resolves itself as a small, easily
handled conflict later, at merge/archive time (see `/sdd-archive`'s note on
this).

## Step 5: Hand off

Confirm the worktree is ready, and prompt the user to run `/sdd-feature`
next — they can hand it the item's text verbatim rather than re-typing it.

## A note for every step after this one

`/sdd-feature`, `/sdd-refine`, `/sdd-plan`, `/sdd-implement`, `/sdd-review`,
and `/sdd-archive` all know to check `docs/backlog.md` for a claim note
matching their target feature before assuming they're starting fresh. If one
of them tells the user to switch worktrees via `EnterWorktree` first, that's
this skill's claim note doing its job — follow that redirect rather than
proceeding in the wrong directory.
