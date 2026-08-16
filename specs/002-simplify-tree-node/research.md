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

This generalization applies symmetrically to the write path: today,
`handleDimensionValueChange` validates a staged value against
`dimensionTokenType.valueSchema` before calling `onStageEdit`, blocking the
stage and setting a field error on failure — a live-feedback gate
`handleGenericValueChange` (used for every other standard type) doesn't have,
since no other type currently has a `resolveBuiltInContract` entry to
validate against. The unified value-change handler (see `TreeNode.tsx`'s
generic dispatch work) validates via `validateTokenValue(builtInContract,
next)` before staging whenever a `builtInContract` exists for the type
(dimension and color both do, post-refactor), blocking the stage and setting
a field error on failure exactly as dimension does today — generalizing
dimension's gate to color rather than dropping it, which both preserves
dimension's existing live-validation behavior (Story 2 / FR-004) and gives
color the same immediate feedback dimension already had. A standard type
with no `builtInContract` (e.g. a user-registered extension with no schema)
still has nothing to validate against, so it keeps today's trust-as-is
behavior.

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

## Decision 3: Extend `TokenTypeContract` with an optional `ValidationErrorHandler` for the invalid-value case

**Decision**: Add an optional `ValidationErrorHandler?(props: { readonly value: unknown;
readonly error: TokenTypeValidationError }) => ReactElement | null` member to
`TokenTypeContract`, and give `TokenTypeValidationError` a parallel `issues:
readonly TokenTypeValidationIssue[]` field — each issue a structured `{ path:
readonly PropertyKey[]; message: string; code: string }` object (mirroring
Zod's own issue shape) rather than a pre-formatted string, additive alongside
the existing `message`, so a future consumer can use `path` to target one
specific field or `code` for non-text handling without another contract
change.

`ValidationErrorHandler` is strictly for the case where a value has already
failed `valueSchema` — `TreeNode.tsx` only ever calls it after running
`validateTokenValue` and confirming an `err`, so `error` is a plain
`TokenTypeValidationError`, never a `Result` the implementer has to unwrap
(there is no `Ok` case to represent, since the component is never invoked for
one). `packages/token-type-color` implements it, moving the
doesn't-parse-at-all half of `apps/web-app/lib/tokens/color-display.ts`'s
`describeColorForDisplay` into the color package itself, as
`packages/token-type-color/src/components/validation-error-handler.tsx`.

The other half of `describeColorForDisplay` — the swatch/range-issue display
for a value that _does_ parse successfully but that `checkColorValueIssues`
still flags (e.g. an out-of-range component) — is **not** part of
`ValidationErrorHandler`: it moves into `ColorEditor` itself
(`components/editor.tsx`), since `Editor` already receives an
already-validated `TValue` it can inspect directly, with no need to hand
anything through `TreeNode.tsx` at all. See Decision 3a below.

`TreeNode.tsx` renders `contract.ValidationErrorHandler` generically wherever
it currently renders the color swatch/issues for the invalid case, for _any_
type that supplies one — passing the same `value`/`error` pair for whichever
raw value is being displayed — and falls back to plain name/type/value text
(already the generic behavior for every other type) when a contract has no
`ValidationErrorHandler`.

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
- _Pass `validation: Result<TValue, TokenTypeValidationError>` instead of a
  plain `error`_ — rejected (superseded; an earlier draft of this decision
  used `Result`): `ValidationErrorHandler` is, by construction, only ever
  invoked once `TreeNode.tsx` has confirmed `validateTokenValue`'s result is
  an `err` — a `Result`-typed prop would let every implementer's signature
  claim it might receive an `Ok`, a case that can never actually occur here,
  forcing pointless `.isErr()`/`.error` unwrapping at every call site for no
  benefit. A plain `error: TokenTypeValidationError` says exactly what's
  guaranteed, nothing more.

## Decision 3a: The valid-but-flagged display (color's range check) moves into the `Editor`, not `ValidationErrorHandler`

**Decision**: `apps/web-app/lib/tokens/color-display.ts`'s
`describeColorForDisplay` is used today in two places in `TreeNode.tsx`: the
read-only/invalid branch (always a parse failure, once `canEdit` is false)
and the editable branch (rendering `checkColorValueIssues`' range-issue list
below an otherwise-functioning `ColorEditor`, since a structurally-valid
color can still have out-of-range components). Only the first case routes
through the new `ValidationErrorHandler` (Decision 3); the second moves
entirely into `packages/token-type-color/src/components/editor.tsx`'s
`ObjectColorEditor`, which already renders its own swatch and now also calls
`checkColorValueIssues` directly on the `ColorValue` it already receives as
`value` — no new prop, no `TreeNode.tsx` involvement at all. `TreeNode.tsx`'s
editable branch simply stops computing or rendering `editableColorIssues`.

**Rationale**: `ValidationErrorHandler`'s whole reason for existing is to
stand in for `Editor` when `Editor` can't safely run (an unparseable raw
value); once a value parses, `Editor` is exactly the component already
holding it, so there is no reason to route a supplementary, valid-value
display back out through `TreeNode.tsx` and into a second, differently-shaped
contract member. Keeping it in `Editor` also means the value's genuine
`TValue` never needs to be re-derived or re-validated by anything in
`TreeNode.tsx` for this purpose — `Editor` already gets a real `ColorValue`.

**Alternatives considered**:

- _Have `TreeNode.tsx` call `validateTokenValue` a second time on the
  editable branch's (possibly-staged) raw value and pass that fresh result,
  plus the value, to `ValidationErrorHandler`_ — rejected (an earlier draft
  of this task list did this): it only works when that second validation is
  an `err`, which contradicts Decision 3's now-strict "error case only"
  signature, and does nothing for the actually-common case here (a
  structurally-valid value with an out-of-range component, i.e. `Ok`) — the
  range check was never a `valueSchema` concern to begin with.
- _Give `TokenTypeContract` a third, separate "valid-but-flagged" display
  member_ — rejected: unnecessary; `Editor` already has everything it needs
  (the validated value) to render this itself, so no contract addition is
  needed for a concern the `Editor` can already own.

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
