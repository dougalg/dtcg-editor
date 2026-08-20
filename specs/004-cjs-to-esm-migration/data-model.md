# Data Model: CommonJS to ES Module Migration

This feature has no runtime/persisted data model — it's a source-file and
governance-document migration. The "entities" are files and a documentation
principle, carried over from the spec's Key Entities section:

## Root-level tooling script

Repo-authored file outside `apps/`/`packages/` supporting the dev workflow.

| Field | Value |
| --- | --- |
| `path` | Repo-root-relative filename |
| `module_syntax` | `commonjs` \| `esm` (post-migration target, per `research.md`) |
| `consumed_by` | Tool(s)/script(s)/hook(s) that load this file |
| `exception_reason` | Set only when `module_syntax = commonjs` is retained; names the tool constraint forcing it (FR-005) |

**Instances** (from `research.md`'s consuming-tool inventory):

| path | module_syntax | consumed_by | exception_reason |
| --- | --- | --- | --- |
| `format-staged.cjs` → `format-staged.mjs` | esm | `.husky/prepare-commit-msg` | — |
| `format-staged.test.cjs` → `format-staged.test.mjs` | esm | `package.json` `test:format-staged` | — |
| `commitlint.config.cjs` → `commitlint.config.mjs` | esm | `commitlint` (cosmiconfig auto-discovery) | — |
| `commit-conventions.test.cjs` → `commit-conventions.test.mjs` | esm | `package.json` `test:commits` | — |
| `commit-conventions.cjs` → `commit-conventions.json` | json (n/a — pure data) | `commitlint.config.mjs` (`import`, JSON import attribute) | — |
| `.cz-config.cjs` | *(deleted)* | was `cz-customizable`; adapter replaced by `@commitlint/cz-commitlint`, which needs no separate config file | — |

No CommonJS exception remains in this feature: replacing `cz-customizable` with
`@commitlint/cz-commitlint` (research.md) removed the one tool constraint that
previously forced `.cz-config.cjs`/`commit-conventions.cjs` to stay CommonJS.

**Validation rule**: A `root-level tooling script` MUST have `module_syntax = esm`
(or be plain JSON, for pure-data files) unless `exception_reason` is set and
non-empty (constitution amendment's exception clause, FR-005) — currently no
instance in this feature needs that clause.

## Constitution principle

| Field | Value |
| --- | --- |
| `title` | New Core Principle in `.specify/memory/constitution.md` (working title: "Modern Defaults") |
| `statement` | Code, tools, and file formats default to the modern, currently-recommended choice over a legacy one |
| `named_example` | ESM over CommonJS module syntax |
| `exception_clause` | Legacy choices are permitted only when a named, unavoidable tool/runtime constraint requires them, called out explicitly in-place |

No state transitions apply to either entity — both are point-in-time artifacts
updated once by this feature (file rewrites; one versioned constitution
amendment).
