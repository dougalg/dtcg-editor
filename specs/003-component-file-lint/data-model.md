# Data Model: React Component File & Folder Linting

This feature is a static-analysis tool, not an application with persisted data. The "entities" below are the in-memory concepts `check-component-structure.cjs` builds up while scanning the repository on each run; nothing here is stored between runs.

## ComponentFile

Represents one `.tsx`/`.jsx` file identified as containing at least one React component export.

| Field | Type | Notes |
|---|---|---|
| `path` | string | Repo-relative path as found on disk. |
| `baseName` | string | Filename without extension, e.g. `SaveButton`. |
| `exportedComponents` | `ExportedComponent[]` | Every top-level exported identifier whose name is PascalCase and whose declaration is a function/arrow-function/class recognizable as a component (FR-013–FR-015 apply here). |
| `isNextReservedFile` | boolean | True for Next.js App Router special filenames (`page`, `layout`, `loading`, `error`, `not-found`, `template`, `default`, `route`) — such files are excluded from all rules per FR-010. |

## ExportedComponent

One exported component identifier found inside a `ComponentFile`.

| Field | Type | Notes |
|---|---|---|
| `name` | string | The exported identifier, e.g. `Card`, `CardHeader`. |
| `isPrimary` | boolean | True if this component's name is a prefix of every other exported component's name in the same file (FR-014); a file with exactly one exported component always has that component marked primary. |

## ComponentFolder

The directory expected to contain exactly one `ComponentFile` (or one compound-component family) plus its co-located files.

| Field | Type | Notes |
|---|---|---|
| `path` | string | Repo-relative directory path, e.g. `apps/web-app/components/SaveButton`. |
| `expectedName` | string | The primary component's name — the folder's `path` basename MUST equal this (FR-003). |
| `coLocatedFiles` | string[] | Non-component files present (tests, `*.module.css`, `index.ts`, component-local hooks/types) — never flagged by FR-004/FR-005. |

## Violation

One reported lint failure.

| Field | Type | Notes |
|---|---|---|
| `filePath` | string | The offending file or folder. |
| `rule` | enum | One of: `pascal-case-filename` (FR-001), `folder-placement` (FR-002), `folder-name-mismatch` (FR-003), `multiple-unrelated-components` (FR-013/FR-015), `next-reserved-exempt` is never a violation — listed here only to clarify it is not a rule value. |
| `message` | string | Actionable, human-readable text per FR-007 — names the file/folder and which rule was broken. |

## State / Lifecycle

There is no persisted state or lifecycle — each `pnpm lint` invocation performs a fresh, stateless scan of the current working tree and either exits `0` (no `Violation`s) or exits non-zero after printing every `Violation` found, matching Biome's existing pass/fail contract for the rest of `pnpm lint`.
