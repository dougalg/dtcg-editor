import type { Metadata } from "next";
import { ThemeToggle } from "../components/ThemeToggle/ThemeToggle.tsx";
import {
	DARK_MEDIA_QUERY,
	THEME_STORAGE_KEY,
} from "../hooks/themeConstants.ts";
import "./globals.css";

export const metadata: Metadata = {
	title: "DTCG Editor",
	description: "Editor for DTCG design token files",
};

/**
 * Runs before first paint (a blocking inline script, not a module) so the
 * editor never flashes the wrong appearance: reads the stored preference,
 * falling back to the OS setting, and sets `data-theme` on `<html>` — the
 * same computation `useTheme.ts` performs once it mounts, kept in sync via
 * the shared `theme-constants.ts` values interpolated below rather than
 * hand-duplicated strings. Every step is wrapped so a blocked/unavailable
 * `localStorage` or `matchMedia` can never leave the page unrendered.
 */
const themeInitScript = `(function () {
	try {
		var stored = null;
		try {
			stored = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
		} catch (e) {}
		var theme = stored === "light" || stored === "dark" ? stored : null;
		if (!theme) {
			var prefersDark = false;
			try {
				prefersDark = window.matchMedia(${JSON.stringify(DARK_MEDIA_QUERY)}).matches;
			} catch (e) {}
			theme = prefersDark ? "dark" : "light";
		}
		document.documentElement.setAttribute("data-theme", theme);
	} catch (e) {}
})();`;

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, build-time-generated script text (see themeInitScript above), no user input involved. */}
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
			</head>
			<body>
				<ThemeToggle />
				{children}
			</body>
		</html>
	);
}
