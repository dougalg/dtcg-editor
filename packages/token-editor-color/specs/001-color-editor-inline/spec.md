# Feature Specification: Inline CSS-Function Color Editor

**Feature Branch**: `001-color-editor-inline`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "I want the color editor to show all pieces of the editor inline, using the inline input styles that are already defined in the design system. When I switch color spaces it should translate the actual perceived color between spaces, not reinterpret the raw channel numbers. Remove the 'none' checkboxes entirely. The editor should appear initially as a single text field showing the value as a CSS function (e.g. `oklch(0 0 0)`) with a dashed underline. On hover, the function name and parentheses get a solid underline and a brighter color; clicking the function name opens a dropdown of color spaces. Selecting a new space auto-calculates equivalent values; if they don't map exactly, show a warning modal listing the changes for the user to accept or deny. The values inside the parentheses also look like plain text, get a solid underline and brighter color on hover, and are editable as regular number inputs. It should also have a Storybook story so I can see and preview the issues there."

## User Scenarios & Testing _(mandatory)_

### Visual reference

Author-provided mockups of the resting and hover states (channels + alpha shown,
`oklch( 0 0 0 / 12 )`):

- `assets/mockup-resting.png` — every editable segment (the colour-space select
  with its parentheses, each channel, the alpha) carries its own faint dotted
  underline in a muted foreground colour; the whole value is monospace; the `/`
  alpha separator and the padding spaces inside the parentheses carry no
  underline.
- `assets/mockup-hover-space-select.png` — the pointer is over the colour-space
  select: it and the bracketing `(` `)` have together become a solid underline
  in a stronger foreground colour; the channels and alpha are unchanged (still
  faint dotted underlines). (The mockup itself shows the space name as plain
  text; the spec now renders that position as a `Select` styled to match.)

### User Story 1 - Read and edit channel values in place (Priority: P1)

A token author looking at a color token sees its value rendered as a compact,
readable CSS color function — for example `oklch(0.7 0.15 145)` — in a monospace
face. Each channel number is a real number input from the outset, styled to read
as plain text with a faint dotted underline and no border, box, or spinner at
rest; there is no "click to turn this into a field" step. Hovering or focusing a
channel gives it a solid underline and a brighter foreground. The author types
into it directly; committing (blur or Enter) writes the new value back to the
token and the inline display re-renders with the updated number. Nothing about
the surrounding colour-space select, other channels, or layout shifts or reflows
onto multiple lines during this.

**Why this priority**: Editing an existing color's channels is the single most
common thing an author does with this control. It is a complete, demonstrable
slice on its own — even with color-space switching and the modal not yet built,
an author can open a color token and adjust its numbers.

**Independent Test**: Render the editor for an object-form color token, confirm
each channel is already a focusable input, focus one, type a new number, commit,
and assert the token value updated and the inline string re-rendered.

**Acceptance Scenarios**:

1. **Given** a color token with value `{ colorSpace: "oklch", components: [0.7, 0.15, 145] }`, **When** the editor renders, **Then** it reads as `oklch( 0.7 0.15 145 )` in a monospace typeface, where each channel is a number input styled as plain text — faint dotted underline, no border, box, or number-spinner — the colour-space name is a select control styled the same way, and the parentheses bracketing the channels carry the same faint dotted underline; there is no form-field chrome at rest.
2. **Given** the rendered editor, **When** the pointer hovers a single channel input, **Then** only that input's underline changes from dotted to solid and its foreground colour strengthens; the other channels and the colour-space select are unchanged.
3. **Given** the editor, **When** it first renders, **Then** every channel value is already a focusable numeric input (not a static label requiring a click to become editable), accepting typed input immediately on focus, with no layout shift between its resting and focused appearance.
4. **Given** a channel input with a new valid number typed in, **When** the author commits (Enter or blur), **Then** the token value's corresponding component updates to that number and the inline function string re-renders with it.
5. **Given** a focused channel input, **When** the author presses Escape, **Then** the edit is abandoned and the channel reverts to its previous value with no change written.
6. **Given** a channel input containing a non-numeric or empty string, **When** the author commits, **Then** no invalid value is written to the token and the channel reverts to its last valid value.

---

### User Story 2 - Switch color space, preserving the perceived colour (Priority: P1)

An author wants the same colour expressed in a different colour space — for
instance moving a value from `srgb` to `oklch` to reason about lightness and
chroma. The colour-space name is a select control styled to read as plain text;
opening it lists the available colour spaces. Choosing one converts the current
colour to its visually-equivalent representation in the new space rather than
carrying the old raw numbers across. When the conversion is exact within display precision, the
new function string simply appears. When it is not exact — the colour falls
outside the new space's gamut, or a channel becomes undefined — a modal appears
first, listing each channel's before and after value and stating what will be
lost, with **Accept** and **Deny** actions. Accepting applies the converted
(and, where needed, gamut-mapped) value; denying leaves the token exactly as it
was, still in the original space.

**Why this priority**: This is the core defect the feature exists to fix — today
switching space silently reinterprets the numbers and produces a different
colour. It is independently testable and delivers the feature's headline value.

**Independent Test**: Render the editor for an in-sRGB-gamut colour, switch from
`srgb` to `oklch`, and assert no modal appeared and the two function strings
describe the same colour within tolerance. Repeat starting from a wide-gamut
`oklch` value that is outside sRGB, switch to `srgb`, and assert the modal
appeared with per-channel deltas and that Deny left the value untouched.

**Acceptance Scenarios**:

1. **Given** the rendered editor, **When** the pointer hovers or keyboard focus lands on the colour-space select, **Then** the select and both bracketing parentheses change from a dotted to a solid underline and to a stronger foreground colour together, as one target, while the channels and alpha stay in their resting appearance.
2. **Given** the rendered editor, **When** the author opens the colour-space select, **Then** it lists the colour spaces available for this token (all supported spaces, or the configured subset when the token type restricts them), with the current space indicated.
3. **Given** a colour that is representable in the target space within display precision, **When** the author picks that space from the select, **Then** the token value's `colorSpace` and `components` update to the converted values, the inline string re-renders, and no modal is shown.
4. **Given** a colour that cannot be represented exactly in the target space (out of gamut, or a channel becomes undefined), **When** the author picks that space, **Then** a modal opens before any change is written, listing each component's current value, its proposed new value, and a plain-language note of what differs (e.g. "clamped to the sRGB gamut").
5. **Given** that modal, **When** the author chooses Accept, **Then** the converted and gamut-mapped value is written to the token and the inline string re-renders in the new space.
6. **Given** that modal, **When** the author chooses Deny or dismisses it, **Then** no change is written; the token keeps its original space and components, and the colour-space select is restored to show the original space.
7. **Given** a token whose type configuration restricts the offered colour spaces, **When** the author opens the colour-space select, **Then** it lists only the configured spaces plus the token's current space, in the spec's canonical order.

---

### User Story 3 - Consistent inline appearance from the design system (Priority: P2)

The control looks like editable prose, not a form. At rest it is text with a
dashed underline; interactive sub-parts reveal themselves on hover or focus with
a solid underline and a brighter colour. Every colour, spacing, typography,
underline, and motion value it uses comes from the design system's tokens, and
every interactive sub-part (the numeric inputs, the colour-space select, the
accept/deny modal) is built from the design system's existing components rather
than hand-rolled. The old stacked mini-caption layout, the bespoke per-package
stylesheet, the native colour-picker input, the separate optional hex field, and
the "none" checkboxes are all gone.

The design system may not yet expose a token or utility for the resting
dotted-underline / hover-and-focus solid-underline treatment itself. Where it
does not, that treatment is contributed to the design system as its own change
(tracked separately by the maintainer), not hardcoded in this package — this
story is not blocked on that treatment already existing, but the editor MUST
consume it from the design system once available rather than carrying a local
copy.

**Why this priority**: The visual/interaction model is what the author actually
experiences, and design-system conformance is a standing project requirement.
It depends on US1/US2 existing to style, so it is P2 rather than P1.

**Independent Test**: Render the editor and inspect that it contains no
hard-coded colour/length/radius/shadow/timing literals, uses design-system
components for the inputs/select/modal, and shows no "none" checkbox or
separate hex field.

**Acceptance Scenarios**:

1. **Given** the editor at rest, **When** it renders, **Then** each editable segment (the colour-space select + its bracketing parentheses as one, each channel, alpha) shows its own faint dotted underline in a muted foreground colour, and there is no button/box/border/caret chrome; the `/` alpha separator and the padding spaces inside the parentheses show no underline.
2. **Given** the editor, **When** the pointer leaves all sub-parts, **Then** every sub-part returns to the muted, faint-dotted-underline resting appearance.
3. **Given** the editor's markup and styles, **When** audited, **Then** there are no literal design values (hex/rgb colours, raw px/rem, ad-hoc radius/shadow/transition) — all such values resolve through design-system tokens.
4. **Given** the editor, **When** it renders any color token, **Then** no "none" checkbox and no standalone hex input field are present.
5. **Given** a viewport at the editor's minimum supported width, **When** the value is long, **Then** the inline string wraps within its container without horizontal overflow and remains fully editable.

---

### User Story 4 - Preview and inspect states in Storybook (Priority: P3)

The editor already has a Storybook story (`Editors/ColorEditor`, with `Default`
and `RestrictedColorSpaces` stories driven by a controlled wrapper) under the
repo-root Storybook. This feature extends that story so a contributor can see
the reworked editor across its meaningful states — a plain sRGB colour, a
wide-gamut `oklch` colour that is out of sRGB gamut, a colour with alpha, a
legacy bare-hex value, and a value whose channel is currently `none` — and can
drive the space-switch flow to see the warning modal, without running the full
web app.

**Why this priority**: A convenience for development and review, valuable but not
required for the feature to function. The story scaffold already exists, so this
is incremental.

**Independent Test**: Start Storybook, open `Editors/ColorEditor`, and confirm
each documented state renders and the space-switch interaction (including the
warning modal) can be exercised.

**Acceptance Scenarios**:

1. **Given** Storybook is running, **When** the contributor opens `Editors/ColorEditor`, **Then** the reworked editor renders without error for the existing `Default` and `RestrictedColorSpaces` stories.
2. **Given** the story, **When** the contributor selects a state showing an out-of-sRGB-gamut colour and switches it to `srgb`, **Then** the warning modal renders in Storybook with per-channel deltas.
3. **Given** the story, **When** it renders the added alpha, legacy bare-hex, and `none`-channel states, **Then** each renders without error.

---

### Edge Cases

- **Existing `none` channel**: a token value already containing a `"none"`
  component still renders (the channel shows as `none`); editing that channel
  replaces it with a number. The editor never writes a new `"none"`.
- **Legacy bare-hex value** (`"#rrggbb"` string form): still editable; it is
  presented in a form consistent with the inline model and can be adjusted
  without being silently rewritten into object form unless the author changes
  its space.
- **Conversion produces an undefined channel** (e.g. hue is undefined for an
  achromatic colour in a polar space): treated as an inexact conversion — the
  modal explains the channel is undefined and what value will be substituted.
- **Alpha present vs absent**: when the colour has alpha, the inline string
  includes the ` / <alpha>` segment and alpha is hover-editable like a channel;
  when absent, no alpha segment shows. Switching space preserves alpha
  unchanged.
- **sRGB `hex` fallback field on an object value**: kept consistent with the
  authored colour automatically; it is not presented as a separately-editable
  field.
- **Rapid repeated space switches**: each switch converts from the current
  displayed colour, not from an accumulating original, so repeated round-trips
  do not compound rounding beyond a single conversion's error each time.
- **Committing an out-of-range but numeric channel** (e.g. sRGB component `1.4`):
  the value is written (it is valid data) and the project's existing
  range/out-of-gamut warnings surface as they do today; this is distinct from
  the non-numeric case, which is rejected.
- **Colour-space select opened then dismissed without choosing**: no change;
  focus returns to the select, still showing the current space.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The editor MUST render an object-form color token's value as a
  single inline CSS-style colour function string (function name, parentheses,
  space-separated channel values, and an optional ` / alpha` segment).
- **FR-002**: At rest, each independently-interactive segment — the colour-space
  select taken together with the parentheses that visually bracket the channels
  (one segment), each channel value, and the alpha value when present — MUST show
  its own faint dotted underline in a muted foreground colour. The editor MUST
  NOT display form-field chrome (borders, boxes, buttons, number-spinners,
  select carets) at rest.
- **FR-002c**: Each channel value and the alpha value MUST be a real numeric
  input element, and the colour space MUST be a real select control, all present
  and focusable from first render — never a static label that a click converts
  into a control. Each control's resting and focused states MUST occupy the same
  space so focusing one causes no layout shift or reflow.
- **FR-002a**: The inline value — at rest and while a channel is being edited —
  MUST be rendered in a monospace typeface sourced from a design-system
  typography token, so channel columns read consistently.
- **FR-002b**: The `/` alpha separator and the whitespace padding inside the
  parentheses MUST be inert — no underline, no hover response, not focusable,
  not editable.
- **FR-003**: Hovering an individual channel value (or the alpha value) MUST
  promote that segment's underline from dotted to solid and strengthen its
  foreground colour, and MUST leave every other segment in its resting
  appearance.
- **FR-004**: Hovering the colour-space select MUST promote the select together
  with the parentheses that bracket the channels — as a single target — from a
  dotted to a solid underline and to a stronger foreground colour, leaving the
  channels and alpha in their resting appearance.
- **FR-004a**: Every segment MUST return to its resting muted, faint-dotted
  appearance once neither hovered nor focused nor being edited.
- **FR-004b**: Keyboard focus MUST produce the same solid-underline / stronger-
  foreground promotion that hover does for the focused segment (channel input or
  colour-space select), so the interactive parts are discoverable without a
  pointer.
- **FR-005**: Typing into a channel input and committing via Enter or blur MUST
  write the new number to that component; pressing Escape MUST abandon the
  in-progress edit and restore the input to the component's current value.
- **FR-006**: A channel edit that is empty or non-numeric MUST NOT be written to
  the token; the channel MUST revert to its last valid value.
- **FR-007**: The colour space MUST be presented as a select control (the design
  system's `Select`) rendered inline in the function-name position, present and
  focusable from first render and styled to read as plain text at rest. Opening
  it MUST list the colour spaces offered for this token, indicating the current
  space.
- **FR-008**: When the token type's configuration restricts offered colour
  spaces, the select MUST list only those spaces plus the token's current
  space, in the specification's canonical space order.
- **FR-009**: Selecting a different colour space MUST convert the current colour
  to its visually-equivalent representation in the target space — matching
  perceived colour — rather than copying the existing raw channel numbers under
  the new space.
- **FR-010**: When the converted colour is representable in the target space
  within display precision, the change MUST be applied directly with no modal.
- **FR-011**: When the converted colour is not exactly representable in the
  target space (outside its gamut, or a channel is undefined), the editor MUST
  present a confirmation modal before writing any change.
- **FR-012**: The confirmation modal MUST list, per channel, the current value,
  the proposed new value, and a plain-language description of the difference
  (e.g. gamut clamping, undefined channel substitution).
- **FR-013**: Accepting the modal MUST write the converted (and where required
  gamut-mapped) value to the token; denying or dismissing it MUST leave the
  token's space and components unchanged and MUST restore the colour-space
  select to display the original space (its shown value must never drift from
  the token's actual `colorSpace`).
- **FR-014**: Switching space MUST preserve an existing alpha value unchanged.
- **FR-015**: The editor MUST NOT present a "none" checkbox for any channel. A
  channel whose stored value is `"none"` MUST still render, and editing it MUST
  replace it with a number.
- **FR-016**: The editor MUST NOT present a standalone editable hex field. Where
  an object value carries an sRGB `hex` fallback, that fallback MUST be kept
  consistent with the authored colour without author intervention.
- **FR-017**: The editor MUST NOT present a native colour-picker input.
- **FR-018**: All interactive sub-parts (channel number inputs, the colour-space
  select, confirmation modal) MUST be built from the design system's existing
  components (`Input`, `Select`, `Dialog`); none may be hand-rolled where a
  design-system equivalent exists.
- **FR-019**: Every design value the editor uses (colour, spacing, typography,
  underline style, radius, shadow, motion) MUST come from design-system tokens;
  no literal design values may appear in the editor's markup or styles. The one
  inherently dynamic value — the rendered swatch/preview colour, if any — is
  token data, not a design decision, and is exempt.
- **FR-019a**: If the design system does not yet provide the resting-dotted /
  hover-and-focus-solid underline treatment, it MUST be added to the design
  system and consumed from there. The editor MUST NOT ship a local hardcoded
  version of it as a permanent solution; a short-lived local placeholder is
  acceptable only if the plan explicitly tracks its removal.
- **FR-020**: A legacy bare-hex string value MUST remain viewable and editable;
  it MUST NOT be silently converted to object form unless the author explicitly
  changes its colour space.
- **FR-021**: The editor MUST continue to surface the project's existing
  range / out-of-gamut validation messages for values that are numerically valid
  but outside a channel's expected range.
- **FR-022**: The editor's existing Storybook story (`Editors/ColorEditor`)
  MUST be extended to cover, at minimum: a plain sRGB colour (existing
  `Default`), a restricted-space case (existing `RestrictedColorSpaces`), an
  out-of-sRGB-gamut wide-gamut colour, a colour with alpha, a legacy bare-hex
  value, and a value with a `none` channel; and it MUST allow exercising the
  space-switch flow including the warning modal. No change to the repo-root
  Storybook configuration or its story-discovery globs is required.
- **FR-023**: The inline string MUST wrap within its container at the editor's
  minimum supported width without causing horizontal page overflow, and MUST
  stay fully editable when wrapped.

### Key Entities _(include if feature involves data)_

- **Color value (object form)**: a colour space identifier, three channel
  components (each a number, or the legacy `none`), an optional alpha, and an
  optional sRGB hex fallback. The unit the editor reads and writes.
- **Color value (legacy form)**: a bare 6-digit hex string; a
  project-acknowledged deviation from the current spec, still supported.
- **Color space**: one of the specification's defined colour spaces; determines
  the function name shown, the number and meaning of channels, and each
  channel's expected range.
- **Conversion result**: the target-space colour plus metadata describing
  whether it is exact, was gamut-mapped, or has an undefined channel — the input
  to the decision of whether to show the confirmation modal and what it lists.
- **Channel edit**: a transient in-progress edit of one channel value, with a
  committed and an abandoned outcome.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An author can change a single channel value by focusing its input
  (click or Tab) and typing — no mode-switch step, no more than one interaction
  before typing.
- **SC-002**: For every pair of colour spaces, converting an in-target-gamut
  colour from one to the other and back returns a colour within a small,
  documented perceptual tolerance of the original (no visible colour shift).
- **SC-003**: 100% of colour-space switches that would change the stored colour
  beyond display precision present the confirmation modal before writing;
  0 silent colour changes occur on space switch.
- **SC-004**: 100% of in-gamut, exactly-representable space switches apply
  without a modal.
- **SC-005**: Denying the confirmation modal leaves the token value byte-for-byte
  unchanged in 100% of cases.
- **SC-006**: An audit of the editor's markup and styles finds zero literal
  design values (colours, lengths, radii, shadows, transitions).
- **SC-007**: The editor renders correctly for all supported colour spaces, the
  legacy hex form, alpha-present and alpha-absent values, and `none`-channel
  values, with no console errors.
- **SC-008**: A contributor can preview every state named in FR-022 and trigger
  the warning modal entirely within Storybook, without starting the web app.
- **SC-009**: The editor introduces no new third-party runtime dependency for
  colour conversion.

## Assumptions

- **Perceptual conversion lives in this package, using the existing library**:
  the visually-equivalent cross-space conversion and gamut mapping required by
  FR-009/FR-011/FR-013 are implemented in `@dtcg-editor/token-editor-color`
  itself (a framework-free `src/utils/` module), backed by the `colorjs.io`
  dependency it already has. The constitutions were amended for this feature —
  repo-root Principle VII (v3.0.0) and the package constitution's Principle I
  (v2.0.0) now place UI-driven perceptual colour conversion + `colorjs.io` in
  the `token-editor-*` package, not `token-core`. `token-core` still owns
  `ColorValue` parsing, schemas, and serialization, which this package imports
  unchanged. `culori` and other alternatives are explicitly not adopted:
  `colorjs.io` already performs perceptual conversion and CSS Color 4-style
  gamut mapping, so a new dependency would not meet the "demonstrate the
  first-party/existing approach falls short" bar.
- **"Inexact" trigger for the modal**: a conversion is treated as inexact — and
  the modal shown — when the target-space value is outside that space's gamut,
  when any channel becomes undefined, or when any channel would change by more
  than the editor's display rounding. A conversion that is exact within
  displayed precision applies silently.
- **"Deny" semantics**: denying or dismissing the modal is a full no-op — the
  token keeps its original colour space and components; it does not switch space
  with un-converted numbers.
- **Alpha editing**: alpha remains editable inline as a `/ <alpha>` segment
  shown only when the value carries alpha; a lightweight affordance to add or
  remove alpha replaces the former "has alpha" checkbox. Exact affordance is a
  design detail for the plan.
- **Legacy hex form**: bare-hex values keep a minimal inline treatment and are
  out of scope for the space-switching flow unless the author changes the space,
  at which point the value becomes object form.
- **Design-system inline styling**: "the inline input styles already defined in
  the design system" is taken to mean the design system's existing form-control
  token set and components (text input, dropdown/select, dialog) plus its
  typography/colour tokens for the at-rest text and underline treatment; there
  is no separately-named "inline input" component to match. The design system
  already defines a monospace font-family typography token (`typography.mono`),
  which FR-002a consumes.
- **Underline treatment may be a new design-system contribution**: the design
  system may not currently expose the resting-dotted / hover-and-focus-solid
  underline treatment as a token or utility. Per the maintainer, adding it is a
  separate change they will make to the design system; this feature depends on
  it but does not have to land it. FR-019a governs: consume it from the design
  system, no permanent local hardcode. Sequencing (does the design-system change
  land first, or does the editor use a tracked placeholder in the interim) is a
  `plan.md` decision.
- **Every part is a live control from first render**: each channel and the alpha
  are real numeric inputs; the colour space is a real select — all present and
  focusable immediately, styled to read as plain text (FR-002c). There is no
  view-mode/edit-mode toggle for any of them.
- **Colour-space control is a `Select` (decided for now)**: the space picker
  uses the design system's `Select` rather than a static label with a
  click-triggered menu. Chosen for consistency with the always-live-control
  model, built-in keyboard/a11y behaviour, and Principle XII (reuse the
  design-system component). Known cost: the select's trigger chrome (its caret,
  platform rendering) must be styled down to read as bare underlined text
  matching the channels, and on a denied space switch its shown value must be
  reset to the original space (FR-013). Revisit if the plain-text styling proves
  impractical.
- **Storybook**: the repo-root Storybook (`.storybook/`, globbing
  `packages/*/src/**/*.stories.*`, wired into turbo) and an
  `Editors/ColorEditor` story with `Default` and `RestrictedColorSpaces`
  stories already exist. This feature only extends that story file with
  additional states and the modal-exercising interaction; it changes nothing
  about how Storybook itself is configured, discovered, or built.
- **Scope boundary**: this feature reworks the color token editor UI and its
  conversion behaviour only. It does not change the color token data model, the
  set of supported colour spaces, validation rules, serialization, or any other
  token type's editor.
- **Accessibility**: the control remains operable by keyboard and screen reader
  — the hover-revealed sub-parts are also reachable and actuatable via keyboard,
  and the modal follows the design system's dialog semantics. Meeting the
  project's existing accessibility test tiers is assumed, not restated per
  requirement.
