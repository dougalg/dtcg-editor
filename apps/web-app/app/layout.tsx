import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeToggle } from "../components/ThemeToggle/ThemeToggle.tsx";
import { parseTheme, THEME_COOKIE_NAME } from "../hooks/themeConstants.ts";
import "./globals.css";

export const metadata: Metadata = {
	title: "DTCG Editor",
	description: "Editor for DTCG design token files",
};

/**
 * Renders `data-theme` server-side from the preference cookie, so the correct
 * appearance is in the very first byte of HTML and there is nothing to flash.
 *
 * Note what is *absent* when the user has expressed no preference: no
 * attribute at all. That's the "follow the OS" state, and it's handled purely
 * by the `@media (prefers-color-scheme: dark)` block the design system emits
 * (see `packages/design-system/sugarcube.config.ts`) — which is also why this
 * layout needs no inline script, no `dangerouslySetInnerHTML`, and no
 * `suppressHydrationWarning`: the server's markup is already correct, so
 * there is nothing for the client to fix up and nothing to disagree about.
 *
 * Setting the attribute unconditionally would be a bug, not a simplification:
 * it would pin the appearance and stop the media query from ever applying,
 * breaking FR-006 (appearance follows live OS changes while no override is
 * set). See specs/006-light-dark-toggle/research.md §2.
 */
export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const themeOverride = parseTheme(
		(await cookies()).get(THEME_COOKIE_NAME)?.value,
	);

	return (
		<html lang="en" data-theme={themeOverride}>
			<body>
				<ThemeToggle />
				{children}
			</body>
		</html>
	);
}
