"use client";

import { useEffect, useRef } from "react";
import { THEME_SPRITE_ICON_IDS } from "../../assets/generated/theme-sprite.ids.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import styles from "./ThemeToggle.module.css";

function labelFor(effectiveTheme: "light" | "dark"): string {
	return effectiveTheme === "dark"
		? "Switch to light theme"
		: "Switch to dark theme";
}

/**
 * The app's single, global light/dark toggle (spec FR-002) — one button,
 * the entire pill-shaped track, with a decorative circle sliding between
 * its two ends purely via CSS. Thumb position, icon, and accessible name
 * (via the two hidden label spans below) are decided by the attribute and
 * media-query selectors in `ThemeToggle.module.css`, not React state — see
 * the note atop `useTheme.ts` for why avoiding render-time state here is
 * deliberate, not an oversight.
 *
 * Everything below goes through `resolveEffectiveTheme` rather than reading
 * `data-theme` directly. A missing attribute does *not* mean light: since the
 * override moved to a cookie, absence means "follow the OS", which may be
 * dark. Reading the attribute raw would make this button compute the theme
 * it's already showing as its click target — clearing the override instead of
 * switching, so the click would appear to do nothing.
 *
 * The native `title` tooltip is the one piece of UI CSS genuinely can't
 * drive (an HTML attribute value, not a stylable property), so it's set
 * imperatively — read from the platform, never rendered from React
 * state/props, so there's nothing for hydration to disagree about.
 * `subscribeToEffectiveTheme` keeps it in sync with every way the effective
 * theme can change: this button's own clicks, another tab's write, and a
 * live OS-preference change — that last one being invisible to a
 * `MutationObserver`, since CSS handles it without touching the DOM.
 */
export function ThemeToggle() {
	const { activateTheme, resolveEffectiveTheme, subscribeToEffectiveTheme } =
		useTheme();
	const buttonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const button = buttonRef.current;
		if (button === null) {
			return;
		}

		function syncTitle(): void {
			if (button !== null) {
				button.title = labelFor(resolveEffectiveTheme());
			}
		}

		syncTitle();
		return subscribeToEffectiveTheme(syncTitle);
	}, [resolveEffectiveTheme, subscribeToEffectiveTheme]);

	function handleClick() {
		activateTheme(resolveEffectiveTheme() === "dark" ? "light" : "dark");
	}

	return (
		<button
			ref={buttonRef}
			type="button"
			className={styles.track}
			onClick={handleClick}
		>
			<span className={styles.thumb} aria-hidden="true">
				<svg className={styles.sunIcon} aria-hidden="true" focusable="false">
					<use xlinkHref={`/theme-sprite.svg#${THEME_SPRITE_ICON_IDS.sun}`} />
				</svg>
				<svg className={styles.moonIcon} aria-hidden="true" focusable="false">
					<use xlinkHref={`/theme-sprite.svg#${THEME_SPRITE_ICON_IDS.moon}`} />
				</svg>
			</span>
			<span className={[styles.labelToDark, "visually-hidden"].join(" ")}>
				Switch to dark theme
			</span>
			<span className={[styles.labelToLight, "visually-hidden"].join(" ")}>
				Switch to light theme
			</span>
		</button>
	);
}
