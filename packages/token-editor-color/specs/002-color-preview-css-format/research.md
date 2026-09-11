# Phase 0 Research: Color Token Preview CSS-Style Formatting

No `NEEDS CLARIFICATION` markers remained in the Technical Context — the
feature's shape was fully determined by reading the existing codebase before
writing the plan. This document records the resulting decisions for the
record, in the template's Decision/Rationale/Alternatives format.

## Decision 1: Reuse `colorValueToCssColor`, don't write new formatting logic

**Decision**: `ColorPreview`'s text renders via the existing
`colorValueToCssColor` (`src/utils/css-color.ts`) — the same function
`Swatch` already calls to compute its rendered color — rather than any new
formatting function.

**Rationale**: `colorValueToCssColor` already:
- Covers all 14 DTCG 2025.10 color spaces plus the legacy bare-hex string,
  producing native CSS Color 4/5 syntax for each (`color(<space> ...)` for
  the gamut-mapped spaces without a dedicated function name, `hsl()`,
  `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`).
- Handles `"none"` components and the CSS `/` alpha suffix correctly
  (verified in its existing `css-color.test.ts`).
- Is already fully unit-tested, so reusing it adds zero new formatting
  surface area to verify from scratch.
- Guarantees the spec's core requirement (FR-002, SC-002): the swatch and
  the text can never disagree, because they are now computed by the exact
  same call.

**Alternatives considered**:
- *Write a separate formatter for the preview text.* Rejected — this is
  exactly the risk the spec calls out (an "independently invented"
  format that could drift from the swatch's color over time as either
  formatter is edited). No benefit over reuse; only risk.
- *Extend `formatChannel` (the `ChannelInput`/editor-side number formatter)
  for this.* Rejected — that utility formats a single numeric channel for
  an editable input, not a whole CSS function string, and pulling it into
  `ColorPreview` would create exactly the editor/preview coupling the spec
  says to avoid (User Story 2: preview and editor stay independent).

## Decision 2: No change to `ColorEditor` or its subtree

**Decision**: This feature touches only `ColorPreview.tsx` (its
`formatRaw` → `colorValueToCssColor` swap) and its two new test files.
`ColorEditor`, `ColorFunctionValue`, `ChannelInput`, `ColorSpaceSelect`,
`SpaceConversionDialog`, and `Swatch` are all unmodified.

**Rationale**: Spec FR-003 and User Story 2 make this an explicit
requirement, not just a scoping convenience — the two components already
render through entirely separate `TokenTypeContract` entries (`Editor` vs.
`Preview`) in `token-type.ts`, so no shared code path needs to change for
one without affecting the other.

**Alternatives considered**:
- *Unify preview and editor rendering into one component with an
  editable/read-only flag.* Rejected — out of scope per the spec, and a
  materially larger, riskier change than the one actually requested;
  would also violate Principle II (editor is not a validation boundary)
  territory by entangling two contract roles that are deliberately kept
  separate.

## Decision 3: Close the pre-existing `ColorPreview` test-coverage gap as part of this feature

**Decision**: Add `ColorPreview.test.tsx` and `ColorPreview.a11y.test.tsx`
— neither exists today — rather than treating that gap as pre-existing
technical debt to leave alone.

**Rationale**: Package Principle IV requires unit + a11y coverage for
every component; this feature is the first behavior change to
`ColorPreview` since its creation, and root Principle XIII (TDD,
NON-NEGOTIABLE) requires the change itself to be driven by a failing test.
Both point the same direction: write the tests first, see them fail
against the current `JSON.stringify` output, then make them pass.

**Alternatives considered**:
- *Ship the formatting change without adding tests, on the theory that
  `css-color.test.ts` already covers the underlying formatting logic.*
  Rejected — that only tests the utility in isolation; it does not prove
  `ColorPreview` actually calls it, passes the right value, or still
  renders the swatch and declines correctly for invalid input (User
  Story 3). Component-level coverage is what Principle IV and the spec's
  acceptance scenarios actually require.
