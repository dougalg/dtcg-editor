# Feature: UI-Layer Result Consumption Conventions

## Summary
`docs/project.md`'s Error Handling (Result Pattern) constraint governs engine/library code but explicitly defers UI-layer conventions ("UI-layer consumption of `Result`s (React hooks, error boundaries) is undefined for now — revisit once component code exists"). Real client-side/Server Component code now exists (the Edit Dimension Tokens in Browser feature), and it already shows two different ad hoc patterns for surfacing failures: Server Components (`app/page.tsx`, `app/tokens/[...path]/page.tsx`) branch on a `ResultAsync`'s `.isOk()`/`.isErr()` inline, while the one Client Component (`components/TokenTree.tsx`) wraps a raw `fetch` in try/catch and tracks `{ saveState, saveError }` as local state, and `lib/tokens/edit-state.ts` deliberately reaches for a plain `{ ok, value | error }` union instead of a `neverthrow` `Result` specifically because this convention didn't exist yet. This feature closes that gap: it defines and documents a repo-wide convention for how UI code (Server Components and Client Component hooks) consumes fallible operations, decides whether/how Next.js error boundaries fit in, and fixes the concrete, currently-generic `FileNotFoundError` fallback message in `app/tokens/[...path]/page.tsx`.

## User Stories
- As a developer adding a new Server Component that reads a `ResultAsync`-returning engine/lib function, I want a documented, consistent branching pattern (including how to handle every named error, not just some) so I don't have to re-derive it per page and don't accidentally leave a named error lumped into a generic fallback.
- As a developer adding a new Client Component that needs to call a Route Handler and reflect success/failure in the UI, I want a documented hook-state shape to follow (instead of ad hoc `useState` triples per component) so future data-fetching hooks are consistent with each other and with how `TokenTree.tsx` already does it.
- As a user of the web app, when I navigate to a token file that doesn't exist, I want to see a message telling me the file wasn't found, not a generic "could not load" message that also covers unrelated failure modes.

## Functional Requirements

### FR-01: Document the UI-layer convention in `docs/project.md`
Replace the Error Handling constraint's current deferral sentence ("UI-layer consumption of `Result`s ... is undefined for now — revisit once component code exists") with a concrete subsection covering:
- How Server Components consume a `ResultAsync` returned by an engine/lib function.
- How Client Component hooks consume the outcome of a `fetch` call to a Route Handler (noting that a `Result`/`ResultAsync` value itself never crosses the network — by the time a Client Component sees it, it has already been translated server-side into an HTTP status code + JSON body, per the existing pattern in `app/api/tokens/[...path]/route.ts`).
- Where/whether error boundaries (`error.tsx`) fit into that picture.

### FR-02: Server Components exhaustively branch named errors before falling back
A Server Component that branches on a `ResultAsync`'s error must match every named error type the underlying function's return type declares before falling back to a generic message — the generic fallback is reserved for `UnknownError` (and, if present, truly unhandled cases). Concretely, this fixes `apps/web-app/app/tokens/[...path]/page.tsx`, which today branches only `PathTraversalError | TokenParseError` and lumps the already-defined, already-imported-elsewhere `FileNotFoundError` (from `lib/tokens/read.ts`) into `Could not load "${relativePath}".`. The fix mirrors the 4-way branch this same function's error union already gets in `apps/web-app/app/api/tokens/[...path]/route.ts`'s `GET` handler (`PathTraversalError` → 400 message, `FileNotFoundError` → 404 message, `TokenParseError` → 422 message, else generic 500) — the page should give `FileNotFoundError` its own distinct message (e.g. `Token file not found: "${relativePath}".`, matching the error's own `.message`) instead of the generic fallback.

### FR-03: Client-side hook convention for `fetch`-backed operations
Define a standard shape for a Client Component hook that wraps a `fetch` call to a Route Handler: local state shaped as a status enum (`"idle" | "pending" | "error"`, or `"idle" | "pending" | "success" | "error"` if a distinct success state is useful) plus an `error` field, populated by branching on the HTTP response (`response.ok`, `response.status`, and the response body's `kind` discriminant — see FR-07) rather than a thrown exception — i.e., the hook never lets a failed `fetch`/non-OK response propagate as a thrown error for a caller to catch; it always unwraps into returned state, mirroring the "a caller cannot ignore the failure case without explicitly unwrapping it" spirit of the engine-layer `Result` constraint, adapted to the fact that the wire format is already a plain JSON error body by the time the client sees it (see FR-01). This is the formalized version of the pattern `TokenTree.tsx`'s inline `handleSave`/`saveState`/`saveError` already uses today.

The hook's `error` field is a discriminated union, not a plain string (see Resolved Decisions, OQ-03), so a consuming component can render distinct UI per failure kind instead of only a generic message. Named `SaveError` for `useSaveTokenEdits` specifically (any future hook defines its own analogously-shaped union for its own operation, rather than reusing `SaveError` for an unrelated request); the union's `kind` values mirror the 4-way status-code taxonomy `app/api/tokens/[...path]/route.ts` already branches on (see FR-02, FR-07) rather than inventing a new one:

```ts
type SaveError =
  | { kind: "not-found"; path: string }        // HTTP 404 — FileNotFoundError
  | { kind: "validation"; issues: string[] }   // HTTP 400 — PathTraversalError, invalid request body/edit schema, rename collision, non-editable type, invalid value
  | { kind: "invalid-file"; issues: string[] } // HTTP 422 — TokenParseError (the file itself isn't valid DTCG JSON, distinct from the edit request being invalid)
  | { kind: "unknown"; message: string };      // HTTP 500 — UnknownError / write failure
```

The hook derives `kind` from the response body's own `kind` field (FR-07) rather than re-deriving it from the HTTP status code client-side — the status code and the body's `kind` are expected to agree, but the body is the authoritative source once FR-07 lands.

### FR-04: Error boundaries reserved for unexpected failures only
Per the engine-layer split between named errors (branched/handled by the caller) and `UnknownError` (logged and surfaced, never branched on), the UI-layer convention keeps the same split: expected/named failures (a 404, a validation error, a parse error) are always handled via inline `Result` branching (FR-02) or hook state (FR-03), never by throwing and relying on an `error.tsx` boundary to catch them. A root `apps/web-app/app/error.tsx` boundary (see Resolved Decisions) exists solely as a safety net for genuinely unexpected render-time exceptions — the UI-layer analog of `UnknownError` — and logs via the existing `@dtcg-editor/errors` `consoleLogger` (confirmed dependency-free of Node built-ins, so safe to import from a Client Component) before rendering its generic fallback.

### FR-05: Extract `TokenTree.tsx`'s save flow into a `useSaveTokenEdits` hook
`TokenTree.tsx`'s inline `handleSave`/`saveState`/`saveError` logic is extracted into a `useSaveTokenEdits` (or equivalently named) hook that follows the FR-03 convention, and `TokenTree.tsx` is updated to use it instead of its current ad hoc `fetch`/`useState` implementation. This hook is the concrete reference implementation of FR-03 for future hooks to follow (see Resolved Decisions).

### FR-06: Add a root error boundary
Add `apps/web-app/app/error.tsx` as a Client Component per the Next.js App Router `error.tsx` convention, rendering a generic fallback UI with a reset action and logging the caught error via `@dtcg-editor/errors`' `consoleLogger` before rendering (see FR-04, Resolved Decisions).

### FR-07: API route error responses carry a `kind` discriminant
`apps/web-app/app/api/tokens/[...path]/route.ts`'s `GET` and `PATCH` handlers currently return `{ error: string }` (plus, for the request-body-schema-validation case, a `details` field of raw Zod issues) on every non-2xx response. Add a `kind` field to every error JSON body in both handlers, using the same 4-way taxonomy as FR-03's `SaveError` (`"not-found"` for `FileNotFoundError`/404, `"validation"` for the 400 cases — `PathTraversalError`, invalid request body, invalid edit request schema, rename collision, non-editable type, invalid value — `"invalid-file"` for `TokenParseError`/422, `"unknown"` for the 500 cases), so the response body itself is `SaveError`-shaped (`{ kind, ...kind-specific fields }`) instead of just `{ error: string }`. This is a response-body contract change (the HTTP status codes themselves are unchanged); existing consumers keying off `error`/`details` continue to receive those fields, `kind` is additive.

## Acceptance Criteria
- [x] AC-01: Navigating to `/tokens/<a path that doesn't exist>` renders a distinct file-not-found message, not the generic `Could not load "..."` fallback.
- [x] AC-02: `apps/web-app/app/tokens/[...path]/page.tsx`'s error branching covers `PathTraversalError`, `FileNotFoundError`, and `TokenParseError` individually (each surfacing its own `.message`), with only genuinely unmatched/`UnknownError` cases falling back to a generic message.
- [x] AC-03: `docs/project.md`'s Error Handling constraint no longer contains the "undefined for now" deferral sentence; it documents the Server Component branching convention (FR-02), the Client Component hook-state convention (FR-03), and the error-boundary scoping decision (FR-04).
- [x] AC-04: Existing tests (`TokenTree.test.tsx`, `route.test.ts`) continue to pass, updated as needed to reflect the `TokenTree.tsx` → `useSaveTokenEdits` refactor and the `route.ts` response-body contract change (behavior/status codes unchanged, only the implementation and response shape move).
- [x] AC-05: No engine/library package (`token-core`, `errors`, `token-type-contract`, `token-type-dimension`) changes its `Result`/`ResultAsync` usage — this feature is `apps/web-app`-only, per the constraint's own "governs engine/library code only" scope note.
- [x] AC-06: A `useSaveTokenEdits` (or equivalently named) hook exists, following the FR-03 convention (its `error` state is `SaveError`-shaped, not a plain string), and `TokenTree.tsx` uses it instead of inline `fetch`/`useState` logic (FR-05).
- [x] AC-07: `apps/web-app/app/error.tsx` exists, is a Client Component per the Next.js App Router convention, renders a generic fallback UI with a reset action, and logs the caught error via `consoleLogger` (FR-06).
- [x] AC-08: `app/api/tokens/[...path]/route.ts`'s `GET` and `PATCH` error responses each include a `kind` field (`"not-found" | "validation" | "invalid-file" | "unknown"`) matching their existing HTTP status code, in addition to the existing `error` message field (FR-07).
- [x] AC-09: `useSaveTokenEdits` maps a failed PATCH response's `kind` field directly into its own `SaveError` union rather than re-deriving `kind` from the HTTP status code independently (FR-03).

## Technical Scope

### Affected Modules
- `apps/web-app/app/tokens/[...path]/page.tsx` — add the missing `FileNotFoundError` branch (FR-02/AC-01/AC-02).
- `apps/web-app/app/page.tsx` — no error-type-specific message exists here either (`scanTokenDirectory` failures are all generic), but that function's `Result` currently only ever produces one failure shape in practice; revisit only if `plan.md`/implementation finds a named error type already being discarded here the same way `FileNotFoundError` was. Not a required change unless such a gap is found.
- `docs/project.md` — Error Handling constraint gets the new UI-layer subsection (FR-01).
- `components/TokenTree.tsx` — refactored to use the new `useSaveTokenEdits` hook instead of its inline `fetch`/`useState` logic (FR-05).
- `apps/web-app/app/error.tsx` — new file (FR-06).
- `apps/web-app/app/api/tokens/[...path]/route.ts` — `GET` and `PATCH` error responses gain a `kind` field (FR-07).
- `apps/web-app/app/api/tokens/[...path]/route.test.ts` — updated to assert the new `kind` field on error responses.

### New Components Required
- A `useSaveTokenEdits` React hook (exact file location a `plan.md` decision — candidates include a new `apps/web-app/hooks/` directory, or colocated with `components/TokenTree.tsx`) (FR-05), whose `error` state is the new `SaveError` discriminated union (FR-03).
- `apps/web-app/app/error.tsx` root error boundary (FR-06).
- A `SaveError` (or similarly-scoped, per-hook) discriminated union type, shared between `route.ts`'s response body shape (FR-07) and `useSaveTokenEdits`'s state (FR-03) — exact location a `plan.md` decision (e.g. a shared `lib/tokens/` module both the Route Handler and the hook import, rather than each redeclaring the same shape).

### Integration Points
- `lib/tokens/read.ts`'s `FileNotFoundError`/`PathTraversalError`/`TokenParseError` (already-defined named errors) — consumed by the Server Component fix in FR-02.
- `app/api/tokens/[...path]/route.ts`'s existing status-code-per-named-error mapping (400/404/422/500) — the reference pattern FR-02 mirrors on the Server Component side, and the taxonomy both the route's new `kind` field (FR-07) and the client-side `SaveError` union (FR-03) are derived from.
- `@dtcg-editor/errors`' `consoleLogger` — reused for error-boundary logging (FR-04, FR-06).
- `docs/project.md`'s Error Handling constraint — amended in place (FR-01), not superseded.

## Non-Functional Requirements
- **Consistency**: the new convention must be derived from evidence already in the codebase (existing branching in `route.ts`, existing ad hoc state in `TokenTree.tsx`) rather than an invented taxonomy — following the same "evidence-based, not invented" methodology already used for the engine-layer named-vs-unknown classification (see `docs/project.md`'s Architecture Decisions log, 2026-07-25 entry).
- **TypeScript Strictness**: any new hook/component compiles under the repo's strict settings with no `any`.
- **Minimal Dependencies**: this feature must not introduce a data-fetching library (e.g. SWR, React Query, TanStack Query) to implement the hook convention — hand-rolled `useState`-based hook state is the expected approach, consistent with `TokenTree.tsx`'s existing pattern and the Minimal Dependencies constraint's default-to-built-ins stance. If `plan.md` concludes a library is genuinely justified, that justification must be written down there per the constraint's own requirement.
- **Testing**: any new hook is tested with Vitest + `@testing-library/react` (`renderHook` or a wrapping test component), matching the existing `apps/web-app` testing convention; any changed Server Component branching is covered by a test if the existing test infrastructure supports testing that page (no test currently exists for `app/tokens/[...path]/page.tsx` — `plan.md` should decide the concrete testing approach, e.g. testing the branch logic in isolation vs. a page-level integration test).

## Out of Scope
- Establishing or changing `Result` conventions for `packages/*` engine/library code — already governed by the existing Error Handling constraint; this feature only concerns `apps/web-app`'s UI layer.
- Migrating `apps/web-app/lib/config.ts`'s `ConfigError`/`loadConfig` to the `Result` pattern — separate, already-open backlog item ("Migrate `apps/web-app/lib/config.ts` ... to the Result pattern").
- Any other open backlog item (CI Conventional Commits enforcement, dependency injection convention, config-bootstrap CLI, tabs/spaces reformat, ESLint/TypeScript major upgrades) — unrelated to this feature.
- Retrofitting the new hook convention onto every component that could theoretically use it — scope is limited to fixing the `FileNotFoundError` gap (FR-02) and `TokenTree.tsx`'s existing save flow (FR-05). No speculative new hooks for functionality that doesn't exist yet.
- Adding error boundaries at every route segment — scope is a single root-level `app/error.tsx` (FR-06), not per-route boundaries.
- Changing the Route Handlers' existing HTTP status codes in `app/api/tokens/[...path]/route.ts` — that status-per-named-error mapping (400/404/422/500) is treated as already-correct and is the reference pattern this feature mirrors; only the JSON *body* gains a `kind` field (FR-07), the status codes themselves are unchanged.
- Adding a `kind` field to `app/api/tokens/route.ts` (the file-listing endpoint) — that endpoint has only a single failure mode (500 on scan failure per `docs/project.md`'s API table), not a per-named-error taxonomy, so there's nothing for a `kind` discriminant to distinguish; out of scope unless a future feature gives it more than one named failure mode.
- Removing or replacing the existing `{ error: string }` field on `route.ts`'s error responses — `kind` is additive; `error` (and, for request-body validation, `details`) stay as-is for any consumer still reading them.

## Resolved Decisions
These were originally raised as Open Questions in this spec (scope/architecture-affecting decisions this spec could not resolve unilaterally) and have since been decided by the backlog item's owner. Functional Requirements, Acceptance Criteria, and Technical Scope above already reflect these resolutions.

- **OQ-01 — Refactor existing code now, not document-only.** Decision: extract `TokenTree.tsx`'s inline save logic into a real `useSaveTokenEdits` hook now, as the concrete reference implementation of the FR-03 convention (FR-05, AC-06) — not deferred to documentation-only for some future hook.
- **OQ-02 — Add the error boundary now, not deferred.** Decision: add a root `apps/web-app/app/error.tsx` error boundary now (FR-06, AC-07), rather than documenting "no boundary needed yet."
- **OQ-03 — Discriminated union for hook error state, not a plain string.** Decision: a Client Component hook's error state is a discriminated union (e.g. `SaveError`, FR-03) keyed off failure kind, not a plain `string | undefined` message — confirmed and understood to also require `app/api/tokens/[...path]/route.ts`'s JSON error responses to carry a `kind` discriminant field, not just a message (FR-07, AC-08); that route change is accepted as in-scope, not a reason to fall back to the simpler string option.

## Open Questions
None remaining — all three open questions (OQ-01, OQ-02, OQ-03) are resolved above, and the Functional Requirements/Acceptance Criteria/Technical Scope sections already reflect their resolutions.
