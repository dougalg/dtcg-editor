# Data Model: Light/Dark Mode Switcher

This feature has no persisted domain data (no DTCG token model changes). Its "entities" are small client-side/build-time shapes.

## ThemePreference

The user's explicit, saved choice — or its absence.

| Field | Type                     | Notes                                                                        |
| ----- | ------------------------ | ----------------------------------------------------------------------------- |
| value | `"light" \| "dark" \| undefined` | `undefined` means "no override — follow system." Validated via `z.enum(["light", "dark"]).optional()` on every read from `localStorage`; anything that fails validation is treated as `undefined`. |

**Storage**: `localStorage`, key `dtcg-ed-theme-preference`, value is the raw string `"light"` or `"dark"` (key absent when no override is set — clearing the override removes the key, it is never written as an empty/null value).

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

Reflected on the DOM as the `data-theme` attribute on `<html>` (`"light"` or `"dark"`, always present after the FOUC-prevention script/hook run once) — see `research.md` §1–2 for how this attribute drives which of `packages/design-system`'s CSS permutations apply.

## Sprite ID Mapping (build-time, generated)

One per icon sprite folder under `apps/web-app/assets/icons/*/`, produced by the generalized `generate-icon-sprite.ts` and written to `apps/web-app/assets/generated/<sprite-name>-sprite.ids.ts`.

| Field    | Type     | Notes                                                       |
| -------- | -------- | ------------------------------------------------------------ |
| key      | `string` | Source SVG's filename, minus `.svg` (e.g. `"sun"`, `"moon"`, `"border"`). |
| value    | `string` | The `<symbol id>` in the matching `public/<sprite-name>-sprite.svg`, always `` `dtcg-ed-icon-${key}` ``. |

Two instances exist after this feature: `token-types-sprite.ids.ts` (14 keys, replaces the hand-maintained id strings inside `resolve-token-type-icon-id.ts`) and `theme-sprite.ids.ts` (2 keys: `sun`, `moon`).
