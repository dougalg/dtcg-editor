# Migrate ESLint + Prettier to Biome

Implemented on: 2026-08-16

Replaced ESLint (`typescript-eslint`, `eslint-config-next`) and Prettier repo-wide with [Biome](https://biomejs.dev) 2.5.8 as the single lint-and-format tool, across every package and `apps/web-app`. First of two sequenced features resolving the backlog's "Upgrade `typescript` to v7" item: Biome's own type-inference engine never touches `tsc`'s Compiler API, removing `typescript-eslint`'s `typescript<6.1.0` peer-range blocker entirely.

## What was built

- `biome.json` — root config: formatter (tab-indented), native rules (`noExplicitAny`, `noRestrictedImports` for `node:fs`, `noRestrictedGlobals` for `fetch`, `domains.react` for the hooks pair), `overrides` for the existing per-file exemptions, `vcs.useIgnoreFile`.
- 7 hand-authored GritQL plugins (`biome/*.grit`) reproducing the Dependency Injection for I/O/Platform Externalities rules that have no native Biome equivalent: `no-date-now`, `no-new-date`, `no-math-random`, `no-crypto-random` (repo-wide, zero exemptions), and `no-process-exit`, `no-console`, `no-process-env` (`apps/web-app`-scoped, with per-file exemptions preserved).
- `format-staged.cjs`'s pre-commit hook swapped from `prettier --write` to `biome check --write --files-ignore-unknown=true`.
- All `package.json` `lint`/`format`/`format:check` scripts, `CONTRIBUTING.md`, and `docs/project.md`'s Approved Dependencies updated; `eslint.config.mjs` (both copies), `.prettierrc.json`, `.prettierignore` deleted; `eslint`/`typescript-eslint`/`eslint-config-next`/`prettier` removed from every `package.json`.
- A one-time repo-wide reformat (own commit) plus a lint-fix pass, since Biome's `recommended` preset is broader than the prior `tseslint.configs.strict`.

All 13 acceptance criteria verified (see `feature.md`); `pnpm build`, `turbo run lint` (13/13), `pnpm format:check`, and `pnpm test` (173 unit/a11y tests + 6 e2e tests) all green at merge time.

## Notable decisions / gotchas (also recorded in `docs/project.md`'s Architecture Decisions)

- Biome 2.5.8 has **no Markdown support** — `.md` was dropped from `formatter.includes` and excluded from the pre-commit hook's Biome invocation; this is a permanent tool-limitation gap versus Prettier, not a scoping choice.
- Plugin `includes` globs require a leading `**/` to match nested directories — the bare form silently never matches for a plugin (though it works for `files.includes`/`overrides.includes`).
- A single `.grit` file supports only one top-level applied pattern; `no-crypto-random.grit` combines two call shapes via GritQL's `or { ... }` combinator instead of two top-level blocks.
- `vcs.useIgnoreFile` had to be explicitly enabled so Biome respects `.gitignore` (a gitignored Playwright artifact otherwise broke `biome format .`).
- `eslint-config-next`'s Next.js-specific rules (`no-img-tag`, `no-html-link-for-pages`, etc.) are a permanently accepted, documented gap — no Biome plugin ecosystem or third-party package fills it.

## Follow-up

The sibling backlog item "Upgrade `typescript` to v7" remains open and unblocked by this migration; see `docs/research/typescript-v7-upgrade-path.md`.
