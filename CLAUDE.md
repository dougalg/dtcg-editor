# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## pnpm

This repo uses `pnpm`. Always use `pnpm` commands to add files to packages, _NEVER_ directly modify a package file to manage dependencies, instead use `pnpm add` or the relevant `pnpm` command.

## Project status

dtcg-editor is an open source editor for DTCG (Design Tokens Community Group) design tokens.

## Local First Development

The `gh` command is not installed. Use `git` CLI commands directly instead.

When you are asked to merge or update branches, the default assumption is **local-first**. Unless the user specifies to push to a non-local branch/worktree/etc. always assume the user wants you to work locally.

For example:

"Update from main", means "update using the local main branch"

Incorrect:

"Update from main", DOES NOT mean "update using origin/main"

## Spec-Driven Development workflow

This repo has the `speckit` skill set installed (spec-kit, see `.specify/integrations/speckit.manifest.json`), plus the standalone `pick-up-task` skill (optional, generic — not part of the speckit set) for backlog/worktree claiming. Feature work in this repo follows this pipeline rather than ad-hoc implementation:

1. `speckit-constitution` — create/update the project constitution (`.specify/memory/constitution.md`): principles, tech stack, approved dependencies, governance. Run once before starting feature work, or whenever principles need to change.
2. `pick-up-task` (optional) — pick an open item from `docs/backlog.md` or propose a new one, claim it with an in-progress marker, and open a dedicated git worktree for it before the pipeline below starts. Also resumes an already-claimed item by re-entering its existing worktree.
3. `speckit-specify` — turn a feature request into a detailed `spec.md`.
4. `speckit-clarify` (optional, repeatable) — resolve underspecified areas in `spec.md` via targeted clarifying questions.
5. `speckit-checklist` (optional, repeatable) — generate custom requirements-quality checklists for the feature spec.
6. `speckit-plan` — turn `spec.md` into a detailed `plan.md` tailored to the project's stack.
7. `speckit-tasks` — generate a dependency-ordered `tasks.md` from `spec.md`/`plan.md`.
8. `speckit-analyze` (optional) — cross-artifact consistency/quality check across `spec.md`, `plan.md`, and `tasks.md` before implementing.
9. `speckit-implement` — execute `tasks.md` step by step, gated on any generated checklists being complete.
10. `speckit-converge` (optional, repeatable) — assess the codebase against `spec.md`/`plan.md`/`tasks.md` after implementation and append any remaining unbuilt work as new tasks, looping back into `speckit-implement`.
11. `speckit-taskstoissues` (optional) — mirror `tasks.md` into GitHub Issues when task tracking should also live there.

If `.specify/memory/constitution.md` hasn't been ratified yet (still template placeholders, or missing), run `speckit-constitution` before doing feature work — it establishes the governance context (principles, tech stack, conventions) that later steps and future Claude sessions rely on.

`pick-up-task` handles claiming a backlog item and entering its dedicated worktree; once inside that worktree, the `speckit-*` steps above operate on the current feature directory in the normal way, each gated by its own prerequisite check (e.g. `speckit-implement` requires `tasks.md` to exist first).
