# Contract: token addressing and navigation

No way to address an individual token exists today — only two content routes (`/`, `/tokens/<file>`) and two `<Link>`s in the whole app. This contract defines the addressing scheme User Stories 2 and 3 both depend on.

## URL form

```
/tokens/<relative/file/path>#<segment>.<segment>.<segment>
```

- Each path segment is percent-encoded; segments are joined with `.`.
- Dots are safe as separators **by specification** — the DTCG format forbids `.`, `{`, `}` in token and group names — the same guarantee the existing `pathKey = path.join(".")` helpers already rely on.
- The file portion reuses the existing `hrefFor` encoding in `FolderOverview.tsx` (`split("/").map(encodeURIComponent).join("/")`), so both halves stay consistent.

## Arrival behavior

Resolved in client code on mount and on `hashchange`, **not** via native `:target` (research.md §4 — native scrolling cannot open a collapsed ancestor group):

1. Decode the fragment into a path.
2. Expand every ancestor group of that path (see expansion state below).
3. Scroll the token into view.
4. Move focus to it, and mark it as the arrival target so it is visually distinguishable (spec FR-014's "making clear which token was navigated to").

A fragment naming a token that does not exist in the file is ignored — the page renders normally. This matters because a file can be edited or renamed between the link being created and followed.

## Expansion state

`TreeGroupNode`'s `const [expanded, setExpanded] = useState(true)` moves into `TokenTree` as a map keyed by group path, defaulting to expanded so present behavior is preserved. Nothing outside the component can open a specific group today, which is why arrival cannot reveal a collapsed target without this change.

## Same-file vs cross-file

| | Behavior |
| --- | --- |
| Same file | Fragment-only change; no server round-trip, no navigation guard. |
| Different file | Full `next/link` navigation to the other file's route, then the arrival behavior above. Subject to the unsaved-edits guard. |

## Unsaved-edits guard

Applies **only** to navigation that leaves the current file.

- Condition: `TokenTree`'s existing `pendingEdits.size > 0`.
- Presents save / discard / stay using the existing `Dialog` component.
- Edits are neither discarded nor written without an explicit choice (spec FR-018).
- Same-file jumps are never intercepted — nothing is at risk, and interrupting the common case would make the feature feel obstructive.

`beforeunload` is **not** used: it does not fire for client-side route changes and cannot offer a save option.

## Controls

| Control | Renders as | Notes |
| --- | --- | --- |
| Reference with exactly one definition | Link | Direct navigation. |
| Reference with several definitions | `Popover` trigger listing each definition by file and mode | Spec FR-013; never silently picks a winner. Affects 75 of 490 paths in this project's own token set. |
| Unresolvable / group-target / circular reference | Plain text, not activatable | Spec FR-016. |
| "referenced N times" | `Badge`-styled `Popover` trigger containing a `<ul>` of links | Absent entirely at zero referrers. |

Every control is keyboard-operable with an accessible name describing its destination (spec FR-017). `Popover`, `Badge`, and `Dialog` all already exist in `packages/design-system` — no new dependency.

## Accessibility requirements

- Programmatic focus move on arrival, so keyboard and screen-reader users land where sighted users are scrolled to.
- Reference-count triggers expose both the count and their expanded state.
- The arrival highlight must not rely on color alone.
- Covered by both tiers this repo already runs: `axe-core` at component level and Playwright for whole-page keyboard flows.
