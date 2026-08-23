# Missing opacity token family

## Distilled rationale

No `--dtcg-ed-opacity-*` token exists anywhere in `packages/design-system/src/design-tokens/*.json` — there are 17 token files (`borders`, `colors`, `containers`, `corners`, `cube`, `dark`, `elevation`, `focus`, `form-controls`, `motion`, `palette`, `panels`, `shadows`, `size`, `space`, `tokens.resolver`, `typography`) and none of them cover opacity. Found while tokenizing hardcoded CSS values across the component library per constitution Principle XII ("no hardcoded design values"/DESIGN.md) — every `opacity:` declaration with a real (non-0/1) value had nowhere compliant to go and was left as a literal.

Two different things are hiding under "opacity" in the current codebase, and only one of them is actually the token gap:

- **`opacity: 0` / `opacity: 1`** (~30 occurrences, all inside `Dialog.css`, `Popover.css`, `DropdownMenu.css`, `Select.css`) are fade-in/fade-out keyframe endpoints — boundary values in the same category as `0`/`100%`/`none`, not a design decision. No token needed here, consistent with DESIGN.md's existing zero/keyword exception.
- **The real gap**: semantic opacity values with no token to reference, found across two components' worth of intent that happen to disagree with each other.

## Findings

### (a) Disabled-state opacity — already a de facto standard, just unformalized

`opacity: 0.5` appears near-identically across at least 9 components: `Button.css:60`, `Select.css:47`, `Checkbox.css:53`, `RadioGroup.css:51`, `Switch.css:52`, `Textarea.css:14`, `Tabs.css:55`, `Command.css:71`, and `DropdownMenu.css:53` (disabled menu item). Every one of these independently landed on the same value for the same purpose (a disabled form control / disabled menu item). This is the easy half of the fix: a `--dtcg-ed-opacity-disabled: 0.5` token would just formalize existing consensus, not require a new design decision.

### (b) Muted/secondary-content opacity — no consensus, three different values

- `apps/web-app/components/FallbackValueEditor/FallbackValueEditor.module.css:4` — `opacity: 0.6`
- `packages/token-editor-color/src/components/ColorEditor/ColorEditor.module.css:26` — `opacity: 0.6`
- `apps/web-app/components/FolderOverview/FolderOverview.module.css:66` — `opacity: 0.7`
- `apps/web-app/components/TokenBlock/TokenBlock.module.css:61` — `opacity: 0.85`

All four appear to express the same design intent ("muted"/secondary text), but land on three different values. This is worse than a missing token — it's visible, uncorrected drift that a token would force a decision on and then keep consistent. Notably, `docs/backlog.md` already has an open item flagging one symptom of this: `TokenTree.module.css`'s `.type` label combines `var(--dtcg-ed-color-neutral-text-quiet)` with `opacity: 0.6`, which renders at ~2.92:1 contrast against white — failing WCAG 2.2 AA's 4.5:1 requirement for small text. A resolved muted-opacity token is one plausible fix for that bug too, if the chosen value is picked with contrast in mind rather than copied from one of the existing three guesses.

## Recommendation

Add an `opacity.json` (or fold into an existing token file, e.g. `form-controls.json` for the disabled case) defining at minimum:
- `--dtcg-ed-opacity-disabled` — set to `0.5`, matching the existing de facto standard across 9 components. No design judgment call needed, purely formalizing what's already there.
- A muted/secondary-content opacity token — needs an actual design decision (which of `0.6`/`0.7`/`0.85`/something else is correct), ideally checked against WCAG contrast at whatever text color it's paired with, given the known contrast failure above.

Then update all the call sites listed in (a) and (b) to reference the new tokens instead of their literals, closing out the gap this doc describes.
