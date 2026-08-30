---
detected_at: b55f969 # short SHA the profile was detected against
ecosystems: [typescript] # one language, two test-runner stacks
default: web-app # feature 010 and all apps/web-app work use this stack
stacks:
  web-app:
    cwd: . # repo root — the aggregated vitest.config.ts lives here; projects are scoped by `root:`
    runner: vitest # v4.1.11, projects: apps/web-app:unit (jsdom), apps/web-app:a11y (real Chromium via @vitest/browser-playwright)
    single: 'pnpm exec vitest run {file} -t "{name}"'
    file: pnpm exec vitest run {file}
    suite: pnpm test # turbo run test — builds first (^build), then //#test:vitest + every package test + commitlint. Authoritative CI gate.
    suite_fast: pnpm exec vitest run # inner-loop subset: the vitest projects only. REQUIRES `pnpm build` to have run first (see notes).
    watch: pnpm exec vitest
    coverage: null # @vitest/coverage-v8 not installed (optional peer only) — see notes
    mutation: null # no StrykerJS in the lockfile — see notes
    acceptance: 'pnpm --filter @dtcg-editor/web-app exec playwright test {file}'
    property: null # fast-check not installed — see notes
    approval: null # no snapshot/approval assertions in use
    contract: null
    test_glob: "apps/web-app/**/*.test.ts(x)  |  apps/web-app/**/*.a11y.test.tsx  |  apps/web-app/e2e/**/*.spec.ts"
    exemplar:
      unit-lib: apps/web-app/lib/tokens/edit-state.test.ts # React-free lib unit; the module 010 replaces with StagedEditsStore
      unit-component: apps/web-app/components/TreeTokenNode/TreeTokenNode.test.tsx # component render/interaction unit (@testing-library/react)
      a11y: apps/web-app/components/TokenBlock/TokenBlock.a11y.test.tsx # browser-mode axe-core WCAG 2.2 AA check
      acceptance: apps/web-app/e2e/keyboard-navigation.spec.ts # Playwright keyboard/focus flow, prod build
      acceptance-perf: apps/web-app/e2e/color-editor-perf.spec.ts # Playwright timing guard via performance.now() + testInfo perf annotation
    helpers:
      - apps/web-app/vitest.setup.ts # per-package setup: imports design-system tokens.css, @testing-library/react cleanup() in afterEach
      - vitest.a11y-setup.ts # prepended to a11y projects: loads base.css + component CSS so browser-mode tests measure the real cascade
      - apps/web-app/lib/a11y/wcag-tags.ts # WCAG_22_AA_TAGS — the 4 axe tags to request together for full AA coverage
      - apps/web-app/e2e/support/axe.ts # runAxe(page) — inject axe-core into a Playwright page, scoped to WCAG_22_AA_TAGS
      - apps/web-app/e2e/support/global-setup.ts # Playwright globalSetup: one prod build before the 3 fixture servers start
      - apps/web-app/e2e/fixtures/ # e2e-owned token fixture sets (tokens/, token-references/, inferred-type-tokens/)
  node-packages:
    cwd: packages/<pkg> # run from the package dir; or pass a root-relative path as {file}
    runner: node:test # node --test, native TS type-stripping (Node 26)
    single: 'node --test --test-name-pattern "{name}" {file}'
    file: node --test {file}
    suite: 'pnpm --filter @dtcg-editor/<pkg> test' # e.g. `node --test src/*.test.ts` (token-editor-color: `src/**/*.test.ts`)
    watch: null # not configured
    coverage: null
    mutation: null
    property: null
    approval: null
    contract: null
    test_glob: "packages/*/src/**/*.test.ts"
    exemplar:
      unit: packages/token-core/src/classify-value.test.ts # node:test + node:assert/strict, one top-level test() per behavior
    helpers: [] # none — these suites build objects inline or with local factory helpers per file
verified: [single, file, suite, suite_fast, acceptance] # each executed successfully at b55f969 (see log below)
suite_baseline: green # 491 vitest tests + node:test packages all pass
suite_seconds: 30 # vitest projects only (suite_fast); ~25–35s observed. `pnpm test` (full CI gate) is several minutes.
---

# TDD Stack Profile

Two stacks. **`web-app` is the one that matters for feature 010** (fast, seamless
editing) and for anything else under `apps/web-app`. `node-packages` is recorded
for completeness because `/speckit.tdd.*` is repo-wide, but 010 does not touch
`packages/*` source.

## Conventions to match — `web-app`

- **Test file placement.** Unit and a11y tests sit next to the source in the same
  folder: `components/Foo/Foo.tsx` + `Foo.test.tsx` + `Foo.a11y.test.tsx`;
  `lib/tokens/thing.ts` + `thing.test.ts`. Playwright specs live in
  `apps/web-app/e2e/` as `*.spec.ts` (not `*.test.ts`).
- **File naming (enforced by `@ls-lint/ls-lint` under `pnpm lint`).** `components/`
  is PascalCase in a matching folder; `hooks/` is camelCase; `lib/` (any depth) is
  kebab-case. A new React-free module under `lib/tokens/` is
  `staged-edits-store.ts` + `staged-edits-store.test.ts`.
- **One component per file** (constitution X) — a new `FieldErrorSlot` gets its own
  folder with `FieldErrorSlot.tsx`, `.test.tsx`, `.a11y.test.tsx`, `.module.css`.
- **Assertions.**
  - Unit `.test.ts` / `.test.tsx`: `import { test, expect } from "vitest"`. Some
    React-free lib tests use `import { test } from "vitest"` +
    `import assert from "node:assert/strict"` (see `edit-state.test.ts`) — either
    is accepted; match the file you're extending.
  - Doubles: `vi.fn()` from vitest. No separate mocking library.
  - Component tests: `render`, `screen`, `fireEvent` from `@testing-library/react`.
    Query by role/name (`getByRole("textbox", { name: /^blue-500 name$/i })`).
- **a11y tests (`*.a11y.test.tsx`).** Run in a real browser (Vitest Browser Mode,
  Chromium). `import axe from "axe-core"`, run
  `axe.run(container, { runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] } })`
  and assert `results.violations` is `[]`. Import `WCAG_22_AA_TAGS` from
  `lib/a11y/wcag-tags.ts` — never hand-list tags. A component with no a11y
  semantics of its own still needs an explicit a11y test asserting that.
- **Playwright specs.** `import { expect, test } from "@playwright/test"`. Run
  against the **production build** (`pnpm run start`), not `next dev` — the config
  builds once in `globalSetup` then starts three fixture servers (ports
  3100/3101/3102), each with its own `DTCG_EDITOR_TOKENS_DIR`. A spec's filename
  routes it to a project (`default` / `token-references` / `inferred-type`);
  `keyboard-navigation.spec.ts` is deliberately in two projects and branches on
  `testInfo.project.name`. For in-page a11y use `runAxe(page)` from
  `e2e/support/axe.ts`. For timing, use `performance.now()` around the action and
  push a `testInfo.annotations` entry of `type: "perf"` (see
  `color-editor-perf.spec.ts`).
- **Fixtures.** Component/lib tests build `PlainDtcgNode` trees with small local
  factory helpers defined at the top of the test file (`tokenNode()`, `tree()`,
  `referenceTree()` — see `edit-state.test.ts`, `TreeTokenNode.test.tsx`). There is
  no shared factory module; follow the local-helper pattern. E2e tests use the
  committed fixture token sets under `e2e/fixtures/`.
- **No render-count guard helper exists yet.** Plan 010 introduces a
  component-level render-count assertion as new work — there is no existing
  utility to import; build it under `apps/web-app` (a `<Profiler>` wrapper or a
  render-counting test helper) and give it its own co-located test.
- **Exemplars to imitate:** `lib/tokens/edit-state.test.ts` (React-free lib unit),
  `components/TreeTokenNode/TreeTokenNode.test.tsx` (component unit),
  `components/TokenBlock/TokenBlock.a11y.test.tsx` (a11y), `e2e/keyboard-navigation.spec.ts`
  (acceptance flow), `e2e/color-editor-perf.spec.ts` (acceptance timing guard).

## Conventions to match — `node-packages`

- `import { test } from "node:test"` + `import assert from "node:assert/strict"`.
  One top-level `test("<behavior>", () => { … })` per behavior, no `describe`
  nesting. Objects are built inline or with a local factory function per file.
- Exemplar: `packages/token-core/src/classify-value.test.ts`.

## Notes and constraints

### `pnpm build` is a prerequisite for the `web-app` vitest suite

`apps/web-app`'s tests import `@dtcg-editor/design-system/styles/tokens.css`,
`@dtcg-editor/token-core`, `@dtcg-editor/token-editor-*` — all of which resolve to
each package's `dist/` via its `exports` map. A fresh worktree, or a change to a
`packages/*` source file without a rebuild, makes bare `pnpm exec vitest run` fail
every affected file with a **Vite import-resolution error** ("Failed to resolve
import … Does the file exist?") — a false red, not a test failure. This was
observed at detection: the first `vitest run` reported 86 failed files until
`pnpm build` was run, after which all 107 files / 491 tests passed.

- `pnpm test` handles this itself (turbo `^build`).
- For the inner loop, run `pnpm build` **once** before starting (turbo caches it;
  a no-op rebuild is ~1s). Re-run it only if you edit a file under `packages/`.
  Working purely in `apps/web-app` (010's scope), one build up front stays valid.
- `pnpm --filter @dtcg-editor/web-app generate:icons` writes
  `apps/web-app/assets/generated/*.ts` (imported by app code). Already generated;
  only re-run if the icon set changes. `pnpm test` / `pnpm test:vitest` run it
  automatically.

### Suite timing

- `suite_fast` (`pnpm exec vitest run`, the vitest projects only): ~25–35s
  observed across three runs (14s of actual test execution; the rest is the
  real-Chromium a11y projects' browser startup). Per-cycle full runs of this are
  fine.
- `pnpm test` (the full CI gate: build + vitest + every `node:test` package +
  commitlint + format:check via turbo): **several minutes**, and turbo-cached
  between unchanged runs. Run it before committing, not per cycle.
- Playwright (`acceptance`): one spec took 12s including the `globalSetup`
  production build and server start. A full `playwright test` run is 44 tests
  across 3 sequential fixture servers — budget 1–3 min. Run targeted specs
  (`playwright test {file}`) during the loop; full run before commit.

### Single-test command — exit-code caveat (both stacks)

The `single` command runs exactly the named test when the name matches (verified:
`vitest run <file> -t "<exact name>"` → `1 passed | 12 skipped`; `node --test
--test-name-pattern` likewise). **But a non-matching name exits 0**, not non-zero:

- vitest prints `Tests  N skipped` / `Test Files  1 skipped` and exits 0.
- `node --test` prints `pass 1` for the file with no subtests and exits 0.

Neither is silent, but the exit code alone cannot tell "my pattern is a typo" from
"green". In the red phase the loop **must read the output** and confirm the
intended test name appears as `✓`/`✗`/`failed` — never trust `$?` for red. The
`file` command has no such issue: it runs every test in the file, a missing file
is a loud `No test files found, exiting with code 1`, and a genuine red-phase
failure exits non-zero. Prefer `file` when the new test's name isn't settled yet.
(Playwright's `-g` with no match is loud — `Error: No tests found.`, non-zero
exit — so `playwright test {file} -g "{name}"` is a safe single-test form for the
acceptance layer.)

### Missing capabilities

- **Coverage — `null`.** `pnpm exec vitest run --coverage` fails with
  `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`. The optional
  peer is declared but not installed. Ecosystem default to add (user's decision,
  separate change): `@vitest/coverage-v8`. Until then, `/speckit.tdd.verify` falls
  back to trace-checking — every acceptance criterion in `spec.md` must map to a
  named test in the test list.
- **Mutation — `null`.** No StrykerJS in `pnpm-lock.yaml`. Ecosystem default:
  `@stryker-js/core` + `@stryker-js/vitest-runner`. Until then the audit uses
  deliberate-mutant spot checks on the highest-risk changed files (break the impl
  one way, confirm a test fails, restore exactly), recording which behaviors were
  sampled.
- **Property-based — `null`.** No `fast-check`. Express invariants (e.g. "editing
  one row never changes another row's rendered output") as several boundary
  example tests and note in the test list that the invariant is sampled, not
  proven.

### Known flake

The first aggregated `vitest run` at detection had one failure in
`components/TypeSuggestion/TypeSuggestion.test.tsx` ("found multiple elements" —
a `@testing-library/react` `cleanup()` race under the multi-project browser
load); it passed on the next two consecutive runs. If a single unrelated
`TypeSuggestion`/DOM-duplication failure appears, re-run once before treating it
as a real red.

### Behavioral constraints

- The suites are safe to run: no DB, no migrations, no network to live services,
  no writes outside the repo. Playwright writes `apps/web-app/.next/`,
  `playwright-report/`, `test-results/` and binds localhost ports 3100–3102.
- `apps/web-app/instrumentation.test.ts` and the `node:test` packages run via
  their own scripts, outside the root `vitest.config.ts`.
