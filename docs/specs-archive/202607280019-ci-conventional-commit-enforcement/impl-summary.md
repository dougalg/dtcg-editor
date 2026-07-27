## Implementation Complete

### Files Created
- None

### Files Modified
- `.github/workflows/ci.yml` — new `commitlint` job (sibling to `ci`), own `fetch-depth: 0` checkout, PR-range and push-range lint steps with zero-SHA fallback.
- `CONTRIBUTING.md` — commit-messages intro now mentions CI re-checks; new "Merge Commits & Rebasing" section forbidding merge commits in feature branches and mandating rebase.

### Acceptance Criteria
- [x] AC-01: Passed — end-to-end scratch git-history test (`commitlint --from <base> --to <tip>`) flagged only the deliberately bad commit with `subject-empty`/`type-empty`, exit 1.
- [x] AC-02: Passed — same scratch test: two conventional commits in range produced no output/failure.
- [x] AC-03: Passed — `echo "Merge branch 'main' into feature/x" | commitlint` exits 0 silently; scratch test's real `--no-ff` merge commit also passed over silently.
- [x] AC-04: Passed — inspected workflow diff: bare `pnpm exec commitlint --from/--to`, no `--config` override, no inline rules.
- [x] AC-05: Passed — `pnpm test` run: root `//#test:commits` 8/8 pass unchanged; `commitlint.config.cjs`/`commit-conventions.cjs`/`package.json` untouched.
- [ ] AC-06: Deferred to `/sdd-archive` per established repo pattern (not in scope for `/sdd-implement`).
- [x] AC-07: Passed — re-verified `CONTRIBUTING.md` Scopes table and `commit-conventions.cjs` `scopes` array both list exactly `token-core`/`web-app`/`root`; no `docs` drift reintroduced.
- [x] AC-08: Passed — dedicated scratch test of the zero-SHA fallback (`git rev-list --max-parents=0`) resolved a valid root SHA and did not crash; all-conforming push range exits 0, one bad commit exits 1.
- [x] AC-09: Passed — `CONTRIBUTING.md`'s new "Merge Commits & Rebasing" section states merge commits are forbidden and rebase is required.
- [x] AC-10: Passed — only `actions/checkout@v4` and `actions/setup-node@v4` (both already used by the existing `ci` job) plus `pnpm exec commitlint`; no third-party Action introduced.

### Notes
- No deviations from `plan.md`. All 6 implementation steps (job scaffold, PR-range step, push-range step + fallback, CONTRIBUTING.md update, scope-drift regression check, verification) completed and checked off in `plan.md`.
- Regression suite (`pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm test`) all green — 5/5, 10/10, 10/10 tasks respectively.
- YAML structure validated via Ruby's `YAML.load_file` (no local `js-yaml`/PyYAML available) — job keys and step shape confirmed to match plan.md exactly.
- Live GitHub Actions verification (throwaway PR round-trip) not performed — no push/PR access available to this unattended sub-agent; flagged in plan.md as "recommended, not required."
