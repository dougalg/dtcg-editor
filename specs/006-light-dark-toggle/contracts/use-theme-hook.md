# Contract: `useTheme` hook

`apps/web-app/hooks/useTheme.ts`

## Signature

```ts
interface UseThemeOptions {
	getStoredTheme?: () => Result<"light" | "dark" | undefined, UnknownError>; // default: reads localStorage, Zod-validated
	setStoredTheme?: (value: "light" | "dark" | undefined) => Result<void, UnknownError>; // default: writes/removes the localStorage key
	matchMedia?: typeof window.matchMedia; // default: window.matchMedia
}

interface UseThemeResult {
	/** The theme currently rendered — always concretely "light" or "dark", never "system". */
	theme: "light" | "dark";
	/** Implements the two-state-button transition described in data-model.md. Call on toggle activation. */
	toggleTheme: () => void;
}

function useTheme(options?: UseThemeOptions): UseThemeResult;
```

## Behavior

- On mount: reads the stored preference; if absent/invalid, derives `theme` from `matchMedia("(prefers-color-scheme: dark)").matches`.
- Sets `data-theme` on `document.documentElement` to match `theme` whenever it changes (including on mount, reconciling with whatever the FOUC-prevention inline script already set).
- Subscribes to the system media query's `change` event; while no stored preference exists, an OS change updates `theme` live (FR-006). While a stored preference exists, the subscription's handler does not change `theme` (FR-007).
- Subscribes to `window`'s `storage` event; when the preference key changes in another tab, re-reads it and updates `theme` to match.
- `toggleTheme()` always sets the stored preference to the opposite of the current `theme`; if that opposite equals the current system preference, the stored key is removed instead of written (see data-model.md's transition table) — the caller never needs to know which case applied.
- Every `localStorage` read/write failure (thrown exception, caught via `fromThrowable`) is treated as if the key were absent/unset — `theme` still resolves from system preference, `toggleTheme` still updates `theme` for the current session even though persistence silently no-ops (FR-011).

## Consumers

`apps/web-app/components/ThemeToggle/ThemeToggle.tsx` is the only consumer for this feature. The hook has no other required consumers, so no `ThemeProvider`/Context wrapper is part of this contract (see research.md §3) — a future second consumer can call `useTheme()` again (cheap, mount-time read) or prompt promoting this into a Context at that time.
