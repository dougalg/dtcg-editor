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

## Spec-Driven Development (SDD) workflow

This repo has the `sdd-skills` skill set installed (see `skills-lock.json`, sourced from `sivaprasadreddy/sdd-skills`). Feature work in this repo follows the SDD pipeline rather than ad-hoc implementation. Use these skills in order:

1. `sdd-init` — analyse the codebase and generate `docs/project.md` (tech stack, architecture, conventions). Run once before starting SDD, or when asked to regenerate it.
2. `pick-up-task` (optional, generic — not part of the `sdd-skills` set) — pick an open item from `docs/backlog.md` or propose a new one, claim it with an in-progress marker, and open a dedicated git worktree for it before the pipeline below starts. Also resumes an already-claimed item by re-entering its existing worktree.
3. `sdd-feature` — turn a feature request into a detailed `feature.md` spec.
4. `sdd-refine` (optional, repeatable) — update/enhance `feature.md` as requirements change.
5. `sdd-plan` — turn `feature.md` into a detailed `plan.md` tailored to the project's stack.
6. `sdd-implement` — implement `plan.md` step by step and verify acceptance criteria.
7. `sdd-review` — review the implementation against best practices, duplication, security, performance, and `feature.md` acceptance criteria.
8. `sdd-archive` — archive `feature.md`/`plan.md` into `docs/specs-archive/<yyyymmddHHMM>-<feature-name>/` and update `docs/project.md`.

If `docs/project.md` does not exist yet, run `sdd-init` before doing feature work — it establishes the architecture context that later steps (and future Claude sessions) rely on.

Steps 3 through 8 each check `docs/backlog.md` for an in-progress worktree marker before assuming they're starting fresh — if one is found and the current directory isn't already that worktree, they'll tell you to `EnterWorktree` into it first rather than duplicating work.
