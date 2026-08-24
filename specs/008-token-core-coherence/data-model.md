# Phase 1 Data Model: token-core Coherence Pass

## Entity: `DtcgNode` (extended)

`TokenNode` and `GroupNode` (`packages/token-core/src/types.ts`) both gain two new fields, populated only by the new resolution pass (Research Task 2) — never by `parseTokenFile` directly, so a freshly-parsed, not-yet-resolved document has both as `undefined`/absent until the pass runs (see Note on required-vs-optional below):

| Field | Type | Meaning |
|---|---|---|
| `effectiveType` | `string \| undefined` | The node's resolved `$type`: its own `declaredType`, else the nearest ancestor's `declaredType`, else (new) the shape-inferred type from `classifyValue`, else `undefined`. Precedence order per FR-003. |
| `effectiveDeprecated` | `boolean \| string \| undefined` | The node's resolved `$deprecated`: its own `deprecated`, else the nearest ancestor's `deprecated`, else `undefined`. Same ancestor-precedence shape as `effectiveType`, generalized per Research Task 3. |

**Required vs. optional**: these fields are declared as required (`readonly effectiveType: string | undefined`, not `readonly effectiveType?: string`) on the type, matching this codebase's existing convention (`declaredType`, `description`, `deprecated` are all required-but-possibly-`undefined`, not optional). This means a `TokenNode`/`GroupNode` value that hasn't gone through the resolution pass is not structurally a valid `DtcgNode` after this change lands — `parseTokenFile` itself must call the resolution pass internally before returning (see below), so there is never an observable "unresolved" `DtcgNode` in the wild. This closes the gap Research Task 2 flagged (parse and resolve are conceptually separate steps, but the type system should not allow a caller to hold a node that skipped resolution).

**Revised Research Task 2 call-site decision**: given the required-field design above, `parseTokenFile` calls the new resolution pass internally as its final step (still conceptually a distinct function/module — `resolve-effective.ts` — just invoked from inside `parse.ts` rather than by every external caller). `applyTokenEdits` likewise calls it internally as its final step, after the edited tree is rebuilt. External callers (`read.ts`, `route.ts`) therefore need no change to *invoke* resolution — they already call `parseTokenFile`/`applyTokenEdits` — only to stop calling `resolveEffectiveType` themselves and read `node.effectiveType`/`node.effectiveDeprecated` instead (FR-005). This is a refinement of research.md's Research Task 2, made concrete once the field became required rather than optional.

## Entity: `TokenNode` (extended)

One additional field, distinct from `effectiveType`:

| Field | Type | Meaning |
|---|---|---|
| `inferredType` | `string \| undefined` | Present only when `declaredType` is `undefined` on the node itself (its ancestor chain may or may not have one) *and* `classifyValue` matched a single type from the token's own `$value` shape. This is the raw inference result before ancestor precedence is applied — it exists as its own field (separate from `effectiveType`) because FR-003b needs to distinguish "this type came from shape inference, offer it as an editable suggestion" from "this type came from declaration or ancestor inheritance, nothing to suggest." A token with an ancestor-declared type has `effectiveType` set but `inferredType` stays `undefined` (nothing to suggest — the type is already explicit at the group level, even if not on this token). |

Not added to `GroupNode`: shape-based inference only applies to a token's own `$value` (FR-001 says "from the shape of its `$value`"); a group has no `$value`; a group's `effectiveType` can therefore only ever come from its own `declaredType` or an ancestor's.

## Entity: `TokenEdit` (extended, `packages/token-core/src/edit.ts`)

| Field | Type | Meaning |
|---|---|---|
| `type` | `string \| undefined` (new, optional) | When present, sets the token's `declaredType` field, the same way `value`/`description`/`name` are already set. Applies to a token node only — `applyOneEdit`'s existing group-node branch (which already rejects `value`/`description` on a group) must be extended to also reject `type` on a group, for symmetry with FR-003a scoping this to "a token's declared `$type`," not a group's. |

No new validation of *what* `type` may be lives in `edit.ts` itself, consistent with the existing pattern (`edit.ts` "has no concept of what a 'valid' value is for any particular token type; that validation happens before an edit reaches here") — `isDtcgTokenType` (already exported, `token-types.ts`) is the validity check, applied at the same edge `route.ts` already applies it (`isDtcgTokenType` is already imported there for the existing type-authorization check at line ~185 per the current code).

## Entity: `EditRequestSchema` (extended, `apps/web-app/lib/tokens/edit-request.ts`)

The Zod schema for one edit in a `PATCH /api/tokens/[...path]` request body gains `type: z.string().optional()`, mirroring the existing `name`/`value`/`description` fields — validated at this edge (Principle IV) as "a string was provided," with `isDtcgTokenType` narrowing to a real DTCG type downstream in `route.ts`, exactly where the existing type-authorization check already runs.

## Entity: Effective type resolution result (from spec's Key Entities)

Realized concretely as the `effectiveType`/`effectiveDeprecated` fields above — this is not a separate object/type in the implementation, just the per-node materialized result the spec's Key Entities section describes abstractly.

## Entity: Type classification (from spec's Key Entities)

Realized concretely as the new `classify-value.ts` module: a function `classifyValue(value: unknown): DtcgTokenType | undefined` that iterates a registry of `(DtcgTokenType, ZodSchema)` pairs (currently `[["color", ColorValueSchema], ["dimension", DimensionValueSchema]]`), returns the single matching type if exactly one schema matches, and `undefined` if zero or more than one match (FR-002's ambiguity case).

## Round-Trip Fidelity Check (Principle IX / SC-007)

`serialize.ts`'s `nodeToRaw` reads `node.declaredType`/`node.description`/`node.deprecated`/`node.extensions` only — verified in Research (Phase 0) by reading the current source. This plan makes no change to `serialize.ts`; `effectiveType`/`effectiveDeprecated`/`inferredType` are new fields `nodeToRaw` never touches, so they are structurally incapable of being serialized unless a future change explicitly wires them in. `tasks.md` must include a regression test asserting a round-trip (parse → resolve → serialize → re-parse) of a token with only an *inferred* (not declared) type produces byte-identical `$type`-absence in the output — i.e., serializing never writes `effectiveType`/`inferredType` as `$type`.

## State Transition: inferred → declared type (User Story 1, Scenario 5)

1. Token parsed with no `declaredType` anywhere in its chain, `$value` shape unambiguously matches `color` → resolution pass sets `inferredType: "color"`, `effectiveType: "color"`.
2. Editor UI reads `inferredType`, pre-fills the type field with `"color"` as a suggestion (FR-003b) — this is a UI-layer read of an existing field, not a new `token-core` API.
3. User submits an edit accepting (or changing) the suggestion → `TokenEdit { path, type: "color" }` sent through `applyTokenEdits`.
4. `applyOneEdit` sets the token's `declaredType: "color"`.
5. The resolution pass (now invoked internally by `applyTokenEdits`, per the revised Research Task 2 decision above) re-runs → the token's `inferredType` becomes `undefined` (since `declaredType` is now set, `inferredType`'s precondition "declaredType is undefined on the node itself" no longer holds), `effectiveType` stays `"color"` but now sourced from declaration, not inference.
6. `serialize.ts` writes `$type: "color"` — now a normal, permanent declaration (matches Acceptance Scenario 4/5).

This transition requires no new state machine or persisted flag — "inferred vs. declared" is always re-derived fresh by the resolution pass from whether `declaredType` is set, so there's no risk of the two facts drifting apart.
