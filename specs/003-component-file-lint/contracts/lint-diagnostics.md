# Contract: `check-component-structure` CLI Output

This is the interface `check-component-structure.cjs` exposes to the rest of the lint pipeline (`pnpm lint`, CI) and to a contributor reading its output. It has no network/API surface — its "contract" is its process exit code and stdout/stderr format, since other tooling (Turborepo, CI log parsing, a human reading a failed PR check) depends on both.

## Invocation

```sh
node check-component-structure.cjs
```

Run with no arguments; it scans the whole repository from the root it's invoked at (mirroring `commit-conventions.cjs`/`format-staged.cjs`, which also take no CLI flags). Wired into `pnpm lint` via `turbo.json`'s `"//#lint:component-structure"` task, so it does not need its own separate CI step.

## Exit code

- `0` — no violations found (FR-012's "zero violations" state).
- `1` — one or more violations found. Turborepo/CI treats any non-zero exit from a `lint`-task-listed script as a failed `pnpm lint` run, same as an existing Biome failure.

## Success output (stdout)

```text
✔ check-component-structure: 28 component files checked, no violations found.
```

## Failure output (stdout, one block per violation, per FR-007)

```text
✖ apps/web-app/components/saveButton.tsx
  pascal-case-filename: filename must be PascalCase (expected "SaveButton.tsx")

✖ apps/web-app/components/SaveButton.tsx
  folder-placement: component files must live in their own folder (expected "SaveButton/SaveButton.tsx")

✖ packages/design-system/src/components/ui/badge/Badge.tsx
  folder-name-mismatch: folder "badge" does not match component name "Badge" (expected folder "Badge")

✖ apps/web-app/components/Modal.tsx
  multiple-unrelated-components: file exports "Modal" and "Tooltip", which do not share a common
  primary-component name prefix — split into separate component files/folders

check-component-structure: 4 violations found in 3 files.
```

Each violation block:
1. Starts with `✖ <repo-relative path>`.
2. One indented line per rule broken in that file: `<rule>: <message>` — `<rule>` is one of the `Violation.rule` enum values from `data-model.md` (`pascal-case-filename`, `folder-placement`, `folder-name-mismatch`, `multiple-unrelated-components`).
3. A final summary line with the total violation and file counts.

This mirrors Biome's own diagnostic shape (file path header, indented rule detail, summary line) so a contributor reading `pnpm lint` output sees a consistent style across both checks, even though this script itself does not depend on or invoke Biome directly.
