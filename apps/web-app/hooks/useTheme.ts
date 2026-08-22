"use client";

import { consoleLogger, toLoggedUnknownError } from "@dtcg-editor/errors";
import { fromThrowable } from "neverthrow";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { DARK_MEDIA_QUERY, THEME_STORAGE_KEY } from "./themeConstants.ts";

export type Theme = "light" | "dark";
export { DARK_MEDIA_QUERY, THEME_STORAGE_KEY };

const ThemePreferenceSchema = z.enum(["light", "dark"]).optional();

export type GetStoredTheme = () => Theme | undefined;
export type SetStoredTheme = (value: Theme | undefined) => void;
export type MatchMedia = (query: string) => MediaQueryList;

/** Real default for `getStoredTheme` — reads `localStorage` and Zod-validates
 * the raw string (Principle IV). May throw (e.g. storage blocked); every call
 * site wraps this in `safeCall` below (Principle V, FR-011), so this stays a
 * plain, unwrapped read. */
function readStoredThemeReal(): Theme | undefined {
	const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
	const parsed = ThemePreferenceSchema.safeParse(raw ?? undefined);
	return parsed.success ? parsed.data : undefined;
}

/** Real default for `setStoredTheme` — `undefined` removes the key (clears
 * the override back to "follow system"), otherwise writes it. May throw; see
 * `readStoredThemeReal`'s note on `safeCall`. */
function writeStoredThemeReal(value: Theme | undefined): void {
	if (value === undefined) {
		window.localStorage.removeItem(THEME_STORAGE_KEY);
	} else {
		window.localStorage.setItem(THEME_STORAGE_KEY, value);
	}
}

/** Real default for `matchMedia` — a plain function reference (not
 * `window.matchMedia` bound eagerly), so it's safe to use as a default
 * parameter value even though this module also executes during SSR: nothing
 * touches `window` until this function is actually called, which only ever
 * happens from client-only code paths (effects, the click handler) below. */
function realMatchMedia(query: string): MediaQueryList {
	return window.matchMedia(query);
}

/** Wraps a call to the (real or injected) `getStoredTheme`/`setStoredTheme`
 * so a throw from *either* source is treated as FR-011's "storage
 * unavailable" case rather than crashing the hook — the real defaults above
 * already guard their own `localStorage` calls, but an injected replacement
 * (e.g. a test double, or a future alternate implementation) gets the same
 * guarantee without having to reimplement it itself. */
function safeCall<T>(fn: () => T, fallback: T, context: string): T {
	const result = fromThrowable(fn, (cause) =>
		toLoggedUnknownError(consoleLogger, cause, context),
	)();
	return result.isOk() ? result.value : fallback;
}

function systemPrefersDark(matchMedia: MatchMedia): boolean {
	try {
		return matchMedia(DARK_MEDIA_QUERY).matches;
	} catch (cause) {
		toLoggedUnknownError(consoleLogger, cause, "useTheme.systemPrefersDark");
		return false;
	}
}

/** The single place that writes the DOM's `data-theme` attribute — the sole
 * source of truth for the effective theme. `ThemeToggle`'s two buttons and
 * every CSS permutation react to this attribute directly (`:global(html
 * [data-theme="dark"])` selectors); nothing here is mirrored into React
 * state for rendering purposes, so there is no render/hydration path that
 * can disagree with it (see the note on `useTheme` below for why that
 * matters). */
function applyTheme(theme: Theme): void {
	document.documentElement.setAttribute("data-theme", theme);
}

export interface UseThemeOptions {
	readonly getStoredTheme?: GetStoredTheme;
	readonly setStoredTheme?: SetStoredTheme;
	readonly matchMedia?: MatchMedia;
}

export interface UseThemeResult {
	/** Call with the theme the user just activated — e.g. the button that
	 * means "switch to dark" calls `activateTheme("dark")`. Persists the
	 * choice per Lea Verou's two-state-button model (see
	 * specs/006-light-dark-toggle/data-model.md's transition table: an
	 * explicit override unless `target` already equals system preference, in
	 * which case the override is cleared instead) and writes `data-theme`
	 * directly — see `applyTheme` above. */
	readonly activateTheme: (target: Theme) => void;
}

/**
 * Owns the *side effects* behind the light/dark toggle — persisting an
 * explicit override, listening for live OS-preference changes and cross-tab
 * storage updates — and always resolves them into a single imperative
 * `document.documentElement.setAttribute("data-theme", ...)` write.
 *
 * Deliberately holds no React state for the theme itself. An earlier version
 * did (`useState<Theme>`, so `ThemeToggle` could render the right icon/
 * `aria-checked`), which meant the *rendered DOM* had to agree with
 * `data-theme` — but the very first client render can't know the resolved
 * value without either matching the server (wrong) or diverging from it
 * (a hydration mismatch React doesn't reliably self-correct on its own,
 * confirmed by direct testing during this feature's development). Since
 * `ThemeToggle` now renders both buttons unconditionally and lets pure CSS
 * attribute selectors decide which one shows, there is nothing left for a
 * render to get wrong — correctness now depends only on this attribute
 * being set correctly, which it already had to be for the inline
 * FOUC-prevention script's sake.
 *
 * See specs/006-light-dark-toggle/contracts/use-theme-hook.md for the full
 * behavioral contract.
 */
export function useTheme(options: UseThemeOptions = {}): UseThemeResult {
	const getStoredTheme = options.getStoredTheme ?? readStoredThemeReal;
	const setStoredTheme = options.setStoredTheme ?? writeStoredThemeReal;
	const matchMedia = options.matchMedia ?? realMatchMedia;

	// Mirrors the latest injected functions into refs, read from inside the
	// mount-only effect below instead of listing them as effect dependencies
	// — an unmemoized caller (e.g. an inline arrow function) would otherwise
	// make the effect tear down and re-run on every render.
	const getStoredThemeRef = useRef(getStoredTheme);
	getStoredThemeRef.current = getStoredTheme;
	const setStoredThemeRef = useRef(setStoredTheme);
	setStoredThemeRef.current = setStoredTheme;
	const matchMediaRef = useRef(matchMedia);
	matchMediaRef.current = matchMedia;

	useEffect(() => {
		// Defense in depth: re-resolves and re-applies the exact value the
		// inline FOUC-prevention script already computed and painted before
		// this component mounted. In the overwhelmingly common case this is a
		// no-op write (identical value), so it can never cause a flash.
		const stored = safeCall(
			() => getStoredThemeRef.current(),
			undefined,
			"useTheme.init",
		);
		applyTheme(
			stored ?? (systemPrefersDark(matchMediaRef.current) ? "dark" : "light"),
		);

		const mediaQueryList = matchMediaRef.current(DARK_MEDIA_QUERY);

		function handleSystemChange(event: MediaQueryListEvent): void {
			// FR-007: an active override must not react to OS changes — only
			// re-derive from the system when no override is stored.
			const stored = safeCall(
				() => getStoredThemeRef.current(),
				undefined,
				"useTheme.handleSystemChange",
			);
			if (stored === undefined) {
				applyTheme(event.matches ? "dark" : "light");
			}
		}

		function handleStorage(event: StorageEvent): void {
			if (event.key !== null && event.key !== THEME_STORAGE_KEY) {
				return;
			}
			const stored = safeCall(
				() => getStoredThemeRef.current(),
				undefined,
				"useTheme.handleStorage",
			);
			applyTheme(
				stored ?? (systemPrefersDark(matchMediaRef.current) ? "dark" : "light"),
			);
		}

		mediaQueryList.addEventListener("change", handleSystemChange);
		window.addEventListener("storage", handleStorage);
		return () => {
			mediaQueryList.removeEventListener("change", handleSystemChange);
			window.removeEventListener("storage", handleStorage);
		};
	}, []);

	function activateTheme(target: Theme): void {
		const systemTheme: Theme = systemPrefersDark(matchMediaRef.current)
			? "dark"
			: "light";
		const nextStored = target === systemTheme ? undefined : target;
		safeCall(
			() => setStoredThemeRef.current(nextStored),
			undefined,
			"useTheme.activateTheme",
		);
		applyTheme(target);
	}

	return { activateTheme };
}
