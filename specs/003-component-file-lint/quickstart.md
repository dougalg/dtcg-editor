# Quickstart: React Component File & Folder Linting

## Prerequisites

- Repo dependencies installed: `pnpm install` (pulls in `@ls-lint/ls-lint` once added as a devDependency)
- On this feature's branch, post-implementation (`.ls-lint.yml` exists, migration applied)

## Run the check directly

```sh
pnpm lint:filenames
```

Expected once implementation + migration land: exit code `0`, no violations printed.

## Run it as part of the full lint pipeline

```sh
pnpm lint
```

Expected: existing Biome output for every package, plus the `//#lint:filenames` task's `ls-lint` output, all passing, running in parallel (see [contracts/lint-diagnostics.md](./contracts/lint-diagnostics.md)).

## Validate each user story from spec.md

**US1 — naming/placement violations are caught** (FR-001–FR-003):

```sh
cp apps/web-app/components/SaveButton/SaveButton.tsx apps/web-app/components/saveButton.tsx
pnpm lint:filenames   # expect: non-zero exit, violation reported for apps/web-app/components/saveButton.tsx
rm apps/web-app/components/saveButton.tsx
```

**US2 — co-located files are never flagged** (FR-004–FR-005):

```sh
ls apps/web-app/components/SaveButton/   # expect: SaveButton.tsx, SaveButton.test.tsx, SaveButton.a11y.test.tsx, SaveButton.module.css all present
pnpm lint:filenames                      # expect: no violation mentions any file in this folder

ls apps/web-app/components/TokenTree/    # expect: TokenTree.tsx + all 4 test variants + TokenTree.module.css
pnpm lint:filenames                      # expect: still zero violations — confirms the sub-extension fix (research.md §1a) works
                                          #         for a component with more than one test file
```

**US3 — documented convention** (FR-008):

Consult `.specify/memory/constitution.md`'s Principle X (or a contributing guide, per how FR-008 is ultimately documented) for the expected structure; creating a new component folder following it should pass `pnpm lint:filenames` on the first attempt.

**US4 — hooks/lib naming conventions are enforced** (FR-013–FR-016):

```sh
cp apps/web-app/hooks/useSaveTokenEdits.ts apps/web-app/hooks/use-save-token-edits.ts
pnpm lint:filenames   # expect: non-zero exit, violation for apps/web-app/hooks/use-save-token-edits.ts (not camelCase)
rm apps/web-app/hooks/use-save-token-edits.ts

cp apps/web-app/lib/config.ts apps/web-app/lib/Config.ts
pnpm lint:filenames   # expect: non-zero exit, violation for apps/web-app/lib/Config.ts (not kebab-case)
rm apps/web-app/lib/Config.ts

pnpm lint:filenames   # expect: exit 0 — every existing hooks/lib file already complies, no migration needed
```

## Validate the migration itself

```sh
find apps/web-app/components -maxdepth 1 -type f            # expect: empty — every file now lives in a per-component folder
find packages/design-system/src/components/ui -iname "*.tsx" # expect: every result is PascalCase
pnpm build && pnpm test                                       # expect: green — confirms every import was updated correctly
pnpm lint                                                      # expect: green — confirms zero ls-lint violations repo-wide (FR-012)
```
