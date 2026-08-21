---
name: archive-task
description: >
  Speckit final step. Marks a completed feature's spec.md as Implemented in place
  (specs/<NNN-feature-name>/ stays where it is — nothing is moved), then updates
  docs/history.md with the new feature and any architecture decisions made, and
  moves any matching item out of docs/backlog.md into docs/backlog-completed.md.
  Use after speckit-implement (and speckit-analyze, if run) is complete and the
  feature is ready to merge.
argument-hint: <feature-name> (optional, derived from spec.md if omitted)
---

# Archive Task

## Inputs

| Input          | Required | Description                                                        | Example              |
| -------------- | -------- | -------------------------------------------------------------------- | --------------------- |
| `feature_name` | Optional | Human-readable feature name, for `docs/history.md`/backlog entries. Derived from `spec.md`'s heading if omitted. | `JWT Authentication` |

## Steps

### Step 0: Sync with main (ALWAYS DO THIS FIRST, before touching any file)

This skill's own output — `docs/history.md`, `docs/backlog.md`, `docs/backlog-completed.md` —
is shared state that other `archive-task` runs, other feature branches, and other sessions
write to as well. If the branch this skill is running on has fallen behind local `main`, its
edits to those files are based on a stale copy: two runs archiving different features can each
append to the same table/list independently and unknowingly, and whichever one commits second
either conflicts or silently clobbers the first. Catch this before Step 1 does any resolution
or writing, not after.

- Compare the current branch against local `main` — not `origin/main`; per this repo's
  local-first convention, "main" always means the local branch: `git merge-base --is-ancestor
  main HEAD`. If that succeeds, the branch already contains everything on `main`; proceed
  straight to Step 1.
- If it fails, `main` has moved ahead. Rebase onto it: `git rebase main`. This repo rebases
  rather than merges (see `CONTRIBUTING.md`), and since this is a local, not-yet-merged feature
  branch, rewriting its history here is safe — nothing else depends on these commits' current
  SHAs yet.
- If the rebase hits conflicts, they will most likely land in exactly the shared files named
  above, because they're the ones this skill (and others like it) habitually append to. That's
  expected, not a sign something went wrong: resolve by keeping both sides' additions side by
  side — a new `## Features` entry, a new `## Architecture Decisions` row, a new
  `docs/backlog-completed.md` line — rather than discarding either one. These files are
  additive logs; a conflict here almost never means the two changes actually contradict each
  other, only that they landed at the same list position.
- After resolving (`git add` the fixed files, `git rebase --continue`), re-run this repo's
  build/lint/test commands once before continuing — a rebase can replay commits in a different
  tree state than they were originally written against, and it's cheap to confirm nothing broke
  before layering these changes on top.
- Only once the branch is confirmed even with `main` (the ancestor check above passes) should
  Step 1 begin.

### Step 1: Validate Inputs (before any file is written)

Check the conversation for `feature_name` and resolve the feature directory the same way
speckit does: run `.specify/scripts/bash/check-prerequisites.sh --json` (or read
`.specify/feature.json`) to get `FEATURE_DIR`, which resolves to `specs/<NNN-feature-name>/`.

- If `FEATURE_DIR` can't be resolved, or `spec.md` / `plan.md` do not exist inside it → check
  **main's** copy of `docs/backlog.md` (`git show main:docs/backlog.md` — not the working copy
  in your current directory, which can be on a different or stale branch) for a
  `(in progress — worktree \`...\`, branch \`...\`)` note matching this feature before stopping.
  If one exists, tell the user to `EnterWorktree` into that path instead — this step needs to
  run from the worktree where the feature was actually built, not wherever the session happens
  to be. Only stop and say both files are required if no such note exists either.
- If `feature_name` is provided → use it as the human-readable name in `docs/history.md`/backlog
  text.
- If `feature_name` is missing → read `spec.md` and derive it from the
  `# Feature Specification:` heading (e.g. `# Feature Specification: User Authentication` →
  "User Authentication").

---

## Process

### 1. Verify Completion

Read `tasks.md` in `FEATURE_DIR` and check that all tasks are checked off. If `spec.md` has
its own acceptance-criteria or success-criteria checkboxes, check those too. If any are
unchecked, warn the user and ask for confirmation before marking the feature implemented —
"implemented" is a claim about the code, not just a formality, so it shouldn't be asserted
past what the task list actually backs up.

### 2. Update docs/history.md

This is a critical step. Read `docs/history.md` in full, then read the `spec.md` and `plan.md`
for the feature being completed to extract what actually changed. Update `history.md` across
the following sections — add sections if they do not already exist.

#### 2a. Features List

Locate or create a `## Features` section. Add the new feature as a single line entry:

```markdown
## Features

- **<Feature Name>**: <one-sentence description of what it does> (`specs/<NNN-feature-name>/`)
```

Preserve the existing list. Append the new entry — do not reorder or remove existing entries.

#### 2b. Architecture Decisions

Scan `spec.md` (Clarifications, Edge Cases, Requirements) and `plan.md` (Architecture Decisions,
Technical Context) for any decisions that represent a meaningful change or addition to how the
system is built.

Examples of what qualifies:

- A new architectural pattern introduced (e.g., added an event-driven flow, introduced CQRS for a module)
- A cross-cutting decision that will affect future features (e.g., "all auth tokens use RS256 signing")
- A deliberate deviation from existing conventions, with rationale
- A new integration point with an external system

Examples of what does NOT qualify:

- Routine implementation choices that follow existing conventions
- File naming or package placement decisions
- Minor refactors that don't change architectural direction

For qualifying decisions, locate or create an `## Architecture Decisions` section:

```markdown
## Architecture Decisions

| Date   | Decision           | Rationale | Feature                                     |
| ------ | ------------------ | --------- | -------------------------------------------- |
| <date> | <what was decided> | <why>     | [<Feature Name>](specs/<NNN-feature-name>/) |
```

If the table already exists, append a new row. Do not recreate the table.

#### 2c. API Surface (if applicable)

If the feature added or changed REST endpoints, locate or create an `## API` section
and document the new endpoints:

```markdown
## API

| Method | Path                 | Description                    | Auth Required       |
| ------ | -------------------- | ------------------------------ | ------------------- |
| POST   | /api/v1/auth/login   | Authenticate user, returns JWT | No                  |
| POST   | /api/v1/auth/refresh | Refresh access token           | Yes (refresh token) |
```

Only add endpoints that are new or changed. Preserve existing entries.

#### 2d. Environment / Configuration

If the feature introduced new environment variables, configuration keys, add them to an
`## Environment & Configuration` section:

```markdown
## Environment & Configuration

| Key                | Description                 | Required | Default |
| ------------------ | --------------------------- | -------- | ------- |
| JWT_SECRET         | Secret key for JWT signing  | Yes      | —       |
| JWT_EXPIRY_MINUTES | Access token TTL in minutes | No       | 15      |
```

#### 2e. Related Backlog Items

If `docs/backlog.md` exists, scan its unchecked items (`- [ ] ...`) for any that describe
the feature being completed — match on feature name, description, or an existing
"(in progress — worktree ..., branch ...)" pointer left by `pick-up-task`. A match
doesn't have to be an exact string; use judgment (e.g. a backlog line like "Enforce
conventional commits" matches a feature named "Enforce Conventional Commits").

For each match, prepare (don't write yet) a move rather than an in-place edit: the item is
removed entirely from `docs/backlog.md` and appended to `docs/backlog-completed.md` (creating
it if it doesn't exist, with a one-line heading/intro — see an existing entry for the
convention), rewritten as `- [x]` with a pointer to the feature directory, replacing any stale
in-progress note:

```markdown
- [x] Enforce conventional commits — done, see `specs/<NNN-feature-name>/`
```

Do not leave a `[x]` copy behind in `docs/backlog.md` — the line moves, it isn't duplicated.

Note that the copy of `docs/backlog.md` in this worktree may not even contain the
in-progress note `pick-up-task` committed to `main` (worktrees usually branch before
that commit exists locally). That's fine — match on the item's description regardless of
whether the note is present here. When this branch eventually merges into `main`, expect a
small conflict on this exact line (`main` still has the in-progress note; this branch has
either removed the line or rewritten it to `[x]`) — resolve it by keeping this branch's
completed version and dropping the stale note, not by merging the two texts together.

If nothing in `docs/backlog.md` matches, that's fine — note "no matching backlog item found"
in the Step 3 preview rather than silently skipping it or inventing a match. If
`docs/backlog.md` doesn't exist at all, skip this substep entirely (don't create either file).

### 3. Show the history.md and Backlog Changes

Before writing anything, present a summary of every change you are about to make — to
`spec.md`'s status line, `history.md`, and, if applicable, `docs/backlog.md` /
`docs/backlog-completed.md`:

```
## Proposed spec.md Update
- Status: Draft → Implemented (2026-08-20)

## Proposed history.md Updates

### Features (1 addition)
- Added: JWT Authentication

### Architecture Decisions (1 addition)
- Added: All tokens signed with RS256; public key distributed via /.well-known/jwks.json

### API (2 additions)
- Added: POST /api/v1/auth/login
- Added: POST /api/v1/auth/refresh

### Environment & Configuration (2 additions)
- Added: JWT_SECRET
- Added: JWT_EXPIRY_MINUTES

## Proposed Backlog Changes
- Removing from docs/backlog.md: "JWT Authentication"
- Adding to docs/backlog-completed.md: "JWT Authentication" — done, pointing at specs/<NNN-feature-name>/
```

(If no backlog item matched, replace the last section with `## Proposed Backlog Changes` /
`- No matching backlog item found — left unchanged.` so the user can confirm that's expected
rather than an oversight.)

Ask the user to confirm before writing. If they request changes to the proposed
updates, apply their corrections first, then write the files.

### 4. Mark the Feature Implemented

`spec.md`'s template header already carries a `**Status**: Draft` line (alongside
`**Feature Branch**`, `**Created**`, `**Input**`) — flip it in place rather than moving the
directory anywhere. This keeps the feature discoverable at its original, stable path
(useful for anything that links to it — `docs/history.md`, PR descriptions, other specs)
instead of forcing every such link to be rewritten to a new archive location.

Edit `FEATURE_DIR/spec.md`:

```diff
-**Status**: Draft
+**Status**: Implemented (<yyyy-mm-dd>)
```

`specs/<NNN-feature-name>/` itself — `spec.md`, `plan.md`, `tasks.md`, and whichever of
`research.md`, `data-model.md`, `quickstart.md`, `contracts/`, `checklists/` exist — stays
exactly where it is. Nothing is moved, renamed, or deleted.

### 5. Confirm

Report the final summary to the user:

- `specs/<NNN-feature-name>/spec.md`'s Status updated to `Implemented (<date>)`
- Sections updated in `docs/history.md`
- Backlog item moved from `docs/backlog.md` to `docs/backlog-completed.md`, if a match was found (or a note that none was)
- Remind them to commit `specs/<NNN-feature-name>/spec.md`, `docs/history.md`, `docs/backlog.md`, and `docs/backlog-completed.md` (if changed) to version control
