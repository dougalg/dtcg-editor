# Edit Dimension Tokens in Browser

Implemented on: 2026-07-27

Dimension tokens' name, `$value`, and `$description` are now editable directly in the web app's token tree view. Edits accumulate as pending/unsaved state in the browser; a single Save writes all pending edits for the current file to disk in one `PATCH /api/tokens/[...path]` request. Every other token type remains read-only. A failed save keeps the pending edits visible and editable rather than discarding them.

This is the first feature to exercise `token-core`'s `serialize()`/round-trip path (previously a deliberate, flagged gap) and the first concrete implementation of the Token-Type Package Contract: a new `@dtcg-editor/token-type-contract` package defines the pluggable `{ type, valueSchema, serializeValue, Editor }` interface, and `@dtcg-editor/token-type-dimension` implements it for Dimension. `token-core` itself stays completely type-agnostic — it only knows how to locate a token by path, patch it, and re-serialize the tree; the "dimension is the one editable type today" policy lives entirely in `apps/web-app`.

`apps/web-app` also moved from `node:test` to Vitest + `@testing-library/react` (`jsdom` environment) — the first package in the repo to render/test React components, since `node:test`'s native TypeScript support cannot execute `.tsx`/JSX at all (confirmed empirically, not just discouraged). `packages/*` stay on `node:test`, since none of them have JSX.

A code review caught two real bugs before merge: both the server route and the client component checked rename-collisions against a stale, pre-batch snapshot instead of the effective tree, which could wrongly reject a legitimate same-batch "free up a name via one rename, then claim it via another" edit. Both were fixed, with regression tests added on each side.
