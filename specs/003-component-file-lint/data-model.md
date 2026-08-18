# Data Model: React Component File & Folder Linting

This feature adds no application code and no custom lint script — `@ls-lint/ls-lint` is a configuration-driven, prebuilt tool with its own internal implementation this project does not own. There is no in-memory model, persisted data, or lifecycle for this repository to define.

What this repo *does* own is the `.ls-lint.yml` configuration itself, which maps directly onto the concepts `ls-lint` already defines:

## `.ls-lint.yml` shape (matches the shipped config — see research.md §1b for what changed from the pre-implementation plan and why)

| Config concept (ls-lint's own) | Maps to |
|---|---|
| `"{apps/web-app/components,packages/*/src/components}"` bare directory key, `.tsx: exists:0` | FR-002/FR-009 — forbids a stray `.tsx` file sitting flat in any in-scope component location (a `/*` glob rule alone can't see it — it only matches directories, and a flat file has no matching subdirectory to attach to). Brace-expansion combines `apps/web-app/components` with the generic `packages/*/src/components` pattern into one key (post-implementation consolidation) — deliberately not a `**/components` recursive glob, which was found to produce phantom violations against ignored `dist/` build-output directories (see research.md §6). |
| `"{...}/*"` glob key, `.dir: PascalCase` | FR-001 — component folder naming casing. |
| `"{...}/*"` glob key, `.tsx: regex:${0}` | FR-003 — folder name must match the component file's base name (`${0}` = immediate parent directory name); combined with the `.dir: PascalCase` rule above, this transitively forces the file's basename to also be PascalCase, so no separate case rule is needed on `.tsx` itself. Declared as a separate key from `.dir`, not combined with `|`, since `|` is a logical OR (verified — see research.md §1b), not AND. |
| `"{...}/*"` glob key, `.tsx: exists:1` (same key as the row above, via `regex:${0} \| exists:1`) | FR-002 — exactly one component file per folder. `exists` is independently enforced regardless of what it's chained with via `\|` (verified — see research.md §1b). |
| (no sub-extension keys) | FR-004 — co-located test files (`.test.tsx`, `.a11y.test.tsx`, etc.) and style files (`.module.css`) are satisfied by construction: `ls-lint` matches extensions by exact string, not suffix, so these are simply different extensions from `.tsx`/`.css` as far as any declared rule is concerned — verified during implementation, no explicit exclusion needed (superseding the sub-extension-key plan in research.md §1a). |
| `ignore:` list | FR-010 — excludes `apps/web-app/app/` (Next.js reserved files) from every rule. |
| `apps/web-app/hooks` path key, `.ts`/`.tsx`: `camelCase` | FR-013 — hooks filename casing. |
| `apps/web-app/lib/**` path glob (recursive), `.ts`/`.tsx`: `kebab-case` | FR-014 — lib filename casing, at any nesting depth. |

## Violation (as reported by `ls-lint`'s own CLI output)

| Field | Notes |
|---|---|
| Path | The offending file or directory, printed by `ls-lint` itself. |
| Rule broken | Which configured rule (case, regex, exists) failed — `ls-lint`'s own diagnostic naming, not a scheme this repo defines (see `contracts/lint-diagnostics.md`). |

There is no `Violation.rule` enum or `ExportedComponent`/`ComponentFile` in-memory type to define, since no code in this repository parses component exports or walks the filesystem itself — that work is entirely delegated to `ls-lint`.
