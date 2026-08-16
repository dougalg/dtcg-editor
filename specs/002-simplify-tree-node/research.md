# Phase 0 Research: Simplify TokenTree / TreeNode Editor Coupling

No `[NEEDS CLARIFICATION]` markers were left in `spec.md` — this is a refactor
of existing, well-understood code, not new-technology adoption. The "research"
below documents the design decisions needed to remove the two special cases,
each with rejected alternatives.

## Decision 1: Generalize dimension validation via the existing built-in-contract path

**Decision**: Delete `TreeNode.tsx`'s `isDimension` branch and
`edit-state.ts`'s `validateDimensionValue`. Route dimension through the exact
same `resolveBuiltInContract(effectiveType)` + `validateTokenValue(contract,
node.value)` path already used today for "standard, non-dimension" types.

**Rationale**: `dimensionTokenType` is already registered in
`built-in.ts`'s `builtInContractsByType`, so `resolveBuiltInContract("dimension")`
already returns its contract today — the dimension special case in `TreeNode.tsx`
duplicates work the generic path already does correctly for every other
built-in type. `validateTokenValue` returns the same information
(`Result<TValue, TokenTypeValidationError>`) that `validateDimensionValue`'s
hand-rolled `DimensionValidationResult` provides, so no information is lost.

**Alternatives considered**:

- _Keep the dimension special case since "it already works"_ — rejected: it
  is precisely the coupling the user asked to remove (FR-002), and its
  continued existence would be the one remaining type-name conditional
  blocking Story 3's acceptance criteria.
- _Generalize by having every contract-consumer re-derive the value type via
  `contract.type === "dimension"` checks elsewhere_ — rejected: this just
  relocates the special case rather than removing it.

## Decision 2: Generalize the editor-rendering branch

**Decision**: Delete the `DimensionEditor`/`GenericEditor` dual-branch
(`isDimension ? <DimensionEditor .../> : <GenericEditor .../>`) in favor of a
single resolved-editor render path, used for every standard type with a
registered editor extension (built-in or custom) — matching how the
non-dimension path already works today.

**Rationale**: `resolveEditorForType` already returns the correct editor
component for dimension (`builtInExtensions` includes it), and the existing
`TokenTypeEditorProps<TValue>` contract passes `value`/`onChange`/`options`
uniformly regardless of type — `TreeNode.tsx` never needs to know it's holding
a `DimensionValue` specifically; it only ever threads the value through
opaquely, exactly as it already does for `unknown`-typed generic values.

**Alternatives considered**:

- _Keep a typed `DimensionEditorComponent` cast "for type safety"_ —
  rejected: the existing code comment on that cast already concedes nothing
  in `TreeNode.tsx` inspects the value, so the cast buys no real safety, only
  an extra branch.

## Decision 3: Extend `TokenTypeContract` with an optional `ValidationErrorHandler` for read-only/invalid-state display

**Decision**: Add an optional `ValidationErrorHandler?(props: { readonly value: unknown })
=> ReactElement | null` member to `TokenTypeContract`. `packages/token-type-color`
implements it (moving the swatch-rendering and validation-issue-listing logic
currently in `apps/web-app/lib/tokens/color-display.ts` into the color
package itself, as `packages/token-type-color/src/validation-error-handler.tsx`).
`TreeNode.tsx` renders `contract.ValidationErrorHandler` generically wherever it currently
renders the color swatch/issues, for _any_ type that supplies one — falling
back to plain name/type/value text (already the generic behavior for every
other type) when a contract has no `ValidationErrorHandler`.

**Rationale**: Every other piece of type-specific display in `TreeNode.tsx`
already has a generic equivalent (`Editor` for editing, `valueSchema` +
`validateTokenValue` for validation) except the swatch/issue-list shown for
color specifically. A `ValidationErrorHandler` component closes that last gap the same way
`Editor` closes the editing gap — extending the _contract_ rather than adding
another type-name branch to the host, per Principle VII.

**Alternatives considered**:

- _A plain data-returning `describeValue(value): { summary?: string; issues:
string[] }` function instead of a component_ — rejected: a future
  token-type package might reasonably want to render something richer than
  text (e.g. an icon or a gradient chip), and `Editor` is already a
  component-shaped contract member; a second, differently-shaped
  ("data function" vs. "component") member would itself be an inconsistency
  in the contract's own design.
- _Reuse `Editor` itself for the read-only/invalid case (e.g. a `disabled`
  prop)_ — rejected: today's invalid-value state intentionally does _not_
  render an interactive editor (a structurally-invalid raw value can't be
  safely handed to an editor expecting `TValue`); a separate `ValidationErrorHandler`,
  receiving the raw untyped value, is the correct shape for a
  possibly-invalid input, whereas `Editor` only ever receives an
  already-validated `TValue`.
- _Drop the swatch/issue display entirely_ — rejected: out of scope per the
  spec's Story 2 / SC-002 (no user-facing regression); the feature is a
  structural simplification, not a UI reduction.

## Decision 4: `TokenTree.tsx` needs no logic change

**Decision**: No changes are planned to `TokenTree.tsx` itself beyond
re-verification.

**Rationale**: The research audit (see spec's originating investigation)
already found `TokenTree.tsx` contains zero editor-type-specific logic today
— it only owns tree edit state, pending-edit staging, and save orchestration,
and renders a single root `<TreeNode>`. It already satisfies FR-006/SC's
implicit "stays generic" bar; the work is entirely in `TreeNode.tsx` and the
token-type packages.

**Alternatives considered**: None — this is a confirmation, not a choice
between options.

## Decision 5: Retrofit both token-type packages to a `components/` + `configuration.ts` structure now

**Decision**: Per the 2026-08-16 clarification, both `packages/token-type-color`
and `packages/token-type-dimension` are restructured as part of this feature
(not deferred to a future package): each package's editor component(s) move
under a `components/` directory (`components/editor.tsx` as the main entry,
one component per file — this is also where `token-type-color`'s new
`ValidationErrorHandler` from Decision 3 lives, as `components/validation-error-handler.tsx`), and each
package gains a `configuration.ts` module holding its editor-specific
configuration, kept out of its core value-schema module. For
`token-type-color`, this means moving `ColorEditorOptions`,
`ColorEditorOptionsSchema`, and `defineColorConfig` out of `color.ts` (which
keeps only `ColorValueSchema`, `ColorObjectValueSchema`,
`LegacyHexColorValueSchema`, `checkColorValueIssues`, and the
`COLOR_SPACES`/`ColorSpace` primitives the configuration schema itself needs
to import) into the new `configuration.ts`.

**Rationale**: The clarification session confirmed this repo's own
`color.ts` already exhibits, one layer down, the same coupling problem
spec-002 exists to fix in `TreeNode.tsx`: editor-only concerns
(`ColorEditorOptions`) mixed into the module defining core token-value
validation (`ColorValueSchema`). Since this feature already touches
`token-type-color` to add `ValidationErrorHandler`, it is the natural point to also correct
that file layout, rather than leaving the new `ValidationErrorHandler` component as a third
loose file alongside `editor.tsx` while the config-vs-core-validation split
remains unaddressed.

**Alternatives considered**:

- _Retrofit only `token-type-color` (already being touched for `ValidationErrorHandler`);
  leave `token-type-dimension`'s flat layout alone_ — rejected by the user
  during clarification: `token-type-dimension` adopts the same skeleton for
  consistency across every first-party editor package, even though it has no
  editor-specific options to relocate today.
- _Document the new layout as guidance for future packages only, leaving
  both existing packages unchanged_ — rejected: this would leave the exact
  coupling this feature is meant to close (per the user's own framing:
  "this also points to needing a clear distinction... in the spec document")
  unresolved in the two packages that exist today.

## Decision 6: `token-type-dimension`'s `configuration.ts` starts empty

**Decision**: `packages/token-type-dimension/src/configuration.ts` is created
as part of this feature even though `dimensionTokenType` has no
`editorOptionsSchema` today — it has nothing to export yet, but the module's
_presence_ is what FR-009/FR-010/FR-011 require, not its content.

**Rationale**: Matches spec.md's edge case: "the convention's presence, not
its content, is what's required." This keeps `token-type-dimension`
structurally identical to `token-type-color` (and to any future first-party
package), so a maintainer never has to guess whether a missing
`configuration.ts` means "this type has no options" versus "this package
predates the convention."

**Alternatives considered**:

- _Omit `configuration.ts` from `token-type-dimension` until it actually has
  an option to declare_ — rejected: reintroduces exactly the ambiguity
  Decision 5 exists to remove (is a missing file a deliberate "no options"
  signal, or an unretrofitted package?); a present-but-empty module is
  unambiguous.
