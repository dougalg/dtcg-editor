# Data Model: React Component File & Folder Linting

This feature adds no application code and no custom lint script — `@ls-lint/ls-lint` is a configuration-driven, prebuilt tool with its own internal implementation this project does not own. There is no in-memory model, persisted data, or lifecycle for this repository to define.

What this repo *does* own is the `.ls-lint.yml` configuration itself, which maps directly onto the concepts `ls-lint` already defines:

## `.ls-lint.yml` shape (illustrative — exact syntax verified against the installed version during implementation)

| Config concept (ls-lint's own) | Maps to |
|---|---|
| `ls:` path glob key (e.g. `apps/web-app/components/*`) | The set of directories a rule group applies to — one entry per in-scope component location (FR-009). |
| `.tsx: PascalCase` | FR-001 — component filename casing. |
| `.tsx: regex:${0}` | FR-003 — folder name must match the component file's base name (`${0}` = immediate parent directory name). |
| `.tsx: exists:1` | FR-002, in combination with the folder-per-component structure — exactly one component file per folder. |
| `ignore:` list | FR-010 — excludes `apps/web-app/app/` (Next.js reserved files) from every rule. |

## Violation (as reported by `ls-lint`'s own CLI output)

| Field | Notes |
|---|---|
| Path | The offending file or directory, printed by `ls-lint` itself. |
| Rule broken | Which configured rule (case, regex, exists) failed — `ls-lint`'s own diagnostic naming, not a scheme this repo defines (see `contracts/lint-diagnostics.md`). |

There is no `Violation.rule` enum or `ExportedComponent`/`ComponentFile` in-memory type to define, since no code in this repository parses component exports or walks the filesystem itself — that work is entirely delegated to `ls-lint`.
