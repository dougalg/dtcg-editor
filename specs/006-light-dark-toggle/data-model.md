# Data Model: Light/Dark Mode Switcher

This feature has no persisted domain data (no DTCG token model changes). Its "entities" are small client-side/build-time shapes.

## ThemePreference

The user's explicit, saved choice — or its absence.

| Field | Type                     | Notes                                                                        |
| ----- | ------------------------ | ----------------------------------------------------------------------------- |
| value | `"light" \| "dark" \| undefined` | `undefined` means "no override — follow system." Validated via `z.enum(["light", "dark"]).optional()` on every read of the cookie, by the shared `parseTheme` in `hooks/themeConstants.ts` that both the server and the client call; anything that fails validation is treated as `undefined`. |

**Storage**: a cookie named `dtcg-ed-theme-preference` (`Path=/`, `SameSite=Lax`, `Secure` over HTTPS, ~10-year `Max-Age`, not `HttpOnly` — the client writes it and the server reads it). Value is the raw string `"light"` or `"dark"`; the cookie is absent when no override is set, since clearing the override expires it rather than writing an empty value. It is a cookie rather than `localStorage` specifically so the server can render `data-theme` before first paint — see research.md §11.

**Transitions** (see spec FR-004/FR-005, Lea Verou's two-state-button model):

```
no preference (follow system) --[toggle click]--> preference = opposite(currentlyDisplayed)
preference = X                --[toggle click, X == opposite(systemPreference)]--> no preference (follow system)
preference = X                --[toggle click, X == systemPreference]--> preference = opposite(X)
```

The second and third transitions are the same code path in practice: a click always sets the preference to "opposite of what's currently displayed"; the special case is that when that opposite equals the current system preference, the effective result is indistinguishable from "no preference," so `useTheme` clears the key entirely instead of writing a redundant explicit value — this is what gives the toggle its two-visible-states-covering-three-data-states property.

## SystemPreference

The OS/browser-level appearance signal, read (never written) via `matchMedia("(prefers-color-scheme: dark)").matches`.

| Field   | Type               | Notes                                                      |
| ------- | ------------------ | ----------------------------------------------------------- |
| isDark  | `boolean`           | `false` (→ light) when the media query fails to match, matching spec's "default to light if OS reports no preference" (FR-003). |

Live-updates via the media query list's `change` event; only consulted by `useTheme` while `ThemePreference` is absent (FR-006/FR-007).

## EffectiveTheme

The theme actually rendered at any moment — pure derivation, not separately stored.

```
EffectiveTheme = ThemePreference.value ?? (SystemPreference.isDark ? "dark" : "light")
```

Reflected on the DOM as the `data-theme` attribute on `<html>`, rendered server-side from the cookie — but **only when an override is set**. No override means no attribute, which is the state that hands appearance to `@media (prefers-color-scheme: dark)`; the attribute is therefore *not* always present, and a missing one must never be read as `"light"`. See research.md §1 and §11 for how the attribute and the media query divide the work between them.

## Sprite ID Mapping (build-time, generated)

One per icon sprite folder under `apps/web-app/assets/icons/*/`, produced by the generalized `generate-icon-sprite.ts` and written to `apps/web-app/assets/generated/<sprite-name>-sprite.ids.ts`.

| Field    | Type     | Notes                                                       |
| -------- | -------- | ------------------------------------------------------------ |
| key      | `string` | Source SVG's filename, minus `.svg` (e.g. `"sun"`, `"moon"`, `"border"`). |
| value    | `string` | The `<symbol id>` in the matching `public/<sprite-name>-sprite.svg`, always `` `dtcg-ed-icon-${key}` ``. |

Two instances exist after this feature: `token-types-sprite.ids.ts` (14 keys, replaces the hand-maintained id strings inside `resolve-token-type-icon-id.ts`) and `theme-sprite.ids.ts` (2 keys: `sun`, `moon`).
