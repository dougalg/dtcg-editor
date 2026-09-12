# Phase 0 Research: Font Weight Token Editor Support

No `NEEDS CLARIFICATION` markers were left in `spec.md` or the Technical Context of `plan.md`,
so this phase records the concrete decisions taken (largely already settled by the task brief
and the `token-editor-dimension`/`token-editor-color` precedent) rather than resolving open
unknowns.

## Decision: DTCG Font Weight `$value` schema shape

- **Decision**: `z.union([z.number().int().min(1).max(1000), z.enum([...18 aliases])])`, where
  the alias list is exactly: `thin`, `hairline`, `extra-light`, `ultra-light`, `light`,
  `normal`, `regular`, `book`, `medium`, `semi-bold`, `demi-bold`, `bold`, `extra-bold`,
  `ultra-bold`, `black`, `heavy`, `extra-black`, `ultra-black`.
- **Rationale**: This is the DTCG 2025.10 Format spec's Font Weight type definition verbatim
  (per the task brief, itself sourced from designtokens.org/tr/2025.10/format). `z.union` is the
  same construct already used for other multi-shape DTCG values in this codebase (e.g. color's
  legacy-hex-vs-object union), so this introduces no new validation pattern.
- **Alternatives considered**: A single `z.number()` only (rejected — spec explicitly permits
  keyword aliases as an alternate valid `$value`, and Principle I forbids silently narrowing
  spec-permitted input); a bespoke string-or-number check without `z.enum` (rejected — `z.enum`
  gives exact, spec-conformant alias validation for free and matches how `color.ts` already
  uses `z.enum` for `colorSpace`).

## Decision: Package layout mirrors `token-editor-dimension`

- **Decision**: New package `packages/token-editor-font-weight`, structured file-for-file like
  `token-editor-dimension` (package.json/tsconfig/vitest.setup.ts/vitest-a11y-tags.ts/
  css-modules.d.ts/vitest-env.d.ts, `src/token-type.ts`, `src/index.ts`,
  `src/components/<Name>/`).
- **Rationale**: `token-editor-dimension` is the constitution-cited closest precedent (a
  numeric-input editor, no extra dependency); reusing its exact file layout keeps the new
  package immediately legible to anyone familiar with the existing packages and satisfies
  Principle II's package-per-type organization without inventing a new convention.
- **Alternatives considered**: Folding font-weight support into an existing package (rejected —
  Principle VII requires each type's editor UI to be its own independently pluggable package).

## Decision: `Preview` pattern mirrors `ColorPreview`

- **Decision**: `FontWeightPreview` takes `{ value: unknown }`, re-validates via
  `FontWeightValueSchema.safeParse`, and returns `null` on a mismatch (letting the host fall
  back to generic text), matching `ColorPreview`'s exact contract and defensive-validation
  rationale (the value comes from resolving an arbitrary other token, not from this contract's
  own `valueSchema`, so nothing upstream guarantees it conforms).
- **Rationale**: `packages/token-editor-contract/src/contract.ts`'s `Preview` doc comment
  states this exact contract; `ColorPreview` is the one existing implementation to follow since
  `DimensionEditor`'s package doesn't implement `Preview` at all (dimension "has nothing richer
  to show than the generic fallback" — but per the task's explicit scope, font-weight is
  expected to supply one).
- **Alternatives considered**: Trusting `value` as already-typed `FontWeightValue` (rejected —
  contradicts the documented contract and Principle IV's edge-validation model, since a
  `Preview` value is resolved from an arbitrary reference target, not validated at this
  contract's own edge).

## Decision: No numeric ⇄ alias translation in `Preview` or `Editor`

- See `plan.md`'s Design Decisions section — recorded there rather than duplicated here since
  it's a design decision, not an external-research finding.

## Decision: Registration points

- **Decision**: `apps/web-app/lib/token-editors/built-in.ts`'s `BUILT_IN_TOKEN_TYPES` array and
  `builtInContractsByType` record both gain a `"fontWeight"` entry, mirroring the existing
  `dimension`/`color` entries exactly (including the same `as unknown as
  TokenTypeContract<unknown>` erasure comment rationale). `vitest.config.mts`'s `packages` array
  gains `"packages/token-editor-font-weight"` so its `.test.tsx`/`.a11y.test.tsx` files run
  under the shared unit/a11y Vitest projects.
- **Rationale**: These are the two structural registration points already established by the
  `dimension`/`color` precedent; `DTCG_TOKEN_TYPES` in `token-core/src/token-types.ts` already
  lists `"fontWeight"` (pre-existing, no edit needed there).
