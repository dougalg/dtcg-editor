"use client";

import { consoleLogger, toLoggedUnknownError } from "@dtcg-editor/errors";
import { fromThrowable } from "neverthrow";
import { useEffect, useState } from "react";
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

	const [theme, setTheme] = useState<Theme>(() => {
		// Computed the same way the inline FOUC-prevention script computes its
		// pre-paint value (stored preference, else system) — during SSR
		// `window` doesn't exist yet, so this only resolves for real on the
		// client, matching what that script already set on the DOM by the
		// time this component hydrates.
		if (typeof window === "undefined") {
			return "light";
		}
		const stored = safeCall(getStoredTheme, undefined, "useTheme.init");
		return stored ?? (systemPrefersDark(matchMedia) ? "dark" : "light");
	});

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
	}, [theme]);

	useEffect(() => {
		const mediaQueryList = matchMedia(DARK_MEDIA_QUERY);

		function handleSystemChange(event: MediaQueryListEvent): void {
			// FR-007: an active override must not react to OS changes — only
			// re-derive from the system when no override is stored.
			const stored = safeCall(
				getStoredTheme,
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
				getStoredTheme,
				undefined,
				"useTheme.handleStorage",
			);
			setTheme(stored ?? (systemPrefersDark(matchMedia) ? "dark" : "light"));
		}

		mediaQueryList.addEventListener("change", handleSystemChange);
		window.addEventListener("storage", handleStorage);
		return () => {
			mediaQueryList.removeEventListener("change", handleSystemChange);
			window.removeEventListener("storage", handleStorage);
		};
	}, [matchMedia, getStoredTheme]);

	function toggleTheme(): void {
		setTheme((current) => {
			const opposite: Theme = current === "dark" ? "light" : "dark";
			const systemTheme: Theme = systemPrefersDark(matchMedia)
				? "dark"
				: "light";
			const nextStored = opposite === systemTheme ? undefined : opposite;
			safeCall(
				() => setStoredTheme(nextStored),
				undefined,
				"useTheme.toggleTheme",
			);
			return opposite;
		});
	}

	return { theme, toggleTheme };
}
