# Feature Specification: TreeTokenNode Block Extraction & Label Redesign

**Feature Branch**: `worktree-tree-token-node-block`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "1. extract reusable "dumb" subcomponent from TreeTokenNode to remove existing duplication. Aim for just one component to be a "block" following the CUBE CSS definition of Blocks
2. extract css from TokenTree.module.css that makes sense to be in the new component instead of in TokenTree
3. Update token labels: Do not keep repeating the TOKEN name in every label. Instead place it as a <h*> at the start of the TreeTokenNode somewhere. Make sure it is the correct semantic Heading level.
- eg: "{TOKEN} name" -> "Name"
- "{TOKEN} type {TOKEN_TYPE}" -> "Type: {TOKEN_TYPE}"
    - use a "pill" style - refactor the existing Badge component to be this pill. I will provide screenshot samples eg: "Type: <Badge>{TOKEN_TYPE}</Badge>"
- each token node should have its own icon assigned to it based on its type
- each token in the tree view should have its own pin line on the left similar to the groups. There should be a visual break between the pin lines for 2 sequential tokens to show that they are separate"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Scan a token's identity at a glance (Priority: P1)

A user browsing the token tree looks at a single token row (valid or invalid) and needs to immediately recognize the token's name, without having to re-read a repeated "{name} name" / "{name} type" / "{name} value" label pattern for every single field.

**Why this priority**: This is the core readability problem the request calls out — repeating the token name in every field label adds visual noise and makes the tree harder to scan, especially with many tokens open at once. Fixing it is the primary value of this feature.

**Independent Test**: Open the token tree with several tokens in a group. For any one token, confirm its name appears once, as a heading, at the top of its row, and that the "Name", "Type", and "Value"/description field labels below it no longer repeat the token's name.

**Acceptance Scenarios**:

1. **Given** a valid token with a resolved editor, **When** the tree renders that token's row, **Then** the token's name is shown once as a heading element at the start of the row, and the editable name field's label reads "Name" (not "{name} name").
2. **Given** an invalid/unusable token (no usable type, or validation failure), **When** the tree renders that token's row, **Then** the same heading + plain-label treatment applies (the read-only path is not left with the old repeated-name labels).
3. **Given** a token with an `effectiveType`, **When** its row renders, **Then** the type is shown as "Type:" followed by the type value rendered as a pill, instead of a field labeled "{name} type".

---

### User Story 2 - Distinguish tokens from groups, and consecutive tokens from each other, in the tree (Priority: P2)

A user scanning a nested tree of groups and tokens uses vertical guide lines to understand nesting depth, the same way group children already do. Currently, individual tokens have no such line and no type-based icon, so they read as "floating" list items rather than tree members, and it's harder to tell where one token's content ends and the next one's begins when several tokens sit next to each other.

**Why this priority**: This is a visual-hierarchy fix that makes the tree easier to navigate, but it's secondary to the label legibility fix in User Story 1 — it improves scanning speed rather than fixing a correctness/noise problem.

**Independent Test**: Render a group containing two or more tokens in sequence. Confirm each token has its own left-hand vertical pin line (matching the visual language already used for group nesting), and that a visible gap/break separates one token's pin line from the next token's pin line, so they read as distinct rows rather than one continuous line.

**Acceptance Scenarios**:

1. **Given** a group with a single child token, **When** the tree renders, **Then** that token has a left-hand pin line, visually consistent with the pin line style used for groups.
2. **Given** a group with two or more sibling tokens rendered back-to-back, **When** the tree renders, **Then** there is a visible break between each token's pin line segment, so two adjacent tokens are visually distinguishable as separate rows rather than one unbroken line.
3. **Given** a token of a recognized DTCG type (e.g. `color`, `dimension`), **When** its row renders, **Then** an icon representing that type is shown alongside/near its name heading.
4. **Given** a token whose type is missing or not a recognized standard DTCG type, **When** its row renders, **Then** a sensible fallback/generic icon is shown instead of a type-specific one (no broken or missing icon).

---

### User Story 3 - Consistent, reusable token-row building block (Priority: P3)

A developer extending or maintaining the token tree (adding a new token type, tweaking layout) works against one shared "dumb" presentational component for a token row's chrome (name heading, type pill, pin line, icon slot) instead of duplicated markup/CSS spread across the valid and invalid rendering paths in `TreeTokenNode`, and instead of layout CSS for tokens living in the shared `TokenTree.module.css` file.

**Why this priority**: This is an internal code-quality/maintainability outcome. It doesn't change what an end user sees beyond what Stories 1 and 2 already require, but it's the structural change requested to prevent the current duplication from recurring, so it's included as its own testable slice.

**Independent Test**: Compare the valid-token and invalid-token rendering branches in `TreeTokenNode`; confirm both now delegate their shared row chrome (heading, pin line, type pill, icon) to a single new presentational component that takes plain props and contains no editing/validation logic itself. Confirm the token-row-specific styles that moved out of `TokenTree.module.css` now live alongside that new component.

**Acceptance Scenarios**:

1. **Given** the refactored code, **When** inspecting `TreeTokenNode`'s two rendering branches (valid path, invalid path), **Then** both use the same single new "block" component for the shared row chrome, rather than two independent copies of the same JSX structure.
2. **Given** the new component, **When** inspecting its implementation, **Then** it accepts plain data as props (name, type, icon, children/slots) and contains no token validation, editing, or state logic — it only renders what it's given ("dumb" component).
3. **Given** the CSS that was specific to token rows (e.g. `.token`, `.name`, `.type`, `.fieldLabel` as applied to tokens) in `TokenTree.module.css`, **When** inspecting the stylesheets after the change, **Then** that token-row-specific CSS lives in the new component's own stylesheet, and `TokenTree.module.css` retains only styles that are still genuinely shared with/owned by the tree/group layout (e.g. `.root`, `.children`, `.group`, `.toggle`).

---

### Edge Cases

- A token with a very long name: the heading must not break the row layout (wraps or truncates gracefully, consistent with existing wrapping behavior on the row).
- A token with no `effectiveType` at all: no "Type:" pill is rendered (existing conditional behavior is preserved), and the fallback icon from Story 2 is used.
- A token with a non-standard (declared but unrecognized) type: the type pill still renders the type value, and the existing "(non-standard)" indicator is preserved in some visible form.
- Two tokens belonging to two different parent groups, where one group ends and another begins right at a token boundary: the pin-line break must still read as "these are separate tokens," not merge visually with an adjacent group's own line.
- Screen reader users: because every token uses the same `<h2>` level regardless of nesting depth (see FR-003), the tree's document outline will list every token name as a flat sequence of `<h2>`s under the page's `<h1>` — this is the intended, well-formed outline for this feature, not a defect to fix later.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The token tree MUST display each token's name once, as a heading element, at the start of that token's row, instead of repeating the token name inside every field label.
- **FR-002**: The token tree MUST replace the "{name} name" / "{name} type" / "{name} value"/"{name} description" field label pattern with plain labels ("Name", "Type", "Value" or "Description" as applicable) that do not repeat the token's name.
- **FR-003**: The heading level used for a token's name MUST be `<h2>`, applied at a flat level to every token regardless of nesting depth. This is the semantically correct next level down: the page that hosts the token tree renders a single `<h1>{relativePath}</h1>` immediately above the tree, and groups (`TreeGroupNode`) render their name as a plain text label, not a heading, at any depth — so a token's name heading has no heading ancestor between it and the page's `<h1>` other than that `<h1>` itself.
- **FR-004**: The token tree MUST render a token's type as "Type:" followed by the type value styled as a pill, using a pill-styled version of the existing `Badge` component.
- **FR-005**: The `Badge` component MUST be refactored/extended so its pill styling can be reused for the token-type display (either by adjusting `Badge` itself, given it is not yet used elsewhere in the app, or by adding a variant), without breaking `Badge`'s existing public API for any other consumers.
- **FR-006**: Each token row MUST display an icon that corresponds to the token's resolved type (e.g. distinct icons for `color`, `dimension`, etc.).
- **FR-007**: A token whose type is missing or not a recognized standard DTCG type MUST display a fallback/generic icon rather than no icon or a broken one.
- **FR-008**: Each token row in the tree MUST display its own left-hand pin line, visually consistent with the pin line already used for group nesting.
- **FR-009**: When two or more tokens render as consecutive siblings, there MUST be a visible break between each token's pin-line segment so adjacent tokens read as distinct rows.
- **FR-010**: A single new, reusable, presentational ("dumb") component MUST be extracted to hold the token row's shared visual chrome (name heading, type pill, icon, pin line), following the CUBE CSS definition of a "Block" (a standalone, context-independent chunk of UI with its own scope).
- **FR-011**: Both existing `TreeTokenNode` rendering paths (the valid/editable path and the invalid/read-only path) MUST use this single new component for their shared chrome, rather than duplicating that markup independently, as they do today.
- **FR-012**: The new component MUST NOT contain token validation, editing, or staged-edit state logic; that logic remains in `TreeTokenNode`, which passes plain data into the new component.
- **FR-013**: CSS rules in `TokenTree.module.css` that style token-row-specific concerns (e.g. the current `.token`, `.name`, `.type`, `.nonStandard`, `.fieldLabel` usage on token rows) MUST move to the new component's own stylesheet; `TokenTree.module.css` MUST retain only the styles it still genuinely owns (tree root/list layout, group-specific styles).
- **FR-014**: The existing "(non-standard)" indicator for a declared-but-unrecognized type MUST remain visible after the type display is restyled as a pill.
- **FR-015**: The change MUST NOT alter any existing token editing, validation, or staging behavior in `TreeTokenNode` — only the presentational layer changes.

### Key Entities

- **Token row / Block component**: The new reusable presentational unit representing one token's visual chrome in the tree — takes the token's name, resolved type (or lack thereof), and slots for the editor/value content and validation messaging, and renders the heading, type pill, icon, and pin line around them.
- **Token type icon mapping**: An association between each recognized DTCG token type (and a fallback case) and the icon to display for it.
- **Badge/Pill**: The existing `Badge` design-system component, restyled or extended to serve as the "pill" used for the token type display.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In any token row, the token's name appears exactly once as a heading, and zero field labels within that row repeat the token's name (verifiable by inspecting rendered output for any token in the tree).
- **SC-002**: 100% of tokens rendered in the tree — regardless of whether they are on the valid/editable path or the invalid/read-only path — show the same heading + pin-line + icon + type-pill treatment.
- **SC-003**: Users can visually distinguish where one token's row ends and the next token's row begins without reading any text, purely from the pin-line break, in a group containing 2+ consecutive tokens.
- **SC-004**: The duplicated row-chrome JSX between `TreeTokenNode`'s valid and invalid rendering branches is reduced to a single shared component, eliminating the current two-copy duplication.
- **SC-005**: No pre-existing token editing, validation, or accessibility test in the repository regresses as a result of this purely presentational change (existing automated test suite continues to pass).

## Assumptions

- The existing `Badge` component (`packages/design-system/src/components/Badge`) is not yet used anywhere else in the codebase, so it can be adjusted directly to serve as the pill style without needing a parallel/back-compat variant for other call sites.
- "Icon assigned based on type" means a small icon-per-DTCG-type mapping is introduced (e.g. via a simple inline icon set or existing icon library already available in the design system); no specific icon asset source was specified, so a minimal, easily-extended mapping is acceptable for v1, with unrecognized/missing types falling back to one generic icon.
- The screenshot samples referenced in the input ("Type: <Badge>{TOKEN_TYPE}</Badge>") were not attached to this spec; the pill's exact visual styling (color, size) is a design-system-level styling decision made during implementation/design review, not a scope-defining requirement here.
- "CUBE CSS Block" is interpreted per the CUBE CSS methodology's own definition: a standalone component with its own local scope, not dependent on its container for structure — i.e., the new component owns its own CSS module rather than reaching into `TokenTree.module.css`.
- This feature is scoped to `TreeTokenNode` and the token-row-specific portion of `TokenTree.module.css` only; `TreeGroupNode`'s existing pin-line/group styling is treated as read-only reference for visual consistency, not itself a target of refactoring (its own accessibility/semantics gaps are already tracked separately in the backlog).
