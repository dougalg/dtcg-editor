# Feature: Reformat Repo to Tabs (Prettier + `format:check` CI Gate)

## Summary

The repository currently has no formatter config (no Prettier, no `.editorconfig`) and ESLint has no indentation rule, so indentation across files is inconsistent/arbitrary. This feature adds Prettier (configured with `useTabs: true`) as the project's formatter, performs a one-time repo-wide reformat so every file is tab-indented and Prettier-conformant, and adds a `pnpm format:check` script wired into CI (alongside the existing `build`/`lint`/`test` checks) so formatting can't silently drift back to spaces.

## User Stories

- As a contributor, I want a single formatter config so I don't have to guess indentation/quote/semicolon conventions when writing new files.
- As a maintainer, I want CI to fail a PR that isn't formatted correctly, so formatting drift never has to be caught in code review.

## Functional Requirements

### FR-01: Add Prettier as a dev dependency with a repo-wide config

Add `prettier` as a root `devDependency` (single shared version across the monorepo, consistent with how `eslint`/`typescript` are already managed at the root). Add a root `.prettierrc.json` (or `prettier.config.mjs`) with:

- `useTabs: true` (the actual point of this feature)
- `tabWidth: 2` (Prettier's own default value — stated explicitly here rather than left implicit, since it is called out as an assumption)
- All other options left at Prettier's defaults (double quotes, semicolons, trailing commas `"all"`, `printWidth: 80`) since a sample of existing source (`apps/web-app/instrumentation.ts`) already matches these defaults — minimizes the diff to indentation-driven changes only, not a wholesale style rewrite.

### FR-02: Add `.editorconfig`

Add a root `.editorconfig` with `indent_style = tab` (plus `charset = utf-8`, `end_of_line = lf`, `insert_final_newline = true`, `trim_trailing_whitespace = true`) so editors without the Prettier plugin active still default new content to tabs. This is a backstop for editor behavior, not a formatting enforcement mechanism (Prettier/CI own enforcement).

### FR-03: Add a `.prettierignore`

Exclude generated/vendored content Prettier should never touch: `node_modules`, `.next`, `dist`, `.turbo`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` is kept formattable (YAML, hand-authored), coverage output if any, and `apps/web-app/next-env.d.ts` (Next.js-generated, regenerated on every build — reformatting it is pointless churn).

### FR-04: One-time repo-wide reformat

Run `prettier --write` across every file type Prettier supports that this repo actually has: `.ts`, `.tsx`, `.js`, `.cjs`, `.mjs`, `.json`, `.md`, `.yml`/`.yaml`, `.css`. This includes root-level tooling configs (`commitlint.config.cjs`, `.cz-config.cjs`, etc.), `package.json` files, and Markdown under `docs/` (including `docs/specs-archive/**`, so historical specs stay internally consistent with the new convention rather than becoming a frozen exception). Husky hook shell scripts (`.husky/*`) are not Prettier-formattable and are left untouched.

### FR-05: Add `pnpm format:check` script

Add a root `package.json` script: `"format:check": "prettier --check ."` (respecting `.prettierignore`). This is a check-only script (CI gate) — a separate `"format"` script (`prettier --write .`) is also added for local developer use fixing drift.

### FR-06: Wire `format:check` into CI

Add a `format` step/job to `.github/workflows/ci.yml` running `pnpm format:check`, alongside (not replacing) the existing `build`/`lint`/`test` steps via Turborepo. Follow this repo's existing CI conventions (corepack-enabled pnpm, `actions/setup-node` with Node 26 + pnpm cache) rather than introducing a new pattern.

## Acceptance Criteria

- [x] AC-01: `prettier` is a root devDependency; `.prettierrc.json` sets `useTabs: true`.
- [x] AC-02: `.editorconfig` exists at repo root with `indent_style = tab`.
- [x] AC-03: `.prettierignore` excludes `node_modules`, `.next`, `dist`, `.turbo`, `pnpm-lock.yaml`, `apps/web-app/next-env.d.ts`.
- [x] AC-04: `pnpm format:check` reports zero violations when run at repo root after the reformat.
- [x] AC-05: Every previously-space-indented source file under `apps/`, `packages/`, and root-level `.ts`/`.js`/`.cjs`/`.mjs`/`.json`/`.md`/`.yml` files is now tab-indented and Prettier-conformant.
- [x] AC-06: `pnpm build`, `pnpm lint`, and `pnpm test` (via Turborepo) still pass after the reformat — this is a pure formatting change with zero behavioral diff.
- [x] AC-07: CI (`.github/workflows/ci.yml`) runs `pnpm format:check` and fails the build if formatting drifts.
- [x] AC-08: ESLint config is untouched apart from anything strictly required for compatibility (Prettier and ESLint can conflict on stylistic rules; this repo's ESLint has no indentation/stylistic rule today per the backlog note, so no `eslint-config-prettier` should be needed, but verify no existing ESLint stylistic rule fights Prettier's output during implementation).

## Technical Scope

### Affected Modules

- Repo root (`package.json`, new `.prettierrc.json`, `.editorconfig`, `.prettierignore`)
- `.github/workflows/ci.yml`
- Every existing source/config/doc file in `apps/web-app`, `packages/*`, and root-level tooling — touched by the mechanical reformat only, no logic changes.

### New Components Required

- `.prettierrc.json` (or `prettier.config.mjs`)
- `.editorconfig`
- `.prettierignore`
- New root `package.json` scripts: `format`, `format:check`
- New CI step for `format:check`

### Integration Points

- Turborepo: `format:check` is a root-only script (like `lint:root`/`test:commits`), not a per-package Turborepo task, since Prettier runs once across the whole repo rather than per-package.
- GitHub Actions CI (`.github/workflows/ci.yml`)
- Husky/commitlint tooling files are reformatted as plain files but not otherwise touched.

## Non-Functional Requirements

- **Performance**: N/A (formatting is a one-time + CI-time cost only).
- **Security**: N/A.
- **Scalability**: N/A.
- **Zero behavioral change**: this is a pure formatting/tooling feature. No runtime logic, exported API, or test behavior may change as a result of the reformat; `pnpm build`/`lint`/`test` must be green before and after with identical pass/fail outcomes.

## Out of Scope

- A pre-commit Prettier hook (e.g. via `husky` + `lint-staged`) — the backlog item only asks for a CI gate; a local pre-commit hook is a separate, larger discussion (extra dependency, extra devEx surface) not requested here.
- Any change to ESLint's rule set beyond what's strictly necessary to avoid conflicting with Prettier's formatting output.
- Reformatting `pnpm-lock.yaml` (machine-generated, never hand-edited, and Prettier doesn't format it meaningfully).
- The blocked TypeScript v7 upgrade and other unrelated backlog items — tracked separately.

## Open Questions

None — Prettier's defaults (aside from `useTabs: true`) already match this codebase's existing double-quote/semicolon/trailing-comma style, so no additional style decisions were needed. If `pnpm lint` surfaces a genuine ESLint/Prettier conflict during implementation, resolve it by adjusting the conflicting ESLint rule (not by deviating from Prettier defaults), and record the decision in `plan.md`.
