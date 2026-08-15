# Implementation Plan: Migrate ESLint + Prettier to Biome

## Overview

Replace ESLint + `typescript-eslint` + `eslint-config-next` + Prettier with Biome 2.5.8 as the single lint/format tool, repo-wide. Native Biome rules cover most of today's ESLint config (`noExplicitAny`, `noRestrictedImports`, `noRestrictedGlobals`, and the React-hooks pair under Biome's `domains` system); the 7 restricted-call-expression rules that police the Dependency Injection for I/O/Platform Externalities constraint (`Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID`/`getRandomValues`, `process.exit`, `console.*`, `process.env`) have no native `no-restricted-syntax` equivalent, so each becomes a hand-authored GritQL plugin (`.grit` file). Per-file exemptions for the plugin rules are expressed via each plugin's own `includes`/negation-glob scoping (Biome plugins support this directly — confirmed against current docs); exemptions for the two native restricted-imports/globals rules use Biome's standard `overrides` block. The formatter swap (Prettier → Biome, tab-indented) lands as its own commit, separate from the rule-migration commits, per the feature's Non-Functional Requirements.

Work proceeds in dependency order: install Biome (Step 1); write a base `biome.json` covering every _native_ rule, with no plugins registered yet (Step 2); verify that base config entirely in check-only mode — no autofix, no write, repo files untouched — before it's trusted with anything else (Step 3); then build and individually test each of the 7 GritQL plugins against that verified baseline, one plugin per step (Steps 4–10); then update the pre-commit hook, package scripts, CI, and docs (Steps 11–14); then remove the old toolchain (Step 15); then perform the one-time reformat — the plan's first step that actually writes to real repo files via autofix (Step 16); then final full-repo verification (Step 17).

## Architecture Decisions

- **Base config verified in check-only mode before any plugin or autofix work begins.** Splitting "write biome.json" from "verify it" into separate steps, and explicitly forbidding `--write` in the verification step, means every native-rule assumption (rule-group placement, `domains`/`overrides` interaction) is confirmed against the real repo before a single plugin is added or a single file is rewritten — a mistake here is cheap to fix (nothing has been written yet) rather than discovered downstream after plugins and formatting changes have layered on top.
- **One step per GritQL plugin, built and tested individually — not all 7 written then tested together.** Each plugin is added to `biome.json`'s `plugins` array and proven against a real scratch violation (and, where applicable, a real scratch exemption) in its own step, immediately, before the next plugin is started. If a plugin's pattern is wrong, that failure is isolated to one step instead of surfacing later as an ambiguous failure across 7 simultaneously-added rules.
- **One `.grit` file per restricted-call pattern, not one file with multiple patterns.** Each pattern needs its own `register_diagnostic` message (preserving today's per-rule ESLint violation message) and its own `includes` scoping (some patterns are repo-wide with zero exemptions, others are `apps/web-app`-only with per-file exemptions). A shared file would force identical scoping across patterns that don't share it.
- **Single root `biome.json`, no nested per-package configs.** Matches Biome's standard monorepo pattern and avoids config drift across 5 packages + `apps/web-app`; per-package `lint` scripts invoke `biome lint` scoped to their own directory (`biome lint ./packages/token-core`, etc.) rather than each owning a config file. Resolves the feature's open question in favor of the recommended option.
- **Plugin-level `includes` (not Biome `overrides`) for the GritQL exemptions.** `overrides` toggles a rule's severity per path but a GritQL plugin rule's identity is the plugin file itself — scoping which files a plugin's pattern even runs against is a property of the plugin registration (`includes`/negated globs), which is more direct than registering the plugin everywhere and then suppressing it per path via `overrides`.
- **`overrides` (not plugin scoping) for `noRestrictedImports`/`noRestrictedGlobals` exemptions.** These are native Biome rules, not plugins — `overrides` is the standard, documented mechanism for per-path rule exceptions on native rules.
- **Biome's format scope matches Prettier's prior file-type coverage** (JS/TS/JSX/TSX/JSON/CSS/MD as Prettier covered) rather than expanding to Biome's full default set — avoids an out-of-scope formatting diff on file types nobody asked to have reformatted. Resolves the feature's third open question.
- **`biome check` (not separate `biome lint`/`biome format` calls) inside `format-staged.cjs`**, using `--write` — mirrors the single-tool-call shape the old `prettier --write` call had, and Biome's `check` command runs both linting and formatting in one pass with one exit code, matching the hook's existing "one tool call, one pass/fail" contract.

## Implementation Steps

### Step 1: Install Biome, remove nothing yet

- [ ] `pnpm add -D -w @biomejs/biome@2.5.8` (pin exact version, matching repo convention of no floating majors on tooling that gates CI)
- [ ] `pnpm exec biome --version` to confirm the binary resolves
- Files: root `package.json`, `pnpm-lock.yaml` (both via `pnpm add`, not hand-edited)

### Step 2: Write the base `biome.json` (native rules only, no plugins yet)

- [ ] Create root `biome.json`:
  - `formatter.indentStyle: "tab"`, `formatter.enabled: true`
  - `linter.enabled: true`, `linter.rules.recommended: true` as the baseline, then explicit overrides below
  - `linter.rules.suspicious.noExplicitAny: "error"` (repo-wide)
  - `linter.domains.react: "recommended"` (enables `useHookAtTopLevel` + `useExhaustiveDependencies`; scope this to `apps/web-app` only via a nested `overrides` entry disabling the domain for `packages/**`, since Biome's top-level `domains` key applies globally and `packages/*` has no React code today but shouldn't silently gain the rule pair if it ever does without an explicit decision)
  - `linter.rules.nursery.noRestrictedImports` (or wherever it resolves in 2.5.8's rule table — Step 3 confirms the group; `style`/`nursery` have both hosted this rule across Biome versions) configured to ban `node:fs`/`node:fs/promises`, scoped repo-wide
  - `linter.rules.nursery.noRestrictedGlobals` (same group caveat) configured to ban `fetch`
  - `overrides`: one entry for `apps/web-app/lib/platform/node-fs.ts` turning `noRestrictedImports` off; one entry for `apps/web-app/hooks/useSaveTokenEdits.ts` turning `noRestrictedGlobals` off
  - `files.includes` / ignore config: `node_modules`, `dist`, `.next`, `.turbo`, `coverage`, `out`, `build`, `**/next-env.d.ts`, `dist-test` (FR-06)
  - `plugins`: intentionally omitted/empty in this step — populated incrementally, one entry per step, in Steps 4–10
- Files: `biome.json`

### Step 3: Verify the base config in check-only mode — no autofix

- [ ] Run `pnpm exec biome lint .` (check-only; ESLint still installed and untouched) with a deliberate scratch `any` usage (not committed) — confirm `noExplicitAny` fires, then delete the scratch usage and confirm clean
- [ ] With a scratch `node:fs` import outside `node-fs.ts` and one inside it — confirm `noRestrictedImports` fires on the former and stays silent on the latter (the `overrides` exemption)
- [ ] With a scratch bare `fetch` reference outside `useSaveTokenEdits.ts` and one inside it — confirm `noRestrictedGlobals` fires on the former and stays silent on the latter
- [ ] With a scratch rule-of-hooks violation and a scratch missing-dependency case inside `apps/web-app` — confirm both `domains.react` rules fire; confirm the `packages/**` override means neither rule applies there
- [ ] Confirm `noRestrictedImports`/`noRestrictedGlobals` actually resolve under the rule group used in `biome.json` — fix the group path in Step 2's file if 2.5.8 places them differently than assumed
- [ ] Run `pnpm exec biome format --check .` (report-only) — confirm the command itself runs cleanly against the config (a nonzero _diff_ result is expected and fine, since the repo isn't Biome-formatted yet; the point is confirming no config error, not achieving a clean check)
- [ ] Do **not** run `biome format --write`, `biome check --write`, or any other autofixing invocation anywhere in this step — every real repo file must remain byte-identical to before Step 1 until Step 16
- [ ] Delete all scratch violation files/snippets created for this step; the only lasting change permitted is a correction to `biome.json` itself if verification surfaces a mistake
- Files: `biome.json` (fixes only, if verification surfaces mistakes)

### Step 4: Build and test the `no-date-now` GritQL plugin

- [ ] Read `eslint.config.mjs`'s exact `no-restricted-syntax` selector and violation message for `Date.now()`
- [ ] Create `biome/no-date-now.grit`: `includes: ["packages/**", "apps/web-app/**"]`, no exemptions, pattern matching a bare `Date.now()` call, `register_diagnostic` message copied verbatim from the original
- [ ] Add `./biome/no-date-now.grit` to `biome.json`'s `plugins` array
- [ ] In a scratch file (not committed) under `packages/token-core`, call `Date.now()`; run `biome lint .` (no `--write`) and confirm the diagnostic fires with the expected message; confirm a file with no such call stays clean; delete the scratch file
- Files: `biome.json`, `biome/no-date-now.grit`

### Step 5: Build and test the `no-new-date` GritQL plugin

- [ ] Read `eslint.config.mjs`'s exact selector for `new Date()` — confirm whether it targets only the no-argument form (banning "current time via `new Date()`" while still permitting `new Date(someString)` for parsing) or all `new Date(...)` calls; the GritQL pattern must match the original's exact argument-arity behavior, not a guess from the rule's name
- [ ] Create `biome/no-new-date.grit`: `includes: ["packages/**", "apps/web-app/**"]`, no exemptions, message copied verbatim
- [ ] Add `./biome/no-new-date.grit` to `biome.json`'s `plugins` array
- [ ] Scratch-test both the banned form and (if the original selector permits it) the argument form that should stay clean; delete the scratch file
- Files: `biome.json`, `biome/no-new-date.grit`

### Step 6: Build and test the `no-math-random` GritQL plugin

- [ ] Read `eslint.config.mjs`'s exact selector and message for `Math.random()`
- [ ] Create `biome/no-math-random.grit`: `includes: ["packages/**", "apps/web-app/**"]`, no exemptions, message copied verbatim
- [ ] Add `./biome/no-math-random.grit` to `biome.json`'s `plugins` array
- [ ] Scratch-test a `Math.random()` call fires and a file without one stays clean; delete the scratch file
- Files: `biome.json`, `biome/no-math-random.grit`

### Step 7: Build and test the `no-crypto-random` GritQL plugin

- [ ] Read `eslint.config.mjs`'s exact selector(s) and message for `crypto.randomUUID()`/`crypto.getRandomValues()` — confirm whether the original is one combined selector or two, and mirror that shape (one `.grit` file may register two patterns/diagnostics if the original rule covers both call forms)
- [ ] Create `biome/no-crypto-random.grit`: `includes: ["packages/**", "apps/web-app/**"]`, no exemptions, message(s) copied verbatim
- [ ] Add `./biome/no-crypto-random.grit` to `biome.json`'s `plugins` array
- [ ] Scratch-test both `crypto.randomUUID()` and `crypto.getRandomValues()` fire independently and a file with neither stays clean; delete the scratch file
- Files: `biome.json`, `biome/no-crypto-random.grit`

### Step 8: Build and test the `no-process-exit` GritQL plugin

- [ ] Read `apps/web-app/eslint.config.mjs`'s exact selector and message for `process.exit`, and its exemption overrides for `lib/fatal-startup-error.ts`/`scripts/init-config.ts`
- [ ] Create `biome/no-process-exit.grit`: `includes: ["apps/web-app/**", "!apps/web-app/lib/fatal-startup-error.ts", "!apps/web-app/scripts/init-config.ts"]`, message copied verbatim
- [ ] Add `./biome/no-process-exit.grit` to `biome.json`'s `plugins` array
- [ ] Scratch-test a `process.exit()` call fires in an ordinary `apps/web-app` file, and confirm it does **not** fire when the same call is placed (temporarily, not committed) in `lib/fatal-startup-error.ts` or `scripts/init-config.ts`; confirm `packages/*` is entirely unaffected (plugin doesn't apply there); delete scratch changes
- Files: `biome.json`, `biome/no-process-exit.grit`

### Step 9: Build and test the `no-console` GritQL plugin

- [ ] Read `apps/web-app/eslint.config.mjs`'s exact selector and message for `console.*`, and confirm it shares the same two exemption files as `process.exit`
- [ ] Create `biome/no-console.grit`: `includes: ["apps/web-app/**", "!apps/web-app/lib/fatal-startup-error.ts", "!apps/web-app/scripts/init-config.ts"]`, message copied verbatim
- [ ] Add `./biome/no-console.grit` to `biome.json`'s `plugins` array
- [ ] Scratch-test a `console.log(...)` call fires in an ordinary `apps/web-app` file and stays silent in both exemption files; delete scratch changes
- Files: `biome.json`, `biome/no-console.grit`

### Step 10: Build and test the `no-process-env` GritQL plugin

- [ ] Read `apps/web-app/eslint.config.mjs`'s exact selector and message for `process.env`, and its exemption overrides for `instrumentation.ts`/`playwright.config.ts`
- [ ] Create `biome/no-process-env.grit`: `includes: ["apps/web-app/**", "!apps/web-app/instrumentation.ts", "!apps/web-app/playwright.config.ts"]`, message copied verbatim
- [ ] Add `./biome/no-process-env.grit` to `biome.json`'s `plugins` array
- [ ] Scratch-test a `process.env.FOO` reference fires in an ordinary `apps/web-app` file and stays silent in both `instrumentation.ts` and `playwright.config.ts`; delete scratch changes
- [ ] With all 7 plugins now registered, run `pnpm exec biome lint .` once over the real (unmodified) repo and confirm zero unexpected diagnostics — this is the first point all 11 rules (4 shared + 3 web-app-only + noExplicitAny + noRestrictedImports + noRestrictedGlobals + the react domain pair) are active together against real code
- Files: `biome.json`, `biome/no-process-env.grit`

### Step 11: Update the pre-commit hook

- [ ] `format-staged.cjs`: change `formatStagedFiles` to call `biome check --write --` over the staged file list (replacing the `npx ... prettier ...` call), keeping the exact same function signature and the existing `getStagedFiles`/`restageStagedFiles`/`main` contract
- [ ] Update `format-staged.test.cjs`'s mocked-`exec` assertions to expect the Biome invocation instead of the Prettier one
- Files: `format-staged.cjs`, `format-staged.test.cjs`

### Step 12: Update package scripts

- [ ] Root `package.json`: `"format": "biome format --write ."`, `"format:check": "biome format ."`, `"lint:root": "biome lint commit-conventions.cjs commitlint.config.cjs .cz-config.cjs commit-conventions.test.cjs format-staged.cjs format-staged.test.cjs"`
- [ ] `apps/web-app/package.json`: `"lint": "biome lint ."` (relative to that package's own directory when run via turbo)
- [ ] Each of `packages/token-core`, `packages/errors`, `packages/token-type-color`, `packages/token-type-contract`, `packages/token-type-dimension`'s `package.json`: `"lint": "biome lint ."`
- [ ] Confirm `turbo.json`'s `lint`/`//#lint:root` task entries need no shape changes (same script names) — read `turbo.json` to verify before assuming
- Files: root `package.json`, `apps/web-app/package.json`, 5× `packages/*/package.json`

### Step 13: Update CI

- [ ] Read `.github/workflows/ci.yml`'s "Check formatting" and "Lint" steps; confirm they invoke `pnpm format:check`/`pnpm lint` by script name (not by hard-coded `prettier`/`eslint` CLI flags) — if so, no YAML change is needed beyond what Step 12 already produced; if either step has tool-specific flags inlined, update them
- Files: `.github/workflows/ci.yml` (verify; edit only if needed)

### Step 14: Update documentation

- [ ] `CONTRIBUTING.md`: rewrite the pre-commit-hook paragraph to describe Biome instead of Prettier
- [ ] `docs/project.md`'s Approved Dependencies list: remove the `ESLint + typescript-eslint` and `prettier` entries, add a `Biome` entry with rationale (single Rust binary covering lint + format, structurally immune to the TS7/Compiler-API breakage since Biome has its own type-inference engine — ties directly to why this migration exists)
- Files: `CONTRIBUTING.md`, `docs/project.md`

### Step 15: Remove the old toolchain

- [ ] `pnpm remove -w eslint typescript-eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser`
- [ ] `pnpm remove --filter web-app eslint-config-next` (confirm exact package name/location by reading `apps/web-app/package.json`'s devDependencies first)
- [ ] `pnpm remove -w prettier`
- [ ] Delete `eslint.config.mjs`, `apps/web-app/eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`
- [ ] Re-run `pnpm exec biome lint .` and `pnpm exec biome format .` once more with the old tools gone, to confirm nothing was silently depending on ESLint/Prettier still being present (e.g. a script or IDE config referencing them)
- Files: root `package.json`, `apps/web-app/package.json`, `pnpm-lock.yaml`, deletions: `eslint.config.mjs`, `apps/web-app/eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`

### Step 16: One-time repo-wide reformat (own commit) — first autofix step in this plan

- [ ] `pnpm format` (Biome, repo-wide) — expected to touch most files since Biome's formatting opinions aren't byte-identical to Prettier's, even with matching `indentStyle: "tab"`; this is the first command in the entire plan that writes to real repo files at scale
- [ ] Run `pnpm build && pnpm test` after reformatting to confirm zero behavioral change (matching the precedent set by the archived "Reformat Repo to Tabs" feature, which explicitly verified `build`/`lint`/`test` identical before/after)
- [ ] Land as its own commit, separate from Steps 1–15's tool-migration commits, per the feature's Non-Functional Requirements
- Files: repo-wide formatting diff (no logic changes)

### Step 17: Full verification pass

- [ ] `pnpm install` clean, `pnpm build`, `turbo run lint`, `pnpm format:check`, `pnpm test` all green
- [ ] Manually stage a file with a deliberate formatting violation and a deliberate DI-rule violation, attempt a commit, confirm the pre-commit hook auto-fixes the formatting, re-stages, and the DI-rule violation still blocks the commit (Biome lint failures inside `biome check --write` are not auto-fixable away, so this should abort — confirm this is the actual behavior, not assumed)
- [ ] Grep the full repo for `eslint`, `prettier`, `@typescript-eslint` to confirm zero remaining references outside this plan/feature doc and archived specs
- Files: none (verification only)

## Acceptance Criteria Mapping

| AC    | Verified By                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Steps 4–7 (`no-date-now`, `no-new-date`, `no-math-random`, `no-crypto-random`), scratch-tested against `packages/*` |
| AC-02 | Steps 4–10 (all 7 GritQL plugins), scratch-tested against `apps/web-app` including all 4 exemption files            |
| AC-03 | Step 3 verification of `noRestrictedImports` + the `node-fs.ts` override                                            |
| AC-04 | Step 3 verification of `noRestrictedGlobals` + the `useSaveTokenEdits.ts` override                                  |
| AC-05 | Step 3 verification of `noExplicitAny` repo-wide                                                                    |
| AC-06 | Step 3 verification of `domains.react`'s `useHookAtTopLevel`/`useExhaustiveDependencies` in `apps/web-app`          |
| AC-07 | Step 2's `biome.json` ignore config; spot-checked in Step 17                                                        |
| AC-08 | Step 16 (`pnpm format` + `pnpm format:check` both pass after)                                                       |
| AC-09 | Step 17 (`turbo run lint` green)                                                                                    |
| AC-10 | Step 17's manual staged-commit test                                                                                 |
| AC-11 | Step 15 (removal) + Step 17's CI run + the grep check                                                               |
| AC-12 | Already satisfied in `feature.md`'s Out of Scope — no plan action needed, carried through unchanged                 |
| AC-13 | Step 14                                                                                                             |

## Risks & Mitigations

- **Risk**: Biome 2.5.8's exact rule-group placement for `noRestrictedImports`/`noRestrictedGlobals` (`nursery` vs `style` vs elsewhere) isn't nailed down from docs alone. → **Mitigation**: Step 3 explicitly verifies and corrects this against the installed binary (`biome rule <name>` or `biome.json`'s own schema validation) before any plugin or consumer depends on it.
- **Risk**: `domains.react` scoping to `apps/web-app`-only via `overrides` is a newer Biome mechanism (domains + overrides interaction) with less community precedent than the rest of Biome's config surface. → **Mitigation**: Step 3 dedicates explicit check-only verification to this interaction; if it doesn't scope as expected, the fallback is enabling `domains.react` globally (packages/* has no React code today, so a global enable is a safe degrade, just not the precisely-scoped ideal).
- **Risk**: GritQL pattern-porting from ESLint's `no-restricted-syntax` AST selectors could miss an edge case ESLint's selector caught (e.g. `new Date()` no-arg vs. `new Date(x)`, or `crypto.randomUUID` as one combined selector vs. two). → **Mitigation**: each of Steps 4–10 requires reading the exact original selector before writing its `.grit` pattern (not re-deriving from the rule's name) and scratch-tests that one pattern in isolation, immediately, before the next plugin step begins — an error is caught and fixed one plugin at a time rather than surfacing later across all 7 at once.
- **Risk**: The one-time reformat (Step 16) could produce a large, hard-to-review diff that obscures a real formatting regression. → **Mitigation**: kept as its own isolated commit per the Architecture Decisions above, with an explicit `pnpm build && pnpm test` gate immediately after, mirroring the precedent already set by the archived Reformat Repo to Tabs feature — and by that point (Step 16) it is also the _only_ step in the whole plan expected to touch real file contents at scale, since Steps 1–15 are deliberately check-only/additive.
- **Risk**: Removing `eslint-config-next` permanently drops Next.js-specific lint coverage (`no-img-tag`, `no-html-link-for-pages`, etc.) with no replacement. → **Mitigation**: already accepted and documented as a permanent gap in `feature.md`'s Out of Scope (AC-12); no mitigation attempted in this plan, by design.

## Estimated Complexity

**Medium.** No new runtime code paths and no architecture change — this is a tooling swap. The complexity is concentrated in Steps 2–10: correctly porting 7 AST-selector rules into GritQL (a less mature, less-documented rule-authoring surface than ESLint's) one at a time, and confirming Biome 2.5.8's exact config surface for two rule groups and the domains/overrides interaction, none of which can be fully resolved from documentation alone and all of which require hands-on, check-only verification against the installed binary before Step 11 onward (the first steps that touch consumers) can safely proceed.
