"use client";

import { consoleLogger, toLoggedUnknownError } from "@dtcg-editor/errors";
import { fromThrowable } from "neverthrow";
import { useCallback, useEffect, useRef } from "react";
import {
	DARK_MEDIA_QUERY,
	parseTheme,
	THEME_CHANNEL_NAME,
	THEME_COOKIE_MAX_AGE_SECONDS,
	THEME_COOKIE_NAME,
	type Theme,
} from "./themeConstants.ts";

export type { Theme };
export { DARK_MEDIA_QUERY, THEME_CHANNEL_NAME, THEME_COOKIE_NAME };

export type GetStoredTheme = () => Theme | undefined;
export type SetStoredTheme = (value: Theme | undefined) => void;
export type MatchMedia = (query: string) => MediaQueryList;
export type CreateThemeChannel = () => BroadcastChannel | undefined;

/** Real default for `getStoredTheme` — reads the preference cookie and
 * validates it via the shared `parseTheme` (Principle IV), the same parse the
 * server runs in `app/layout.tsx`. May throw; every call site wraps this in
 * `safeCall` below (Principle V, FR-011), so this stays a plain read. */
function readStoredThemeReal(): Theme | undefined {
	const raw = document.cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${THEME_COOKIE_NAME}=`))
		?.slice(THEME_COOKIE_NAME.length + 1);
	return parseTheme(raw === undefined ? undefined : decodeURIComponent(raw));
}

/** Real default for `setStoredTheme` — `undefined` expires the cookie
 * (clearing the override back to "follow the OS"), otherwise writes it. Not
 * `HttpOnly`, because this is the half of the pair that writes it from the
 * browser; `Secure` only over HTTPS, so it still works on a plain-HTTP dev
 * server. May throw; see `readStoredThemeReal`'s note on `safeCall`. */
function writeStoredThemeReal(value: Theme | undefined): void {
	const attributes = ["Path=/", "SameSite=Lax"];
	if (window.location.protocol === "https:") {
		attributes.push("Secure");
	}
	const lifetime =
		value === undefined
			? "Max-Age=0"
			: `Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}`;
	document.cookie = `${THEME_COOKIE_NAME}=${value ?? ""}; ${lifetime}; ${attributes.join("; ")}`;
}

/** Real default for `matchMedia` — a plain function reference (not
 * `window.matchMedia` bound eagerly), so it's safe to use as a default
 * parameter value even though this module also executes during SSR: nothing
 * touches `window` until this function is actually called, which only ever
 * happens from client-only code paths below. */
function realMatchMedia(query: string): MediaQueryList {
	return window.matchMedia(query);
}

/** Real default for `createThemeChannel`. Returns `undefined` where
 * `BroadcastChannel` isn't available rather than throwing — cross-tab sync is
 * an enhancement, and the rest of the hook works without it. */
function realCreateThemeChannel(): BroadcastChannel | undefined {
	return typeof BroadcastChannel === "undefined"
		? undefined
		: new BroadcastChannel(THEME_CHANNEL_NAME);
}

/** Wraps a call to the (real or injected) externalities so a throw from
 * *either* source is treated as FR-011's "storage unavailable" case rather
 * than crashing the hook — the real defaults above already guard their own
 * platform calls, but an injected replacement (e.g. a test double) gets the
 * same guarantee without having to reimplement it itself. */
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

/**
 * The single place that writes the DOM's `data-theme` attribute, and the only
 * thing in this hook that touches appearance at all.
 *
 * Note that it takes the *override* (which may be absent), not the effective
 * theme: clearing an override must **remove** the attribute, not set it to
 * whatever the OS currently prefers. Leaving a resolved value behind would
 * pin the appearance and stop `@media (prefers-color-scheme: dark)` from ever
 * applying again, breaking FR-006.
 */
function applyThemeOverride(override: Theme | undefined): void {
	if (override === undefined) {
		document.documentElement.removeAttribute("data-theme");
	} else {
		document.documentElement.setAttribute("data-theme", override);
	}
}

export interface UseThemeOptions {
	readonly getStoredTheme?: GetStoredTheme;
	readonly setStoredTheme?: SetStoredTheme;
	readonly matchMedia?: MatchMedia;
	readonly createThemeChannel?: CreateThemeChannel;
}

export interface UseThemeResult {
	/** Call with the theme the user just activated — e.g. the button that
	 * means "switch to dark" calls `activateTheme("dark")`. Persists the
	 * choice per Lea Verou's two-state-button model (see
	 * specs/006-light-dark-toggle/data-model.md's transition table: an
	 * explicit override unless `target` already equals system preference, in
	 * which case the override is cleared instead) and updates `data-theme`
	 * to match — see `applyThemeOverride` above. */
	readonly activateTheme: (target: Theme) => void;

	/** The theme actually on screen right now: the override if one is set,
	 * otherwise whatever the OS currently prefers.
	 *
	 * Callers must not read `data-theme` and treat a missing attribute as
	 * "light" — since the override moved to a cookie and the OS case moved
	 * into CSS, absence means "follow the OS", which may well be dark. */
	readonly resolveEffectiveTheme: () => Theme;

	/** Subscribes to everything that can change the effective theme: an
	 * override being set or cleared, and — while no override is set — the OS
	 * preference changing. Returns an unsubscribe function.
	 *
	 * Stable across renders, so it's safe as a mount-only effect dependency.
	 * The OS half matters because that case no longer touches the DOM at all:
	 * CSS repaints on its own, and anything mirroring the theme *outside* CSS
	 * (the toggle's `title` tooltip) would otherwise silently go stale. */
	readonly subscribeToEffectiveTheme: (listener: () => void) => () => void;
}

/**
 * Owns the *side effects* behind the light/dark toggle: persisting an
 * explicit override to a cookie, clearing it, and telling other tabs.
 *
 * Deliberately does nothing on mount. The server already rendered the correct
 * `data-theme` (or correctly rendered no attribute at all) from that same
 * cookie in `app/layout.tsx`, and CSS resolves the no-override case on its
 * own, so there is nothing left to compute at hydration time — and doing it
 * anyway would be actively wrong: writing a resolved `data-theme` when no
 * override is stored would pin the appearance against later OS changes
 * (FR-006). This is why the earlier `matchMedia` `change` listener is gone
 * too: the media query in the stylesheet now handles live OS changes
 * natively, for free, with no JS involved.
 *
 * `matchMedia` is still read, but only as a one-shot inside `activateTheme` —
 * FR-005 needs to know the current OS preference to decide whether the click
 * sets an override or clears one.
 *
 * Deliberately holds no React state for the theme either. An earlier version
 * did (`useState<Theme>`, so `ThemeToggle` could render the right icon/
 * `aria-checked`), which meant the *rendered DOM* had to agree with
 * `data-theme`. Since `ThemeToggle` now renders one button whose appearance
 * and accessible name are decided by pure CSS attribute and media-query
 * selectors, there is nothing left for a render to get wrong.
 *
 * See specs/006-light-dark-toggle/contracts/use-theme-hook.md for the full
 * behavioral contract.
 */
export function useTheme(options: UseThemeOptions = {}): UseThemeResult {
	const getStoredTheme = options.getStoredTheme ?? readStoredThemeReal;
	const setStoredTheme = options.setStoredTheme ?? writeStoredThemeReal;
	const matchMedia = options.matchMedia ?? realMatchMedia;
	const createThemeChannel =
		options.createThemeChannel ?? realCreateThemeChannel;

	// Mirrors the latest injected functions into refs, read from inside the
	// mount-only effect below instead of listed as effect dependencies — an
	// unmemoized caller (e.g. an inline arrow function) would otherwise make
	// the effect tear down and re-run on every render.
	const getStoredThemeRef = useRef(getStoredTheme);
	getStoredThemeRef.current = getStoredTheme;
	const setStoredThemeRef = useRef(setStoredTheme);
	setStoredThemeRef.current = setStoredTheme;
	const matchMediaRef = useRef(matchMedia);
	matchMediaRef.current = matchMedia;
	const createThemeChannelRef = useRef(createThemeChannel);
	createThemeChannelRef.current = createThemeChannel;

	const channelRef = useRef<BroadcastChannel | undefined>(undefined);

	// Cross-tab sync. `localStorage` used to give this for free via the
	// `storage` event; a cookie fires no event of its own, so the writing tab
	// pings the others explicitly. The ping carries no payload on purpose —
	// the cookie stays the single source of truth and each receiver re-reads
	// it, which also means two tabs racing each other still converge.
	useEffect(() => {
		const channel = safeCall(
			() => createThemeChannelRef.current(),
			undefined,
			"useTheme.createThemeChannel",
		);
		if (channel === undefined) {
			return;
		}
		channelRef.current = channel;
		channel.onmessage = () => {
			applyThemeOverride(
				safeCall(
					() => getStoredThemeRef.current(),
					undefined,
					"useTheme.handleChannelMessage",
				),
			);
		};
		return () => {
			channelRef.current = undefined;
			safeCall(() => channel.close(), undefined, "useTheme.closeThemeChannel");
		};
	}, []);

	const resolveEffectiveTheme = useCallback((): Theme => {
		const override = parseTheme(
			document.documentElement.getAttribute("data-theme") ?? undefined,
		);
		if (override !== undefined) {
			return override;
		}
		return systemPrefersDark(matchMediaRef.current) ? "dark" : "light";
	}, []);

	const subscribeToEffectiveTheme = useCallback((listener: () => void) => {
		const observer = new MutationObserver(listener);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		const mediaQueryList = safeCall(
			() => matchMediaRef.current(DARK_MEDIA_QUERY),
			undefined,
			"useTheme.subscribeToEffectiveTheme",
		);
		mediaQueryList?.addEventListener("change", listener);
		return () => {
			observer.disconnect();
			mediaQueryList?.removeEventListener("change", listener);
		};
	}, []);

	function activateTheme(target: Theme): void {
		const systemTheme: Theme = systemPrefersDark(matchMediaRef.current)
			? "dark"
			: "light";
		// FR-005: activating the theme the OS already prefers clears the
		// override rather than pinning a redundant one, handing the user back
		// to "follow the OS".
		const nextStored = target === systemTheme ? undefined : target;
		safeCall(
			() => setStoredThemeRef.current(nextStored),
			undefined,
			"useTheme.activateTheme",
		);
		applyThemeOverride(nextStored);
		safeCall(
			() => channelRef.current?.postMessage("theme-preference-changed"),
			undefined,
			"useTheme.broadcastThemeChange",
		);
	}

	return { activateTheme, resolveEffectiveTheme, subscribeToEffectiveTheme };
}
