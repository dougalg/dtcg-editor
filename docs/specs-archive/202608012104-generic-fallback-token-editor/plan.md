# Implementation Plan: Generic Fallback Token Editor

## Overview

Six changes, all additive to the existing Config-Driven Token Editor Components mechanism:

1. `token-core` gains a canonical, spec-sourced list of valid DTCG `$type` values (FR-01) — the single source of truth every other change below reads from.
2. `TokenEditorExtension` changes from `{ filter, editor }` to `{ type, editor }`, with `defineConfig` validating `type` against that canonical list (FR-02).
3. `web-app` gains a non-standard-`$type` detector, surfaced as a new `standard` field on `TokenFileSummary` and a new badge in `FolderOverview` (FR-03).
4. A new generic, JSON-text fallback editor component ships in `web-app` (FR-04).
5. `TokenTree.tsx`'s `canEdit`/editor-resolution logic generalizes from "is this dimension" to a three-way split: non-standard (read-only), dimension (unchanged), other standard type (registered editor or fallback) (FR-05).
6. `route.ts`'s `patchTokenFile` generalizes its accept/reject gate the same way, minus the JSX (FR-06).

No new dependency is needed anywhere (`JSON.parse`/`JSON.stringify` are built-ins).

## Architecture Decisions

- **FR-01's list lives in `packages/token-core/src/token-types.ts`**, not `apps/web-app`, per the Token-Type Package Contract's "spec-parsing lives in its own package" principle and feature.md's explicit instruction. Exports `DTCG_TOKEN_TYPES` (a `readonly string[]` literal tuple), the derived union type `DtcgTokenType`, and a type-guard `isDtcgTokenType(value: string): value is DtcgTokenType` — the guard avoids every call site (`define-config.ts`, `standard-type.ts`, `TokenTree.tsx`, `route.ts`) hand-rolling its own `.includes()` check.
- **Type list, enumerated directly from the DTCG Format Module 2025.10 spec's Type section** (fetched and cross-checked against both the primitive-types and composite-types tables, not recalled from memory, per feature.md's explicit mandate): `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`, `strokeStyle`, `border`, `transition`, `shadow`, `gradient`, `typography`. 13 types total.
- **The non-standard-detection tree-walk (FR-03) lives in `apps/web-app/lib/tokens/standard-type.ts`, not `token-core`.** `token-core` owns the canonical _list_ (a spec fact); "walk this document and flag it if any node's own declared `$type` isn't in that list" is app-level classification behavior consumed only by `scan.ts`/`FolderOverview`, consistent with the existing Architecture Decision that "the core engine never hard-codes an 'is this token's type currently editable' policy" — the same reasoning extends to this closely-related classification policy. It operates on `token-core`'s exported `DtcgNode`/`GroupNode`/`TokenDocument` types the same way `plain-node.ts`/`edit-state.ts` already do.
- **`TokenEditorExtension.type` is typed as plain `string`, not `DtcgTokenType`.** `defineConfig` is the actual enforcement point (a runtime check, since `type` is user-authored data in a `.mts` file); typing the field as the union wouldn't change that (a config author can always write a string literal that happens to be wrong), and keeps `types.ts` from needing a compile-time dependency on `token-core`'s exact union beyond what `defineConfig` already needs for its runtime check.
- **Generalizing the "registered editor" branch beyond dimension.** FR-05's first bullet ("Standard type with a registered editor → editable via that editor, validated by that type's own contract schema") is written generically, not dimension-specific — and today, `TokenTree.tsx`'s `canEdit` gate is hard-coded to `isDimension` _before_ `resolveEditorForType` is even consulted, so a user-registered editor for any other type would silently never render even though `defineConfig`/`resolveEditorForType` already resolve it correctly. This is exactly the "config layer... only wired up on the client-render path" gap feature.md's Summary calls out. Fix: three render branches in `TreeNode`, not two —
  1. `effectiveType === "dimension"` → unchanged today's path (`validateDimensionValue`, `DimensionEditorComponent` cast, existing-value gate).
  2. `effectiveType` is standard, not dimension, and `resolveEditorForType` finds a match → render that editor generically (`TokenTypeEditorProps<unknown>`), staging `onChange`'s value as-is (no schema to validate against — no built-in contract exists for any type but dimension yet, mirroring FR-04's own "no schema beyond JSON-parseability" reasoning).
  3. `effectiveType` is standard, not dimension, and no editor resolves → FR-04's fallback editor.
     Branch 2 has no shipped built-in consumer yet (no non-dimension token-type package exists) — it's exercised by a synthetic test extension only, proving the mechanism rather than a real editor. This directly mirrors `route.ts`'s FR-06 gate, which also only special-cases dimension and treats every other standard type identically (skip value-shape validation) regardless of _why_ no schema applies.
- **The fallback editor is `TokenTypeEditorProps<string>`-shaped** (the JSON _text_, not the parsed value) — `apps/web-app/components/FallbackValueEditor.tsx` is a dumb controlled `<textarea>` that calls `onChange(nextText)` on every keystroke and does no parsing itself. `TreeNode` owns the `JSON.parse`/try-catch and error-surfacing, exactly mirroring how `DimensionEditor` does trivial input-level filtering (`Number.isNaN` check) while `TreeNode.handleValueChange` owns the real `validateDimensionValue` call and `onFieldError`/`onStageEdit` wiring. Keeps validation logic centralized in one place (`TreeNode`) rather than duplicated per editor component.

## Implementation Steps

### Step 1: Canonical DTCG Type Registry (`token-core`) ✅

- [x] Create `packages/token-core/src/token-types.ts`:
  - `export const DTCG_TOKEN_TYPES = ["color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"] as const;`
  - `export type DtcgTokenType = (typeof DTCG_TOKEN_TYPES)[number];`
  - `export function isDtcgTokenType(value: string): value is DtcgTokenType`
  - Doc comment citing the DTCG Format Module 2025.10 spec URL as the source, so a future spec-version bump has an obvious place to update.
- [x] Export `DTCG_TOKEN_TYPES`, `DtcgTokenType`, `isDtcgTokenType` from `packages/token-core/src/index.ts`.
- Files: `packages/token-core/src/token-types.ts` (new), `packages/token-core/src/token-types.test.ts` (new, `node:test` — asserts the exact 13-member list, `isDtcgTokenType` true/false cases), `packages/token-core/src/index.ts` (modified).
- Verified: `pnpm --filter @dtcg-editor/token-core build` and `test` both pass (31/31 tests).

### Step 2: `TokenEditorExtension` Shape Change (`web-app` config layer) ✅

- [x] `apps/web-app/lib/token-editors/types.ts`: replace `TokenFilterMetadata` + `filter` field with `readonly type: string`; remove the now-dead `TokenFilterMetadata` export and the `TokenType` re-export it depended on (keep `TokenType` importable from `built-in.ts` directly where still needed).
- [x] `apps/web-app/lib/token-editors/built-in.ts`: `builtInExtensions` maps `BUILT_IN_TOKEN_TYPES` to `{ type, editor }` instead of `{ filter, editor }`.
- [x] `apps/web-app/lib/token-editors/resolve-editor.ts`: `resolveEditorForType` becomes `extensions.find((entry) => entry.type === type)?.editor` — drop the `TokenType` cast entirely (plain string equality needs no widening trick).
- [x] `apps/web-app/lib/token-editors/define-config.ts`: `describeInvalidExtension` gains a `type` check — must be a non-empty string, and (new) must satisfy `isDtcgTokenType` from `@dtcg-editor/token-core`; on failure push `` `extensions[${index}].type must be a valid DTCG token type, got "<value>"` `` (or `must be a string` if not a string at all) into `issues`. Import `isDtcgTokenType` from `@dtcg-editor/token-core`.
- [x] `apps/web-app/dtcg-editor.config.mts`: no change needed — its `extensions: []` is already shape-agnostic (empty array).
- Files: `types.ts`, `built-in.ts`, `resolve-editor.ts`, `define-config.ts` (all modified).

### Step 3: Non-Standard Type Detection (`web-app` scan layer) ✅

- [x] Create `apps/web-app/lib/tokens/standard-type.ts` exporting `isTokenDocumentStandard(document: TokenDocument): boolean` — recursively walks `document.root`'s `children` (a `GroupNode`'s `Map`), returning `false` as soon as any node (token or group) has `declaredType !== undefined && !isDtcgTokenType(declaredType)`; `true` if the whole tree is clean (including an empty root). Pure function, no injected dependencies (operates on an already-parsed, in-memory tree).
- [x] `apps/web-app/lib/tokens/scan.ts`: `TokenFileSummary`'s `valid: true` variant gains `readonly standard: boolean`. `scanTokenDirectory`'s per-file `.map` calls `isTokenDocumentStandard(result.value)` on success and threads it into the returned summary. The `valid: false` variant is untouched.
- [x] `apps/web-app/components/FolderOverview.tsx`: when `file.valid && !file.standard`, render an additional badge (e.g. `styles.badgeNonStandard`, text `non-standard`) alongside `styles.badgeValid`, without touching the `valid`/`invalid` rendering branches.
- [x] `apps/web-app/components/FolderOverview.module.css`: add `.badgeNonStandard` (visually distinct color from both `.badgeValid`'s green and `.badgeInvalid`'s red — e.g. an amber/orange, consistent with the existing badge sizing rules).
- Files: `standard-type.ts` (new) + `standard-type.test.ts` (new, Vitest — empty tree, all-standard tree, a group-level non-standard `$type`, a token-level non-standard `$type`, an inherited-from-ancestor case that stays standard), `scan.ts` (modified), `scan.test.ts` (modified: existing "valid" assertions gain `standard: true`; new test with a fixture file containing an unrecognized `$type` asserting `standard: false`), `FolderOverview.tsx` (modified), `FolderOverview.module.css` (modified), `FolderOverview.test.tsx` (new — no test file exists today; covers AC-02 directly: valid+standard shows only the valid badge, valid+non-standard shows both, invalid is unaffected).

### Step 4: Generic Fallback Editor Component (`web-app` UI) ✅

- [x] Create `apps/web-app/components/FallbackValueEditor.tsx`: `TokenTypeEditorProps<string>`-typed component (`{ value, onChange }` where `value`/`onChange` carry the JSON _text_, not the parsed value). Renders a `<label>`-wrapped `<textarea>` (visible label text, matching the Editable Group Names convention — no bare `aria-label`), value bound to the incoming text, `onChange` firing on every `ChangeEvent<HTMLTextAreaElement>` with `event.target.value`. No parsing/validation inside this component — pure controlled input.
- [x] `apps/web-app/components/FallbackValueEditor.module.css`: minimal styling (monospace textarea, small size hint) consistent with `TokenTree.module.css`'s existing monospace tree font.
- Files: `FallbackValueEditor.tsx` (new), `FallbackValueEditor.module.css` (new), `FallbackValueEditor.test.tsx` (new — renders with a value, types into it, asserts `onChange` receives the raw text unmodified; this component intentionally has zero validation logic to test).

### Step 5: Client-Side `canEdit` Generalization (`TokenTree.tsx`) ✅

- [x] Import `DTCG_TOKEN_TYPES`/`isDtcgTokenType` from `@dtcg-editor/token-core` and `FallbackValueEditor` from `./FallbackValueEditor.tsx`.
- [x] In `TreeNode`, replace the `isDimension`/`canEdit` computation with:
  - `isStandard = node.effectiveType !== undefined && isDtcgTokenType(node.effectiveType)`
  - `isDimension = node.effectiveType === dimensionTokenType.type` (unchanged)
  - `resolvedEditor = isStandard ? resolveEditorForType(dtcgEditorConfig.extensions, node.effectiveType) : undefined`
  - `canEdit = isStandard && (isDimension ? existingValueValidation?.ok === true : true)` (existing dimension value-validity gate preserved verbatim for dimension only)
- [x] Read-only branch (`!canEdit`) is otherwise unchanged, **except**: when `node.effectiveType !== undefined && !isStandard`, the existing type-display `<span>` gets a visible non-standard indicator (e.g. appended text or a dedicated small badge span next to `{node.name} type`) — reuses the existing conditional block, doesn't add a new one.
- [x] Editable branch splits into three JSX cases keyed off `isDimension` / `resolvedEditor !== undefined`:
  1. `isDimension` → existing `EditorComponent`/`handleValueChange`/`DimensionEditorComponent` code, verbatim.
  2. `!isDimension && resolvedEditor !== undefined` → render `resolvedEditor` generically with `value={pending?.value ?? node.value}` and a new `handleGenericValueChange(next: unknown)` that stages directly (`onFieldError` cleared, `onStageEdit(node.path, { value: next })` — no schema call).
  3. `!isDimension && resolvedEditor === undefined` → render `FallbackValueEditor` with `value={JSON.stringify(pending?.value ?? node.value, null, 2)}` and a new `handleFallbackValueChange(nextText: string)` that `try`/`catch`es `JSON.parse(nextText)`: catch → `onFieldError(node.path, { name: errors?.name, value: "Invalid JSON: <message>" })`, no stage; success → clear the value error and `onStageEdit(node.path, { value: parsed })`.
- Files: `apps/web-app/components/TokenTree.tsx` (modified).

### Step 6: Server-Side Edit Authorization Generalization (`route.ts`) ✅

- [x] Import `isDtcgTokenType` from `@dtcg-editor/token-core`.
- [x] Replace the current `if (effectiveType !== dimensionTokenType.type)` rejection with two checks:
  1. Reject (400, `kind: "validation"`) if `effectiveType === undefined || !isDtcgTokenType(effectiveType)` — message e.g. `` `Only standard DTCG token types can be edited, "${effectiveType ?? "untyped"}" cannot` ``.
  2. If `effectiveType === dimensionTokenType.type`, validate `edit.value` against `dimensionTokenType.valueSchema` exactly as today (unchanged block).
  3. Else (standard, non-dimension): skip value-shape validation entirely — `value = edit.value` passed through as-is into the `TokenEdit` (the wire body's `value` is already a parsed JS value per `EditRequestSchema`'s `z.unknown()`, so no new parsing is introduced here, per the Security NFR).
- Files: `apps/web-app/app/api/tokens/[...path]/route.ts` (modified).

### Step 7: Update Existing Tests for the New Shapes ✅

- [x] `apps/web-app/lib/token-editors/resolve-editor.test.ts`: rewrite fixtures from `{ filter, editor }` to `{ type, editor }`; drop the now-unneeded `TokenFilterMetadata`-widening comment/workaround (plain string equality needs no cast).
- [x] `apps/web-app/lib/token-editors/define-config.test.ts`: rewrite every fixture to `{ type: "dimension", editor }` (or another valid type); add new tests for AC-06 — `type` missing/not-a-string → `DtcgEditorConfigError`, `type: "not-a-real-type"` → `DtcgEditorConfigError`; extend AC-08 coverage here or in `resolve-editor.test.ts` (whichever reads more naturally) with a test that picks a type dynamically: `DTCG_TOKEN_TYPES.find((t) => !BUILT_IN_TOKEN_TYPES.includes(t))` and asserts a user extension for it round-trips through `defineConfig`/`resolveEditorForType` — never a hardcoded type literal, per the NFR.
- [x] `apps/web-app/components/TokenTree.override.test.tsx`: update the mocked `user-config.ts` module from `{ filter, editor }` to `{ type: "dimension", editor }`.
- [x] `apps/web-app/components/TokenTree.test.tsx` (plus new `TokenTree.generic-editor.test.tsx` for the FR-05 registered-non-dimension-editor branch, split into its own file for `vi.mock`'s file-scoping):
  - The existing `"red"` token fixture (`$type: "color"`) currently asserts fully-read-only behavior — under the new rules `color` is a standard type with no built-in editor, so it becomes fallback-editable. Change its `declaredType`/`effectiveType` to a genuinely non-standard value (e.g. `"not-a-real-type"`) to keep exercising the true read-only path, and update the test's assertions/name accordingly (no longer "AC-01" from the prior feature — retarget to this feature's AC-05).
  - Add a new test (AC-03/AC-04) using a type computed the same NFR-safe way as Step 7's `define-config.test.ts` case (a `DTCG_TOKEN_TYPES` member absent from `BUILT_IN_TOKEN_TYPES`) proving: renders name/description/JSON-text value editor, a valid JSON edit stages and round-trips through `handleSave`, invalid JSON shows a field error and does not stage (mirrors the existing "keeps a pending edit visible... after a failed save" style).
  - Add a small new test (no AC number — proves the FR-05 "registered non-dimension editor" branch, Architecture Decisions above) using the same `vi.mock`-on-`user-config.ts` pattern as `TokenTree.override.test.tsx`, registering `{ type: <a non-dimension standard type>, editor: <trivial synthetic editor> }` and asserting it renders instead of the fallback editor.
- [x] `apps/web-app/app/api/tokens/[...path]/route.test.ts`:
  - `"PATCH returns 400 when attempting to edit a non-dimension token"` currently uses `$type: "color"`, which must now succeed (color is standard). Change its fixture to a non-standard `$type` (e.g. `"not-a-real-type"`) so it keeps testing the _reject_ path; rename to reflect "non-standard" rather than "non-dimension".
  - Add a new test (AC-07) asserting a PATCH to a standard-but-non-dimension token (e.g. `$type: "color"`, arbitrary `value`) returns 200 and the value round-trips to disk untouched (no schema coercion).
- Files: all six test files above (modified).

## Acceptance Criteria Mapping

| AC                                                                         | Verified By                                                                                                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01: canonical DTCG type list matches 2025.10 spec                       | `packages/token-core/src/token-types.test.ts`                                                                                            |
| AC-02: non-standard file flagged distinctly, valid/invalid unchanged       | `apps/web-app/components/FolderOverview.test.tsx`, `apps/web-app/lib/tokens/scan.test.ts`                                                |
| AC-03: standard-no-builtin token gets JSON editor, round-trips             | `apps/web-app/components/TokenTree.test.tsx` (new fallback test), `apps/web-app/app/api/tokens/[...path]/route.test.ts` (new AC-07 test) |
| AC-04: invalid JSON shows field error, does not stage                      | `apps/web-app/components/TokenTree.test.tsx` (new fallback test)                                                                         |
| AC-05: non-standard token stays fully read-only regardless of registration | `apps/web-app/components/TokenTree.test.tsx` (retargeted "red"/non-standard test)                                                        |
| AC-06: `defineConfig` throws on invalid `type`                             | `apps/web-app/lib/token-editors/define-config.test.ts`                                                                                   |
| AC-07: PATCH accepts any standard type, rejects non-standard               | `apps/web-app/app/api/tokens/[...path]/route.test.ts`                                                                                    |
| AC-08: override-ordering + fallback path, derived dynamically              | `apps/web-app/lib/token-editors/resolve-editor.test.ts`, `define-config.test.ts`                                                         |
| AC-09: existing dimension-editing tests pass unmodified                    | `apps/web-app/components/TokenTree.test.tsx`, `route.test.ts`, `edit-state.test.ts` (all pre-existing dimension cases, unchanged)        |

## Risks & Mitigations

- **Risk**: the DTCG spec's Type table changes in a future spec revision, silently stranding `DTCG_TOKEN_TYPES`. → Mitigation: single export, doc-commented with the exact spec version/URL it was sourced from, so a future bump has one obvious place to update (already the design token-core's Round-Trip Fidelity constraint anticipates for versioning generally).
- **Risk**: a hardcoded "type with no built-in" test literal (e.g. `"fontWeight"`) silently starts asserting a false premise the day a real editor for that type ships. → Mitigation: every such fixture is derived from `DTCG_TOKEN_TYPES.find((t) => !BUILT_IN_TOKEN_TYPES.includes(t))` at test-run time (Step 7), per the NFR.
- **Risk**: the new "registered non-dimension editor" render branch (Step 5, case 2) has no real shipped consumer, so it's easy to accidentally regress without noticing. → Mitigation: covered by a dedicated synthetic-extension test (Step 7) even though no AC numbers it directly — it's required by FR-05's literal wording and the "config layer... only wired up on the client-render path" bug the feature exists to fix.
- **Risk**: changing `TokenFileSummary`'s `valid: true` shape (adding `standard`) could break a consumer that destructures the union narrowly. → Mitigation: grep confirms the only consumers are `scan.ts` itself, `FolderOverview.tsx`, and `app/api/tokens/route.test.ts` (which only asserts `valid: boolean`, unaffected); `page.tsx` passes the whole array through opaquely.

## Estimated Complexity

Medium — no new architectural layer or dependency, but the change touches seven existing modules across three packages plus their tests, and Step 5's three-way branch in `TokenTree.tsx` needs care to keep the unchanged dimension path byte-for-byte behaviorally identical (AC-09).
