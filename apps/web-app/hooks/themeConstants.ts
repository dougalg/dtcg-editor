/** The theme vocabulary shared between `useTheme.ts` ("use client") and
 * `app/layout.tsx` (a Server Component, which can't import values out of a
 * "use client" module) — kept in a plain module with no directive so both can
 * import the real values instead of risking drift between a hook constant and
 * a hand-typed string somewhere else.
 *
 * Both sides read the *same* preference from the *same* cookie, so both need
 * the same answer to "is this stored string a theme?" — hence `parseTheme`
 * living here rather than in either caller. */

import { z } from "zod";

export type Theme = "light" | "dark";

/** Name of the cookie holding an explicit override. Deliberately readable by
 * JS (not `HttpOnly`): the server reads it to render `data-theme` before the
 * page is sent, and `useTheme` writes it from the click handler. */
export const THEME_COOKIE_NAME = "dtcg-ed-theme-preference";

/** `BroadcastChannel` name used to tell this app's *other* tabs that the
 * override changed. Cookies, unlike `localStorage`, fire no cross-tab event
 * of their own — see the note on cross-tab sync in `useTheme.ts`. */
export const THEME_CHANNEL_NAME = "dtcg-ed-theme";

export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/** Roughly ten years — this is a durable "remember my choice", and the
 * absence of the cookie is meaningful (it means "follow the OS"), so it must
 * not expire into a different state on its own. */
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10;

const ThemePreferenceSchema = z.enum(["light", "dark"]).optional();

/** Validates a raw cookie value (Principle IV — this is an untrusted edge on
 * both sides: a cookie can be hand-edited, truncated, or written by an older
 * version of this app). Anything that isn't exactly "light" or "dark" is
 * treated as "no override", i.e. follow the OS. */
export function parseTheme(raw: string | undefined): Theme | undefined {
	const parsed = ThemePreferenceSchema.safeParse(raw ?? undefined);
	return parsed.success ? parsed.data : undefined;
}
