# Implementation Plan: CLI to Bootstrap `dtcg-editor.config.json`

## Overview
Add `apps/web-app/scripts/init-config.ts`, a zero-build Node script (run directly via `node scripts/init-config.ts`, wired to `pnpm --filter web-app run init-config`) that interactively or flag-drivenly collects a `tokensDir` value, validates it against the exported `ConfigFileSchema` from `apps/web-app/lib/config.ts`, and writes `dtcg-editor.config.json` to `process.cwd()`. All I/O (argv, cwd, stdin/stdout streams, TTY-ness) is passed into one exported, injectable core function so the test file can drive every branch — including interactive re-prompting — without spawning a child process or touching the real `process.stdin`. The only production-code change to `config.ts` is making `ConfigFileSchema` `export const` instead of module-private; the schema's fields and validation rules are untouched. `engines.node` and CI's Node version are bumped to `26.5.0`/`"26"` so the script's native TypeScript execution needs no flags.

## Architecture Decisions
- **Injectable-core / thin-wrapper split**, mirroring the existing Route Handler precedent in `docs/project.md` ("splits its logic into a separately-exported, injectable function that the exported handler wraps"): `runInitConfig(io: InitConfigIO): Promise<Result<string, string>>` contains 100% of the behavior; a `main()` function plus an ESM "run only if executed directly" guard is the only code that touches real `process.argv`/`process.stdin`/`process.stdout`/`process.exit`. This is what makes AC-09's five interactive/re-prompt/existing-file scenarios testable via Vitest directly, matching this repo's existing test style (no child-process spawning, no new test-only dependency).
- **Result type kept minimal per FR-07**: `Result<string, string>` (success message / error message), not a new named error class — feature.md's Technical Scope explicitly says no new error type is needed since the CLI only prints-and-exits. `fromThrowable` wraps `writeFileSync` at the point it's called, matching `config.ts`'s own pattern.
- **`node:util`'s built-in `parseArgs`** is used for flag parsing (`--tokens-dir`, `--force`/`-f`, `--help`/`-h`) instead of hand-rolling a switch/loop over `argv`. This is a Node built-in (no `package.json` entry, no Minimal Dependencies sign-off needed — that constraint governs third-party packages) and is a better fit than hand-rolling per the "built-ins are the default" bias. **Flagging this as a non-blocking implementation-detail choice** for optional sign-off, since feature.md's Integration Points list only named `readline/promises`/`fs`/`path` explicitly and didn't anticipate `node:util`.
- **Existing-file check happens before the `tokensDir` prompt**, not after. feature.md's FR-06 doesn't order this explicitly; checking first avoids asking the user for a path when the answer is about to be discarded on decline. Flagged as a non-blocking implementation-detail call.
- **ESM main-module detection** uses `import.meta.url === pathToFileURL(process.argv[1]).href` (Node's documented idiom), not a bare string comparison, for correctness across path/URL encoding edge cases.
- **No shared test-utils file**: the test file duplicates a small local `withTempDir` helper identical in spirit to `config.test.ts`'s, following this repo's existing precedent (each test file owns its helpers; no shared `test/` infrastructure exists yet).

## Implementation Steps

### Step 1: Export the shared schema
- [x] `apps/web-app/lib/config.ts`: change `const ConfigFileSchema = ...` to `export const ConfigFileSchema = ...`. No other change to the schema or `loadConfig`/`getConfig`/error types.
- Files: `apps/web-app/lib/config.ts`

### Step 2: CLI core logic and entrypoint
- [x] Create `apps/web-app/scripts/init-config.ts`:
  - `export interface InitConfigIO { argv: string[]; cwd: string; input: NodeJS.ReadableStream; output: NodeJS.WritableStream; isTTY: boolean }`
  - `export async function runInitConfig(io: InitConfigIO): Promise<Result<string, string>>`:
    1. Parse `io.argv` with `node:util`'s `parseArgs` (`strict: true`; options: `tokens-dir` (string), `force`/`f` (boolean), `help`/`h` (boolean)); a parse error returns `err(...)`.
    2. `--help`/`-h` → return `ok(<usage text listing --tokens-dir, --force, --help with one example of each mode>)` immediately, before any file I/O.
    3. `flagDriven = tokens-dir flag is present`. If not flag-driven and `!io.isTTY` → `err("tokensDir not provided and stdin is not a TTY; pass --tokens-dir <path> instead.")`.
    4. `configPath = join(io.cwd, "dtcg-editor.config.json")`; if it exists (`existsSync`):
       - flag-driven without `--force` → `err(...)` naming `configPath`, no write.
       - interactive → prompt `A config file already exists at <configPath>. Overwrite? (y/N)` (default N) via a lazily-created `readline/promises` interface over `io.input`/`io.output`; declining → `ok("No changes made.")`, no write.
    5. Collect `tokensDir`:
       - flag-driven: the flag's value, validated once via `ConfigFileSchema.safeParse({ tokensDir })`; failure → `err(<joined Zod issue messages>)`, no write.
       - interactive: loop `question("Path to your DTCG token files: ")` → `safeParse`; on failure, write the issue message(s) to `io.output` and re-prompt (does not exit); on success, break.
    6. Non-fatal warning: if the resolved `tokensDir` doesn't exist on disk, write a warning line to `io.output` (does not block, does not affect the returned `Result`).
    7. Write the file: `JSON.stringify({ tokensDir }, null, 2) + "\n"`, via `fromThrowable(() => writeFileSync(configPath, content, "utf-8"), (cause) => describeCause(cause))()`. On success → `ok(\`Wrote ${configPath}\`)`.
    8. Always close the readline interface (if one was created) in a `finally`, regardless of which branch returned.
  - `async function main(): Promise<void>` — calls `runInitConfig` with real `process.argv.slice(2)`/`process.cwd()`/`process.stdin`/`process.stdout`/`process.stdin.isTTY === true`; on `Err` → `console.error(result.error)` + `process.exit(1)`; on `Ok` → `console.log(result.value)` + `process.exit(0)`.
  - Run-if-main guard: `if (import.meta.url === pathToFileURL(process.argv[1]).href) { void main(); }`.
- Files: `apps/web-app/scripts/init-config.ts`

### Step 3: Wire the script
- [x] `apps/web-app/package.json`: add `"init-config": "node scripts/init-config.ts"` to `scripts`.
- Files: `apps/web-app/package.json`

### Step 4: Node engine bump
- [x] Root `package.json`: `engines.node` from `">=20"` to `">=26.5.0"`.
- [x] `.github/workflows/ci.yml`: both `actions/setup-node` steps' `node-version` from `"22"` to `"26"`.
- Files: `package.json` (root), `.github/workflows/ci.yml`

### Step 5: Tests
- [x] Create `apps/web-app/scripts/init-config.test.ts` (Vitest, `node:assert/strict`, local `withTempDir` helper per `config.test.ts` precedent). Streams: a `node:stream` `Readable`/`PassThrough` pair stood up per test, with interactive-mode answers pushed as `"<answer>\n"` before/while `runInitConfig` awaits them; `isTTY` is forced via the `InitConfigIO` field, not real `process.stdin`.
  - [ ] Flag-driven write succeeds; asserts the file's exact JSON content **and** that `loadConfig(tempDir)` from `lib/config.ts` subsequently succeeds (covers AC-06 automatically, not just manually).
  - [ ] Interactive write succeeds (single valid answer, no existing file).
  - [ ] Interactive mode re-prompts on an invalid (empty-string) answer, then succeeds on a valid second answer; asserts the Zod issue message appears in the captured output before the retry.
  - [ ] Flag-driven mode rejects an invalid (empty-string) `--tokens-dir`, returns `Err`, and does not write a file.
  - [ ] Interactive mode declines to overwrite an existing config file by default (`n`/empty answer); asserts `Ok` and the original file byte-for-byte unchanged.
  - [ ] Flag-driven mode refuses to overwrite an existing config file without `--force`, returns `Err`, and leaves the file unchanged.
  - [ ] Flag-driven `--force` overwrites an existing config file with the new value.
  - [ ] `--help`/`-h` returns `Ok` containing usage text mentioning `--tokens-dir`, `--force`, and `--help`, and does not write a file.
  - [ ] Omitting `--tokens-dir` with `isTTY: false` returns `Err` without prompting.
  - [ ] (Nicety) A `tokensDir` that doesn't exist on disk still succeeds but produces a warning in the captured output.
- Files: `apps/web-app/scripts/init-config.test.ts`

### Step 6: Docs
- [x] `README.md` (currently 2 lines): add a short "Getting Started" section pointing new users at `pnpm --filter web-app run init-config` instead of hand-writing `dtcg-editor.config.json`. `CONTRIBUTING.md` is scoped to commit-message conventions only and is not touched — no natural home there for this.
- Files: `README.md`

### Step 7: Verification
- [x] `pnpm build`, `pnpm lint`, `pnpm test` (Turborepo, root) all pass with the new script and test file included. (Note: verified against local Node v24.13.0, not v26.5.0 — Node 26.5.0 was not available in the implementation environment; `engines.node` is advisory in this repo, not `engine-strict`, and CI itself is bumped to Node 26 as the real gate — see plan's Risks & Mitigations.)
- [x] Manual sanity check: ran `node scripts/init-config.ts` directly in a scratch directory (equivalent to `pnpm --filter web-app run init-config`), both interactively (via a real pty) and with `--tokens-dir`, confirming AC-01/AC-02/AC-04/AC-05 by hand once.

## Acceptance Criteria Mapping
| AC | Verified By |
|----|-------------|
| AC-01 | `init-config.test.ts` — "Interactive write succeeds" |
| AC-02 | `init-config.test.ts` — "Flag-driven write succeeds" |
| AC-03 | `init-config.test.ts` — "re-prompts on invalid answer" (interactive) + "rejects invalid --tokens-dir" (flag-driven) |
| AC-04 | `init-config.test.ts` — "declines to overwrite" (interactive) + "refuses to overwrite without --force" (flag-driven) |
| AC-05 | `init-config.test.ts` — "--help returns usage, does not write" |
| AC-06 | `init-config.test.ts`'s flag-driven-write test asserting `loadConfig()` succeeds on the written file, plus the Step 7 manual check |
| AC-07 | Step 3/Step 4 diff review — no new `dependencies`/`devDependencies` entries in `apps/web-app/package.json` |
| AC-08 | Step 7 — `pnpm build`/`lint`/`test` |
| AC-09 | `init-config.test.ts` in full (Step 5) |
| AC-10 | Step 4 diff review — root `package.json` `engines.node` and `ci.yml`'s two `node-version` fields |

## Risks & Mitigations
- **Risk**: a readline interface left open hangs the process or leaks in tests. **Mitigation**: interface is created lazily only when a prompt is actually needed and always closed in a `finally` covering every return path of `runInitConfig`.
- **Risk**: `node:util`'s `parseArgs` (`strict: true`) throws on any unrecognized flag, which is stricter than a hand-rolled parser. **Mitigation**: wrapped in try/catch, surfaced as a normal `Err` with the thrown message — same failure shape as every other validation error, no special-casing needed at the call site.
- **Risk**: bumping `engines.node` to `>=26.5.0` could be stricter than contributors' local Node versions (this worktree's own `node --version` is currently v24.13.0). **Mitigation**: `engines` is advisory (a warning, not a hard install-time block, since no `engine-strict` setting exists in this repo's `.npmrc`/pnpm config); CI is the actual gate and is bumped to Node 26 in the same change, so CI enforces the floor even if a contributor's local Node is older. Confirmed via feature.md's RD-4 as an explicit, resolved decision, not an open question.
- **Risk**: simulating an interactive terminal via injected streams in tests could mask real-TTY-only behavior (e.g. actual terminal echo/backspace handling) that `readline/promises` handles differently against a real TTY vs. a plain stream. **Mitigation**: out of scope — the feature's own FR-03 only requires a plain `question()`-based text prompt, no raw-mode/keypress handling, so stream-level testing is representative of the actual code path exercised.

## Estimated Complexity
**Low.** One new ~150-200 line script, one one-line `export` change to existing code, two version-bump lines (root `package.json` + `ci.yml`), and a co-located test file exercising it end-to-end via dependency injection — no new package, no schema change, no change to any existing runtime behavior (`loadConfig`/`getConfig`/`instrumentation.ts` are untouched).
