# Phase 0 Research: CommonJS to ES Module Migration

## Constraint check: which of the six `.cjs` files can actually become ESM?

The spec's edge cases flagged this as the key risk: "Migration must confirm before
renaming/rewriting that ESM is actually supported for each of the six files, since
forcing an unsupported format breaks the tool." Each consuming tool was checked
against its actual config-loading mechanism (not just tool marketing docs).

### Superseded: `.cz-config.cjs` and `commit-conventions.cjs` staying CommonJS

An earlier pass of this research concluded `.cz-config.cjs` and `commit-conventions.cjs`
had to stay CommonJS, because `cz-customizable` (the `commitizen` adapter behind
`pnpm commit`) loads its config file with a synchronous `require()` call in its own
source (`lib/read-config-file.js`), with no ESM-aware loading path at all — a
genuine tool constraint, not a preference.

That finding is still technically correct, but a follow-up question — "why
`cz-customizable` at all?" — surfaced a better fix than accepting the exception.
Tracing it back to `docs/specs-archive/202607251245-enforce-conventional-commits/plan.md`:
`cz-customizable` was chosen over the more common `cz-conventional-changelog`
adapter specifically because `cz-conventional-changelog` can't drive its scope list
from an external file — `cz-customizable`'s only job here was letting commitizen and
commitlint share one type/scope list via a `require()`-able JS config, so the two
could never drift apart. See the decision below: `@commitlint/cz-commitlint`
achieves that same goal more directly, which removes the constraint instead of
accepting it.

### Decision: replace `cz-customizable` with `@commitlint/cz-commitlint`; delete `.cz-config.cjs`

**Rationale**: `@commitlint/cz-commitlint` is a commitizen adapter maintained by the
commitlint project itself. Instead of reading a separate config file, it derives its
interactive prompts (types, scopes, breaking-change handling) directly from the
project's own `commitlint.config` at runtime. This satisfies the original "shared
source of truth" goal *more* directly than `cz-customizable` did — there is no
longer a second config file to keep in sync at all, so there's nothing left that
forces a CommonJS exception. `.cz-config.cjs` is deleted (FR-008), not migrated.
Wiring: `package.json`'s `config.commitizen.path` changes from `"cz-customizable"`
to `"@commitlint/cz-commitlint"`; the `config["cz-customizable"].config` override
entry is removed entirely; `cz-customizable` is removed from `devDependencies` and
`@commitlint/cz-commitlint` (plus its `inquirer` peer dependency) is added, each via
`pnpm remove`/`pnpm add` per this repo's CLAUDE.md convention.

**Alternatives considered**:

- *Keep `cz-customizable`, accept `.cz-config.cjs`/`commit-conventions.cjs` as a
  named CommonJS exception* (the original decision): superseded — technically valid
  per FR-005, but leaves a tool in place whose only reason for being there
  (shared source of truth) is better solved by removing it.
- *Keep `cz-customizable`, point it at a generated/duplicated JSON config*:
  rejected — `cz-customizable`'s config needs computed display fields (a padded
  `name` string per type) that plain JSON can't express without either duplicating
  data (drift risk) or adding a build/generate step neither commitlint nor any
  other tool in this repo needs; `@commitlint/cz-commitlint` sidesteps the whole
  problem instead of working around it.
- *Vendor/copy `commit-conventions` types+scopes inline into `.cz-config.cjs` only*:
  rejected — same drift risk as above, and moot once `.cz-config.cjs` is deleted.

### Decision: `commit-conventions.cjs` becomes `commit-conventions.json` (plain data, no module syntax)

**Rationale**: With `.cz-config.cjs` gone, the only remaining consumer of
`commit-conventions`'s types/scopes is `commitlint.config.mjs`. The file has always
held pure data (arrays of `{ value, description }` objects, no functions) — the
`require()`/`module.exports` wrapper around it was only ever there because
`cz-customizable` needed something `require()`-able. Since JSON is natively
importable by both `require()` (already, today) and ESM `import` (with an import
attribute, e.g. `import commitConventions from "./commit-conventions.json" with { type: "json" }`),
converting it to plain `.json` is the correct "modern format by default" outcome
this feature's constitution principle asks for — it isn't CommonJS *or* ESM, it's
data, so the question of module syntax doesn't apply to it at all. `commitlint.config.mjs`
imports it directly and computes the `type-enum`/`scope-enum` rule arrays with
`.map()` in its own ESM code, exactly matching what the user asked for ("commitlint
should be able to import the types and scopes from the json file directly").

**Alternatives considered**: Leaving it as `commit-conventions.cjs` — rejected, no
longer has any consumer requiring CommonJS once `.cz-config.cjs` is gone, so keeping
the CJS wrapper around pure data would be an unjustified legacy holdover.

### Decision: `commitlint.config.cjs` migrates to ESM (`commitlint.config.mjs`)

**Rationale**: `commitlint` resolves its config via `cosmiconfig`, which explicitly
supports `commitlint.config.mjs` (and `.js` under `"type": "module"`) alongside the
CJS variants. Confirmed against commitlint's own configuration reference.
`commitlint.config.mjs` imports `commit-conventions.json` directly (see above) —
plain JSON, no CJS/ESM interop concerns either way.

**Alternatives considered**: Leaving it as `.cjs` since it also touches
`commit-conventions.json` — rejected; `commitlint` has no constraint forcing this,
and User Story 1's value (one consistent syntax) is lost for no reason.

### Decision: `format-staged.cjs` / `format-staged.test.cjs` migrate to ESM (`.mjs`)

**Rationale**: These are invoked directly — the Husky `.husky/prepare-commit-msg`
hook runs `node format-staged.cjs` as a plain script (no config-file resolution by
a third-party tool), and `format-staged.test.cjs` runs via Node's own built-in test
runner (`node --test format-staged.cjs`), which runs `.mjs` files natively. Neither
has a tool-imposed CommonJS constraint, so both migrate fully, with the hook script
and the `test:format-staged` package.json script updated to reference the new
`.mjs` filename (FR-007).

### Decision: `commit-conventions.test.cjs` migrates to ESM (`commit-conventions.test.mjs`)

**Rationale**: This test exercises `commit-conventions.json`'s data. `node --test`
supports `.mjs` test files natively, and an ESM file can import JSON directly (same
import-attribute mechanism as `commitlint.config.mjs` uses), so both the test and
its subject are now free of CommonJS — no exception needed anywhere in this chain
once `.cz-config.cjs` is gone.

## Mechanism: file renames, not a root `"type": "module"` field

**Decision**: Migrated files are renamed from `.cjs` to `.mjs` (not left as `.js`
under a new root `package.json` `"type": "module"` field).

**Rationale**: The root `package.json` currently has no `"type"` field, so any
existing or future root-level `.js` file defaults to CommonJS interpretation.
Adding `"type": "module"` would silently flip that default for every other
root-level `.js` file (present or future), which is a repo-wide blast radius far
outside this feature's scope. `.mjs` is always ESM regardless of the `package.json`
`"type"` field, so renaming to `.mjs` scopes the change precisely to the files
actually being migrated, with no effect on anything else.

**Alternatives considered**: Root `"type": "module"` + rename migrated files to
`.js`: rejected per above (repo-wide blast radius). Leaving migrated files as `.js`
with no `"type"` field: rejected — Node would interpret them as CommonJS by
default, defeating the migration entirely.

## Consuming-tool inventory (what must be updated alongside each rename)

| File (before) | File (after) | Consumers requiring an update |
| --- | --- | --- |
| `format-staged.cjs` | `format-staged.mjs` | `.husky/prepare-commit-msg` (`node format-staged.cjs` → `node format-staged.mjs`); `package.json` `lint:root` script file list |
| `format-staged.test.cjs` | `format-staged.test.mjs` | `package.json` `test:format-staged` script |
| `commit-conventions.cjs` | `commit-conventions.json` | `commitlint.config.mjs` import path (and its own JSON-import-attribute syntax); `package.json` `lint:root` script file list |
| `commit-conventions.test.cjs` | `commit-conventions.test.mjs` | `package.json` `test:commits` script |
| `commitlint.config.cjs` | `commitlint.config.mjs` | None explicit — `commitlint` auto-discovers via cosmiconfig; only `package.json` `lint:root` script file list needs updating |
| `.cz-config.cjs` | *(deleted)* | `package.json` `config.commitizen.path` (`"cz-customizable"` → `"@commitlint/cz-commitlint"`); `config["cz-customizable"].config` entry removed; `lint:root` script file list drops it; `cz-customizable` devDependency removed, `@commitlint/cz-commitlint` + `inquirer` added |

`package.json`'s `lint:root` script (`biome lint commit-conventions.cjs
commitlint.config.cjs .cz-config.cjs commit-conventions.test.cjs format-staged.cjs
format-staged.test.cjs`) lists all six original files by name. Its updated file
list drops `.cz-config.cjs` (deleted) and renames the rest:
`biome lint commitlint.config.mjs commit-conventions.test.mjs format-staged.mjs
format-staged.test.mjs`. Whether `commit-conventions.json` also belongs in that
list depends on Biome's JSON-linting support/config in this repo — confirmed
during implementation, not a research blocker.

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
