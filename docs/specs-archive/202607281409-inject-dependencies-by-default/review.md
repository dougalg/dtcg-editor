# Code Review: Inject Dependencies by Default (full cumulative diff, Phases 1–5)

## Summary
This is a clean, disciplined execution of a large cross-cutting refactor. Every direct `fs`/`fetch`/`process.exit`/`console`/`process.env` call site named in `feature.md`'s audit has been moved behind an injected parameter with a real default, the four rewritten test files preserve their original test intent against hand-rolled mocks, `docs/project.md` accurately documents the end state, and the new ESLint rules genuinely enforce the convention — verified directly, not just by re-reading the rule text. `pnpm build`, `pnpm lint`, and `pnpm test` all pass repo-wide on a fresh, no-cache run I ran myself, and the Edge Runtime warning that a prior feature fixed does not regress. No new dependency was added. Two minor/info-level findings below (small code duplication, plus one documented scope judgment call from Phase 5 worth flagging to the human, not a defect). **Ready to merge** modulo the human being comfortable with that one flagged judgment call.

## Findings

### 🔴 Critical
None found.

### 🟠 Major
None found.

### 🟡 Minor

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [ ] | `apps/web-app/eslint.config.mjs:99-108` and `:116-125` | Duplication | The `fatal-startup-error.ts` and `init-config.ts` override blocks compute the identical `restrictedSyntax.filter(...)` predicate (removing the same two selectors) independently, so the two could silently drift apart if one is edited later without the other. | Factor the shared filtered array into one named constant (e.g. `restrictedSyntaxWithoutExitAndConsole`) and reuse it in both override blocks. |

### 🔵 Info / Suggestions

| Done | Location | Category | Problem | Suggestion |
|------|----------|----------|---------|------------|
| [ ] | `apps/web-app/eslint.config.mjs:127-142` | Scope note | Phase 5 added a `no-restricted-imports: "off"` exemption for `app/api/tokens/route.test.ts` / `app/api/tokens/*/route.test.ts` that `feature.md`/`plan.md` never named — these Route Handler integration tests still use real `mkdtemp` fixtures and direct `node:fs/promises` imports, which is out of scope for FR-07's mock-rewrite list but does mean AC-01's literal "sole non-adapter-external import point" wording is technically not true repo-wide (it's true for every *default-parameter* injection point, which is what AC-01 actually cares about). The in-file comment explains the reasoning clearly and I found the reasoning sound on independent review, but since it's a file-inventory correction the implementer made mid-Phase-5 rather than something `feature.md` explicitly scoped, it's worth a human skim rather than treating it as automatically settled. |

## Independent Verification Performed
I did not just trust the phase implementation reports — the following were checked directly in this session:
- Read every changed/new source file in full: `node-fs.ts`, `read.ts`, `scan.ts`, `write.ts`, `config.ts`, `init-config.ts`, `instrumentation.ts`, `fatal-startup-error.ts`, `useSaveTokenEdits.ts`, both `eslint.config.mjs` files.
- Read every rewritten/new test file in full: `read.test.ts`, `scan.test.ts`, `write.test.ts`, `config.test.ts`, `init-config.test.ts`, `instrumentation.test.ts`, `useSaveTokenEdits.test.tsx` — compared each rewritten scenario against the intent described in `plan.md`/`feature.md`'s Non-Functional Requirement (same success/failure branches preserved, just via mocks).
- Ran `pnpm install`, then `pnpm lint --force`, `pnpm test --force`, and `pnpm build --force` (with `.next` deleted first) myself, repo-wide, from a clean cache — all green (10/10 lint tasks, 10/10 test tasks incl. 81 web-app tests, 5/5 build tasks).
- Grepped the full `.next` build log for "edge"/"warn" — confirmed **no** Edge Runtime warning is emitted for `instrumentation.ts` (only an unrelated pre-existing Node-engine-version advisory warning from pnpm, unrelated to this feature).
- Grepped all of `apps/web-app` for `console.*`, `process.exit`, `process.env`, bare `fetch(`, and `node:fs`/`node:fs/promises` imports to confirm every call site is inside a designated/exempted file — no orphaned direct call sites found.
- **Directly tested AC-09's claim that the lint rules bite**: wrote a throwaway probe file (`apps/web-app/lib/tmp-lint-probe.ts`) containing one violation of each of the 9 restricted-syntax/imports/globals selectors, ran `eslint` on it, confirmed all 9 fired with the expected rule IDs and messages, then deleted the probe file and confirmed `git status` was clean again. This was not in the phase reports — I generated and ran this check myself rather than trusting a "lint passes" claim.
- Confirmed the `setTimeout(..., 10)` polling helper in `init-config.test.ts` predates this refactor (present in the same file back at commit `e282094`, before Phase 1) — not a regression introduced by this work, matches `feature.md`'s own audit note about this exact call site.
- Confirmed zero `package.json` files changed anywhere in the repo across the full `df7f420..HEAD` diff (AC-12).
- Grepped the full diff for `: any`, `as any`, and non-null-assertion (`!`) introductions — none found in any changed/new file (TypeScript Strictness constraint upheld).
- Re-read `docs/project.md`'s new "Dependency Injection for I/O/Platform Externalities" subsection end-to-end against the actual post-refactor file layout — every named file/function/adapter point matches what's actually in the code; the Tech Stack Testing line and the 2026-07-25 Route-Handler-split Architecture Decision row are both updated as `plan.md` specified.
- Read `route.ts`'s `GET`/`PATCH` call sites to confirm they still call `readAndParseTokenFile`/`writeAndSerializeTokenFile` positionally with no 4th/5th argument, relying on the new defaults — confirmed no edit was needed there, as Phase 2's plan predicted.

Nothing in this review relied solely on the phase implementation reports' self-description — every AC below was independently re-derived from the code/tests/tool output.

## Acceptance Criteria Coverage
| AC | Test / Verification | Status |
|----|--------------------|--------|
| AC-01: `node-fs.ts` is sole adapter import point | Grep of `apps/web-app` for `node:fs`/`node:fs/promises`; only `node-fs.ts` (real adapter) and two Route Handler *integration test* files (real-fixture, out of FR-07 scope, explicitly exempted with rationale) | ✅ Covered (see Info finding above re: the test-file carve-out) |
| AC-02: `read/scan/write/config.ts` inject fs, no direct call outside default wiring | Read all four files; grepped for `node:fs` — none found | ✅ Covered |
| AC-03: `init-config.ts`'s `runInitConfig` has no direct fs call | Read `init-config.ts`; `runInitConfig` only calls `io.existsSync`/`io.writeFileSync`; `main()` supplies real defaults | ✅ Covered |
| AC-04: `write.test.ts` exists, mocked fs, success + failure paths | Read `write.test.ts` — 3 tests: success, write-failure→`UnknownError`, path-traversal (mock never called) | ✅ Covered |
| AC-05: `instrumentation.ts` split + `instrumentation.test.ts` exercises core without touching real process/env | Read both files; `runRegister` tested with 3 fake-deps scenarios, `register()` untested by design (matches `PATCH`/`main()` precedent) | ✅ Covered |
| AC-06: `useSaveTokenEdits` injects fetch, no direct global `fetch` call outside its default | Read hook; grepped repo for bare `fetch(` — zero direct calls found | ✅ Covered |
| AC-07: `read/scan/config/init-config.test.ts` no longer use `mkdtemp`/real temp dir | Grepped all four files for `mkdtemp`/`tmpdir` — no matches | ✅ Covered |
| AC-08: `useSaveTokenEdits.test.tsx` no longer uses `vi.stubGlobal` | Grepped file — no matches; confirmed mock passed as 2nd hook argument instead | ✅ Covered |
| AC-09: ESLint rules produce a lint failure on a deliberate violation, pass on legitimate code | Directly authored and ran a 9-violation probe file myself; all 9 selectors fired with correct messages; `pnpm lint --force` clean on real code | ✅ Covered (directly verified, not just trusted) |
| AC-10: `docs/project.md` has the new convention subsection, Tech Stack update, Architecture Decisions row update | Read the full new subsection + surrounding sections; cross-checked every named file against the actual repo layout | ✅ Covered |
| AC-11: `pnpm build`/`lint`/`test` all pass repo-wide | Ran all three myself with `--force` (no cache), `.next` deleted first | ✅ Covered (directly verified) |
| AC-12: No new npm dependency added | `git diff df7f420..HEAD --name-only -- '**/package.json'` → 0 files | ✅ Covered |

All 12 ACs were independently verified in this session — none were accepted purely on the strength of the phase reports.

## Verdict
- [x] ✅ Ready to merge
