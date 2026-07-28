# Reformat Repo to Tabs (Prettier + `format:check` CI Gate)

Implemented on: 2026-07-28

Added Prettier as the repo's formatter (`.prettierrc.json` with `useTabs: true`), a root `.editorconfig` (`indent_style = tab`) as an editor backstop, and a `.prettierignore` excluding generated/vendor paths. Ran a one-time `prettier --write .` across 147 existing files (every `.ts`/`.tsx`/`.js`/`.cjs`/`.mjs`/`.json`/`.md`/`.yml` file repo-wide, including `docs/specs-archive/**`), converting indentation to tabs with zero behavioral drift — `build`/`lint`/`test` verified identical before and after. Added `pnpm format`/`pnpm format:check` root scripts and wired `format:check` into the existing `.github/workflows/ci.yml` `ci` job (new step, not a separate job, since it needs no special checkout).

Notable decisions: `prettier` is the one new (justified) dependency this feature adds, kept on a caret range like every other devDependency since `pnpm-lock.yaml` + CI's `--frozen-lockfile` is the real version-pinning mechanism. YAML files stay space-indented after the reformat — expected, since the YAML spec forbids tab indentation and Prettier's YAML printer ignores `useTabs` for that reason.
