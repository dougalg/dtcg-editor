# Implementation Plan: Save Button as a Call-to-Action Component

## Overview

Extract the inline `<button>` currently at the bottom of `TokenTree.tsx` into a new `apps/web-app/components/SaveButton.tsx` component, paired with `SaveButton.module.css`. The new component owns the button's markup, CTA styling, and a hand-rolled inline SVG disk icon; `TokenTree.tsx` passes it `onClick`, `disabled`, and `saveState` and keeps ownership of the `saveError` alert paragraph. New `--accent`/`--accent-hover`/`--accent-foreground` CSS custom properties are added to `apps/web-app/app/globals.css` (light + dark variants) for the button's background/hover/label color. No new npm dependency.

## Architecture Decisions

- **Accent color values**: `--accent: #2563eb` (Tailwind-blue-600-equivalent) / `--accent-hover: #1d4ed8` for light mode; `--accent: #3b82f6` / `--accent-hover: #60a5fa` for dark mode; `--accent-foreground: #ffffff` in both modes (a saturated blue background reads fine with white text/icon in both themes, so this one doesn't need a dark-mode override). Chosen as a standard, unsurprising "primary action" blue consistent with the neutral/functional palette already in `globals.css` (no existing brand color to match); concrete enough to implement, trivially tweakable later since it's isolated to 3 CSS variables.
- **Component boundary**: `SaveButton` owns only the `<button>` (icon + label + CTA styling + disabled/pending presentation). It does not own the `saveError` `<p role="alert">` — that stays in `TokenTree.tsx`. Rationale already captured in `feature.md`'s FR-01: the error message is about the _result_ of a save, not the button's own anatomy, and `TokenTree.tsx` already has `saveError`/`describeSaveError` in scope, so moving it would just add a prop for no cohesion benefit.
- **Props shape**:
  ```ts
  function SaveButton({
  	onClick,
  	disabled,
  	pending,
  }: {
  	onClick: () => void;
  	disabled: boolean;
  	pending: boolean;
  }): JSX.Element;
  ```
  `TokenTree.tsx` passes `disabled={!hasPendingEdits || saveState === "pending"}` (unchanged expression, just relocated to a prop) and `pending={saveState === "pending"}`. Passing a derived `pending: boolean` rather than the raw `saveState` string keeps `SaveButton`'s prop surface minimal and decoupled from `useSaveTokenEdits`'s state union — `SaveButton` doesn't need to know about `"error"` vs `"idle"`, only whether to show the pending label.
- **Icon**: a disk/floppy-disk icon inlined as SVG directly inside `SaveButton.tsx` (not a separate icon component file — a single, single-use glyph doesn't warrant its own module per the "one component per file" convention, which is about components with independent identity/reuse, not every SVG fragment). Uses `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"` paths so it inherits the button's label color automatically in every state (idle/hover/disabled) with zero extra CSS.
- **Icon markup during pending state**: stays rendered and unchanged (per feature.md's Out of Scope — no spinner/animation this pass); only the adjacent label text swaps `"Save"` → `"Saving…"`.
- **CSS Module class names**: `styles.button` (base CTA styles + `:hover`/`:focus-visible`/`:disabled` via `&:hover`-equivalent plain CSS since this repo doesn't use nesting elsewhere — check `TokenTree.module.css` for precedent, which uses flat selectors, so mirror that with `.button:hover`, `.button:focus-visible`, `.button:disabled`), `styles.icon`, `styles.label`.
- **No new dependency**: confirmed against `docs/project.md`'s Approved Dependencies list — nothing there covers icons, and none is being added. AC-07 covers this.

## Implementation Steps

### Step 1: Add accent CSS custom properties

- [x] Add `--accent`, `--accent-hover`, `--accent-foreground` to `:root` in `apps/web-app/app/globals.css` (light values).
- [x] Add `--accent`, `--accent-hover` overrides inside the existing `@media (prefers-color-scheme: dark)` block (dark values); `--accent-foreground` unchanged (white works on both).
- Files: `apps/web-app/app/globals.css`

### Step 2: Create the `SaveButton` component

- [x] Create `apps/web-app/components/SaveButton.tsx`: a function component accepting `{ onClick, disabled, pending }`, rendering a `<button type="button">` with `onClick`, `disabled`, `className={styles.button}`, containing the inline disk SVG (`className={styles.icon}`, `aria-hidden="true"`) followed by a `<span className={styles.label}>{pending ? "Saving…" : "Save"}</span>`.
- [x] Create `apps/web-app/components/SaveButton.module.css`: `.button` (flex row, `align-items: center`, `gap`, larger padding e.g. `0.65rem 1.4rem`, `font-size: 1rem`, `font-weight: 600`, `border: none`, `border-radius: 0.5rem`, `background: var(--accent)`, `color: var(--accent-foreground)`, `cursor: pointer`), `.button:hover:not(:disabled)` (`background: var(--accent-hover)`), `.button:focus-visible` (visible outline, e.g. `outline: 2px solid var(--accent-hover); outline-offset: 2px`), `.button:disabled` (`opacity: 0.5; cursor: not-allowed`), `.icon` (fixed size e.g. `width: 1.15em; height: 1.15em`), `.label` (no special styling needed beyond inheriting).
- Files: `apps/web-app/components/SaveButton.tsx`, `apps/web-app/components/SaveButton.module.css`

### Step 3: Wire `SaveButton` into `TokenTree.tsx`

- [x] Import `SaveButton` in `apps/web-app/components/TokenTree.tsx`.
- [x] Replace the inline `<button type="button" onClick={handleSave} disabled={...}>{...}</button>` block (current lines ~319–325) with `<SaveButton onClick={handleSave} disabled={!hasPendingEdits || saveState === "pending"} pending={saveState === "pending"} />`.
- [x] Leave the adjacent `{saveState === "error" && saveError !== undefined && (<p role="alert">{describeSaveError(saveError)}</p>)}` block untouched, directly after the new `<SaveButton />`.
- [x] Check `TokenTree.module.css` for any now-orphaned button-specific class (none expected — the old button had no `className`) and remove if present.
- Files: `apps/web-app/components/TokenTree.tsx`, `apps/web-app/components/TokenTree.module.css` (if applicable)

### Step 4: Verify existing tests still pass unmodified

- [x] Run `pnpm --filter web-app test` and confirm `TokenTree.test.tsx`'s three `getByRole("button", { name: /save/i })` assertions and the `.disabled` checks pass with no test-file edits, since the accessible name (icon `aria-hidden` + `"Save"`/`"Saving…"` label text) and disabled semantics are unchanged.
- [x] No new test file is strictly required by feature.md (SaveButton is exercised indirectly via TokenTree's existing tests, per feature.md's Integration Points), but add a small `apps/web-app/components/SaveButton.test.tsx` if implementation reveals meaningfully separable behavior worth unit-testing on its own (e.g. label text swap, disabled propagation) — optional, judgment call at implementation time, not a blocking requirement.
- Files: `apps/web-app/components/TokenTree.test.tsx` (verify only, no edits expected), optionally `apps/web-app/components/SaveButton.test.tsx` (new, optional)

### Step 5: Full verification

- [x] `pnpm --filter web-app build`
- [x] `pnpm --filter web-app lint`
- [x] `pnpm --filter web-app test`
- [x] Manual sanity check of `git diff` to confirm no `package.json`/`pnpm-lock.yaml` changes (AC-07).

## Acceptance Criteria Mapping

| AC                                                              | Verified By                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| AC-01: `SaveButton` exists, own CSS module, used by `TokenTree` | Step 2 + Step 3 file creation/edit; manual review of `TokenTree.tsx` diff      |
| AC-02: larger, rounded, solid-accent CTA styling                | Step 2 `.button` CSS rules; manual visual check (`pnpm --filter web-app dev`)  |
| AC-03: disk icon in both idle and pending states                | Step 2 inline SVG always rendered regardless of `pending`; manual visual check |
| AC-04: `:hover`, `:focus-visible`, `:disabled` states           | Step 2 CSS rules; manual visual/keyboard check                                 |
| AC-05: new `--accent*` CSS vars, light + dark                   | Step 1 `globals.css` edit                                                      |
| AC-06: existing `TokenTree.test.tsx` passes unmodified          | Step 4 — `pnpm --filter web-app test`                                          |
| AC-07: no new npm dependency                                    | Step 5 — `git diff` check on `package.json`/`pnpm-lock.yaml`                   |
| AC-08: build/lint/test all pass                                 | Step 5                                                                         |

## Risks & Mitigations

- Risk: accent-on-accent contrast (white label/icon on the chosen blue) could fail WCAG contrast in one of the two theme variants → Mitigation: chosen blues (`#2563eb` light / `#3b82f6` dark) against white both exceed 4.5:1 at this saturation/lightness; spot-check visually during Step 5's manual check, adjust shade if it looks off rather than treating the exact hex as final.
- Risk: changing the button's DOM structure (icon + span instead of a single text node) could change its computed accessible name in a way that breaks `/save/i` matching → Mitigation: icon SVG is `aria-hidden="true"` so it's excluded from the accessible name computation; the visible label span text (`"Save"`/`"Saving…"`) remains the sole contributor, identical to today's behavior. Verified by Step 4's unmodified test run.
- Risk: `TokenTree.module.css` might have on button-related styling not caught during planning → Mitigation: Step 3 explicitly checks for and removes any orphaned class during implementation.

## Estimated Complexity

Low — a single new presentational component plus CSS variable additions, no state/logic changes, no new dependency, no API/data-layer touch. Main effort is CSS styling and manual visual verification rather than logic.
