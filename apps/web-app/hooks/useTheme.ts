"use client";

import { consoleLogger, toLoggedUnknownError } from "@dtcg-editor/errors";
import { fromThrowable } from "neverthrow";
import { useEffect, useRef, useState } from "react";
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

export interface UseThemeOptions {
	readonly getStoredTheme?: GetStoredTheme;
	readonly setStoredTheme?: SetStoredTheme;
	readonly matchMedia?: MatchMedia;
}

export interface UseThemeResult {
	/** The theme currently rendered — always concretely "light" or "dark". */
	readonly theme: Theme;
	/** Implements Lea Verou's two-state-button transition (see
	 * specs/006-light-dark-toggle/data-model.md): sets an explicit override to
	 * the opposite of the current theme, unless that opposite equals the
	 * current system preference, in which case it clears the override back to
	 * "follow system" instead. */
	readonly toggleTheme: () => void;
}

/**
 * Drives the `data-theme` attribute on `<html>` and the app's effective
 * light/dark appearance. See specs/006-light-dark-toggle/contracts/
 * use-theme-hook.md for the full behavioral contract.
 */
export function useTheme(options: UseThemeOptions = {}): UseThemeResult {
	const getStoredTheme = options.getStoredTheme ?? readStoredThemeReal;
	const setStoredTheme = options.setStoredTheme ?? writeStoredThemeReal;
	const matchMedia = options.matchMedia ?? realMatchMedia;

	// Mirrors the latest injected functions into refs, read from inside the
	// mount-only effect below instead of listing them as effect dependencies.
	// A caller (real or test) that doesn't memoize its injected functions —
	// e.g. passing `matchMedia: () => mql` as a fresh inline arrow every
	// render — would otherwise make the effect's dependency array unstable,
	// causing it to tear down and re-run on every render. Since that effect
	// resolves the initial theme, an unwanted re-run re-resolves and
	// silently overwrites whatever `toggleTheme` had just set — verified
	// directly by reproducing exactly that with an unstable `matchMedia` in
	// a test. Refs make "run once on mount" actually mean that, regardless
	// of caller discipline.
	const getStoredThemeRef = useRef(getStoredTheme);
	getStoredThemeRef.current = getStoredTheme;
	const setStoredThemeRef = useRef(setStoredTheme);
	setStoredThemeRef.current = setStoredTheme;
	const matchMediaRef = useRef(matchMedia);
	matchMediaRef.current = matchMedia;

	// Always starts as "light", deliberately matching what the server (which
	// has no `window`) renders — *not* the real resolved value. React only
	// reliably repaints a hydration-mismatched attribute like `aria-checked`
	// on a genuine post-mount re-render, not merely because the very first
	// client render already computed the "correct" value (verified directly:
	// with the resolution done eagerly in this initializer instead, `theme`
	// state was provably "dark" on first render — logged and confirmed — yet
	// the DOM's `aria-checked` stayed stuck at the server's "false"
	// indefinitely, since nothing ever triggered a second commit to force
	// React to reconcile the mismatch). Resolving the real value in the
	// mount effect below instead guarantees that second render.
	const [theme, setTheme] = useState<Theme>("light");

	// Guards the DOM-sync effect below against writing the placeholder
	// "light" state to `data-theme` on mount: the inline FOUC-prevention
	// script has already set the *correct* value on `<html>` before this
	// component's first paint, and blindly syncing `theme` (still "light"
	// here) would overwrite it, producing a real, visible flash — confirmed
	// directly: dark (FOUC script's correct pre-paint value) -> light (this
	// effect stomping it with the placeholder) -> dark again (once the
	// resolution effect below corrects `theme` and this effect re-runs). Set
	// to `true` by the resolution effect once it has run, so every write
	// after that first skipped one reflects a genuine change.
	const hasResolvedRef = useRef(false);

	useEffect(() => {
		if (!hasResolvedRef.current) {
			return;
		}
		document.documentElement.setAttribute("data-theme", theme);
	}, [theme]);

	useEffect(() => {
		const stored = safeCall(
			() => getStoredThemeRef.current(),
			undefined,
			"useTheme.init",
		);
		hasResolvedRef.current = true;
		setTheme(
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
				setTheme(event.matches ? "dark" : "light");
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
			setTheme(
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

	function toggleTheme(): void {
		setTheme((current) => {
			const opposite: Theme = current === "dark" ? "light" : "dark";
			const systemTheme: Theme = systemPrefersDark(matchMediaRef.current)
				? "dark"
				: "light";
			const nextStored = opposite === systemTheme ? undefined : opposite;
			safeCall(
				() => setStoredThemeRef.current(nextStored),
				undefined,
				"useTheme.toggleTheme",
			);
			return opposite;
		});
	}

	return { theme, toggleTheme };
}
