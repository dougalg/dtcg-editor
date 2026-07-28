# Save Button as a Call-to-Action Component

Implemented on: 2026-07-28

Extracts the token tree editor's plain, unstyled inline `<button>` into a standalone `apps/web-app/components/SaveButton.tsx` component (+ co-located `SaveButton.module.css`), so it reads as the primary call-to-action of the editor rather than a minor control.

Key changes:

- `SaveButton` owns the button's icon, label, and CTA styling/state presentation (`onClick`/`disabled`/`pending` props); `TokenTree.tsx` keeps ownership of the save-error `<p role="alert">` message.
- Larger padding/font-size, rounded corners, solid accent background, `:hover`/`:focus-visible`/`:disabled` states (disabled state dims the same accent hue rather than switching to gray).
- A hand-rolled inline disk/floppy-disk SVG icon (`stroke="currentColor"`, `aria-hidden="true"`) rendered to the left of the label in both idle and pending (`"Saving…"`) states — no icon-library dependency added.
- New `--accent`/`--accent-hover`/`--accent-foreground` CSS custom properties added to `apps/web-app/app/globals.css`, with light (`:root`) and dark (`@media (prefers-color-scheme: dark)`) variants, introduced generically for future CTAs beyond just this button.
- Accessible name (`"Save"`/`"Saving…"`) and `disabled` semantics unchanged, so `TokenTree.test.tsx`'s existing assertions pass unmodified; a new `SaveButton.test.tsx` adds direct unit coverage.

Notable decisions:

- Accent color values (`#2563eb`/`#1d4ed8` light, `#3b82f6`/`#60a5fa` dark, white foreground) are a concrete but unvalidated-by-design-review first choice — cheap to revise later since they're isolated to three CSS variables in one file. `/sdd-review` flagged the dark-mode contrast margin as an info-level note, not a blocker.
- This session also hardened two vendored SDD skills (`sdd-feature`/`sdd-plan` `SKILL.md`) to make their end-of-step "wait for user review" instruction an enforced hard stop rather than a soft trailing sentence, and clarified `sdd-backlog-runner`'s `build-agent-brief.md` to reconcile "always run this step" with each step's own review checkpoint — a real process bug hit twice in this session's build run, fixed on direct human instruction. Not part of this feature's `feature.md`/`plan.md`, tracked here only because the commits landed on the same branch.
