# Implementation Plan: Reformat Repo to Tabs (Prettier + `format:check` CI Gate)

## Overview

Add Prettier (`useTabs: true`) as the repo's formatter, add `.editorconfig`/`.prettierignore`, run a one-time `prettier --write .` across the repo, add `format`/`format:check` root scripts, and add a `format:check` step to CI. Verify zero behavioral drift by running `pnpm build`/`lint`/`test` before and after the reformat and confirming identical outcomes.

## Architecture Decisions

- **New dependency**: `prettier` — justified per the Minimal Dependencies constraint: there is no built-in/native formatter that enforces tab indentation across TS/JS/JSON/MD/YAML/CSS; Prettier is the de facto standard and the only realistic non-hand-rolled option for repo-wide, multi-language formatting enforcement. This is the one new devDependency this feature adds; named and justified here per convention.
- Config format: `.prettierrc.json` (plain JSON, no logic needed) rather than `prettier.config.mjs` — simplest option since no dynamic config logic is required.
- `format:check` is a **root-only** script (like `lint:root`/`test:commits`), not a Turborepo per-package task — Prettier operates repo-wide in one pass, there's no per-package parallelism to gain, and this mirrors the existing root-script pattern for whole-repo tooling.
- Reformat is applied to every Prettier-supported file Prettier can currently parse repo-wide (including `docs/**`, `docs/specs-archive/**`) per FR-04 — no carve-out for "historical" docs, since Markdown has no runtime behavior to regress and a partial reformat would leave the repo in a mixed indentation state contrary to this feature's purpose.
- CI wiring follows the existing `.github/workflows/ci.yml` job pattern (corepack pnpm + `actions/setup-node`, Node 26, pnpm cache) — added as a new step in the existing `ci` job (not a new sibling job), since `format:check` is a fast, stateless check with no need for the isolated-checkout treatment the `commitlint` job needed (that job specifically needed deep git history; this one doesn't).

## Implementation Steps

### Step 1: Add Prettier config files

- [x] Add `prettier` to root `package.json` `devDependencies`, run `pnpm install`.
- [x] Create `.prettierrc.json`:
  ```json
  {
  	"useTabs": true
  }
  ```
- [x] Create `.editorconfig`:
  ```ini
  root = true

  [*]
  charset = utf-8
  end_of_line = lf
  insert_final_newline = true
  trim_trailing_whitespace = true
  indent_style = tab
  ```
- [x] Create `.prettierignore`:
  ```
  node_modules
  **/node_modules
  **/.next
  **/dist
  **/.turbo
  pnpm-lock.yaml
  apps/web-app/next-env.d.ts
  ```
- Files: `package.json`, `.prettierrc.json`, `.editorconfig`, `.prettierignore`

### Step 2: Pre-reformat baseline check

- [x] Run `pnpm build`, `pnpm lint`, `pnpm test` on the pre-reformat tree and record pass/fail status, to compare against post-reformat in Step 5.
- Files: none (verification only)

### Step 3: Run the one-time repo-wide reformat

- [x] Run `pnpm exec prettier --write .` at repo root.
- [x] Manually spot-check a sample of touched files (`apps/web-app/instrumentation.ts`, a `package.json`, a `docs/*.md` file) to confirm tabs were applied and no content was semantically altered (only whitespace/formatting).
- [x] If ESLint fails after reformat due to a stylistic rule conflicting with Prettier's output (e.g. a rule expecting spaces), fix the specific conflicting ESLint rule rather than deviating from Prettier defaults — this repo's ESLint has no indentation rule today per the backlog note, so no conflict is expected, but verify.
- Files: every Prettier-formattable file repo-wide (mechanical change, not enumerated individually here).

### Step 4: Add `format`/`format:check` scripts

- [x] Add to root `package.json` `scripts`:
  ```json
  "format": "prettier --write .",
  "format:check": "prettier --check ."
  ```
- Files: `package.json`

### Step 5: Post-reformat verification

- [x] Run `pnpm build`, `pnpm lint`, `pnpm test` again; confirm identical pass/fail outcome to Step 2's baseline (zero behavioral drift).
- [x] Run `pnpm format:check`; confirm it reports zero violations.
- Files: none (verification only)

### Step 6: Wire `format:check` into CI

- [x] Add a `Check formatting` step to the existing `ci` job in `.github/workflows/ci.yml`, running `pnpm format:check`, placed alongside the existing build/lint/test steps (after install, before or after build — order doesn't matter since steps are independent checks).
- Files: `.github/workflows/ci.yml`

### Step 7: Tests

- No new unit/integration tests are needed — this is a tooling/formatting feature with no new runtime logic to unit-test. Verification is via the build/lint/test parity check (Step 5) and CI running green with the new `format:check` step (Step 6), confirmed once the branch's CI run is observed.

## Acceptance Criteria Mapping

| AC                                                       | Verified By                                      |
| -------------------------------------------------------- | ------------------------------------------------ |
| AC-01: `prettier` devDependency + `useTabs: true`        | `.prettierrc.json` content + `package.json` diff |
| AC-02: `.editorconfig` with `indent_style = tab`         | File presence/content check                      |
| AC-03: `.prettierignore` excludes generated/vendor paths | File presence/content check                      |
| AC-04: `pnpm format:check` reports zero violations       | Step 5 manual run                                |
| AC-05: repo-wide tab reformat                            | Step 3 `prettier --write .` + spot check         |
| AC-06: `build`/`lint`/`test` unaffected                  | Step 2 vs Step 5 parity check                    |
| AC-07: CI runs `format:check`                            | Step 6 + observing CI run on the pushed branch   |
| AC-08: no ESLint/Prettier conflict introduced            | Step 3's lint re-run                             |

## Risks & Mitigations

- Risk: Prettier reformatting a `.md` file inside `docs/specs-archive/**` subtly changes meaning (e.g. reflowing a table or code fence) → Mitigation: Prettier's Markdown formatting only touches whitespace/line-wrapping, never table cell content or code fence contents; spot-check a specs-archive file in Step 3.
- Risk: Large diff (every file touched) makes review harder → Mitigation: this is inherent to the backlog item itself ("one-time repo-wide reformat"); commit it as a single, clearly-labeled `style:` commit separate from the tooling-config commit so reviewers can skip the reformat diff and focus on the config/CI changes.
- Risk: `husky` hook files (`.husky/commit-msg`, `.husky/prepare-commit-msg`) accidentally reformatted/corrupted → Mitigation: these aren't valid Prettier-parseable file types (no extension Prettier recognizes) so `prettier --write .` will skip them; confirm via `git diff --stat` that they're untouched after Step 3.

## Estimated Complexity

Low — no new runtime logic, one new (justified) dependency, mechanical reformat, and a small CI addition following an existing pattern. Main effort is verification (confirming zero behavioral drift) rather than implementation.
