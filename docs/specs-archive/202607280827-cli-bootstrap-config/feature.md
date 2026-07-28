# Feature: CLI to Bootstrap `dtcg-editor.config.json`

## Summary

A new command-line tool scaffolds `dtcg-editor.config.json` for a new user of the web app, replacing hand-written JSON with a guided or scriptable flow. It supports both an interactive wizard (prompts for `tokensDir`, confirms before writing) and a flag-driven non-interactive mode (`--tokens-dir <path>`, `--force`) for scripted/CI use. Both modes validate the resulting config against `ConfigFileSchema` — the exact same Zod schema `apps/web-app/lib/config.ts`'s `loadConfig()` uses at startup (per `instrumentation.ts`'s `register()` hook) — so a config the CLI accepts is guaranteed to also pass the app's own startup validation, and the two never drift apart. `ConfigFileSchema` currently validates only `tokensDir: z.string().min(1)`, and today is a module-private `const` in `config.ts`; this feature exports it (no schema changes) so the CLI can import and reuse it rather than duplicating validation logic — directly serving the backlog item's explicit requirement.

This is authoring-time tooling only: it does not change `loadConfig`/`getConfig`/`instrumentation.ts`'s runtime startup-validation behavior, only makes it easier to produce a config file that satisfies that validation.

## User Stories

- As a new user setting up `dtcg-editor`, I want a guided prompt that asks where my token files live and writes a valid `dtcg-editor.config.json` for me, so I don't have to hand-write JSON or guess the schema's exact shape.
- As a user scripting an install (e.g. in a setup script or CI), I want a non-interactive flag-driven mode (`--tokens-dir <path>`) that writes the same config file without any prompts, so bootstrapping can be automated.
- As a maintainer, I want the CLI's validation to be the literal same Zod schema `instrumentation.ts` enforces at startup, not a hand-maintained copy, so the two can never silently drift apart as the schema evolves.
- As a user re-running the tool against a directory that already has a config file, I want to be protected from silently clobbering it (a confirmation prompt interactively, an explicit `--force` flag non-interactively), so I don't lose an existing configuration by accident.

## Functional Requirements

### FR-01: Command Invocation

The CLI is invoked as `pnpm --filter web-app run init-config` (a new `"init-config"` script in `apps/web-app/package.json`), optionally followed by flags (see FR-03). This follows the existing `pnpm --filter web-app <script>` precedent already used in this repo (e.g. `pnpm --filter web-app build && pnpm --filter web-app start`, per the Configured Token Directory Viewer feature's manual verification step) rather than introducing a new root-level Turborepo task. Confirmed — see Resolved Decisions (RD-2).

### FR-02: Script Location and Execution Mechanism

The CLI's source lives at `apps/web-app/scripts/init-config.ts`, executed directly by Node with zero build step (`"init-config": "node scripts/init-config.ts"`), matching this repo's existing convention of running TypeScript source directly via Node's native type-stripping (the same mechanism `node --test` already relies on to execute co-located `*.test.ts` files, per `docs/project.md`'s Conventions section). No `ts-node`/`tsx` dependency is introduced. Confirmed — see Resolved Decisions (RD-1).

### FR-03: Two Input Modes — Interactive and Flag-Driven

- **Interactive mode** (default, invoked with no flags): prompts the user for `tokensDir` via a plain text question (e.g. `Path to your DTCG token files:`), using Node's built-in `node:readline/promises` (`createInterface().question()`). No third-party prompt library is introduced. Confirmed — see Resolved Decisions (RD-3).
- **Flag-driven mode**: `--tokens-dir <path>` supplies the value directly and skips the prompt entirely, for scripted/non-interactive use. `--force` (alias `-f`) skips the overwrite-confirmation described in FR-06. `--help`/`-h` prints usage and exits 0 without writing anything.
- If `--tokens-dir` is omitted and stdin is not a TTY (e.g. piped/non-interactive shell), the CLI exits 1 with a clear error rather than hanging on a prompt that can never be answered.

### FR-04: Shared Schema Validation

`ConfigFileSchema` is exported from `apps/web-app/lib/config.ts` (currently module-private; no changes to the schema itself). The CLI imports this exact schema and calls `ConfigFileSchema.safeParse({ tokensDir })` on the collected value before writing:

- **Interactive mode**: on a failed parse, print the Zod issue message(s) and re-prompt (does not exit).
- **Flag-driven mode**: on a failed parse, print the Zod issue message(s) to stderr and exit 1 without writing.
- This is the only validation performed — matching exactly what `instrumentation.ts` enforces at startup today (a non-empty string), nothing stricter. The CLI does not additionally require that `tokensDir` exist on disk as a directory (the schema doesn't require this either — see Out of Scope), but as a non-blocking UX nicety, it prints a non-fatal warning (does not block writing or exit non-zero) if the resolved path doesn't currently exist, so a typo is visible without being treated as a hard error the schema itself doesn't impose.

### FR-05: Config File Written

On successful validation, the CLI writes `dtcg-editor.config.json` to `process.cwd()` (the same location `loadConfig()` reads from), pretty-printed with 2-space indentation and a trailing newline, containing exactly `{ "tokensDir": "<value>" }`. The value is stored exactly as provided (not force-resolved to an absolute path) — consistent with `loadConfig()` itself treating `tokensDir` as possibly relative and resolving it against `cwd` at load time, so a relative path stays portable across machines/checkouts.

### FR-06: Existing-File Protection

If `dtcg-editor.config.json` already exists in `process.cwd()`:

- **Interactive mode**: prompts `A config file already exists at <path>. Overwrite? (y/N)` (default no). Declining exits 0 without writing and without error.
- **Flag-driven mode**: requires `--force`; without it, exits 1 with an error naming the existing file path and does not write.

### FR-07: Fallible Operations Use the Result Pattern Internally

Per `docs/project.md`'s Error Handling constraint, the file write (`writeFileSync`) is wrapped via `neverthrow`'s `fromThrowable` at the point it's called (the same pattern `config.ts` already uses for `readFileSync`/`JSON.parse`), rather than left as a raw `try`/`catch`. The CLI's top-level entry point unwraps the final `Result` once, printing a clear error and calling `process.exit(1)` on `Err`, or a success message (including the written file's path) and `process.exit(0)` on `Ok`. This keeps the CLI consistent with the rest of the codebase's error-handling convention rather than introducing a second, ad hoc style.

### FR-08: Help / Usage Output

`--help`/`-h` prints the command's usage, available flags (`--tokens-dir`, `--force`, `--help`), and one example of each invocation mode, then exits 0.

### FR-09: `engines.node` Bumped to the Current Latest Node.js Release

Root `package.json`'s `"engines": { "node": ">=20" }` is bumped to `">=26.5.0"` — the current latest published Node.js release (`dist-tags.latest` on the npm registry as of 2026-07-28; confirmed via `npm view node dist-tags`, and it's also the newest entry in the full `versions` list) — so `apps/web-app/scripts/init-config.ts` (FR-02) can rely on Node's native `.ts` type-stripping being unflagged/default-on (available since Node 23.6, but this repo standardizes on the actual current latest release rather than that historical minimum) with no `--experimental-strip-types` flag anywhere. Only the root `package.json` declares `engines` today (confirmed — no `packages/*`/`apps/*` package sets its own), so this is a single-file change, not a per-workspace-package one. `.github/workflows/ci.yml`'s two `actions/setup-node` steps (currently `node-version: "22"`) are updated to `"26"` in the same change, so CI's own Node version is never inconsistent with what root `package.json` now declares as the floor.

## Acceptance Criteria

- [x] AC-01: Running `pnpm --filter web-app run init-config` with no flags in a TTY prompts for `tokensDir`, validates the answer against the exported `ConfigFileSchema`, and writes a valid `dtcg-editor.config.json` to the current working directory on confirmation.
- [x] AC-02: Running `pnpm --filter web-app run init-config --tokens-dir <path>` writes the config non-interactively with zero prompts, exiting 0 on success.
- [x] AC-03: An invalid `tokensDir` (empty string) is rejected using the same `ConfigFileSchema` `instrumentation.ts` uses at startup — re-prompted in interactive mode, exits 1 with the Zod issue message in flag-driven mode — with no code path that duplicates or re-implements the validation logic independently of the imported schema.
- [x] AC-04: Running the command again in a directory that already has `dtcg-editor.config.json` does not overwrite it without explicit confirmation (interactive: `y` answer; flag-driven: `--force`); declining/omitting leaves the existing file byte-for-byte unchanged.
- [x] AC-05: `--help`/`-h` prints usage and exits 0 without writing any file.
- [x] AC-06: The written file, when subsequently read by `loadConfig()` (e.g. via a follow-up integration test or manual `pnpm --filter web-app build && pnpm --filter web-app start`), parses successfully with no additional edits needed.
- [x] AC-07: No new runtime dependency is added to `apps/web-app/package.json` for this feature (uses only `node:readline/promises`, `node:fs`, `node:path`, the existing `zod` and `neverthrow`).
- [x] AC-08: `pnpm build`/`lint`/`test` (Turborepo, per Bootstrap CI) pass with the new script and its co-located test file included.
- [x] AC-09: A co-located `apps/web-app/scripts/init-config.test.ts` covers: successful interactive write, successful flag-driven write, schema-validation rejection (re-prompt vs. exit 1), existing-file protection (both modes), and `--help` output — following this repo's "tests live alongside the code they test" convention.
- [x] AC-10: Root `package.json`'s `engines.node` is `">=26.5.0"` (the current latest published Node.js release per npm's `dist-tags.latest`, confirmed at spec time), and `.github/workflows/ci.yml`'s two `actions/setup-node` steps specify `node-version: "26"`; `apps/web-app/scripts/init-config.ts` runs via plain `node scripts/init-config.ts` with no `--experimental-strip-types` flag anywhere in the script, its `package.json` entry, or CI.

## Technical Scope

### Affected Modules

- `apps/web-app/lib/config.ts` — export the existing `ConfigFileSchema` constant (no changes to the schema's fields or validation rules).
- New: `apps/web-app/scripts/init-config.ts` — the CLI entry point (argument parsing, prompt flow, validation, file write).
- New: `apps/web-app/scripts/init-config.test.ts` — co-located tests per AC-09.
- `apps/web-app/package.json` — new `"init-config"` script.
- `package.json` (root) — `engines.node` bumped from `>=20` to `>=26.5.0` (FR-09).
- `.github/workflows/ci.yml` — both `actions/setup-node` steps' `node-version` bumped from `"22"` to `"26"` (FR-09).
- Likely doc touch (non-functional): a short mention in `README.md` and/or `CONTRIBUTING.md` pointing new users at `pnpm --filter web-app run init-config` instead of hand-writing the config file — left for `/sdd-plan` to size, not itself a functional requirement of this feature.

### New Components Required

- `apps/web-app/scripts/init-config.ts` (no new package — see Resolved Decisions, RD-1).
- No new named error type: reuses `neverthrow`'s `fromThrowable`/`Result` inline in the script; no new error class is required since the CLI only needs to print-and-exit on failure rather than expose a typed error to any caller.

### Integration Points

- `apps/web-app/lib/config.ts`'s `ConfigFileSchema` (newly exported, otherwise unchanged) — the sole source of truth for validation, per the backlog item's explicit requirement.
- `zod` (already an Approved Dependency) — used transitively via the imported schema, not a new usage pattern.
- `neverthrow` (already an Approved Dependency) — `fromThrowable` for the file write, consistent with `config.ts`'s own pattern.
- `node:readline/promises`, `node:fs`, `node:path` — Node built-ins, no new dependency.

## Non-Functional Requirements

- **Performance**: N/A — a one-shot, human- or script-invoked command, not a long-running or request-time process.
- **Security**: The CLI only writes to `process.cwd()` under the invoking user's own filesystem permissions; no path-traversal concern distinct from the OS's own file permissions, since `tokensDir` is trusted operator/setup-time input (not attacker-facing web input like the API routes' path parameters). Existing-file protection (FR-06) prevents silent data loss of a pre-existing config, which is this feature's only safety-relevant behavior.
- **Node version / execution mechanism**: Running a co-located `.ts` file directly via plain `node <file>.ts` (FR-02) relies on Node's native TypeScript type-stripping. Resolved per RD-4: root `package.json`'s `engines.node` is bumped to `>=26.5.0` (the current latest published Node.js release, not just the historical `23.6` floor where stripping first became default-on), and CI's `node-version` is bumped to match (FR-09/AC-10), so the script never needs `--experimental-strip-types` anywhere.
- **Scalability**: N/A.
- **Behavioral compatibility**: Zero change to `loadConfig`/`getConfig`/`instrumentation.ts`'s existing runtime startup-validation behavior; this feature only adds a new authoring-time tool that produces input for that unchanged path.

## Out of Scope

- Any change to `loadConfig`, `getConfig`, `ConfigError`, `ConfigNotInitializedError`, or `instrumentation.ts`'s startup behavior — this feature only exports the existing `ConfigFileSchema` constant for reuse.
- Enforcing that `tokensDir` exists on disk / contains valid DTCG token files at config-write time as a hard failure — matches what `instrumentation.ts` itself enforces today (schema-only, non-empty string); a non-fatal warning is the extent of this feature's filesystem awareness (FR-04).
- A GUI/web-based config bootstrap flow inside the web app itself — CLI only, per the backlog item's wording.
- Updating/merging fields into an _existing_ config file (e.g. an `--update`/diff mode that changes one field without touching others) — this feature is scaffold/overwrite-or-abort only (FR-06), not an editor for an existing config.
- Extending `ConfigFileSchema` with new fields — the schema today validates only `tokensDir`; if it grows in the future, the CLI will need a corresponding update, but that's a separate future change, not part of this feature.
- Publishing the CLI as a standalone installable/global package (e.g. an npm `bin` entry, `npx dtcg-editor-init-config`) — `apps/web-app` is `"private": true` and not published; this is a workspace-local `pnpm` script only.

## Resolved Decisions

All four items previously raised as Open Questions in this spec's initial draft have been confirmed by the project owner. None remain open; `/sdd-plan` can proceed on the following basis:

- **RD-1 — CLI code location**: Confirmed as drafted — `apps/web-app/scripts/init-config.ts` (inside the web app, not a new `packages/*` package). Reasoning: `docs/project.md`'s Architecture section frames `packages/*` as installable libraries for tool builders/integrators embedding the core engine elsewhere, while `dtcg-editor.config.json` and `ConfigFileSchema` are specific to `apps/web-app`'s own runtime — this CLI has no reuse value outside this one app. A new `packages/cli` package was considered and rejected.

- **RD-2 — Invocation convention**: Confirmed as drafted — `pnpm --filter web-app run init-config`, a new script in `apps/web-app/package.json`. Reasoning: matches the existing `pnpm --filter web-app build`/`start` precedent already used in this repo for app-specific commands, as opposed to the root-level Turborepo `//#<task>` pattern this repo uses for repo-wide tooling (e.g. `test:commits`, `lint:root`).

- **RD-3 — Interactive-prompt dependency**: Confirmed as drafted — no new dependency; built-in `node:readline/promises` (`createInterface().question()`) handles this CLI's entire interactive surface (one text question, one yes/no confirmation), per the Minimal Dependencies constraint's default-toward-built-ins bias. A prompt library (`prompts`/`inquirer`/`@clack/prompts`) was considered and rejected as unjustified for a surface this simple.

- **RD-4 — `engines.node` / execution mechanism**: Resolved with a change from the initial draft's framing (which only flagged the gap without a number). Decision: bump root `package.json`'s `engines.node` to `">=26.5.0"` — the current latest published Node.js release, determined via `npm view node dist-tags` (`dist-tags.latest: '26.5.0'`, also the newest entry in the full `versions` list) as of 2026-07-28 — rather than only the historical `23.6` floor where native `.ts` stripping first became default-on. `.github/workflows/ci.yml`'s two `actions/setup-node` steps are bumped from `node-version: "22"` to `"26"` in the same change, so CI's Node version is never inconsistent with the new `engines.node` floor. Only root `package.json` declares `engines` today (confirmed by repo-wide search — no `packages/*`/`apps/*` package sets its own), so this is a single-file `package.json` change plus the CI workflow file. Formalized as FR-09/AC-10 above.

---

## Revision History

| Date       | Change Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-28 | Initial spec, produced unattended (no human reviewer available in this session). Three architecture/scope-affecting assumptions (CLI code location, invocation convention, interactive-prompt dependency choice) are written in as this draft's best-reasoned guess but explicitly flagged under Open Questions for confirmation before `/sdd-plan`.                                                                                                                                                                                                                                 |
| 2026-07-28 | All 4 Open Questions resolved by the project owner (see Resolved Decisions). RD-1/RD-2/RD-3 confirmed exactly as drafted. RD-4 (`engines.node`) resolved with an explicit version — root `package.json`'s `engines.node` bumped to `>=26.5.0` (current latest Node.js release per `npm view node dist-tags`) and `.github/workflows/ci.yml`'s `node-version` bumped to `"26"` — added as new FR-09/AC-10 and reflected in Technical Scope's Affected Modules and Non-Functional Requirements. "Open Questions" section replaced with "Resolved Decisions"; no open questions remain. |
