# Feature Specification: Fast, Seamless Editing

**Feature Branch**: `worktree-fast-seamless-editing`

**Created**: 2026-08-30

**Status**: Draft

**Input**: User description: "An edit shouldn't should be fast and seamless for the user. Tabbing and moving around the page should also not trigger unexpected reflows and rerenders."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Editing a token value feels instant and stays put (Priority: P1)

A user is editing the value of a token in the editor. They change the value and commit the
edit. The new value appears immediately, the surrounding page does not flicker or jump, and
their place on the page is exactly where they left it — the field they were in is still
focused, the text cursor is where they left it, and nothing has scrolled.

**Why this priority**: This is the core of the request. Editing token values is the single
most frequent action in the app; if each edit feels slow, blinks the screen, or throws the
user's focus and scroll position away, the whole editor feels broken regardless of any other
polish. On its own this delivers a usable, pleasant editing loop.

**Independent Test**: Open a token, change its value, and commit. Verify (a) the updated
value is visible effectively instantly with no loading indicator, (b) keyboard focus is
still on the same control, (c) the text caret is in the same place, (d) the token tree and
the editor panel have not scrolled, and (e) no region of the page outside the edited field
and its own validation area changed size or position.

**Acceptance Scenarios**:

1. **Given** a token is open in the editor with the value field focused, **When** the user
   edits the value and commits it (blur, Enter, or the editor's confirm control), **Then**
   the new value is shown within the "instant" threshold, no spinner or skeleton appears,
   and focus remains on that control with the caret position preserved.
2. **Given** the user has scrolled partway down a large token tree and opened a token,
   **When** they commit a value edit, **Then** neither the tree nor the editor panel scrolls
   and the same set of rows stays visible.
3. **Given** a token whose value is referenced (aliased) by several other tokens, **When**
   the user commits an edit to that token's value, **Then** the resolved-value previews of
   the referencing tokens update in place without the tree visibly rebuilding, flashing, or
   collapsing expanded groups.
4. **Given** the user is typing quickly in a value field (or holding a key), **When** they
   continue for several seconds, **Then** no characters are dropped and the displayed text
   never falls visibly behind their typing.
5. **Given** an edit produces an invalid value, **When** the validation message appears,
   **Then** it appears in space already reserved for it and does not push other controls
   down or sideways.

---

### User Story 2 - Tabbing and keyboard movement never disturb the page (Priority: P2)

A user moves through the editor with the keyboard — Tab and Shift+Tab between fields, arrow
keys within a control, moving from the token tree into the editor and back. As they move,
the only thing that visibly changes is the focus indicator moving from one control to the
next. Controls do not resize, content does not jump, panels do not blink or rebuild, and the
focus outline is always fully visible.

**Why this priority**: The request explicitly calls out tabbing and "moving around the page"
as things that must not trigger unexpected reflows or re-renders. Keyboard users and
assistive-technology users feel this most acutely — a layout shift on focus change moves the
target out from under them. It builds directly on P1 (a stable page) but is separable: it
can be delivered and tested purely as a focus-movement concern.

**Independent Test**: Starting from the first focusable control, press Tab through every
control in the token tree and editor for a representative token, then Shift+Tab back.
Verify at each stop that (a) the focus indicator is visible and not clipped or covered,
(b) no element other than the focus indicator changed position or size, (c) no panel
remounted, flashed, or showed a loading state, and (d) the focus order matches the visual
reading order.

**Acceptance Scenarios**:

1. **Given** any token is open in the editor, **When** the user presses Tab or Shift+Tab to
   move between controls, **Then** no visible content change occurs other than the focus
   indicator moving, and the newly focused control is fully scrolled into view with its
   focus outline unclipped.
2. **Given** focus is in the token tree, **When** the user tabs into the editor panel and
   back out, **Then** the tree's scroll position and expanded/collapsed state are unchanged
   and no rows re-render visibly.
3. **Given** a control that reveals supplementary UI on focus (e.g. a hint or a picker
   affordance), **When** it receives focus, **Then** that supplementary UI occupies space
   that was already reserved, so surrounding controls do not move.
4. **Given** the user tabs to a control near the bottom of the viewport, **When** the
   browser scrolls it into view, **Then** the token tree and page header do not move and no
   content outside the scrolled region reflows.
5. **Given** a screen reader is active, **When** the user tabs between controls, **Then**
   each focus change is announced once, with no repeated or duplicated announcements caused
   by content re-rendering.

---

### User Story 3 - Changes and selections stay local (Priority: P3)

When the user selects a different token, or makes an edit that affects other tokens, the app
updates only the parts of the screen that actually changed. Selecting token B after token A
swaps the editor contents and moves the selection highlight, but the rest of the tree, the
page header, and the file list stay visually still. An edit that changes a referenced value
updates the affected previews and nothing else.

**Why this priority**: This is the "no unexpected re-renders" half of the request at the
whole-page level. It matters for perceived quality and for performance on large documents,
but the app is already usable once P1 and P2 hold; this removes the remaining churn.

**Independent Test**: With a large document loaded, capture the rendered page, select a
different token, and capture again. Verify the visual difference is confined to the editor
panel and the selection highlight — the surrounding tree rows, header, and file list are
pixel-stable. Repeat for an edit to a widely-referenced token, confirming the diff is
confined to the referencing tokens' resolved previews.

**Acceptance Scenarios**:

1. **Given** a large token document with token A open, **When** the user selects token B,
   **Then** only the editor panel content and the selection highlight change; the rest of
   the tree, the header, and the file list do not shift, flash, or re-render visibly.
2. **Given** token A is open, **When** the user selects token B, **Then** the token tree's
   scroll position is preserved and any expanded groups remain expanded.
3. **Given** a token referenced by many others, **When** its value is edited, **Then** the
   time to reflect the change on screen does not grow noticeably with the number of
   referencing tokens for documents within the supported size range.
4. **Given** the user switches between the main app views (e.g. file list and token
   editor), **When** the view changes, **Then** shared chrome that is present in both views
   does not visibly rebuild or jump.

---

### Edge Cases

- **Widely-referenced token**: editing a token referenced by hundreds of others must not
  visibly rebuild the whole tree or drop below the instant threshold within the supported
  document size.
- **Reference retargeting**: changing a token's reference so its resolved value changes
  must update downstream previews in place, without collapsing or re-mounting tree groups.
- **Very large documents**: at the top of the supported size range, editing and tabbing
  must still meet the thresholds in Success Criteria; beyond that range, behavior is
  undefined by this feature.
- **Rapid consecutive edits**: fast typing, held keys, or quick successive commits must not
  queue up visible lag, drop input, or cause compounding re-renders.
- **Validation state churn**: an error message appearing and then clearing on the next
  keystroke must not cause the layout to bounce.
- **Mode / theme change mid-edit**: switching resolver mode or light/dark theme while a
  field is focused must not discard an in-progress edit or move focus to the page body.
- **Empty or single-token documents**: the stability guarantees still apply (no special
  case that only works once a tree is populated).
- **Focus after commit via Enter**: committing with Enter must leave focus on a sensible,
  visible control, never on the document body.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Committing a token value or name edit MUST reflect the new value in the
  editor, and in any resolved-value previews visible on screen, within the "instant"
  threshold defined in Success Criteria, with no loading indicator (spinner, skeleton,
  disabled/greyed state) shown for the edit.
- **FR-002**: During and after an edit, keyboard focus MUST remain on a control (never fall
  back to the document body), and the text caret / selection position within a text control
  MUST be preserved across the commit.
- **FR-003**: An edit MUST NOT change the scroll position of the token tree or the editor
  panel.
- **FR-004**: An edit MUST NOT cause any change in size or position of page regions other
  than the edited field and its own dedicated validation / feedback area.
- **FR-005**: Moving focus with Tab / Shift+Tab (or arrow keys where a control uses them)
  MUST NOT cause any visible change other than the focus indicator moving — no control
  resize, no content reflow, no panel remount, no loading state.
- **FR-006**: Focus order MUST follow the visual reading order of the controls, and there
  MUST be no focus trap other than intentional modal dialogs.
- **FR-007**: At every focus stop, the focus indicator MUST be fully visible — not clipped
  by an overflow boundary, and not obscured by another element.
- **FR-008**: When a focused control reveals supplementary UI (hints, affordances, helper
  text), that UI MUST occupy pre-reserved space so surrounding controls do not move.
- **FR-009**: Selecting a different token MUST visibly update only the editor panel content
  and the selection highlight; the remainder of the token tree, the page header, and the
  file list MUST remain visually stationary (no shift, flash, or visible re-render).
- **FR-010**: Selecting a different token, and tabbing between the tree and the editor, MUST
  preserve the token tree's scroll position and its expanded/collapsed group state.
- **FR-011**: Editing a token whose value is referenced by other tokens MUST update the
  resolved previews of the referencing tokens in place, without the tree rebuilding,
  flashing, or collapsing expanded groups.
- **FR-012**: Validation feedback appearing or disappearing MUST NOT shift surrounding
  layout — its space MUST be reserved whether or not a message is currently shown.
- **FR-013**: Sustained fast typing and held keys in an input MUST NOT drop characters, and
  the displayed text MUST NOT visibly lag the user's input.
- **FR-014**: Switching resolver mode or colour theme while a field is focused MUST NOT
  discard an in-progress edit or move focus to the document body.
- **FR-015**: The performance and stability guarantees in FR-001 through FR-014 MUST hold
  for documents up to the supported size defined in Assumptions; the feature MUST document
  the measured baseline it is holding the app to.
- **FR-016**: Switching between the app's main views MUST NOT cause shared chrome present in
  both views to visibly rebuild or jump.

### Non-Functional Requirements

- **NFR-001**: The interaction thresholds (edit reflected "instantly", typing echo within
  one frame) MUST be encoded as automated checks that fail if a change regresses them, not
  left to manual observation.
- **NFR-002**: Visual stability (no layout shift outside the intended region on edit, on
  focus change, on token selection) MUST be covered by automated checks in the project's
  existing whole-page / keyboard test tier.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In at least 95% of value-edit commits, the updated value is visible on screen
  within 100 ms of the commit, and no loading indicator is shown at any point.
- **SC-002**: During and after an edit, the measured layout shift of every page region
  outside the edited field and its validation area is zero.
- **SC-003**: Across a full Tab-through of the token tree and editor for each of the token
  types the app currently supports editing, focus lands on a control at 100% of steps
  (never the document body), the focus indicator is fully visible at 100% of steps, and no
  element other than the focus indicator changes position at any step.
- **SC-004**: Selecting a different token in a document of at least 1,000 tokens produces a
  rendered-page change confined to the editor panel and the selection highlight; the tree
  rows outside the selection, the header, and the file list are unchanged.
- **SC-005**: Editing a token referenced by at least 100 other tokens reflects on screen
  within the same 100 ms threshold as SC-001, and the tree does not visibly rebuild.
- **SC-006**: During 5 seconds of sustained typing at ~10 characters per second in a value
  field, zero characters are dropped and the displayed text never trails the input by more
  than one animation frame.
- **SC-007**: All of SC-001 through SC-006 hold for documents up to 2,000 tokens.
- **SC-008**: A documented before/after measurement shows the app meets SC-001 through
  SC-007 and is no worse than the recorded baseline on any measured interaction.

## Assumptions

- This feature hardens the existing token-editing and navigation flows. It does not add new
  screens, new editors, or new navigation destinations — "seamless" means the current flows
  stop being disruptive, not that new flows are introduced.
- "Fast" / "instant" is defined against human perception: ~100 ms for an edit to become
  visible, and one animation frame (~16 ms) for typed text to echo. These are the
  measurable targets in the absence of a stricter project-level performance budget.
- "Moving around the page" prioritises keyboard focus movement (Tab / Shift+Tab, and arrow
  keys within controls), which the request names explicitly. Pointer-driven selection and
  scrolling are also in scope for the visual-stability guarantees but are secondary.
- The supported document size for every guarantee in this spec is up to ~2,000 tokens,
  matching the upper end of realistic hand-maintained token sets and the project's large
  test fixtures. Larger documents are out of scope for these guarantees.
- Intentional, user-initiated UI changes — opening a dialog, expanding a disclosure,
  showing a reserved-space validation message, an explicit "saving to disk" indicator that
  is not part of the in-editor edit echo — are not "unexpected" reflows and are permitted.
- The guarantee is "meets the thresholds above and is no worse than a measured baseline",
  not a fixed percentage improvement over an unmeasured starting point; establishing that
  baseline is part of the work.
- The project's existing accessibility and end-to-end test tiers (component-level checks and
  whole-page / keyboard-flow checks) are the vehicle for the automated guards; no new
  testing framework is assumed.

## Dependencies

- Relies on the existing token pipeline (parse / edit / serialize) and the existing token
  tree and editor UI. There is no server component; all editing is local to the app.
- Interacts with the in-flight reference-editing feature (`009-edit-token-references`): the
  "editing a referenced token updates previews in place" guarantees here should be verified
  against that feature's picker once it lands, but this spec does not depend on it shipping
  first.
