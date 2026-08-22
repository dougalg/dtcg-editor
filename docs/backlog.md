# Backlog

Planned features not yet in progress. Pick one and run `pick-up-task` (or `speckit-specify`) to start it.
Completed items are moved to `docs/backlog-completed.md` by `archive-task`, not marked `[x]` here.

- [ ] Add a light/dark mode switcher following the two-state toggle approach from Lea Verou's "Dark mode toggles: theory and practice" (https://lea.verou.me/blog/2026/dark-mode-toggles/) — a compact two-state (light/dark) button that internally tracks three states (system default / light override / dark override): first click sets an explicit override to the opposite of the currently visible theme, second click clears the override back to system default; store the override in `localStorage`, respect `prefers-color-scheme` when unset, and only evaluate/clear overrides on user interaction (never react proactively to OS theme changes). (in progress — worktree `.claude/worktrees/light-dark-switcher`, branch `worktree-light-dark-switcher`)
- [ ] Ability to visualize linting errors (eg: a11y contrast checks for token pairs, naming convnetions, etc.)
- [ ] Ability to add and remove files in the file list page
- [ ] Refactor all CSS to use design tokens where possible (replace hardcoded colors/spacing/sizing in `*.module.css` files with `var(--dtcg-ed-*)` custom properties, adding new tokens where a suitable one doesn't yet exist). (in progress — worktree `.claude/worktrees/css-design-tokens`, branch `worktree-css-design-tokens`)
- [ ] Refactor `TreeTokenNode` to extract a reusable "dumb" CUBE-CSS Block subcomponent (deduplicating existing repetition) and move the relevant styles out of `TokenTree.module.css` into it; stop repeating the token name in every label (e.g. "Name" instead of "{TOKEN} name", "Type: <Badge>{TOKEN_TYPE}</Badge>" instead of "{TOKEN} type {TOKEN_TYPE}") with the token name promoted to a semantically-correct heading at the start of the node; refactor the existing `Badge` component into a "pill" style for use in these labels; give each token node an icon based on its type; and add a left pin line to each token in the tree view (matching the existing group pin lines) with a visible break between pin lines of two sequential tokens. (in progress — worktree `.claude/worktrees/tree-token-node-block`, branch `worktree-tree-token-node-block`)
- [ ] Fix WCAG 2.2 AA color-contrast failure on `TokenTree`'s `.type` label (`apps/web-app/components/TokenTree.module.css`): `color: var(--dtcg-ed-color-neutral-text-quiet)` combined with `opacity: 0.6` renders at ~2.92:1 against a white background (needs 4.5:1 for 12px text). Discovered while fixing `apps/web-app/e2e/tokens-page.spec.ts` to use stable e2e fixture tokens instead of stale `sample_data/` paths — the pages previously 404'd, masking this pre-existing, content-independent bug. Likely fix: drop/reduce the opacity or switch to a token with sufficient contrast at full opacity.
- [ ] references should preview the referenced value
- [ ] references should allow hotlinking to the referenced item
- [ ] items which are referenced should allow viewing/jumping to those referenced items
- [ ] TreeGroupNode should be refactored to either be a disclosure element, or make sure it has all necessary aria props like controls, and expanded
- [ ] Create linting rules based on constitution.md
- [ ] Add sugarcube and refactor existing UI to use new their tokens and components
- [ ] Improve UI by adding visible rows, header delineation, and drag and drop reordering of token rows and resolved name visibility OR sticky headers?
- [ ] Add support for additional "non-standard" behaviours, like custom fields
- [ ] Add support for "fontFamily" tokens
- [ ] Add support for "fontWeight" tokens
- [ ] Add support for "duration" tokens
- [ ] Add support for "cubicBezier" tokens
- [ ] Add support for "number" tokens
- [ ] Add support for "strokeStyle" tokens
- [ ] Add support for "border" tokens
- [ ] Add support for "transition" tokens
- [ ] Add support for "shadow" tokens
- [ ] Add support for "gradient" tokens
- [ ] Add support for "typography" tokens
- [ ] Allow the user/configurer to specify in config additional non-standard token types to support. They must also register an editor for it, or the config is invalid. This should be enforced via build-time script checks and TS checks for fast feedback.
- [ ] Upgrade `typescript` to v7 — sequenced to start after the Biome migration above lands, which resolves the `typescript-eslint` blocker. The Next.js side is separately resolved: `experimental.useTypeScriptCli` (16.2.12+) makes `next build` shell out to `tsc` instead of needing the missing Compiler API; decided to accept this flag in production despite Next's own "not recommended for production" caveat, since it's the only path that unblocks the build today. Scope is repo-wide, not just `apps/web-app`. See `docs/research/typescript-v7-upgrade-path.md`. (in progress — worktree `.claude/worktrees/typescript-v7-upgrade`, branch `worktree-typescript-v7-upgrade`)
- [ ] Add a regression guard for the `apps/web-app/instrumentation.ts` Edge Runtime `process.exit` fix — deferred as of 2026-07-28, not urgent since the fix itself resolves the current warning. If it recurs (e.g. a future change reintroduces an un-isolated `process.exit` or other Node-only API directly in `instrumentation.ts`), add either an ESLint `no-restricted-syntax` rule scoped to that file banning direct `process.exit` calls, or a CI step that greps `next build`'s output for Edge Runtime warnings and fails the build — both discussed but not implemented when the underlying fix shipped.
