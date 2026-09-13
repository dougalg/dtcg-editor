# Phase 0 Research: Number Token Editor Support

No `NEEDS CLARIFICATION` markers were left in `spec.md` or the Technical Context of `plan.md`,
so this phase records the concrete decisions taken (largely already settled by the task brief
and the `token-editor-font-weight`/`token-editor-dimension` precedent) rather than resolving
open unknowns.

## Decision: DTCG Number `$value` schema shape

- **Decision**: `z.number()` — a bare, unitless, finite JavaScript number, any sign, integer or
  fractional. No `z.union`, no `min`/`max`, no `int()`.
- **Rationale**: This is the DTCG 2025.10 Format spec's Number type definition verbatim (per the
  task brief, itself sourced from designtokens.org/tr/2025.10/format): used for things like
  opacity, line-height, z-index, or scale factors, with no unit and no stated range/integer
  constraint. Zod's `z.number()` already rejects `NaN` and `±Infinity` (both fail the
  `Number.isFinite` check Zod applies internally), which satisfies FR-002's finiteness
  requirement with no extra `.finite()` call needed — confirmed against Zod's own documented
  behavior for `z.number()`.
- **Alternatives considered**: `z.number().finite()` (rejected as redundant — `z.number()`
  already enforces finiteness by default in the Zod version this repo uses; adding `.finite()`
  explicitly would be harmless but non-idiomatic next to `dimension.ts`/`font-weight.ts`'s
  existing bare `z.number()...` chains, which likewise don't call `.finite()` separately);
  narrowing to non-negative or integer-only (rejected — the spec places no such constraint, and
  narrowing would silently reject spec-valid values like negative scale factors or fractional
  opacity, violating Principle I).

## Decision: Package layout mirrors `token-editor-font-weight`, minus the alias picker

- **Decision**: New package `packages/token-editor-number`, structured file-for-file like
  `token-editor-font-weight` (package.json/tsconfig/vitest.setup.ts/vitest-a11y-tags.ts/
  css-modules.d.ts/vitest-env.d.ts, `src/token-type.ts`, `src/index.ts`,
  `src/components/<Name>/`), but with only one editing control (no alias `<select>`, since the
  Number type has no keyword aliases).
- **Rationale**: `token-editor-font-weight` is the closest precedent named in the task brief (a
  numeric-input editor with a `Preview`); reusing its file layout keeps the new package
  immediately legible to anyone familiar with the existing packages and satisfies Principle II's
  package-per-type organization without inventing a new convention. Dropping the alias picker
  is a direct consequence of the schema having no alias branch — there's nothing for a second
  control to pick between.
- **Alternatives considered**: Folding number support into an existing package (rejected —
  Principle VII requires each type's editor UI to be its own independently pluggable package).

## Decision: `Preview` pattern mirrors `FontWeightPreview`/`ColorPreview`

- **Decision**: `NumberPreview` takes `{ value: unknown }`, re-validates via
  `NumberValueSchema.safeParse`, and returns `null` on a mismatch (letting the host fall back to
  generic text), matching `FontWeightPreview`'s exact contract and defensive-validation
  rationale (the value comes from resolving an arbitrary other token, not from this contract's
  own `valueSchema`, so nothing upstream guarantees it conforms).
- **Rationale**: `packages/token-editor-contract/src/contract.ts`'s `Preview` doc comment states
  this exact contract and lists it as required (not optional) precisely so no new token-type
  contract regresses to the generic JSON fallback.
- **Alternatives considered**: Trusting `value` as already-typed `NumberValue` (rejected —
  contradicts the documented contract and Principle IV's edge-validation model).

## Decision: Registration points

- **Decision**: `apps/web-app/lib/token-editors/built-in.ts`'s `BUILT_IN_TOKEN_TYPES` array and
  `builtInContractsByType` record both gain a `"number"` entry, mirroring the existing
  `dimension`/`fontWeight` entries exactly (including the same `as unknown as
  TokenTypeContract<unknown>` erasure comment rationale). `vitest.config.mts`'s `packages` array
  gains `"packages/token-editor-number"` so its `.test.tsx`/`.a11y.test.tsx` files run under the
  shared unit/a11y Vitest projects.
- **Rationale**: These are the two structural registration points already established by the
  `dimension`/`fontWeight` precedent; `DTCG_TOKEN_TYPES` in `token-core/src/token-types.ts`
  already lists `"number"` (pre-existing, no edit needed there). `classifyValue`'s
  `KNOWN_VALUE_SCHEMAS` registry is intentionally left untouched — it currently only covers
  `color`/`dimension` and no other single-type-added feature (`duration`, `cubicBezier`,
  `fontWeight`, `strokeStyle`, `fontFamily`) has added itself there either, so extending it is
  out of this feature's scope.
