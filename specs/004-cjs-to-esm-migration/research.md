# Phase 0 Research: CommonJS to ES Module Migration

## Constraint check: which of the six `.cjs` files can actually become ESM?

The spec's edge cases flagged this as the key risk: "Migration must confirm before
renaming/rewriting that ESM is actually supported for each of the six files, since
forcing an unsupported format breaks the tool." Each consuming tool was checked
against its actual config-loading mechanism (not just tool marketing docs).

### Decision: `.cz-config.cjs` and `commit-conventions.cjs` stay CommonJS (named exception)

**Rationale**: `cz-customizable` (the `commitizen` adapter behind `pnpm commit`,
resolved via `package.json`'s `config.commitizen.path` / `config["cz-customizable"].config`)
loads its config file with a synchronous `require()` call in its own source
(`lib/read-config-file.js`), with no `import()`/ESM-aware loading path at all. This
is a genuine third-party constraint, not a preference — forcing `.cz-config` to be
ESM-only would break `pnpm commit` outright. `commit-conventions.cjs` is `require()`d
*directly by* `.cz-config.cjs` (`const { types, scopes } = require("./commit-conventions.cjs")`),
so it inherits the same constraint transitively: as long as anything in the
`require()` chain from `cz-customizable` must resolve synchronously via `require()`,
every file in that chain has to stay loadable that way. Node's `require(esm)`
interop for synchronous CJS→ESM loading has real caveats (e.g. it can't cross
files using top-level `await`) and isn't something `cz-customizable` itself
opts into, so relying on it here would be fragile and outside this feature's
control. This satisfies the spec's FR-005 exception clause: the exception is named
explicitly, both here and with an inline comment in the two files themselves.

**Alternatives considered**:

- *Convert anyway and hope Node's `require(esm)` interop covers it*: rejected —
  undocumented/unsupported by the tool itself, and would silently break `pnpm commit`
  the moment either file's shape triggers an unsupported case.
- *Replace `cz-customizable` with an ESM-native commitizen adapter*: rejected as
  out of scope — the spec's scope is module-syntax migration of the six existing
  files, not a tooling swap; swapping adapters risks changing the interactive
  commit prompt's behavior, which FR-002/FR-006 explicitly rule out.
- *Vendor/copy `commit-conventions` types+scopes inline into `.cz-config.cjs` only,
  migrate the "real" `commit-conventions.cjs` used by commitlint to ESM*: rejected —
  reintroduces the exact drift risk `commit-conventions.cjs`'s own file comment
  says it exists to prevent (single source of truth for types/scopes).

### Decision: `commitlint.config.cjs` migrates to ESM (`commitlint.config.mjs`)

**Rationale**: `commitlint` resolves its config via `cosmiconfig`, which explicitly
supports `commitlint.config.mjs` (and `.js` under `"type": "module"`) alongside the
CJS variants. Confirmed against commitlint's own configuration reference. Since
`commit-conventions.cjs` remains CommonJS (see above), the ESM `commitlint.config.mjs`
imports it as a CJS interop import (`import commitConventions from "./commit-conventions.cjs"`),
which Node's ESM loader supports natively — no `require()` needed on this side.

**Alternatives considered**: Leaving it as `.cjs` since it also touches
`commit-conventions.cjs` — rejected; unlike `cz-customizable`, `commitlint` has no
constraint forcing this, and User Story 1's value (one consistent syntax) is lost
for no reason if this file stays CJS just because a neighbor must.

### Decision: `format-staged.cjs` / `format-staged.test.cjs` migrate to ESM (`.mjs`)

**Rationale**: These are invoked directly — the Husky `.husky/prepare-commit-msg`
hook runs `node format-staged.cjs` as a plain script (no config-file resolution by
a third-party tool), and `format-staged.test.cjs` runs via Node's own built-in test
runner (`node --test format-staged.cjs`), which runs `.mjs` files natively. Neither
has a tool-imposed CommonJS constraint, so both migrate fully, with the hook script
and the `test:format-staged` package.json script updated to reference the new
`.mjs` filename (FR-007).

### Decision: `commit-conventions.test.cjs` migrates to ESM (`commit-conventions.test.mjs`)

**Rationale**: This test exercises `commit-conventions.cjs`'s exported values. The
*test* itself has no third-party loader constraint (run via `node --test`, which
supports ESM natively) — only the file being tested (`commit-conventions.cjs`) must
stay CJS, per the `cz-customizable` constraint above. An ESM test file can import a
CommonJS module directly (`import { types, scopes } from "./commit-conventions.cjs"`),
so the test migrates while its subject does not.

## Mechanism: file renames, not a root `"type": "module"` field

**Decision**: Migrated files are renamed from `.cjs` to `.mjs` (not left as `.js`
under a new root `package.json` `"type": "module"` field).

**Rationale**: The root `package.json` currently has no `"type"` field, so any
existing or future root-level `.js` file defaults to CommonJS interpretation.
Adding `"type": "module"` would silently flip that default for every other
root-level `.js` file (present or future), which is a repo-wide blast radius far
outside this feature's six-file scope. `.mjs` is always ESM regardless of the
`package.json` `"type"` field, so renaming to `.mjs` scopes the change precisely to
the files actually being migrated, with no effect on anything else. The two files
staying CommonJS keep the `.cjs` extension, which is unambiguous regardless of
`"type"` and matches Node's own recommended way to keep an explicit CommonJS file
in an otherwise-ESM-leaning codebase.

**Alternatives considered**: Root `"type": "module"` + rename migrated files to
`.js`: rejected per above (repo-wide blast radius). Leaving migrated files as `.js`
with no `"type"` field: rejected — Node would interpret them as CommonJS by
default, defeating the migration entirely.

## Consuming-tool inventory (what must be updated alongside each rename)

| File (before) | File (after) | Consumers requiring an update |
| --- | --- | --- |
| `format-staged.cjs` | `format-staged.mjs` | `.husky/prepare-commit-msg` (`node format-staged.cjs` → `node format-staged.mjs`); `package.json` `lint:root` script file list |
| `format-staged.test.cjs` | `format-staged.test.mjs` | `package.json` `test:format-staged` script |
| `commit-conventions.test.cjs` | `commit-conventions.test.mjs` | `package.json` `test:commits` script |
| `commitlint.config.cjs` | `commitlint.config.mjs` | None explicit — `commitlint` auto-discovers via cosmiconfig; only `package.json` `lint:root` script file list needs updating |
| `.cz-config.cjs` | *(unchanged, stays `.cz-config.cjs`)* | None — already referenced by exact filename in `package.json`'s `config["cz-customizable"].config` |
| `commit-conventions.cjs` | *(unchanged, stays `commit-conventions.cjs`)* | None — required by filename from `.cz-config.cjs` and imported by filename from `commitlint.config.mjs` |

`package.json`'s `lint:root` script (`biome lint commit-conventions.cjs
commitlint.config.cjs .cz-config.cjs commit-conventions.test.cjs format-staged.cjs
format-staged.test.cjs`) lists all six files by name and must be updated to the new
filenames for the four that rename.

## Constitution amendment shape

**Decision**: Add one new Core Principle to `.specify/memory/constitution.md` —
"Modern Defaults" (exact title TBD at drafting time) — stating that code, tools, and
file formats default to the modern, currently-recommended choice over a legacy one
unless a named tool/runtime constraint makes that impossible, with ESM-over-CommonJS
folded in as the concrete named example (per spec FR-003–FR-005), following the
constitution's existing versioned-amendment process (Sync Impact Report, semantic
version bump — this is a new principle, so MINOR at minimum).

**Rationale**: Matches the constitution's existing pattern (see the already-present
"Component Granularity & Testing" principle's amendment history) of one principle
per concern, versioned via Sync Impact Report. Folding the ESM/CJS case in as a
named example (rather than a standalone "module syntax" principle) directly
satisfies the user's later scope broadening.

**Alternatives considered**: A standalone "ESM over CommonJS" principle plus a
separate, later "modern defaults" principle — rejected as the user explicitly asked
for the general principle now, with ESM/CJS as an example of it, not two principles.
