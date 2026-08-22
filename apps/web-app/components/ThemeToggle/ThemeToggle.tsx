"use client";

import { THEME_SPRITE_ICON_IDS } from "../../assets/generated/theme-sprite.ids.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import styles from "./ThemeToggle.module.css";

/**
 * The app's single, global light/dark toggle (spec FR-002). Rendered as two
 * always-present buttons — "switch to dark" and "switch to light" — with
 * pure CSS (`:global(html[data-theme="dark"])` selectors in
 * `ThemeToggle.module.css`) deciding which one is actually visible/
 * focusable at any moment, matching whatever `data-theme` is currently on
 * `<html>`. Neither button's visibility depends on React state: there is
 * nothing here for a render to get wrong relative to the DOM attribute the
 * inline FOUC-prevention script already set before first paint — see the
 * note atop `useTheme.ts` for why that's deliberate.
 */
export function ThemeToggle() {
	const { activateTheme } = useTheme();

	return (
		<div className={styles.themeToggle}>
			<button
				type="button"
				className={styles.thumb}
				data-role="light"
				onClick={() => activateTheme("dark")}
				aria-label="Switch to dark theme"
				title="Switch to dark theme"
			>
				<svg className={styles.icon} aria-hidden="true" focusable="false">
					<use xlinkHref={`/theme-sprite.svg#${THEME_SPRITE_ICON_IDS.sun}`} />
				</svg>
			</button>
			<button
				type="button"
				className={styles.thumb}
				data-role="dark"
				onClick={() => activateTheme("light")}
				aria-label="Switch to light theme"
				title="Switch to light theme"
			>
				<svg className={styles.icon} aria-hidden="true" focusable="false">
					<use xlinkHref={`/theme-sprite.svg#${THEME_SPRITE_ICON_IDS.moon}`} />
				</svg>
			</button>
		</div>
	);
}
