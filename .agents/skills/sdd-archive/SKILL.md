---
name: sdd-archive
description: >
  SDD step 7. Archive feature.md and plan.md into docs/specs-archive/<yyyymmddHHMM>-<feature-name>/ directory,
  then update docs/project.md with the new feature, and any architecture decisions made,
  and move any matching item out of docs/backlog.md into docs/backlog-completed.md.
  Use after /sdd-review is complete and the feature is ready to merge.
argument-hint: <feature-name> (optional, derived from feature.md if omitted)
---

# SDD: Archive

## Inputs

| Input          | Required | Description                                                                      | Example              |
| -------------- | -------- | -------------------------------------------------------------------------------- | -------------------- |
| `feature_name` | Optional | Archive folder name in kebab-case. Derived from `feature.md` heading if omitted. | `jwt-authentication` |

## Steps

### Step 0: Validate Inputs (ALWAYS DO THIS FIRST)

Check the conversation for `feature_name` and for `feature.md` / `plan.md` in the project root.

- If `feature.md` or `plan.md` do not exist → check `docs/backlog.md` for a
  `(in progress — worktree \`...\`, branch \`...\`)` note matching this feature
  before stopping. If one exists, tell the user to `EnterWorktree` into that
  path instead — this step needs to run from the worktree where the feature
  was actually built, not wherever the session happens to be. Only stop and
  say both files are required if no such note exists either.
- Note whether `review.md` exists in the project root — it will be archived if present.
- Note whether `impl-summary.md` exists in the project root — it will be archived if present.
- If `feature_name` is provided → use it as the archive directory name (kebab-case).
- If `feature_name` is missing → read `feature.md` and derive it from the `# Feature:` heading,
  converting to kebab-case (e.g. "User Authentication" → `user-authentication`). Proceed automatically.

---

## Process

### 1. Determine the Feature Name

Use `feature_name` from Step 0. Capture the current timestamp using `date +"%Y%m%d%H%M"` and prepend it to form the archive directory name: `<yyyymmddHHMM>-<feature-name>` (e.g. `202604191430-jwt-authentication`).

### 2. Verify Completion

Read `feature.md` and check that all acceptance criteria checkboxes are ticked.
If any are unchecked, warn the user and ask for confirmation before archiving.

### 3. Update docs/project.md

This is a critical step. Read `docs/project.md` in full, then read the archived
`feature.md` and `plan.md` to extract what actually changed. Update `project.md`
across the following sections — add sections if they do not already exist.

#### 3a. Features List

Locate or create a `## Features` section. Add the new feature as a single line entry:

```markdown
## Features

- **<Feature Name>**: <one-sentence description of what it does> (`docs/<feature-name>/`)
```

Preserve the existing list. Append the new entry — do not reorder or remove existing entries.

#### 3b. Architecture Decisions

Scan `feature.md` (Open Questions, Technical Scope) and `plan.md` (Architecture Decisions)
for any decisions that represent a meaningful change or addition to how the system is built.

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

| Date   | Decision           | Rationale | Feature                                |
| ------ | ------------------ | --------- | -------------------------------------- |
| <date> | <what was decided> | <why>     | [<Feature Name>](docs/<feature-name>/) |
```

If the table already exists, append a new row. Do not recreate the table.

#### 3c. API Surface (if applicable)

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

#### 3d. Environment / Configuration

If the feature introduced new environment variables, configuration keys, add them to an
`## Environment & Configuration` section:

```markdown
## Environment & Configuration

| Key                | Description                 | Required | Default |
| ------------------ | --------------------------- | -------- | ------- |
| JWT_SECRET         | Secret key for JWT signing  | Yes      | —       |
| JWT_EXPIRY_MINUTES | Access token TTL in minutes | No       | 15      |
```

#### 3e. Related Backlog Items

If `docs/backlog.md` exists, scan its unchecked items (`- [ ] ...`) for any that describe
the feature being archived — match on feature name, description, or an existing
"(in progress — worktree ..., branch ...)" pointer left by `/sdd-pick-up-task`. A match
doesn't have to be an exact string; use judgment (e.g. a backlog line like "Enforce
conventional commits" matches a feature named "Enforce Conventional Commits").

For each match, prepare (don't write yet) a move rather than an in-place edit: the item is
removed entirely from `docs/backlog.md` and appended to `docs/backlog-completed.md` (creating
it if it doesn't exist, with a one-line heading/intro — see an existing entry for the
convention), rewritten as `- [x]` with a pointer to the archive directory, replacing any stale
in-progress note:

```markdown
- [x] Enforce conventional commits — done, see `docs/specs-archive/<yyyymmddHHMM>-<feature-name>/`
```

Do not leave a `[x]` copy behind in `docs/backlog.md` — the line moves, it isn't duplicated.

Note that the copy of `docs/backlog.md` in this worktree may not even contain the
in-progress note `/sdd-pick-up-task` committed to `main` (worktrees usually branch before
that commit exists locally). That's fine — match on the item's description regardless of
whether the note is present here. When this branch eventually merges into `main`, expect a
small conflict on this exact line (`main` still has the in-progress note; this branch has
either removed the line or rewritten it to `[x]`) — resolve it by keeping this branch's
completed version and dropping the stale note, not by merging the two texts together.

If nothing in `docs/backlog.md` matches, that's fine — note "no matching backlog item found"
in the Step 4 preview rather than silently skipping it or inventing a match. If
`docs/backlog.md` doesn't exist at all, skip this substep entirely (don't create either file).

### 4. Show the project.md and Backlog Changes

Before writing, present a summary of every change you are about to make — to `project.md`
and, if applicable, `docs/backlog.md` / `docs/backlog-completed.md`:

```
## Proposed project.md Updates

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

### No changes to
- Tech Stack, Architecture overview, Conventions

## Proposed Backlog Changes
- Removing from docs/backlog.md: "JWT Authentication"
- Adding to docs/backlog-completed.md: "JWT Authentication" — done, pointing at the archive directory
```

(If no backlog item matched, replace the last section with `## Proposed Backlog Changes` /
`- No matching backlog item found — left unchanged.` so the user can confirm that's expected
rather than an oversight.)

Ask the user to confirm before writing. If they request changes to the proposed
updates, apply their corrections first, then write both files.

### 5. Archive

Run the following operations:

```bash
ARCHIVE_DIR="docs/specs-archive/$(date +"%Y%m%d%H%M")-<feature-name>"
mkdir -p "$ARCHIVE_DIR"
mv feature.md "$ARCHIVE_DIR/feature.md"
mv plan.md "$ARCHIVE_DIR/plan.md"
# move review.md only if it exists
[ -f review.md ] && mv review.md "$ARCHIVE_DIR/review.md"
# move impl-summary.md only if it exists
[ -f impl-summary.md ] && mv impl-summary.md "$ARCHIVE_DIR/impl-summary.md"
```

### 6. Create a Brief Summary

Create `docs/specs-archive/<yyyymmddHHMM>-<feature-name>/README.md`:

```markdown
# <Feature Name>

Implemented on: <date>

<Brief description of what was built, key files, and any notable decisions.>
```

### 7. Confirm

Report the final summary to the user:

- Files archived to `docs/specs-archive/<yyyymmddHHMM>-<feature-name>/` (`feature.md`, `plan.md`, `review.md`, and `impl-summary.md` if it existed)
- Sections updated in `docs/project.md`
- Backlog item moved from `docs/backlog.md` to `docs/backlog-completed.md`, if a match was found (or a note that none was)
- Remind them to commit `docs/specs-archive/<yyyymmddHHMM>-<feature-name>/`, `docs/project.md`, `docs/backlog.md`, and `docs/backlog-completed.md` (if changed) to version control
