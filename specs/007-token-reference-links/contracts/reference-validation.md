# Contract: reference-aware validation (client + server, mirrored)

The single most failure-prone part of this feature. `docs/history.md` (2026-08-02) records that a previous failure to generalize this exact client/server pair caused **both** a real client crash **and** a server-side unvalidated-write hole. `route.ts` carries an explicit comment that it "Mirrors `TokenTree.tsx`'s client-side `canEdit` guard". Both sides change together or neither does.

## The rule

> A value that is a valid DTCG reference is **not** subject to the target type's `valueSchema`.

Per the DTCG spec an aliasing token's type is the resolved type of its target, so a reference is valid for *any* `$type`. It is a property of the value's **form**, not of any one type's schema.

## Where the check goes

**Above** `validateTokenValue`, on both sides. `TokenTypeContract` is **not** modified and no `valueSchema` gains a reference branch (research.md §6).

### Client — `apps/web-app/components/TreeTokenNode/TreeTokenNode.tsx`

The existing dispatch computes:

```ts
const contract = isUsableType ? resolveBuiltInContract(effectiveType) : undefined;
const validation = contract ? validateTokenValue(contract, node.value) : undefined;
const isValid = isUsableType && (contract === undefined || validation?.isOk());
```

A reference check is inserted before this, producing a **new sixth path** in the documented "5-path model":

> 6. Value is a reference → render the reference view (resolved value, navigation control), never `validateTokenValue`.

This is what fixes spec FR-009: a `color` token holding `"{color.neutral.500}"` currently reaches `ColorValidationErrorHandler` and is told its value *"must be a 6-digit hex string like `#rrggbb`"* — a false error firing against the app's own default token directory.

The reference view is extracted into its own component rather than added inline, because `TreeTokenNode.tsx` is already 240 lines against Principle X's 300-line ceiling (research.md §12).

### Server — `apps/web-app/app/api/tokens/[...path]/route.ts`

`patchTokenFile` currently does:

```ts
const builtInContract = resolveBuiltInContract(effectiveType);
if (builtInContract !== undefined) {
	const valueValidation = validateTokenValue(builtInContract, edit.value);
	if (valueValidation.isErr()) return errorResponse(400, ...);
	value = builtInContract.serializeValue(valueValidation.value);
} else {
	value = edit.value;
}
```

Same hoist: if `edit.value` is a reference, accept it without per-type validation and write it through unchanged (no `serializeValue`, which is typed for that contract's value and would be wrong for a reference string).

## Scope boundary — important

This feature is **read-only with respect to reference authoring** (spec Assumptions). The server change exists so that:

- editing a token's **name or description** while its value is a reference is not rejected, and
- a reference already in a file survives a save of unrelated edits in the same batch.

It does **not** add a UI for typing a reference into a value field. Whether the value editor should also allow *authoring* references is deliberately out of scope and left for a follow-up.

## Round-trip safety

Values are never rewritten by this feature, so Principle IX holds unchanged — `serialize.ts` already does `raw.$value = node.value`, so a reference string passes through a save byte-identical.

## Required tests

- A `color` token with a reference value renders **no** validation error and shows its resolved value (the FR-009 regression).
- A `dimension` token with a reference value likewise.
- A name-only edit to a reference-valued token is accepted by `PATCH`.
- A save of unrelated edits leaves a reference-valued sibling byte-identical.
- The client and server agree: any value one accepts as a reference, the other does too.
