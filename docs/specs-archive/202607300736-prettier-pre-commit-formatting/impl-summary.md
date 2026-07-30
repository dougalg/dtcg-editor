## Implementation Complete

### Files Created

- `format-staged.cjs` — gets staged files from git, runs `prettier --ignore-unknown --write`, re-stages the result; git/prettier calls injected via an `exec` param for testability.
- `format-staged.test.cjs` — `node:test` unit tests against a fake `exec` (9 tests, no real git/Prettier needed).
- `.husky/pre-commit` — one-line hook (`node format-staged.cjs`), matching the existing husky-v9-style hook files.

### Files Modified

- `package.json` — added `test:format-staged` script; extended `lint:root` to cover the two new `.cjs` files.
- `turbo.json` — wired `//#test:format-staged` into the `test` pipeline (mirrors existing `//#test:commits` pattern), so `pnpm test`/CI actually run the new tests.
- `CONTRIBUTING.md` — new "Formatting" section documenting the auto-format-on-commit behavior and the `--no-verify` bypass.
- 13 pre-existing files (`.agents/skills/**`, `.claude/skills/**`, `docs/**`) — one-time `prettier --write .` pass, committed separately (`d496a53`) before any hook code, per the plan's Step 1.

### Acceptance Criteria

- [x] AC-01: Passed — `format-staged.test.cjs` (`main` composition test) + direct script invocation (staged file reformatted).
- [x] AC-02: Passed — `format-staged.test.cjs` (`getStagedFiles` scoping) + direct script invocation (unstaged sibling file left untouched).
- [x] AC-03: Passed — direct script invocation against a temporary `.prettierignore` entry; matched file untouched despite being staged.
- [x] AC-04: Passed — `format-staged.test.cjs` (error-propagation test) + direct script invocation with a syntax error (non-zero exit, no restage).
- [x] AC-05: Passed — no changes to `.husky/commit-msg` or `prepare-commit-msg` (inspection).
- [x] AC-06: Passed — `pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm build` all still pass unmodified; `.github/workflows/ci.yml` untouched.
- [x] AC-07: Passed — `CONTRIBUTING.md`'s new "Formatting" section.

### Notes

- No new dependency: hand-rolled script over `lint-staged`, per the plan's Minimal Dependencies justification (the capability gap `lint-staged` would close — hunk-level partial-stage isolation — is explicitly out of scope per `feature.md`'s FR-03).
- Two additions beyond the plan's literal step text, both noted inline in `plan.md`: (1) wiring the new test file into `turbo.json`/`package.json`'s `test` pipeline (otherwise it would never run in CI), and (2) adding the two new `.cjs` files to `lint:root` (otherwise they'd never be linted) — both follow existing precedent (`commit-conventions.cjs`/`.test.cjs`) rather than introducing a new pattern.
- Known accepted gaps (documented in `feature.md`/`plan.md`, not fixed): a renamed-and-modified staged file isn't reformatted (`--diff-filter=ACM` excludes `R`); a Prettier failure partway through a multi-file staged set can leave some valid files reformatted-but-unstaged after the aborted commit.
- **Correction (added during `/sdd-review`):** this file originally claimed AC-01–04 were confirmed via "real end-to-end commits" in this worktree. That was false — `core.hooksPath` is an absolute path baked into `.git/config` pointing at the primary checkout's `.husky/_`, set once by husky's install script; husky's shim resolves the hook body relative to its own (absolute) invocation path, so it always targets the primary checkout's `.husky/pre-commit`, never the current linked worktree's. A real `git commit` here never actually invoked the hook; a deliberately-unformatted staged file committed cleanly, unformatted, with no error. Verification was actually only ever at the direct-script-invocation layer (bypassing git's hook dispatch), as corrected above. See the new worktree caveat in `CONTRIBUTING.md` and `feature.md`.
- **Post-merge re-verification (real):** after merging to `main`, a throwaway worktree from the fresh `origin/main` tip, with `core.hooksPath` scoped to that worktree's own `.husky/_`, confirmed the hook fires exactly as designed — a deliberately-unformatted staged file was reformatted by Prettier and re-staged during a real `git commit` attempt. This isolates and confirms the root cause purely as husky's absolute, install-time `core.hooksPath`, not a defect in `format-staged.cjs`.
