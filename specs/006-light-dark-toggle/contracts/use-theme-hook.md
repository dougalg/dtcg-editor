# Contract: `useTheme` hook

`apps/web-app/hooks/useTheme.ts`

**Revised after implementation** — see the redesign note at the bottom. The hook now holds no React state for the theme itself; it only owns side effects and exposes one imperative function.

## Signature

```ts
interface UseThemeOptions {
	getStoredTheme?: () => "light" | "dark" | undefined; // default: reads localStorage, Zod-validated; may throw
	setStoredTheme?: (value: "light" | "dark" | undefined) => void; // default: writes/removes the localStorage key; may throw
	matchMedia?: (query: string) => MediaQueryList; // default: window.matchMedia
}
```

Plain, possibly-throwing functions rather than `Result`-returning ones — the hook itself wraps every call to `getStoredTheme`/`setStoredTheme` (real default or injected) via a `safeCall` helper (`fromThrowable` internally), so a throwing implementation — including a test double that intentionally throws — can never crash the hook. This keeps the injection surface simple for callers/tests while still satisfying Principle V at the one place it actually matters (inside the hook, not pushed onto every implementation of the interface).

```ts
interface UseThemeResult {
	/** Call with the theme the user just activated — e.g. the "switch to
	 * dark" button calls `activateTheme("dark")`. Implements the two-state-
	 * button transition described in data-model.md and writes `data-theme`
	 * on `document.documentElement` directly. */
	activateTheme: (target: "light" | "dark") => void;
}

function useTheme(options?: UseThemeOptions): UseThemeResult;
```

## Behavior

- On mount: reads the stored preference; if absent/invalid, derives the theme from `matchMedia("(prefers-color-scheme: dark)").matches`; writes the result to `data-theme` on `document.documentElement` (a no-op write in the normal case, since the inline FOUC-prevention script already set the same value before this component mounted).
- Subscribes to the system media query's `change` event; while no stored preference exists, an OS change updates `data-theme` live (FR-006). While a stored preference exists, the subscription's handler does not touch it (FR-007).
- Subscribes to `window`'s `storage` event; when the preference key changes in another tab, re-reads it and updates `data-theme` to match.
- `activateTheme(target)` always persists `target` as the stored preference; if `target` equals the current system preference, the stored key is removed instead of written (see data-model.md's transition table) — the caller passes its own fixed target (each button always means the same thing), never something it computed as "opposite of current."
- Every `localStorage` read/write failure (thrown exception, caught via `fromThrowable`) is treated as if the key were absent/unset — the DOM attribute still resolves from system preference, `activateTheme` still applies for the current session even though persistence silently no-ops (FR-011).

## Consumers

`apps/web-app/components/ThemeToggle/ThemeToggle.tsx` is the only consumer for this feature — it renders two always-present buttons and lets CSS attribute selectors (`:global(html[data-theme="dark"])` in `ThemeToggle.module.css`) decide which one is visible, calling `activateTheme` with each button's own fixed target. The hook has no other required consumers, so no `ThemeProvider`/Context wrapper is part of this contract (see research.md §3).

## Redesign: why there's no `theme` in the return value anymore

The original version of this hook held `theme` in `useState` so `ThemeToggle` could render the matching icon and `aria-checked`. That meant the *rendered DOM* had to end up agreeing with `data-theme` — but the very first client render can't know the resolved value without either matching the server's value (wrong, since the server has no `window`) or diverging from it. Diverging is a hydration mismatch, and React does not reliably self-correct a mismatched attribute like `aria-checked` on its own — confirmed directly during this feature's development: the resolved state was provably correct on first render, yet the DOM stayed wrong indefinitely with no further re-render to force reconciliation. Working around that (a placeholder initial state plus a guarded second-render correction) fixed the toggle's own stuck state, but introduced a *second* bug — that guarded correction pass raced with the inline FOUC script and produced a real, visible light→dark flash on load.

Removing `theme` from React state entirely removes the whole bug class: `ThemeToggle` now renders both buttons unconditionally, and pure CSS attribute selectors — not a render — decide which one is visible. There is nothing left for a render to get wrong relative to `data-theme`; correctness depends only on that attribute being set correctly, which it already had to be for the FOUC script's sake.
