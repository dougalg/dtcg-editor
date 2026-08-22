# Research: Light/Dark Mode Switcher

## 1. How the manual override wins over `prefers-color-scheme`

**Decision** (revised twice — see the two notes below): `packages/design-system/sugarcube.config.ts`'s `variables.permutations` array has three entries:

```ts
propagateDependents: true,
permutations: [
	{ input: { mode: "light" }, selector: ":root" },
	{
		input: { mode: "dark" },
		selector: ':root:not([data-theme="light"])',
		atRule: "@media (prefers-color-scheme: dark)",
	},
	{ input: { mode: "dark" }, selector: ':root[data-theme="dark"]' },
]
```

CSS resolves the OS preference on its own, so dark appearance no longer depends on JS having run. `data-theme` is still set by JS for an explicit override, and that attribute is still what the override mechanism turns on — but its *absence* now means "follow the OS" in CSS rather than "light".

**What was originally planned, and why it didn't work**: the original plan (kept here for the record) called for *four* permutations — the two above, plus `{ input: { dark }, selector: ":root", atRule: "@media (prefers-color-scheme: dark)" }` (a pure-CSS OS-preference fallback) and `{ input: { light }, selector: ':root[data-theme="light"]' }` (an explicit-light override, for when the OS prefers dark but the user chose light). Building it during implementation surfaced two real problems:

1. Sugarcube only emits CSS for a permutation's *literal differences* from the base resolved set. "Explicit light" resolves to exactly the same values as the unconditioned base `:root` (light is the default context), so that permutation compiled to an **empty rule** — verified directly: `pnpm --filter @dtcg-editor/design-system build` followed by `grep 'data-theme' dist/styles/tokens.css` showed only the `dark` block, even with `propagateDependents: true` (which does still matter — see below — but can't manufacture a diff that isn't there). An empty rule can't override anything.
2. Even a non-empty `[data-theme="light"]` rule couldn't have solved this: a `@media (prefers-color-scheme: dark) :root` block and a `:root[data-theme="light"]` block are both applying to `:root`, but a `@media`-wrapped rule doesn't participate in specificity competition with an attribute selector on the same element the way two ordinary rules do — matching author-cascade order inside the same layer/origin governs, and the DTCG-resolver-driven output order puts the media-query block after the attribute block (sugarcube emits permutations in array order, and the dark-media entry came before the light-attribute entry in the original four-entry array) — so an explicit "switch to light while the OS is dark" click would have silently done nothing.

Given the app already runs an inline FOUC-prevention script before first paint (research.md §2) that reads `matchMedia` in JS regardless, the CSS-only OS-detection fallback wasn't actually load-bearing for any requirement — FR-006 (live OS reactivity) is already necessarily a JS behavior (a media query alone can't change the DOM without either CSS `@media` cascade, which we just showed can't safely coexist with an attribute override, or a JS `change` listener, which `useTheme.ts` already needs anyway). Dropping it in favor of "JS is the single source of truth for `data-theme`" removes the conflict entirely, at the cost of appearance always defaulting to light in a hypothetical no-JS environment — an acceptable, explicitly-noted tradeoff (this app has no other functionality without JS either).

**Later revision — the media-query permutation does work, with a different selector**: the post-mortem above is right that the *original four-permutation* shape fails, but both of its problems come from the `{ input: { light }, selector: ':root[data-theme="light"]' }` entry, not from the media query itself. Dropping that fourth entry and narrowing the media permutation's selector to `:root:not([data-theme="light"])` dissolves both at once:

1. The empty-rule problem disappears because there is no longer an explicit-light permutation to compile. An explicit light override doesn't need a rule of its own — the `:not()` makes the media block *decline to match*, so the base `:root` light values apply by themselves.
2. The cascade-order problem disappears with it: the two dark rules never compete. `:root:not([data-theme="light"])` and `:root[data-theme="dark"]` both have specificity (0,2,0), but they can only ever both match when both resolve to dark anyway, so their relative order is immaterial.

All four cases land correctly: OS dark + no override → media block; OS dark + explicit light → base `:root`; OS light + explicit dark → attribute block; OS light + no override → base `:root`.

Verified by building it: `pnpm --filter @dtcg-editor/design-system build` emits `:root` (line 3), `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` (496), and `:root[data-theme="dark"]` (587), with the two dark blocks carrying an identical set of 86 declarations. Cost is +399 bytes gzipped on `dist/styles/tokens.css` (5,669 → 6,068), the second copy compressing to roughly the same size as the first.

The tradeoff this reverses is the no-JS one: dark appearance is now pure CSS, so it survives JS being disabled, blocked, or simply slow. `ThemeToggle.module.css` needs the same two-selector treatment for its five non-color rules (the thumb `transform` and four `display` swaps), since those can't be carried by a design token the way every color in that file now is.

A single-emission alternative — `--token: light-dark(a, b)` with the override reduced to one `color-scheme` declaration — would be ~400 bytes smaller than this and ~3 bytes smaller than the two-permutation shape that preceded it. It was rejected because sugarcube can't express it: `VariablesConfig` (`@sugarcube-sh/core@0.2.17`) exposes only `path`, `prefix`, `variableName`, `layer`, `transforms.{fluid, colorFallbackStrategy}`, `permutations`, and `propagateDependents` — no value-level transform or output formatter — and its output model emits one selector block per resolved token set, which is structurally the opposite of interleaving two sets into one declaration. Getting it would need an upstream feature (a `colorScheme: "light-dark"` output mode would suit sugarcube's model well) or a bespoke post-build rewrite wedged between sugarcube and its own output file; ~400 bytes doesn't justify the latter.

`propagateDependents: true` was still kept: without it, the `[data-theme="dark"]` block only contained variables that literally differ token-by-token from light, which could leave a *dependent* (alias-referencing) variable pointing at a stale light value even though its referent differs — confirmed by diffing the generated block's line count with the flag on vs. off (88 lines involved vs. fewer). This isn't about the light/empty-permutation problem above (which has zero difference to propagate, flag or not) — it's a real correctness fix for the dark block itself.

**Rationale for the final two-permutation shape**: `packages/design-system/src/design-tokens/dark.json` already fully defines every dark-mode color value (surface, text, accent, semantic colors) — reused as-is, no new token values. Sugarcube's own `Permutation` type (`@sugarcube-sh/core`'s `client-*.d.ts`) documents the `[data-theme="dark"]` attribute-selector pattern as the canonical way to express exactly this kind of override, and its own worked example likewise never pairs it with a `[data-theme="light"]` counterpart.

**Alternatives considered**: A hand-written CSS override block duplicating `dark.json`'s values — rejected as a duplicate, driftable source of truth violating this codebase's existing single-source token pipeline. `prefers-color-scheme` alone with no attribute hook — rejected, cannot express a manual override at all (this is the exact gap the feature exists to close). The original four-permutation design — rejected per the two problems above, discovered while implementing T009/T010.

## 2. Avoiding a flash of incorrect theme on load

> **Superseded by §11.** The inline script described here is gone: the preference moved to a cookie the server can read, so `app/layout.tsx` renders `data-theme` into the markup directly. Kept for the record, and because §11's reasoning only makes sense against it.

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

> **Still current in substance** — only the throwing call changed, from `localStorage.getItem`/`setItem` to reading/writing `document.cookie`. The `safeCall`/`fromThrowable` wrapping and the FR-011 fallback are unchanged. See §11.

**Decision**: The `localStorage.getItem`/`setItem` calls (which can throw `SecurityError` in browsers/profiles that block storage, e.g. strict private-browsing modes) are wrapped once, at their call site inside the injected default functions, via `fromThrowable` from `neverthrow`. `useTheme` branches on the `Result` and falls back to system-default behavior on `Err`, satisfying FR-011 without a bare `try/catch`.

## 7. Live OS-preference reactivity (FR-006) vs. override stability (FR-007)

**Decision**: `useTheme` subscribes to `matchMedia("(prefers-color-scheme: dark)")`'s `change` event only to re-derive the *displayed* theme when no explicit preference is stored; the listener is a no-op (beyond updating internal "what would system show right now" bookkeeping, if any is needed for the toggle's next click) whenever a stored preference is present. This mirrors Lea Verou's stated principle: overrides are only ever evaluated/cleared on user interaction with the toggle, never proactively by a background listener.

## 8. Cross-tab sync (edge case)

> **Superseded by §11.** The `storage` event does not exist for cookies; cross-tab sync is now a `BroadcastChannel`.

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

## 11. Moving the preference from `localStorage` to a cookie

**Decision** (revises §2, §6 and §8): the explicit override is stored in a cookie (`dtcg-ed-theme-preference`, `Path=/`, `SameSite=Lax`, `Secure` over HTTPS, ~10-year `Max-Age`, deliberately not `HttpOnly`). `app/layout.tsx` becomes an `async` Server Component, reads it via `next/headers`' `cookies()`, and renders `<html data-theme={override}>` — or, when there is no override, renders **no attribute at all** and lets §1's `@media (prefers-color-scheme: dark)` block decide.

**What this deletes**: the inline FOUC-prevention script, its `dangerouslySetInnerHTML` and the biome-ignore above it, the `suppressHydrationWarning` on `<html>`, and `useTheme`'s entire mount effect. The server's markup is correct in its first byte, so there is nothing for the client to fix up and nothing for hydration to disagree about.

**Why it works now and didn't before**: §2 rejected this as "unnecessary complexity … `localStorage` cannot be read during SSR anyway", which was correct about `localStorage` but treated the storage mechanism as fixed. The actual blocker was never SSR — it was the choice of a store the server can't see. §1's media-query permutation is the other half: without it the server would still have to know the *OS* preference (which it genuinely cannot), and the script would still be required for that case alone. Only with both changes does the pre-paint script have nothing left to do.

**The mount effect had to be deleted, not simplified.** Re-resolving the theme on mount and writing it to `data-theme` — harmless under the old design, where the attribute was always present anyway — becomes a real bug once absence is meaningful: it pins the appearance and the media query can never apply again, breaking FR-006. The same trap caught two consumers of the attribute, both fixed here and both now regression-tested:

- `ThemeToggle`'s click handler read `data-theme` and treated `null` as light. With the OS preferring dark and no override, it asked to activate dark — the theme already on screen — which per FR-005 clears the override instead of switching. The button appeared dead. Consumers now go through `resolveEffectiveTheme()`.
- `ThemeToggle`'s `title` tooltip was kept in sync by a `MutationObserver` on `data-theme`. A live OS change now repaints via CSS *without touching the DOM*, so there is no mutation to observe and the tooltip went stale. It now uses `subscribeToEffectiveTheme()`, which watches the media query as well.

**Cross-tab sync** (§8) moves to a `BroadcastChannel`: cookies fire no equivalent of the `storage` event, and the `CookieStore` change event is Chromium-only. The ping carries no payload — the cookie remains the single source of truth and each receiver re-reads it, so two tabs racing each other still converge. Where `BroadcastChannel` is unavailable the hook degrades to no cross-tab sync, never to a broken toggle.

**Costs, measured**: `cookies()` opts its route out of static rendering. Every route in this app except `/_not-found` was already dynamic (`ƒ` in the build output), so the whole cost is the 404 page moving from prerendered to server-rendered on demand. The cookie is also sent on every request to this origin, unlike `localStorage` — ~30 bytes. Spec Assumptions call the preference "stored per-browser (client-side), not synced to a user account or server"; a cookie is still per-browser and still tied to no account, but it is no longer invisible to the server, which is precisely the property being bought.

**Alternatives considered**: keeping `localStorage` and shrinking the script to only read the override (viable — §1's media query already removed its `matchMedia` half — but it keeps `dangerouslySetInnerHTML`, `suppressHydrationWarning`, and a pre-paint script whose only remaining job is work the server can now simply do); mirroring the preference into *both* `localStorage` and a cookie to keep the `storage` event — rejected as two sources of truth for one value, exactly the drift `themeConstants.ts` exists to prevent.
