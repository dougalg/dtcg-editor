# Feature: Migrate ESLint + Prettier to Biome

## Summary

Replaces ESLint (`typescript-eslint`, `eslint-config-next`) and Prettier repo-wide with [Biome](https://biomejs.dev) as the single lint-and-format tool, across every package and `apps/web-app`. This is scoped as the first of two sequenced features that together resolve the backlog's "Upgrade `typescript` to v7" item: Biome's own type-inference engine never touches `tsc`'s Compiler API, so migrating to it first removes `@typescript-eslint`'s `typescript<6.1.0` peer-range blocker entirely, before the TS7 compiler upgrade itself is attempted as a separate, smaller follow-up feature. Scope is syntax-only linting — no type-aware lint rules are adopted (the repo doesn't use them today either; that remains the separate "Type-aware linting" backlog item). Every one of the repo's 11 existing custom lint rules that enforce the Dependency Injection for I/O/Platform Externalities architectural constraint (`docs/project.md`) — plus their documented per-file exemptions — must be reproduced 1:1 under Biome, using native Biome rules where one exists and hand-authored GritQL rules where it doesn't. Next.js-specific lint coverage (`eslint-config-next`'s `no-img-tag`, `no-html-link-for-pages`, etc.) is knowingly and permanently dropped: Biome has no plugin ecosystem to replace it, and no third-party package fills the gap (confirmed by research — see `docs/research/eslint-alternatives-ts7-compatibility.md`).

## User Stories

- As a contributor, I want `pnpm lint` and `pnpm format`/`format:check` to keep working the same way they do today, so switching tools doesn't change my day-to-day workflow.
- As a contributor, I want every architectural rule that's enforced today (no direct `Date.now()`, `Math.random()`, `crypto.*`, `process.exit`, `console.*`, `process.env`, `node:fs` imports, bare `fetch`) to still be enforced after the migration, so the Dependency Injection constraint doesn't silently weaken.
- As a maintainer, I want the pre-commit hook and CI to fail exactly when they would have failed under ESLint/Prettier, so no regression window opens between merging this feature and someone noticing a gap.
- As a future implementer of the TS7 upgrade, I want this migration to remove the `typescript-eslint` peer-range blocker, so that feature is smaller and doesn't need a TS6-compatibility-shim workaround.

## Functional Requirements

### FR-01: Replace lint/format dependencies with Biome

Remove `eslint`, `typescript-eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-next` (from `apps/web-app`), and `prettier` via `pnpm remove`. Add Biome via `pnpm add -D -w @biomejs/biome`. `eslint.config.mjs`, `apps/web-app/eslint.config.mjs`, `.prettierrc.json`, and `.prettierignore` are deleted once their content is fully ported.

### FR-02: Port root-level DI-enforcement rules

The 4 rules in `eslint.config.mjs`'s `no-restricted-syntax` (banning bare `Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID`/`getRandomValues`) must exist as Biome rules — GritQL custom rules, since Biome has no `no-restricted-syntax` equivalent — each preserving its original violation message, applied repo-wide across `packages/*` with no exemptions (matching today's zero-exemption scope).

### FR-03: Port `apps/web-app`-level DI-enforcement rules and exemptions

The 7 rules in `apps/web-app/eslint.config.mjs`'s `restrictedSyntax` array (the 4 from FR-02 plus `process.exit`, `console.*`, `process.env`) must exist as Biome GritQL rules scoped to `apps/web-app`, with every documented per-file exemption preserved exactly:
- `lib/fatal-startup-error.ts` and `scripts/init-config.ts`: `process.exit`/`console.*` re-permitted, all other 5 rules still enforced.
- `instrumentation.ts` and `playwright.config.ts`: `process.env` re-permitted, all other 6 rules still enforced.

### FR-04: Port `no-restricted-imports`/`no-restricted-globals` rules

The `node:fs`/`node:fs/promises` import ban and the bare `fetch` global ban use Biome's **native** `noRestrictedImports`/`noRestrictedGlobals` rules (no GritQL needed — Biome supports these directly), preserving the existing exemptions: `lib/platform/node-fs.ts` (fs import allowed) and `hooks/useSaveTokenEdits.ts` (fetch global allowed).

### FR-05: Port `no-explicit-any` and react-hooks rules

`@typescript-eslint/no-explicit-any` → Biome's native `suspicious/noExplicitAny`, enabled at error level repo-wide (both `packages/*` and `apps/web-app`). `eslint-plugin-react-hooks`'s `rules-of-hooks`/`exhaustive-deps` (bundled via `eslint-config-next/core-web-vitals`) → Biome's native `correctness/useHookAtTopLevel`/`correctness/useExhaustiveDependencies`, enabled in `apps/web-app`.

### FR-06: Replicate ignore patterns

Biome's ignore configuration must exclude everything both `eslint.config.mjs`'s `ignores` array and `apps/web-app/eslint.config.mjs`'s `globalIgnores` override list, plus `eslint-config-next`'s own defaults, covered today: `node_modules`, `dist`, `.next`, `.turbo`, `coverage`, `out`, `build`, `next-env.d.ts`, `dist-test`.

### FR-07: Replace Prettier formatting with Biome's formatter

Biome's formatter replaces Prettier repo-wide, configured for `indentStyle: "tab"` to match `.prettierrc.json`'s `useTabs: true`. `.prettierignore`'s exclusion list (`node_modules`, `.next`, `dist`, `.turbo`, `pnpm-lock.yaml`, `apps/web-app/next-env.d.ts`) is replicated in Biome's own ignore config. A one-time repo-wide reformat commit is expected once Biome's formatter is wired up, since its formatting opinions aren't byte-identical to Prettier's.

### FR-08: Update the pre-commit hook

`format-staged.cjs` (invoked by `.husky/pre-commit`) currently shells out to `npx prettier --ignore-unknown --write -- <staged files>`. Update it to shell out to Biome's equivalent (`biome check --write` or `biome format --write`, applied only to the staged-files list already computed by `getStagedFiles`), keeping its existing contract: only staged files are touched, the hook re-stages whatever it changes, and a tool failure aborts the commit. `format-staged.test.cjs` is updated to match.

### FR-09: Update `lint`/`format`/`format:check` scripts

Root `package.json`: `format` → Biome's write-mode invocation, `format:check` → Biome's check-mode invocation, `lint:root` (currently `eslint commit-conventions.cjs commitlint.config.cjs .cz-config.cjs commit-conventions.test.cjs format-staged.cjs format-staged.test.cjs`) → the equivalent Biome invocation over the same file list. Each of `apps/web-app/package.json` and `packages/*/package.json`'s `"lint": "eslint"`/`"lint": "eslint ."` scripts are updated to the Biome equivalent. `turbo.json`'s `lint` and `//#lint:root` task shapes are unaffected (same script names, same dependency graph) since only the scripts' internals change.

### FR-10: Update CI

`.github/workflows/ci.yml`'s "Check formatting" (`pnpm format:check`) and "Lint" (`pnpm lint`) steps keep their names and invoke the same `pnpm` scripts — no workflow YAML structural change is needed beyond what FR-09's script changes already produce. CI must pass with ESLint/Prettier fully removed from `devDependencies`.

### FR-11: Update documentation

`CONTRIBUTING.md`'s pre-commit-hook paragraph (currently describes Prettier specifically) is updated to describe Biome. `docs/project.md`'s Approved Dependencies list is updated: `ESLint + typescript-eslint` and `prettier` entries removed, `Biome` added with rationale (single Rust binary covering both lint and format, TS7-compatible by construction).

## Acceptance Criteria

- [ ] AC-01: All 4 root-level restricted-call rules (`Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID`/`getRandomValues`) fail Biome lint on a violation and pass on compliant code, anywhere under `packages/*`.
- [ ] AC-02: All 7 `apps/web-app` restricted-call rules fail Biome lint on a violation outside their exempted files, and pass inside them, matching today's exemption-by-file behavior exactly (`lib/fatal-startup-error.ts`, `scripts/init-config.ts`, `instrumentation.ts`, `playwright.config.ts`).
- [ ] AC-03: `node:fs`/`node:fs/promises` imports fail Biome lint everywhere except `lib/platform/node-fs.ts`.
- [ ] AC-04: Bare `fetch` fails Biome lint everywhere except `hooks/useSaveTokenEdits.ts`.
- [ ] AC-05: `any` type usage fails Biome lint repo-wide (`packages/*` and `apps/web-app`).
- [ ] AC-06: A React Hooks rule-of-hooks violation and a missing-dependency violation both fail Biome lint in `apps/web-app`.
- [ ] AC-07: `node_modules`, `dist`, `.next`, `.turbo`, `coverage`, `out`, `build`, `next-env.d.ts`, and `dist-test` are excluded from both Biome lint and Biome format.
- [ ] AC-08: `pnpm format` reformats the full repo with `biome format`'s tab-indented output; `pnpm format:check` passes on the resulting tree.
- [ ] AC-09: `pnpm lint` (via `turbo run lint`) passes across every package and `apps/web-app` using Biome.
- [ ] AC-10: Committing a staged file with a formatting violation auto-formats and re-stages it via the updated pre-commit hook, touching only staged files, exactly as today's Prettier-based hook does; a tool crash still aborts the commit.
- [ ] AC-11: CI's "Check formatting" and "Lint" steps both pass on a clean branch; `eslint`, `typescript-eslint`, `@typescript-eslint/*`, `eslint-config-next`, and `prettier` are absent from every `package.json`'s `dependencies`/`devDependencies`.
- [ ] AC-12: Next.js-specific rules (`no-img-tag`, `no-html-link-for-pages`, `no-sync-scripts`, and the rest of `eslint-config-next`'s Next-specific set) are documented in this spec's Out of Scope as a permanent, accepted gap — not silently dropped without a record.
- [ ] AC-13: `CONTRIBUTING.md` and `docs/project.md` reflect Biome as the repo's lint/format tool; no remaining reference to ESLint or Prettier as the active tool.

## Technical Scope

### Affected Modules

- Root: `eslint.config.mjs` (deleted), `.prettierrc.json`/`.prettierignore` (deleted), `package.json` (scripts + devDependencies), `turbo.json` (task internals only), `format-staged.cjs`/`format-staged.test.cjs`, `.github/workflows/ci.yml` (no structural change expected, verify), `CONTRIBUTING.md`, `docs/project.md`.
- `apps/web-app/`: `eslint.config.mjs` (deleted), `package.json` (`lint` script).
- `packages/token-core`, `packages/errors`, `packages/token-type-color`, `packages/token-type-contract`, `packages/token-type-dimension`: each `package.json`'s `lint` script.

### New Components Required

- `biome.json` (root config) — rule configuration, formatter settings, ignore patterns.
- GritQL custom-rule files for the 7 restricted-call patterns that have no native Biome rule (`Date.now`, `new Date()`, `Math.random()`, `crypto.randomUUID`/`getRandomValues`, `process.exit`, `console.*`, `process.env`) — exact file layout and `biome.json` plugin-wiring syntax to be nailed down in `/sdd-plan` (Biome's plugin/GritQL mechanism is newer and less established than the rest of its rule set).

### Integration Points

- `.husky/pre-commit` → `format-staged.cjs` (tool invocation swapped, contract unchanged).
- `turbo.json`'s `lint`/`//#lint:root` tasks (unchanged shape, changed underlying scripts).
- `.github/workflows/ci.yml`'s "Check formatting" and "Lint" steps (unchanged step names/commands, changed tool underneath).
- `pnpm` workspace `devDependencies` (removed: `eslint`, `typescript-eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-next`, `prettier`; added: `@biomejs/biome`).

## Non-Functional Requirements

- **Reliability**: no rule from the existing 11-rule DI-enforcement set (or its exemptions) may be dropped, weakened, or left as a "follow-up" — 1:1 parity is a hard requirement of this feature, not a stretch goal (see AC-01 through AC-04).
- **Performance**: not a hard requirement, but Biome's Rust implementation is expected to make `pnpm lint`/`pnpm format` materially faster than the ESLint+Prettier combination it replaces.
- **Security**: none beyond what already applies to a dev-only, locally-run tool — no new network calls or runtime dependencies introduced.
- **Migration risk**: switching formatters produces a one-time, repo-wide diff (FR-07) — expected and acceptable, but should land as its own commit/PR-visible step so it doesn't obscure the rule-migration changes in review.

## Out of Scope

- Type-aware linting adoption — remains the separate, pre-existing "Type-aware linting" backlog item; this feature keeps syntax-only scope, matching what the repo runs today (`tseslint.configs.strict`, not `strict-type-checked`).
- Any replacement for `eslint-config-next`'s Next.js-specific rules (`no-img-tag`, `no-html-link-for-pages`, `no-sync-scripts`, dynamic-route key-prop checks, etc.) — Biome has no plugin ecosystem to add these, and no third-party package fills the gap (confirmed via research). Permanently accepted loss, not deferred.
- oxlint, or any linter other than Biome — considered and explicitly rejected during tool-choice grilling (its Next.js-plugin advantage was outweighed by GritQL being the more viable path for the DI-enforcement rule family).
- The TypeScript v7 compiler upgrade itself (Next.js `experimental.useTypeScriptCli` adoption) — sequenced as a separate follow-up feature once this one lands, per the user's explicit decision to split scope.
- Editor/IDE integration setup (e.g. VS Code Biome extension recommendations) — not required for CI/hook correctness.

## Open Questions

- Exact GritQL rule/plugin file layout and `biome.json` wiring for the 7 hand-authored rules (FR-02/FR-03) — deferred to `/sdd-plan`, since Biome's plugin mechanism needs hands-on verification against the installed Biome version.
- Single root `biome.json` vs. per-package nested configs — recommend a single root config (Biome's standard monorepo pattern) with each package's `lint` script invoking `biome lint` scoped to its own directory; `/sdd-plan` should confirm this against how `turbo.json`'s task graph expects per-package script behavior.
- Whether Biome's format scope should be constrained to the same file types Prettier covered, or allowed to expand to the wider set Biome formats by default (e.g. JSON/JSONC) — `/sdd-plan` should decide and document the chosen `files.includes` scope in `biome.json`.
