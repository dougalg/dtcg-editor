# Feature Specification: token-core Coherence Pass

**Feature Branch**: `worktree-styleframe-dtcg-refactor`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Improve token-core's internal coherence, independent of any @styleframe/dtcg dependency adoption (per the design-only track "(b)" from the styleframe/dtcg spike findings in docs/research/styleframe-dtcg-spike.md's Pass 4 and the styleframe/dtcg backlog item in docs/backlog.md): 1. Add a classifyValue-style type-inference fallback for untyped tokens so tokens with no declared `$type` anywhere in their ancestor chain become editable instead of dead weight. 2. Turn `resolveEffectiveType` from an ad hoc per-call-site walk (4 call sites today) into a single upfront pass that resolves every node's effective type (and deprecation) once. 3. Add a README to `packages/token-core` documenting its purpose, pipeline shape, and public API surface. 4. Look for other opportunities to make token-core's existing functions more coherent (naming, structure, duplicated logic) — but do not adopt @styleframe/dtcg as a dependency; this is a design-only pass based on the library's documented pipeline shape as a reference, not a code swap. Additionally: allow a token's inferred type to be written into the document as an explicit `$type` via the same ordinary edit-and-save mechanism used for any other field — pre-filled as a suggestion, never written automatically."

## Clarifications

### Session 2026-08-25

- Q: When a document is edited (a value, name, or type change), should the effective-type/deprecated resolution re-run over the entire document, or only recompute the parts actually affected by that edit? → A: Full re-run — re-walk the whole document and recompute every node's effective fields after any edit batch.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Untyped tokens become editable instead of dead weight (Priority: P1)

As a token-editor user, when I open a token file that has a value but no `$type` declared on the token itself or any ancestor group, I can still see and edit that token in the editor, with its type inferred from the shape of its value — instead of hitting a hard rejection that treats the token as unsupported.

**Why this priority**: This is the only user-facing (not just maintainer-facing) change in this feature. Today, an untyped token with an otherwise well-formed value (e.g. a bare `{ colorSpace, components }` object with no `$type`) is invisible to editing entirely, even though its type is unambiguous from its shape. This is the core value delivered by the type-inference fallback.

**Independent Test**: Load a token document containing at least one token with a well-formed value but no declared `$type` anywhere in its ancestor chain. Confirm the editor shows it as editable with a correctly inferred type badge, and that saving an edit to it round-trips correctly.

**Acceptance Scenarios**:

1. **Given** a token whose value unambiguously matches the shape of exactly one DTCG type (e.g. a `{colorSpace, components}` object matching only the `color` type) and has no `$type` declared on itself or any ancestor, **When** the document is loaded, **Then** the token's effective type resolves to that inferred type and the token is editable.
2. **Given** a token whose value shape is genuinely ambiguous between two or more DTCG types (e.g. a bare number matching both `number` and `duration` shapes) and has no declared `$type` anywhere in its chain, **When** the document is loaded, **Then** the system falls back to its existing untyped-token behavior (not editable) rather than guessing incorrectly — this is a case the design must explicitly define, not silently break.
3. **Given** a token whose value shape matches no known DTCG type at all (garbage/malformed value) and has no declared `$type`, **When** the document is loaded, **Then** the token is treated as untyped, exactly as it is today.
4. **Given** a token with an explicitly declared `$type` (on itself or an ancestor), **When** the document is loaded, **Then** the declared type is used as before — type inference never overrides an explicit declaration.
5. **Given** a token whose type was inferred (not declared) per Acceptance Scenario 1, **When** the editor shows the token's type field pre-filled with the inferred type as a suggested value and the user submits an edit accepting it (the same save action used for any other field edit), **Then** the token's `$type` field is set to the inferred type in the saved document, and from that point on the type is a normal declared type (no longer inferred, per Acceptance Scenario 4).
6. **Given** a token whose type was inferred, **When** the document is loaded, saved via an edit to a different field, or otherwise not the subject of a submitted type edit, **Then** the inferred type is NOT written into the document — writing it always requires the same explicit, per-token edit-and-save action as any other field change, never happening as a side effect of an unrelated edit.

---

### User Story 2 - Effective type/deprecation is resolved once, not re-walked per call site (Priority: P2)

As a maintainer of this codebase, when I need to know a node's effective `$type` or effective `$deprecated` status anywhere downstream of parsing, I read an already-resolved field on the node rather than re-invoking an ancestor-walk with a freshly-assembled ancestor list — so there's exactly one place where "how inheritance works" is decided, and every call site trusts it.

**Why this priority**: This is a maintainability improvement, not a behavior change users can observe directly — it removes duplicated logic (today re-derived independently in 4 places: `route.ts`, `reference-index.ts` ×2, `plain-node.ts`) and the risk of those 4 call sites silently drifting apart over time. It depends on User Story 1 being resolved first, since the upfront pass is the natural place to also materialize the type-inference fallback's result.

**Independent Test**: Grep the codebase for the ancestor-walking pattern currently duplicated at the 4 known call sites; confirm none remain after this change, and that each of those 4 call sites instead reads a field already present on the node it already has in hand. Run the full existing test suite for all 4 affected files and confirm no behavior regression.

**Acceptance Scenarios**:

1. **Given** a parsed token document, **When** the upfront resolution pass runs, **Then** every node in the tree has its effective `$type` and effective `$deprecated` status materialized as a field, computed exactly once per node.
2. **Given** the 4 existing call sites that previously re-derived effective type via ancestor walking, **When** this change lands, **Then** each of them reads the materialized field instead of re-walking ancestors, and produces identical results to before for every existing passing test.
3. **Given** the existing `resolveEffectiveType`/`findNode` public functions in `token-core` are consumed outside this repo's own call sites is not a stated constraint, **When** the upfront pass replaces ad hoc walking, **Then** the maintainers document (in the Assumptions section below) whether the old per-call-site walking function is removed, deprecated, or kept as a lower-level primitive the upfront pass is built on.

---

### User Story 3 - token-core has a README explaining its shape (Priority: P3)

As a developer new to this codebase (or an existing maintainer returning to it after time away), I can read a single `README.md` in `packages/token-core` and understand what the package is for, what its parse → resolve → edit → serialize pipeline looks like, and what its public API surface is — without having to reverse-engineer it from `index.ts`'s export list and every source file.

**Why this priority**: Pure documentation, no behavior risk — but genuinely useful, and cheapest to get wrong by writing something that goes stale immediately. It is ordered last because it should describe the *result* of Stories 1 and 2 (the new upfront-resolution pass, the type-inference fallback), not the pre-change shape.

**Independent Test**: A reviewer unfamiliar with `token-core`'s internals reads only the new README and can correctly answer: what does this package parse, what does "effective type" mean and where is it resolved, what does the public API expose, and what does this package deliberately not do (e.g. no dependency on `@styleframe/dtcg`, no filesystem/network access).

**Acceptance Scenarios**:

1. **Given** the new `packages/token-core/README.md`, **When** a developer reads it, **Then** it documents the package's purpose, its pipeline stages in order, and its full public API surface (everything re-exported from `index.ts`), each with a one-line description.
2. **Given** the README documents the pipeline shape, **When** compared against the actual code after this feature lands, **Then** it accurately reflects the post-change shape (including the upfront type/deprecation resolution pass from User Story 2), not the pre-change one.

---

### User Story 4 - Other coherence issues found during this pass are fixed or logged (Priority: P4)

As a maintainer, while working through Stories 1–3, if the person doing the work notices other naming, structural, or duplicated-logic issues in `token-core`'s existing functions, those are either fixed as part of this same pass (if small and low-risk) or explicitly recorded (e.g. as new backlog items) rather than silently ignored — but no such fix is made speculatively; each one must be tied to something actually observed while touching this code.

**Why this priority**: Lowest priority and intentionally open-ended — this is "if we're in here anyway" cleanup, not a specified deliverable with its own acceptance criteria, and must not expand scope unpredictably or delay Stories 1–3.

**Independent Test**: After implementation, review the change diff and confirm every coherence fix outside the scope of Stories 1–3 is both small (localized, no public API break) and traceable to a one-line rationale in the commit/PR description; anything larger is a new backlog item, not an in-place change.

**Acceptance Scenarios**:

1. **Given** a coherence issue is noticed during this work that is small and low-risk to fix immediately, **When** the fix is made, **Then** it does not change any public API signature relied upon by `apps/web-app` or the `token-editor-*` packages without those call sites being updated in the same change.
2. **Given** a coherence issue is noticed that is larger or riskier (e.g. would require a public API break, or touches code outside `token-core`), **When** it is found, **Then** it is recorded as a new `docs/backlog.md` item instead of being folded into this change.

### Edge Cases

- What happens when a token's value shape is ambiguous between multiple DTCG types (e.g. a bare number could be `number`, `duration`, or `fontWeight` depending on convention) and no `$type` is declared anywhere in its chain? (Covered by User Story 1, Acceptance Scenario 2 — falls back to today's untyped/non-editable behavior rather than guessing.)
- What happens to a group node's own effective type/deprecated fields (not just leaf tokens) under the new upfront pass — are groups materialized the same way as tokens?
- Does the type-inference fallback apply to a token nested inside a *group* that itself has no declared type, where inference must consider the whole chain, or only to root-level/directly-inspected tokens?
- What happens when a document is edited after load (a token's value changes shape)? The whole document's effective-type/deprecated resolution re-runs from scratch as part of applying the edit — there is no incremental/partial recompute (see Clarifications).
- What happens if the token's value changes shape (via a concurrent or prior edit) between when the inferred type was shown and when the user submits the edit accepting it? (No different from any other stale-edit conflict this editor's existing edit pipeline already has to handle — this feature does not need a new conflict-resolution mechanism beyond what a normal field edit already uses.)
- What happens if the user submits an edit setting a token's declared type to the inferred value, on a token that sits inside a group with its own declared `$type` different from the inferred one? (Writing an explicit `$type` on the token itself is still valid per FR-003's precedence rules — an explicit declaration on the token always wins over ancestor inheritance — so this is expected, not an error.)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `token-core` MUST infer a token's type from the shape of its `$value` when no `$type` is declared on the token itself or any ancestor group, for any value shape that unambiguously matches exactly one of the DTCG spec's defined token types.
- **FR-002**: `token-core` MUST NOT infer a type when a token's value shape is ambiguous between two or more DTCG token types, or matches none of them — such tokens remain "untyped" exactly as they behave today.
- **FR-003**: An explicitly declared `$type` (on the token or an ancestor) MUST always take precedence over shape-based inference; inference only applies when no declared type exists anywhere in the chain.
- **FR-003a**: `token-core`'s existing token-edit mechanism MUST support setting a token's declared `$type` as an ordinary editable field, the same way it already supports editing `value`, `description`, and `name` — writing an inferred type into the document is just a normal edit to that field, not a distinct operation with its own approval mechanism.
- **FR-003b**: The editor MUST pre-fill a token's type field with its inferred type (when one exists) as a suggested value the user can accept or change before submitting, rather than writing it automatically on load or as a side effect of an unrelated edit.
- **FR-004**: `token-core` MUST provide a single upfront resolution pass over a parsed document that computes and materializes each node's effective `$type` (including the User Story 1 inference fallback) and effective `$deprecated` status exactly once per node.
- **FR-004a**: This resolution pass MUST re-run over the entire document (not an incremental/partial recompute of only the changed node(s)) any time a document is produced, whether by initial parse or by applying a batch of edits — every node's materialized fields MUST reflect the document's current state after the most recent parse or edit.
- **FR-005**: The 4 known call sites currently re-deriving effective type via ancestor walking (`apps/web-app/app/api/tokens/[...path]/route.ts`, `apps/web-app/lib/tokens/reference-index.ts` ×2, `apps/web-app/lib/tokens/plain-node.ts`) MUST be updated to read the materialized field from the upfront pass instead of re-walking ancestors themselves.
- **FR-006**: The editor's existing rejection of edits to untyped tokens MUST continue to apply only to tokens that remain untyped after the inference fallback — a token whose type was successfully inferred MUST be editable through the same paths as an explicitly-typed token.
- **FR-007**: `packages/token-core` MUST have a `README.md` documenting the package's purpose, its pipeline stages in order (including the new upfront resolution pass), and its full public API surface as re-exported from `index.ts`.
- **FR-008**: This feature MUST NOT add `@styleframe/dtcg` (or any other new runtime dependency) to `token-core`'s `package.json` — all changes are hand-rolled, informed by the library's documented pipeline shape as a design reference only.
- **FR-009**: Any coherence fix made under User Story 4 that changes a function's name or signature MUST update every call site across the monorepo in the same change; any coherence issue too large to fix this way MUST be recorded as a new `docs/backlog.md` item instead.
- **FR-010**: All existing `token-core` unit tests, and all existing tests in the 4 affected `apps/web-app` files, MUST continue to pass after this change, except where a test is deliberately updated because it exercised the old untyped-token-is-never-editable behavior that User Story 1 intentionally changes.

### Key Entities

- **Effective type resolution result**: The per-node outcome of the upfront pass — a node's resolved `$type` (from declaration, ancestor inheritance, or shape-based inference, in that precedence order) and resolved `$deprecated` status, materialized once and read thereafter rather than recomputed.
- **Type classification**: The shape-based inference step — given a token's raw `$value` and no declared type in its chain, either a single unambiguous DTCG type or "no match" (remains untyped).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A token with a well-formed, unambiguous value and no declared `$type` anywhere in its chain is editable in the token editor, where before this change it was not.
- **SC-002**: Zero call sites in the monorepo independently re-walk a node's ancestor chain to compute effective type or deprecation status after this change lands (all read the materialized field from the single upfront pass).
- **SC-003**: A developer unfamiliar with `token-core` can correctly describe its pipeline stages and public API after reading only its new README, without reading source files.
- **SC-004**: 100% of `token-core`'s existing unit tests and the existing tests in the 4 affected `apps/web-app` files pass after this change, with any intentionally-changed test explicitly tied to the User Story 1 behavior change.
- **SC-005**: `token-core`'s `package.json` has no new runtime dependency on `@styleframe/dtcg` or any other package introduced by this feature.
- **SC-006**: A user can turn a token's inferred type into a permanently declared type by submitting an edit to its type field (pre-filled with the suggestion), the same way they'd edit any other field, and that type survives a reload of the document (it is now a normal declaration, not an inference).
- **SC-007**: Zero inferred types are ever written into a saved document except as the direct result of a submitted edit to that token's type field — verified by the absence of any code path that persists an inferred type as a side effect of another operation (load, save, or an edit to a different field).

## Assumptions

- "Coherent" in User Story 4 is judged by this repo's existing conventions (naming already used elsewhere in `token-core`, e.g. `resolveEffectiveType`/`findNode`'s existing style) rather than by adopting `@styleframe/dtcg`'s own naming or structure — the library is a reference for pipeline *shape* (its staged `parse → validate → applyInheritance → resolveAliases` flow), not a naming or API template.
- The type-inference fallback's ambiguity rule (User Story 1, Acceptance Scenario 2) uses the same "shape unambiguously matches exactly one DTCG type" test the `@styleframe/dtcg` spike found the library's own `classifyValue` relies on (with an optional path-based tiebreaker for known ambiguous cases, at the implementer's discretion) — this feature does not need to invent a new disambiguation strategy from scratch, only decide whether to build one hand-rolled or leave genuinely ambiguous cases untyped.
- The existing lower-level `resolveEffectiveType`/`findNode` functions in `resolve-type.ts` may be kept as internal primitives the new upfront pass is built on (rather than deleted), since other code in the monorepo may depend on their current exported signatures; the implementer decides during planning whether to keep, deprecate, or remove them, and records that decision — this is intentionally left open rather than mandated here, per User Story 2's Acceptance Scenario 3.
- This feature is scoped to `packages/token-core` and the 4 named `apps/web-app` call sites; it does not touch `token-editor-*` packages' own internals beyond however they already consume `token-core`'s public API.
- No new persistent storage, network calls, or external service integrations are introduced — this remains a pure, in-memory data-transformation package as it is today.
