# Feature: Generic Fallback Token Editor

## Summary

Every token type that isn't `dimension` is currently fully read-only, and the "config-driven editor extension" mechanism (`TokenEditorExtension` / `resolveEditorForType`) that's supposed to let host apps register custom editors per token type is only wired up on the client-render path — the server (`route.ts`'s `PATCH` handler) still hard-rejects any edit to a non-`dimension` token regardless of what's registered. This feature introduces a generic fallback editor so any token whose `$type` is a spec-valid DTCG type — but has no custom editor registered for it yet — becomes editable through a simple, type-shape-agnostic UI, while tokens using a `$type` outside the DTCG spec remain read-only and are now visibly flagged as non-standard rather than silently treated the same as any other unrecognized/uneditable token. Along the way this establishes the first canonical, spec-derived list of valid DTCG token types in `token-core`, changes `TokenEditorExtension`'s shape so config-time validation can actually enforce "editors may only be registered for valid DTCG types," and generalizes both the client's `canEdit` gate and the server's edit-authorization gate off their current dimension-only hard-coding.

## User Stories

- As a design system maintainer, I want to edit tokens of any spec-valid DTCG type in the web app, even before a custom editor for that type exists, so that the editor is useful for my whole token file today, not just the one type (`dimension`) that happens to have a bespoke editor.
- As a host app integrator, I want the config layer to reject an editor registration for a `$type` that isn't part of the DTCG spec, so a typo or a made-up type name in my `dtcg-editor.config.mts` fails fast at config-load time instead of silently never matching anything.
- As a design system maintainer, I want a token file that uses non-spec `$type` values flagged distinctly from a file that's simply broken/unparseable, so I can tell "this file has a typo in `$type`" apart from "this file has invalid JSON" at a glance.

## Functional Requirements

### FR-01: Canonical DTCG Token Type Registry

`token-core` (the spec-parsing, UI-agnostic package) exports a single canonical list of valid DTCG `$type` values, sourced from the Type section of the [DTCG Format Module spec (2025.10)](https://www.designtokens.org/tr/2025.10/format/) — the same spec version this repo's `docs/project.md` already points to for other type-shape conventions (e.g. `DimensionValueSchema`). This becomes the one source of truth both the client (editor registration/rendering) and the server (edit authorization) check a token's effective type against — no second, independently-maintained copy of the list anywhere.

- Exposed as an exported `readonly string[]`-shaped constant (naming/location decided at `/sdd-plan` time, but it belongs in `token-core` per the Token-Type Package Contract's "spec-parsing lives in its own package" principle, not in `apps/web-app`).
- `/sdd-plan` and `/sdd-implement` must enumerate the exact type list directly from the spec's Type table (not from this document, which is not the source of truth) — DTCG spec compliance is mandatory per `docs/project.md`, and a wrong or stale list here would silently misclassify real tokens as non-standard or vice versa.

### FR-02: `TokenEditorExtension` Shape Change — Type-Validated Registration

`TokenEditorExtension` (`apps/web-app/lib/token-editors/types.ts`) changes from `{ filter: (metadata) => boolean, editor }` to `{ type: <string>, editor }`, where `type` names the single DTCG `$type` the entry's `editor` handles. `defineConfig` (`apps/web-app/lib/token-editors/define-config.ts`) validates every extension's `type` (both user-supplied and built-in) against the FR-01 canonical list at config-load time, alongside its existing `filter`/`editor`-shape checks, and throws `DtcgEditorConfigError` (same error type, extended issue set) for any entry whose `type` isn't a recognized DTCG type.

- `resolveEditorForType` (`apps/web-app/lib/token-editors/resolve-editor.ts`) updates its lookup from `extensions.find((entry) => entry.filter(...))` to a direct `type` equality match — first-match-wins ordering (user entries ahead of built-ins) is unchanged.
- `builtInExtensions`/`BUILT_IN_TOKEN_TYPES` (`apps/web-app/lib/token-editors/built-in.ts`) updates its generated entries to the new `{ type, editor }` shape; `BUILT_IN_TOKEN_TYPES` itself (currently `["dimension"]`) is unaffected in meaning, just in how it's consumed.
- This is a breaking change to a public-ish extension-authoring shape (a user's `dtcg-editor.config.mts` using the old `filter` field would silently stop matching anything). Since this repo is pre-1.0 and the only real consumer is this repo's own committed `dtcg-editor.config.mts`, no migration/deprecation path is needed — update the one committed config file directly.

### FR-03: Non-Standard Type Detection

A new check, independent of today's parse-level `valid`/`invalid` distinction (`apps/web-app/lib/tokens/scan.ts`'s `TokenFileSummary`), determines whether a _successfully parsed_ token document contains any node (token or group) whose own declared `$type` is set but not in the FR-01 canonical list. `$type` being absent (inherited or untyped) is not itself non-standard — only an explicitly declared, unrecognized value is.

- `TokenFileSummary`'s `valid: true` variant gains an additional field (e.g. `standard: boolean`) — a file can be `valid: true, standard: false` (parses fine, but uses an unrecognized `$type` somewhere). The `valid: false` variant is unaffected; a file that fails to parse never reaches this check.
- `FolderOverview.tsx` renders a distinct badge (e.g. `non-standard`, styled/worded at implementation time) alongside the existing `valid`/`invalid` badges when `standard` is `false`, without altering the existing `valid`/`invalid` badge behavior.
- Within the token tree view (`TokenTree.tsx`), a token or group whose own effective `$type` is non-standard is never eligible for the fallback editor (FR-05) even though it technically "has no registered editor" — it stays on today's fully-read-only rendering path, and should visibly indicate its type is unrecognized (e.g. reusing or adapting the existing `{node.name} type` field display).

### FR-04: Generic Fallback Editor Component

A new fallback editor component (location decided at `/sdd-plan` time, but architecturally distinct from a `TokenTypeContract` implementation — see Technical Scope) provides an editable UI for a token's `$value` with no assumption about its shape:

- Renders the current `$value` as its JSON text representation (`JSON.stringify`, pretty-printed) in a text input/textarea.
- On change, attempts `JSON.parse` on the edited text. A parse failure surfaces a field-level validation error (mirroring the existing `errors.value` pattern in `TokenTree.tsx`) and does **not** stage an edit; valid JSON stages the parsed value via the same `onStageEdit`/`ClientEdit.value` path `DimensionEditor` already uses.
- Performs no shape/schema validation beyond "is this valid JSON" — by design, since it has no per-type schema to validate against. This is the deliberate trade-off behind "generic and flexible enough for a wide variety of purposes."
- Name and description editing for a fallback-eligible token use the exact same generic `<label>`-wrapped inputs a dimension token already gets (`TreeNode`'s existing name/description JSX is not type-specific and needs no change beyond becoming reachable for more tokens per FR-05).

### FR-05: Client-Side `canEdit` Generalization

`TreeNode` in `TokenTree.tsx` currently computes `canEdit` as "is this a dimension token AND does its value pass `DimensionValueSchema`." This generalizes to:

- **Standard type with a registered editor** (currently: dimension) → editable via that editor, validated by that type's own contract schema (unchanged behavior for dimension).
- **Standard type with no registered editor** → editable via the FR-04 fallback editor, no schema validation beyond JSON-parseability.
- **Non-standard type** (FR-03) → stays fully read-only (today's existing read-only branch), never offered any editor.
- **No effective type at all** (`effectiveType === undefined`) → out of scope for this feature (see Out of Scope) — retains today's read-only behavior.

`resolveEditorForType` returning `undefined` for a standard-but-uncustomized type is what triggers the fallback editor; it returning `undefined` for a non-standard type must not.

### FR-06: Server-Side Edit Authorization Generalization

`route.ts`'s `patchTokenFile` currently rejects any edit where `resolveEffectiveType(...) !== dimensionTokenType.type`. This generalizes to:

- Reject (400, same `SaveError`-shaped response convention already used) an edit whose effective type is **not** in the FR-01 canonical list (non-standard type) — same outcome as today's rejection, new reason.
- Accept an edit whose effective type **is** a standard DTCG type. If the type has a registered contract with a `valueSchema` (currently: dimension), validate `edit.value` against it exactly as today. If not (the fallback case), skip value-shape validation — `edit.value` was already validated as JSON-parseable client-side, and the wire body's `value` field is already a plain JS value (`z.unknown()` in `EditRequestSchema`) by the time it reaches this handler, not a JSON string — so no new parsing step is needed server-side, only the relaxed gating logic.
- Group-only edits (name-only, per the existing group branch) are unaffected by this feature.

## Acceptance Criteria

- [ ] AC-01: `token-core` exports a canonical list of valid DTCG `$type` values matching the 2025.10 spec's Type table.
- [ ] AC-02: A token file containing a token or group with an unrecognized `$type` (e.g. `"not-a-real-type"`) is flagged distinctly from both `valid` and `invalid` in `FolderOverview`, without changing today's `valid`/`invalid` classification for any existing fixture file.
- [ ] AC-03: In the token tree view, a token of a standard DTCG type with no registered editor (e.g. `fontWeight`, assuming no built-in exists for it at implementation time) renders name, description, and a JSON-text `$value` editor, and a valid edit round-trips through save/reload correctly.
- [ ] AC-04: Entering invalid JSON into the fallback editor's value field shows a field-level error and does not stage or save an edit, exactly mirroring `DimensionEditor`'s existing invalid-value UX.
- [ ] AC-05: A token whose effective `$type` is non-standard renders fully read-only (no name/description/value editing controls) regardless of whether an editor happens to be registered for that literal string.
- [ ] AC-06: `defineConfig` throws `DtcgEditorConfigError` when a user's `dtcg-editor.config.mts` registers an extension whose `type` is not a valid DTCG type.
- [ ] AC-07: `PATCH /api/tokens/[...path]` accepts an edit to any standard-type token (not just `dimension`) and rejects an edit to a non-standard-type token with a 400 `SaveError`-shaped response.
- [ ] AC-08: A test proves `resolveEditorForType`/`defineConfig`'s override-ordering (user extension beats a same-type built-in) and the fallback path (a standard type with no built-in gets the fallback editor), both derived dynamically from the live `BUILT_IN_TOKEN_TYPES` registry and FR-01's canonical list rather than a hardcoded type-name literal — see Non-Functional Requirements for why.
- [ ] AC-09: All existing dimension-editing tests/behavior (round-trip save, rename collision checks, group rename) continue to pass unmodified.

## Technical Scope

### Affected Modules

- `packages/token-core` — new canonical valid-type list (FR-01); no change to parsing/serialization logic itself.
- `packages/token-type-contract` — unaffected in its own contract shape; consumers of `TokenTypeContract` are unaffected.
- `apps/web-app/lib/token-editors/` (`types.ts`, `define-config.ts`, `resolve-editor.ts`, `built-in.ts`) — `TokenEditorExtension` shape change, type validation, resolution-by-type.
- `apps/web-app/lib/tokens/scan.ts` — `TokenFileSummary` gains the `standard` field; new non-standard-detection helper.
- `apps/web-app/components/FolderOverview.tsx` (+ its `.module.css`) — new badge state.
- `apps/web-app/components/TokenTree.tsx` — generalized `canEdit`/editor-resolution logic (FR-05), new fallback editor wiring.
- `apps/web-app/app/api/tokens/[...path]/route.ts` — generalized edit-authorization gate (FR-06).
- `apps/web-app/dtcg-editor.config.mts` — updated to the new `TokenEditorExtension` shape (FR-02).

### New Components Required

- A generic fallback editor component (JSON-text `$value` editor per FR-04) — package/location decided at `/sdd-plan` time. It is **not** a `TokenTypeContract<TValue>` implementation (no single fixed `type`, no `valueSchema` beyond "valid JSON"), so it does not live inside a `token-type-*` package the way `dimensionTokenType` does; it's app-level, generic UI.
- A non-standard-type-detection helper (walks a parsed `TokenDocument`/`PlainDtcgNode` tree checking each node's own declared `$type`, if present, against the FR-01 list).

### Integration Points

- `resolveEffectiveType` (`token-core`) — reused as-is on both client (`PlainDtcgNode.effectiveType`, already precomputed) and server (`route.ts` already calls it) to determine a token's type for both the fallback-eligibility check and the non-standard check.
- `applyTokenEdits` (`token-core`) — unchanged; already treats `value` as opaque `unknown`, so no change needed there for the fallback path.
- `useSaveTokenEdits` / `SaveError` — unchanged; a fallback-editor save failure surfaces through the exact same hook/error-display path dimension edits already use.

## Non-Functional Requirements

- **Test resilience to future built-in editors**: any test proving the fallback/override mechanism's genericity (AC-08) must derive its "type with a built-in" and "type without a built-in yet" fixtures dynamically from the live `BUILT_IN_TOKEN_TYPES` registry and the FR-01 canonical list — never a hardcoded literal like `"fontWeight"`. A hardcoded literal would silently start asserting a false premise ("no built-in editor exists for this type") the day a real editor for that type ships, without any test failure flagging the drift. See the User Stories/Open Questions discussion — this was raised and settled explicitly during scoping.
- **Spec compliance**: the FR-01 type list must be verifiably sourced from the DTCG 2025.10 Format Module spec, per `docs/project.md`'s "DTCG spec compliance is mandatory" constraint — not approximated from memory.
- **No new dependency**: JSON-text editing needs only `JSON.parse`/`JSON.stringify` (built-in); no new package required, consistent with the Minimal Dependencies constraint.
- **Security**: the fallback editor's JSON-parse path is client input at a genuine trust edge (per "Validation at the Edges") — `JSON.parse` must be wrapped/guarded (try/catch, not left to throw uncaught) both client-side (FR-04) and, since the wire value is already a parsed JS value by the time it reaches `route.ts`, no additional server-side JSON parsing is introduced.

## Out of Scope

- Building a real, shipped custom editor for any specific non-dimension DTCG type (e.g. color, fontWeight, border) — that remains separate backlog work (e.g. the existing "Support for colour tokens" backlog item). The fallback editor is intentionally generic, not a step toward a specific type's bespoke UI.
- Editing tokens with no effective `$type` at all (`effectiveType === undefined`) — these remain read-only exactly as today; deciding whether/how an untyped token should ever become editable is a separate concern.
- Letting a host app override or replace the fallback editor itself via config — the fallback is a fixed, built-in last resort applied only when `resolveEditorForType` finds no match for a standard type; `TokenEditorExtension` entries still only ever target one specific `type` each.
- Any change to `token-core`'s round-trip fidelity guarantees, `applyTokenEdits`'s batching/ordering behavior, or the group-rename edit path — all unaffected by this feature.
- Deep/structured editing UI for composite value shapes (e.g. a dedicated sub-field per property of a `border` or `shadow` token's object value) — the fallback editor's raw-JSON approach is the entire answer for composite shapes in this feature; a richer structured UI is future work once/if a type-specific editor is built.
- CI/lint enforcement of the new `TokenEditorExtension` shape beyond what `defineConfig`'s existing runtime validation already provides (no new ESLint rule).

## Open Questions

- Exact final location/naming for the FR-01 canonical type list and the FR-04 fallback editor component (e.g. package name, file name) — deferred to `/sdd-plan`, which is better positioned to fit these into the existing package layout.
- Exact wording/styling for the FR-03 "non-standard" badge — deferred to implementation; functionally it only needs to be visually distinct from `valid`/`invalid`.
- Whether `standard`/non-standard detection should also recurse into a group's own `$type` when the group itself has no children yet, or any other edge case in an empty/degenerate tree — deferred to `/sdd-plan`/`/sdd-implement`, expected to be a straightforward tree-walk with no special-casing needed.
