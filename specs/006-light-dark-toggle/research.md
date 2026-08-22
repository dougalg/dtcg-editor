# Research: Light/Dark Mode Switcher

## 1. How the manual override wins over `prefers-color-scheme`

**Decision** (revised during implementation — see below): `packages/design-system/sugarcube.config.ts`'s `variables.permutations` array ends up with just two entries:

```ts
propagateDependents: true,
permutations: [
	{ input: { mode: "light" }, selector: ":root" },
	{ input: { mode: "dark" }, selector: ':root[data-theme="dark"]' },
]
```

`data-theme="dark"` is set by JS (the FOUC-prevention script and `useTheme.ts`) for *every* dark case — an explicit dark override, and "no override but the OS prefers dark" alike; JS resolves system preference itself either way (it already has to, for FR-006's live-update requirement). CSS never needs to independently detect the OS preference.

**What was originally planned, and why it didn't work**: the original plan (kept here for the record) called for *four* permutations — the two above, plus `{ input: { dark }, selector: ":root", atRule: "@media (prefers-color-scheme: dark)" }` (a pure-CSS OS-preference fallback) and `{ input: { light }, selector: ':root[data-theme="light"]' }` (an explicit-light override, for when the OS prefers dark but the user chose light). Building it during implementation surfaced two real problems:

1. Sugarcube only emits CSS for a permutation's *literal differences* from the base resolved set. "Explicit light" resolves to exactly the same values as the unconditioned base `:root` (light is the default context), so that permutation compiled to an **empty rule** — verified directly: `pnpm --filter @dtcg-editor/design-system build` followed by `grep 'data-theme' dist/styles/tokens.css` showed only the `dark` block, even with `propagateDependents: true` (which does still matter — see below — but can't manufacture a diff that isn't there). An empty rule can't override anything.
2. Even a non-empty `[data-theme="light"]` rule couldn't have solved this: a `@media (prefers-color-scheme: dark) :root` block and a `:root[data-theme="light"]` block are both applying to `:root`, but a `@media`-wrapped rule doesn't participate in specificity competition with an attribute selector on the same element the way two ordinary rules do — matching author-cascade order inside the same layer/origin governs, and the DTCG-resolver-driven output order puts the media-query block after the attribute block (sugarcube emits permutations in array order, and the dark-media entry came before the light-attribute entry in the original four-entry array) — so an explicit "switch to light while the OS is dark" click would have silently done nothing.

Given the app already runs an inline FOUC-prevention script before first paint (research.md §2) that reads `matchMedia` in JS regardless, the CSS-only OS-detection fallback wasn't actually load-bearing for any requirement — FR-006 (live OS reactivity) is already necessarily a JS behavior (a media query alone can't change the DOM without either CSS `@media` cascade, which we just showed can't safely coexist with an attribute override, or a JS `change` listener, which `useTheme.ts` already needs anyway). Dropping it in favor of "JS is the single source of truth for `data-theme`" removes the conflict entirely, at the cost of appearance always defaulting to light in a hypothetical no-JS environment — an acceptable, explicitly-noted tradeoff (this app has no other functionality without JS either).

`propagateDependents: true` was still kept: without it, the `[data-theme="dark"]` block only contained variables that literally differ token-by-token from light, which could leave a *dependent* (alias-referencing) variable pointing at a stale light value even though its referent differs — confirmed by diffing the generated block's line count with the flag on vs. off (88 lines involved vs. fewer). This isn't about the light/empty-permutation problem above (which has zero difference to propagate, flag or not) — it's a real correctness fix for the dark block itself.

**Rationale for the final two-permutation shape**: `packages/design-system/src/design-tokens/dark.json` already fully defines every dark-mode color value (surface, text, accent, semantic colors) — reused as-is, no new token values. Sugarcube's own `Permutation` type (`@sugarcube-sh/core`'s `client-*.d.ts`) documents the `[data-theme="dark"]` attribute-selector pattern as the canonical way to express exactly this kind of override, and its own worked example likewise never pairs it with a `[data-theme="light"]` counterpart.

**Alternatives considered**: A hand-written CSS override block duplicating `dark.json`'s values — rejected as a duplicate, driftable source of truth violating this codebase's existing single-source token pipeline. `prefers-color-scheme` alone with no attribute hook — rejected, cannot express a manual override at all (this is the exact gap the feature exists to close). The original four-permutation design — rejected per the two problems above, discovered while implementing T009/T010.

## 2. Avoiding a flash of incorrect theme on load

**Decision**: A small inline, synchronous `<script>` placed directly in `app/layout.tsx`'s `<head>` (via `dangerouslySetInnerHTML`, not an external file) reads the stored preference and sets `data-theme` on `document.documentElement` before the browser paints — before React hydrates. `<html>` gets `suppressHydrationWarning` since the attribute it carries after the script runs is intentionally absent from the server-rendered markup (the server cannot know the client's stored preference or OS setting).

**Rationale**: This is the standard technique for avoiding FOUC in theme-switching SSR/SSG apps (the same technique the popular `next-themes` package uses internally) — reimplemented here directly since it's ~10 lines of vanilla JS and adding a dependency for it would fail Principle VIII's "built-ins first" bar. `suppressHydrationWarning` scoped to the single `<html>` element is the documented, narrow way to tell React "this one attribute is expected to be set outside my render," without disabling hydration warnings anywhere else.

**Alternatives considered**: Setting the theme only after React mounts (`useEffect`) — rejected, guarantees a visible flash of the wrong theme on every load with a stored dark preference, directly contradicting the spec's UX goal (SC-002, "in under 100ms"). A cookie-based preference read server-side during SSR — rejected as unnecessary complexity; this app has no server-side user/session concept (per spec Assumptions, storage is client-only), and `localStorage` cannot be read during SSR anyway.

## 3. State management shape

**Decision**: A single custom hook, `useTheme()`, in `apps/web-app/hooks/useTheme.ts` — no React Context/Provider.

**Rationale**: Spec Assumptions state the toggle is "a single global control," and only one component (`ThemeToggle`) needs to read/drive theme state. Introducing a Context for a single consumer is unwarranted abstraction. If a second consumer needs theme state later, promoting the hook's state into a Context at that point is a small, localized change.

**Alternatives considered**: `ThemeProvider` + Context — rejected for now as premature (no second consumer exists); revisit if/when one appears.

## 4. Platform externalities and testability (Principle VI)

**Decision**: `useTheme` takes injected functions for the externalities that are otherwise impossible or awkward to exercise in `jsdom` tests, following the existing single-call-site convention already used by `useSaveTokenEdits(..., fetchImpl: typeof fetch = fetch)` — real implementation as an inline default parameter, no new adapter module:

- `getStoredTheme` / `setStoredTheme` — wrap `localStorage.getItem`/`setItem`, real defaults backed by `window.localStorage`.
- `matchMedia` — real default `window.matchMedia`. `jsdom` does not implement `matchMedia` at all, so without injection every test would need to monkey-patch the global; injecting a fake is more direct and keeps `vitest.setup.ts` untouched.

**Rationale**: Principle VI's two triggers both apply — (a) `jsdom` cannot exercise `matchMedia` directly, and (b) simulating "storage is blocked/corrupted" (an explicit edge case, FR-011) is far more direct via an injected fake than by trying to break real `localStorage` in a test environment.

**Alternatives considered**: A new `lib/platform/browser-storage.ts` adapter module mirroring `lib/platform/node-fs.ts` — rejected per Principle VI's own guidance ("a dedicated adapter module is only warranted when a real implementation is shared across more than one call site"); only `useTheme` needs these.

## 5. Reading the stored value safely (Principle IV — Validation at the Edges)

**Decision**: The raw string read from `localStorage` is parsed with `z.enum(["light", "dark"]).optional()` (Zod, already an approved dependency) before being trusted as a `ThemePreference`. Any other stored value (missing key, corrupted string, a value from some future third state) is treated as "no preference" (i.e. follow system).

**Rationale**: `localStorage` is exactly the kind of untrusted edge Principle IV describes — it can be edited by hand, corrupted, or written by a future/older version of this app. A one-line Zod schema keeps this consistent with the rest of the codebase's edge-validation convention rather than a bespoke type guard.

## 6. Wrapping the throwing calls (Principle V — Result Pattern)

**Decision**: The `localStorage.getItem`/`setItem` calls (which can throw `SecurityError` in browsers/profiles that block storage, e.g. strict private-browsing modes) are wrapped once, at their call site inside the injected default functions, via `fromThrowable` from `neverthrow`. `useTheme` branches on the `Result` and falls back to system-default behavior on `Err`, satisfying FR-011 without a bare `try/catch`.

## 7. Live OS-preference reactivity (FR-006) vs. override stability (FR-007)

**Decision**: `useTheme` subscribes to `matchMedia("(prefers-color-scheme: dark)")`'s `change` event only to re-derive the *displayed* theme when no explicit preference is stored; the listener is a no-op (beyond updating internal "what would system show right now" bookkeeping, if any is needed for the toggle's next click) whenever a stored preference is present. This mirrors Lea Verou's stated principle: overrides are only ever evaluated/cleared on user interaction with the toggle, never proactively by a background listener.

## 8. Cross-tab sync (edge case)

**Decision**: `useTheme` also listens for the `window` `storage` event (fired in *other* tabs/windows when `localStorage` changes, never the tab that made the write) and re-reads the stored preference when it fires, updating `data-theme` to match. This is a native browser mechanism — no new dependency — and directly satisfies the spec's multi-tab edge case.

## 9. Toggle control: reuse `Switch`, not a bespoke control

**Decision**: Build `ThemeToggle` on top of the existing `packages/design-system/src/components/Switch/Switch.tsx` (Radix `SwitchPrimitive.Root`/`Thumb`), rather than a hand-rolled `<button>`. Render the sun/moon `<svg><use></svg>` icon inside `SwitchPrimitive.Thumb` (Radix's `Thumb` accepts children), so the pill shape, thumb travel animation, and `:focus-visible` ring the reference screenshots show all come from `Switch.css`, already built, styled with design tokens, and matching the reference design's proportions and focus-ring treatment closely.

**Rationale**: `Switch` already renders as `role="switch"` with `aria-checked`, satisfying FR-009's "expose current state to assistive technology" for free, and reuses tested, token-styled code instead of duplicating pill/thumb/focus-ring CSS — directly in the spirit of Principle X's reuse-flagging rule (this would be the second "pill switch," not a third, but reusing from the first is strictly better than a near-duplicate).

**Alternatives considered**: A plain `<button aria-pressed>` styled from scratch to look like a switch — rejected as needless duplication of `Switch.css` given a suitable primitive already exists in this repo.

## 10. Accessible name / hover affordance (matches the reference screenshots exactly)

**Decision**: `aria-label` and the native `title` attribute on the `Switch` root, both set to the same dynamic string — `"Switch to light theme"` when currently dark, `"Switch to dark theme"` when currently light — recomputed each render from the current effective theme.

**Rationale**: The reference screenshot's tooltip ("Switch to light theme," appearing only on hover, plain browser-style tooltip box) is the browser's native `title` rendering — no dependency, no new component. `aria-label` carries the same text to the accessibility tree as the icon-only control's accessible name (there is no visible text label), and both are trivially kept in sync since they're set from one derived string, satisfying FR-009's "announcing whether activating it will switch to light or dark appearance."

**Alternatives considered**: A dedicated `Tooltip` component (e.g. adding `@radix-ui/react-tooltip`) — rejected; no `Tooltip` component or convention exists anywhere in this codebase yet, and the reference design's tooltip is visually indistinguishable from a native `title` tooltip, so introducing a new dependency and a new UI pattern for this one control isn't justified (Principle VIII).

## 11. Generalizing the sprite generator

**Decision**: Rework `apps/web-app/scripts/generate-icon-sprite.ts` (currently one hardcoded `ICON_FILES` array → one hardcoded output path) into a folder scanner:

- Source layout changes from a flat `assets/icons/*.svg` to one subfolder per sprite: `assets/icons/<sprite-name>/*.svg`. The existing 14 token-type icons move into `assets/icons/token-types/` (their existing `NOTICE.md` moves with them); the two new theme icons live in `assets/icons/theme/{sun.svg,moon.svg}` with their own `NOTICE.md` (Lucide attribution).
- The script lists `assets/icons/`'s subdirectories (a new injected, synchronous `nodeReaddirSync` in `lib/platform/node-fs.ts`, mirroring the existing `nodeReadDir`/`nodeReadFileSync` pattern already there) and, for each subfolder found, lists its `.svg` files and generates:
  - `public/<sprite-name>-sprite.svg` — same `<symbol>`-per-icon format as today, id = `` `dtcg-ed-icon-${basename}` `` (basename = filename minus `.svg`).
  - `assets/generated/<sprite-name>-sprite.ids.ts` — a generated, gitignored `Record<string, string>` mapping each source basename to its symbol id, banner-commented "GENERATED FILE, do not hand-edit," mirroring the banner already used in the sprite SVG itself.
- No filenames, sprite names, or icon lists remain hardcoded in the script — adding a new `.svg` to an existing folder, or a wholly new folder, is picked up automatically on the next `pnpm generate:icons` run (already wired as a prerequisite of `dev`/`build`/`test`).
- The hand-written, domain-specific `apps/web-app/assets/resolve-token-type-icon-id.ts` (token type → icon id) stays hand-written — it encodes an app-domain mapping (which the generic generator has no way to know), not a filename→id mapping — but its literal id strings are replaced with references into the generated `token-types-sprite.ids.ts`, so the two can't drift.
- Per-icon Lucide-source attribution moves out of the script (today's inline `source:` strings in `ICON_FILES`) and lives solely in each folder's own `NOTICE.md`, since a generic scanner has no per-file metadata to hardcode. This is still full ISC License compliance (copyright + permission notice preserved, `NOTICE.md` already the documented attribution mechanism for this directory) — just no longer duplicated into a per-symbol XML comment.

**Rationale**: Matches the user's explicit ask ("no hardcoded values," "adding new folders and svgs will automatically be picked up") while reusing every existing convention (DI'd fs access, gitignored generated output, `NOTICE.md`-based attribution, `dtcg-ed-icon-*` id format) rather than inventing new ones.

**Output filename change**: `public/icon-sprite.svg` becomes `public/token-types-sprite.svg` (derived from the new `token-types/` folder name). The two existing references to `/icon-sprite.svg` (`TokenBlock.tsx`'s `<use xlinkHref>` and its test) must be updated to `/token-types-sprite.svg` as part of this change — the alternative (keeping a literally-named `icons/` folder to preserve the old filename) was rejected as confusing next to the new `theme/` folder's sprite naming.

## 12. Vendoring the sun/moon icons

**Decision**: Manually vendor Lucide's `sun.svg` and `moon.svg` source markup as standalone files under `assets/icons/theme/`, the same way the 14 existing icons were vendored (hand-copied `<svg>` markup, ISC License, attributed in a folder-local `NOTICE.md`) — not by adding `lucide-react` (or any icon package) as a dependency.

**Rationale**: Consistent with the existing convention and Principle VIII (no new runtime dependency for two static icons already reachable as plain SVG source).
