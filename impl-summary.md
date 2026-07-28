## Implementation Complete

### Files Created
- `apps/web-app/lib/tokens/save-error.ts` — shared `SaveError` discriminated union
- `apps/web-app/hooks/useSaveTokenEdits.ts` — Client Component hook, reference implementation of the hook-state convention
- `apps/web-app/hooks/useSaveTokenEdits.test.tsx` — 7 tests covering success, all four `kind`s, network failure, malformed body
- `apps/web-app/app/tokens/[...path]/describe-error.ts` — `describePageError`, exhaustive named-error branching
- `apps/web-app/app/tokens/[...path]/describe-error.test.ts` — 4 tests, one per branch
- `apps/web-app/app/error.tsx` — root error boundary
- `apps/web-app/app/error.test.tsx` — 3 tests (fallback render, reset callback, logger call)

### Files Modified
- `apps/web-app/app/api/tokens/[...path]/route.ts` — added `errorResponse` helper; every error JSON body now carries an additive `kind` field
- `apps/web-app/app/api/tokens/[...path]/route.test.ts` — added `kind` assertions to existing status-code test cases
- `apps/web-app/app/tokens/[...path]/page.tsx` — uses `describePageError` instead of inline ternary; `FileNotFoundError` now gets its own message
- `apps/web-app/components/TokenTree.tsx` — refactored to a thin wrapper around `useSaveTokenEdits`; `"saving"` → `"pending"` state rename; added `describeSaveError`
- `apps/web-app/components/TokenTree.test.tsx` — updated mocked failure response body to the new `{ kind, message }` shape
- `docs/project.md` — Error Handling constraint's deferral sentence replaced with the UI-Layer Result Consumption subsection

### Acceptance Criteria
- [x] AC-01: Passed — `describe-error.test.ts` (`FileNotFoundError` branch returns its own message, not the generic fallback)
- [x] AC-02: Passed — `describe-error.test.ts` (all four branches: `PathTraversalError`, `FileNotFoundError`, `TokenParseError`, `UnknownError` fallback)
- [x] AC-03: Passed — `docs/project.md` diff; deferral sentence removed, FR-02/FR-03/FR-04 subsection added (code review, no automated test for prose)
- [x] AC-04: Passed — `TokenTree.test.tsx` (4 tests), `route.test.ts` (14 tests), all green
- [x] AC-05: Passed — `git status` confirms diff is `apps/web-app` + `docs/project.md` only, no `packages/*` changes
- [x] AC-06: Passed — `useSaveTokenEdits.ts` exists with `SaveError`-shaped state; `TokenTree.tsx` calls it via `save()`
- [x] AC-07: Passed — `app/error.tsx` is a Client Component, generic fallback with `role="alert"` + reset button; `error.test.tsx` asserts `consoleLogger.error` called once
- [x] AC-08: Passed — `route.test.ts` asserts `kind` on every GET/PATCH error status (400/404/422/500)
- [x] AC-09: Passed — `useSaveTokenEdits.test.tsx` confirms `parseSaveError` reads `body.kind` directly; `status` only used for the fallback message text

### Verification
- `pnpm build` — clean (tsc + `next build`); pre-existing `instrumentation.ts` Edge Runtime warning is unrelated to this feature
- `pnpm lint` — no violations
- `pnpm test` — all packages pass; `apps/web-app`: 11 test files, 64 tests passed (up from 53 before this feature)

### Notes
No deviations from plan.md. The two flagged-for-optional-sign-off judgment calls (`"saving"` → `"pending"` rename, hand-rolled type guard vs. Zod for `parseSaveError`) were implemented exactly as plan.md specified, per the dispatch instructions treating plan.md's resolution as final and non-blocking.
