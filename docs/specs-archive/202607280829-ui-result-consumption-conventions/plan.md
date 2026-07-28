# Implementation Plan: UI-Layer Result Consumption Conventions

## Overview
Define and put into practice this repo's first UI-layer convention for consuming fallible operations, replacing `docs/project.md`'s "undefined for now" deferral with a concrete subsection derived from evidence already in the codebase: `app/tokens/[...path]/page.tsx`'s `ResultAsync`-branching (Server Components) and `TokenTree.tsx`'s ad hoc `fetch`/`useState` triple (Client Component hooks). Concretely, this: (1) fixes `page.tsx`'s `FileNotFoundError` gap by extracting the branch into a small, unit-testable `describePageError` function; (2) gives `app/api/tokens/[...path]/route.ts`'s `GET`/`PATCH` error JSON bodies an additive `kind` discriminant, backed by a new shared `SaveError` type; (3) extracts `TokenTree.tsx`'s inline save logic into a `useSaveTokenEdits` hook consuming that `kind` field, as the reference implementation of the new hook convention; (4) adds a root `app/error.tsx` boundary reserved for genuinely unexpected exceptions; (5) documents all of the above in `docs/project.md`. No new dependencies — `@testing-library/react` (already a dependency, v16.3.2) exports `renderHook` directly, so the hook is tested with the existing testing stack.

## Architecture Decisions

- **`SaveError` lives in a new `apps/web-app/lib/tokens/save-error.ts`, imported by both `route.ts` and the new hook.** This is the shared contract feature.md's Technical Scope calls for ("a shared `lib/tokens/` module both the Route Handler and the hook import, rather than each redeclaring the same shape"). It exports only the type — no parsing/construction helpers — since the two sides of the wire (server constructing the JSON body, client parsing it back) have different concerns and a shared runtime helper would couple them unnecessarily.

- **`route.ts` gains a local `errorResponse` helper that spreads a `SaveError` value directly into the JSON body.** Because every `SaveError` variant's own fields (`path`, `issues`, or `message`) are exactly the "kind-specific fields" FR-07 wants added to the response body, `Response.json({ error: message, ...saveError, ...extra }, { status })` gets `kind` plus those fields in one place, replacing ~10 near-identical `Response.json({ error: ... }, { status })` call sites with one path that can't drift out of sync with the `SaveError` type. `extra` carries the existing `details` (raw Zod issues) field for the one call site that already has it, unchanged.

- **Single-message named errors (`PathTraversalError`, `FileNotFoundError`'s non-`not-found` cousins aside, `TokenParseError`, and every ad hoc 400 string in `PATCH`) map to `SaveError`'s array-shaped fields as a one-element array** (e.g. `issues: [error.message]`), since `SaveError.validation`/`invalid-file`'s type is `issues: string[]`, never a bare `string` — this keeps exactly one shape for a hook to branch on regardless of whether the server-side error happened to originate from a single `Error.message` or a Zod issues array. The existing `error` string field and (for the one case that has it) `details` (raw `ZodIssue[]`) are unchanged/still present — `kind`/`issues`/`path`/`message` are additive, per feature.md's explicit non-goal ("Removing or replacing the existing `{ error: string }` field... `kind` is additive").

- **`app/page.tsx` is unchanged.** Confirmed by reading `apps/web-app/lib/tokens/scan.ts`: `scanTokenDirectory` returns `ResultAsync<TokenFileSummary[], UnknownError>` — a single, already-generic failure mode, not a named error being silently discarded. Per feature.md's Technical Scope note, this is explicitly not a required change unless such a gap exists, and it doesn't.

- **`page.tsx`'s error-branching logic is extracted into a new, pure `describePageError` function in a sibling `describe-error.ts` file, unit-tested directly.** `page.tsx` has no existing test, and it's an async Server Component reading real config/`fs` — a page-level integration test would duplicate `route.test.ts`'s fixture-directory setup for no new coverage. Extracting the branch into a plain function taking constructed error instances directly (no fs, no config) is the "test the branch logic in isolation" option feature.md's Testing NFR explicitly floated, and follows the "tests live alongside the code they test" convention (`describe-error.ts` + `describe-error.test.ts`, colocated with `page.tsx`).

- **`useSaveTokenEdits` lives in a new `apps/web-app/hooks/` directory**, not colocated inside `components/`. Feature.md leaves this open as a plan.md decision. Since this hook is explicitly the reference implementation future hooks are meant to follow, giving hooks a dedicated, discoverable top-level location (mirroring `components/`, `lib/`) is more useful *as a convention* than colocating the first one next to the one component that happens to use it today. The hook file is marked `"use client"` (it calls `useState`) so it can never be accidentally imported into a Server Component.

- **The hook's `save` function returns `Promise<boolean>` (did it succeed), and tree-state mutation (`applyEditsToPlainNode`, clearing `pendingEdits`) stays in `TokenTree.tsx`, not the hook.** The hook's job (FR-03) is request/response/error-state management; it has no knowledge of `PlainDtcgNode` tree structure or what "apply an edit" means for this particular caller. `TokenTree.tsx`'s `handleSave` becomes a thin wrapper: call `save(edits)`, and only on `true` apply the optimistic update it already does today. This is the same separation of concerns `edit-state.ts` (pure tree logic) vs. `TokenTree.tsx` (component state) already uses.

- **The hook's internal `saveState` enum is renamed `"idle" | "saving" | "error"` → `"idle" | "pending" | "error"`**, matching the exact vocabulary FR-03 itself proposes ("a status enum (`"idle" | "pending" | "error"`...)"), since `docs/project.md`'s new convention subsection will describe hooks using this vocabulary and the reference implementation should literally match it. This is a cosmetic rename only — `TokenTree.tsx`'s button label/disabled logic moves from checking `"saving"` to `"pending"` with no behavior change. **Flagged for optional sign-off** — feature.md doesn't mandate this exact string, it's a plan-level judgment call.

- **The hook parses the response body defensively with a hand-rolled type guard (`parseSaveError`, private to the hook file), not a Zod schema.** `docs/project.md`'s Validation at the Edges constraint gives examples of genuine external edges (file reads, pasted JSON, third-party API calls); a Client Component reading its own app's own Route Handler response is a same-codebase contract both ends of which this feature controls (`route.ts`'s `errorResponse` and the hook's parser are introduced together, right here), not an uncontrolled external edge. Given Minimal Dependencies and feature.md's explicit "no new dependency" expectation, a plain `switch` on `body.kind` with `typeof`-narrowed field access is the built-in-first choice; it still degrades safely (falls back to a `"unknown"` `SaveError` with a synthesized message) if the body is ever malformed. **Flagged for optional sign-off** — this is an interpretive call on where "the edge" is, not settled explicitly by `docs/project.md` or `feature.md`.

- **`app/error.tsx` is tested directly as a plain component**, rendering it with hand-constructed `error`/`reset` props via Testing Library rather than trying to trigger Next's actual error-boundary machinery (which needs the full Next runtime, not just Vitest+jsdom). Not explicitly required by any AC, but low-cost and consistent with the Testing NFR's general expectation of test coverage for new code.

## Implementation Steps

### Step 1: Shared `SaveError` type
- [x] Create `apps/web-app/lib/tokens/save-error.ts`:
  ```ts
  /**
   * The shape every non-2xx JSON response body from
   * `app/api/tokens/[...path]/route.ts`'s `GET`/`PATCH` handlers carries
   * (as the fields below, alongside the existing `error`/`details` fields),
   * and the error state `useSaveTokenEdits` (`hooks/useSaveTokenEdits.ts`)
   * exposes after a failed save — shared so the wire contract and the
   * client-side state it unwraps into can't drift apart. Mirrors the
   * route's existing 400/404/422/500 status-code taxonomy.
   */
  export type SaveError =
    | { readonly kind: "not-found"; readonly path: string }
    | { readonly kind: "validation"; readonly issues: readonly string[] }
    | { readonly kind: "invalid-file"; readonly issues: readonly string[] }
    | { readonly kind: "unknown"; readonly message: string };
  ```
- Files: `apps/web-app/lib/tokens/save-error.ts` (new)

### Step 2: `route.ts` — additive `kind` field on every error response
- [x] Import `type { SaveError }` from `../../../../lib/tokens/save-error.ts`.
- [x] Add a local helper near `readJsonBody`:
  ```ts
  function errorResponse(status: number, message: string, saveError: SaveError, extra?: Record<string, unknown>): Response {
    return Response.json({ error: message, ...saveError, ...extra }, { status });
  }
  ```
- [x] `GET`: replace the four terminal `Response.json` calls with:
  - `PathTraversalError` → `errorResponse(400, error.message, { kind: "validation", issues: [error.message] })`
  - `FileNotFoundError` → `errorResponse(404, error.message, { kind: "not-found", path: relativePath })`
  - `TokenParseError` → `errorResponse(422, error.message, { kind: "invalid-file", issues: [error.message] })`
  - fallback → `errorResponse(500, "Internal server error", { kind: "unknown", message: "Internal server error" })`
- [x] `patchTokenFile`: replace every `Response.json({ error: ... }, { status })` call analogously:
  - `InvalidRequestBodyError` (400) → `issues: [bodyResult.error.message]`
  - `EditRequestSchema` failure (400) → `issues: requestValidation.error.issues.map((i) => i.message)`, keep existing `details: requestValidation.error.issues` via the `extra` param
  - `documentResult` 400/404/422/500 branches → same mapping as `GET`
  - "No token found at ..." / "is a group, not a token" / "Only X tokens can be edited" / invalid dimension value (400 each) → `kind: "validation"`, `issues: [message]` (or `valueValidation.error.issues.map((i) => i.message)` for the dimension-value case, keeping the existing joined-string `error` message as-is)
  - `applyTokenEdits` `Err` (400, rename collision etc.) → `issues: [editedDocument.error.message]`
  - `writeResult` `PathTraversalError` (400) → `issues: [error.message]`; generic write failure (500) → `kind: "unknown", message: "Failed to save token file"`
- [x] Leave `GET`/`PATCH`'s exported signatures, status codes, and the success-path `Response.json({ document: ... })` / `Response.json({ ok: true })` bodies untouched.
- Files: `apps/web-app/app/api/tokens/[...path]/route.ts`

### Step 3: `route.test.ts` — assert `kind` on error responses
- [x] For each existing status-code assertion (400/404/422/500 across both `GET` and `PATCH` tests), add an assertion on the parsed body's `kind` field matching the new taxonomy (`"validation"` for 400s, `"not-found"` for 404, `"invalid-file"` for 422, `"unknown"` for 500).
- [x] No new test cases beyond the added assertions — behavior/status codes are unchanged (AC-04).
- Files: `apps/web-app/app/api/tokens/[...path]/route.test.ts`

### Step 4: `useSaveTokenEdits` hook
- [x] Create `apps/web-app/hooks/useSaveTokenEdits.ts`:
  ```ts
  "use client";

  import { useState } from "react";
  import type { ClientEdit } from "../lib/tokens/edit-state.ts";
  import type { SaveError } from "../lib/tokens/save-error.ts";

  type SaveState = "idle" | "pending" | "error";

  interface UseSaveTokenEditsResult {
    readonly saveState: SaveState;
    readonly saveError: SaveError | undefined;
    readonly save: (edits: readonly ClientEdit[]) => Promise<boolean>;
  }

  function parseSaveError(body: unknown, status: number): SaveError {
    if (typeof body === "object" && body !== null && "kind" in body) {
      const kind = (body as { kind: unknown }).kind;
      if (kind === "not-found") {
        const path = (body as { path?: unknown }).path;
        return { kind, path: typeof path === "string" ? path : "" };
      }
      if (kind === "validation" || kind === "invalid-file") {
        const issues = (body as { issues?: unknown }).issues;
        return { kind, issues: Array.isArray(issues) ? issues.filter((i): i is string => typeof i === "string") : [] };
      }
      if (kind === "unknown") {
        const message = (body as { message?: unknown }).message;
        return { kind, message: typeof message === "string" ? message : `Save failed with status ${status}` };
      }
    }
    const error = (body as { error?: unknown } | null)?.error;
    return { kind: "unknown", message: typeof error === "string" ? error : `Save failed with status ${status}` };
  }

  export function useSaveTokenEdits(relativePath: string): UseSaveTokenEditsResult {
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [saveError, setSaveError] = useState<SaveError | undefined>(undefined);

    async function save(edits: readonly ClientEdit[]): Promise<boolean> {
      setSaveState("pending");
      setSaveError(undefined);

      let response: Response;
      try {
        response = await fetch(`/api/tokens/${relativePath}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edits }),
        });
      } catch (cause) {
        setSaveState("error");
        setSaveError({ kind: "unknown", message: cause instanceof Error ? cause.message : "Save failed" });
        return false;
      }

      if (response.ok) {
        setSaveState("idle");
        return true;
      }

      const body: unknown = await response.json().catch(() => undefined);
      setSaveState("error");
      setSaveError(parseSaveError(body, response.status));
      return false;
    }

    return { saveState, saveError, save };
  }
  ```
- Files: `apps/web-app/hooks/useSaveTokenEdits.ts` (new)

### Step 5: `useSaveTokenEdits.test.tsx`
- [x] Use `renderHook`/`act` from `@testing-library/react` (already a dependency — no new package needed).
- [x] Cover: successful save (`saveState` returns to `"idle"`, `save` resolves `true`); each of the four `kind`s on a non-OK response (`not-found`/`validation`/`invalid-file`/`unknown`), asserting `saveError` matches the expected `SaveError` shape and `save` resolves `false`; a rejected `fetch` (network failure) maps to `{ kind: "unknown", ... }`; a non-OK response with a body missing/malformed `kind` still degrades to a `"unknown"` `SaveError` rather than throwing.
- [x] Mock `fetch` via `vi.stubGlobal("fetch", ...)` per-test, `vi.unstubAllGlobals()` in `afterEach`, matching `TokenTree.test.tsx`'s existing convention.
- Files: `apps/web-app/hooks/useSaveTokenEdits.test.tsx` (new)

### Step 6: `TokenTree.tsx` — use the hook
- [x] Remove the inline `saveState`/`saveError`/`handleSave` `fetch`/try-catch logic; call `const { saveState, saveError, save } = useSaveTokenEdits(relativePath);`.
- [x] `handleSave` becomes:
  ```ts
  async function handleSave() {
    const edits = Array.from(pendingEdits.values());
    const succeeded = await save(edits);
    if (succeeded) {
      setTreeState((current) => applyEditsToPlainNode(current, edits));
      setPendingEdits(new Map());
    }
  }
  ```
- [x] Update the button's pending check/label from `saveState === "saving"` to `saveState === "pending"`.
- [x] Add a small local `describeSaveError(error: SaveError): string` (e.g. `not-found` → \`Token not found: "${error.path}"\`; `validation`/`invalid-file` → `error.issues.join(", ")`; `unknown` → `error.message`) and render `describeSaveError(saveError)` in place of the old plain-string `saveError`.
- Files: `apps/web-app/components/TokenTree.tsx`

### Step 7: `TokenTree.test.tsx` — update for the new contract
- [x] Update the "keeps a pending edit visible... after a failed save (AC-06)" test's mocked response body from `{ error: "disk full" }` to `{ kind: "unknown", message: "disk full" }`, matching the new wire contract; assertion on rendered text (`"disk full"`) is unchanged.
- Files: `apps/web-app/components/TokenTree.test.tsx`

### Step 8: `page.tsx` — exhaustive named-error branching
- [x] Create `apps/web-app/app/tokens/[...path]/describe-error.ts`:
  ```ts
  import { TokenParseError } from "@dtcg-editor/token-core";
  import type { UnknownError } from "@dtcg-editor/errors";
  import { FileNotFoundError } from "../../../lib/tokens/read.ts";
  import { PathTraversalError } from "../../../lib/tokens/path-safety.ts";

  export function describePageError(
    error: PathTraversalError | FileNotFoundError | TokenParseError | UnknownError,
    relativePath: string,
  ): string {
    if (error instanceof PathTraversalError || error instanceof FileNotFoundError || error instanceof TokenParseError) {
      return error.message;
    }
    return `Could not load "${relativePath}".`;
  }
  ```
- [x] Update `page.tsx` to import `describePageError` and use it in place of the current inline ternary: `errorMessage = describePageError(error, relativePath);`. Also import `FileNotFoundError` (no longer needed directly in `page.tsx` itself once the branch moves — only the type flows through, so drop the import there if unused after the change).
- Files: `apps/web-app/app/tokens/[...path]/page.tsx`, `apps/web-app/app/tokens/[...path]/describe-error.ts` (new)

### Step 9: `describe-error.test.ts`
- [x] Unit test all four branches with directly-constructed error instances (`new PathTraversalError(...)`, `new FileNotFoundError(...)`, `new TokenParseError(...)`, a plain `UnknownError` object), asserting `describePageError` returns each error's own `.message` for the three named cases and the generic `Could not load "<path>".` fallback for `UnknownError` — covers AC-01/AC-02 without any fs/config fixture setup.
- Files: `apps/web-app/app/tokens/[...path]/describe-error.test.ts` (new)

### Step 10: Root error boundary
- [x] Create `apps/web-app/app/error.tsx`:
  ```tsx
  "use client";

  import { useEffect } from "react";
  import { consoleLogger } from "@dtcg-editor/errors";

  export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
      consoleLogger.error({ error, digest: error.digest }, "Unhandled error caught by root error boundary");
    }, [error]);

    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1>Something went wrong</h1>
        <p role="alert">An unexpected error occurred.</p>
        <button type="button" onClick={reset}>Try again</button>
      </main>
    );
  }
  ```
- Files: `apps/web-app/app/error.tsx` (new)

### Step 11: `error.test.tsx`
- [x] Render `GlobalError` directly with a hand-constructed `Error` and a `vi.fn()` `reset`; assert the fallback renders (`role="alert"`), clicking "Try again" calls `reset`, and `consoleLogger.error` (spied via `vi.spyOn`) is called once.
- Files: `apps/web-app/app/error.test.tsx` (new)

### Step 12: `docs/project.md` — document the convention (FR-01/AC-03)
- [x] In the Error Handling constraint, replace the final sentence ("Scope: this governs engine/library code only. UI-layer consumption of `Result`s (React hooks, error boundaries) is undefined for now — revisit once component code exists.") with:
  ```markdown
  Scope: this governs engine/library code directly; the UI layer (`apps/web-app`'s Server Components and Client Component hooks) built on top of it follows the derived convention below.

  #### UI-Layer Result Consumption
  - **Server Components** receiving a `ResultAsync` from an engine/lib function branch on `.isOk()`/`.isErr()` and exhaustively match every named error the function's return type declares (via `instanceof`) before falling back to a generic message — the generic fallback is reserved for `UnknownError` (and any truly unmatched case), never used as a catch-all for a named error the code simply didn't branch on. See `app/tokens/[...path]/page.tsx`'s `describePageError` and `app/api/tokens/[...path]/route.ts`'s `GET`/`PATCH` handlers for the reference pattern.
  - **Client Component hooks** wrapping a `fetch` call to a Route Handler never let a failed request surface as a thrown exception for the caller to catch. A `Result`/`ResultAsync` value itself never crosses the network — by the time a Client Component sees a response, it has already been translated server-side into an HTTP status code plus a JSON body (see the API table and each Route Handler's error-response shape). The hook tracks a status enum (`"idle" | "pending" | "error"`, or with a distinct `"success"` state where useful) plus an `error` field, populated by branching on `response.ok`/`response.status` and the body's `kind` discriminant, always unwrapping a failure into returned state rather than a thrown exception — mirroring the "a caller cannot ignore the failure case without explicitly unwrapping it" spirit of the Result pattern above, adapted to an already-serialized wire format. The `error` field is a discriminated union scoped to that hook's own operation (e.g. `useSaveTokenEdits`'s `SaveError`, `apps/web-app/lib/tokens/save-error.ts`) rather than a plain string, so a consuming component can render distinct UI per failure kind; a hook for a different operation defines its own analogous union rather than reusing another hook's. See `apps/web-app/hooks/useSaveTokenEdits.ts` for the reference implementation.
  - **Error boundaries** (`error.tsx`) are reserved for genuinely unexpected render-time exceptions only — the UI-layer analog of `UnknownError`. Expected/named failures are always handled via the two conventions above, never by throwing and relying on a boundary to catch them. `apps/web-app/app/error.tsx` is a single root-level Client Component boundary, logging via `consoleLogger` before rendering a generic fallback with a reset action; it exists as a safety net, not a primary error-handling mechanism.
  ```
- Files: `docs/project.md`

### Step 13: Verification
- [x] `pnpm build` — `tsc`/`next build` compile cleanly, no `any` introduced.
- [x] `pnpm lint` — no new violations.
- [x] `pnpm test` — full suite passes: `route.test.ts` (updated `kind` assertions), `TokenTree.test.tsx` (updated mock body), new `useSaveTokenEdits.test.tsx`, new `describe-error.test.ts`, new `error.test.tsx`.
- [x] Manual sanity check: run the app, navigate to a nonexistent `/tokens/<path>` and confirm the distinct not-found message renders (AC-01); trigger a save failure and confirm the hook-derived message still renders in `TokenTree`.
- Files: none (verification only)

## Acceptance Criteria Mapping
| AC | Verified By |
|----|-------------|
| AC-01: distinct not-found message at `/tokens/<missing path>` | `describe-error.test.ts` (`FileNotFoundError` branch) + manual check (Step 13) |
| AC-02: `page.tsx` branches `PathTraversalError`/`FileNotFoundError`/`TokenParseError` individually, generic fallback only for unmatched/`UnknownError` | `describe-error.test.ts` (all four branches) |
| AC-03: `docs/project.md`'s deferral sentence replaced with the FR-02/FR-03/FR-04 subsection | `docs/project.md` diff (Step 12) — code review, no automated test for documentation prose |
| AC-04: `TokenTree.test.tsx`/`route.test.ts` continue to pass, updated for the refactor/contract change | `apps/web-app/components/TokenTree.test.tsx`, `apps/web-app/app/api/tokens/[...path]/route.test.ts` |
| AC-05: no `packages/*` engine/library package changes its `Result`/`ResultAsync` usage | Code review — diff is `apps/web-app`-only (Steps 1–12 file list) |
| AC-06: `useSaveTokenEdits` exists with `SaveError`-shaped error state; `TokenTree.tsx` uses it | `apps/web-app/hooks/useSaveTokenEdits.ts`, `useSaveTokenEdits.test.tsx`, `TokenTree.tsx` diff (Steps 4, 5, 6) |
| AC-07: `app/error.tsx` exists, Client Component, generic fallback + reset, logs via `consoleLogger` | `apps/web-app/app/error.tsx`, `error.test.tsx` (Steps 10, 11) |
| AC-08: `GET`/`PATCH` error responses each include `kind` matching their status code | `route.test.ts` updated assertions (Step 3) |
| AC-09: `useSaveTokenEdits` maps a failed response's `kind` directly, not re-derived from status code | `useSaveTokenEdits.test.tsx` (Step 5) — `parseSaveError` reads `body.kind`, `response.status` only used for the fallback message text |

## Risks & Mitigations
- **Risk:** the single-message-to-one-element-array convention (`issues: [error.message]`) for `PathTraversalError`/`TokenParseError`/ad hoc 400 strings is a plan-level interpretation, not verbatim in `feature.md`. → **Mitigation:** it's the only shape consistent with `SaveError`'s own type (`issues: string[]`, never a bare `string`), and keeps exactly one shape for the hook to branch on regardless of whether the server error originated from a single message or a real Zod issues array.
- **Risk:** renaming the hook's internal `"saving"` state to `"pending"` and choosing `hooks/` over colocating in `components/` are both judgment calls `feature.md` left open. → **Mitigation:** both are called out explicitly in Architecture Decisions above as non-blocking, flagged for optional sign-off; neither changes any acceptance criterion or observable behavior.
- **Risk:** the hook's response-body parsing is a hand-rolled type guard, not a Zod schema, which could be read as tension with the Validation at the Edges constraint. → **Mitigation:** flagged explicitly above; rationale is that this specific edge (own-app Route Handler response) is fully controlled end-to-end by this same feature's own two halves (`route.ts` + the hook), unlike the constraint's stated examples (file reads, third-party calls) — flagged for sign-off rather than decided unilaterally as final.
- **Risk:** extracting `describePageError`/`error.test.tsx` adds two new files not explicitly named in `feature.md`'s Technical Scope. → **Mitigation:** both directly implement the Testing NFR's own explicit request to "decide the concrete testing approach" for `page.tsx`'s branching and to test "any new hook"/new component; no scope beyond what AC-01/AC-02/AC-07 already require is added.

## New Dependencies
None. `renderHook` and `act` are already exported by `@testing-library/react` (`^16.3.2`, already a `devDependency` of `apps/web-app`) — no `package.json` change needed anywhere in this plan.

## Estimated Complexity
**Medium.** No new dependencies and every transformation pattern (Result-branch exhaustiveness, hook extraction, additive response field) is already proven elsewhere in this codebase, but the diff touches more files than prior features (13 steps across route/hook/component/page/docs) because this feature is explicitly about establishing a convention across all of them at once, not a single isolated change.
