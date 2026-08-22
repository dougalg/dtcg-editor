"use client";

import { Switch } from "@dtcg-editor/design-system/components/Switch/Switch.tsx";
import { THEME_SPRITE_ICON_IDS } from "../../assets/generated/theme-sprite.ids.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import styles from "./ThemeToggle.module.css";

/**
 * The app's single, global light/dark toggle (spec FR-002). A two-state
 * control that always offers exactly one action — "switch to light" or
 * "switch to dark" — per Lea Verou's two-state-button model; see
 * `useTheme.ts` for how that maps onto the underlying three-state
 * (system/light/dark) preference.
 */
export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	const isDark = theme === "dark";
	const iconId = isDark
		? THEME_SPRITE_ICON_IDS.moon
		: THEME_SPRITE_ICON_IDS.sun;
	const label = isDark ? "Switch to light theme" : "Switch to dark theme";

	return (
		<Switch
			checked={isDark}
			onCheckedChange={toggleTheme}
			aria-label={label}
			title={label}
			className={styles.themeToggle}
			thumbIcon={
				<svg className={styles.icon} aria-hidden="true" focusable="false">
					<use xlinkHref={`/theme-sprite.svg#${iconId}`} />
				</svg>
			}
		/>
	);
}
