# Phase 0 Research: TreeTokenNode Block Extraction & Label Redesign

No `[NEEDS CLARIFICATION]` markers remain in `plan.md`'s Technical Context — the questions below were resolved by inspecting the current codebase rather than left open, since concrete answers were directly verifiable.

## 1. Heading level for the token name

**Decision**: `<h2>`, applied flatly to every token regardless of nesting depth.

**Rationale**: Already resolved in `spec.md` FR-003 by inspecting `apps/web-app/app/tokens/[...path]/page.tsx` (renders a single `<h1>{relativePath}</h1>` immediately above `TokenTree`) and `TreeGroupNode` (renders group names as plain text via `<Label>`, not a heading, at any depth). With no heading ancestor between the page `<h1>` and any token, every token name sits one level down from that `<h1>` — `<h2>` — with no depth-dependent variation needed.

**Alternatives considered**: Heading level tied to tree nesting depth (`h2` for depth 1, `h3` for depth 2, ...) — rejected: groups aren't headings today, so depth-tying would require also introducing group headings (out of scope per spec's Assumptions), and DOM nesting depth can exceed 6 levels, which has no valid heading level past `h6`.

## 2. Pill styling for token type — reusing `Badge`

**Decision**: Reuse `packages/design-system/src/components/Badge` directly (no new "Pill" component). `Badge` (`Badge.css`) already renders as a fully-rounded pill (`border-radius: var(--radius-full)`, inline-flex, `padding: 0 0.75em`) and is not consumed anywhere else in the codebase yet (confirmed via repo-wide grep), so it can be adjusted in place — sizing/weight tweaks if needed to match the provided screenshots — without a back-compat concern for other call sites.

**Rationale**: The spec explicitly asks to "refactor the existing Badge component to be this pill," not to introduce a second, parallel pill component — consistent with constitution Principle X's reuse-consolidation rule (3+ similar components must be flagged for consolidation; the inverse — not forking a second near-identical component when one already exists and is unused — is the same principle in the other direction).

**Alternatives considered**: A new dedicated `Pill` component — rejected: duplicates `Badge`'s existing pill-shaped styling for no functional gain, and `Badge` has zero existing consumers to break.

## 3. Per-type icons

**Decision**: A hand-authored set of inline SVG icons, one per `DtcgTokenType` (13 types: `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`, `strokeStyle`, `border`, `transition`, `shadow`, `gradient`, `typography`, from `packages/token-core`'s `DTCG_TOKEN_TYPES`) plus one generic fallback icon for a missing/non-standard `effectiveType`, defined as a small `Record<DtcgTokenType, ...>`-shaped lookup co-located with `TokenBlock`.

**Rationale**: No icon library appears in the constitution's approved-dependency list, and Principle VIII requires built-ins/hand-rolled solutions be preferred and any new dependency be named and justified in `plan.md` before adding — inline SVG (a platform built-in) needs no such justification and keeps the dependency surface unchanged. Only `color` and `dimension` currently have registered editors, but `effectiveType` can already be any of the 13 spec types (or an unrecognized string) purely from file content, so the icon map covers all 13 up front rather than growing ad hoc per future token-type feature.

**Alternatives considered**: Adding an icon library (e.g. an SVG icon package) — rejected, no such dependency is pre-approved and 14 small icons don't justify a new dependency under Principle VIII. Emoji glyphs — rejected: inconsistent rendering across platforms/fonts, and still requires an explicit accessible-name treatment, so it has no accessibility advantage over authored SVG while giving up styling control (`currentColor`, sizing) that inline SVG provides for free.

## 4. Per-token pin line with a visible break between consecutive tokens

**Decision**: Style the pin line as a left border on `TokenBlock`'s own wrapper element (mirroring `TokenTree.module.css`'s existing `.children { border-left: 1px solid ... }` group pattern), with enough vertical margin/gap between adjacent token `<li>` elements that each token's border segment reads as visually separate rather than merging into one continuous line — i.e., the border is scoped to each token's own block box, and normal block-level spacing between sibling `<li>`s is what produces the visible break, not a special-cased partial-height line.

**Rationale**: This directly reuses the visual language `TreeGroupNode`/`TokenTree.module.css` already establishes for group nesting (`.children`'s `border-left`), satisfying the spec's "consistent with the pin line style used for groups" requirement (FR-008) with no new visual language introduced, while the per-token box + margin gives FR-009's "visible break between consecutive tokens" for free from normal box-model spacing.

**Alternatives considered**: A single continuous line spanning all sibling tokens with an explicit CSS `background-image` gradient trick to fake breaks — rejected as unnecessarily complex for what a simple per-element border with margin achieves natively, and harder to keep pixel-consistent with the group's plain `border-left` styling.

## 5. Test coverage baseline

**Decision**: `TreeTokenNode` currently has no dedicated unit test file (only whole-tree tests in `apps/web-app/components/TokenTree/TokenTree*.test.tsx` exercise it indirectly). The new `TokenBlock` component gets its own `TokenBlock.test.tsx` (Vitest + Testing Library) and `TokenBlock.a11y.test.tsx` (Vitest Browser Mode + `axe-core`), per Principle X. Existing `TokenTree.test.tsx` / `TokenTree.a11y.test.tsx` / `TokenTree.override.test.tsx` / `TokenTree.generic-editor.test.tsx` assertions that check the old repeated-name label text (e.g. `"{name} name"`) must be updated to match the new plain labels — this is a pre-existing-test-update task, not new test debt.

**Rationale**: Matches constitution Principle X's mandatory unit + accessibility coverage for every component, applied to the one net-new component this feature introduces, while keeping existing coverage of `TreeTokenNode`'s behavior (via `TokenTree`'s tests) intact and adjusted for the new label text rather than deleted.

**Alternatives considered**: Also backfilling a dedicated `TreeTokenNode.test.tsx` for the pre-existing gap — noted as out of scope for this feature (a separate, pre-existing test-coverage gap unrelated to this presentational refactor); it is not required by any requirement in `spec.md`, so it is not added here to keep the change scoped to what was asked.
