# Quickstart: React Component File & Folder Linting

## Prerequisites

- Repo dependencies installed: `pnpm install`
- On this feature's branch, post-implementation (script exists at repo root, migration applied)

## Run the check directly

```sh
node check-component-structure.cjs
```

Expected once implementation + migration land: `✔ check-component-structure: N component files checked, no violations found.` and exit code `0`.

## Run it as part of the full lint pipeline

```sh
pnpm lint
```

Expected: existing Biome output for every package, plus the `//#lint:component-structure` task's output, all passing (see [contracts/lint-diagnostics.md](./contracts/lint-diagnostics.md) for the exact output contract).

## Validate each user story from spec.md

**US1 — naming/placement violations are caught** (see spec.md FR-001–FR-003):

```sh
cp apps/web-app/components/SaveButton/SaveButton.tsx apps/web-app/components/saveButton.tsx
node check-component-structure.cjs   # expect: exit 1, pascal-case-filename + folder-placement violations
rm apps/web-app/components/saveButton.tsx
```

**US2 — co-located files are never flagged** (FR-004–FR-005):

```sh
ls apps/web-app/components/SaveButton/   # expect: SaveButton.tsx, SaveButton.test.tsx, SaveButton.a11y.test.tsx, SaveButton.module.css all present
node check-component-structure.cjs       # expect: no violation mentions any file in this folder
```

**US4 — compound components pass, unrelated multi-exports fail** (FR-013–FR-016):

```sh
node check-component-structure.cjs   # expect: packages/design-system/src/components/ui/card/Card.tsx (Card + Card*-prefixed
                                      #          siblings) produces no violation

cat > apps/web-app/components/Scratch/Scratch.tsx <<'EOF'
export function Modal() { return null; }
export function Tooltip() { return null; }
EOF
node check-component-structure.cjs   # expect: exit 1, multiple-unrelated-components violation for Scratch.tsx
rm -rf apps/web-app/components/Scratch
```

## Validate the migration itself

```sh
find apps/web-app/components -maxdepth 1 -type f            # expect: empty — every file now lives in a per-component folder
find packages/design-system/src/components/ui -iname "*.tsx" # expect: every result is PascalCase
pnpm build && pnpm test                                       # expect: green — confirms every import was updated correctly
```
