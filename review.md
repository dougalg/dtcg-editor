# Code Review: Enforce Conventional Commits

## Summary
The implementation is clean, well-scoped, and matches `plan.md` closely, with two deviations that were caught and documented during implementation (the `@commitlint/lint` API swap, and the `cz-customizable` config-discovery bug fix). The core enforcement path (commitlint + the shared config + the git hook) is solidly tested and verified end-to-end. All Major/Minor/Info findings below have been fixed and re-verified (`pnpm lint`/`build`/`test` all pass, 40 tests total). By the user's decision, the two Critical findings (AC-06/AC-07 lack automated test coverage for interactive-CLI and fresh-clone-install behavior) are being accepted as-is rather than fixed, consistent with this project's existing precedent of manual verification for this class of AC.

## Findings

### 🔴 Critical

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [ ] | `commit-conventions.test.cjs` (whole file) | AC Coverage | AC-06 (`pnpm commit` interactive flow) has no automated test — only a non-interactive smoke check confirming the config loads and the first prompt renders was performed; the full type→scope→subject→body→commit flow was never exercised to completion. | Either accept manual verification as this project's documented policy for interactive-CLI ACs (as already done for UI ACs in the prior feature), or add a scripted PTY-based test (e.g. `node-pty`) driving `cz` end-to-end — flag the dependency for justification if you go that route. |
| [ ] | `.husky/commit-msg:1` | AC Coverage | AC-07 (hook auto-installs on a fresh `pnpm install`) has no automated test — it was verified by removing `.husky/` and re-running `pnpm install` in the existing working tree, which is close to but not the same as a real fresh clone (e.g. it doesn't exercise `.husky/commit-msg` actually being present via `git checkout`, since it's still untracked at this point in the workflow). | Re-verify once `.husky/commit-msg` is actually committed (git-tracked), ideally via a real `git clone` into a temp directory + `pnpm install`, before considering AC-07 fully closed. |

### 🟠 Major

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [x] | `eslint.config.mjs`, `commit-conventions.cjs`, `commitlint.config.cjs`, `.cz-config.cjs`, `commit-conventions.test.cjs` | Lint Coverage | These four new root `.cjs` files are invisible to `pnpm lint` (Turborepo's `lint` task only scopes `packages/*`/`apps/*`, same blind spot already identified and fixed for `test` via `//#test:commits` in this same plan) — and running ESLint against them directly fails with 6 `@typescript-eslint/no-require-imports` errors, since they necessarily use CommonJS `require()` (verified: `pnpm exec eslint commit-conventions.cjs commitlint.config.cjs .cz-config.cjs commit-conventions.test.cjs` → 6 errors). | **Fixed:** added a `**/*.cjs` override in `eslint.config.mjs` disabling `@typescript-eslint/no-require-imports`, plus a `//#lint:root` turbo task (mirroring `//#test:commits`) wired into `lint`'s `dependsOn`. `pnpm lint` now covers these files and passes. |

### 🟡 Minor

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [x] | `commit-conventions.test.cjs:14-21` | Test Quality | The `lint()` helper's `catch` treats every `execFileSync` failure identically (binary missing, permissions error, or a genuine lint failure all become `{ ok: false, output: "" or stdout }`), so a setup problem would surface as a confusing empty-string assertion mismatch instead of a clear error. | **Fixed:** now checks `error.status !== 1` and rethrows for anything that isn't commitlint's own lint-failure exit code, so setup problems fail loudly instead of masquerading as a lint result. |

### 🔵 Info / Suggestions

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [x] | `docs/project.md` (Approved Dependencies) | Dependency Tracking | The 5 new devDependencies aren't yet reflected in `docs/project.md`'s Approved Dependencies list. | **Fixed:** added all 5 (grouped by tool) with justification, ahead of the usual archive-time sync. |
| [x] | `.cz-config.cjs:5` | Code Cleanliness | The mapped `scopes` array includes a `description` field that `cz-customizable` never reads (only `name` is used for the scope prompt), which slightly overstates what's actually wired up. | **Fixed:** dropped the unused field — `scopes` now maps to `{ name }` only. |

## Acceptance Criteria Coverage
| AC | Test | Status |
|----|------|--------|
| AC-01: malformed message rejected | `commit-conventions.test.cjs#"rejects a malformed message"` | ✅ Covered |
| AC-02: out-of-enum type rejected | `commit-conventions.test.cjs#"rejects an out-of-enum type"` | ✅ Covered |
| AC-03: out-of-enum scope rejected; no-scope/valid-scope accepted | `commit-conventions.test.cjs` (3 cases) | ✅ Covered |
| AC-04: valid commit accepted | `commit-conventions.test.cjs#"accepts a well-formed valid message"` | ✅ Covered |
| AC-05: `!`/footer breaking change accepted | `commit-conventions.test.cjs` (2 cases) | ✅ Covered |
| AC-06: `pnpm commit` interactive flow | — (manual smoke check only) | ❌ No automated test |
| AC-07: hook auto-installs on fresh `pnpm install` | — (manual, non-fresh-clone simulation) | ❌ No automated test |
| AC-08: `CONTRIBUTING.md` documents the standard | Manual review — verified directly by reading the file against FR-07's checklist | ✅ Covered (static content, fully inspectable) |

## Verdict
- [x] ✅ Ready to merge (Major/Minor/Info fixed and re-verified; the 2 Critical findings are knowingly accepted, not fixed, per the user's decision)
- [ ] 🟠 Requires fixes and re-review
- [ ] 🔴 Do not merge — significant issues found
