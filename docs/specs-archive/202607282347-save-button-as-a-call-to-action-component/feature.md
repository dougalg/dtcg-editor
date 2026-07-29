# Feature: Save Button as a Call-to-Action Component

## Summary

The token tree editor's "Save" button is currently a plain, unstyled `<button>` inlined directly in `TokenTree.tsx`, indistinguishable from the tree's other minor controls (expand/collapse toggles, field inputs). This feature extracts it into its own reusable component, `SaveButton`, and restyles it as a larger, visually prominent call-to-action with a disk/save icon — signaling it as the primary action of the editor (committing pending edits to disk) rather than a secondary control.

## User Stories

- As a user editing design tokens in the web app, I want the Save button to look like the primary action of the screen, so I can find it at a glance and trust that clicking it is the deliberate "commit my changes" action.
- As a user with pending edits, I want the button's saving/disabled states to be visually obvious (not just a text change), so I know when it's safe to navigate away or wait.
- As a maintainer, I want the save button's markup/styling/state-display logic isolated in its own component, so it can be reused or restyled without touching `TokenTree.tsx`'s tree-rendering logic.

## Functional Requirements

### FR-01: Extract `SaveButton` component

Create `apps/web-app/components/SaveButton.tsx` (+ `SaveButton.module.css`), following this repo's existing one-component-per-file + co-located CSS-module convention (see `FolderOverview.tsx`/`FolderOverview.module.css`). `TokenTree.tsx` renders `<SaveButton ... />` instead of its current inline `<button>`.

`SaveButton` owns only the button itself (icon, label text, size/CTA styling, disabled/pending visual state). It does **not** own the save-error `<p role="alert">` message — that stays in `TokenTree.tsx`, since it's about displaying the save _result_, not the button's own anatomy, and `TokenTree.tsx` already has the `saveError`/`describeSaveError` wiring in scope.

Props (exact shape decided at `/sdd-plan` time, but must cover):

- A click handler (maps to today's `onClick={handleSave}`).
- Whether there are pending edits (maps to today's `disabled={!hasPendingEdits || saveState === "pending"}`).
- The current save state (`"idle" | "pending" | "error"`, from `useSaveTokenEdits`'s `saveState`) so the component can render its own pending-vs-idle label/appearance.

### FR-02: Larger call-to-action visual style

Restyle the button so it visually reads as the screen's primary action, distinct from the tree's inline controls:

- Larger than the current plain button: increased padding and font-size.
- Rounded corners (not a sharp-edged default `<button>`).
- A solid accent-color background with a contrasting (light) label/icon color, rather than the current no-background plain button.
- A `:hover` state (darker/deeper accent) and a `:focus-visible` outline for keyboard accessibility, plus a `:disabled` state (dimmed/desaturated, `cursor: not-allowed`) reusing the same accent hue rather than switching to a neutral gray, so it still reads as "the save button, just not currently actionable."
- New CSS custom properties added to `apps/web-app/app/globals.css` for the accent color (`--accent`, `--accent-hover`, `--accent-foreground`), with light/dark-mode variants following the same `@media (prefers-color-scheme: dark)` pattern the existing `--background`/`--foreground`/`--border`/`--error` variables use. This keeps the new color themeable and consistent with the rest of the app's dark-mode support, and makes the accent available for future CTAs beyond this one button.

### FR-03: Disk/save icon

Render a disk (floppy-disk) icon to the left of the label text, inside the button.

- Implemented as a small hand-rolled inline SVG (or a dedicated `.tsx` icon component returning inline SVG) — **not** a new icon-library dependency. `docs/project.md`'s Minimal Dependencies constraint requires any new dependency to be named and justified in `plan.md` before use, and a single static icon doesn't meet that bar (one glyph is trivially hand-drawn/hand-copied as SVG path data; pulling in an icon package for one icon would be exactly the kind of unjustified dependency the constraint exists to prevent).
- The SVG uses `currentColor` for its stroke/fill so it automatically follows the button's text color (including on hover/disabled), rather than hardcoding a color that could drift from the label.
- Icon renders in both idle and pending (`"Saving…"`) states — it does not swap to a spinner or disappear. (See Out of Scope.)

### FR-04: Preserve existing state semantics and accessible name

The button's accessible name must keep containing "Save" in both states, and the pending-state label text must remain `"Saving…"`, so the existing tests in `TokenTree.test.tsx` (`screen.getByRole("button", { name: /save/i })`) keep passing unmodified. The `disabled` logic (`!hasPendingEdits || saveState === "pending"`) is unchanged — only presentation moves into the new component.

## Acceptance Criteria

- [x] AC-01: `apps/web-app/components/SaveButton.tsx` exists as a standalone component with its own `SaveButton.module.css`, and `TokenTree.tsx` renders it in place of the old inline `<button>`.
- [x] AC-02: The rendered button is visually larger than the previous plain button (increased padding/font-size), has rounded corners, and uses a solid accent background with contrasting label/icon color.
- [x] AC-03: The button displays a disk/save icon (inline SVG, no new npm dependency) to the left of its label text, in both idle and pending (`"Saving…"`) states.
- [x] AC-04: The button has a visibly distinct `:hover` state, a visible `:focus-visible` outline, and a visibly distinct `:disabled` state (dimmed, `cursor: not-allowed`).
- [x] AC-05: New `--accent` / `--accent-hover` / `--accent-foreground` CSS custom properties are added to `apps/web-app/app/globals.css`, with both a light (`:root`) and dark (`@media (prefers-color-scheme: dark)`) value, matching the existing variable pattern.
- [x] AC-06: All existing tests in `apps/web-app/components/TokenTree.test.tsx` pass unmodified (button located via `getByRole("button", { name: /save/i })`, `.disabled` assertions, `"Saving…"` pending text).
- [x] AC-07: No new npm dependency is added to any `package.json` for this feature.
- [x] AC-08: `pnpm --filter web-app build`, `pnpm --filter web-app lint`, and `pnpm --filter web-app test` all pass.

## Technical Scope

### Affected Modules

- `apps/web-app/components/TokenTree.tsx` — remove inline `<button>` JSX, replace with `<SaveButton />`, keep the `saveError` alert paragraph as-is.
- `apps/web-app/components/TokenTree.module.css` — remove now-unused button-related styles, if any exist (currently the button has no dedicated class, so likely no change needed here).
- `apps/web-app/app/globals.css` — add new accent CSS custom properties.

### New Components Required

- `apps/web-app/components/SaveButton.tsx` — the extracted, restyled button component.
- `apps/web-app/components/SaveButton.module.css` — its CSS module.
- A small disk-icon SVG, either inlined directly in `SaveButton.tsx` or factored into its own tiny icon component/file if that reads more cleanly at plan/implementation time (implementation detail, not a spec-level requirement).

### Integration Points

- `apps/web-app/hooks/useSaveTokenEdits.ts` — unchanged; `SaveButton` consumes `saveState` (and `TokenTree.tsx` continues to consume `saveError`/`save` directly) exactly as today, just relocated to a prop interface instead of local closure variables.
- `apps/web-app/components/TokenTree.test.tsx` — unchanged (asserts through the public DOM/accessibility surface, not implementation), but implicitly becomes the first test coverage for `SaveButton`'s rendered output by virtue of exercising `TokenTree`.

## Non-Functional Requirements

- Performance: negligible — one more component boundary and a small inline SVG; no new runtime dependency, no bundle-size-relevant addition.
- Security: none — purely presentational change, no new data handling.
- Scalability: n/a.
- Accessibility: button must remain reachable/operable via keyboard (native `<button>` semantics preserved), with a visible `:focus-visible` state (new requirement, arguably an accessibility improvement over the current plain button which has no explicit focus styling beyond the browser default).

## Out of Scope

- A loading spinner or icon-swap animation for the pending (`"Saving…"`) state — the icon stays static; only the label text changes, matching today's behavior. Could be a future enhancement.
- Introducing an icon-library dependency (e.g. `lucide-react`, `heroicons`) — explicitly rejected in favor of a hand-rolled inline SVG per the Minimal Dependencies constraint.
- Redesigning the save-error (`<p role="alert">`) display, or the overall `TokenTree` layout/spacing beyond what's needed to accommodate the larger button.
- Applying the new `--accent` styling to any other button/control in the app (e.g. the expand/collapse toggle) — this feature only touches the Save button, though the new CSS variables are added in a reusable way for future use.
- Making the accent color user-configurable/themeable beyond the existing light/dark `prefers-color-scheme` split.

## Open Questions

None outstanding — the following design decisions were made directly (per the backlog item's framing as a self-contained visual polish task) rather than deferred, since they're inexpensive to revise later if the reviewer disagrees:

- Exact accent hue/shade: left as an implementation-time choice in `plan.md`, consistent with the existing neutral-gray/blue-leaning palette already implied by nothing in particular (no accent color exists yet in this codebase) — plan.md should pick a specific, concrete value rather than leaving it vague.
- Icon stays static (no spinner) during the pending state, to keep this feature scoped to "restyle + componentize," not "add new interaction/animation behavior."
