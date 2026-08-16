## Implementation Complete

### Files Created

- `biome.json` — root config: formatter (tab, JS/TS/JSON/CSS/MD scope), native rules (`noExplicitAny`, `noRestrictedImports`, `noRestrictedGlobals`, `domains.react`), overrides, `vcs.useIgnoreFile`, 7 GritQL plugins
- `biome/no-date-now.grit`, `biome/no-new-date.grit`, `biome/no-math-random.grit`, `biome/no-crypto-random.grit`, `biome/no-process-exit.grit`, `biome/no-console.grit`, `biome/no-process-env.grit`

### Files Modified

- `package.json`, `apps/web-app/package.json`, `packages/{errors,token-core,token-type-color,token-type-contract,token-type-dimension}/package.json` — devDependencies (added `@biomejs/biome`, removed eslint/typescript-eslint/eslint-config-next/prettier), `lint`/`format`/`format:check` scripts
- `pnpm-lock.yaml`
- `format-staged.cjs`, `format-staged.test.cjs` — pre-commit hook now runs `biome check --write --files-ignore-unknown=true`
- `CONTRIBUTING.md`, `docs/project.md` — Biome documented as the active lint/format tool
- `apps/web-app/scripts/init-config.ts` — typed `parsed` via `ReturnType<typeof parseArgs<typeof parseOptions>>` (fixes an implicit-any Biome's `recommended` preset surfaced; ESLint never caught it)
- `apps/web-app/scripts/init-config.test.ts` — added a justified `biome-ignore lint/style/noNonNullAssertion` suppression comment
- 72 other source files — repo-wide reformat to Biome's formatter output (no logic changes)
- `plan.md` — step-by-step progress tracking

### Files Deleted

- `eslint.config.mjs`, `apps/web-app/eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`

### Commits

1. `783a306` — tooling migration (config, plugins, scripts, docs)
2. `c7dfb7f` — repo-wide reformat + lint-fix pass (own commit per NFR)
3. `dd035f8` — `vcs.useIgnoreFile` fix + Step 17 verification notes

### Acceptance Criteria

- [x] AC-01: Passed — scratch-tested `Date.now()`/`new Date()`/`Math.random()`/`crypto.randomUUID`+`getRandomValues` fire under `packages/token-core`, clean code stays silent (Steps 4–7)
- [x] AC-02: Passed — all 7 `apps/web-app` restricted-call rules scratch-tested against real exemption files (`fatal-startup-error.ts`, `scripts/init-config.ts`, `instrumentation.ts`, `playwright.config.ts`), which already contain real calls (Steps 4–10)
- [x] AC-03: Passed — `noRestrictedImports` fires outside `lib/platform/node-fs.ts`, silent inside it (Step 3). Note: found 4 additional real exemption files (`route.test.ts` ×2, 2 e2e files) beyond `feature.md`'s single-file description — replicated in `biome.json`'s overrides to preserve today's actual behavior, not just the spec's stated summary
- [x] AC-04: Passed — `noRestrictedGlobals` fires outside `useSaveTokenEdits.ts`, silent inside it (Step 3)
- [x] AC-05: Passed — `noExplicitAny` fires repo-wide (Step 3)
- [x] AC-06: Passed — `useHookAtTopLevel`/`useExhaustiveDependencies` fire in `apps/web-app`, silent in `packages/**` via domain override (Step 3)
- [x] AC-07: Passed — ignore config verified via `biome lint .` touching zero `node_modules`/`dist`/etc. paths (Steps 2, 17)
- [x] AC-08: Passed — `pnpm format` + `pnpm format:check` both clean after Step 16's reformat commit
- [x] AC-09: Passed — `turbo run lint` 12/12 tasks green (Step 17, `pnpm exec turbo run lint --force`)
- [x] AC-10: Passed — isolated test: formatting-only violation auto-fixes + re-stages + commit succeeds; DI-rule violation aborts the commit (Step 17)
- [x] AC-11: Passed locally — zero `eslint`/`prettier`/`@typescript-eslint`/`eslint-config-next` in any `package.json`; CI workflow needs no YAML change (invokes by script name) — actual GitHub Actions run not exercised (no push performed this session)
- [x] AC-12: Passed — already satisfied in `feature.md`'s Out of Scope, no plan action needed
- [x] AC-13: Passed — `CONTRIBUTING.md`/`docs/project.md` updated; repo-wide grep confirms no remaining ESLint/Prettier references outside historical archive docs (Step 14, Step 17)

### Notes

- **Real gap found post-Step-17**: Biome 2.5.8 has no Markdown support at all (parsing/formatting still "in progress" per Biome's own docs) — `**/*.md` in `formatter.includes` was silently a no-op the whole session, so `.md` files were never actually reformatted (unlike Prettier, which did format Markdown; the Architecture Decision's "matches Prettier's prior file-type coverage (JS/TS/JSX/TSX/JSON/CSS/MD)" is therefore only partially true — MD is a permanent, tool-limitation gap, not a scoping choice). Worse: this made the migrated pre-commit hook hard-fail on any commit touching only `.md` files (`biome check` errors "no files were processed" when every provided path is unsupported, rather than a silent no-op) — caught only when committing this very file. Fixed by removing `**/*.md` from `formatter.includes` and extending `format-staged.cjs`'s existing symlink-filter to also exclude `.md` files before invoking Biome, so markdown commits pass through untouched. Covered by a new test in `format-staged.test.cjs`.
- **Non-obvious Biome 2.5.8 finding**: plugin `includes` globs require a leading `**/` to match nested directories (`**/packages/**`, not `packages/**`) — the bare form silently never matches for plugins, even though it works fine for `files.includes`/`overrides.includes`. Cost real debugging time in Step 4; documented in `plan.md` for future reference.
- **Non-obvious Biome 2.5.8 finding**: a single `.grit` file supports only one top-level applied pattern — two top-level `` `pattern` where {...} `` blocks in one file fail to compile. The `no-crypto-random.grit` plugin (covering both `crypto.randomUUID()` and `crypto.getRandomValues()`, one ESLint selector originally) uses GritQL's `or { pattern1, pattern2 }` combinator instead.
- Adopting Biome's `recommended` lint preset (the plan's own Step 2 choice) surfaced several pre-existing code patterns `tseslint.configs.strict` never flagged. Most were safely auto-fixed by `biome check --write`; two required manual intervention (Step 16), both narrowly scoped and unrelated to the DI rule set itself.
- `node_modules` was found missing ~311 packages at the start of implementation (stale from before this session); fixed via `pnpm install`, unrelated to the migration.
- One e2e test (`keyboard-navigation.spec.ts`'s focus-order check) fails in this sandbox both before and after the migration — confirmed via a throwaway worktree at the pre-migration commit — pre-existing environment flakiness, not a regression.
- Branch not pushed this session (diverged from `origin` since an earlier rebase onto local `main`, per prior conversation context) — left for the user to decide on.
