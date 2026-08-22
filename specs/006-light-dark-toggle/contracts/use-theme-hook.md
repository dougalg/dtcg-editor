# Contract: `useTheme` hook

`apps/web-app/hooks/useTheme.ts`

**Revised twice after implementation.** First: the hook holds no React state for the theme (see "Redesign" at the bottom). Second: the preference moved from `localStorage` to a cookie, so the *server* renders `data-theme` and this hook no longer resolves anything on mount (see "Second revision" below, and research.md §11).

## Signature

```ts
interface UseThemeOptions {
	getStoredTheme?: () => "light" | "dark" | undefined; // default: reads the preference cookie, Zod-validated; may throw
	setStoredTheme?: (value: "light" | "dark" | undefined) => void; // default: writes/expires the cookie; may throw
	matchMedia?: (query: string) => MediaQueryList; // default: window.matchMedia
	createThemeChannel?: () => BroadcastChannel | undefined; // default: a BroadcastChannel, or undefined where unsupported
}
```

Plain, possibly-throwing functions rather than `Result`-returning ones — the hook itself wraps every call to an injected externality via a `safeCall` helper (`fromThrowable` internally), so a throwing implementation — including a test double that intentionally throws — can never crash the hook. This keeps the injection surface simple for callers/tests while still satisfying Principle V at the one place it actually matters (inside the hook, not pushed onto every implementation of the interface).

`createThemeChannel` is injected for the same reason `matchMedia` is: `jsdom` implements neither (verified against the installed jsdom 30), so a unit test has no way to exercise them without a double.

```ts
interface UseThemeResult {
	/** Call with the theme the user just activated — e.g. the "switch to
	 * dark" button calls `activateTheme("dark")`. Implements the two-state-
	 * button transition described in data-model.md. */
	activateTheme: (target: "light" | "dark") => void;

	/** The theme actually on screen: the override if set, else the OS
	 * preference. */
	resolveEffectiveTheme: () => "light" | "dark";

	/** Subscribes to anything that can change the effective theme — an
	 * override being set/cleared, or the OS preference changing while no
	 * override is set. Returns an unsubscribe function; stable across
	 * renders. */
	subscribeToEffectiveTheme: (listener: () => void) => () => void;
}

function useTheme(options?: UseThemeOptions): UseThemeResult;
```

## Behavior

- **On mount: nothing.** `app/layout.tsx` already rendered `data-theme` from the same cookie, server-side, and the no-override case is resolved by the stylesheet's `@media (prefers-color-scheme: dark)` block. Re-deriving and writing the attribute here would not merely be redundant, it would be **wrong**: writing a resolved value when no override is stored pins the appearance and stops the media query from ever applying again, breaking FR-006.
- **No `change` subscription on the system media query for appearance purposes.** FR-006 is satisfied by CSS natively. `matchMedia` is read only as a one-shot inside `activateTheme` (FR-005 needs the current OS preference to decide between setting and clearing) and inside `resolveEffectiveTheme`.
- `activateTheme(target)` persists `target` as the stored preference; if `target` equals the current system preference, the cookie is expired instead of written (see data-model.md's transition table) — the caller passes its own fixed target, never something it computed as "opposite of current." It then sets `data-theme` to the override, **or removes the attribute entirely when the override was cleared**, and pings other tabs.
- **Cross-tab sync** is a `BroadcastChannel`. A cookie, unlike `localStorage`, fires no cross-tab event, so the writing tab notifies the others explicitly. The ping carries no payload: the cookie stays the single source of truth and each receiver re-reads it, so two tabs racing still converge.
- Every storage read/write failure (thrown exception, caught via `fromThrowable`) is treated as if the cookie were absent — `activateTheme` still applies for the current session even though persistence silently no-ops (FR-011). An unavailable `BroadcastChannel` degrades to "no cross-tab sync", never to a broken toggle.

## Consumers

`apps/web-app/components/ThemeToggle/ThemeToggle.tsx` is the only consumer for this feature. It renders one button whose thumb position, icon, and accessible name are decided by CSS attribute and media-query selectors in `ThemeToggle.module.css`. The hook has no other required consumers, so no `ThemeProvider`/Context wrapper is part of this contract (see research.md §3).

Consumers **must** go through `resolveEffectiveTheme` rather than reading `data-theme` themselves. A missing attribute means "follow the OS", not "light" — and reading it raw is a live bug, not a style preference: with the OS preferring dark and no override set, it makes the toggle compute the theme already on screen as its click target, so the click clears the (absent) override and appears to do nothing. Covered by a regression test in both `ThemeToggle.test.tsx` and `e2e/theme-toggle.spec.ts`.

Anything mirroring the theme *outside* CSS — currently just the button's `title` tooltip — must use `subscribeToEffectiveTheme`, not a `MutationObserver` alone: while no override is set, an OS change repaints via CSS without touching the DOM, so there is no mutation to observe and the mirror silently goes stale.

## Second revision: why the hook stopped resolving anything

`localStorage` is invisible to the server, so the original design needed an inline pre-paint script to read the preference and set `data-theme` before first paint. A cookie is visible to the server, so `app/layout.tsx` can render the attribute into the markup directly — which deletes the script, its `dangerouslySetInnerHTML`, and the `suppressHydrationWarning` that existed only because the script mutated `<html>` behind React's back.

That inverted this hook's job. It used to be the thing that *resolved* the theme (stored preference, else `matchMedia`) and kept the DOM in agreement; now the server and the stylesheet each resolve their own half before any of this code runs, and the hook is left owning only the side effects of a click: persist, clear, tell other tabs. The mount effect wasn't simplified so much as deleted, and keeping it would have reintroduced the FR-006 bug described above.

## Redesign: why there's no `theme` in the return value anymore

The original version of this hook held `theme` in `useState` so `ThemeToggle` could render the matching icon and `aria-checked`. That meant the *rendered DOM* had to end up agreeing with `data-theme` — but the very first client render can't know the resolved value without either matching the server's value (wrong, since the server had no way to know the preference at the time) or diverging from it. Diverging is a hydration mismatch, and React does not reliably self-correct a mismatched attribute like `aria-checked` on its own — confirmed directly during this feature's development: the resolved state was provably correct on first render, yet the DOM stayed wrong indefinitely with no further re-render to force reconciliation. Working around that (a placeholder initial state plus a guarded second-render correction) fixed the toggle's own stuck state, but introduced a *second* bug — that guarded correction pass raced with the inline FOUC script and produced a real, visible light→dark flash on load.

Removing `theme` from React state entirely removes the whole bug class: `ThemeToggle` renders one button, and pure CSS selectors — not a render — decide how it looks and what it announces. There is nothing left for a render to get wrong relative to `data-theme`.

(Note that the second revision above independently retires the hydration hazard at its root: the server and client now render the same `data-theme` from the same cookie, so there is no longer a mismatch to suppress in the first place.)
