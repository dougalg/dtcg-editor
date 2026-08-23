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

Split between the browser and app code (research.md §4, §5):

| Step | Owner |
| --- | --- |
| 1. Open every collapsed ancestor group of the target | **Browser** — native `<details>` auto-expansion |
| 2. Scroll the token into view | **Browser** — same mechanism |
| 3. Decode the fragment into a path and match it to the rendered token | App, on mount and on `hashchange` |
| 4. Move focus to it, and mark it as the arrival target so it is visually distinguishable (spec FR-014's "making clear which token was navigated to") | App |

Steps 1–2 require no app code: auto-expanding `<details>` ships in Chrome, Firefox 139+, and Safari 26.2+, and was verified in all three through this app's own Next.js navigation. Steps 3–4 are what the browser does not cover — it reveals and scrolls, but neither moves focus nor indicates which token was the destination.

A fragment naming a token that does not exist in the file is ignored — the page renders normally. This matters because a file can be edited or renamed between the link being created and followed.

## Expansion state

There is none to manage. `TreeGroupNode` becomes a native `<details>`/`<summary>` disclosure and its `const [expanded, setExpanded] = useState(true)` is removed rather than lifted — the DOM owns open/closed state.

Two constraints follow, both binding (research.md §5):

- The `<details>` MUST remain **uncontrolled**. React never passes a changing `open` prop; the initial open state comes from the server-rendered attribute. A controlled `open` would re-assert itself over the browser's expansion and defeat arrival entirely.
- The group-name `Input` MUST live **outside** `<details>`, with `<summary>` carrying only the disclosure control and its accessible name. Inside `<summary>` it would be nested interactive content (Space toggles the group; ACT/axe-flaggable); after `<summary>` it would fall inside the collapsible region and a collapsed group could not be renamed.

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
| Reference whose target does not exist | Warning naming the **missing path**, not activatable | Spec FR-011a/FR-016. |
| Reference whose target is a group | Warning naming the **group path**, not activatable | Spec FR-011a/FR-016. Distinct from the missing-target warning — the remedy is to point at a token inside the group, not to create one. |
| Reference whose chain is circular | Warning naming the **tokens forming the cycle**, not activatable | Spec FR-006/FR-011a/FR-016. |
| "referenced N times" | `Badge`-styled `Popover` trigger containing a `<ul>` of links | Absent entirely at zero referrers. |

Every control is keyboard-operable with an accessible name describing its destination (spec FR-017). `Popover`, `Badge`, and `Dialog` all already exist in `packages/design-system` — no new dependency.

## Accessibility requirements

- Programmatic focus move on arrival, so keyboard and screen-reader users land where sighted users are scrolled to.
- Reference-count triggers expose both the count and their expanded state.
- The arrival highlight must not rely on color alone.
- Covered by both tiers this repo already runs: `axe-core` at component level and Playwright for whole-page keyboard flows.
