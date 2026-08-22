# Quickstart: Validating the Light/Dark Mode Switcher

## Prerequisites

- `pnpm install` at the repo root.
- Chromium available for Playwright/Vitest Browser Mode (already required by this repo's existing a11y test tiers).

## Build the design tokens and icon sprites

```sh
pnpm --filter @dtcg-editor/design-system build   # regenerates dist/styles/tokens.css with the new data-theme permutations
pnpm --filter web-app generate:icons              # regenerates public/token-types-sprite.svg and public/theme-sprite.svg
```

## Run it

```sh
pnpm --filter web-app dev
```

Open the app in a browser.

### Scenario 1 — follows system by default (US1, SC-001)

1. With no prior visit to the app (clear `localStorage` for the dev origin, or use a private window), set the OS to dark mode, then load the app. Expect the whole UI in dark appearance immediately, no flash of light appearance first.
2. Repeat with the OS set to light. Expect light appearance.

### Scenario 2 — manual override (US2, SC-002, SC-003)

1. Locate the toggle. Hover it: a native tooltip reading "Switch to light theme" (if currently dark) or "Switch to dark theme" (if currently light) appears, matching the reference screenshots.
2. Click it. Expect the whole UI to switch appearance immediately (no visible delay).
3. Reload the page. Expect the overridden appearance to persist (not revert to system).
4. Change the OS appearance setting while the override is active. Expect no change in the app.

### Scenario 3 — return to system default (US3, SC-004)

1. With an override active from Scenario 2, click the toggle again (the click that returns to the current system appearance). Expect the app to show system appearance and the tooltip to now describe switching away from whatever the system currently shows.
2. Change the OS appearance setting. Expect the app to now follow it live, with no reload.

### Cross-tab check (edge case)

Open the app in two tabs. Toggle in one. Expect the other tab to update to match (may require bringing that tab into focus, depending on browser `storage`-event timing).

### Regression check — existing token-type icons

Open a page rendering `TokenBlock` (e.g. a token detail view). Confirm its type icon still renders correctly — this feature renames the sprite backing it from `/icon-sprite.svg` to `/token-types-sprite.svg`.

## Automated checks

```sh
pnpm --filter web-app test:unit   # useTheme hook, ThemeToggle component, generalized generate-icon-sprite.ts
pnpm --filter web-app test:a11y   # axe (component-level) + Playwright whole-page/keyboard-only flow, incl. the toggle
```

Keyboard flow to exercise in the Playwright suite: `Tab` to the toggle, confirm visible focus ring, `Space`/`Enter` activates it, `aria-checked`/accessible name update accordingly (SC-005).
