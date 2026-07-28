# UI-Layer Result Consumption Conventions

Implemented on: 2026-07-28

Defines and puts into practice this repo's first UI-layer convention for consuming fallible operations, replacing `docs/project.md`'s "undefined for now" deferral for `apps/web-app`'s UI layer with a concrete, evidence-derived subsection:

- **Server Components** branch on a `ResultAsync`'s `.isOk()`/`.isErr()` and exhaustively match every named error via `instanceof` before falling back to a generic message — fixing `app/tokens/[...path]/page.tsx`'s `FileNotFoundError` gap (it previously fell into the generic `Could not load "..."` fallback alongside truly-unknown failures) by extracting the branch into a pure, unit-tested `describePageError` function.
- **Client Component hooks** wrapping a `fetch` call to a Route Handler track a status enum (`"idle" | "pending" | "error"`) plus a discriminated-union `error` field, never letting a failed request surface as a thrown exception. `useSaveTokenEdits` — extracted from `TokenTree.tsx`'s previously inline `fetch`/`useState` logic — is the reference implementation, with its own `SaveError` union (`apps/web-app/lib/tokens/save-error.ts`) shared with `route.ts`'s response body shape.
- **Error boundaries** (`app/error.tsx`, new) are scoped strictly to genuinely unexpected render-time exceptions — the UI-layer analog of `UnknownError` — never used for expected/named failures, which are always handled via the two conventions above.

`app/api/tokens/[...path]/route.ts`'s `GET`/`PATCH` error responses gained an additive `kind` discriminant (`"not-found" | "validation" | "invalid-file" | "unknown"`) so the wire body itself is `SaveError`-shaped, matching the route's existing 400/404/422/500 status-code taxonomy.

## Key files
- `apps/web-app/lib/tokens/save-error.ts` — shared `SaveError` discriminated union (route.ts + hook)
- `apps/web-app/hooks/useSaveTokenEdits.ts` — reference implementation of the Client Component hook-state convention
- `apps/web-app/app/tokens/[...path]/describe-error.ts` — `describePageError`, exhaustive named-error branching for Server Components
- `apps/web-app/app/error.tsx` — root error boundary
- `apps/web-app/app/api/tokens/[...path]/route.ts` — `mapReadErrorToResponse` shared helper (added in follow-up, see below), additive `kind` field on every error response
- `docs/project.md` — Error Handling constraint's "UI-Layer Result Consumption" subsection (replaces the prior deferral sentence)

## Notable decisions
- **`SaveError` is parsed via an `as SaveError` cast, not runtime Zod validation**, at the hook's own-app Route Handler response boundary. Raised during `sdd-review` as an open question against the Validation at the Edges constraint (is a same-codebase response a genuinely external edge?); resolved by the human as no — the wire contract is fully controlled by this feature's own two halves (`route.ts`'s `errorResponse` and the hook's parser), so a hand-rolled field-by-field type guard was simplified to a direct cast. Committed separately as `b8d63b0`.
- **`route.ts`'s duplicated named-error-to-response branching (`GET` and `PATCH` both had an identical `instanceof` chain) was extracted into a shared `mapReadErrorToResponse` helper**, also per `sdd-review` and committed in `b8d63b0`.
- **`useSaveTokenEdits` is the intended reference implementation** for any future Client Component hook wrapping a `fetch`-backed operation — each such hook defines its own analogously-shaped error union rather than reusing `SaveError` for an unrelated request.
- Implemented via commit `08722e6`, follow-up refinements via `b8d63b0`. Reviewed via `sdd-review`: verdict PASS, no Critical/Major findings, both Minor findings resolved.
