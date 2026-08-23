# dtcg-editor Design System Usage

This document governs how UI/component work in this repo consumes
`packages/design-system`. It is the reference `Principle XII: Design System
Usage` in `.specify/memory/constitution.md` points to — that principle is
the enforceable rule; this file is where its detail lives, per the same
constitution/spec split described in the constitution's Governance section.

## The rule

Two MUSTs, both in force at once:

1. **No hardcoded design values in component or app code.** Every value that
   expresses a design decision — color, spacing, sizing, radius, border
   width, shadow, typography, motion/timing/easing, z-index/elevation —
   MUST come from `packages/design-system`, never written as a literal in
   TSX, CSS, or inline styles.
2. **No reimplementing what `packages/design-system` already provides as a
   component.** If `packages/design-system` exports a component for the
   UI element being built (a button, a text/select/checkbox/radio/switch/
   textarea form control, a dialog, popover, dropdown menu, tabs, accordion,
   card, badge, alert, avatar, combobox, or command palette), that component
   MUST be imported and used — not recreated with raw `<button>`, `<input>`,
   `<dialog>`, or a hand-rolled equivalent, even one that itself only uses
   `var(--dtcg-ed-*)` tokens correctly. Token-correct-but-reimplemented is
   still non-compliant: it duplicates behavior (focus management, ARIA
   wiring, keyboard interaction) that the shared component already owns.

Rule 1 (no hardcoded values) applies to `packages/design-system`'s own
component CSS too, with no exemption — `Button.css` and its siblings
already follow this correctly (see the reference pattern in "Where values
live and how they flow" below), and any new or edited design-system
component CSS must keep doing so. The only real exemption is the token
*source*: `packages/design-system/src/design-tokens/*.json` (the DTCG
token definitions) and the generated `dist/styles/tokens.css` output, where
literal values necessarily live because that's what's being defined — a hex
value inside `palette.json` is the design system, not a violation of it.

Rule 2 (reuse the component library) doesn't meaningfully apply to
`packages/design-system` itself, which can't "reuse" its own components —
it applies to every *consumer*: `apps/web-app` and every `token-editor-*`
package's `Editor` UI.

## Where values live and how they flow

1. **Source of truth**: DTCG token JSON files in
   `packages/design-system/src/design-tokens/*.json` (`palette.json`,
   `space.json`, `size.json`, `typography.json`, `borders.json`,
   `corners.json`, `shadows.json`, `elevation.json`, `motion.json`,
   `focus.json`, `form-controls.json`, `containers.json`, `panels.json`,
   `cube.json`, `dark.json`, plus `tokens.resolver.json` wiring them
   together). These are themselves DTCG-format token documents and fall
   under constitution Principle I (DTCG Spec Compliance).
2. **Build step**: `pnpm --filter @dtcg-editor/design-system build` runs
   `sugarcube generate`, compiling the token JSON into CSS custom
   properties, published as `@dtcg-editor/design-system/styles/tokens.css`
   and consumed via the package's `exports` map
   (`./styles/tokens.css`, `./styles/*`, `./components/*`).
3. **Naming convention**: every generated custom property is prefixed
   `--dtcg-ed-*` (e.g. `--dtcg-ed-color-fill-loud`,
   `--dtcg-ed-space-2xs`, `--dtcg-ed-form-control-radius`,
   `--dtcg-ed-transition-normal`, `--dtcg-ed-ease-out`). Component CSS
   consumes these via `var(--dtcg-ed-*)`, with a semantic fallback var
   where one exists (e.g.
   `var(--dtcg-ed-color-fill-loud, var(--dtcg-ed-color-neutral-fill-loud))`) —
   never a literal fallback value.
4. **Consumption points**:
   - `packages/design-system/src/components/*` — the component library
     itself (`Button`, `Card`, `Dialog`, etc.), each a
     `Component.tsx` + `Component.css` pair using `var(--dtcg-ed-*)`
     exclusively for anything design-related.
   - `packages/design-system/src/styles/{compositions,utilities,blocks,global}`
     — layout primitives (grid, cluster, switcher, sidebar, repel, wrapper,
     flow, prose, region, visually-hidden) and global resets. Layout
     primitives may use bare CSS layout properties (`display: grid`,
     `gap: var(--dtcg-ed-space-*)`) but any spacing/sizing value in them
     still comes from tokens.
   - `apps/web-app/**/*.module.css` and `token-editor-*` component CSS —
     application-level styling MUST reference `var(--dtcg-ed-*)` for every
     design value; it MUST NOT declare its own hex color, raw `px`/`rem`
     spacing, ad hoc `border-radius`, hand-picked `box-shadow`, or a
     bespoke transition duration/easing.
   - React inline `style={{ ... }}` props MUST NOT carry a hardcoded design
     value. If a value needs to be computed at runtime (e.g. a dynamic
     swatch preview color from token data being edited), that's data being
     rendered, not a design decision — Principle I/IV govern that value's
     correctness, not this document. Structural/layout values (a computed
     `grid-template-columns` count, a measured pixel offset from
     `getBoundingClientRect`) are exempt for the same reason: they are not
     design tokens, they are runtime-computed layout math.

## Using design-system components

`packages/design-system/src/components` currently exports: `Accordion`,
`Alert`, `Avatar`, `Badge`, `Button`, `Card`, `Checkbox`, `Combobox`,
`Command`, `Dialog`, `DropdownMenu`, `Input`, `Label`, `Popover`,
`RadioGroup`, `Select`, `Switch`, `Tabs`, `Textarea`. Each is imported by
its concrete file path through the package's `exports` map, matching the
pattern already used in `apps/web-app`:

```tsx
import { Badge } from "@dtcg-editor/design-system/components/Badge/Badge.tsx";
import { Input } from "@dtcg-editor/design-system/components/Input/Input.tsx";
import { Label } from "@dtcg-editor/design-system/components/Label/Label.tsx";
```

Before writing a new interactive element by hand, check this list first. A
raw `<button>` where `Button` covers the case, a raw `<input>` where `Input`
or `Textarea` covers it, a custom overlay where `Dialog`/`Popover`/
`DropdownMenu` covers it — all non-compliant, regardless of whether the
hand-rolled version references tokens correctly for color/spacing.

If no existing component covers the UI element being built, building a new
one is not itself a violation — but per constitution Principle X, once 3+
structurally/stylistically/functionally similar one-off components exist
across the codebase, that MUST be flagged as a candidate for extraction
into `packages/design-system`, the same reuse threshold Principle X already
states. A one-off component built this way still MUST NOT hardcode design
values (Rule 1 above still applies) — it composes existing tokens even
when it can't compose an existing component.

## What "no hardcoded values" catches

Not allowed, anywhere in `apps/web-app`, a `token-editor-*` package's UI, or
`packages/design-system`'s own component CSS (everywhere except the token
source files and generated `tokens.css` output described above):

- A hex/rgb/hsl/oklch color literal (`color: #3b82f6`, `background:
  rgba(0,0,0,0.1)`) instead of `var(--dtcg-ed-color-*)`.
- A bare spacing/sizing number (`padding: 12px`, `gap: 1rem`, `width: 240px`)
  instead of `var(--dtcg-ed-space-*)` / `var(--dtcg-ed-size-*)`.
- A hand-picked `border-radius`, `border-width`, or `border-style` instead
  of `var(--dtcg-ed-form-control-radius)` / `var(--dtcg-ed-border-*)`.
- A one-off `box-shadow` value instead of `var(--dtcg-ed-shadow-*)` /
  `var(--dtcg-ed-elevation-*)`.
- A hardcoded `font-size`, `font-weight`, `line-height`, or `font-family`
  instead of `var(--dtcg-ed-text-*)` / `var(--dtcg-ed-font-weight-*)`.
- A hardcoded `transition-duration`/`transition-timing-function` instead of
  `var(--dtcg-ed-transition-*)` / `var(--dtcg-ed-ease-*)`.
- A raw `z-index` number instead of an elevation token.

Two narrow, self-documenting exceptions:

- **Component-private layout math** scoped with a `--_`-prefixed custom
  property local to that component (the existing `Button.css` pattern:
  `--_padding-block`, `--_form-control-height` computed from token values
  via `calc()`/`round()`), where the *inputs* are still tokens and only the
  derived formula is component-local.
- **Zero and `100%`/`1fr`/`auto`/`none`** and other value-free CSS keywords
  are not design decisions and don't need a token.

## What this doesn't change

This document does not introduce a new token format, a new build tool, or a
new package — `packages/design-system` and its `sugarcube`-based build
already exist and already work this way for the design-system's own
components (see `Button.css` for the reference pattern). This document
makes explicit, and the linked constitution principle makes mandatory, that
every *consumer* of design-system (the web app, the token-editor-* Editor
components) follows the same discipline, rather than treating design-system
usage as opt-in per component.

## Enforcement

There is no automated lint rule for either MUST yet: a future `stylelint`
rule disallowing raw color/length literals outside `design-tokens`-generated
files would close the values gap, and a future rule (or codemod-assisted
review check) flagging raw `<button>`/`<input>`/`<dialog>` elements where a
design-system equivalent exists would close the components gap — neither
built yet, tracked as a gap the same way Principle X notes the still-
unenforced one-component-per-file rule. Until that tooling exists, this is
a review-time requirement: a PR introducing a hardcoded design value
anywhere it's disallowed (including inside `packages/design-system`'s own
component CSS), or reimplementing a UI element `packages/design-system`
already exports (in `apps/web-app` or a `token-editor-*` package's UI), is
non-compliant with constitution Principle XII and MUST be corrected before
merge, the same as any other blocking constitution finding.
