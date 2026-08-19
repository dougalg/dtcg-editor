# Quickstart: Validating the CJS→ESM Migration

Prerequisites: repo installed with `pnpm install` at the root; Node >=26.5.0 (per
`package.json` `engines`).

## 1. Confirm the constitution amendment landed

```sh
grep -n "Modern Defaults" .specify/memory/constitution.md
```

Expect: a new Core Principle section present, referencing ESM-over-CommonJS as a
named example, with a version bump and Sync Impact Report at the top of the file
(see `research.md` → "Constitution amendment shape").

## 2. Confirm the file-level migration matches the plan's inventory

```sh
ls .cz-config.cjs commit-conventions.cjs
ls commitlint.config.mjs format-staged.mjs format-staged.test.mjs commit-conventions.test.mjs
```

Expect: the first two files still exist as `.cjs` (named exception, per
`research.md`); the second four exist as `.mjs` and their old `.cjs` counterparts
are gone.

```sh
grep -rn "require(" .cz-config.cjs commit-conventions.cjs commitlint.config.mjs \
  format-staged.mjs format-staged.test.mjs commit-conventions.test.mjs
grep -n "module.exports" commitlint.config.mjs format-staged.mjs \
  format-staged.test.mjs commit-conventions.test.mjs
```

Expect: `require()` appears only inside `.cz-config.cjs`/`commit-conventions.cjs`
(SC-001 excludes the named exception); no `module.exports` in the four migrated
files.

## 3. Run the tooling workflows end-to-end (SC-002)

```sh
pnpm test:commits            # node --test commit-conventions.test.mjs
pnpm test:format-staged      # node --test format-staged.test.mjs
pnpm lint:root                # biome lint <updated six filenames>
```

Expect: all pass, same results as before migration.

```sh
git commit --allow-empty -m "chore(root): quickstart validation commit"
```

Expect: `.husky/prepare-commit-msg` runs `format-staged.mjs` without error, and
`.husky/commit-msg` runs `commitlint --edit` without error (commitlint picks up
`commitlint.config.mjs` automatically via cosmiconfig). Then:

```sh
git reset --soft HEAD~1   # undo the throwaway validation commit
```

```sh
pnpm commit
```

Expect: the interactive `cz-customizable` prompt launches normally, offering the
same `type`/`scope` choices as before migration (sourced from
`commit-conventions.cjs` via `.cz-config.cjs`). Exit with Ctrl+C once confirmed —
no need to complete a real commit.

## 4. Confirm no stale references remain

```sh
grep -rn "\.cjs" .husky/ package.json | grep -v "\.cz-config\.cjs\|commit-conventions\.cjs"
```

Expect: no hits — every reference to a renamed file's old `.cjs` name has been
updated (FR-007).
