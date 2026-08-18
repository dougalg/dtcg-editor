# Contract: `ls-lint` CLI Output

This is the interface `ls-lint` exposes to the rest of the lint pipeline (`pnpm lint`, CI) and to a contributor reading its output. Its exact diagnostic text is owned by the `@ls-lint/ls-lint` package, not this repository — this contract documents the parts other tooling and contributors depend on, confirmed against `ls-lint`'s own documentation; the literal message format should be spot-checked against the installed version during implementation (a `/speckit-tasks` task) rather than assumed to match verbatim.

## Invocation

```sh
pnpm lint:filenames
# equivalent to: ls-lint
```

Run with no arguments; `ls-lint` auto-discovers `.ls-lint.yml` at the repository root and scans every path its `ls:` glob keys match. Wired into `pnpm lint` via `turbo.json`'s `"//#lint:filenames"` task — listed alongside `"//#lint:root"` in the `"lint"` task's `dependsOn`, so Turborepo runs both root-level checks in parallel with each other under the single `pnpm lint`/`turbo run lint` invocation. It is never invoked as a standalone command in CI, only through that turbo task.

## Exit code

- `0` — no violations found (the FR-012 "zero violations" state).
- Non-zero — one or more violations found. Turborepo/CI treats any non-zero exit from a `lint`-task-listed script as a failed `pnpm lint` run, same as an existing Biome failure.

## Diagnostic content (per FR-007)

`ls-lint` reports, per violation: the offending path, and which configured rule it failed to match (e.g. the `PascalCase` case rule, or the `regex:${0}` folder-name-match rule, or the `exists:1` count rule) — sufficient to satisfy FR-007's requirement that a violation identify the offending file/folder and which specific rule was broken, since each `.ls-lint.yml` rule maps 1:1 to one of this feature's FRs (see `data-model.md`'s mapping table). This applies equally to the component rules (FR-001–FR-003, apps/web-app/components + packages/design-system/src/components/ui) and the hooks/lib naming rules (FR-013–FR-014, apps/web-app/hooks + apps/web-app/lib) — same tool, same config file, same diagnostic shape, just different path globs and case rules. The exact wording/formatting of that output is `ls-lint`'s own and is not re-specified here.

## Consuming this contract

A contributor or CI log reader distinguishes "this feature's check failed" from "Biome failed" by which of the two parallel `pnpm lint` sub-tasks (`//#lint:root` vs `//#lint:filenames`) reported the failure — Turborepo's own task-labeled log output (not something this feature needs to add) already does this for every task in the graph.
