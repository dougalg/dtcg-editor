"use client";

import { useEffect, useRef } from "react";
import { THEME_SPRITE_ICON_IDS } from "../../assets/generated/theme-sprite.ids.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import styles from "./ThemeToggle.module.css";

function labelFor(theme: string | null): string {
	return theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
}

/**
 * The app's single, global light/dark toggle (spec FR-002) — one button,
 * the entire pill-shaped track, with a decorative circle sliding between
 * its two ends purely via CSS (`:global(html[data-theme="dark"])`
 * selectors in `ThemeToggle.module.css`) reacting to the `data-theme`
 * attribute the inline FOUC-prevention script sets before first paint.
 * Icon and accessible name (via the two hidden label spans below) are
 * decided by CSS alone, not React state — see the note atop `useTheme.ts`
 * for why avoiding render-time state here is deliberate, not an oversight.
 *
 * The native `title` tooltip is the one piece of UI CSS genuinely can't
 * drive (an HTML attribute value, not a stylable property), so it's set
 * imperatively — read directly off the DOM, never rendered from React
 * state/props, so there's nothing for hydration to disagree about. A
 * `MutationObserver` keeps it in sync with every way `data-theme` can
 * change (this button's own clicks, a live OS-preference change, or
 * another tab's write) rather than only updating it from the click
 * handler.
 */
export function ThemeToggle() {
	const { activateTheme } = useTheme();
	const buttonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const button = buttonRef.current;
		if (button === null) {
			return;
		}

		function syncTitle(): void {
			if (button !== null) {
				button.title = labelFor(
					document.documentElement.getAttribute("data-theme"),
				);
			}
		}

		syncTitle();
		const observer = new MutationObserver(syncTitle);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		return () => observer.disconnect();
	}, []);

	function handleClick() {
		const current = document.documentElement.getAttribute("data-theme");
		activateTheme(current === "dark" ? "light" : "dark");
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
