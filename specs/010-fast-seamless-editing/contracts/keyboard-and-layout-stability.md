# Contract: Keyboard & Layout Stability

Maps to spec FR-005..FR-010, FR-012, FR-014, FR-016 and SC-002, SC-003, SC-004.

## C-KL-1 — Tab moves only the focus indicator

**Given** any token file open in the editor
**When** the user presses Tab or Shift+Tab to move between controls
**Then** the **only** visible change is the focus indicator moving to the next control — no
control resizes, no text reflows, no panel remounts, nothing shows a loading state
(FR-005). Verified with a `layout-shift` PerformanceObserver capturing zero shift sources
outside the newly focused control during the focus move.

## C-KL-2 — Full tab-through lands on a control at every step

**Given** the large fixture file open
**When** the user tabs from the first focusable control through the entire tree and Save
button, then Shift+Tabs back
**Then** at 100% of stops `document.activeElement` is a real control (never `<body>`), the
focus indicator is fully visible (unclipped by any `overflow` ancestor, unobscured), and the
control is scrolled into view (FR-002, FR-007; SC-003). Reuses the existing
`hasVisibleFocusIndicator` helper.

## C-KL-3 — Focus order matches visual order

**Given** any token row
**Then** tab order is: name → (type suggestion, if present) → value editor control(s) →
description → next row; matching top-to-bottom visual order, with no focus trap other than
the unsaved-changes modal dialog (FR-006).

## C-KL-4 — Validation messages never move siblings

**Given** a row with the reserved field-error slot
**When** a validation message appears (bad value, rename collision, invalid JSON) or clears
on the next keystroke
**Then** no element outside that row's own error slot changes position or size; the slot's
box size is identical whether or not a message is shown (FR-010, FR-012; SC-002; INV-10).

## C-KL-5 — Focus-revealed helper UI uses reserved space

**Given** a control that shows supplementary UI when focused (hint, affordance,
`TypeSuggestion`)
**When** it receives focus
**Then** that UI occupies space that was already reserved; surrounding controls do not move
(FR-008).

## C-KL-6 — Tabbing between tree and Save / back-link preserves tree state

**Given** focus is inside the tree
**When** the user tabs out to the Save button or the back-link and back in
**Then** the tree's scroll position and every `<details>` group's open/closed state are
unchanged, and no row re-renders visibly (FR-009, FR-010).

## C-KL-7 — Scrolling a bottom control into view doesn't reflow the rest

**Given** the user tabs to a control near the bottom of the viewport
**When** the browser scrolls it into view
**Then** the page header, back-link, and group headers do not move, and no content outside
the scrolled region reflows (FR-005).

## C-KL-8 — Mode / theme change mid-edit doesn't drop the edit or focus

**Given** a field is focused with an in-progress (uncommitted) draft
**When** the user toggles colour theme or switches resolver mode
**Then** the in-progress draft is retained and focus stays on the field — it does not move
to `<body>` (FR-014).

## C-KL-9 — Screen reader announces each focus change once

**Given** a screen reader is active
**When** the user tabs between controls
**Then** each focus change is announced exactly once, with no duplicate announcements caused
by a row re-rendering under the focus move (FR-005; covered by the render-isolation guarantee
plus an `axe` clean check in the component a11y tests).

## C-KL-10 — Switching app views doesn't rebuild shared chrome

**Given** the user moves between the folder overview (`/`) and a token file page
**When** the view changes
**Then** chrome common to both (the `main.wrapper` shell, the page `<h1>` region) does not
visibly rebuild or jump beyond the intended content swap (FR-016). Cross-**file** navigation
remains a full page load and is out of scope.
