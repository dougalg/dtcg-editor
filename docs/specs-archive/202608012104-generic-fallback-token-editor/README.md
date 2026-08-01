# Generic Fallback Token Editor

Implemented on: 2026-08-01

Every token type other than `dimension` was fully read-only, and the config-driven editor-extension mechanism (`TokenEditorExtension`/`resolveEditorForType`) was only wired up on the client render path — the server's `PATCH` handler still hard-rejected any edit to a non-`dimension` token regardless of what a host app registered. This feature closes both gaps.

## What was built

- **`packages/token-core/src/token-types.ts`**: a canonical, spec-sourced `DTCG_TOKEN_TYPES` list (13 types from the DTCG 2025.10 Format Module spec's Type section) plus `isDtcgTokenType`, the single source of truth both client and server check a token's effective type against.
- **`TokenEditorExtension`** (`apps/web-app/lib/token-editors/`) changed from `{ filter, editor }` to `{ type, editor }`; `defineConfig` now validates `type` against the canonical list at config-load time, and `resolveEditorForType` does a direct equality lookup instead of calling a predicate.
- **Non-standard-type detection** (`apps/web-app/lib/tokens/standard-type.ts`): a tree-walk flagging any file where a node's own declared `$type` isn't a recognized DTCG type. `FolderOverview` renders a distinct "non-standard" badge alongside `valid`/`invalid` for such files.
- **`FallbackValueEditor`** (`apps/web-app/components/`): a generic, type-shape-agnostic JSON-text editor for a token's `$value`, used whenever a token's type is standard but has no registered editor. Renders/edits `$value` as pretty-printed JSON text; `TreeNode` (not the editor itself) owns `JSON.parse`/validation/error-surfacing.
- **`TokenTree.tsx`**'s `canEdit`/editor-resolution logic generalized to a three-way split: dimension (unchanged), standard type with a registered editor (renders it generically), standard type with no editor (fallback), non-standard (stays read-only, now visibly flagged).
- **`route.ts`**'s `patchTokenFile` edit-authorization gate generalized the same way: rejects non-standard types (400), accepts any standard type, and only runs value-shape validation for types with a registered contract schema (currently just dimension).

## Notable decisions

- The canonical type list lives in `token-core`, not `apps/web-app`, per the existing "spec-parsing lives in its own package" principle.
- `TokenEditorExtension.type` stays a plain `string` (not the `DtcgTokenType` union) since `defineConfig`'s runtime check is the actual enforcement point for user-authored `.mts` config.
- Non-standard-type detection lives in `apps/web-app`, not `token-core` — it's app-level classification policy, not a spec-parsing fact, extending the existing "core never hard-codes an 'is this editable' policy" principle.
- Tests proving the override/fallback mechanism's genericity derive their "type with no built-in editor" fixture dynamically from `DTCG_TOKEN_TYPES`/`BUILT_IN_TOKEN_TYPES` at test-run time, never a hardcoded literal, so they can't silently start asserting a false premise once a real editor for that type ships.

See `feature.md`/`plan.md` in this directory for full detail, and `review.md` for the `/sdd-review` pass (verdict: ready to merge; one minor dead-re-export finding was fixed).
