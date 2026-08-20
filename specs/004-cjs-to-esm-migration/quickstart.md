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
ls .cz-config.cjs 2>&1 | grep -q "No such file" && echo "OK: .cz-config.cjs deleted"
ls commit-conventions.json commitlint.config.mjs format-staged.mjs \
  format-staged.test.mjs commit-conventions.test.mjs
```

Expect: `.cz-config.cjs` no longer exists; the five other files exist under their
new names, and no `commit-conventions.cjs`, `commitlint.config.cjs`,
`format-staged.cjs`, or `format-staged.test.cjs` remain.

```sh
grep -rln "require(" commit-conventions.json commitlint.config.mjs \
  format-staged.mjs format-staged.test.mjs commit-conventions.test.mjs
grep -n "module.exports" commitlint.config.mjs format-staged.mjs \
  format-staged.test.mjs commit-conventions.test.mjs
```

Expect: no hits for either command — no `require()`/`module.exports` remain
anywhere in this feature's scope (SC-001; no CommonJS exception is needed once
`.cz-config.cjs` is gone).

## 3. Run the tooling workflows end-to-end (SC-002)

```sh
pnpm test:commits            # node --test commit-conventions.test.mjs
pnpm test:format-staged      # node --test format-staged.test.mjs
pnpm lint:root                # biome lint <updated filenames>
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

Expect: the interactive `@commitlint/cz-commitlint` prompt launches (replacing
`cz-customizable` — FR-008), offering the same `type`/`scope` choices as before
migration, now sourced live from `commitlint.config.mjs` (which itself reads
`commit-conventions.json`) rather than from a separate `.cz-config`. Exit with
Ctrl+C once confirmed — no need to complete a real commit.

## 4. Confirm no stale references remain

```sh
grep -rn "cz-customizable\|\.cz-config\|commit-conventions\.cjs\|commitlint\.config\.cjs\|format-staged\.cjs\b\|format-staged\.test\.cjs" \
  .husky/ package.json
```

Expect: no hits — every reference to a renamed or deleted file's old name, and to
the removed `cz-customizable` dependency, has been updated (FR-007, FR-008).
