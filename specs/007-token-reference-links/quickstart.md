# Quickstart: Validating Token Reference Preview & Navigation

## Prerequisites

```sh
pnpm install                      # this worktree starts without node_modules
pnpm --filter @dtcg-editor/token-core build
pnpm --filter @dtcg-editor/design-system build
```

Chromium is required for the Vitest Browser Mode and Playwright tiers (already a project dependency).

## Two token sets, two purposes

| Set | Path | Use |
| --- | --- | --- |
| Real design tokens | `packages/design-system/src/design-tokens` | The app's default dev target. **228 references, 200 cross-file, 50 chained, 75 multiply-defined paths, 0 broken, 0 circular.** Best for exercising the happy paths at realistic scale. |
| E2E fixtures (existing) | `apps/web-app/e2e/fixtures/tokens` | Pointed at by the original `webServer` in `playwright.config.ts`. **Contains no references at all**, and stays that way — `home.spec.ts` and `tokens-page.spec.ts` assert on its file listing. |
| E2E fixtures (this feature) | `apps/web-app/e2e/fixtures/token-references` | New directory with its **own** `webServer` on port 3101 (tasks.md T006). All reference fixtures — including the broken, circular, and unparseable ones — go here, so they cannot disturb the suites above. |

## Run it against the real token set

```sh
pnpm --filter web-app dev
```

### Scenario 1 — resolved values, and the false-error fix (US1, SC-001/SC-003)

1. Open `/tokens/cube.json`. Its tokens reference `{space.sm}`, `{space.md}`, `{space.xl}` — all defined in a *different* file. Confirm each shows the concrete dimension it resolves to.
2. Open `/tokens/dark.json`. **This is the regression that matters**: every token here has `$type: color` inherited from its group and a reference value, so today each one renders the false error *"must be a 6-digit hex string like `#rrggbb`"*. Confirm that error is gone and a resolved color is shown instead.
3. Open `/tokens/shadows.json`. `shadow.button` is a whole-value reference to `{shadow.xs}`; `shadow.xs` itself contains a **nested** reference at `color`. Confirm both resolve — the nested case is the one that whole-value-only detection would miss.
4. Open `/tokens/form-controls.json` and find `form-control.background-color` — the longest chain in the set at **3 hops**. Confirm it shows the literal at the end, not an intermediate reference.

### Scenario 2 — navigation (US2, SC-004)

1. From `cube.json`, activate a `{space.*}` reference. Expect to land on `space.json` with that token in view, focused, and visibly marked as the arrival target.
2. Collapse a group, then arrive at a token inside it via a reference. Confirm the group is opened. This is the browser's native `<details>` auto-expansion doing the work, so **check it in Chrome, Firefox, and Safari** rather than only the default browser.
3. Collapse a group, then edit a *sibling* token to force a re-render. Confirm the group stays collapsed — this catches React re-asserting `open` over the uncontrolled disclosure (research.md §5).
4. Activate a reference to a **multiply-defined** path such as `{color.text.normal}` (defined in both `colors.json` and `dark.json`). Expect a chooser listing both, labelled by file and mode, with no definition hidden.
5. Stage an edit without saving, then activate a reference to another file. Expect save / discard / stay, and confirm each option behaves correctly. Then repeat with a *same-file* reference and confirm no prompt appears.

### Scenario 3 — reverse index (US3, SC-006)

1. Open `palette.json` and find `color.alpha.black.10` — the most-referenced token in the set at **8** referrers. Confirm it reads "referenced 8 times" and lists all eight, each identifying its file.
2. Find a token referenced exactly once, then one referenced exactly twice; confirm the wording is "referenced once" and "referenced twice".
3. Find a token nothing references; confirm **no indicator at all** is rendered.
4. Activate an entry in the list and confirm it navigates back to that referencing token.

## Failure cases — fixtures required

These cannot be exercised against the real token set, which contains no broken, group-targeted, or circular references. Add fixtures under `apps/web-app/e2e/fixtures/token-references/` (its own directory and server — see tasks.md T006):

| Fixture | Asserts |
| --- | --- |
| Reference to a non-existent path | Warning naming the **missing path**; page still renders; not activatable (FR-007, FR-011a, FR-016) |
| Reference targeting a **group** | Warning naming the **group path**, with text **distinct** from the missing-target case (FR-007, FR-011a) |
| Two tokens referencing each other | Warning naming the **tokens in the cycle**; **no hang, no stack overflow** (FR-006) |
| Reference into a file that fails to parse | Surfaces as the missing-target warning, while references between the *other* files still resolve (spec Edge Cases + Assumptions — known rough edge, the real cause is not distinguished) |
| A cross-file pair | Cross-file resolution and navigation without depending on the design-system tokens |

**Check all three warnings side by side.** SC-011 requires a user to tell which of the three failure cases they are looking at, and which path is at fault, from the warning alone. Reading them in isolation will not catch two variants that happen to say nearly the same thing.

The circular fixture is the important one: cycle detection is what makes unbounded chain-following safe, so its test is a real regression guard. It must fail fast rather than hang the suite if detection regresses.

## Automated checks

```sh
pnpm --filter @dtcg-editor/token-core test   # node:test — reference syntax, chain walking, cycle detection
pnpm --filter web-app test:unit              # Vitest — index building, per-file view, components
pnpm --filter web-app test:a11y              # axe-core, component level
pnpm --filter web-app test:e2e               # Playwright — navigation + keyboard flows
pnpm --filter web-app build                  # sole type-checking gate for this repo
pnpm lint                                    # Biome + ls-lint (naming/folder rules)
```

Keyboard flow to cover in Playwright, modelled on the existing `keyboard-navigation.spec.ts`: Tab to a reference control, activate it by keyboard, confirm focus lands on the target token in the destination file, and confirm the reference-count popover opens, is navigable, and closes by keyboard.

## Performance check

SC-010's budget is **under 50 ms to build the reference index for 5,000 tokens at chain depth 5**, asserted by T021a as a hard test gate rather than eyeballed. Depth 5 describes the benchmark fixture only — the resolver follows chains without a depth cap, terminating on cycle detection.

`research.md` §2 records **1.40 ms** to parse and index this project's own 16 files, but measured with raw `JSON.parse` because the worktree had no dependencies installed at planning time. T021b replaces that with a real Zod-validated figure. The project's own set is ~565 tokens, roughly an order of magnitude inside the budget; a result anywhere near 50 ms at that size would reopen the no-cache decision.

```bash
pnpm --filter web-app test reference-index   # includes the SC-010 budget assertion
```
