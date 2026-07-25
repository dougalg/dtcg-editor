---
name: sdd-feature
description: >
  SDD step 1. Analyse a feature request and produce a detailed feature.md spec.
  Use when the user describes a new feature they want to build.
  Asks for missing details before writing the spec.
argument-hint: <feature description or title>
---

# SDD: Feature Analysis

You are acting as a senior software architect and requirements analyst.

## Required Inputs

Before starting, collect these inputs. If any are missing, ask for them now — do not proceed without them.

| Input                 | Description           | Example                                             |
|-----------------------|-----------------------|-----------------------------------------------------|
| `feature_description` | What feature to build | "Add JWT authentication with refresh token support" |

## Steps

### Step 0: Validate Inputs (ALWAYS DO THIS FIRST)

Check the conversation for `feature_description`.
- If present → proceed to Step 1.
- If missing → read `docs/backlog.md` (if it exists) and check for open (unchecked) items. If there are any, list them as candidate suggestions alongside asking: "What feature would you like to build? Here are some open items from the backlog you could pick instead: ...". If the backlog is empty, missing, or has no open items, just ask: "What feature would you like to build?" Do NOT proceed until the user provides a `feature_description`.

---

## Your Goal
Produce a thorough `feature.md` file that leaves no ambiguity for the implementation step.

### 1. Read Project Context
Always start by reading `docs/project.md` to understand:
- The tech stack in use
- Architecture patterns and constraints
- Any existing conventions

Also read `docs/backlog.md` (if it exists) and check whether the feature request matches or overlaps an existing backlog item:
- If it matches an open item, pull in any context/scope notes already captured there (e.g. specific files, constraints, or out-of-scope calls already made) rather than re-deriving them from scratch.
- If it overlaps a different in-progress or completed item, flag the overlap to the user before proceeding, so scope isn't duplicated.
- Use the backlog to inform recommendations during Step 2/3 (e.g. surfacing a related deferred concern as a clarifying question or an Out of Scope candidate) rather than treating the request in isolation.

### 2. Analyse the Request
The feature request is: **`feature_description`** (collected in Step 0).

Identify any missing or ambiguous information across these dimensions:
- **Functional requirements** — what exactly should the feature do?
- **User stories** — who benefits and how?
- **Acceptance criteria** — how do we know it's done?
- **Edge cases** — what could go wrong?
- **Integration points** — which existing modules/services are involved?
- **Non-functional requirements** — performance, security, scalability concerns?
- **Out of scope** — what are we explicitly NOT building?

### 3. Ask Before Writing
If ANY critical information is missing or ambiguous, ask the user clarifying questions BEFORE producing the spec.
Group questions logically. Do not ask more than 5 questions at once.
Wait for the user's answers, then proceed.

### 4. Write feature.md
Once you have enough information, create `feature.md` in the project root with this structure:

```markdown
# Feature: <Feature Name>

## Summary
One-paragraph description of the feature and its purpose.

## User Stories
- As a <role>, I want to <action> so that <benefit>.

## Functional Requirements
### FR-01: <Requirement Name>
Description...

### FR-02: ...

## Acceptance Criteria
- [ ] AC-01: ...
- [ ] AC-02: ...

## Technical Scope
### Affected Modules
- List of modules/packages/services involved

### New Components Required
- List of new classes, endpoints, tables, etc.

### Integration Points
- Existing services or systems this interacts with

## Non-Functional Requirements
- Performance: ...
- Security: ...
- Scalability: ...

## Out of Scope
- Explicitly list what is NOT included

## Open Questions
- Any remaining questions or decisions deferred to implementation
```

After writing the file, summarize what you wrote and ask the user to review before proceeding to `/sdd-plan`.
