# React Component File & Folder Linting

Implemented on: 2026-08-19

Enforces PascalCase filenames and one-folder-per-component (co-located tests/styles) for every React component repo-wide, plus camelCase/kebab-case naming for `apps/web-app/hooks`/`lib`, via `@ls-lint/ls-lint` running in parallel with Biome under `pnpm lint`.

## Key files

- `.ls-lint.yml` (repo root) — the enforced rule set
- `turbo.json` — `//#lint:filenames` task wired into `lint`'s `dependsOn`, alongside the existing `//#lint:root`
- `.specify/memory/constitution.md` Principle X — documents the convention (constitution v2.3.0)

## Scope (grew during implementation)

Started as `apps/web-app/components` + `packages/design-system/src/components/ui`; a consolidation request surfaced two more component locations that had been missed (`packages/token-editor-color/src/components`, `packages/token-editor-dimension/src/components`), both following the same flat/lowercase pattern. Final scope covers `apps/web-app/components` plus every `packages/*/src/components` generically — a future new package is automatically in scope, no `.ls-lint.yml` change needed.

All non-conforming files were migrated to comply: `apps/web-app/components/*` (flat → per-component folders), `packages/design-system/src/components/ui/*` (lowercase → PascalCase, and denested — `ui/` removed so its structure matches every other package), `packages/token-editor-color/src/components/*` and `packages/token-editor-dimension/src/components/*` (generic lowercase filenames like `editor.tsx` → their exported component's PascalCase name).

## Notable decisions

- **`ls-lint` chosen over a hand-rolled script**: the directory-aware glob/regex logic these rules need (folder-name-matches-file-name, one-file-per-folder, exclude Next.js reserved files) is exactly what a purpose-built filename linter solves; see `research.md` for the full alternatives comparison, including why a Biome Grit plugin and `eslint-plugin-check-file` were both ruled out.
- **The one-component-per-file rule (constitution Principle X's pre-existing clause) is explicitly NOT enforced** by this feature — `ls-lint` can't parse file contents, and a second custom tool wasn't judged worth it for one rule. Known, accepted, deliberate gap (e.g. `packages/design-system/src/components/Card/Card.tsx` still defines 8 components in one file).
- **Two `ls-lint` behavioral gotchas found and worked around, both verified empirically rather than assumed**: (1) `|` between rules on one key is a logical OR, not AND — combining `PascalCase | regex:${0}` would silently under-enforce; (2) a `**` recursive glob combined with an `ignore:` entry produces phantom violations against ignored-but-glob-matched directories (e.g. a package's `dist/` build-output mirror). Both are recorded in `docs/history.md`'s Architecture Decisions for future `.ls-lint.yml` changes to avoid re-discovering.
- **`/speckit-analyze` surfaced one CRITICAL coverage gap** (co-located test files with compound `.tsx` suffixes like `.a11y.test.tsx` risked being miscounted) — investigated further during implementation and found to already be a non-issue: `ls-lint` matches extensions by exact string, not suffix, so no explicit exclusion was actually needed.
- A pre-existing, unrelated e2e test failure (`keyboard-navigation.spec.ts` expecting fixtures from a stale `sample_data/` path) was identified during this feature's `pnpm test` runs and confirmed unrelated via inspection; fixed separately by another commit on `main`, not by this feature.
